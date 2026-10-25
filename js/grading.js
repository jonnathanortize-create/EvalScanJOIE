/**
 * EvalScan - Motor de Calificación Determinista (grading.js)
 * Comparación contra clave de respuestas, cálculo de notas en escala configurada (10 puntos),
 * porcentajes, desglose de aciertos, errores, omitidas y respuestas ambiguas.
 */

export const QUESTION_STATUS = {
  CORRECT: 'CORRECT',         // Respuesta correcta
  INCORRECT: 'INCORRECT',     // Respuesta incorrecta
  BLANK: 'BLANK',             // Sin responder / en blanco
  MULTIPLE: 'MULTIPLE',       // Marca múltiple
  DOUBTFUL: 'DOUBTFUL'        // Dudosa / baja confianza
};

/**
 * Califica las respuestas de un estudiante frente a la clave oficial de la evaluación
 * 
 * @param {Object} studentAnswers Mapa de respuestas { 1: 'A', 2: 'B', ... }
 * @param {Object} answerKey Clave oficial { 1: 'A', 2: 'C', ... }
 * @param {Object} evaluation Configuración de la evaluación (questionCount, maxScore)
 * @returns {Object} Informe completo de calificación
 */
export function gradeStudentSheet(studentAnswers, answerKey, evaluation) {
  const qCount = evaluation.questionCount || 20;
  const maxScore = parseFloat(evaluation.maxScore) || 10.0;
  const pointsPerQuestion = maxScore / qCount;

  let correctCount = 0;
  let incorrectCount = 0;
  let blankCount = 0;
  let multipleCount = 0;
  let doubtfulCount = 0;

  const questionDetails = [];

  for (let q = 1; q <= qCount; q++) {
    const studentChoice = studentAnswers[q] || null;
    const correctChoice = answerKey[q] || null;

    let status = QUESTION_STATUS.INCORRECT;
    let isCorrect = false;
    let points = 0.0;

    if (!studentChoice) {
      status = QUESTION_STATUS.BLANK;
      blankCount++;
    } else if (studentChoice === 'MULTIPLE') {
      status = QUESTION_STATUS.MULTIPLE;
      multipleCount++;
    } else if (studentChoice === correctChoice) {
      status = QUESTION_STATUS.CORRECT;
      isCorrect = true;
      points = pointsPerQuestion;
      correctCount++;
    } else {
      status = QUESTION_STATUS.INCORRECT;
      incorrectCount++;
    }

    questionDetails.push({
      questionNumber: q,
      studentChoice,
      correctChoice,
      isCorrect,
      status,
      pointsAwarded: points,
      maxPoints: pointsPerQuestion
    });
  }

  // Puntuación total acumulada
  const rawScore = correctCount * pointsPerQuestion;
  // Redondear a 2 decimales para precisión estándar
  const finalScore = Math.round(rawScore * 100) / 100;
  const percentage = Math.round((correctCount / qCount) * 1000) / 10; // ej. 85.5%

  // Nivel de desempeño en escala cualitativa ecuatoriana/latinoamericana
  let performanceLevel = 'No Aprobado';
  const ratio = finalScore / maxScore;
  if (ratio >= 0.9) {
    performanceLevel = 'Excelente (Domina los aprendizajes)';
  } else if (ratio >= 0.7) {
    performanceLevel = 'Aprobado (Alcanza los aprendizajes)';
  } else if (ratio >= 0.5) {
    performanceLevel = 'En proceso de recuperación';
  } else {
    performanceLevel = 'No alcanza los aprendizajes requeridos';
  }

  return {
    evaluationId: evaluation.id,
    questionCount: qCount,
    maxScore,
    pointsPerQuestion,
    correctCount,
    incorrectCount,
    blankCount,
    multipleCount,
    doubtfulCount,
    score: finalScore,
    percentage,
    performanceLevel,
    isPassed: ratio >= 0.7, // Umbral estándar 7/10
    questionDetails
  };
}
