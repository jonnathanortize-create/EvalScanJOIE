/**
 * EvalScan - Generador de Hojas de Respuestas Imprimibles (sheet-generator.js)
 * Genera hojas A4 optimizadas para impresión y coordenadas normalizadas
 * compartidas con el motor de visión por computadora (OMR).
 */

import { ALTERNATIVES_MAP } from './evaluations.js';
import { escapeHtml, formatDate } from './utils.js';

/**
 * Geometría normalizada canónica (Canvas A4: 800 x 1131 px, ratio 1:1.41375)
 * Estos mismos parámetros son leídos por scanner.js para reconocer las burbujas.
 */
export const TEMPLATE_GEOMETRY = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 1131,
  
  // Marcadores de registro en las 4 esquinas (centros en píxeles normalizados)
  MARKERS: {
    TOP_LEFT: { x: 50, y: 50, size: 36, id: 'TL' },
    TOP_RIGHT: { x: 750, y: 50, size: 36, id: 'TR' },
    BOTTOM_RIGHT: { x: 750, y: 1081, size: 36, id: 'BR' },
    BOTTOM_LEFT: { x: 50, y: 1081, size: 36, id: 'BL' }
  },

  // Área útil de preguntas
  GRID_AREA: {
    TOP: 250,
    BOTTOM: 1040,
    LEFT: 55,
    RIGHT: 745
  },

  // Dimensiones de burbuja
  BUBBLE_RADIUS: 9, // Radio en píxeles normalizados
  BUBBLE_SPACING_X: 25 // Separación horizontal entre burbujas (A, B, C, D)
};

/**
 * Calcula la distribución de columnas y coordenadas exactas para cada pregunta y burbuja
 */
export function calculateSheetLayout(questionCount, alternativeCount = 4) {
  const alts = ALTERNATIVES_MAP[alternativeCount] || ['A', 'B', 'C', 'D'];
  
  // Determinar número óptimo de columnas según el número de preguntas
  let numCols = 1;
  if (questionCount <= 25) {
    numCols = questionCount <= 15 ? 1 : 2;
  } else if (questionCount <= 50) {
    numCols = 2;
  } else if (questionCount <= 75) {
    numCols = 3;
  } else {
    numCols = 4;
  }

  const questionsPerCol = Math.ceil(questionCount / numCols);
  const gridWidth = TEMPLATE_GEOMETRY.GRID_AREA.RIGHT - TEMPLATE_GEOMETRY.GRID_AREA.LEFT;
  const colWidth = gridWidth / numCols;

  const gridHeight = TEMPLATE_GEOMETRY.GRID_AREA.BOTTOM - TEMPLATE_GEOMETRY.GRID_AREA.TOP;
  const rowHeight = Math.min(38, gridHeight / questionsPerCol);

  const questionsMap = {};

  for (let q = 1; q <= questionCount; q++) {
    const colIndex = Math.floor((q - 1) / questionsPerCol);
    const rowIndex = (q - 1) % questionsPerCol;

    const colLeft = TEMPLATE_GEOMETRY.GRID_AREA.LEFT + colIndex * colWidth;
    const rowCenterY = TEMPLATE_GEOMETRY.GRID_AREA.TOP + rowIndex * rowHeight + rowHeight * 0.5;

    // Centro del número de pregunta
    const numberX = colLeft + 20;

    // Centros de las burbujas para cada alternativa
    const startBubblesX = colLeft + 52;
    const bubbles = {};

    alts.forEach((alt, altIdx) => {
      bubbles[alt] = {
        x: Math.round(startBubblesX + altIdx * TEMPLATE_GEOMETRY.BUBBLE_SPACING_X),
        y: Math.round(rowCenterY),
        radius: TEMPLATE_GEOMETRY.BUBBLE_RADIUS
      };
    });

    questionsMap[q] = {
      questionNumber: q,
      colIndex,
      rowIndex,
      numberX,
      y: rowCenterY,
      bubbles
    };
  }

  return {
    numCols,
    questionsPerCol,
    colWidth,
    rowHeight,
    questionsMap,
    alts
  };
}

/**
 * Genera el documento HTML completo listo para imprimir en A4
 */
export function generatePrintableSheetHtml(evaluation) {
  const qCount = evaluation.questionCount || 20;
  const altCount = evaluation.alternativeCount || 4;
  const layout = calculateSheetLayout(qCount, altCount);
  const alts = layout.alts;

  // Renderizar columnas de preguntas
  let columnsHtml = '';
  for (let c = 0; c < layout.numCols; c++) {
    const startQ = c * layout.questionsPerCol + 1;
    const endQ = Math.min((c + 1) * layout.questionsPerCol, qCount);

    let rowsHtml = '';
    for (let q = startQ; q <= endQ; q++) {
      let bubblesHtml = '';
      alts.forEach((letter) => {
        bubblesHtml += `
          <div class="omr-bubble" data-question="${q}" data-alt="${letter}">
            <span class="bubble-letter">${letter}</span>
          </div>
        `;
      });

      rowsHtml += `
        <div class="omr-row" style="height: ${Math.max(24, Math.floor(layout.rowHeight * 0.7))}px;">
          <div class="omr-q-num">${q}</div>
          <div class="omr-bubbles-group">
            ${bubblesHtml}
          </div>
        </div>
      `;
    }

    columnsHtml += `
      <div class="omr-column" style="width: ${Math.floor(100 / layout.numCols)}%;">
        <div class="omr-column-header">
          <span class="hdr-num">N°</span>
          <span class="hdr-opts">OPCIONES</span>
        </div>
        ${rowsHtml}
      </div>
    `;
  }

  return `
    <div class="evalscan-a4-sheet" id="print-sheet-root">
      <!-- 4 MARCADORES DE REGISTRO EN LAS ESQUINAS (FIDUCIAL TARGETS) -->
      <div class="fiducial-marker marker-tl" title="TL">
        <div class="marker-outer">
          <div class="marker-inner">
            <div class="marker-core tl-core"></div>
          </div>
        </div>
      </div>

      <div class="fiducial-marker marker-tr" title="TR">
        <div class="marker-outer">
          <div class="marker-inner">
            <div class="marker-core"></div>
          </div>
        </div>
      </div>

      <div class="fiducial-marker marker-bl" title="BL">
        <div class="marker-outer">
          <div class="marker-inner">
            <div class="marker-core"></div>
          </div>
        </div>
      </div>

      <div class="fiducial-marker marker-br" title="BR">
        <div class="marker-outer">
          <div class="marker-inner">
            <div class="marker-core"></div>
          </div>
        </div>
      </div>

      <!-- BARRA DE ORIENTACIÓN SUPERIOR -->
      <div class="top-orientation-bar"></div>

      <!-- CABECERA DE LA HOJA -->
      <header class="sheet-header">
        <div class="sheet-brand">
          <div class="brand-badge">
            <span class="brand-title">EvalScan</span>
            <span class="brand-sub">SISTEMA OMR</span>
          </div>
          <div class="eval-metadata">
            <div class="eval-title">${escapeHtml(evaluation.name)}</div>
            <div class="eval-details">
              ${evaluation.subject ? `<span><strong>Materia:</strong> ${escapeHtml(evaluation.subject)}</span>` : ''}
              ${evaluation.course ? `<span><strong>Curso:</strong> ${escapeHtml(evaluation.course)}</span>` : ''}
              <span><strong>Fecha:</strong> ${formatDate(evaluation.date)}</span>
            </div>
          </div>
        </div>

        <!-- CAMPOS DEL ESTUDIANTE -->
        <div class="student-fields-box">
          <div class="field-row">
            <span class="field-label">ESTUDIANTE (Apellidos y Nombres):</span>
            <div class="field-line"></div>
          </div>
          <div class="field-grid-row">
            <div class="field-col">
              <span class="field-label">CÉDULA / MATRÍCULA:</span>
              <div class="field-line"></div>
            </div>
            <div class="field-col">
              <span class="field-label">PARALELO / SECCIÓN:</span>
              <div class="field-line"></div>
            </div>
          </div>
        </div>

        <!-- INSTRUCCIONES DE LLENADO -->
        <div class="sheet-instructions">
          <strong>INSTRUCCIONES:</strong> Use lápiz grafito o bolígrafo azul/negro. Rellene totalmente el círculo (●).
          No use marcas tenues (x, -). No doble ni manche las marcas cuadradas de las 4 esquinas.
        </div>
      </header>

      <!-- CUADRÍCULA DE PREGUNTAS -->
      <main class="sheet-grid-container">
        ${columnsHtml}
      </main>

      <!-- PIE DE HOJA -->
      <footer class="sheet-footer">
        <span class="footer-id">ID: ${evaluation.id} | ${qCount} PREGUNTAS | ${altCount} ALTERNATIVAS</span>
        <span class="footer-note">Hoja oficial generada para escaneo automático offline con EvalScan</span>
      </footer>
    </div>
  `;
}

/**
 * Dibuja una hoja de respuestas directamente en un HTMLCanvasElement
 * (Útil para simulación, pruebas unitarias del OMR y vista previa rápida)
 */
export function drawSheetToCanvas(evaluation, canvas, filledAnswers = {}) {
  const qCount = evaluation.questionCount || 20;
  const altCount = evaluation.alternativeCount || 4;
  const layout = calculateSheetLayout(qCount, altCount);

  canvas.width = TEMPLATE_GEOMETRY.CANVAS_WIDTH;
  canvas.height = TEMPLATE_GEOMETRY.CANVAS_HEIGHT;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar los 4 marcadores de esquina fiduciales
  const drawMarker = (cx, cy, isTopLeft = false) => {
    const size = 36;
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size);

    // Borde blanco interior
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 10, cy - 10, 20, 20);

    // Núcleo negro
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 5, cy - 5, 10, 10);

    // Si es esquina superior izquierda, añadir distintivo para orientación única
    if (isTopLeft) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(cx - 14, cy - 14, 6, 6);
    }
  };

  const m = TEMPLATE_GEOMETRY.MARKERS;
  drawMarker(m.TOP_LEFT.x, m.TOP_LEFT.y, true);
  drawMarker(m.TOP_RIGHT.x, m.TOP_RIGHT.y, false);
  drawMarker(m.BOTTOM_RIGHT.x, m.BOTTOM_RIGHT.y, false);
  drawMarker(m.BOTTOM_LEFT.x, m.BOTTOM_LEFT.y, false);

  // Barra de alineación superior
  ctx.fillStyle = '#000000';
  ctx.fillRect(100, 35, 600, 4);

  // Encabezado
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('EvalScan - Hoja de Respuestas', 80, 95);

  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`Evaluación: ${evaluation.name}`, 80, 125);

  ctx.font = 'normal 13px sans-serif';
  ctx.fillStyle = '#475569';
  const subInfo = [
    evaluation.subject ? `Materia: ${evaluation.subject}` : '',
    evaluation.course ? `Curso: ${evaluation.course}` : '',
    `Fecha: ${formatDate(evaluation.date)}`
  ].filter(Boolean).join('  |  ');
  ctx.fillText(subInfo, 80, 148);

  // Recuadro de datos del estudiante
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(80, 165, 640, 60);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('ESTUDIANTE (Apellidos y Nombres): __________________________________________________', 95, 190);
  ctx.fillText('CÉDULA / MATRÍCULA: ______________________    PARALELO: _________    FIRMA: ____________', 95, 212);

  // Dibujar preguntas y burbujas
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let q = 1; q <= qCount; q++) {
    const qData = layout.questionsMap[q];
    if (!qData) continue;

    // Número de pregunta
    ctx.fillStyle = '#334155';
    ctx.fillText(`${q}.`, qData.numberX, qData.y);

    // Burbujas
    layout.alts.forEach((letter) => {
      const b = qData.bubbles[letter];
      const isFilled = filledAnswers[q] === letter;

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);

      if (isFilled) {
        // Burbuja rellenada sólidamente con lápiz / bolígrafo
        ctx.fillStyle = '#111827';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(letter, b.x, b.y);
      } else {
        // Burbuja vacía
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#475569';
        ctx.fillText(letter, b.x, b.y);
      }
    });
  }

  // Pie de página
  ctx.font = 'normal 11px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.fillText(`ID: ${evaluation.id}  •  ${qCount} Preguntas  •  EvalScan Offline OMR`, canvas.width / 2, 1060);
}
