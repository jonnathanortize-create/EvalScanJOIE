/**
 * EvalScan - Módulo de Base de Datos IndexedDB (database.js)
 * Almacenamiento local, persistente y transaccional para evaluaciones,
 * claves de respuesta, resultados de estudiantes y configuración.
 */

const DB_NAME = 'EvalScanDB';
const DB_VERSION = 1;

let dbInstance = null;

/**
 * Inicializa y abre la base de datos IndexedDB
 */
export function initDB() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Almacén de Evaluaciones
      if (!db.objectStoreNames.contains('evaluations')) {
        const evalStore = db.createObjectStore('evaluations', { keyPath: 'id' });
        evalStore.createIndex('name', 'name', { unique: false });
        evalStore.createIndex('course', 'course', { unique: false });
        evalStore.createIndex('subject', 'subject', { unique: false });
        evalStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 2. Almacén de Claves de Respuestas (una clave por evaluación)
      if (!db.objectStoreNames.contains('answerKeys')) {
        const keyStore = db.createObjectStore('answerKeys', { keyPath: 'evaluationId' });
        keyStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 3. Almacén de Resultados de Alumnos
      if (!db.objectStoreNames.contains('results')) {
        const resultsStore = db.createObjectStore('results', { keyPath: 'id' });
        resultsStore.createIndex('evaluationId', 'evaluationId', { unique: false });
        resultsStore.createIndex('studentName', 'studentName', { unique: false });
        resultsStore.createIndex('studentId', 'studentId', { unique: false });
        resultsStore.createIndex('scannedAt', 'scannedAt', { unique: false });
      }

      // 4. Almacén de Configuración
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('Error al inicializar IndexedDB:', event.target.error);
      reject(new Error('No se pudo acceder al almacenamiento local del navegador (IndexedDB). Verifique los permisos.'));
    };
  });
}

/**
 * Función auxiliar para ejecutar operaciones en almacenes de forma transaccional
 */
async function getStore(storeName, mode = 'readonly') {
  const db = await initDB();
  const tx = db.transaction(storeName, mode);
  return { tx, store: tx.objectStore(storeName) };
}

/* ==========================================================================
   CRUD EVALUACIONES
   ========================================================================== */

export async function getEvaluations() {
  const { store } = await getStore('evaluations', 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      // Ordenar por fecha de creación descendente
      const list = request.result || [];
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      resolve(list);
    };
    request.onerror = () => reject(new Error('Error al obtener la lista de evaluaciones.'));
  });
}

export async function getEvaluation(id) {
  const { store } = await getStore('evaluations', 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error(`Error al recuperar la evaluación con ID ${id}`));
  });
}

export async function saveEvaluation(evalData) {
  const { tx, store } = await getStore('evaluations', 'readwrite');
  return new Promise((resolve, reject) => {
    const data = {
      ...evalData,
      updatedAt: new Date().toISOString()
    };
    if (!data.createdAt) {
      data.createdAt = data.updatedAt;
    }
    const request = store.put(data);
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(new Error('Error al guardar la evaluación en almacenamiento local.'));
    tx.oncomplete = () => {};
  });
}

export async function deleteEvaluation(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    // Transacción atómica que elimina la evaluación, su clave y todos sus resultados
    const tx = db.transaction(['evaluations', 'answerKeys', 'results'], 'readwrite');

    const evalStore = tx.objectStore('evaluations');
    const keyStore = tx.objectStore('answerKeys');
    const resultsStore = tx.objectStore('results');

    evalStore.delete(id);
    keyStore.delete(id);

    // Eliminar todos los resultados con evaluationId = id
    const index = resultsStore.index('evaluationId');
    const cursorReq = index.openCursor(IDBKeyRange.only(id));
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(new Error(`Error al eliminar la evaluación y sus datos asociados: ${e.target.error?.message}`));
  });
}

/* ==========================================================================
   CRUD CLAVE DE RESPUESTAS (ANSWER KEYS)
   ========================================================================== */

export async function getAnswerKey(evaluationId) {
  const { store } = await getStore('answerKeys', 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.get(evaluationId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error('Error al consultar la clave de respuestas.'));
  });
}

export async function saveAnswerKey(keyData) {
  const { store } = await getStore('answerKeys', 'readwrite');
  return new Promise((resolve, reject) => {
    const data = {
      ...keyData,
      updatedAt: new Date().toISOString()
    };
    const request = store.put(data);
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(new Error('Error al guardar la clave de respuestas.'));
  });
}

/* ==========================================================================
   CRUD RESULTADOS DE ESTUDIANTES
   ========================================================================== */

export async function getResultsByEvaluation(evaluationId) {
  const { store } = await getStore('results', 'readonly');
  return new Promise((resolve, reject) => {
    const index = store.index('evaluationId');
    const request = index.getAll(IDBKeyRange.only(evaluationId));
    request.onsuccess = () => {
      const list = request.result || [];
      // Ordenar por fecha de escaneo descendente
      list.sort((a, b) => new Date(b.scannedAt || 0) - new Date(a.scannedAt || 0));
      resolve(list);
    };
    request.onerror = () => reject(new Error('Error al recuperar los resultados de la evaluación.'));
  });
}

export async function getResult(id) {
  const { store } = await getStore('results', 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error('Error al recuperar el resultado especificado.'));
  });
}

export async function saveResult(resultData) {
  const { store } = await getStore('results', 'readwrite');
  return new Promise((resolve, reject) => {
    const data = {
      ...resultData,
      updatedAt: new Date().toISOString()
    };
    if (!data.scannedAt) {
      data.scannedAt = data.updatedAt;
    }
    const request = store.put(data);
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(new Error('Error al guardar el resultado de la hoja escaneada.'));
  });
}

export async function deleteResult(id) {
  const { store } = await getStore('results', 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(new Error('Error al eliminar el resultado.'));
  });
}

/* ==========================================================================
   CONFIGURACIÓN Y COPIAS DE SEGURIDAD
   ========================================================================== */

export async function getSetting(key, defaultValue = null) {
  const { store } = await getStore('settings', 'readonly');
  return new Promise((resolve) => {
    const request = store.get(key);
    request.onsuccess = () => {
      resolve(request.result ? request.result.value : defaultValue);
    };
    request.onerror = () => resolve(defaultValue);
  });
}

export async function saveSetting(key, value) {
  const { store } = await getStore('settings', 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put({ key, value, updatedAt: new Date().toISOString() });
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(new Error('Error al guardar la configuración.'));
  });
}

/**
 * Exporta toda la base de datos para respaldo en archivo JSON
 */
export async function getAllDataForExport() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['evaluations', 'answerKeys', 'results', 'settings'], 'readonly');

    const evalsReq = tx.objectStore('evaluations').getAll();
    const keysReq = tx.objectStore('answerKeys').getAll();
    const resultsReq = tx.objectStore('results').getAll();
    const settingsReq = tx.objectStore('settings').getAll();

    tx.oncomplete = () => {
      resolve({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        appName: 'EvalScan',
        evaluations: evalsReq.result || [],
        answerKeys: keysReq.result || [],
        results: resultsReq.result || [],
        settings: settingsReq.result || []
      });
    };

    tx.onerror = () => reject(new Error('Error al extraer datos para la copia de seguridad.'));
  });
}

/**
 * Restaura una copia de seguridad JSON validando la estructura
 */
export async function restoreBackup(backupData) {
  if (!backupData || !Array.isArray(backupData.evaluations)) {
    throw new Error('El archivo no contiene un formato de respaldo válido de EvalScan.');
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['evaluations', 'answerKeys', 'results', 'settings'], 'readwrite');

    const evalStore = tx.objectStore('evaluations');
    const keyStore = tx.objectStore('answerKeys');
    const resStore = tx.objectStore('results');
    const setStore = tx.objectStore('settings');

    for (const ev of backupData.evaluations) {
      evalStore.put(ev);
    }
    if (Array.isArray(backupData.answerKeys)) {
      for (const ak of backupData.answerKeys) {
        keyStore.put(ak);
      }
    }
    if (Array.isArray(backupData.results)) {
      for (const res of backupData.results) {
        resStore.put(res);
      }
    }
    if (Array.isArray(backupData.settings)) {
      for (const s of backupData.settings) {
        setStore.put(s);
      }
    }

    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(new Error(`Error al restaurar los datos: ${e.target.error?.message}`));
  });
}
