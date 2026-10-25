/**
 * EvalScan - Módulo de Gestión de Evaluaciones (evaluations.js)
 * Creación, edición, duplicación, eliminación, filtrado y renderizado
 * de evaluaciones educativas.
 */

import {
  getEvaluations,
  getEvaluation,
  saveEvaluation,
  deleteEvaluation,
  getAnswerKey,
  saveAnswerKey,
  getResultsByEvaluation
} from './database.js';
import { generateId, formatDate, escapeHtml, confirmDialog, showToast } from './utils.js';

export const ALTERNATIVES_MAP = {
  3: ['A', 'B', 'C'],
  4: ['A', 'B', 'C', 'D'],
  5: ['A', 'B', 'C', 'D', 'E']
};

/**
 * Valida los parámetros de configuración de una evaluación
 */
export function validateEvaluationData(data) {
  const errors = [];
  if (!data.name || data.name.trim().length === 0) {
    errors.push('El nombre de la evaluación es obligatorio (ej. MCU, Examen Parcial).');
  }

  const qCount = parseInt(data.questionCount, 10);
  if (isNaN(qCount) || qCount < 5 || qCount > 100) {
    errors.push('El número de preguntas debe estar entre 5 y 100.');
  }

  const altCount = parseInt(data.alternativeCount, 10);
  if (isNaN(altCount) || altCount < 2 || altCount > 5) {
    errors.push('El número de alternativas por pregunta debe ser de 2 a 5 opciones.');
  }

  const maxScore = parseFloat(data.maxScore);
  if (isNaN(maxScore) || maxScore <= 0) {
    errors.push('La puntuación máxima debe ser un número positivo (ej. 10.00).');
  }

  return errors;
}

/**
 * Crea una nueva evaluación con valores validados y persistencia en IndexedDB
 */
export async function createEvaluation({
  name,
  subject = '',
  course = '',
  date = new Date().toISOString().split('T')[0],
  questionCount = 20,
  alternativeCount = 4,
  maxScore = 10.0,
  description = ''
}) {
  const evalData = {
    id: generateId(),
    name: name.trim(),
    subject: subject.trim(),
    course: course.trim(),
    date: date || new Date().toISOString().split('T')[0],
    questionCount: parseInt(questionCount, 10),
    alternativeCount: parseInt(alternativeCount, 10),
    maxScore: parseFloat(maxScore) || 10.0,
    description: (description || '').trim()
  };

  const errors = validateEvaluationData(evalData);
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  const saved = await saveEvaluation(evalData);

  // Inicializar automáticamente una clave de respuestas vacía para la evaluación
  const defaultAnswers = {};
  for (let q = 1; q <= evalData.questionCount; q++) {
    defaultAnswers[q] = null;
  }
  await saveAnswerKey({
    evaluationId: saved.id,
    answers: defaultAnswers
  });

  return saved;
}

/**
 * Actualiza los datos de una evaluación existente
 */
export async function updateEvaluation(id, data) {
  const existing = await getEvaluation(id);
  if (!existing) {
    throw new Error('La evaluación solicitada no existe.');
  }

  const updatedData = {
    ...existing,
    name: data.name !== undefined ? data.name.trim() : existing.name,
    subject: data.subject !== undefined ? data.subject.trim() : existing.subject,
    course: data.course !== undefined ? data.course.trim() : existing.course,
    date: data.date || existing.date,
    questionCount: data.questionCount ? parseInt(data.questionCount, 10) : existing.questionCount,
    alternativeCount: data.alternativeCount ? parseInt(data.alternativeCount, 10) : existing.alternativeCount,
    maxScore: data.maxScore ? parseFloat(data.maxScore) : existing.maxScore,
    description: data.description !== undefined ? data.description.trim() : existing.description
  };

  const errors = validateEvaluationData(updatedData);
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  // Si cambia el número de preguntas, sincronizar la clave de respuestas existente
  if (existing.questionCount !== updatedData.questionCount) {
    const existingKey = await getAnswerKey(id);
    const answers = (existingKey && existingKey.answers) ? { ...existingKey.answers } : {};
    for (let q = 1; q <= updatedData.questionCount; q++) {
      if (!answers[q]) answers[q] = null;
    }
    // Eliminar preguntas excedentes si se redujo el conteo
    Object.keys(answers).forEach((k) => {
      if (parseInt(k, 10) > updatedData.questionCount) {
        delete answers[k];
      }
    });
    await saveAnswerKey({
      evaluationId: id,
      answers
    });
  }

  return await saveEvaluation(updatedData);
}

/**
 * Duplica una evaluación existente, incluyendo su clave de respuestas
 */
export async function duplicateEvaluation(id) {
  const original = await getEvaluation(id);
  if (!original) {
    throw new Error('No se encontró la evaluación para duplicar.');
  }

  const newId = generateId();
  const copyData = {
    ...original,
    id: newId,
    name: `${original.name} (Copia)`,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveEvaluation(copyData);

  // Copiar también la clave de respuestas si existe
  const originalKey = await getAnswerKey(id);
  if (originalKey && originalKey.answers) {
    await saveAnswerKey({
      evaluationId: newId,
      answers: { ...originalKey.answers }
    });
  }

  return copyData;
}

/**
 * Elimina una evaluación tras confirmación del usuario
 */
export async function removeEvaluationWithConfirm(id, onDeleted) {
  const ev = await getEvaluation(id);
  if (!ev) return;

  const results = await getResultsByEvaluation(id);
  let warningMessage = `¿Desea eliminar la evaluación "${ev.name}"? Se borrará su configuración y clave de respuestas.`;
  if (results.length > 0) {
    warningMessage += `\n\nATENCIÓN: Se eliminarán también permanentemente ${results.length} resultados de alumnos calificados.`;
  }

  const confirmed = await confirmDialog({
    title: 'Confirmar Eliminación',
    message: warningMessage,
    confirmText: 'Sí, eliminar',
    cancelText: 'Cancelar',
    danger: true
  });

  if (confirmed) {
    await deleteEvaluation(id);
    showToast(`Evaluación "${ev.name}" eliminada correctamente.`, 'info');
    if (typeof onDeleted === 'function') {
      onDeleted();
    }
  }
}
