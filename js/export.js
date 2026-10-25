/**
 * EvalScan - Módulo de Exportación y Respaldo (export.js)
 * Exportación a formato CSV compatible con Excel en español (BOM UTF-8, punto y coma/coma),
 * generación de respaldos completos JSON, restauración y reportes imprimibles.
 */

import { getAllDataForExport, restoreBackup } from './database.js';
import { formatNumber, formatPercentage, formatDate, showToast } from './utils.js';
import { calculateAssessmentStatistics } from './results.js';

/**
 * Exporta la lista de resultados de una evaluación a archivo CSV
 */
export function exportResultsToCsv(evaluation, results) {
  if (!results || results.length === 0) {
    throw new Error('No hay resultados disponibles para exportar en esta evaluación.');
  }

  // BOM UTF-8 (\uFEFF) para que Excel abra acentos, tildes y eñes correctamente sin corrupción de caracteres
  let csvContent = '\uFEFF';

  // Encabezados
  const headers = [
    'Estudiante',
    'Identificación / Cédula',
    'Aciertos',
    'Errores',
    'En Blanco',
    'Múltiples/Dudosas',
    'Total Preguntas',
    'Porcentaje (%)',
    'Nota Final',
    'Nota Máxima',
    'Estado',
    'Fecha Escaneo'
  ];

  csvContent += headers.map(escapeCsvValue).join(';') + '\r\n';

  // Filas de datos
  results.forEach((r) => {
    const row = [
      r.studentName || 'Estudiante sin identificar',
      r.studentId || '',
      r.correctCount ?? 0,
      r.incorrectCount ?? 0,
      r.blankCount ?? 0,
      (r.multipleCount || 0) + (r.doubtfulCount || 0),
      evaluation.questionCount,
      formatPercentage(r.percentage),
      formatNumber(r.score),
      formatNumber(r.maxScore),
      r.isPassed ? 'Aprobado' : 'No Aprobado',
      formatDate(r.scannedAt, true)
    ];
    csvContent += row.map(escapeCsvValue).join(';') + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `EvalScan_${sanitizeFilename(evaluation.name)}_Resultados.csv`;
  downloadBlob(blob, filename);
  showToast('Archivo CSV exportado exitosamente.', 'success');
}

/**
 * Escapa valores para formato CSV
 */
function escapeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function sanitizeFilename(name) {
  return (name || 'Evaluacion').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Genera y descarga un respaldo completo en formato JSON
 */
export async function exportDatabaseBackup() {
  try {
    const data = await getAllDataForExport();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `EvalScan_CopiaSeguridad_${nowStr}.json`;
    downloadBlob(blob, filename);
    showToast('Copia de seguridad descargada exitosamente.', 'success');
    return true;
  } catch (err) {
    showToast(`Error al exportar respaldo: ${err.message}`, 'error');
    return false;
  }
}

/**
 * Restaura los datos desde un archivo JSON
 */
export async function restoreDatabaseFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.name.endsWith('.json')) {
      reject(new Error('Seleccione un archivo de copia de seguridad con extensión .json.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        await restoreBackup(backupData);
        showToast('Copia de seguridad restaurada correctamente.', 'success');
        resolve(true);
      } catch (err) {
        reject(new Error(`El archivo de respaldo no es válido o está dañado: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.readAsText(file);
  });
}

/**
 * Abre el reporte imprimible de la evaluación en una ventana emergente o vista previa de impresión
 */
export function openPrintableResultsReport(evaluation, results) {
  const stats = calculateAssessmentStatistics(results, evaluation);

  let rowsHtml = '';
  results.forEach((r, idx) => {
    rowsHtml += `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td><strong>${escapeHtml(r.studentName)}</strong></td>
        <td>${escapeHtml(r.studentId || '-')}</td>
        <td style="text-align: center; color: #059669; font-weight: bold;">${r.correctCount}</td>
        <td style="text-align: center; color: #dc2626;">${r.incorrectCount}</td>
        <td style="text-align: center; color: #64748b;">${r.blankCount}</td>
        <td style="text-align: center;">${formatPercentage(r.percentage)}</td>
        <td style="text-align: center; font-weight: bold; font-size: 1.05em;">${formatNumber(r.score)} / ${formatNumber(r.maxScore)}</td>
        <td style="text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; ${
            r.isPassed ? 'background: #d1fae5; color: #065f46;' : 'background: #fee2e2; color: #991b1b;'
          }">
            ${r.isPassed ? 'Aprobado' : 'No Aprobado'}
          </span>
        </td>
      </tr>
    `;
  });

  // Intentar abrir en ventana emergente (desktop) o modal accesible (Android WebView / móvil)
  let printWindow = null;
  try {
    printWindow = window.open('', '_blank');
  } catch {
    printWindow = null;
  }

  if (!printWindow) {
    // Modo Android WebView / Móvil: renderizar modal de reporte imprimible directamente en el DOM
    showInAppPrintableModal(evaluation, results, stats, rowsHtml);
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte de Calificaciones - ${escapeHtml(evaluation.name)}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20mm 15mm; color: #1e293b; }
        .hdr { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
        .title { font-size: 20px; font-weight: bold; color: #0f172a; margin: 0 0 4px 0; }
        .sub { font-size: 13px; color: #64748b; margin: 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; background: #f8fafc; }
        .stat-val { font-size: 18px; font-weight: bold; color: #0284c7; }
        .stat-lbl { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; }
        th { background: #f1f5f9; color: #334155; text-align: left; padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
        td { padding: 8px 10px; border: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #f8fafc; }
        .ftr { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
        .sign-line { width: 220px; border-top: 1px solid #475569; text-align: center; padding-top: 4px; }
        @media print {
          body { margin: 10mm 10mm; }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div style="margin-bottom: 15px; text-align: right;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Imprimir Reporte</button>
      </div>

      <div class="hdr">
        <div>
          <h1 class="title">EvalScan — Reporte de Calificaciones</h1>
          <p class="sub"><strong>Evaluación:</strong> ${escapeHtml(evaluation.name)} ${evaluation.subject ? `| Materia: ${escapeHtml(evaluation.subject)}` : ''} ${evaluation.course ? `| Curso: ${escapeHtml(evaluation.course)}` : ''}</p>
        </div>
        <div style="text-align: right; font-size: 12px; color: #64748b;">
          Fecha: ${formatDate(new Date().toISOString(), true)}
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-val">${stats.count}</div>
          <div class="stat-lbl">Estudiantes Evaluados</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${formatNumber(stats.averageScore)} / ${formatNumber(evaluation.maxScore)}</div>
          <div class="stat-lbl">Promedio General</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${formatPercentage(stats.passRate)}</div>
          <div class="stat-lbl">Tasa de Aprobación</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${formatNumber(stats.maxScore)} | ${formatNumber(stats.minScore)}</div>
          <div class="stat-lbl">Nota Máx. / Mín.</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th>Estudiante</th>
            <th>Identificación</th>
            <th style="text-align: center;">Aciertos</th>
            <th style="text-align: center;">Errores</th>
            <th style="text-align: center;">Blanco</th>
            <th style="text-align: center;">%</th>
            <th style="text-align: center;">Calificación</th>
            <th style="text-align: center;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="9" style="text-align: center;">No hay registros calificados.</td></tr>'}
        </tbody>
      </table>

      <div class="ftr">
        <div class="sign-line">Firma del Docente Responsable</div>
        <div>Generado con EvalScan • Aplicación Offline-First</div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function showInAppPrintableModal(evaluation, results, stats, rowsHtml) {
  const existing = document.getElementById('in-app-printable-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'in-app-printable-modal';
  overlay.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col p-4 sm:p-6 overflow-y-auto animate-fade-in';

  overlay.innerHTML = `
    <div class="bg-white rounded-2xl max-w-4xl w-full mx-auto p-6 sm:p-8 shadow-2xl flex flex-col gap-4 text-slate-800 my-auto">
      <div class="flex items-center justify-between border-b pb-3 no-print">
        <h3 class="font-bold text-lg text-slate-900">Reporte de Calificaciones Oficial</h3>
        <div class="flex gap-2">
          <button id="modal-print-btn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer">
            Imprimir
          </button>
          <button id="modal-close-btn" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer">
            Cerrar
          </button>
        </div>
      </div>
      <div>
        <h2 class="text-xl font-bold text-slate-900">EvalScan — ${escapeHtml(evaluation.name)}</h2>
        <p class="text-xs text-slate-500">${evaluation.subject ? `Materia: ${escapeHtml(evaluation.subject)} • ` : ''}${evaluation.course ? `Curso: ${escapeHtml(evaluation.course)} • ` : ''}Fecha: ${formatDate(new Date().toISOString(), true)}</p>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div class="p-2.5 bg-slate-50 border rounded-xl"><div class="font-bold text-base text-blue-700">${stats.count}</div><div>Estudiantes</div></div>
        <div class="p-2.5 bg-slate-50 border rounded-xl"><div class="font-bold text-base text-blue-700">${formatNumber(stats.averageScore)}</div><div>Promedio</div></div>
        <div class="p-2.5 bg-slate-50 border rounded-xl"><div class="font-bold text-base text-emerald-700">${formatPercentage(stats.passRate)}</div><div>Aprobación</div></div>
        <div class="p-2.5 bg-slate-50 border rounded-xl"><div class="font-bold text-base text-slate-800">${formatNumber(stats.maxScore)} | ${formatNumber(stats.minScore)}</div><div>Máx / Mín</div></div>
      </div>
      <div class="overflow-x-auto max-h-96">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="bg-slate-100 text-slate-700 border-b">
              <th class="p-2 text-center">#</th>
              <th class="p-2">Estudiante</th>
              <th class="p-2">Identificación</th>
              <th class="p-2 text-center">Aciertos</th>
              <th class="p-2 text-center">Errores</th>
              <th class="p-2 text-center">Blanco</th>
              <th class="p-2 text-center">%</th>
              <th class="p-2 text-center">Nota</th>
              <th class="p-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="9" class="p-4 text-center">No hay registros calificados.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#modal-close-btn').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#modal-print-btn').addEventListener('click', () => window.print());
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
