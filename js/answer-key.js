/**
 * EvalScan - Módulo de Clave de Respuestas (answer-key.js)
 * Editor interactivo de respuestas correctas para cada evaluación,
 * validación de completitud y utilidades para docentes.
 */

import { getAnswerKey, saveAnswerKey, getEvaluation } from './database.js';
import { ALTERNATIVES_MAP } from './evaluations.js';
import { showToast, escapeHtml } from './utils.js';

/**
 * Obtiene la clave de respuestas actual o una estructura base si aún no está inicializada
 */
export async function loadOrCreateAnswerKey(evaluationId) {
  const ev = await getEvaluation(evaluationId);
  if (!ev) {
    throw new Error('La evaluación solicitada no existe.');
  }

  let key = await getAnswerKey(evaluationId);
  if (!key) {
    key = {
      evaluationId,
      answers: {}
    };
  }

  // Asegurar que todas las preguntas configuradas existan en la clave
  const alternatives = ALTERNATIVES_MAP[ev.alternativeCount] || ['A', 'B', 'C', 'D'];
  for (let q = 1; q <= ev.questionCount; q++) {
    if (!key.answers[q]) {
      key.answers[q] = null;
    }
  }

  return { evaluation: ev, answerKey: key, alternatives };
}

/**
 * Valida si la clave de respuestas está completa antes de permitir la calificación
 */
export function validateAnswerKeyCompleteness(answers, questionCount) {
  const missing = [];
  for (let q = 1; q <= questionCount; q++) {
    if (!answers || !answers[q]) {
      missing.push(q);
    }
  }

  return {
    isComplete: missing.length === 0,
    totalConfigured: questionCount,
    answeredCount: questionCount - missing.length,
    missingQuestions: missing
  };
}

/**
 * Guarda una respuesta individual en la clave de la evaluación
 */
export async function updateQuestionAnswer(evaluationId, questionNumber, alternative) {
  const key = await getAnswerKey(evaluationId) || { evaluationId, answers: {} };
  key.answers = key.answers || {};
  key.answers[questionNumber] = alternative;
  await saveAnswerKey(key);
  return key;
}

/**
 * Rellena todas las preguntas con una alternativa fija o limpia la clave
 */
export async function setAllAnswers(evaluationId, alternative) {
  const ev = await getEvaluation(evaluationId);
  if (!ev) throw new Error('Evaluación no encontrada.');

  const key = {
    evaluationId,
    answers: {}
  };

  for (let q = 1; q <= ev.questionCount; q++) {
    key.answers[q] = alternative; // Puede ser null para limpiar
  }

  await saveAnswerKey(key);
  return key;
}

/**
 * Genera un patrón de respuestas de prueba variado (A, B, C, D cíclico) para verificación inmediata
 */
export async function generateSampleAnswerPattern(evaluationId) {
  const ev = await getEvaluation(evaluationId);
  if (!ev) throw new Error('Evaluación no encontrada.');

  const alts = ALTERNATIVES_MAP[ev.alternativeCount] || ['A', 'B', 'C', 'D'];
  const key = {
    evaluationId,
    answers: {}
  };

  for (let q = 1; q <= ev.questionCount; q++) {
    key.answers[q] = alts[(q - 1) % alts.length];
  }

  await saveAnswerKey(key);
  return key;
}
