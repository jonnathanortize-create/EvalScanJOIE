/**
 * EvalScan - Módulo de Gestión de Resultados y Estadísticas (results.js)
 * Almacenamiento, revisión interactiva con corrección manual de burbujas,
 * detección de duplicados, cálculo de promedios y análisis de dificultad por ítem.
 */

import {
  saveResult,
  getResult,
  getResultsByEvaluation,
  deleteResult,
  getEvaluation,
  getAnswerKey
} from './database.js';
import { gradeStudentSheet } from './grading.js';
import { generateId, formatNumber, formatPercentage, formatDate, confirmDialog, showToast } from './utils.js';

/**
 * Guarda o actualiza el resultado de un estudiante tras la revisión del docente
 */
export async function saveStudentResult({
  id = null,
  evaluationId,
  studentName = 'Estudiante sin identificar',
  studentId = '',
  answers = {},
  imageThumbnail = null
}) {
  const ev = await getEvaluation(evaluationId);
  if (!ev) throw new Error('Evaluación no encontrada.');

  const keyData = await getAnswerKey(evaluationId);
  if (!keyData || !keyData.answers) {
    throw new Error('La evaluación no posee una clave de respuestas configurada.');
  }

  // Comprobar si ya existe un estudiante con el mismo nombre o ID en esta evaluación
  const existingResults = await getResultsByEvaluation(evaluationId);
  const cleanName = studentName.trim().toLowerCase();
  const cleanId = studentId.trim();

  const isDuplicate = existingResults.some((r) => {
    if (id && r.id === id) return false; // El mismo registro en edición
    const matchName = cleanName && r.studentName.trim().toLowerCase() === cleanName;
    const matchId = cleanId && r.studentId && r.studentId.trim() === cleanId;
    return matchName || matchId;
  });

  // Calificar determinísticamente
  const gradeReport = gradeStudentSheet(answers, keyData.answers, ev);

  const resultRecord = {
    id: id || generateId(),
    evaluationId,
    studentName: studentName.trim() || 'Estudiante sin identificar',
    studentId: cleanId,
    answers,
    score: gradeReport.score,
    maxScore: gradeReport.maxScore,
    percentage: gradeReport.percentage,
    correctCount: gradeReport.correctCount,
    incorrectCount: gradeReport.incorrectCount,
    blankCount: gradeReport.blankCount,
    multipleCount: gradeReport.multipleCount,
    doubtfulCount: gradeReport.doubtfulCount,
    isPassed: gradeReport.isPassed,
    performanceLevel: gradeReport.performanceLevel,
    questionDetails: gradeReport.questionDetails,
    imageThumbnail: imageThumbnail || null,
    scannedAt: new Date().toISOString()
  };

  await saveResult(resultRecord);
  return { result: resultRecord, isDuplicate };
}

/**
 * Calcula estadísticas descriptivas reales basadas estrictamente en los datos almacenados
 */
export function calculateAssessmentStatistics(results, evaluation) {
  if (!results || results.length === 0) {
    return {
      count: 0,
      averageScore: 0,
      maxScore: 0,
      minScore: 0,
      passCount: 0,
      failCount: 0,
      passRate: 0,
      itemAnalytics: []
    };
  }

  const count = results.length;
  let sumScore = 0;
  let maxScore = -Infinity;
  let minScore = Infinity;
  let passCount = 0;

  const qCount = evaluation ? evaluation.questionCount : (results[0].questionDetails?.length || 20);
  const itemCorrectMap = {};
  for (let q = 1; q <= qCount; q++) {
    itemCorrectMap[q] = 0;
  }

  results.forEach((r) => {
    sumScore += r.score;
    if (r.score > maxScore) maxScore = r.score;
    if (r.score < minScore) minScore = r.score;
    if (r.isPassed) passCount++;

    if (Array.isArray(r.questionDetails)) {
      r.questionDetails.forEach((qd) => {
        if (qd.isCorrect) {
          itemCorrectMap[qd.questionNumber] = (itemCorrectMap[qd.questionNumber] || 0) + 1;
        }
      });
    }
  });

  const averageScore = Math.round((sumScore / count) * 100) / 100;
  const passRate = Math.round((passCount / count) * 1000) / 10;

  // Análisis de dificultad por ítem (% de estudiantes que acertaron cada pregunta)
  const itemAnalytics = [];
  for (let q = 1; q <= qCount; q++) {
    const correctInItem = itemCorrectMap[q] || 0;
    const itemPassPct = Math.round((correctInItem / count) * 1000) / 10;
    let difficultyCategory = 'Media';
    if (itemPassPct >= 80) difficultyCategory = 'Fácil';
    else if (itemPassPct <= 35) difficultyCategory = 'Difícil';

    itemAnalytics.push({
      questionNumber: q,
      correctCount: correctInItem,
      totalCount: count,
      percentage: itemPassPct,
      difficultyCategory
    });
  }

  return {
    count,
    averageScore,
    maxScore: maxScore === -Infinity ? 0 : maxScore,
    minScore: minScore === Infinity ? 0 : minScore,
    passCount,
    failCount: count - passCount,
    passRate,
    itemAnalytics
  };
}

/**
 * Elimina un resultado individual con confirmación modal
 */
export async function removeResultWithConfirm(resultId, onDeleted) {
  const res = await getResult(resultId);
  if (!res) return;

  const confirmed = await confirmDialog({
    title: 'Eliminar Calificación',
    message: `¿Desea eliminar el registro de ${res.studentName} (Nota: ${formatNumber(res.score)}/${formatNumber(res.maxScore)})?`,
    confirmText: 'Sí, eliminar',
    danger: true
  });

  if (confirmed) {
    await deleteResult(resultId);
    showToast(`Resultado de ${res.studentName} eliminado.`, 'info');
    if (typeof onDeleted === 'function') {
      onDeleted();
    }
  }
}
