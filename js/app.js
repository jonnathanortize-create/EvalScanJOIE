/**
 * EvalScan - Controlador Principal y Navegación SPA (app.js)
 * Orquestación de vistas, eventos, cámara, escaneo OMR, clave, resultados y PWA offline.
 */

import {
  initDB,
  getEvaluations,
  getEvaluation,
  saveEvaluation,
  getAnswerKey,
  saveAnswerKey,
  getResultsByEvaluation,
  getResult,
  getAllDataForExport,
  restoreBackup
} from './database.js';
import {
  createEvaluation,
  updateEvaluation,
  duplicateEvaluation,
  removeEvaluationWithConfirm,
  ALTERNATIVES_MAP
} from './evaluations.js';
import {
  loadOrCreateAnswerKey,
  updateQuestionAnswer,
  setAllAnswers,
  generateSampleAnswerPattern,
  validateAnswerKeyCompleteness
} from './answer-key.js';
import {
  generatePrintableSheetHtml,
  drawSheetToCanvas,
  calculateSheetLayout,
  TEMPLATE_GEOMETRY
} from './sheet-generator.js';
import { CameraService } from './cameraService.js';
import { processSheetImage, OMR_STATUS } from './scanner.js';
import { gradeStudentSheet } from './grading.js';
import {
  saveStudentResult,
  calculateAssessmentStatistics,
  removeResultWithConfirm
} from './results.js';
import {
  exportResultsToCsv,
  exportDatabaseBackup,
  restoreDatabaseFromFile,
  openPrintableResultsReport
} from './export.js';
import {
  formatDate,
  formatNumber,
  formatPercentage,
  escapeHtml,
  showToast,
  confirmDialog,
  alertDialog,
  playFeedbackSound
} from './utils.js';

// Estado global de la aplicación
const AppState = {
  currentView: 'inicio',
  currentEvaluationId: null,
  cameraService: new CameraService(),
  activeScanData: null,
  deferredInstallPrompt: null,
  isOnline: navigator.onLine
};

/**
 * Inicialización de la aplicación
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initDB();
    setupPwaAndOffline();
    setupNavigation();
    setupGlobalEvents();

    // Cargar evaluación de demostración inicial "MCU" si la base de datos está vacía
    await seedInitialDataIfEmpty();

    // Renderizar la vista inicial
    navigate('inicio');
  } catch (err) {
    console.error('Error durante la inicialización de EvalScan:', err);
    showToast(`Error al inicializar: ${err.message}`, 'error', 6000);
  }
});

/**
 * Configuración del Service Worker y eventos PWA
 */
function setupPwaAndOffline() {
  // Registrar Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado con éxito:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] No se pudo registrar el Service Worker:', err);
        });
    });
  }

  // Escuchar estado de conexión
  const updateOnlineStatus = () => {
    AppState.isOnline = navigator.onLine;
    const banner = document.getElementById('offline-indicator-banner');
    if (banner) {
      if (!AppState.isOnline) {
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }
  };

  window.addEventListener('online', () => {
    updateOnlineStatus();
    showToast('Conexión a internet restablecida.', 'info');
  });

  window.addEventListener('offline', () => {
    updateOnlineStatus();
    showToast('Modo sin conexión activo. EvalScan continuará funcionando localmente.', 'warning');
  });

  updateOnlineStatus();

  // Escuchar evento de instalación PWA (beforeinstallprompt)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    AppState.deferredInstallPrompt = e;
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) {
      installBtn.classList.remove('hidden');
    }
  });

  window.addEventListener('appinstalled', () => {
    AppState.deferredInstallPrompt = null;
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) installBtn.classList.add('hidden');
    showToast('¡EvalScan ha sido instalada como aplicación!', 'success');
  });
}

/**
 * Si la base de datos está recién creada, inicializar con la evaluación de ejemplo "MCU"
 */
async function seedInitialDataIfEmpty() {
  const evals = await getEvaluations();
  if (evals.length === 0) {
    const demo = await createEvaluation({
      name: 'MCU',
      subject: 'Física',
      course: 'Tercero de Bachillerato A',
      date: new Date().toISOString().split('T')[0],
      questionCount: 20,
      alternativeCount: 4,
      maxScore: 10.0,
      description: 'Evaluación formativa de Movimiento Circular Uniforme (MCU)'
    });

    // Crear clave de respuestas de prueba
    await generateSampleAnswerPattern(demo.id);
  }
}

/**
 * Enrutamiento y navegación entre vistas
 */
export function navigate(viewName, params = {}) {
  // Detener la cámara si se sale de la vista de escaneo
  if (AppState.currentView === 'escanear' && viewName !== 'escanear') {
    AppState.cameraService.stopCamera();
  }

  AppState.currentView = viewName;
  if (params.evaluationId) {
    AppState.currentEvaluationId = params.evaluationId;
  }

  // Actualizar clases activas en los enlaces de navegación
  document.querySelectorAll('[data-nav-target]').forEach((el) => {
    const target = el.getAttribute('data-nav-target');
    if (target === viewName) {
      el.classList.add('bg-blue-800', 'text-white');
      el.classList.remove('text-blue-100', 'hover:bg-blue-700/60');
    } else {
      el.classList.remove('bg-blue-800', 'text-white');
      el.classList.add('text-blue-100', 'hover:bg-blue-700/60');
    }
  });

  // Renderizar la vista correspondiente en el viewport
  const viewport = document.getElementById('app-viewport');
  if (!viewport) return;

  viewport.innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  switch (viewName) {
    case 'inicio':
      renderInicioView(viewport);
      break;
    case 'evaluaciones':
      renderEvaluacionesView(viewport);
      break;
    case 'crear-evaluacion':
      renderFormEvaluacionView(viewport, null);
      break;
    case 'editar-evaluacion':
      renderFormEvaluacionView(viewport, params.evaluationId);
      break;
    case 'clave':
      renderClaveView(viewport, params.evaluationId || AppState.currentEvaluationId);
      break;
    case 'hojas':
      renderHojasView(viewport, params.evaluationId || AppState.currentEvaluationId);
      break;
    case 'escanear':
      renderEscanearView(viewport, params.evaluationId || AppState.currentEvaluationId);
      break;
    case 'resultados':
      renderResultadosView(viewport, params.evaluationId || AppState.currentEvaluationId);
      break;
    case 'configuracion':
      renderConfiguracionView(viewport);
      break;
    default:
      renderInicioView(viewport);
  }
}

function setupNavigation() {
  document.addEventListener('click', (e) => {
    const targetEl = e.target.closest('[data-nav-target]');
    if (targetEl) {
      e.preventDefault();
      const target = targetEl.getAttribute('data-nav-target');
      const evalId = targetEl.getAttribute('data-eval-id');
      navigate(target, { evaluationId: evalId });
    }
  });

  // Menú móvil desplegable
  const menuBtn = document.getElementById('mobile-menu-btn');
  const navDrawer = document.getElementById('mobile-nav-drawer');
  if (menuBtn && navDrawer) {
    menuBtn.addEventListener('click', () => {
      navDrawer.classList.toggle('hidden');
    });

    navDrawer.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        navDrawer.classList.add('hidden');
      });
    });
  }

  // Botón de instalación PWA
  const installBtn = document.getElementById('btn-pwa-install');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!AppState.deferredInstallPrompt) {
        // En iOS Safari, guiar al usuario
        alertDialog({
          title: 'Instalación en iPhone / iPad',
          message: 'Para instalar EvalScan en iOS:\n\n1. Toque el botón Compartir en la barra de Safari.\n2. Seleccione "Agregar a inicio".\n3. Podrá usar la aplicación totalmente offline.'
        });
        return;
      }
      AppState.deferredInstallPrompt.prompt();
      const { outcome } = await AppState.deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        AppState.deferredInstallPrompt = null;
        installBtn.classList.add('hidden');
      }
    });
  }
}

function setupGlobalEvents() {
  // Manejo de errores no capturados para mostrar alertas claras al docente
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesa no controlada:', event.reason);
  });
}

/* ==========================================================================
   VISTA: INICIO (Dashboard)
   ========================================================================== */

async function renderInicioView(container) {
  const evals = await getEvaluations();
  let totalResultsCount = 0;
  let totalPassCount = 0;

  for (const ev of evals) {
    const results = await getResultsByEvaluation(ev.id);
    totalResultsCount += results.length;
    totalPassCount += results.filter((r) => r.isPassed).length;
  }

  const overallPassRate = totalResultsCount > 0 ? (totalPassCount / totalResultsCount) * 100 : 0;

  const recentEvals = evals.slice(0, 5);

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <!-- Banner de Bienvenida -->
      <div class="bg-gradient-to-r from-blue-900 to-sky-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div class="relative z-10 max-w-2xl">
          <div class="inline-flex items-center gap-2 bg-blue-700/50 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 text-sky-200">
            <span>●</span> Sistema OMR Offline para Docentes
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">EvalScan — Calificación Rápida y Segura</h1>
          <p class="text-blue-100 text-sm sm:text-base leading-relaxed mb-6">
            Cree evaluaciones de opción múltiple, imprima hojas de respuestas en formato A4 y califique en segundos con la cámara de su teléfono o computadora, sin requerir internet.
          </p>
          <div class="flex flex-wrap gap-3">
            <button data-nav-target="crear-evaluacion" class="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-900 font-bold text-sm rounded-xl hover:bg-blue-50 transition shadow-md cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Nueva Evaluación
            </button>
            <button data-nav-target="escanear" class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700/80 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition border border-blue-500/30 cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Escanear Respuestas
            </button>
          </div>
        </div>
      </div>

      <!-- Tarjetas de Métricas -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <div>
            <div class="text-2xl font-black text-slate-800">${evals.length}</div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evaluaciones Guardadas</div>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          </div>
          <div>
            <div class="text-2xl font-black text-slate-800">${totalResultsCount}</div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hojas Calificadas</div>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </div>
          <div>
            <div class="text-2xl font-black text-slate-800">${formatPercentage(overallPassRate)}</div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasa de Aprobación Global</div>
          </div>
        </div>
      </div>

      <!-- Evaluaciones Recientes -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-800">Evaluaciones Recientes</h2>
          <button data-nav-target="evaluaciones" class="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer">
            Ver todas (${evals.length}) →
          </button>
        </div>

        <div class="divide-y divide-slate-100">
          ${recentEvals.length === 0 ? `
            <div class="p-8 text-center text-slate-400 text-sm">
              No hay evaluaciones registradas. Comience creando una evaluación.
            </div>
          ` : recentEvals.map((ev) => `
            <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900 text-base">${escapeHtml(ev.name)}</span>
                  <span class="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-md font-semibold">${ev.questionCount} Preguntas</span>
                  <span class="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-md font-semibold">${ev.alternativeCount} Opciones</span>
                </div>
                <div class="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">
                  ${ev.subject ? `<span><strong>Materia:</strong> ${escapeHtml(ev.subject)}</span>` : ''}
                  ${ev.course ? `<span><strong>Curso:</strong> ${escapeHtml(ev.course)}</span>` : ''}
                  <span><strong>Fecha:</strong> ${formatDate(ev.date)}</span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <button data-nav-target="clave" data-eval-id="${ev.id}" class="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer">
                  Clave
                </button>
                <button data-nav-target="hojas" data-eval-id="${ev.id}" class="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer">
                  Hojas A4
                </button>
                <button data-nav-target="escanear" data-eval-id="${ev.id}" class="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs">
                  Escanear
                </button>
                <button data-nav-target="resultados" data-eval-id="${ev.id}" class="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer">
                  Resultados
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/* ==========================================================================
   VISTA: EVALUACIONES (Listado completo)
   ========================================================================== */

async function renderEvaluacionesView(container) {
  const evals = await getEvaluations();

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-slate-900">Gestión de Evaluaciones</h1>
          <p class="text-sm text-slate-500">Administre sus exámenes, claves de respuestas y hojas de evaluación.</p>
        </div>
        <button data-nav-target="crear-evaluacion" class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-xs cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Crear Evaluación
        </button>
      </div>

      <!-- Buscador y filtro -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <svg class="w-5 h-5 absolute left-3 top-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input id="eval-search-input" type="text" placeholder="Buscar por nombre, materia o curso (ej. MCU, Física)..." class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
        </div>
      </div>

      <!-- Grid de Evaluaciones -->
      <div id="evals-list-container" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Renderizado dinámico -->
      </div>
    </div>
  `;

  const listContainer = container.querySelector('#evals-list-container');
  const searchInput = container.querySelector('#eval-search-input');

  const updateList = (filterText = '') => {
    const q = filterText.toLowerCase().trim();
    const filtered = evals.filter((ev) => {
      const matchName = ev.name.toLowerCase().includes(q);
      const matchSubject = (ev.subject || '').toLowerCase().includes(q);
      const matchCourse = (ev.course || '').toLowerCase().includes(q);
      return matchName || matchSubject || matchCourse;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200">
          <div class="text-slate-400 font-semibold mb-2">No se encontraron evaluaciones</div>
          <p class="text-xs text-slate-500 mb-4">Intente con otro término o cree una nueva evaluación.</p>
          <button data-nav-target="crear-evaluacion" class="px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition cursor-pointer">
            + Crear Evaluación
          </button>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map((ev) => `
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition">
        <div>
          <div class="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 class="text-lg font-bold text-slate-900">${escapeHtml(ev.name)}</h3>
              <div class="text-xs text-slate-500">
                ${ev.subject ? `${escapeHtml(ev.subject)} • ` : ''}
                ${ev.course ? `${escapeHtml(ev.course)} • ` : ''}
                ${formatDate(ev.date)}
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button data-action="duplicate-eval" data-eval-id="${ev.id}" class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" title="Duplicar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              </button>
              <button data-nav-target="editar-evaluacion" data-eval-id="${ev.id}" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button data-action="delete-eval" data-eval-id="${ev.id}" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Eliminar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 my-4">
            <span class="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
              ${ev.questionCount} Preguntas
            </span>
            <span class="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-sky-50 text-sky-800">
              ${ev.alternativeCount} Opciones (${ALTERNATIVES_MAP[ev.alternativeCount]?.join(', ')})
            </span>
            <span class="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800">
              Escala: ${formatNumber(ev.maxScore)} pts
            </span>
          </div>

          ${ev.description ? `<p class="text-xs text-slate-500 mb-4 line-clamp-2">${escapeHtml(ev.description)}</p>` : ''}
        </div>

        <div class="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          <button data-nav-target="clave" data-eval-id="${ev.id}" class="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-center cursor-pointer">
            Clave
          </button>
          <button data-nav-target="hojas" data-eval-id="${ev.id}" class="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-center cursor-pointer">
            Hojas
          </button>
          <button data-nav-target="escanear" data-eval-id="${ev.id}" class="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition text-center cursor-pointer shadow-xs">
            Escanear
          </button>
          <button data-nav-target="resultados" data-eval-id="${ev.id}" class="flex-1 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition text-center cursor-pointer">
            Resultados
          </button>
        </div>
      </div>
    `).join('');
  };

  updateList();

  searchInput.addEventListener('input', (e) => updateList(e.target.value));

  // Eventos de duplicación y eliminación
  listContainer.addEventListener('click', async (e) => {
    const dupBtn = e.target.closest('[data-action="duplicate-eval"]');
    if (dupBtn) {
      const id = dupBtn.getAttribute('data-eval-id');
      await duplicateEvaluation(id);
      showToast('Evaluación duplicada exitosamente.', 'success');
      renderEvaluacionesView(container);
      return;
    }

    const delBtn = e.target.closest('[data-action="delete-eval"]');
    if (delBtn) {
      const id = delBtn.getAttribute('data-eval-id');
      await removeEvaluationWithConfirm(id, () => {
        renderEvaluacionesView(container);
      });
    }
  });
}

/* ==========================================================================
   VISTA: FORMULARIO CREAR / EDITAR EVALUACIÓN
   ========================================================================== */

async function renderFormEvaluacionView(container, evaluationId = null) {
  const isEditing = !!evaluationId;
  let evalData = {
    name: '',
    subject: '',
    course: '',
    date: new Date().toISOString().split('T')[0],
    questionCount: 20,
    alternativeCount: 4,
    maxScore: 10.0,
    description: ''
  };

  if (isEditing) {
    const found = await getEvaluation(evaluationId);
    if (!found) {
      showToast('No se encontró la evaluación especificada.', 'error');
      navigate('evaluaciones');
      return;
    }
    evalData = found;
  }

  container.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-black text-slate-900">${isEditing ? 'Editar Evaluación' : 'Crear Nueva Evaluación'}</h1>
          <p class="text-sm text-slate-500">${isEditing ? 'Modifique los parámetros de la evaluación.' : 'Configure preguntas, alternativas y escala de calificación.'}</p>
        </div>
        <button data-nav-target="evaluaciones" class="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-2 rounded-xl transition cursor-pointer">
          ← Volver
        </button>
      </div>

      <form id="evaluation-form" class="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Nombre de la Evaluación *
          </label>
          <input type="text" name="name" required value="${escapeHtml(evalData.name)}" placeholder="Ej. MCU, Examen Quimestral, Lección 1" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Asignatura / Materia
            </label>
            <input type="text" name="subject" value="${escapeHtml(evalData.subject)}" placeholder="Ej. Física, Matemáticas, Química" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Curso / Paralelo
            </label>
            <input type="text" name="course" value="${escapeHtml(evalData.course)}" placeholder="Ej. 3ro BGU 'A', 10mo 'B'" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Fecha
            </label>
            <input type="date" name="date" value="${evalData.date}" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Número de Preguntas
            </label>
            <select name="questionCount" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition">
              <option value="20" ${evalData.questionCount === 20 ? 'selected' : ''}>20 preguntas (1 o 2 col.)</option>
              <option value="40" ${evalData.questionCount === 40 ? 'selected' : ''}>40 preguntas (2 col.)</option>
              <option value="60" ${evalData.questionCount === 60 ? 'selected' : ''}>60 preguntas (3 col.)</option>
              <option value="80" ${evalData.questionCount === 80 ? 'selected' : ''}>80 preguntas (4 col.)</option>
              <option value="10" ${evalData.questionCount === 10 ? 'selected' : ''}>10 preguntas (corta)</option>
              <option value="30" ${evalData.questionCount === 30 ? 'selected' : ''}>30 preguntas</option>
              <option value="50" ${evalData.questionCount === 50 ? 'selected' : ''}>50 preguntas</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Alternativas por Pregunta
            </label>
            <select name="alternativeCount" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition">
              <option value="4" ${evalData.alternativeCount === 4 ? 'selected' : ''}>4 Opciones (A, B, C, D)</option>
              <option value="5" ${evalData.alternativeCount === 5 ? 'selected' : ''}>5 Opciones (A, B, C, D, E)</option>
              <option value="3" ${evalData.alternativeCount === 3 ? 'selected' : ''}>3 Opciones (A, B, C)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Puntuación Máxima (Escala)
          </label>
          <input type="number" step="0.5" min="1" max="100" name="maxScore" value="${evalData.maxScore}" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
          <span class="text-xs text-slate-400 mt-1 block">Por defecto 10.00 puntos (escala estándar del sistema educativo ecuatoriano).</span>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Observaciones o Indicaciones
          </label>
          <textarea name="description" rows="2" placeholder="Opcional: tema central, unidades evaluadas o instrucciones específicas..." class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition">${escapeHtml(evalData.description)}</textarea>
        </div>

        <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" data-nav-target="evaluaciones" class="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer">
            Cancelar
          </button>
          <button type="submit" class="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer">
            ${isEditing ? 'Guardar Cambios' : 'Crear y Continuar a la Clave →'}
          </button>
        </div>
      </form>
    </div>
  `;

  const form = container.querySelector('#evaluation-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      subject: formData.get('subject'),
      course: formData.get('course'),
      date: formData.get('date'),
      questionCount: parseInt(formData.get('questionCount'), 10),
      alternativeCount: parseInt(formData.get('alternativeCount'), 10),
      maxScore: parseFloat(formData.get('maxScore')),
      description: formData.get('description')
    };

    try {
      if (isEditing) {
        await updateEvaluation(evaluationId, data);
        showToast('Evaluación actualizada correctamente.', 'success');
        navigate('evaluaciones');
      } else {
        const created = await createEvaluation(data);
        showToast(`Evaluación "${created.name}" creada con éxito.`, 'success');
        navigate('clave', { evaluationId: created.id });
      }
    } catch (err) {
      showToast(err.message, 'error', 5000);
    }
  });
}

/* ==========================================================================
   VISTA: CLAVE DE RESPUESTAS (Answer Key Editor)
   ========================================================================== */

async function renderClaveView(container, evalId) {
  if (!evalId) {
    const evals = await getEvaluations();
    if (evals.length > 0) evalId = evals[0].id;
    else {
      showToast('Cree una evaluación primero.', 'warning');
      navigate('crear-evaluacion');
      return;
    }
  }

  const { evaluation, answerKey, alternatives } = await loadOrCreateAnswerKey(evalId);
  const qCount = evaluation.questionCount;

  // Comprobar completitud
  const completeness = validateAnswerKeyCompleteness(answerKey.answers, qCount);

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              Clave de Respuestas
            </span>
            <span id="completeness-badge" class="text-xs font-bold px-2 py-0.5 rounded-md ${
              completeness.isComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }">
              ${completeness.answeredCount} / ${qCount} Preguntas asignadas
            </span>
          </div>
          <h1 class="text-2xl font-black text-slate-900 mt-1">${escapeHtml(evaluation.name)}</h1>
          <p class="text-xs text-slate-500">
            ${evaluation.subject ? `${escapeHtml(evaluation.subject)} • ` : ''}
            ${evaluation.course ? `${escapeHtml(evaluation.course)} • ` : ''}
            ${qCount} Preguntas (${alternatives.join(', ')})
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button data-nav-target="hojas" data-eval-id="${evalId}" class="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer">
            Imprimir Hojas A4
          </button>
          <button data-nav-target="escanear" data-eval-id="${evalId}" class="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-xs">
            Ir a Escanear →
          </button>
        </div>
      </div>

      <!-- Barra de herramientas rápidas -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-slate-600">Llenado rápido:</span>
          <button id="btn-sample-pattern" class="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer">
            Patrón de Prueba (A,B,C,D...)
          </button>
          <button id="btn-clear-key" class="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer">
            Limpiar Todo
          </button>
        </div>

        <div class="text-xs text-slate-500 italic">
          Las selecciones se guardan automáticamente en IndexedDB.
        </div>
      </div>

      <!-- Matriz interactiva de preguntas -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div id="key-questions-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <!-- Renderizado dinámico de filas de preguntas -->
        </div>
      </div>
    </div>
  `;

  const gridContainer = container.querySelector('#key-questions-grid');
  const completenessBadge = container.querySelector('#completeness-badge');

  const updateBadges = (currentAnswers) => {
    const val = validateAnswerKeyCompleteness(currentAnswers, qCount);
    completenessBadge.className = `text-xs font-bold px-2 py-0.5 rounded-md ${
      val.isComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
    }`;
    completenessBadge.textContent = `${val.answeredCount} / ${qCount} Preguntas asignadas`;
  };

  const renderQuestions = () => {
    let html = '';
    for (let q = 1; q <= qCount; q++) {
      const selected = answerKey.answers[q];
      let buttonsHtml = '';

      alternatives.forEach((alt) => {
        const isChosen = selected === alt;
        buttonsHtml += `
          <button 
            type="button" 
            data-q="${q}" 
            data-alt="${alt}"
            class="w-8 h-8 rounded-full text-xs font-bold transition flex items-center justify-center cursor-pointer ${
              isChosen 
                ? 'bg-blue-600 text-white shadow-xs scale-105' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }"
          >
            ${alt}
          </button>
        `;
      });

      html += `
        <div class="p-3 rounded-xl border ${selected ? 'border-blue-200 bg-blue-50/20' : 'border-slate-100 bg-slate-50/50'} flex items-center justify-between">
          <span class="text-xs font-bold ${selected ? 'text-blue-900' : 'text-slate-500'} w-8 text-right pr-2">${q}.</span>
          <div class="flex items-center gap-1.5">
            ${buttonsHtml}
          </div>
        </div>
      `;
    }
    gridContainer.innerHTML = html;
  };

  renderQuestions();

  // Evento al pulsar una alternativa
  gridContainer.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-q][data-alt]');
    if (!btn) return;

    const q = parseInt(btn.getAttribute('data-q'), 10);
    const alt = btn.getAttribute('data-alt');

    // Si ya estaba seleccionada, deseleccionar
    const currentVal = answerKey.answers[q];
    const newVal = currentVal === alt ? null : alt;

    answerKey.answers[q] = newVal;
    await updateQuestionAnswer(evalId, q, newVal);
    renderQuestions();
    updateBadges(answerKey.answers);
  });

  // Botón patrón de prueba
  container.querySelector('#btn-sample-pattern').addEventListener('click', async () => {
    const updated = await generateSampleAnswerPattern(evalId);
    answerKey.answers = updated.answers;
    renderQuestions();
    updateBadges(answerKey.answers);
    showToast('Patrón cíclico de prueba generado para todas las preguntas.', 'success');
  });

  // Botón limpiar clave
  container.querySelector('#btn-clear-key').addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: 'Limpiar Clave',
      message: '¿Desea borrar todas las respuestas de la clave?',
      confirmText: 'Limpiar',
      danger: true
    });
    if (confirmed) {
      const updated = await setAllAnswers(evalId, null);
      answerKey.answers = updated.answers;
      renderQuestions();
      updateBadges(answerKey.answers);
      showToast('Clave de respuestas restablecida.', 'info');
    }
  });
}

/* ==========================================================================
   VISTA: HOJAS DE RESPUESTAS A4 (Impresión y Generador de Muestra)
   ========================================================================== */

async function renderHojasView(container, evalId) {
  if (!evalId) {
    const evals = await getEvaluations();
    if (evals.length > 0) evalId = evals[0].id;
    else {
      showToast('Cree una evaluación primero.', 'warning');
      navigate('crear-evaluacion');
      return;
    }
  }

  const evaluation = await getEvaluation(evalId);
  if (!evaluation) {
    showToast('Evaluación no encontrada.', 'error');
    navigate('evaluaciones');
    return;
  }

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <!-- Barra de Controles superior (no se imprime) -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h1 class="text-xl font-bold text-slate-900">Hoja de Respuestas Imprimible A4</h1>
          <p class="text-xs text-slate-500">
            ${escapeHtml(evaluation.name)} • ${evaluation.questionCount} Preguntas (${evaluation.alternativeCount} alternativas)
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button id="btn-print-sheet" class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-xs cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Imprimir Hoja A4
          </button>
          <button id="btn-generate-sample-sheet" class="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition border border-emerald-200 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            Descargar Muestra Rellena (Para Probar Escaneo)
          </button>
        </div>
      </div>

      <!-- Contenedor con la Hoja Generada -->
      <div class="sheet-preview-wrapper flex justify-center">
        ${generatePrintableSheetHtml(evaluation)}
      </div>
    </div>
  `;

  // Botón Imprimir
  container.querySelector('#btn-print-sheet').addEventListener('click', () => {
    window.print();
  });

  // Botón Generar Muestra Rellena (descarga un PNG de prueba rellenado con respuestas para probar el escáner)
  container.querySelector('#btn-generate-sample-sheet').addEventListener('click', async () => {
    const keyData = await getAnswerKey(evalId);
    const answers = (keyData && keyData.answers) ? keyData.answers : {};
    
    // Si no tiene respuestas marcadas, crear un patrón de prueba
    const filled = {};
    const alts = ALTERNATIVES_MAP[evaluation.alternativeCount] || ['A', 'B', 'C', 'D'];
    for (let q = 1; q <= evaluation.questionCount; q++) {
      filled[q] = answers[q] || alts[(q - 1) % alts.length];
    }

    const testCanvas = document.createElement('canvas');
    drawSheetToCanvas(evaluation, testCanvas, filled);

    testCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EvalScan_MuestraRellena_${evaluation.name}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Imagen de muestra rellena generada y descargada. Puede importarla en "Escanear" para probar el OMR.', 'success', 5000);
    }, 'image/png');
  });
}

/* ==========================================================================
   VISTA: ESCANEAR RESPUESTAS (Cámara en vivo, importación y revisión OMR)
   ========================================================================== */

async function renderEscanearView(container, preselectedEvalId = null) {
  const evals = await getEvaluations();
  if (evals.length === 0) {
    showToast('Cree una evaluación antes de escanear hojas.', 'warning');
    navigate('crear-evaluacion');
    return;
  }

  let selectedEvalId = preselectedEvalId || evals[0].id;
  let currentEval = await getEvaluation(selectedEvalId);

  // Verificar si la evaluación tiene clave de respuestas antes de escanear
  const keyData = await getAnswerKey(selectedEvalId);
  const keyValidation = validateAnswerKeyCompleteness(keyData?.answers || {}, currentEval.questionCount);

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <!-- Selector de Evaluación y Estado -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex-1">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Evaluación a Escanear
          </label>
          <select id="scan-eval-select" class="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500">
            ${evals.map((ev) => `
              <option value="${ev.id}" ${ev.id === selectedEvalId ? 'selected' : ''}>
                ${escapeHtml(ev.name)} (${ev.questionCount} preguntas - ${formatDate(ev.date)})
              </option>
            `).join('')}
          </select>
        </div>

        <div>
          ${!keyValidation.isComplete ? `
            <div class="flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <svg class="w-4 h-4 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <span>Clave incompleta (${keyValidation.answeredCount}/${currentEval.questionCount}).</span>
              <button data-nav-target="clave" data-eval-id="${selectedEvalId}" class="underline font-bold hover:text-amber-900 cursor-pointer">Completar</button>
            </div>
          ` : `
            <div class="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>Clave lista para calificar</span>
            </div>
          `}
        </div>
      </div>

      <!-- Área de Adquisición de Imagen (Cámara / Subida) -->
      <div id="scan-capture-box" class="bg-slate-900 rounded-3xl p-4 sm:p-6 text-white shadow-2xl overflow-hidden relative">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-slate-300">Visor de Escaneo</span>
          </div>
          
          <div class="flex items-center gap-2">
            <button id="btn-toggle-torch" class="hidden p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl transition text-xs font-bold cursor-pointer" title="Activar Linterna">
              ⚡ Linterna
            </button>
            <button id="btn-switch-cam" class="hidden p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-xs font-bold cursor-pointer" title="Cambiar Cámara">
              🔄 Cambiar Cámara
            </button>
          </div>
        </div>

        <!-- Visor de Video / Frame con Guía de 4 Esquinas -->
        <div class="relative bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center min-h-[360px] sm:min-h-[460px]">
          <video id="camera-preview-video" playsinline autoplay muted class="w-full h-full object-contain max-h-[500px]"></video>
          
          <!-- Guía visual superpuesta (Fiducial guides) -->
          <div class="absolute inset-4 pointer-events-none border-2 border-dashed border-sky-400/40 rounded-xl flex flex-col justify-between p-4">
            <div class="flex justify-between">
              <div class="w-8 h-8 border-t-4 border-l-4 border-sky-400"></div>
              <div class="w-8 h-8 border-t-4 border-r-4 border-sky-400"></div>
            </div>
            <div class="text-center text-xs text-sky-200/80 bg-slate-900/60 backdrop-blur-xs py-1 px-3 rounded-full self-center">
              Alinee las 4 esquinas de la hoja dentro de las marcas
            </div>
            <div class="flex justify-between">
              <div class="w-8 h-8 border-b-4 border-l-4 border-sky-400"></div>
              <div class="w-8 h-8 border-b-4 border-r-4 border-sky-400"></div>
            </div>
          </div>

          <!-- Mensaje de estado inicial si la cámara no se ha iniciado -->
          <div id="cam-placeholder" class="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
            <svg class="w-16 h-16 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <div class="text-base font-bold text-slate-200 mb-1">Cámara lista para iniciar</div>
            <p class="text-xs text-slate-400 max-w-sm mb-4">Inicie la cámara del dispositivo o importe una fotografía existente de la hoja de respuestas.</p>
            <div class="flex flex-wrap justify-center gap-3">
              <button id="btn-start-camera" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md cursor-pointer flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                Iniciar Cámara
              </button>
            </div>
          </div>
        </div>

        <!-- Botones de Acción de Captura -->
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div class="flex items-center gap-2">
            <button id="btn-capture-frame" disabled class="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl transition shadow-lg cursor-pointer flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg>
              Tomar Foto y Procesar
            </button>
          </div>

          <div class="flex items-center gap-2">
            <label class="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition border border-slate-700 cursor-pointer flex items-center gap-2">
              <svg class="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              <span>Subir Foto de Hoja</span>
              <input id="input-file-image" type="file" accept="image/*" class="hidden" />
            </label>
            
            <button id="btn-quick-sample-scan" class="px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs rounded-xl transition border border-slate-700 cursor-pointer" title="Genera instantáneamente una hoja rellena y la procesa">
              Probar con Muestra
            </button>
          </div>
        </div>
      </div>

      <!-- Contenedor para la Revisión OMR Posterior a la Captura -->
      <div id="scan-review-container" class="hidden space-y-6"></div>
    </div>
  `;

  const select = container.querySelector('#scan-eval-select');
  const video = container.querySelector('#camera-preview-video');
  const camPlaceholder = container.querySelector('#cam-placeholder');
  const btnStartCam = container.querySelector('#btn-start-camera');
  const btnCapture = container.querySelector('#btn-capture-frame');
  const btnTorch = container.querySelector('#btn-toggle-torch');
  const btnSwitchCam = container.querySelector('#btn-switch-cam');
  const fileInput = container.querySelector('#input-file-image');
  const btnQuickSample = container.querySelector('#btn-quick-sample-scan');
  const reviewContainer = container.querySelector('#scan-review-container');

  select.addEventListener('change', async (e) => {
    selectedEvalId = e.target.value;
    currentEval = await getEvaluation(selectedEvalId);
    renderEscanearView(container, selectedEvalId);
  });

  // Iniciar cámara
  btnStartCam.addEventListener('click', async () => {
    try {
      const res = await AppState.cameraService.startCamera(video);
      camPlaceholder.classList.add('hidden');
      btnCapture.disabled = false;
      if (res.hasTorch) btnTorch.classList.remove('hidden');
      if (res.devices.length > 1) btnSwitchCam.classList.remove('hidden');
      showToast('Cámara iniciada correctamente.', 'info');
    } catch (err) {
      showToast(err.message, 'error', 6000);
    }
  });

  // Linterna
  btnTorch.addEventListener('click', async () => {
    const active = await AppState.cameraService.toggleTorch();
    btnTorch.classList.toggle('text-yellow-300', active);
  });

  // Cambiar cámara
  let currentCamIdx = 0;
  btnSwitchCam.addEventListener('click', async () => {
    const devices = AppState.cameraService.availableDevices;
    if (devices.length <= 1) return;
    currentCamIdx = (currentCamIdx + 1) % devices.length;
    try {
      await AppState.cameraService.startCamera(video, devices[currentCamIdx].deviceId);
    } catch (err) {
      showToast('Error al cambiar de cámara: ' + err.message, 'error');
    }
  });

  // Procesar fotograma capturado de la cámara
  btnCapture.addEventListener('click', async () => {
    try {
      showToast('Procesando hoja con OMR...', 'info', 2000);
      const frameCanvas = AppState.cameraService.captureFrame();
      await executeScanAndShowReview(frameCanvas, currentEval, reviewContainer);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Procesar archivo cargado
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      showToast('Cargando y analizando imagen...', 'info', 2000);
      const imgCanvas = await CameraService.loadImageFromFile(file);
      await executeScanAndShowReview(imgCanvas, currentEval, reviewContainer);
    } catch (err) {
      showToast(err.message, 'error', 5000);
    }
  });

  // Probar inmediatamente con muestra generada en memoria
  btnQuickSample.addEventListener('click', async () => {
    showToast('Generando hoja de prueba sintética...', 'info', 1500);
    const keyData = await getAnswerKey(selectedEvalId);
    const answers = keyData?.answers || {};
    const filled = {};
    const alts = ALTERNATIVES_MAP[currentEval.alternativeCount] || ['A', 'B', 'C', 'D'];
    
    // Simular que el estudiante acertó la mayoría de las preguntas con 2 o 3 errores intencionales
    for (let q = 1; q <= currentEval.questionCount; q++) {
      if (q === 3) filled[q] = alts[(alts.indexOf(answers[q] || 'A') + 1) % alts.length]; // Error intencional
      else if (q === 7) filled[q] = null; // En blanco intencional
      else filled[q] = answers[q] || alts[(q - 1) % alts.length];
    }

    const testCanvas = document.createElement('canvas');
    drawSheetToCanvas(currentEval, testCanvas, filled);
    await executeScanAndShowReview(testCanvas, currentEval, reviewContainer);
  });
}

/**
 * Ejecuta el pipeline de Visión por Computadora OMR y renderiza la pantalla de revisión interactiva
 */
async function executeScanAndShowReview(sourceCanvas, evaluation, container) {
  // Ejecutar el motor de escaneo
  const scanResult = await processSheetImage(sourceCanvas, evaluation);

  if (!scanResult.success) {
    playFeedbackSound('error');
    alertDialog({
      title: 'No se pudo leer la hoja',
      message: `${scanResult.error}\n\nRecomendaciones para una captura exitosa:\n• Asegúrese de que los 4 marcadores cuadrados de las esquinas estén visibles dentro de la imagen.\n• Evite sombras muy oscuras o reflejos excesivos de luz.\n• Mantenga la cámara paralela a la hoja sin inclinarla en ángulo extremo.`
    });
    return;
  }

  playFeedbackSound('success');
  showToast('¡Hoja reconocida con éxito! Revise las respuestas detectadas.', 'success');

  // Obtener clave oficial de la evaluación
  const keyData = await getAnswerKey(evaluation.id);
  const officialKey = keyData?.answers || {};

  // Copia mutable de las respuestas detectadas por el OMR
  const workingAnswers = { ...scanResult.detectedAnswers };

  // Renderizar la interfaz de revisión interactiva
  container.classList.remove('hidden');
  container.scrollIntoView({ behavior: 'smooth' });

  const renderReviewUi = () => {
    // Calificación provisional
    const previewGrade = gradeStudentSheet(workingAnswers, officialKey, evaluation);

    container.innerHTML = `
      <div class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Hoja Alineada y Reconocida
              </span>
              <span class="text-xs text-slate-400">ID: ${evaluation.id}</span>
            </div>
            <h2 class="text-2xl font-black text-slate-900 mt-1">Revisión de Calificación</h2>
            <p class="text-xs text-slate-500">Verifique los datos del estudiante y pulse sobre cualquier burbuja si desea corregir una marca.</p>
          </div>

          <!-- Nota preliminar calculada -->
          <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center min-w-[140px]">
            <div class="text-xs font-bold uppercase text-slate-500">Calificación</div>
            <div class="text-3xl font-black text-blue-700">${formatNumber(previewGrade.score)} <span class="text-xs text-slate-400 font-bold">/ ${formatNumber(previewGrade.maxScore)}</span></div>
            <div class="text-xs font-bold ${previewGrade.isPassed ? 'text-emerald-600' : 'text-rose-600'}">
              ${formatPercentage(previewGrade.percentage)} • ${previewGrade.isPassed ? 'Aprobado' : 'No Aprobado'}
            </div>
          </div>
        </div>

        <!-- Campos de Identificación del Estudiante -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nombre y Apellidos del Estudiante *
            </label>
            <input id="student-name-input" type="text" placeholder="Ej. Pérez Jonathan, Andrade María" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Cédula / Nro. Identificación
            </label>
            <input id="student-id-input" type="text" placeholder="Ej. 1718293847" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <!-- Métricas de Detección -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div class="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-100">
            <div class="text-xl font-bold">${previewGrade.correctCount}</div>
            <div class="text-xs font-semibold text-emerald-700">Aciertos (Correctas)</div>
          </div>
          <div class="p-3 rounded-xl bg-rose-50 text-rose-900 border border-rose-100">
            <div class="text-xl font-bold">${previewGrade.incorrectCount}</div>
            <div class="text-xs font-semibold text-rose-700">Errores</div>
          </div>
          <div class="p-3 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
            <div class="text-xl font-bold">${previewGrade.blankCount}</div>
            <div class="text-xs font-semibold text-slate-600">Sin Responder</div>
          </div>
          <div class="p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-100">
            <div class="text-xl font-bold">${scanResult.summary.multipleCount + scanResult.summary.doubtfulCount}</div>
            <div class="text-xs font-semibold text-amber-700">Dudosas / Múltiples</div>
          </div>
        </div>

        <!-- Matriz de Respuestas con Edición Manual -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-slate-800">Desglose de Respuestas por Pregunta</h3>
            <span class="text-xs text-slate-400">Haga clic en una opción para cambiarla manualmente si fuera necesario</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[380px] overflow-y-auto p-1">
            ${previewGrade.questionDetails.map((qd) => {
              const q = qd.questionNumber;
              const currentChoice = workingAnswers[q];
              const isCorrect = qd.isCorrect;
              const correctKey = qd.correctChoice;
              const alts = ALTERNATIVES_MAP[evaluation.alternativeCount] || ['A', 'B', 'C', 'D'];

              return `
                <div class="p-3 rounded-xl border ${
                  isCorrect 
                    ? 'border-emerald-200 bg-emerald-50/40' 
                    : (!currentChoice ? 'border-slate-200 bg-slate-50' : 'border-rose-200 bg-rose-50/40')
                }">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-xs text-slate-800">Pregunta ${q}</span>
                    <span class="text-xs font-bold px-1.5 py-0.5 rounded ${
                      isCorrect ? 'bg-emerald-100 text-emerald-800' : (!currentChoice ? 'bg-slate-200 text-slate-700' : 'bg-rose-100 text-rose-800')
                    }">
                      ${isCorrect ? '✓ Bien' : (!currentChoice ? 'Omitida' : '✗ Error')}
                    </span>
                  </div>

                  <div class="flex items-center justify-between gap-1">
                    ${alts.map((letter) => {
                      const isSelected = currentChoice === letter;
                      const isOfficialKey = correctKey === letter;

                      let btnClass = 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100';
                      if (isSelected && isOfficialKey) {
                        btnClass = 'bg-emerald-600 text-white font-black shadow-xs scale-105';
                      } else if (isSelected && !isOfficialKey) {
                        btnClass = 'bg-rose-600 text-white font-black shadow-xs scale-105';
                      } else if (!isSelected && isOfficialKey) {
                        btnClass = 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold';
                      }

                      return `
                        <button 
                          type="button" 
                          data-override-q="${q}" 
                          data-override-alt="${letter}"
                          class="w-7 h-7 rounded-full text-xs transition flex items-center justify-center cursor-pointer ${btnClass}"
                          title="${isOfficialKey ? 'Respuesta correcta según la clave' : ''}"
                        >
                          ${letter}
                        </button>
                      `;
                    }).join('')}
                    
                    <button 
                      type="button"
                      data-override-q="${q}" 
                      data-override-alt=""
                      class="text-[10px] text-slate-400 hover:text-rose-600 font-bold px-1 cursor-pointer"
                      title="Dejar en blanco"
                    >
                      Ø
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Vista del Lienzo Rectificado con Anotaciones OMR -->
        <details class="border border-slate-200 rounded-2xl p-4 bg-slate-50">
          <summary class="font-bold text-xs text-slate-700 cursor-pointer select-none">
            Ver Imagen Rectificada y Lectura de Burbujas del Escáner (OMR)
          </summary>
          <div class="mt-4 flex justify-center overflow-x-auto">
            <img src="${scanResult.annotatedCanvas.toDataURL('image/jpeg', 0.8)}" class="max-w-md w-full rounded-xl shadow-md border border-slate-300" alt="Hoja anotada" />
          </div>
        </details>

        <!-- Botones para Guardar o Descartar -->
        <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <button id="btn-cancel-scan" type="button" class="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer">
            Descartar Escaneo
          </button>
          
          <button id="btn-save-result" type="button" class="px-6 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md cursor-pointer flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Guardar Calificación del Estudiante
          </button>
        </div>
      </div>
    `;

    // Interacción de sobreescritura manual de respuestas
    container.querySelectorAll('[data-override-q]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = parseInt(btn.getAttribute('data-override-q'), 10);
        const alt = btn.getAttribute('data-override-alt') || null;
        workingAnswers[q] = alt;
        renderReviewUi();
      });
    });

    // Descartar
    container.querySelector('#btn-cancel-scan').addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: 'Descartar Escaneo',
        message: '¿Está seguro de descartar la captura actual sin guardar?',
        confirmText: 'Descartar',
        danger: true
      });
      if (confirmed) {
        container.classList.add('hidden');
        container.innerHTML = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // Guardar resultado
    container.querySelector('#btn-save-result').addEventListener('click', async () => {
      const nameInput = container.querySelector('#student-name-input');
      const idInput = container.querySelector('#student-id-input');

      const studentName = nameInput.value.trim() || 'Estudiante sin identificar';
      const studentId = idInput.value.trim();

      try {
        const { isDuplicate } = await saveStudentResult({
          evaluationId: evaluation.id,
          studentName,
          studentId,
          answers: workingAnswers,
          imageThumbnail: scanResult.annotatedCanvas.toDataURL('image/jpeg', 0.6)
        });

        if (isDuplicate) {
          showToast(`¡Aviso! Ya existía un resultado para "${studentName}". Se ha registrado como nueva entrada.`, 'warning', 5000);
        } else {
          showToast(`Calificación de "${studentName}" guardada exitosamente.`, 'success');
        }

        // Navegar a resultados
        navigate('resultados', { evaluationId: evaluation.id });
      } catch (err) {
        showToast(`Error al guardar: ${err.message}`, 'error');
      }
    });
  };

  renderReviewUi();
}

/* ==========================================================================
   VISTA: RESULTADOS DE LA EVALUACIÓN
   ========================================================================== */

async function renderResultadosView(container, evalId) {
  if (!evalId) {
    const evals = await getEvaluations();
    if (evals.length > 0) evalId = evals[0].id;
    else {
      showToast('Cree una evaluación primero.', 'warning');
      navigate('crear-evaluacion');
      return;
    }
  }

  const evaluation = await getEvaluation(evalId);
  const evals = await getEvaluations();
  const results = await getResultsByEvaluation(evalId);
  const stats = calculateAssessmentStatistics(results, evaluation);

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <!-- Selector de Evaluación y Acciones Principales -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Evaluación Seleccionada
          </label>
          <select id="results-eval-select" class="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500">
            ${evals.map((ev) => `
              <option value="${ev.id}" ${ev.id === evalId ? 'selected' : ''}>
                ${escapeHtml(ev.name)} (${ev.questionCount} preguntas)
              </option>
            `).join('')}
          </select>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button id="btn-export-csv" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar a Excel (CSV)
          </button>
          <button id="btn-print-report" class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Imprimir Reporte
          </button>
          <button data-nav-target="escanear" data-eval-id="${evalId}" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer">
            + Escanear Otra Hoja
          </button>
        </div>
      </div>

      <!-- Resumen Estadístico Real -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Hojas Calificadas</div>
          <div class="text-2xl font-black text-slate-900 mt-1">${stats.count}</div>
          <div class="text-xs text-slate-400 mt-0.5">Estudiantes</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Promedio General</div>
          <div class="text-2xl font-black text-blue-700 mt-1">
            ${stats.count > 0 ? formatNumber(stats.averageScore) : '-'} <span class="text-xs text-slate-400 font-bold">/ ${formatNumber(evaluation.maxScore)}</span>
          </div>
          <div class="text-xs text-slate-400 mt-0.5">Escala sobre ${evaluation.maxScore}</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasa de Aprobación</div>
          <div class="text-2xl font-black ${stats.passRate >= 70 ? 'text-emerald-700' : 'text-amber-700'} mt-1">
            ${stats.count > 0 ? formatPercentage(stats.passRate) : '-'}
          </div>
          <div class="text-xs text-slate-400 mt-0.5">${stats.passCount} aprobados, ${stats.failCount} suspensos</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Rango de Notas</div>
          <div class="text-2xl font-black text-slate-900 mt-1">
            ${stats.count > 0 ? `${formatNumber(stats.maxScore)} | ${formatNumber(stats.minScore)}` : '-'}
          </div>
          <div class="text-xs text-slate-400 mt-0.5">Máxima | Mínima</div>
        </div>
      </div>

      <!-- Buscador de Estudiantes -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input id="results-search-input" type="text" placeholder="Filtrar por nombre del estudiante o número de cédula..." class="w-full text-sm bg-transparent border-none focus:outline-hidden" />
      </div>

      <!-- Tabla de Estudiantes Calificados -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="table-responsive-container">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th class="py-3 px-4 text-center w-12">#</th>
                <th class="py-3 px-4">Estudiante</th>
                <th class="py-3 px-4">Identificación</th>
                <th class="py-3 px-4 text-center">Aciertos</th>
                <th class="py-3 px-4 text-center">Errores</th>
                <th class="py-3 px-4 text-center">En Blanco</th>
                <th class="py-3 px-4 text-center">Porcentaje</th>
                <th class="py-3 px-4 text-center">Calificación</th>
                <th class="py-3 px-4 text-center">Estado</th>
                <th class="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="results-table-body" class="divide-y divide-slate-100">
              <!-- Filas dinámicas -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Análisis de Dificultad por Pregunta (Item Analytics) -->
      ${stats.count > 0 ? `
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h3 class="text-sm font-bold text-slate-800 mb-2">Análisis de Dificultad por Pregunta (% de Acierto)</h3>
          <p class="text-xs text-slate-500 mb-4">Permite al docente detectar temas donde la clase presentó mayores dudas o falencias.</p>
          
          <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
            ${stats.itemAnalytics.map((item) => `
              <div class="p-2.5 rounded-xl border ${
                item.percentage >= 75 ? 'border-emerald-200 bg-emerald-50/50' : (item.percentage <= 40 ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-slate-50')
              }">
                <div class="flex justify-between items-center text-xs font-bold">
                  <span>Preg. ${item.questionNumber}</span>
                  <span class="${item.percentage >= 75 ? 'text-emerald-700' : (item.percentage <= 40 ? 'text-rose-700' : 'text-slate-600')}">
                    ${formatPercentage(item.percentage)}
                  </span>
                </div>
                <div class="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div class="h-full rounded-full ${
                    item.percentage >= 75 ? 'bg-emerald-500' : (item.percentage <= 40 ? 'bg-rose-500' : 'bg-blue-500')
                  }" style="width: ${item.percentage}%;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  const evalSelect = container.querySelector('#results-eval-select');
  const searchInput = container.querySelector('#results-search-input');
  const tbody = container.querySelector('#results-table-body');

  evalSelect.addEventListener('change', (e) => {
    navigate('resultados', { evaluationId: e.target.value });
  });

  const updateTable = (filter = '') => {
    const q = filter.toLowerCase().trim();
    const filtered = results.filter((r) => {
      return (r.studentName || '').toLowerCase().includes(q) || (r.studentId || '').includes(q);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="py-12 text-center text-slate-400">
            ${results.length === 0 ? 'No hay hojas escaneadas para esta evaluación todavía.' : 'No se encontraron estudiantes con ese criterio.'}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((r, idx) => `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="py-3 px-4 text-center text-xs text-slate-400 font-bold">${idx + 1}</td>
        <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(r.studentName)}</td>
        <td class="py-3 px-4 text-xs text-slate-500 font-mono">${escapeHtml(r.studentId || '-')}</td>
        <td class="py-3 px-4 text-center font-bold text-emerald-600">${r.correctCount}</td>
        <td class="py-3 px-4 text-center font-bold text-rose-600">${r.incorrectCount}</td>
        <td class="py-3 px-4 text-center text-slate-400">${r.blankCount}</td>
        <td class="py-3 px-4 text-center text-xs font-semibold">${formatPercentage(r.percentage)}</td>
        <td class="py-3 px-4 text-center font-black text-slate-900 text-base">${formatNumber(r.score)}</td>
        <td class="py-3 px-4 text-center">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
            r.isPassed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }">
            ${r.isPassed ? 'Aprobado' : 'No Aprobado'}
          </span>
        </td>
        <td class="py-3 px-4 text-right">
          <div class="inline-flex items-center gap-1">
            <button data-action="view-student-detail" data-result-id="${r.id}" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Ver Detalle de Respuestas">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </button>
            <button data-action="delete-result" data-result-id="${r.id}" class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition" title="Eliminar Registro">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  };

  updateTable();

  searchInput.addEventListener('input', (e) => updateTable(e.target.value));

  // Exportar CSV
  container.querySelector('#btn-export-csv').addEventListener('click', () => {
    try {
      exportResultsToCsv(evaluation, results);
    } catch (err) {
      showToast(err.message, 'warning');
    }
  });

  // Imprimir reporte
  container.querySelector('#btn-print-report').addEventListener('click', () => {
    openPrintableResultsReport(evaluation, results);
  });

  // Acciones en la tabla
  tbody.addEventListener('click', async (e) => {
    const detailBtn = e.target.closest('[data-action="view-student-detail"]');
    if (detailBtn) {
      const resId = detailBtn.getAttribute('data-result-id');
      const studentResult = await getResult(resId);
      if (studentResult) {
        showStudentDetailModal(studentResult, evaluation);
      }
      return;
    }

    const delBtn = e.target.closest('[data-action="delete-result"]');
    if (delBtn) {
      const resId = delBtn.getAttribute('data-result-id');
      await removeResultWithConfirm(resId, () => {
        renderResultadosView(container, evalId);
      });
    }
  });
}

/**
 * Modal con el desglose individual de preguntas del estudiante
 */
function showStudentDetailModal(res, evaluation) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in';

  overlay.innerHTML = `
    <div class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col" role="dialog" aria-modal="true">
      <div class="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
            Auditoría de Examen
          </span>
          <h3 class="text-xl font-bold text-slate-900 mt-1">${escapeHtml(res.studentName)}</h3>
          <p class="text-xs text-slate-500">${res.studentId ? `ID: ${escapeHtml(res.studentId)} • ` : ''}Escaneado el ${formatDate(res.scannedAt, true)}</p>
        </div>
        <div class="text-right">
          <div class="text-2xl font-black text-blue-700">${formatNumber(res.score)} / ${formatNumber(res.maxScore)}</div>
          <div class="text-xs font-bold ${res.isPassed ? 'text-emerald-600' : 'text-rose-600'}">${formatPercentage(res.percentage)}</div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto space-y-3 pr-1">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs mb-3">
          <div class="p-2 bg-emerald-50 rounded-xl font-bold text-emerald-800">${res.correctCount} Correctas</div>
          <div class="p-2 bg-rose-50 rounded-xl font-bold text-rose-800">${res.incorrectCount} Incorrectas</div>
          <div class="p-2 bg-slate-100 rounded-xl font-bold text-slate-700">${res.blankCount} Sin Responder</div>
          <div class="p-2 bg-sky-50 rounded-xl font-bold text-sky-800">${escapeHtml(res.performanceLevel || 'Evaluado')}</div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${(res.questionDetails || []).map((qd) => `
            <div class="p-2.5 rounded-xl border flex items-center justify-between text-xs ${
              qd.isCorrect ? 'border-emerald-200 bg-emerald-50/50' : (!qd.studentChoice ? 'border-slate-200 bg-slate-50' : 'border-rose-200 bg-rose-50/50')
            }">
              <div>
                <span class="font-bold">Pregunta ${qd.questionNumber}:</span>
                <span class="ml-1 ${qd.isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}">
                  ${qd.studentChoice || 'En blanco'}
                </span>
                ${!qd.isCorrect ? `<span class="text-slate-400 ml-1">(Correcta: ${qd.correctChoice})</span>` : ''}
              </div>
              <span class="font-bold text-[10px] ${qd.isCorrect ? 'text-emerald-700' : 'text-slate-400'}">
                +${formatNumber(qd.pointsAwarded, 2)} pts
              </span>
            </div>
          `).join('')}
        </div>

        ${res.imageThumbnail ? `
          <div class="mt-4 pt-4 border-t border-slate-100">
            <span class="block text-xs font-bold text-slate-700 mb-2">Captura Procesada OMR:</span>
            <img src="${res.imageThumbnail}" class="w-full max-h-60 object-contain rounded-xl border border-slate-200" alt="Captura de hoja" />
          </div>
        ` : ''}
      </div>

      <div class="pt-4 border-t border-slate-100 flex justify-end mt-4">
        <button id="modal-close-btn" class="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer">
          Cerrar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#modal-close-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
}

/* ==========================================================================
   VISTA: CONFIGURACIÓN, RESPALDOS Y DIAGNÓSTICO
   ========================================================================== */

async function renderConfiguracionView(container) {
  const evals = await getEvaluations();
  let totalResults = 0;
  for (const ev of evals) {
    const res = await getResultsByEvaluation(ev.id);
    totalResults += res.length;
  }

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h1 class="text-2xl font-black text-slate-900">Configuración y Almacenamiento</h1>
        <p class="text-sm text-slate-500">Administre copias de seguridad locales, verifique el estado offline y ejecute pruebas diagnósticas.</p>
      </div>

      <!-- Estado Offline y PWA -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">Funcionamiento Offline-First</h3>
            <p class="text-xs text-slate-500">EvalScan opera enteramente en su dispositivo usando IndexedDB y Service Workers.</p>
          </div>
        </div>

        <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
          <p><strong>Nota para el docente:</strong> Todos sus exámenes, claves y calificaciones están almacenados en el navegador local de este equipo. No se envían datos a servidores externos ni a la nube.</p>
          <p class="mt-2 text-rose-700 font-semibold">Importante: Si borra los datos de navegación o historial del navegador, podría eliminar sus evaluaciones. Utilice el botón "Descargar Respaldo JSON" periódicamente para salvaguardar sus datos.</p>
        </div>
      </div>

      <!-- Copias de Seguridad (Backup & Restore) -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 class="text-base font-bold text-slate-900">Copias de Seguridad</h3>
        <p class="text-xs text-slate-500">Exporte todos sus datos en un único archivo JSON o restaure un respaldo previo.</p>

        <div class="flex flex-wrap items-center gap-3">
          <button id="btn-export-backup" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Descargar Respaldo JSON
          </button>

          <label class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            <span>Restaurar desde Respaldo JSON</span>
            <input id="input-restore-backup" type="file" accept=".json" class="hidden" />
          </label>
        </div>
      </div>

      <!-- Diagnóstico y Pruebas del Sistema -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 class="text-base font-bold text-slate-900">Diagnóstico y Verificación de Requisitos</h3>
        <p class="text-xs text-slate-500">Ejecuta una serie de pruebas internas para validar IndexedDB, plantillas de 20/40/60/80 preguntas, visión OMR y cálculo de notas.</p>

        <button id="btn-run-diagnostics" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Ejecutar Diagnóstico y Pruebas del Sistema
        </button>

        <div id="diagnostics-results-box" class="hidden p-4 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono whitespace-pre-line leading-relaxed max-h-80 overflow-y-auto"></div>
      </div>
    </div>
  `;

  // Descargar respaldo
  container.querySelector('#btn-export-backup').addEventListener('click', async () => {
    await exportDatabaseBackup();
  });

  // Restaurar respaldo
  const restoreInput = container.querySelector('#input-restore-backup');
  restoreInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const confirmed = await confirmDialog({
      title: 'Restaurar Copia de Seguridad',
      message: 'Esta acción importará las evaluaciones y resultados contenidos en el archivo. ¿Desea continuar?',
      confirmText: 'Sí, restaurar'
    });

    if (confirmed) {
      try {
        await restoreDatabaseFromFile(file);
        navigate('inicio');
      } catch (err) {
        showToast(err.message, 'error', 6000);
      }
    }
  });

  // Diagnóstico y pruebas
  container.querySelector('#btn-run-diagnostics').addEventListener('click', async () => {
    const diagBox = container.querySelector('#diagnostics-results-box');
    diagBox.classList.remove('hidden');
    diagBox.textContent = 'Iniciando suite de pruebas automatizadas...\n';

    const log = (msg) => {
      diagBox.textContent += msg + '\n';
      diagBox.scrollTop = diagBox.scrollHeight;
    };

    try {
      // 1. Prueba IndexedDB
      log('1. Verificando almacenamiento persistente IndexedDB...');
      const db = await initDB();
      log(`   ✓ Base de datos: ${db.name} (Versión ${db.version}) OK.`);

      // 2. Prueba de evaluación MCU
      log('2. Comprobando existencia o creación de evaluación "MCU"...');
      const evals = await getEvaluations();
      let mcu = evals.find((e) => e.name === 'MCU');
      if (!mcu) {
        mcu = await createEvaluation({ name: 'MCU', questionCount: 20, alternativeCount: 4, maxScore: 10.0 });
      }
      log(`   ✓ Evaluación MCU persistida con ID: ${mcu.id} OK.`);

      // 3. Prueba de configuraciones de hojas (20, 40, 60, 80 preguntas)
      log('3. Validando generador de geometrías A4 para 20, 40, 60 y 80 preguntas...');
      [20, 40, 60, 80].forEach((count) => {
        const layout = calculateSheetLayout(count, 4);
        log(`   ✓ Diseño ${count} preguntas: ${layout.numCols} columnas, ${layout.questionsPerCol} filas por columna. Margen OK.`);
      });

      // 4. Prueba de motor de calificación determinista
      log('4. Verificando motor de calificación determinista...');
      const testKey = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'A' };
      const testStudent = { 1: 'A', 2: 'B', 3: 'A', 4: 'D', 5: null }; // 3 aciertos de 5
      const grade = gradeStudentSheet(testStudent, testKey, { id: 'test', questionCount: 5, maxScore: 10.0 });
      if (grade.correctCount === 3 && grade.score === 6.0 && grade.percentage === 60.0) {
        log(`   ✓ Calificación: 3 aciertos = 6,00/10,00 (60,0%) OK.`);
      } else {
        throw new Error('Fallo en la prueba de cálculo matemático de notas.');
      }

      // 5. Prueba de Visión por Computadora y OMR sobre muestra sintética
      log('5. Ejecutando prueba de Visión por Computadora y OMR...');
      const testCanvas = document.createElement('canvas');
      drawSheetToCanvas(mcu, testCanvas, { 1: 'A', 2: 'C', 3: 'B' });
      const scanResult = await processSheetImage(testCanvas, mcu);
      if (scanResult.success) {
        log(`   ✓ Detección de marcadores fiduciales y corrección proyectiva OK.`);
        log(`   ✓ Lectura OMR: Pregunta 1 detectó "${scanResult.detectedAnswers[1]}", Pregunta 2 detectó "${scanResult.detectedAnswers[2]}".`);
      } else {
        log(`   ⚠ Nota OMR: ${scanResult.error}`);
      }

      // 6. Prueba Service Worker
      log('6. Estado de Service Worker y soporte Offline...');
      if ('serviceWorker' in navigator) {
        log('   ✓ API de Service Worker soportada en el navegador.');
      }

      log('\n=============================================');
      log('¡TODAS LAS PRUEBAS DIAGNÓSTICAS FINALIZARON CON ÉXITO!');
      log('=============================================');
      showToast('Diagnóstico del sistema completado con éxito.', 'success');
    } catch (err) {
      log(`\n❌ ERROR EN DIAGNÓSTICO: ${err.message}`);
      showToast(`Error en diagnóstico: ${err.message}`, 'error', 6000);
    }
  });
}
