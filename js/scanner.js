/**
 * EvalScan - Motor de Escaneo y Reconocimiento Óptico de Marcas (scanner.js)
 * Coordina la detección de esquinas, rectificación proyectiva de la hoja
 * y lectura de burbujas (OMR) con umbrales adaptativos y control de ambigüedades.
 */

import {
  toGrayscale,
  adaptiveThreshold,
  findFiducialMarkers,
  validateQuadrilateral,
  warpPerspective
} from './image-processing.js';
import { calculateSheetLayout, TEMPLATE_GEOMETRY } from './sheet-generator.js';

export const OMR_STATUS = {
  SINGLE: 'SINGLE',         // Una sola alternativa claramente marcada
  NONE: 'NONE',             // Pregunta sin responder
  MULTIPLE: 'MULTIPLE',     // Varias alternativas marcadas
  DOUBTFUL: 'DOUBTFUL'      // Respuesta dudosa o con baja confianza
};

/**
 * Escanea y procesa una imagen de hoja de respuestas
 */
export async function processSheetImage(sourceCanvas, evaluation) {
  const imgWidth = sourceCanvas.width;
  const imgHeight = sourceCanvas.height;

  // 1. Convertir a escala de grises
  const srcCtx = sourceCanvas.getContext('2d');
  const srcImageData = srcCtx.getImageData(0, 0, imgWidth, imgHeight);
  const gray = toGrayscale(srcImageData);

  // 2. Umbralización adaptativa para aislar marcas de tinta
  const binary = adaptiveThreshold(gray, imgWidth, imgHeight, 25, 12);

  // 3. Localizar candidatos a marcadores fiduciales en las 4 esquinas
  let corners = findFiducialMarkers(binary, imgWidth, imgHeight);

  // Si no se encuentran los 4 marcadores y la imagen es horizontal (landscape), rotar 90 grados y reintentar
  if ((!corners.TL || !corners.TR || !corners.BR || !corners.BL) && imgWidth > imgHeight) {
    const rotatedCanvas = rotateCanvas90(sourceCanvas);
    return processSheetImage(rotatedCanvas, evaluation);
  }

  // 4. Validar consistencia geométrica del cuadrilátero
  const validation = validateQuadrilateral(corners, imgWidth, imgHeight);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      corners,
      normalizedCanvas: null,
      detectedAnswers: {}
    };
  }

  // 5. Rectificación proyectiva hacia el Canvas normalizado (800 x 1131 px)
  let normalizedCanvas;
  try {
    normalizedCanvas = warpPerspective(sourceCanvas, corners, TEMPLATE_GEOMETRY.CANVAS_WIDTH, TEMPLATE_GEOMETRY.CANVAS_HEIGHT);
  } catch (err) {
    return {
      success: false,
      error: `Fallo en la corrección de perspectiva: ${err.message}`,
      corners,
      normalizedCanvas: null,
      detectedAnswers: {}
    };
  }

  // 6. Extracción OMR de burbujas en el canvas normalizado
  const omrResults = extractOmrAnswers(normalizedCanvas, evaluation);

  // 7. Generar lienzo con overlay visual de inspección (burbujas reconocidas)
  const annotatedCanvas = createAnnotatedCanvas(normalizedCanvas, evaluation, omrResults);

  return {
    success: true,
    error: null,
    corners,
    normalizedCanvas,
    annotatedCanvas,
    detectedAnswers: omrResults.answersMap,
    questionDetails: omrResults.questionDetails,
    summary: omrResults.summary
  };
}

/**
 * Lee la cuadrícula de preguntas y burbujas en el canvas normalizado
 */
export function extractOmrAnswers(normalizedCanvas, evaluation) {
  const ctx = normalizedCanvas.getContext('2d');
  const width = normalizedCanvas.width;
  const height = normalizedCanvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const gray = toGrayscale(imgData);

  const qCount = evaluation.questionCount || 20;
  const altCount = evaluation.alternativeCount || 4;
  const layout = calculateSheetLayout(qCount, altCount);

  const answersMap = {};
  const questionDetails = {};

  let markedCount = 0;
  let blankCount = 0;
  let multipleCount = 0;
  let doubtfulCount = 0;

  for (let q = 1; q <= qCount; q++) {
    const qData = layout.questionsMap[q];
    if (!qData) continue;

    const fillRatios = {};
    const darkScores = {};

    // Muestrear nivel de relleno para cada alternativa
    layout.alts.forEach((letter) => {
      const bubble = qData.bubbles[letter];
      const metrics = calculateBubbleFill(gray, width, height, bubble.x, bubble.y, bubble.radius);
      fillRatios[letter] = metrics.fillRatio;
      darkScores[letter] = metrics.meanDarkness;
    });

    // Analizar candidatos
    const scoredAlts = layout.alts.map((alt) => ({
      alt,
      fill: fillRatios[alt],
      darkness: darkScores[alt]
    }));

    // Ordenar de mayor a menor relleno
    scoredAlts.sort((a, b) => b.fill - a.fill);

    const top = scoredAlts[0];
    const second = scoredAlts[1] || { fill: 0, darkness: 0 };

    // Umbrales calibrados:
    // Relleno seguro: fill >= 0.40
    // Burbuja vacía: fill < 0.20
    const CLEAR_FILL_THRESHOLD = 0.38;
    const EMPTY_THRESHOLD = 0.18;
    const MARGIN_DIFFERENCE = 0.15; // Diferencia requerida con el segundo candidato

    let status = OMR_STATUS.NONE;
    let selectedAlt = null;
    let confidence = 1.0;

    if (top.fill < EMPTY_THRESHOLD) {
      // Ninguna burbuja marcada
      status = OMR_STATUS.NONE;
      selectedAlt = null;
      confidence = 1.0 - top.fill;
      blankCount++;
    } else if (second.fill >= CLEAR_FILL_THRESHOLD) {
      // Múltiples burbujas marcadas con alta densidad
      status = OMR_STATUS.MULTIPLE;
      selectedAlt = 'MULTIPLE';
      confidence = 0.5;
      multipleCount++;
    } else if (top.fill >= CLEAR_FILL_THRESHOLD) {
      if ((top.fill - second.fill) >= MARGIN_DIFFERENCE) {
        // Una alternativa claramente marcada
        status = OMR_STATUS.SINGLE;
        selectedAlt = top.alt;
        confidence = Math.min(1.0, top.fill * 1.5);
        markedCount++;
      } else {
        // Dudosa: dos opciones compitiendo estrechamente
        status = OMR_STATUS.DOUBTFUL;
        selectedAlt = top.alt;
        confidence = 0.4;
        doubtfulCount++;
      }
    } else {
      // Relleno tenue o marca dudosa (ej. una 'X' ligera o borrón)
      status = OMR_STATUS.DOUBTFUL;
      selectedAlt = top.alt;
      confidence = 0.45;
      doubtfulCount++;
    }

    answersMap[q] = (status === OMR_STATUS.MULTIPLE) ? 'MULTIPLE' : (status === OMR_STATUS.NONE ? null : selectedAlt);

    questionDetails[q] = {
      questionNumber: q,
      selected: selectedAlt,
      status,
      confidence,
      fillRatios,
      topCandidate: top.alt,
      topFill: top.fill
    };
  }

  return {
    answersMap,
    questionDetails,
    summary: {
      totalQuestions: qCount,
      markedCount,
      blankCount,
      multipleCount,
      doubtfulCount
    }
  };
}

/**
 * Calcula el ratio de píxeles oscuros dentro del círculo de la burbuja
 */
function calculateBubbleFill(gray, width, height, cx, cy, radius) {
  let darkPixels = 0;
  let totalPixels = 0;
  let sumDarkness = 0;

  // Muestrear píxeles dentro del 85% interior del radio de la burbuja (para evitar el borde del trazo impreso)
  const innerRadius = Math.max(2, radius - 2);
  const r2 = innerRadius * innerRadius;

  // Estimar brillo local del papel en los alrededores para normalizar
  let bgSum = 0;
  let bgCount = 0;
  for (let dy = -radius - 4; dy <= radius + 4; dy += 2) {
    for (let dx = -radius - 4; dx <= radius + 4; dx += 2) {
      const dist2 = dx * dx + dy * dy;
      if (dist2 > (radius + 2) * (radius + 2) && dist2 < (radius + 6) * (radius + 6)) {
        const px = Math.min(width - 1, Math.max(0, cx + dx));
        const py = Math.min(height - 1, Math.max(0, cy + dy));
        bgSum += gray[py * width + px];
        bgCount++;
      }
    }
  }
  const bgLuminance = bgCount > 0 ? (bgSum / bgCount) : 230;
  const darkThreshold = Math.max(50, bgLuminance * 0.70); // 30% más oscuro que el papel local

  for (let dy = -innerRadius; dy <= innerRadius; dy++) {
    for (let dx = -innerRadius; dx <= innerRadius; dx++) {
      if (dx * dx + dy * dy <= r2) {
        const px = Math.min(width - 1, Math.max(0, cx + dx));
        const py = Math.min(height - 1, Math.max(0, cy + dy));
        const val = gray[py * width + px];

        totalPixels++;
        sumDarkness += (255 - val);

        if (val < darkThreshold) {
          darkPixels++;
        }
      }
    }
  }

  const fillRatio = totalPixels > 0 ? (darkPixels / totalPixels) : 0;
  const meanDarkness = totalPixels > 0 ? (sumDarkness / totalPixels) : 0;

  return { fillRatio, meanDarkness };
}

/**
 * Genera un canvas anotado visualmente con círculos indicadores de reconocimiento
 */
function createAnnotatedCanvas(normalizedCanvas, evaluation, omrResults) {
  const annotated = document.createElement('canvas');
  annotated.width = normalizedCanvas.width;
  annotated.height = normalizedCanvas.height;

  const ctx = annotated.getContext('2d');
  ctx.drawImage(normalizedCanvas, 0, 0);

  const qCount = evaluation.questionCount || 20;
  const altCount = evaluation.alternativeCount || 4;
  const layout = calculateSheetLayout(qCount, altCount);

  for (let q = 1; q <= qCount; q++) {
    const qData = layout.questionsMap[q];
    const detail = omrResults.questionDetails[q];
    if (!qData || !detail) continue;

    layout.alts.forEach((letter) => {
      const b = qData.bubbles[letter];
      const isSelected = detail.selected === letter;

      if (detail.status === OMR_STATUS.MULTIPLE && detail.fillRatios[letter] >= 0.35) {
        // Marca múltiple (rojo)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      } else if (isSelected) {
        if (detail.status === OMR_STATUS.DOUBTFUL) {
          // Marca dudosa (ámbar)
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius + 3, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Selección válida clara (verde esmeralda)
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius + 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });
  }

  return annotated;
}

/**
 * Rota un canvas 90 grados a la derecha
 */
function rotateCanvas90(srcCanvas) {
  const rotated = document.createElement('canvas');
  rotated.width = srcCanvas.height;
  rotated.height = srcCanvas.width;
  const ctx = rotated.getContext('2d');
  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(srcCanvas, -srcCanvas.width / 2, -srcCanvas.height / 2);
  return rotated;
}
