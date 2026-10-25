/**
 * EvalScan - Script de Verificación y Pruebas Unitarias Automatizadas
 */

import assert from 'node:assert';
import { calculateSheetLayout, TEMPLATE_GEOMETRY } from '../js/sheet-generator.js';
import { gradeStudentSheet, QUESTION_STATUS } from '../js/grading.js';
import { validateEvaluationData } from '../js/evaluations.js';
import { validateAnswerKeyCompleteness } from '../js/answer-key.js';
import { calculateAssessmentStatistics } from '../js/results.js';
import { getHomographyMatrix, invertMatrix3x3, toGrayscale, adaptiveThreshold } from '../js/image-processing.js';

console.log('--- INICIANDO SUITE DE PRUEBAS AUTOMATIZADAS DE EVALSCAN ---');

// Test 1: Validación de Evaluación "MCU"
console.log('Prueba 1: Creación y validación de evaluación MCU...');
const mcuData = {
  name: 'MCU',
  subject: 'Física',
  course: '3ro BGU',
  date: '2026-10-24',
  questionCount: 20,
  alternativeCount: 4,
  maxScore: 10.0
};
const errors = validateEvaluationData(mcuData);
assert.strictEqual(errors.length, 0, 'La evaluación MCU debería ser válida');

// Test 1b: Validación con datos inválidos
const invalidErrors = validateEvaluationData({ name: '', questionCount: 2, alternativeCount: 1, maxScore: 0 });
assert.ok(invalidErrors.length >= 3, 'Debería rechazar configuraciones no válidas');
console.log('✓ Prueba 1 superada: Validación de datos de evaluación correcta.');

// Test 2: Validación de clave de respuestas
console.log('Prueba 2: Completitud de clave de respuestas...');
const partialKey = { 1: 'A', 2: 'B', 3: 'C' };
const completenessPartial = validateAnswerKeyCompleteness(partialKey, 20);
assert.strictEqual(completenessPartial.isComplete, false);
assert.strictEqual(completenessPartial.answeredCount, 3);
assert.strictEqual(completenessPartial.missingQuestions.length, 17);

const fullKey = {};
for (let i = 1; i <= 20; i++) fullKey[i] = 'A';
const completenessFull = validateAnswerKeyCompleteness(fullKey, 20);
assert.strictEqual(completenessFull.isComplete, true);
assert.strictEqual(completenessFull.answeredCount, 20);
console.log('✓ Prueba 2 superada: Validación de clave de respuestas correcta.');

// Test 3: Diseños de hojas A4 para 20, 40, 60 y 80 preguntas
console.log('Prueba 3: Geometría de hojas de respuestas para 20, 40, 60 y 80 preguntas...');
[20, 40, 60, 80].forEach((qCount) => {
  const layout = calculateSheetLayout(qCount, 4);
  assert.ok(layout.numCols >= 1 && layout.numCols <= 4);
  assert.ok(layout.questionsPerCol <= 25);
  // Verificar que todas las preguntas tengan burbujas dentro de los límites del canvas 800x1131
  for (let q = 1; q <= qCount; q++) {
    const qData = layout.questionsMap[q];
    assert.ok(qData, `Pregunta ${q} debe existir en el layout`);
    ['A', 'B', 'C', 'D'].forEach((alt) => {
      const b = qData.bubbles[alt];
      assert.ok(b.x > TEMPLATE_GEOMETRY.GRID_AREA.LEFT && b.x < TEMPLATE_GEOMETRY.GRID_AREA.RIGHT, `Burbuja ${alt} de preg ${q} debe estar dentro del margen horizontal`);
      assert.ok(b.y >= TEMPLATE_GEOMETRY.GRID_AREA.TOP && b.y <= TEMPLATE_GEOMETRY.GRID_AREA.BOTTOM, `Burbuja ${alt} de preg ${q} debe estar dentro del margen vertical`);
    });
  }
  console.log(`   - Layout de ${qCount} preguntas: ${layout.numCols} columnas x ${layout.questionsPerCol} filas máx (OK)`);
});
console.log('✓ Prueba 3 superada: Geometría A4 adaptativa calculada con precisión.');

// Test 4: Motor de calificación determinista
console.log('Prueba 4: Motor de calificación determinista...');
const testKey = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'A', 6: 'B', 7: 'C', 8: 'D', 9: 'A', 10: 'B' };
const studentAnswers = {
  1: 'A', // Correcta
  2: 'B', // Correcta
  3: 'A', // Incorrecta
  4: null, // En blanco
  5: 'MULTIPLE', // Múltiple marca
  6: 'B', // Correcta
  7: 'C', // Correcta
  8: 'D', // Correcta
  9: 'D', // Incorrecta
  10: 'B' // Correcta
};
const evalConfig = { id: 'eval_mcu', questionCount: 10, maxScore: 10.0 };
const result = gradeStudentSheet(studentAnswers, testKey, evalConfig);

assert.strictEqual(result.correctCount, 6, 'Debe tener exactamente 6 correctas');
assert.strictEqual(result.incorrectCount, 2, 'Debe tener exactamente 2 incorrectas');
assert.strictEqual(result.blankCount, 1, 'Debe tener exactamente 1 en blanco');
assert.strictEqual(result.multipleCount, 1, 'Debe tener exactamente 1 múltiple');
assert.strictEqual(result.score, 6.0, 'Puntuación debe ser exactamente 6.0/10.0');
assert.strictEqual(result.percentage, 60.0, 'Porcentaje debe ser 60.0%');
assert.strictEqual(result.isPassed, false, '6.0 no alcanza el umbral de aprobación 7.0/10');
console.log('✓ Prueba 4 superada: Calificación determinista exacta.');

// Test 5: Cálculo de estadísticas reales
console.log('Prueba 5: Cálculo de estadísticas y analítica por ítem...');
const mockResults = [
  { score: 10.0, isPassed: true, questionDetails: [{ questionNumber: 1, isCorrect: true }, { questionNumber: 2, isCorrect: true }] },
  { score: 6.0, isPassed: false, questionDetails: [{ questionNumber: 1, isCorrect: true }, { questionNumber: 2, isCorrect: false }] }
];
const stats = calculateAssessmentStatistics(mockResults, { questionCount: 2, maxScore: 10.0 });
assert.strictEqual(stats.count, 2);
assert.strictEqual(stats.averageScore, 8.0);
assert.strictEqual(stats.maxScore, 10.0);
assert.strictEqual(stats.minScore, 6.0);
assert.strictEqual(stats.passRate, 50.0);
assert.strictEqual(stats.itemAnalytics[0].percentage, 100.0); // Pregunta 1: 2 de 2 acertaron
assert.strictEqual(stats.itemAnalytics[1].percentage, 50.0);  // Pregunta 2: 1 de 2 acertó
console.log('✓ Prueba 5 superada: Estadísticas y analítica por ítem reales.');

// Test 6: Homografía matemática y resolución lineal
console.log('Prueba 6: Homografía y transformaciones proyectivas...');
const srcQuad = [{ x: 50, y: 50 }, { x: 750, y: 50 }, { x: 750, y: 1081 }, { x: 50, y: 1081 }];
const dstQuad = [{ x: 50, y: 50 }, { x: 750, y: 50 }, { x: 750, y: 1081 }, { x: 50, y: 1081 }];
const H = getHomographyMatrix(srcQuad, dstQuad);
assert.ok(H, 'Debe calcular la matriz de homografía');
const Hinv = invertMatrix3x3(H);
assert.ok(Hinv, 'La matriz debe ser invertible');
console.log('✓ Prueba 6 superada: Matrices proyectivas resueltas exitosamente.');

// Test 7: Algoritmos de visión (Escala de grises y umbral adaptativo)
console.log('Prueba 7: Algoritmos de visión por computadora...');
const testImgData = {
  data: new Uint8ClampedArray(400 * 400 * 4),
  width: 400,
  height: 400
};
// Simular fondo blanco con una burbuja negra en el centro
for (let i = 0; i < testImgData.data.length; i += 4) {
  testImgData.data[i] = 255;
  testImgData.data[i + 1] = 255;
  testImgData.data[i + 2] = 255;
  testImgData.data[i + 3] = 255;
}
// Mancha negra
for (let y = 180; y <= 220; y++) {
  for (let x = 180; x <= 220; x++) {
    const idx = (y * 400 + x) * 4;
    testImgData.data[idx] = 10;
    testImgData.data[idx + 1] = 10;
    testImgData.data[idx + 2] = 10;
  }
}
const gray = toGrayscale(testImgData);
assert.strictEqual(gray.length, 400 * 400);
const binary = adaptiveThreshold(gray, 400, 400, 25, 12);
assert.strictEqual(binary.length, 400 * 400);
// El centro debe ser 0 (negro) y las esquinas 255 (blanco)
assert.strictEqual(binary[200 * 400 + 200], 0, 'Centro debe ser detectado como negro/marca');
assert.strictEqual(binary[10 * 400 + 10], 255, 'Fondo debe ser detectado como blanco');
console.log('✓ Prueba 7 superada: Umbralización adaptativa e integral exitosa.');

console.log('\n======================================================');
console.log('¡TODAS LAS 7 PRUEBAS CRÍTICAS DE EVALSCAN PASARON CON ÉXITO!');
console.log('======================================================');
