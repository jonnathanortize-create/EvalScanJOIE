/**
 * EvalScan - Motor de Visión por Computadora y Procesamiento de Imágenes (image-processing.js)
 * Conversión a escala de grises, umbralización adaptativa, detección de marcadores fiduciales,
 * cálculo de homografía proyectiva y corrección de perspectiva hacia coordenadas normalizadas.
 */

import { TEMPLATE_GEOMETRY } from './sheet-generator.js';

/**
 * Convierte un ImageData o Canvas a escala de grises optimizada (Luma Rec. 709)
 */
export function toGrayscale(imageData) {
  const data = imageData.data;
  const len = data.length;
  const gray = new Uint8Array(len / 4);

  for (let i = 0, j = 0; i < len; i += 4, j++) {
    // 0.2126 R + 0.7152 G + 0.0722 B
    gray[j] = (data[i] * 54 + data[i + 1] * 183 + data[i + 2] * 19) >> 8;
  }
  return gray;
}

/**
 * Umbralización adaptativa usando imagen integral (Bradley-Roth)
 * Excelente para lidiar con sombras intensas e iluminación despareja en aulas
 */
export function adaptiveThreshold(gray, width, height, windowSize = 25, percentage = 12) {
  const binary = new Uint8Array(width * height);
  const integral = new Float64Array(width * height);

  // 1. Construir imagen integral
  for (let y = 0; y < height; y++) {
    let sum = 0;
    const yOffset = y * width;
    for (let x = 0; x < width; x++) {
      sum += gray[yOffset + x];
      if (y === 0) {
        integral[yOffset + x] = sum;
      } else {
        integral[yOffset + x] = integral[(y - 1) * width + x] + sum;
      }
    }
  }

  // 2. Umbralizar comparando con la media local
  const s2 = Math.floor(windowSize / 2);
  const factor = (100 - percentage) / 100;

  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - s2);
    const y1 = Math.min(height - 1, y + s2);
    const yOffset = y * width;

    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - s2);
      const x1 = Math.min(width - 1, x + s2);
      const count = (x1 - x0) * (y1 - y0);

      const sum =
        integral[y1 * width + x1] -
        integral[y0 * width + x1] -
        integral[y1 * width + x0] +
        integral[y0 * width + x0];

      const val = gray[yOffset + x];
      // Si el píxel es intensamente oscuro (tinta/marcador) o significativamente más oscuro que el entorno local
      if (val < 90 || val * count <= sum * factor) {
        binary[yOffset + x] = 0; // Píxel oscuro (marca o tinta)
      } else {
        binary[yOffset + x] = 255; // Fondo blanco de papel
      }
    }
  }

  return binary;
}

/**
 * Detecta candidatos a marcadores fiduciales en las esquinas de la hoja
 */
export function findFiducialMarkers(binary, width, height) {
  // Dividir la imagen en 4 cuadrantes para buscar el marcador correspondiente en cada esquina
  const quadrants = [
    { name: 'TL', x0: 0, y0: 0, x1: Math.floor(width * 0.45), y1: Math.floor(height * 0.45) },
    { name: 'TR', x0: Math.floor(width * 0.55), y0: 0, x1: width, y1: Math.floor(height * 0.45) },
    { name: 'BR', x0: Math.floor(width * 0.55), y0: Math.floor(height * 0.55), x1: width, y1: height },
    { name: 'BL', x0: 0, y0: Math.floor(height * 0.55), x1: Math.floor(width * 0.45), y1: height }
  ];

  const detectedCorners = {};

  quadrants.forEach((q) => {
    const candidate = findBestMarkerInRegion(binary, width, height, q.x0, q.y0, q.x1, q.y1);
    if (candidate) {
      detectedCorners[q.name] = candidate;
    }
  });

  return detectedCorners;
}

/**
 * Busca el marcador con patrón de diana/cuadrados concéntricos en una región
 */
function findBestMarkerInRegion(binary, width, height, x0, y0, x1, y1) {
  let bestMarker = null;
  let bestScore = -1;

  // Realizar barrido con paso de muestreo rápido para localizar manchas oscuras densas
  const step = Math.max(2, Math.floor(Math.min(width, height) / 300));
  const minMarkerDim = Math.floor(Math.min(width, height) * 0.02);
  const maxMarkerDim = Math.floor(Math.min(width, height) * 0.16);

  for (let y = y0 + step; y < y1 - step; y += step * 3) {
    const rowOffset = y * width;
    for (let x = x0 + step; x < x1 - step; x += step * 3) {
      // Si el píxel es negro
      if (binary[rowOffset + x] === 0) {
        // Expandir y evaluar si coincide con el patrón del marcador (negro externo, blanco medio, negro centro)
        const markerInfo = evaluateMarkerPattern(binary, width, height, x, y, minMarkerDim, maxMarkerDim);
        if (markerInfo && markerInfo.score > bestScore) {
          bestScore = markerInfo.score;
          bestMarker = markerInfo.center;
        }
      }
    }
  }

  return bestMarker;
}

/**
 * Evalúa el patrón concéntrico del marcador a partir de un punto semilla
 */
function evaluateMarkerPattern(binary, width, height, startX, startY, minDim, maxDim) {
  // Búsqueda horizontal del ancho del núcleo
  let left = startX;
  let right = startX;
  const rowOffset = startY * width;

  while (left > 0 && binary[rowOffset + left] === 0 && (startX - left) < maxDim) left--;
  while (right < width - 1 && binary[rowOffset + right] === 0 && (right - startX) < maxDim) right++;

  const hWidth = right - left;
  if (hWidth < minDim || hWidth > maxDim) return null;

  // Búsqueda vertical del alto del núcleo
  let top = startY;
  let bottom = startY;
  const midX = Math.floor((left + right) / 2);

  while (top > 0 && binary[top * width + midX] === 0 && (startY - top) < maxDim) top--;
  while (bottom < height - 1 && binary[bottom * width + midX] === 0 && (bottom - startY) < maxDim) bottom++;

  const vHeight = bottom - top;
  if (vHeight < minDim || vHeight > maxDim) return null;

  // Verificar relación de aspecto cuadrada (0.75 a 1.33)
  const ratio = hWidth / vHeight;
  if (ratio < 0.7 || ratio > 1.4) return null;

  const cx = Math.floor((left + right) / 2);
  const cy = Math.floor((top + bottom) / 2);

  // Muestrear transiciones concéntricas a lo largo de los radios
  // Marcador esperado: [Negro externo] -> [Blanco interior] -> [Negro central]
  const radius = Math.floor(Math.max(hWidth, vHeight) / 2);
  let transitions = 0;
  let prevVal = binary[cy * width + cx];

  for (let r = 0; r <= radius; r += 2) {
    const val = binary[cy * width + Math.min(width - 1, cx + r)];
    if (val !== prevVal) {
      transitions++;
      prevVal = val;
    }
  }

  // Se esperan al menos 2 transiciones (de centro a borde blanco y luego borde negro)
  const score = (transitions >= 2 ? 100 : 40) - Math.abs(1.0 - ratio) * 30;

  return {
    center: { x: cx, y: cy },
    size: Math.max(hWidth, vHeight),
    score
  };
}

/**
 * Valida que los 4 marcadores formen un cuadrilátero convexo bien proporcionado
 */
export function validateQuadrilateral(corners, imgWidth, imgHeight) {
  const { TL, TR, BR, BL } = corners;
  if (!TL || !TR || !BR || !BL) {
    return { valid: false, error: 'Faltan uno o más marcadores de esquina. Asegúrese de encuadrar la hoja completa.' };
  }

  // 1. Distancias
  const topEdge = Math.hypot(TR.x - TL.x, TR.y - TL.y);
  const bottomEdge = Math.hypot(BR.x - BL.x, BR.y - BL.y);
  const leftEdge = Math.hypot(BL.x - TL.x, BL.y - TL.y);
  const rightEdge = Math.hypot(BR.x - TR.x, BR.y - TR.y);

  const minExpectedSize = Math.min(imgWidth, imgHeight) * 0.35;
  if (topEdge < minExpectedSize || leftEdge < minExpectedSize) {
    return { valid: false, error: 'La hoja se encuentra demasiado lejos de la cámara. Acérquese más a la hoja.' };
  }

  // 2. Proporción de aspecto (A4 debe tener altura > anchura en orientación vertical)
  const avgWidth = (topEdge + bottomEdge) / 2;
  const avgHeight = (leftEdge + rightEdge) / 2;
  const aspect = avgHeight / avgWidth;

  // Permitir rango razonable considerando inclinación de perspectiva (1.1 a 1.8)
  if (aspect < 0.8 || aspect > 2.2) {
    return { valid: false, error: `Proporción geométrica inusual (${aspect.toFixed(2)}). Asegúrese de capturar la hoja de frente y sin inclinaciones extremas.` };
  }

  return { valid: true, error: null, topEdge, leftEdge, aspect };
}

/**
 * Resuelve el sistema lineal de 8 ecuaciones para la matriz de Homografía 3x3
 * Mapea 4 puntos fuente (imagen capturada) a 4 puntos destino (canvas normalizado 800x1131)
 */
export function getHomographyMatrix(srcPoints, dstPoints) {
  // srcPoints: [{x, y}, ...] 4 puntos
  // dstPoints: [{x, y}, ...] 4 puntos
  const A = [];
  const b = [];

  for (let i = 0; i < 4; i++) {
    const sx = srcPoints[i].x;
    const sy = srcPoints[i].y;
    const dx = dstPoints[i].x;
    const dy = dstPoints[i].y;

    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);

    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  // Resolver Ax = b mediante eliminación gaussiana con pivoteo parcial
  const h = solveGaussian(A, b);
  if (!h) return null;

  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1.0]
  ];
}

/**
 * Eliminación Gaussiana con pivoteo
 */
function solveGaussian(A, b) {
  const n = 8;
  const M = new Array(n);
  for (let i = 0; i < n; i++) {
    M[i] = new Float64Array(n + 1);
    for (let j = 0; j < n; j++) {
      M[i][j] = A[i][j];
    }
    M[i][n] = b[i];
  }

  for (let p = 0; p < n; p++) {
    let max = p;
    for (let i = p + 1; i < n; i++) {
      if (Math.abs(M[i][p]) > Math.abs(M[max][p])) {
        max = i;
      }
    }
    const temp = M[p];
    M[p] = M[max];
    M[max] = temp;

    if (Math.abs(M[p][p]) <= 1e-12) {
      return null; // Matriz singular
    }

    for (let i = p + 1; i < n; i++) {
      const alpha = M[i][p] / M[p][p];
      M[i][p] = 0.0;
      for (let j = p + 1; j <= n; j++) {
        M[i][j] -= alpha * M[p][j];
      }
    }
  }

  // Sustitución regresiva
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0.0;
    for (let j = i + 1; j < n; j++) {
      sum += M[i][j] * x[j];
    }
    x[i] = (M[i][n] - sum) / M[i][i];
  }
  return x;
}

/**
 * Calcula la inversa de una matriz 3x3
 */
export function invertMatrix3x3(M) {
  const det =
    M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
    M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
    M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);

  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1.0 / det;
  return [
    [
      (M[1][1] * M[2][2] - M[1][2] * M[2][1]) * invDet,
      (M[0][2] * M[2][1] - M[0][1] * M[2][2]) * invDet,
      (M[0][1] * M[1][2] - M[0][2] * M[1][1]) * invDet
    ],
    [
      (M[1][2] * M[2][0] - M[1][0] * M[2][2]) * invDet,
      (M[0][0] * M[2][2] - M[0][2] * M[2][0]) * invDet,
      (M[0][2] * M[1][0] - M[0][0] * M[1][2]) * invDet
    ],
    [
      (M[1][0] * M[2][1] - M[1][1] * M[2][0]) * invDet,
      (M[0][1] * M[2][0] - M[0][0] * M[2][1]) * invDet,
      (M[0][0] * M[1][1] - M[0][1] * M[1][0]) * invDet
    ]
  ];
}

/**
 * Aplica transformación hacia atrás (backward warping) con interpolación bilineal
 * para corregir la perspectiva de la fotografía hacia un Canvas normalizado de 800x1131
 */
export function warpPerspective(sourceCanvas, corners, targetWidth = 800, targetHeight = 1131) {
  const m = TEMPLATE_GEOMETRY.MARKERS;
  const srcPoints = [corners.TL, corners.TR, corners.BR, corners.BL];
  const dstPoints = [
    { x: m.TOP_LEFT.x, y: m.TOP_LEFT.y },
    { x: m.TOP_RIGHT.x, y: m.TOP_RIGHT.y },
    { x: m.BOTTOM_RIGHT.x, y: m.BOTTOM_RIGHT.y },
    { x: m.BOTTOM_LEFT.x, y: m.BOTTOM_LEFT.y }
  ];

  // Matriz de mapeo: origen -> destino
  const H = getHomographyMatrix(srcPoints, dstPoints);
  if (!H) throw new Error('No se pudo calcular la matriz de transformación proyectiva.');

  // Invertir matriz: destino -> origen (para muestreo backward sin huecos)
  const Hinv = invertMatrix3x3(H);
  if (!Hinv) throw new Error('La transformación geométrica no es invertible.');

  const srcCtx = sourceCanvas.getContext('2d');
  const srcImgData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const srcData = srcImgData.data;
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = targetWidth;
  targetCanvas.height = targetHeight;
  const targetCtx = targetCanvas.getContext('2d');
  const targetImgData = targetCtx.createImageData(targetWidth, targetHeight);
  const targetData = targetImgData.data;

  // Backward warping
  for (let dy = 0; dy < targetHeight; dy++) {
    for (let dx = 0; dx < targetWidth; dx++) {
      // Coordenadas homogéneas
      const z = Hinv[2][0] * dx + Hinv[2][1] * dy + Hinv[2][2];
      const sx = (Hinv[0][0] * dx + Hinv[0][1] * dy + Hinv[0][2]) / z;
      const sy = (Hinv[1][0] * dx + Hinv[1][1] * dy + Hinv[1][2]) / z;

      const targetIdx = (dy * targetWidth + dx) * 4;

      if (sx >= 0 && sx < srcW - 1 && sy >= 0 && sy < srcH - 1) {
        // Interpolación bilineal
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const wx = sx - x0;
        const wy = sy - y0;

        const idx00 = (y0 * srcW + x0) * 4;
        const idx10 = (y0 * srcW + x1) * 4;
        const idx01 = (y1 * srcW + x0) * 4;
        const idx11 = (y1 * srcW + x1) * 4;

        for (let c = 0; c < 3; c++) {
          const top = srcData[idx00 + c] * (1 - wx) + srcData[idx10 + c] * wx;
          const bottom = srcData[idx01 + c] * (1 - wx) + srcData[idx11 + c] * wx;
          targetData[targetIdx + c] = Math.round(top * (1 - wy) + bottom * wy);
        }
        targetData[targetIdx + 3] = 255;
      } else {
        // Fuera de bordes
        targetData[targetIdx] = 255;
        targetData[targetIdx + 1] = 255;
        targetData[targetIdx + 2] = 255;
        targetData[targetIdx + 3] = 255;
      }
    }
  }

  targetCtx.putImageData(targetImgData, 0, 0);
  return targetCanvas;
}
