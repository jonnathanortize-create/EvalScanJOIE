/**
 * EvalScan - Módulo de Utilidades (utils.js)
 * Funciones de formato en español, gestión de diálogos modales,
 * notificaciones toast, validación y soporte de audio sintetizado para escaneo.
 */

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'eval_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Formatea una fecha ISO o timestamp al formato local de Ecuador / Hispanoamérica (DD/MM/AAAA)
 */
export function formatDate(dateInput, includeTime = false) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (!includeTime) {
    return `${day}/${month}/${year}`;
  }

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Formato numérico con coma decimal estándar en español
 */
export function formatNumber(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return '0,00';
  const fixed = Number(val).toFixed(decimals);
  return fixed.replace('.', ',');
}

export function formatPercentage(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return '0,0%';
  return `${formatNumber(val, decimals)}%`;
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sistema de notificaciones flotantes (Toast)
 */
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start gap-3 transition-all transform duration-300 translate-y-4 opacity-0 text-sm font-medium ${
    type === 'success'
      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
      : type === 'error'
      ? 'bg-rose-50 text-rose-900 border-rose-300'
      : type === 'warning'
      ? 'bg-amber-50 text-amber-900 border-amber-300'
      : 'bg-slate-900 text-white border-slate-700'
  }`;

  const iconSvg =
    type === 'success'
      ? `<svg class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
      : type === 'error'
      ? `<svg class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`
      : type === 'warning'
      ? `<svg class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`
      : `<svg class="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

  toast.innerHTML = `
    ${iconSvg}
    <div class="flex-1">${escapeHtml(message)}</div>
    <button class="text-slate-400 hover:text-slate-600 ml-1" aria-label="Cerrar">&times;</button>
  `;

  container.appendChild(toast);

  // Animación de entrada
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  });

  const closeToast = () => {
    toast.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 300);
  };

  toast.querySelector('button')?.addEventListener('click', closeToast);

  if (duration > 0) {
    setTimeout(closeToast, duration);
  }
}

/**
 * Diálogo de confirmación accesible y bloqueante (Retorna Promise<boolean>)
 */
export function confirmDialog({
  title = '¿Está seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false
}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in';

    overlay.innerHTML = `
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 transform transition-all text-slate-800" role="dialog" aria-modal="true">
        <h3 class="text-lg font-bold text-slate-900 mb-2">${escapeHtml(title)}</h3>
        <p class="text-sm text-slate-600 mb-6 leading-relaxed">${escapeHtml(message)}</p>
        <div class="flex justify-end gap-3">
          <button id="modal-cancel-btn" type="button" class="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer">
            ${escapeHtml(cancelText)}
          </button>
          <button id="modal-confirm-btn" type="button" class="px-4 py-2 text-sm font-semibold text-white rounded-xl transition shadow-xs cursor-pointer ${
            danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
          }">
            ${escapeHtml(confirmText)}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = (result) => {
      overlay.classList.add('opacity-0');
      setTimeout(() => {
        if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
        resolve(result);
      }, 150);
    };

    overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => cleanup(false));
    overlay.querySelector('#modal-confirm-btn').addEventListener('click', () => cleanup(true));

    // Cerrar al pulsar Escape
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        window.removeEventListener('keydown', onKeyDown);
        cleanup(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
  });
}

/**
 * Diálogo de alerta simple (Retorna Promise<void>)
 */
export function alertDialog({ title = 'Aviso', message = '', buttonText = 'Entendido' }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in';

    overlay.innerHTML = `
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800" role="dialog" aria-modal="true">
        <h3 class="text-lg font-bold text-slate-900 mb-2">${escapeHtml(title)}</h3>
        <p class="text-sm text-slate-600 mb-6 leading-relaxed whitespace-pre-line">${escapeHtml(message)}</p>
        <div class="flex justify-end">
          <button id="alert-ok-btn" type="button" class="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer">
            ${escapeHtml(buttonText)}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = () => {
      if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
      resolve();
    };

    overlay.querySelector('#alert-ok-btn').addEventListener('click', cleanup);
  });
}

/**
 * Sonido sintetizado para feedback al escanear correctamente o detectar error (sin archivos externos)
 */
export function playFeedbackSound(type = 'success') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {
    // Si la política de audio del navegador lo restringe, omitir silenciosamente
  }
}
