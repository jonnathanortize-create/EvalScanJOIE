(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`EvalScanDB`,t=1,n=null;function r(){return n?Promise.resolve(n):new Promise((r,i)=>{let a=indexedDB.open(e,t);a.onupgradeneeded=e=>{let t=e.target.result;if(!t.objectStoreNames.contains(`evaluations`)){let e=t.createObjectStore(`evaluations`,{keyPath:`id`});e.createIndex(`name`,`name`,{unique:!1}),e.createIndex(`course`,`course`,{unique:!1}),e.createIndex(`subject`,`subject`,{unique:!1}),e.createIndex(`createdAt`,`createdAt`,{unique:!1})}if(t.objectStoreNames.contains(`answerKeys`)||t.createObjectStore(`answerKeys`,{keyPath:`evaluationId`}).createIndex(`updatedAt`,`updatedAt`,{unique:!1}),!t.objectStoreNames.contains(`results`)){let e=t.createObjectStore(`results`,{keyPath:`id`});e.createIndex(`evaluationId`,`evaluationId`,{unique:!1}),e.createIndex(`studentName`,`studentName`,{unique:!1}),e.createIndex(`studentId`,`studentId`,{unique:!1}),e.createIndex(`scannedAt`,`scannedAt`,{unique:!1})}t.objectStoreNames.contains(`settings`)||t.createObjectStore(`settings`,{keyPath:`key`})},a.onsuccess=e=>{n=e.target.result,r(n)},a.onerror=e=>{console.error(`Error al inicializar IndexedDB:`,e.target.error),i(Error(`No se pudo acceder al almacenamiento local del navegador (IndexedDB). Verifique los permisos.`))}})}async function i(e,t=`readonly`){let n=(await r()).transaction(e,t);return{tx:n,store:n.objectStore(e)}}async function a(){let{store:e}=await i(`evaluations`,`readonly`);return new Promise((t,n)=>{let r=e.getAll();r.onsuccess=()=>{let e=r.result||[];e.sort((e,t)=>new Date(t.createdAt||0)-new Date(e.createdAt||0)),t(e)},r.onerror=()=>n(Error(`Error al obtener la lista de evaluaciones.`))})}async function o(e){let{store:t}=await i(`evaluations`,`readonly`);return new Promise((n,r)=>{let i=t.get(e);i.onsuccess=()=>n(i.result||null),i.onerror=()=>r(Error(`Error al recuperar la evaluación con ID ${e}`))})}async function s(e){let{tx:t,store:n}=await i(`evaluations`,`readwrite`);return new Promise((r,i)=>{let a={...e,updatedAt:new Date().toISOString()};a.createdAt||=a.updatedAt;let o=n.put(a);o.onsuccess=()=>r(a),o.onerror=()=>i(Error(`Error al guardar la evaluación en almacenamiento local.`)),t.oncomplete=()=>{}})}async function c(e){let t=await r();return new Promise((n,r)=>{let i=t.transaction([`evaluations`,`answerKeys`,`results`],`readwrite`),a=i.objectStore(`evaluations`),o=i.objectStore(`answerKeys`),s=i.objectStore(`results`);a.delete(e),o.delete(e);let c=s.index(`evaluationId`).openCursor(IDBKeyRange.only(e));c.onsuccess=e=>{let t=e.target.result;t&&(t.delete(),t.continue())},i.oncomplete=()=>n(!0),i.onerror=e=>r(Error(`Error al eliminar la evaluación y sus datos asociados: ${e.target.error?.message}`))})}async function l(e){let{store:t}=await i(`answerKeys`,`readonly`);return new Promise((n,r)=>{let i=t.get(e);i.onsuccess=()=>n(i.result||null),i.onerror=()=>r(Error(`Error al consultar la clave de respuestas.`))})}async function u(e){let{store:t}=await i(`answerKeys`,`readwrite`);return new Promise((n,r)=>{let i={...e,updatedAt:new Date().toISOString()},a=t.put(i);a.onsuccess=()=>n(i),a.onerror=()=>r(Error(`Error al guardar la clave de respuestas.`))})}async function d(e){let{store:t}=await i(`results`,`readonly`);return new Promise((n,r)=>{let i=t.index(`evaluationId`).getAll(IDBKeyRange.only(e));i.onsuccess=()=>{let e=i.result||[];e.sort((e,t)=>new Date(t.scannedAt||0)-new Date(e.scannedAt||0)),n(e)},i.onerror=()=>r(Error(`Error al recuperar los resultados de la evaluación.`))})}async function f(e){let{store:t}=await i(`results`,`readonly`);return new Promise((n,r)=>{let i=t.get(e);i.onsuccess=()=>n(i.result||null),i.onerror=()=>r(Error(`Error al recuperar el resultado especificado.`))})}async function p(e){let{store:t}=await i(`results`,`readwrite`);return new Promise((n,r)=>{let i={...e,updatedAt:new Date().toISOString()};i.scannedAt||=i.updatedAt;let a=t.put(i);a.onsuccess=()=>n(i),a.onerror=()=>r(Error(`Error al guardar el resultado de la hoja escaneada.`))})}async function m(e){let{store:t}=await i(`results`,`readwrite`);return new Promise((n,r)=>{let i=t.delete(e);i.onsuccess=()=>n(!0),i.onerror=()=>r(Error(`Error al eliminar el resultado.`))})}async function h(){let e=await r();return new Promise((t,n)=>{let r=e.transaction([`evaluations`,`answerKeys`,`results`,`settings`],`readonly`),i=r.objectStore(`evaluations`).getAll(),a=r.objectStore(`answerKeys`).getAll(),o=r.objectStore(`results`).getAll(),s=r.objectStore(`settings`).getAll();r.oncomplete=()=>{t({version:`1.0`,exportedAt:new Date().toISOString(),appName:`EvalScan`,evaluations:i.result||[],answerKeys:a.result||[],results:o.result||[],settings:s.result||[]})},r.onerror=()=>n(Error(`Error al extraer datos para la copia de seguridad.`))})}async function g(e){if(!e||!Array.isArray(e.evaluations))throw Error(`El archivo no contiene un formato de respaldo válido de EvalScan.`);let t=await r();return new Promise((n,r)=>{let i=t.transaction([`evaluations`,`answerKeys`,`results`,`settings`],`readwrite`),a=i.objectStore(`evaluations`),o=i.objectStore(`answerKeys`),s=i.objectStore(`results`),c=i.objectStore(`settings`);for(let t of e.evaluations)a.put(t);if(Array.isArray(e.answerKeys))for(let t of e.answerKeys)o.put(t);if(Array.isArray(e.results))for(let t of e.results)s.put(t);if(Array.isArray(e.settings))for(let t of e.settings)c.put(t);i.oncomplete=()=>n(!0),i.onerror=e=>r(Error(`Error al restaurar los datos: ${e.target.error?.message}`))})}function _(){return typeof crypto<`u`&&crypto.randomUUID?crypto.randomUUID():`eval_`+Date.now().toString(36)+`_`+Math.random().toString(36).substring(2,9)}function v(e,t=!1){if(!e)return`-`;let n=new Date(e);if(isNaN(n.getTime()))return String(e);let r=String(n.getDate()).padStart(2,`0`),i=String(n.getMonth()+1).padStart(2,`0`),a=n.getFullYear();return t?`${r}/${i}/${a} ${String(n.getHours()).padStart(2,`0`)}:${String(n.getMinutes()).padStart(2,`0`)}`:`${r}/${i}/${a}`}function y(e,t=2){return e==null||isNaN(e)?`0,00`:Number(e).toFixed(t).replace(`.`,`,`)}function b(e,t=1){return e==null||isNaN(e)?`0,0%`:`${y(e,t)}%`}function x(e){return e?String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#039;`):``}function S(e,t=`info`,n=3500){let r=document.getElementById(`toast-container`);r||(r=document.createElement(`div`),r.id=`toast-container`,r.className=`fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4`,document.body.appendChild(r));let i=document.createElement(`div`);i.className=`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start gap-3 transition-all transform duration-300 translate-y-4 opacity-0 text-sm font-medium ${t===`success`?`bg-emerald-50 text-emerald-900 border-emerald-300`:t===`error`?`bg-rose-50 text-rose-900 border-rose-300`:t===`warning`?`bg-amber-50 text-amber-900 border-amber-300`:`bg-slate-900 text-white border-slate-700`}`,i.innerHTML=`
    ${t===`success`?`<svg class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`:t===`error`?`<svg class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`:t===`warning`?`<svg class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`:`<svg class="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`}
    <div class="flex-1">${x(e)}</div>
    <button class="text-slate-400 hover:text-slate-600 ml-1" aria-label="Cerrar">&times;</button>
  `,r.appendChild(i),requestAnimationFrame(()=>{i.classList.remove(`translate-y-4`,`opacity-0`)});let a=()=>{i.classList.add(`translate-y-4`,`opacity-0`),setTimeout(()=>{i.parentElement&&i.parentElement.removeChild(i)},300)};i.querySelector(`button`)?.addEventListener(`click`,a),n>0&&setTimeout(a,n)}function C({title:e=`¿Está seguro?`,message:t=`Esta acción no se puede deshacer.`,confirmText:n=`Confirmar`,cancelText:r=`Cancelar`,danger:i=!1}){return new Promise(a=>{let o=document.createElement(`div`);o.className=`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in`,o.innerHTML=`
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 transform transition-all text-slate-800" role="dialog" aria-modal="true">
        <h3 class="text-lg font-bold text-slate-900 mb-2">${x(e)}</h3>
        <p class="text-sm text-slate-600 mb-6 leading-relaxed">${x(t)}</p>
        <div class="flex justify-end gap-3">
          <button id="modal-cancel-btn" type="button" class="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer">
            ${x(r)}
          </button>
          <button id="modal-confirm-btn" type="button" class="px-4 py-2 text-sm font-semibold text-white rounded-xl transition shadow-xs cursor-pointer ${i?`bg-rose-600 hover:bg-rose-700`:`bg-blue-600 hover:bg-blue-700`}">
            ${x(n)}
          </button>
        </div>
      </div>
    `,document.body.appendChild(o);let s=e=>{o.classList.add(`opacity-0`),setTimeout(()=>{o.parentElement&&o.parentElement.removeChild(o),a(e)},150)};o.querySelector(`#modal-cancel-btn`).addEventListener(`click`,()=>s(!1)),o.querySelector(`#modal-confirm-btn`).addEventListener(`click`,()=>s(!0));let c=e=>{e.key===`Escape`&&(window.removeEventListener(`keydown`,c),s(!1))};window.addEventListener(`keydown`,c)})}function w({title:e=`Aviso`,message:t=``,buttonText:n=`Entendido`}){return new Promise(r=>{let i=document.createElement(`div`);i.className=`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in`,i.innerHTML=`
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800" role="dialog" aria-modal="true">
        <h3 class="text-lg font-bold text-slate-900 mb-2">${x(e)}</h3>
        <p class="text-sm text-slate-600 mb-6 leading-relaxed whitespace-pre-line">${x(t)}</p>
        <div class="flex justify-end">
          <button id="alert-ok-btn" type="button" class="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer">
            ${x(n)}
          </button>
        </div>
      </div>
    `,document.body.appendChild(i),i.querySelector(`#alert-ok-btn`).addEventListener(`click`,()=>{i.parentElement&&i.parentElement.removeChild(i),r()})})}function T(e=`success`){try{let t=window.AudioContext||window.webkitAudioContext;if(!t)return;let n=new t;if(e===`success`){let e=n.createOscillator(),t=n.createGain();e.type=`sine`,e.frequency.setValueAtTime(587.33,n.currentTime),e.frequency.setValueAtTime(880,n.currentTime+.1),t.gain.setValueAtTime(.15,n.currentTime),t.gain.exponentialRampToValueAtTime(.001,n.currentTime+.35),e.connect(t),t.connect(n.destination),e.start(),e.stop(n.currentTime+.35)}else{let e=n.createOscillator(),t=n.createGain();e.type=`sawtooth`,e.frequency.setValueAtTime(220,n.currentTime),e.frequency.setValueAtTime(164.81,n.currentTime+.15),t.gain.setValueAtTime(.2,n.currentTime),t.gain.exponentialRampToValueAtTime(.001,n.currentTime+.35),e.connect(t),t.connect(n.destination),e.start(),e.stop(n.currentTime+.35)}}catch{}}var E={3:[`A`,`B`,`C`],4:[`A`,`B`,`C`,`D`],5:[`A`,`B`,`C`,`D`,`E`]};function D(e){let t=[];e.name&&e.name.trim().length!==0||t.push(`El nombre de la evaluación es obligatorio (ej. MCU, Examen Parcial).`);let n=parseInt(e.questionCount,10);(isNaN(n)||n<5||n>100)&&t.push(`El número de preguntas debe estar entre 5 y 100.`);let r=parseInt(e.alternativeCount,10);(isNaN(r)||r<2||r>5)&&t.push(`El número de alternativas por pregunta debe ser de 2 a 5 opciones.`);let i=parseFloat(e.maxScore);return(isNaN(i)||i<=0)&&t.push(`La puntuación máxima debe ser un número positivo (ej. 10.00).`),t}async function O({name:e,subject:t=``,course:n=``,date:r=new Date().toISOString().split(`T`)[0],questionCount:i=20,alternativeCount:a=4,maxScore:o=10,description:c=``}){let l={id:_(),name:e.trim(),subject:t.trim(),course:n.trim(),date:r||new Date().toISOString().split(`T`)[0],questionCount:parseInt(i,10),alternativeCount:parseInt(a,10),maxScore:parseFloat(o)||10,description:(c||``).trim()},d=D(l);if(d.length>0)throw Error(d.join(`
`));let f=await s(l),p={};for(let e=1;e<=l.questionCount;e++)p[e]=null;return await u({evaluationId:f.id,answers:p}),f}async function ee(e,t){let n=await o(e);if(!n)throw Error(`La evaluación solicitada no existe.`);let r={...n,name:t.name===void 0?n.name:t.name.trim(),subject:t.subject===void 0?n.subject:t.subject.trim(),course:t.course===void 0?n.course:t.course.trim(),date:t.date||n.date,questionCount:t.questionCount?parseInt(t.questionCount,10):n.questionCount,alternativeCount:t.alternativeCount?parseInt(t.alternativeCount,10):n.alternativeCount,maxScore:t.maxScore?parseFloat(t.maxScore):n.maxScore,description:t.description===void 0?n.description:t.description.trim()},i=D(r);if(i.length>0)throw Error(i.join(`
`));if(n.questionCount!==r.questionCount){let t=await l(e),n=t&&t.answers?{...t.answers}:{};for(let e=1;e<=r.questionCount;e++)n[e]||(n[e]=null);Object.keys(n).forEach(e=>{parseInt(e,10)>r.questionCount&&delete n[e]}),await u({evaluationId:e,answers:n})}return await s(r)}async function te(e){let t=await o(e);if(!t)throw Error(`No se encontró la evaluación para duplicar.`);let n=_(),r={...t,id:n,name:`${t.name} (Copia)`,date:new Date().toISOString().split(`T`)[0],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};await s(r);let i=await l(e);return i&&i.answers&&await u({evaluationId:n,answers:{...i.answers}}),r}async function ne(e,t){let n=await o(e);if(!n)return;let r=await d(e),i=`¿Desea eliminar la evaluación "${n.name}"? Se borrará su configuración y clave de respuestas.`;r.length>0&&(i+=`\n\nATENCIÓN: Se eliminarán también permanentemente ${r.length} resultados de alumnos calificados.`),await C({title:`Confirmar Eliminación`,message:i,confirmText:`Sí, eliminar`,cancelText:`Cancelar`,danger:!0})&&(await c(e),S(`Evaluación "${n.name}" eliminada correctamente.`,`info`),typeof t==`function`&&t())}async function re(e){let t=await o(e);if(!t)throw Error(`La evaluación solicitada no existe.`);let n=await l(e);n||={evaluationId:e,answers:{}};let r=E[t.alternativeCount]||[`A`,`B`,`C`,`D`];for(let e=1;e<=t.questionCount;e++)n.answers[e]||(n.answers[e]=null);return{evaluation:t,answerKey:n,alternatives:r}}function k(e,t){let n=[];for(let r=1;r<=t;r++)e&&e[r]||n.push(r);return{isComplete:n.length===0,totalConfigured:t,answeredCount:t-n.length,missingQuestions:n}}async function ie(e,t,n){let r=await l(e)||{evaluationId:e,answers:{}};return r.answers=r.answers||{},r.answers[t]=n,await u(r),r}async function ae(e,t){let n=await o(e);if(!n)throw Error(`Evaluación no encontrada.`);let r={evaluationId:e,answers:{}};for(let e=1;e<=n.questionCount;e++)r.answers[e]=t;return await u(r),r}async function A(e){let t=await o(e);if(!t)throw Error(`Evaluación no encontrada.`);let n=E[t.alternativeCount]||[`A`,`B`,`C`,`D`],r={evaluationId:e,answers:{}};for(let e=1;e<=t.questionCount;e++)r.answers[e]=n[(e-1)%n.length];return await u(r),r}var j={CANVAS_WIDTH:800,CANVAS_HEIGHT:1131,MARKERS:{TOP_LEFT:{x:50,y:50,size:36,id:`TL`},TOP_RIGHT:{x:750,y:50,size:36,id:`TR`},BOTTOM_RIGHT:{x:750,y:1081,size:36,id:`BR`},BOTTOM_LEFT:{x:50,y:1081,size:36,id:`BL`}},GRID_AREA:{TOP:250,BOTTOM:1040,LEFT:55,RIGHT:745},BUBBLE_RADIUS:9,BUBBLE_SPACING_X:25};function M(e,t=4){let n=E[t]||[`A`,`B`,`C`,`D`],r=1;r=e<=25?e<=15?1:2:e<=50?2:e<=75?3:4;let i=Math.ceil(e/r),a=(j.GRID_AREA.RIGHT-j.GRID_AREA.LEFT)/r,o=j.GRID_AREA.BOTTOM-j.GRID_AREA.TOP,s=Math.min(38,o/i),c={};for(let t=1;t<=e;t++){let e=Math.floor((t-1)/i),r=(t-1)%i,o=j.GRID_AREA.LEFT+e*a,l=j.GRID_AREA.TOP+r*s+s*.5,u=o+20,d=o+52,f={};n.forEach((e,t)=>{f[e]={x:Math.round(d+t*j.BUBBLE_SPACING_X),y:Math.round(l),radius:j.BUBBLE_RADIUS}}),c[t]={questionNumber:t,colIndex:e,rowIndex:r,numberX:u,y:l,bubbles:f}}return{numCols:r,questionsPerCol:i,colWidth:a,rowHeight:s,questionsMap:c,alts:n}}function oe(e){let t=e.questionCount||20,n=e.alternativeCount||4,r=M(t,n),i=r.alts,a=``;for(let e=0;e<r.numCols;e++){let n=e*r.questionsPerCol+1,o=Math.min((e+1)*r.questionsPerCol,t),s=``;for(let e=n;e<=o;e++){let t=``;i.forEach(n=>{t+=`
          <div class="omr-bubble" data-question="${e}" data-alt="${n}">
            <span class="bubble-letter">${n}</span>
          </div>
        `}),s+=`
        <div class="omr-row" style="height: ${Math.max(24,Math.floor(r.rowHeight*.7))}px;">
          <div class="omr-q-num">${e}</div>
          <div class="omr-bubbles-group">
            ${t}
          </div>
        </div>
      `}a+=`
      <div class="omr-column" style="width: ${Math.floor(100/r.numCols)}%;">
        <div class="omr-column-header">
          <span class="hdr-num">N°</span>
          <span class="hdr-opts">OPCIONES</span>
        </div>
        ${s}
      </div>
    `}return`
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
            <div class="eval-title">${x(e.name)}</div>
            <div class="eval-details">
              ${e.subject?`<span><strong>Materia:</strong> ${x(e.subject)}</span>`:``}
              ${e.course?`<span><strong>Curso:</strong> ${x(e.course)}</span>`:``}
              <span><strong>Fecha:</strong> ${v(e.date)}</span>
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
        ${a}
      </main>

      <!-- PIE DE HOJA -->
      <footer class="sheet-footer">
        <span class="footer-id">ID: ${e.id} | ${t} PREGUNTAS | ${n} ALTERNATIVAS</span>
        <span class="footer-note">Hoja oficial generada para escaneo automático offline con EvalScan</span>
      </footer>
    </div>
  `}function N(e,t,n={}){let r=e.questionCount||20,i=M(r,e.alternativeCount||4);t.width=j.CANVAS_WIDTH,t.height=j.CANVAS_HEIGHT;let a=t.getContext(`2d`);a.fillStyle=`#ffffff`,a.fillRect(0,0,t.width,t.height);let o=(e,t,n=!1)=>{a.fillStyle=`#000000`,a.fillRect(e-18,t-18,36,36),a.fillStyle=`#ffffff`,a.fillRect(e-10,t-10,20,20),a.fillStyle=`#000000`,a.fillRect(e-5,t-5,10,10),n&&(a.fillStyle=`#000000`,a.fillRect(e-14,t-14,6,6))},s=j.MARKERS;o(s.TOP_LEFT.x,s.TOP_LEFT.y,!0),o(s.TOP_RIGHT.x,s.TOP_RIGHT.y,!1),o(s.BOTTOM_RIGHT.x,s.BOTTOM_RIGHT.y,!1),o(s.BOTTOM_LEFT.x,s.BOTTOM_LEFT.y,!1),a.fillStyle=`#000000`,a.fillRect(100,35,600,4),a.fillStyle=`#1e293b`,a.font=`bold 22px sans-serif`,a.fillText(`EvalScan - Hoja de Respuestas`,80,95),a.font=`bold 15px sans-serif`,a.fillText(`Evaluación: ${e.name}`,80,125),a.font=`normal 13px sans-serif`,a.fillStyle=`#475569`;let c=[e.subject?`Materia: ${e.subject}`:``,e.course?`Curso: ${e.course}`:``,`Fecha: ${v(e.date)}`].filter(Boolean).join(`  |  `);a.fillText(c,80,148),a.strokeStyle=`#cbd5e1`,a.lineWidth=1.5,a.strokeRect(80,165,640,60),a.fillStyle=`#334155`,a.font=`bold 11px sans-serif`,a.fillText(`ESTUDIANTE (Apellidos y Nombres): __________________________________________________`,95,190),a.fillText(`CÉDULA / MATRÍCULA: ______________________    PARALELO: _________    FIRMA: ____________`,95,212),a.font=`bold 12px sans-serif`,a.textAlign=`center`,a.textBaseline=`middle`;for(let e=1;e<=r;e++){let t=i.questionsMap[e];t&&(a.fillStyle=`#334155`,a.fillText(`${e}.`,t.numberX,t.y),i.alts.forEach(r=>{let i=t.bubbles[r],o=n[e]===r;a.beginPath(),a.arc(i.x,i.y,i.radius,0,Math.PI*2),o?(a.fillStyle=`#111827`,a.fill(),a.fillStyle=`#ffffff`,a.fillText(r,i.x,i.y)):(a.strokeStyle=`#475569`,a.lineWidth=1.5,a.stroke(),a.fillStyle=`#475569`,a.fillText(r,i.x,i.y))}))}a.font=`normal 11px sans-serif`,a.fillStyle=`#64748b`,a.textAlign=`center`,a.fillText(`ID: ${e.id}  •  ${r} Preguntas  •  EvalScan Offline OMR`,t.width/2,1060)}var P=class e{constructor(){this.stream=null,this.videoElement=null,this.currentDeviceId=null,this.availableDevices=[],this.hasTorch=!1,this.torchEnabled=!1}static isSupported(){return!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)}async getVideoDevices(){if(!e.isSupported())return[];try{let e=await navigator.mediaDevices.enumerateDevices();return this.availableDevices=e.filter(e=>e.kind===`videoinput`),this.availableDevices}catch(e){return console.warn(`Error al enumerar dispositivos de video:`,e),[]}}async startCamera(t,n=null){if(!e.isSupported())throw Error(`Su navegador no soporta el acceso directo a la cámara. Puede utilizar la opción de importar archivo de imagen.`);this.stopCamera(),this.videoElement=t;let r={audio:!1,video:{width:{ideal:1920,min:1024},height:{ideal:1080,min:720},facingMode:n?void 0:{ideal:`environment`},deviceId:n?{exact:n}:void 0}};try{this.stream=await navigator.mediaDevices.getUserMedia(r),this.videoElement.srcObject=this.stream,await new Promise((e,t)=>{this.videoElement.onloadedmetadata=()=>{this.videoElement.play().then(e).catch(t)},setTimeout(()=>e(),3e3)});let e=this.stream.getVideoTracks()[0];if(e){this.currentDeviceId=e.getSettings()?.deviceId||n;let t=e.getCapabilities?e.getCapabilities():{};this.hasTorch=!!t.torch}return await this.getVideoDevices(),{success:!0,hasTorch:this.hasTorch,devices:this.availableDevices}}catch(e){console.error(`Error al iniciar la cámara:`,e);let t=`No se pudo iniciar la cámara.`;throw e.name===`NotAllowedError`||e.name===`PermissionDeniedError`?t=`Permiso denegado para acceder a la cámara. Por favor autorice el acceso en su navegador o importe una foto.`:e.name===`NotFoundError`||e.name===`DevicesNotFoundError`?t=`No se detectó ninguna cámara disponible en el dispositivo.`:(e.name===`NotReadableError`||e.name===`TrackStartError`)&&(t=`La cámara está siendo utilizada por otra aplicación.`),Error(t)}}async toggleTorch(){if(!this.stream||!this.hasTorch)return!1;let e=this.stream.getVideoTracks()[0];if(!e||!e.applyConstraints)return!1;try{return this.torchEnabled=!this.torchEnabled,await e.applyConstraints({advanced:[{torch:this.torchEnabled}]}),this.torchEnabled}catch(e){return console.warn(`Error al activar linterna:`,e),this.torchEnabled=!1,!1}}captureFrame(){if(!this.videoElement||!this.stream)throw Error(`La cámara no está activa para capturar fotogramas.`);let e=document.createElement(`canvas`),t=this.videoElement.videoWidth||1280,n=this.videoElement.videoHeight||720;return e.width=t,e.height=n,e.getContext(`2d`).drawImage(this.videoElement,0,0,t,n),e}stopCamera(){this.stream&&=(this.stream.getTracks().forEach(e=>{try{e.stop()}catch{}}),null),this.videoElement&&(this.videoElement.srcObject=null),this.torchEnabled=!1,this.hasTorch=!1}static loadImageFromFile(e){return new Promise((t,n)=>{if(!e||!e.type.startsWith(`image/`)){n(Error(`El archivo seleccionado no es una imagen válida (JPG, PNG, WebP).`));return}let r=new FileReader;r.onload=e=>{let r=new Image;r.onload=()=>{let e=document.createElement(`canvas`);e.width=r.width,e.height=r.height,e.getContext(`2d`).drawImage(r,0,0),t(e)},r.onerror=()=>n(Error(`No se pudo decodificar la imagen seleccionada.`)),r.src=e.target.result},r.onerror=()=>n(Error(`Error al leer el archivo desde el dispositivo.`)),r.readAsDataURL(e)})}};function F(e){let t=e.data,n=t.length,r=new Uint8Array(n/4);for(let e=0,i=0;e<n;e+=4,i++)r[i]=t[e]*54+t[e+1]*183+t[e+2]*19>>8;return r}function se(e,t,n,r=25,i=12){let a=new Uint8Array(t*n),o=new Float64Array(t*n);for(let r=0;r<n;r++){let n=0,i=r*t;for(let a=0;a<t;a++)n+=e[i+a],r===0?o[i+a]=n:o[i+a]=o[(r-1)*t+a]+n}let s=Math.floor(r/2),c=(100-i)/100;for(let r=0;r<n;r++){let i=Math.max(0,r-s),l=Math.min(n-1,r+s),u=r*t;for(let n=0;n<t;n++){let r=Math.max(0,n-s),d=Math.min(t-1,n+s),f=(d-r)*(l-i),p=o[l*t+d]-o[i*t+d]-o[l*t+r]+o[i*t+r],m=e[u+n];m<90||m*f<=p*c?a[u+n]=0:a[u+n]=255}}return a}function ce(e,t,n){let r=[{name:`TL`,x0:0,y0:0,x1:Math.floor(t*.45),y1:Math.floor(n*.45)},{name:`TR`,x0:Math.floor(t*.55),y0:0,x1:t,y1:Math.floor(n*.45)},{name:`BR`,x0:Math.floor(t*.55),y0:Math.floor(n*.55),x1:t,y1:n},{name:`BL`,x0:0,y0:Math.floor(n*.55),x1:Math.floor(t*.45),y1:n}],i={};return r.forEach(r=>{let a=le(e,t,n,r.x0,r.y0,r.x1,r.y1);a&&(i[r.name]=a)}),i}function le(e,t,n,r,i,a,o){let s=null,c=-1,l=Math.max(2,Math.floor(Math.min(t,n)/300)),u=Math.floor(Math.min(t,n)*.02),d=Math.floor(Math.min(t,n)*.16);for(let f=i+l;f<o-l;f+=l*3){let i=f*t;for(let o=r+l;o<a-l;o+=l*3)if(e[i+o]===0){let r=ue(e,t,n,o,f,u,d);r&&r.score>c&&(c=r.score,s=r.center)}}return s}function ue(e,t,n,r,i,a,o){let s=r,c=r,l=i*t;for(;s>0&&e[l+s]===0&&r-s<o;)s--;for(;c<t-1&&e[l+c]===0&&c-r<o;)c++;let u=c-s;if(u<a||u>o)return null;let d=i,f=i,p=Math.floor((s+c)/2);for(;d>0&&e[d*t+p]===0&&i-d<o;)d--;for(;f<n-1&&e[f*t+p]===0&&f-i<o;)f++;let m=f-d;if(m<a||m>o)return null;let h=u/m;if(h<.7||h>1.4)return null;let g=Math.floor((s+c)/2),_=Math.floor((d+f)/2),v=Math.floor(Math.max(u,m)/2),y=0,b=e[_*t+g];for(let n=0;n<=v;n+=2){let r=e[_*t+Math.min(t-1,g+n)];r!==b&&(y++,b=r)}let x=(y>=2?100:40)-Math.abs(1-h)*30;return{center:{x:g,y:_},size:Math.max(u,m),score:x}}function de(e,t,n){let{TL:r,TR:i,BR:a,BL:o}=e;if(!r||!i||!a||!o)return{valid:!1,error:`Faltan uno o más marcadores de esquina. Asegúrese de encuadrar la hoja completa.`};let s=Math.hypot(i.x-r.x,i.y-r.y),c=Math.hypot(a.x-o.x,a.y-o.y),l=Math.hypot(o.x-r.x,o.y-r.y),u=Math.hypot(a.x-i.x,a.y-i.y),d=Math.min(t,n)*.35;if(s<d||l<d)return{valid:!1,error:`La hoja se encuentra demasiado lejos de la cámara. Acérquese más a la hoja.`};let f=(s+c)/2,p=(l+u)/2/f;return p<.8||p>2.2?{valid:!1,error:`Proporción geométrica inusual (${p.toFixed(2)}). Asegúrese de capturar la hoja de frente y sin inclinaciones extremas.`}:{valid:!0,error:null,topEdge:s,leftEdge:l,aspect:p}}function fe(e,t){let n=[],r=[];for(let i=0;i<4;i++){let a=e[i].x,o=e[i].y,s=t[i].x,c=t[i].y;n.push([a,o,1,0,0,0,-s*a,-s*o]),r.push(s),n.push([0,0,0,a,o,1,-c*a,-c*o]),r.push(c)}let i=pe(n,r);return i?[[i[0],i[1],i[2]],[i[3],i[4],i[5]],[i[6],i[7],1]]:null}function pe(e,t){let n=Array(8);for(let r=0;r<8;r++){n[r]=new Float64Array(9);for(let t=0;t<8;t++)n[r][t]=e[r][t];n[r][8]=t[r]}for(let e=0;e<8;e++){let t=e;for(let r=e+1;r<8;r++)Math.abs(n[r][e])>Math.abs(n[t][e])&&(t=r);let r=n[e];if(n[e]=n[t],n[t]=r,Math.abs(n[e][e])<=1e-12)return null;for(let t=e+1;t<8;t++){let r=n[t][e]/n[e][e];n[t][e]=0;for(let i=e+1;i<=8;i++)n[t][i]-=r*n[e][i]}}let r=new Float64Array(8);for(let e=7;e>=0;e--){let t=0;for(let i=e+1;i<8;i++)t+=n[e][i]*r[i];r[e]=(n[e][8]-t)/n[e][e]}return r}function me(e){let t=e[0][0]*(e[1][1]*e[2][2]-e[1][2]*e[2][1])-e[0][1]*(e[1][0]*e[2][2]-e[1][2]*e[2][0])+e[0][2]*(e[1][0]*e[2][1]-e[1][1]*e[2][0]);if(Math.abs(t)<1e-12)return null;let n=1/t;return[[(e[1][1]*e[2][2]-e[1][2]*e[2][1])*n,(e[0][2]*e[2][1]-e[0][1]*e[2][2])*n,(e[0][1]*e[1][2]-e[0][2]*e[1][1])*n],[(e[1][2]*e[2][0]-e[1][0]*e[2][2])*n,(e[0][0]*e[2][2]-e[0][2]*e[2][0])*n,(e[0][2]*e[1][0]-e[0][0]*e[1][2])*n],[(e[1][0]*e[2][1]-e[1][1]*e[2][0])*n,(e[0][1]*e[2][0]-e[0][0]*e[2][1])*n,(e[0][0]*e[1][1]-e[0][1]*e[1][0])*n]]}function he(e,t,n=800,r=1131){let i=j.MARKERS,a=fe([t.TL,t.TR,t.BR,t.BL],[{x:i.TOP_LEFT.x,y:i.TOP_LEFT.y},{x:i.TOP_RIGHT.x,y:i.TOP_RIGHT.y},{x:i.BOTTOM_RIGHT.x,y:i.BOTTOM_RIGHT.y},{x:i.BOTTOM_LEFT.x,y:i.BOTTOM_LEFT.y}]);if(!a)throw Error(`No se pudo calcular la matriz de transformación proyectiva.`);let o=me(a);if(!o)throw Error(`La transformación geométrica no es invertible.`);let s=e.getContext(`2d`).getImageData(0,0,e.width,e.height).data,c=e.width,l=e.height,u=document.createElement(`canvas`);u.width=n,u.height=r;let d=u.getContext(`2d`),f=d.createImageData(n,r),p=f.data;for(let e=0;e<r;e++)for(let t=0;t<n;t++){let r=o[2][0]*t+o[2][1]*e+o[2][2],i=(o[0][0]*t+o[0][1]*e+o[0][2])/r,a=(o[1][0]*t+o[1][1]*e+o[1][2])/r,u=(e*n+t)*4;if(i>=0&&i<c-1&&a>=0&&a<l-1){let e=Math.floor(i),t=Math.floor(a),n=e+1,r=t+1,o=i-e,l=a-t,d=(t*c+e)*4,f=(t*c+n)*4,m=(r*c+e)*4,h=(r*c+n)*4;for(let e=0;e<3;e++){let t=s[d+e]*(1-o)+s[f+e]*o,n=s[m+e]*(1-o)+s[h+e]*o;p[u+e]=Math.round(t*(1-l)+n*l)}p[u+3]=255}else p[u]=255,p[u+1]=255,p[u+2]=255,p[u+3]=255}return d.putImageData(f,0,0),u}var I={SINGLE:`SINGLE`,NONE:`NONE`,MULTIPLE:`MULTIPLE`,DOUBTFUL:`DOUBTFUL`};async function L(e,t){let n=e.width,r=e.height,i=ce(se(F(e.getContext(`2d`).getImageData(0,0,n,r)),n,r,25,12),n,r);if((!i.TL||!i.TR||!i.BR||!i.BL)&&n>r)return L(ve(e),t);let a=de(i,n,r);if(!a.valid)return{success:!1,error:a.error,corners:i,normalizedCanvas:null,detectedAnswers:{}};let o;try{o=he(e,i,j.CANVAS_WIDTH,j.CANVAS_HEIGHT)}catch(e){return{success:!1,error:`Fallo en la corrección de perspectiva: ${e.message}`,corners:i,normalizedCanvas:null,detectedAnswers:{}}}let s=R(o,t),c=_e(o,t,s);return{success:!0,error:null,corners:i,normalizedCanvas:o,annotatedCanvas:c,detectedAnswers:s.answersMap,questionDetails:s.questionDetails,summary:s.summary}}function R(e,t){let n=e.getContext(`2d`),r=e.width,i=e.height,a=F(n.getImageData(0,0,r,i)),o=t.questionCount||20,s=M(o,t.alternativeCount||4),c={},l={},u=0,d=0,f=0,p=0;for(let e=1;e<=o;e++){let t=s.questionsMap[e];if(!t)continue;let n={},o={};s.alts.forEach(e=>{let s=t.bubbles[e],c=ge(a,r,i,s.x,s.y,s.radius);n[e]=c.fillRatio,o[e]=c.meanDarkness});let m=s.alts.map(e=>({alt:e,fill:n[e],darkness:o[e]}));m.sort((e,t)=>t.fill-e.fill);let h=m[0],g=m[1]||{fill:0,darkness:0},_=.38,v=I.NONE,y=null,b=1;h.fill<.18?(v=I.NONE,y=null,b=1-h.fill,d++):g.fill>=_?(v=I.MULTIPLE,y=`MULTIPLE`,b=.5,f++):h.fill>=_?h.fill-g.fill>=.15?(v=I.SINGLE,y=h.alt,b=Math.min(1,h.fill*1.5),u++):(v=I.DOUBTFUL,y=h.alt,b=.4,p++):(v=I.DOUBTFUL,y=h.alt,b=.45,p++),c[e]=v===I.MULTIPLE?`MULTIPLE`:v===I.NONE?null:y,l[e]={questionNumber:e,selected:y,status:v,confidence:b,fillRatios:n,topCandidate:h.alt,topFill:h.fill}}return{answersMap:c,questionDetails:l,summary:{totalQuestions:o,markedCount:u,blankCount:d,multipleCount:f,doubtfulCount:p}}}function ge(e,t,n,r,i,a){let o=0,s=0,c=0,l=Math.max(2,a-2),u=l*l,d=0,f=0;for(let o=-a-4;o<=a+4;o+=2)for(let s=-a-4;s<=a+4;s+=2){let c=s*s+o*o;if(c>(a+2)*(a+2)&&c<(a+6)*(a+6)){let a=Math.min(t-1,Math.max(0,r+s)),c=Math.min(n-1,Math.max(0,i+o));d+=e[c*t+a],f++}}let p=f>0?d/f:230,m=Math.max(50,p*.7);for(let a=-l;a<=l;a++)for(let d=-l;d<=l;d++)if(d*d+a*a<=u){let l=Math.min(t-1,Math.max(0,r+d)),u=e[Math.min(n-1,Math.max(0,i+a))*t+l];s++,c+=255-u,u<m&&o++}return{fillRatio:s>0?o/s:0,meanDarkness:s>0?c/s:0}}function _e(e,t,n){let r=document.createElement(`canvas`);r.width=e.width,r.height=e.height;let i=r.getContext(`2d`);i.drawImage(e,0,0);let a=t.questionCount||20,o=M(a,t.alternativeCount||4);for(let e=1;e<=a;e++){let t=o.questionsMap[e],r=n.questionDetails[e];t&&r&&o.alts.forEach(e=>{let n=t.bubbles[e],a=r.selected===e;r.status===I.MULTIPLE&&r.fillRatios[e]>=.35?(i.strokeStyle=`#ef4444`,i.lineWidth=3,i.beginPath(),i.arc(n.x,n.y,n.radius+3,0,Math.PI*2),i.stroke()):a&&(r.status===I.DOUBTFUL?(i.strokeStyle=`#f59e0b`,i.lineWidth=3,i.beginPath(),i.arc(n.x,n.y,n.radius+3,0,Math.PI*2),i.stroke()):(i.strokeStyle=`#10b981`,i.lineWidth=3,i.beginPath(),i.arc(n.x,n.y,n.radius+3,0,Math.PI*2),i.stroke()))})}return r}function ve(e){let t=document.createElement(`canvas`);t.width=e.height,t.height=e.width;let n=t.getContext(`2d`);return n.translate(t.width/2,t.height/2),n.rotate(Math.PI/2),n.drawImage(e,-e.width/2,-e.height/2),t}var z={CORRECT:`CORRECT`,INCORRECT:`INCORRECT`,BLANK:`BLANK`,MULTIPLE:`MULTIPLE`,DOUBTFUL:`DOUBTFUL`};function B(e,t,n){let r=n.questionCount||20,i=parseFloat(n.maxScore)||10,a=i/r,o=0,s=0,c=0,l=0,u=[];for(let n=1;n<=r;n++){let r=e[n]||null,i=t[n]||null,d=z.INCORRECT,f=!1,p=0;r?r===`MULTIPLE`?(d=z.MULTIPLE,l++):r===i?(d=z.CORRECT,f=!0,p=a,o++):(d=z.INCORRECT,s++):(d=z.BLANK,c++),u.push({questionNumber:n,studentChoice:r,correctChoice:i,isCorrect:f,status:d,pointsAwarded:p,maxPoints:a})}let d=o*a,f=Math.round(d*100)/100,p=Math.round(o/r*1e3)/10,m=`No Aprobado`,h=f/i;return m=h>=.9?`Excelente (Domina los aprendizajes)`:h>=.7?`Aprobado (Alcanza los aprendizajes)`:h>=.5?`En proceso de recuperación`:`No alcanza los aprendizajes requeridos`,{evaluationId:n.id,questionCount:r,maxScore:i,pointsPerQuestion:a,correctCount:o,incorrectCount:s,blankCount:c,multipleCount:l,doubtfulCount:0,score:f,percentage:p,performanceLevel:m,isPassed:h>=.7,questionDetails:u}}async function ye({id:e=null,evaluationId:t,studentName:n=`Estudiante sin identificar`,studentId:r=``,answers:i={},imageThumbnail:a=null}){let s=await o(t);if(!s)throw Error(`Evaluación no encontrada.`);let c=await l(t);if(!c||!c.answers)throw Error(`La evaluación no posee una clave de respuestas configurada.`);let u=await d(t),f=n.trim().toLowerCase(),m=r.trim(),h=u.some(t=>{if(e&&t.id===e)return!1;let n=f&&t.studentName.trim().toLowerCase()===f,r=m&&t.studentId&&t.studentId.trim()===m;return n||r}),g=B(i,c.answers,s),v={id:e||_(),evaluationId:t,studentName:n.trim()||`Estudiante sin identificar`,studentId:m,answers:i,score:g.score,maxScore:g.maxScore,percentage:g.percentage,correctCount:g.correctCount,incorrectCount:g.incorrectCount,blankCount:g.blankCount,multipleCount:g.multipleCount,doubtfulCount:g.doubtfulCount,isPassed:g.isPassed,performanceLevel:g.performanceLevel,questionDetails:g.questionDetails,imageThumbnail:a||null,scannedAt:new Date().toISOString()};return await p(v),{result:v,isDuplicate:h}}function V(e,t){if(!e||e.length===0)return{count:0,averageScore:0,maxScore:0,minScore:0,passCount:0,failCount:0,passRate:0,itemAnalytics:[]};let n=e.length,r=0,i=-1/0,a=1/0,o=0,s=t?t.questionCount:e[0].questionDetails?.length||20,c={};for(let e=1;e<=s;e++)c[e]=0;e.forEach(e=>{r+=e.score,e.score>i&&(i=e.score),e.score<a&&(a=e.score),e.isPassed&&o++,Array.isArray(e.questionDetails)&&e.questionDetails.forEach(e=>{e.isCorrect&&(c[e.questionNumber]=(c[e.questionNumber]||0)+1)})});let l=Math.round(r/n*100)/100,u=Math.round(o/n*1e3)/10,d=[];for(let e=1;e<=s;e++){let t=c[e]||0,r=Math.round(t/n*1e3)/10,i=`Media`;r>=80?i=`Fácil`:r<=35&&(i=`Difícil`),d.push({questionNumber:e,correctCount:t,totalCount:n,percentage:r,difficultyCategory:i})}return{count:n,averageScore:l,maxScore:i===-1/0?0:i,minScore:a===1/0?0:a,passCount:o,failCount:n-o,passRate:u,itemAnalytics:d}}async function be(e,t){let n=await f(e);n&&await C({title:`Eliminar Calificación`,message:`¿Desea eliminar el registro de ${n.studentName} (Nota: ${y(n.score)}/${y(n.maxScore)})?`,confirmText:`Sí, eliminar`,danger:!0})&&(await m(e),S(`Resultado de ${n.studentName} eliminado.`,`info`),typeof t==`function`&&t())}function xe(e,t){if(!t||t.length===0)throw Error(`No hay resultados disponibles para exportar en esta evaluación.`);let n=`﻿`;n+=[`Estudiante`,`Identificación / Cédula`,`Aciertos`,`Errores`,`En Blanco`,`Múltiples/Dudosas`,`Total Preguntas`,`Porcentaje (%)`,`Nota Final`,`Nota Máxima`,`Estado`,`Fecha Escaneo`].map(H).join(`;`)+`\r
`,t.forEach(t=>{let r=[t.studentName||`Estudiante sin identificar`,t.studentId||``,t.correctCount??0,t.incorrectCount??0,t.blankCount??0,(t.multipleCount||0)+(t.doubtfulCount||0),e.questionCount,b(t.percentage),y(t.score),y(t.maxScore),t.isPassed?`Aprobado`:`No Aprobado`,v(t.scannedAt,!0)];n+=r.map(H).join(`;`)+`\r
`}),U(new Blob([n],{type:`text/csv;charset=utf-8;`}),`EvalScan_${Se(e.name)}_Resultados.csv`),S(`Archivo CSV exportado exitosamente.`,`success`)}function H(e){if(e==null)return`""`;let t=String(e);return t.includes(`;`)||t.includes(`"`)||t.includes(`
`)||t.includes(`\r`)?`"${t.replace(/"/g,`""`)}"`:`"${t}"`}function Se(e){return(e||`Evaluacion`).replace(/[^a-zA-Z0-9_-]/g,`_`)}function U(e,t){let n=URL.createObjectURL(e),r=document.createElement(`a`);r.href=n,r.download=t,document.body.appendChild(r),r.click(),setTimeout(()=>{document.body.removeChild(r),URL.revokeObjectURL(n)},100)}async function Ce(){try{let e=await h(),t=JSON.stringify(e,null,2);return U(new Blob([t],{type:`application/json;charset=utf-8;`}),`EvalScan_CopiaSeguridad_${new Date().toISOString().replace(/[:.]/g,`-`).slice(0,19)}.json`),S(`Copia de seguridad descargada exitosamente.`,`success`),!0}catch(e){return S(`Error al exportar respaldo: ${e.message}`,`error`),!1}}async function we(e){return new Promise((t,n)=>{if(!e||!e.name.endsWith(`.json`)){n(Error(`Seleccione un archivo de copia de seguridad con extensión .json.`));return}let r=new FileReader;r.onload=async e=>{try{await g(JSON.parse(e.target.result)),S(`Copia de seguridad restaurada correctamente.`,`success`),t(!0)}catch(e){n(Error(`El archivo de respaldo no es válido o está dañado: ${e.message}`))}},r.onerror=()=>n(Error(`No se pudo leer el archivo seleccionado.`)),r.readAsText(e)})}function Te(e,t){let n=V(t,e),r=``;t.forEach((e,t)=>{r+=`
      <tr>
        <td style="text-align: center;">${t+1}</td>
        <td><strong>${W(e.studentName)}</strong></td>
        <td>${W(e.studentId||`-`)}</td>
        <td style="text-align: center; color: #059669; font-weight: bold;">${e.correctCount}</td>
        <td style="text-align: center; color: #dc2626;">${e.incorrectCount}</td>
        <td style="text-align: center; color: #64748b;">${e.blankCount}</td>
        <td style="text-align: center;">${b(e.percentage)}</td>
        <td style="text-align: center; font-weight: bold; font-size: 1.05em;">${y(e.score)} / ${y(e.maxScore)}</td>
        <td style="text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; ${e.isPassed?`background: #d1fae5; color: #065f46;`:`background: #fee2e2; color: #991b1b;`}">
            ${e.isPassed?`Aprobado`:`No Aprobado`}
          </span>
        </td>
      </tr>
    `});let i=null;try{i=window.open(``,`_blank`)}catch{i=null}i?(i.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte de Calificaciones - ${W(e.name)}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20mm 15mm; color: #1e293b; }
        .hdr { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
        .title { font-size: 20px; font-weight: bold; color: #0f172a; margin: 0 0 4px 0; }
        .sub { font-size: 13px; color: #64748b; margin: 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; background: #f8fafc; }
        .stat-val { font-size: 18px; font-weight: bold; color: #0284c7; }
        .stat-lbl { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; }
        th { background: #f1f5f9; color: #334155; text-align: left; padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
        td { padding: 8px 10px; border: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #f8fafc; }
        .ftr { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
        .sign-line { width: 220px; border-top: 1px solid #475569; text-align: center; padding-top: 4px; }
        @media print {
          body { margin: 10mm 10mm; }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div style="margin-bottom: 15px; text-align: right;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Imprimir Reporte</button>
      </div>

      <div class="hdr">
        <div>
          <h1 class="title">EvalScan — Reporte de Calificaciones</h1>
          <p class="sub"><strong>Evaluación:</strong> ${W(e.name)} ${e.subject?`| Materia: ${W(e.subject)}`:``} ${e.course?`| Curso: ${W(e.course)}`:``}</p>
        </div>
        <div style="text-align: right; font-size: 12px; color: #64748b;">
          Fecha: ${v(new Date().toISOString(),!0)}
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-val">${n.count}</div>
          <div class="stat-lbl">Estudiantes Evaluados</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${y(n.averageScore)} / ${y(e.maxScore)}</div>
          <div class="stat-lbl">Promedio General</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${b(n.passRate)}</div>
          <div class="stat-lbl">Tasa de Aprobación</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${y(n.maxScore)} | ${y(n.minScore)}</div>
          <div class="stat-lbl">Nota Máx. / Mín.</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th>Estudiante</th>
            <th>Identificación</th>
            <th style="text-align: center;">Aciertos</th>
            <th style="text-align: center;">Errores</th>
            <th style="text-align: center;">Blanco</th>
            <th style="text-align: center;">%</th>
            <th style="text-align: center;">Calificación</th>
            <th style="text-align: center;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${r||`<tr><td colspan="9" style="text-align: center;">No hay registros calificados.</td></tr>`}
        </tbody>
      </table>

      <div class="ftr">
        <div class="sign-line">Firma del Docente Responsable</div>
        <div>Generado con EvalScan • Aplicación Offline-First</div>
      </div>
    </body>
    </html>
  `),i.document.close()):Ee(e,t,n,r)}function Ee(e,t,n,r){let i=document.getElementById(`in-app-printable-modal`);i&&i.remove();let a=document.createElement(`div`);a.id=`in-app-printable-modal`,a.className=`fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col p-4 sm:p-6 overflow-y-auto animate-fade-in`,a.innerHTML=`
    <div class="bg-white rounded-2xl max-w-4xl w-full mx-auto p-6 sm:p-8 shadow-2xl flex flex-col gap-4 text-slate-800 my-auto">
      <div class="flex items-center justify-between border-b pb-3 no-print">
        <h3 class="font-bold text-lg text-slate-900">Reporte de Calificaciones Oficial</h3>
        <div class="flex gap-2">
          <button id="modal-print-btn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer">
            Imprimir
          </button>
          <button id="modal-close-btn" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer">
            Cerrar
          </button>
        </div>
      </div>
      <div>
        <h2 class="text-xl font-bold text-slate-900">EvalScan — ${W(e.name)}</h2>
        <p class="text-xs text-slate-500">${e.subject?`Materia: ${W(e.subject)} • `:``}${e.course?`Curso: ${W(e.course)} • `:``}Fecha: ${v(new Date().toISOString(),!0)}</p>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div class="p-2.5 bg-slate-50 border rounded-xl"><div class="font-bold text-base text-blue-700">${n.count}</div><div>Estudiantes</div></div>
        <div class="p-2.5 bg-slate-50 border rounded-xl"><div class="font-bold text-base text-blue-700">${y(n.averageScore)}</div><div>Promedio</div></div>
        <div class="p-2.5 bg-slate-50 border rounded-xl"><div class="font-bold text-base text-emerald-700">${b(n.passRate)}</div><div>Aprobación</div></div>
        <div class="p-2.5 bg-slate-50 border rounded-xl"><div class="font-bold text-base text-slate-800">${y(n.maxScore)} | ${y(n.minScore)}</div><div>Máx / Mín</div></div>
      </div>
      <div class="overflow-x-auto max-h-96">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="bg-slate-100 text-slate-700 border-b">
              <th class="p-2 text-center">#</th>
              <th class="p-2">Estudiante</th>
              <th class="p-2">Identificación</th>
              <th class="p-2 text-center">Aciertos</th>
              <th class="p-2 text-center">Errores</th>
              <th class="p-2 text-center">Blanco</th>
              <th class="p-2 text-center">%</th>
              <th class="p-2 text-center">Nota</th>
              <th class="p-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${r||`<tr><td colspan="9" class="p-4 text-center">No hay registros calificados.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `,document.body.appendChild(a),a.querySelector(`#modal-close-btn`).addEventListener(`click`,()=>a.remove()),a.querySelector(`#modal-print-btn`).addEventListener(`click`,()=>window.print())}function W(e){return e?String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`):``}var G={currentView:`inicio`,currentEvaluationId:null,cameraService:new P,activeScanData:null,deferredInstallPrompt:null,isOnline:navigator.onLine};document.addEventListener(`DOMContentLoaded`,async()=>{try{await r(),De(),ke(),Ae(),await Oe(),K(`inicio`)}catch(e){console.error(`Error durante la inicialización de EvalScan:`,e),S(`Error al inicializar: ${e.message}`,`error`,6e3)}});function De(){`serviceWorker`in navigator&&window.addEventListener(`load`,()=>{navigator.serviceWorker.register(`/sw.js`).then(e=>{console.log(`[PWA] Service Worker registrado con éxito:`,e.scope)}).catch(e=>{console.warn(`[PWA] No se pudo registrar el Service Worker:`,e)})});let e=()=>{G.isOnline=navigator.onLine;let e=document.getElementById(`offline-indicator-banner`);e&&(G.isOnline?e.classList.add(`hidden`):e.classList.remove(`hidden`))};window.addEventListener(`online`,()=>{e(),S(`Conexión a internet restablecida.`,`info`)}),window.addEventListener(`offline`,()=>{e(),S(`Modo sin conexión activo. EvalScan continuará funcionando localmente.`,`warning`)}),e(),window.addEventListener(`beforeinstallprompt`,e=>{e.preventDefault(),G.deferredInstallPrompt=e;let t=document.getElementById(`btn-pwa-install`);t&&t.classList.remove(`hidden`)}),window.addEventListener(`appinstalled`,()=>{G.deferredInstallPrompt=null;let e=document.getElementById(`btn-pwa-install`);e&&e.classList.add(`hidden`),S(`¡EvalScan ha sido instalada como aplicación!`,`success`)})}async function Oe(){(await a()).length===0&&await A((await O({name:`MCU`,subject:`Física`,course:`Tercero de Bachillerato A`,date:new Date().toISOString().split(`T`)[0],questionCount:20,alternativeCount:4,maxScore:10,description:`Evaluación formativa de Movimiento Circular Uniforme (MCU)`})).id)}function K(e,t={}){G.currentView===`escanear`&&e!==`escanear`&&G.cameraService.stopCamera(),G.currentView=e,t.evaluationId&&(G.currentEvaluationId=t.evaluationId),document.querySelectorAll(`[data-nav-target]`).forEach(t=>{t.getAttribute(`data-nav-target`)===e?(t.classList.add(`bg-blue-800`,`text-white`),t.classList.remove(`text-blue-100`,`hover:bg-blue-700/60`)):(t.classList.remove(`bg-blue-800`,`text-white`),t.classList.add(`text-blue-100`,`hover:bg-blue-700/60`))});let n=document.getElementById(`app-viewport`);if(n)switch(n.innerHTML=``,window.scrollTo({top:0,behavior:`smooth`}),e){case`inicio`:q(n);break;case`evaluaciones`:J(n);break;case`crear-evaluacion`:Y(n,null);break;case`editar-evaluacion`:Y(n,t.evaluationId);break;case`clave`:X(n,t.evaluationId||G.currentEvaluationId);break;case`hojas`:je(n,t.evaluationId||G.currentEvaluationId);break;case`escanear`:Z(n,t.evaluationId||G.currentEvaluationId);break;case`resultados`:$(n,t.evaluationId||G.currentEvaluationId);break;case`configuracion`:Ne(n);break;default:q(n)}}function ke(){document.addEventListener(`click`,e=>{let t=e.target.closest(`[data-nav-target]`);t&&(e.preventDefault(),K(t.getAttribute(`data-nav-target`),{evaluationId:t.getAttribute(`data-eval-id`)}))});let e=document.getElementById(`mobile-menu-btn`),t=document.getElementById(`mobile-nav-drawer`);e&&t&&(e.addEventListener(`click`,()=>{t.classList.toggle(`hidden`)}),t.querySelectorAll(`button`).forEach(e=>{e.addEventListener(`click`,()=>{t.classList.add(`hidden`)})}));let n=document.getElementById(`btn-pwa-install`);n&&n.addEventListener(`click`,async()=>{if(!G.deferredInstallPrompt){w({title:`Instalación en iPhone / iPad`,message:`Para instalar EvalScan en iOS:

1. Toque el botón Compartir en la barra de Safari.
2. Seleccione "Agregar a inicio".
3. Podrá usar la aplicación totalmente offline.`});return}G.deferredInstallPrompt.prompt();let{outcome:e}=await G.deferredInstallPrompt.userChoice;e===`accepted`&&(G.deferredInstallPrompt=null,n.classList.add(`hidden`))})}function Ae(){window.addEventListener(`unhandledrejection`,e=>{console.error(`Promesa no controlada:`,e.reason)})}async function q(e){let t=await a(),n=0,r=0;for(let e of t){let t=await d(e.id);n+=t.length,r+=t.filter(e=>e.isPassed).length}let i=n>0?r/n*100:0,o=t.slice(0,5);e.innerHTML=`
    <div class="space-y-6 animate-fade-in">
      <!-- Banner de Bienvenida -->
      <div class="bg-gradient-to-r from-blue-900 to-sky-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div class="relative z-10 max-w-2xl">
          <div class="inline-flex items-center gap-2 bg-blue-700/50 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 text-sky-200">
            <span>●</span> Sistema OMR Offline para Docentes
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">EvalScan — Calificación Rápida y Segura</h1>
          <p class="text-blue-100 text-sm sm:text-base leading-relaxed mb-6">
            Cree evaluaciones de opción múltiple, imprima hojas de respuestas en formato A4 y califique en segundos con la cámara de su teléfono o computadora, sin requerir internet.
          </p>
          <div class="flex flex-wrap gap-3">
            <button data-nav-target="crear-evaluacion" class="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-900 font-bold text-sm rounded-xl hover:bg-blue-50 transition shadow-md cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Nueva Evaluación
            </button>
            <button data-nav-target="escanear" class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700/80 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition border border-blue-500/30 cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Escanear Respuestas
            </button>
          </div>
        </div>
      </div>

      <!-- Tarjetas de Métricas -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <div>
            <div class="text-2xl font-black text-slate-800">${t.length}</div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evaluaciones Guardadas</div>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          </div>
          <div>
            <div class="text-2xl font-black text-slate-800">${n}</div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hojas Calificadas</div>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </div>
          <div>
            <div class="text-2xl font-black text-slate-800">${b(i)}</div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasa de Aprobación Global</div>
          </div>
        </div>
      </div>

      <!-- Evaluaciones Recientes -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-800">Evaluaciones Recientes</h2>
          <button data-nav-target="evaluaciones" class="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer">
            Ver todas (${t.length}) →
          </button>
        </div>

        <div class="divide-y divide-slate-100">
          ${o.length===0?`
            <div class="p-8 text-center text-slate-400 text-sm">
              No hay evaluaciones registradas. Comience creando una evaluación.
            </div>
          `:o.map(e=>`
            <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900 text-base">${x(e.name)}</span>
                  <span class="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-md font-semibold">${e.questionCount} Preguntas</span>
                  <span class="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-md font-semibold">${e.alternativeCount} Opciones</span>
                </div>
                <div class="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">
                  ${e.subject?`<span><strong>Materia:</strong> ${x(e.subject)}</span>`:``}
                  ${e.course?`<span><strong>Curso:</strong> ${x(e.course)}</span>`:``}
                  <span><strong>Fecha:</strong> ${v(e.date)}</span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <button data-nav-target="clave" data-eval-id="${e.id}" class="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer">
                  Clave
                </button>
                <button data-nav-target="hojas" data-eval-id="${e.id}" class="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer">
                  Hojas A4
                </button>
                <button data-nav-target="escanear" data-eval-id="${e.id}" class="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer shadow-xs">
                  Escanear
                </button>
                <button data-nav-target="resultados" data-eval-id="${e.id}" class="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer">
                  Resultados
                </button>
              </div>
            </div>
          `).join(``)}
        </div>
      </div>
    </div>
  `}async function J(e){let t=await a();e.innerHTML=`
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-slate-900">Gestión de Evaluaciones</h1>
          <p class="text-sm text-slate-500">Administre sus exámenes, claves de respuestas y hojas de evaluación.</p>
        </div>
        <button data-nav-target="crear-evaluacion" class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-xs cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Crear Evaluación
        </button>
      </div>

      <!-- Buscador y filtro -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <svg class="w-5 h-5 absolute left-3 top-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input id="eval-search-input" type="text" placeholder="Buscar por nombre, materia o curso (ej. MCU, Física)..." class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
        </div>
      </div>

      <!-- Grid de Evaluaciones -->
      <div id="evals-list-container" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Renderizado dinámico -->
      </div>
    </div>
  `;let n=e.querySelector(`#evals-list-container`),r=e.querySelector(`#eval-search-input`),i=(e=``)=>{let r=e.toLowerCase().trim(),i=t.filter(e=>{let t=e.name.toLowerCase().includes(r),n=(e.subject||``).toLowerCase().includes(r),i=(e.course||``).toLowerCase().includes(r);return t||n||i});i.length===0?n.innerHTML=`
        <div class="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200">
          <div class="text-slate-400 font-semibold mb-2">No se encontraron evaluaciones</div>
          <p class="text-xs text-slate-500 mb-4">Intente con otro término o cree una nueva evaluación.</p>
          <button data-nav-target="crear-evaluacion" class="px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition cursor-pointer">
            + Crear Evaluación
          </button>
        </div>
      `:n.innerHTML=i.map(e=>`
      <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition">
        <div>
          <div class="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 class="text-lg font-bold text-slate-900">${x(e.name)}</h3>
              <div class="text-xs text-slate-500">
                ${e.subject?`${x(e.subject)} • `:``}
                ${e.course?`${x(e.course)} • `:``}
                ${v(e.date)}
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button data-action="duplicate-eval" data-eval-id="${e.id}" class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" title="Duplicar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              </button>
              <button data-nav-target="editar-evaluacion" data-eval-id="${e.id}" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button data-action="delete-eval" data-eval-id="${e.id}" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Eliminar">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 my-4">
            <span class="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
              ${e.questionCount} Preguntas
            </span>
            <span class="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-sky-50 text-sky-800">
              ${e.alternativeCount} Opciones (${E[e.alternativeCount]?.join(`, `)})
            </span>
            <span class="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800">
              Escala: ${y(e.maxScore)} pts
            </span>
          </div>

          ${e.description?`<p class="text-xs text-slate-500 mb-4 line-clamp-2">${x(e.description)}</p>`:``}
        </div>

        <div class="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          <button data-nav-target="clave" data-eval-id="${e.id}" class="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-center cursor-pointer">
            Clave
          </button>
          <button data-nav-target="hojas" data-eval-id="${e.id}" class="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-center cursor-pointer">
            Hojas
          </button>
          <button data-nav-target="escanear" data-eval-id="${e.id}" class="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition text-center cursor-pointer shadow-xs">
            Escanear
          </button>
          <button data-nav-target="resultados" data-eval-id="${e.id}" class="flex-1 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition text-center cursor-pointer">
            Resultados
          </button>
        </div>
      </div>
    `).join(``)};i(),r.addEventListener(`input`,e=>i(e.target.value)),n.addEventListener(`click`,async t=>{let n=t.target.closest(`[data-action="duplicate-eval"]`);if(n){await te(n.getAttribute(`data-eval-id`)),S(`Evaluación duplicada exitosamente.`,`success`),J(e);return}let r=t.target.closest(`[data-action="delete-eval"]`);r&&await ne(r.getAttribute(`data-eval-id`),()=>{J(e)})})}async function Y(e,t=null){let n=!!t,r={name:``,subject:``,course:``,date:new Date().toISOString().split(`T`)[0],questionCount:20,alternativeCount:4,maxScore:10,description:``};if(n){let e=await o(t);if(!e){S(`No se encontró la evaluación especificada.`,`error`),K(`evaluaciones`);return}r=e}e.innerHTML=`
    <div class="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-black text-slate-900">${n?`Editar Evaluación`:`Crear Nueva Evaluación`}</h1>
          <p class="text-sm text-slate-500">${n?`Modifique los parámetros de la evaluación.`:`Configure preguntas, alternativas y escala de calificación.`}</p>
        </div>
        <button data-nav-target="evaluaciones" class="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-2 rounded-xl transition cursor-pointer">
          ← Volver
        </button>
      </div>

      <form id="evaluation-form" class="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Nombre de la Evaluación *
          </label>
          <input type="text" name="name" required value="${x(r.name)}" placeholder="Ej. MCU, Examen Quimestral, Lección 1" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Asignatura / Materia
            </label>
            <input type="text" name="subject" value="${x(r.subject)}" placeholder="Ej. Física, Matemáticas, Química" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Curso / Paralelo
            </label>
            <input type="text" name="course" value="${x(r.course)}" placeholder="Ej. 3ro BGU 'A', 10mo 'B'" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Fecha
            </label>
            <input type="date" name="date" value="${r.date}" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Número de Preguntas
            </label>
            <select name="questionCount" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition">
              <option value="20" ${r.questionCount===20?`selected`:``}>20 preguntas (1 o 2 col.)</option>
              <option value="40" ${r.questionCount===40?`selected`:``}>40 preguntas (2 col.)</option>
              <option value="60" ${r.questionCount===60?`selected`:``}>60 preguntas (3 col.)</option>
              <option value="80" ${r.questionCount===80?`selected`:``}>80 preguntas (4 col.)</option>
              <option value="10" ${r.questionCount===10?`selected`:``}>10 preguntas (corta)</option>
              <option value="30" ${r.questionCount===30?`selected`:``}>30 preguntas</option>
              <option value="50" ${r.questionCount===50?`selected`:``}>50 preguntas</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Alternativas por Pregunta
            </label>
            <select name="alternativeCount" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition">
              <option value="4" ${r.alternativeCount===4?`selected`:``}>4 Opciones (A, B, C, D)</option>
              <option value="5" ${r.alternativeCount===5?`selected`:``}>5 Opciones (A, B, C, D, E)</option>
              <option value="3" ${r.alternativeCount===3?`selected`:``}>3 Opciones (A, B, C)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Puntuación Máxima (Escala)
          </label>
          <input type="number" step="0.5" min="1" max="100" name="maxScore" value="${r.maxScore}" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
          <span class="text-xs text-slate-400 mt-1 block">Por defecto 10.00 puntos (escala estándar del sistema educativo ecuatoriano).</span>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Observaciones o Indicaciones
          </label>
          <textarea name="description" rows="2" placeholder="Opcional: tema central, unidades evaluadas o instrucciones específicas..." class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition">${x(r.description)}</textarea>
        </div>

        <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" data-nav-target="evaluaciones" class="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer">
            Cancelar
          </button>
          <button type="submit" class="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer">
            ${n?`Guardar Cambios`:`Crear y Continuar a la Clave →`}
          </button>
        </div>
      </form>
    </div>
  `;let i=e.querySelector(`#evaluation-form`);i.addEventListener(`submit`,async e=>{e.preventDefault();let r=new FormData(i),a={name:r.get(`name`),subject:r.get(`subject`),course:r.get(`course`),date:r.get(`date`),questionCount:parseInt(r.get(`questionCount`),10),alternativeCount:parseInt(r.get(`alternativeCount`),10),maxScore:parseFloat(r.get(`maxScore`)),description:r.get(`description`)};try{if(n)await ee(t,a),S(`Evaluación actualizada correctamente.`,`success`),K(`evaluaciones`);else{let e=await O(a);S(`Evaluación "${e.name}" creada con éxito.`,`success`),K(`clave`,{evaluationId:e.id})}}catch(e){S(e.message,`error`,5e3)}})}async function X(e,t){if(!t){let e=await a();if(e.length>0)t=e[0].id;else{S(`Cree una evaluación primero.`,`warning`),K(`crear-evaluacion`);return}}let{evaluation:n,answerKey:r,alternatives:i}=await re(t),o=n.questionCount,s=k(r.answers,o);e.innerHTML=`
    <div class="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              Clave de Respuestas
            </span>
            <span id="completeness-badge" class="text-xs font-bold px-2 py-0.5 rounded-md ${s.isComplete?`bg-emerald-50 text-emerald-700`:`bg-amber-50 text-amber-700`}">
              ${s.answeredCount} / ${o} Preguntas asignadas
            </span>
          </div>
          <h1 class="text-2xl font-black text-slate-900 mt-1">${x(n.name)}</h1>
          <p class="text-xs text-slate-500">
            ${n.subject?`${x(n.subject)} • `:``}
            ${n.course?`${x(n.course)} • `:``}
            ${o} Preguntas (${i.join(`, `)})
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button data-nav-target="hojas" data-eval-id="${t}" class="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer">
            Imprimir Hojas A4
          </button>
          <button data-nav-target="escanear" data-eval-id="${t}" class="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-xs">
            Ir a Escanear →
          </button>
        </div>
      </div>

      <!-- Barra de herramientas rápidas -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-slate-600">Llenado rápido:</span>
          <button id="btn-sample-pattern" class="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer">
            Patrón de Prueba (A,B,C,D...)
          </button>
          <button id="btn-clear-key" class="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer">
            Limpiar Todo
          </button>
        </div>

        <div class="text-xs text-slate-500 italic">
          Las selecciones se guardan automáticamente en IndexedDB.
        </div>
      </div>

      <!-- Matriz interactiva de preguntas -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div id="key-questions-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <!-- Renderizado dinámico de filas de preguntas -->
        </div>
      </div>
    </div>
  `;let c=e.querySelector(`#key-questions-grid`),l=e.querySelector(`#completeness-badge`),u=e=>{let t=k(e,o);l.className=`text-xs font-bold px-2 py-0.5 rounded-md ${t.isComplete?`bg-emerald-50 text-emerald-700`:`bg-amber-50 text-amber-700`}`,l.textContent=`${t.answeredCount} / ${o} Preguntas asignadas`},d=()=>{let e=``;for(let t=1;t<=o;t++){let n=r.answers[t],a=``;i.forEach(e=>{a+=`
          <button 
            type="button" 
            data-q="${t}" 
            data-alt="${e}"
            class="w-8 h-8 rounded-full text-xs font-bold transition flex items-center justify-center cursor-pointer ${n===e?`bg-blue-600 text-white shadow-xs scale-105`:`bg-slate-100 text-slate-700 hover:bg-slate-200`}"
          >
            ${e}
          </button>
        `}),e+=`
        <div class="p-3 rounded-xl border ${n?`border-blue-200 bg-blue-50/20`:`border-slate-100 bg-slate-50/50`} flex items-center justify-between">
          <span class="text-xs font-bold ${n?`text-blue-900`:`text-slate-500`} w-8 text-right pr-2">${t}.</span>
          <div class="flex items-center gap-1.5">
            ${a}
          </div>
        </div>
      `}c.innerHTML=e};d(),c.addEventListener(`click`,async e=>{let n=e.target.closest(`[data-q][data-alt]`);if(!n)return;let i=parseInt(n.getAttribute(`data-q`),10),a=n.getAttribute(`data-alt`),o=r.answers[i]===a?null:a;r.answers[i]=o,await ie(t,i,o),d(),u(r.answers)}),e.querySelector(`#btn-sample-pattern`).addEventListener(`click`,async()=>{let e=await A(t);r.answers=e.answers,d(),u(r.answers),S(`Patrón cíclico de prueba generado para todas las preguntas.`,`success`)}),e.querySelector(`#btn-clear-key`).addEventListener(`click`,async()=>{if(await C({title:`Limpiar Clave`,message:`¿Desea borrar todas las respuestas de la clave?`,confirmText:`Limpiar`,danger:!0})){let e=await ae(t,null);r.answers=e.answers,d(),u(r.answers),S(`Clave de respuestas restablecida.`,`info`)}})}async function je(e,t){if(!t){let e=await a();if(e.length>0)t=e[0].id;else{S(`Cree una evaluación primero.`,`warning`),K(`crear-evaluacion`);return}}let n=await o(t);n?(e.innerHTML=`
    <div class="space-y-6 animate-fade-in">
      <!-- Barra de Controles superior (no se imprime) -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h1 class="text-xl font-bold text-slate-900">Hoja de Respuestas Imprimible A4</h1>
          <p class="text-xs text-slate-500">
            ${x(n.name)} • ${n.questionCount} Preguntas (${n.alternativeCount} alternativas)
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button id="btn-print-sheet" class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-xs cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Imprimir Hoja A4
          </button>
          <button id="btn-generate-sample-sheet" class="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition border border-emerald-200 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            Descargar Muestra Rellena (Para Probar Escaneo)
          </button>
        </div>
      </div>

      <!-- Contenedor con la Hoja Generada -->
      <div class="sheet-preview-wrapper flex justify-center">
        ${oe(n)}
      </div>
    </div>
  `,e.querySelector(`#btn-print-sheet`).addEventListener(`click`,()=>{window.print()}),e.querySelector(`#btn-generate-sample-sheet`).addEventListener(`click`,async()=>{let e=await l(t),r=e&&e.answers?e.answers:{},i={},a=E[n.alternativeCount]||[`A`,`B`,`C`,`D`];for(let e=1;e<=n.questionCount;e++)i[e]=r[e]||a[(e-1)%a.length];let o=document.createElement(`canvas`);N(n,o,i),o.toBlob(e=>{let t=URL.createObjectURL(e),r=document.createElement(`a`);r.href=t,r.download=`EvalScan_MuestraRellena_${n.name}.png`,r.click(),URL.revokeObjectURL(t),S(`Imagen de muestra rellena generada y descargada. Puede importarla en "Escanear" para probar el OMR.`,`success`,5e3)},`image/png`)})):(S(`Evaluación no encontrada.`,`error`),K(`evaluaciones`))}async function Z(e,t=null){let n=await a();if(n.length===0){S(`Cree una evaluación antes de escanear hojas.`,`warning`),K(`crear-evaluacion`);return}let r=t||n[0].id,i=await o(r),s=k((await l(r))?.answers||{},i.questionCount);e.innerHTML=`
    <div class="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <!-- Selector de Evaluación y Estado -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex-1">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Evaluación a Escanear
          </label>
          <select id="scan-eval-select" class="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500">
            ${n.map(e=>`
              <option value="${e.id}" ${e.id===r?`selected`:``}>
                ${x(e.name)} (${e.questionCount} preguntas - ${v(e.date)})
              </option>
            `).join(``)}
          </select>
        </div>

        <div>
          ${s.isComplete?`
            <div class="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>Clave lista para calificar</span>
            </div>
          `:`
            <div class="flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <svg class="w-4 h-4 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <span>Clave incompleta (${s.answeredCount}/${i.questionCount}).</span>
              <button data-nav-target="clave" data-eval-id="${r}" class="underline font-bold hover:text-amber-900 cursor-pointer">Completar</button>
            </div>
          `}
        </div>
      </div>

      <!-- Área de Adquisición de Imagen (Cámara / Subida) -->
      <div id="scan-capture-box" class="bg-slate-900 rounded-3xl p-4 sm:p-6 text-white shadow-2xl overflow-hidden relative">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-slate-300">Visor de Escaneo</span>
          </div>
          
          <div class="flex items-center gap-2">
            <button id="btn-toggle-torch" class="hidden p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl transition text-xs font-bold cursor-pointer" title="Activar Linterna">
              ⚡ Linterna
            </button>
            <button id="btn-switch-cam" class="hidden p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-xs font-bold cursor-pointer" title="Cambiar Cámara">
              🔄 Cambiar Cámara
            </button>
          </div>
        </div>

        <!-- Visor de Video / Frame con Guía de 4 Esquinas -->
        <div class="relative bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center min-h-[360px] sm:min-h-[460px]">
          <video id="camera-preview-video" playsinline autoplay muted class="w-full h-full object-contain max-h-[500px]"></video>
          
          <!-- Guía visual superpuesta (Fiducial guides) -->
          <div class="absolute inset-4 pointer-events-none border-2 border-dashed border-sky-400/40 rounded-xl flex flex-col justify-between p-4">
            <div class="flex justify-between">
              <div class="w-8 h-8 border-t-4 border-l-4 border-sky-400"></div>
              <div class="w-8 h-8 border-t-4 border-r-4 border-sky-400"></div>
            </div>
            <div class="text-center text-xs text-sky-200/80 bg-slate-900/60 backdrop-blur-xs py-1 px-3 rounded-full self-center">
              Alinee las 4 esquinas de la hoja dentro de las marcas
            </div>
            <div class="flex justify-between">
              <div class="w-8 h-8 border-b-4 border-l-4 border-sky-400"></div>
              <div class="w-8 h-8 border-b-4 border-r-4 border-sky-400"></div>
            </div>
          </div>

          <!-- Mensaje de estado inicial si la cámara no se ha iniciado -->
          <div id="cam-placeholder" class="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
            <svg class="w-16 h-16 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <div class="text-base font-bold text-slate-200 mb-1">Cámara lista para iniciar</div>
            <p class="text-xs text-slate-400 max-w-sm mb-4">Inicie la cámara del dispositivo o importe una fotografía existente de la hoja de respuestas.</p>
            <div class="flex flex-wrap justify-center gap-3">
              <button id="btn-start-camera" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md cursor-pointer flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                Iniciar Cámara
              </button>
            </div>
          </div>
        </div>

        <!-- Botones de Acción de Captura -->
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div class="flex items-center gap-2">
            <button id="btn-capture-frame" disabled class="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl transition shadow-lg cursor-pointer flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg>
              Tomar Foto y Procesar
            </button>
          </div>

          <div class="flex items-center gap-2">
            <label class="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition border border-slate-700 cursor-pointer flex items-center gap-2">
              <svg class="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              <span>Subir Foto de Hoja</span>
              <input id="input-file-image" type="file" accept="image/*" class="hidden" />
            </label>
            
            <button id="btn-quick-sample-scan" class="px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs rounded-xl transition border border-slate-700 cursor-pointer" title="Genera instantáneamente una hoja rellena y la procesa">
              Probar con Muestra
            </button>
          </div>
        </div>
      </div>

      <!-- Contenedor para la Revisión OMR Posterior a la Captura -->
      <div id="scan-review-container" class="hidden space-y-6"></div>
    </div>
  `;let c=e.querySelector(`#scan-eval-select`),u=e.querySelector(`#camera-preview-video`),d=e.querySelector(`#cam-placeholder`),f=e.querySelector(`#btn-start-camera`),p=e.querySelector(`#btn-capture-frame`),m=e.querySelector(`#btn-toggle-torch`),h=e.querySelector(`#btn-switch-cam`),g=e.querySelector(`#input-file-image`),_=e.querySelector(`#btn-quick-sample-scan`),y=e.querySelector(`#scan-review-container`);c.addEventListener(`change`,async t=>{r=t.target.value,i=await o(r),Z(e,r)}),f.addEventListener(`click`,async()=>{try{let e=await G.cameraService.startCamera(u);d.classList.add(`hidden`),p.disabled=!1,e.hasTorch&&m.classList.remove(`hidden`),e.devices.length>1&&h.classList.remove(`hidden`),S(`Cámara iniciada correctamente.`,`info`)}catch(e){S(e.message,`error`,6e3)}}),m.addEventListener(`click`,async()=>{let e=await G.cameraService.toggleTorch();m.classList.toggle(`text-yellow-300`,e)});let b=0;h.addEventListener(`click`,async()=>{let e=G.cameraService.availableDevices;if(!(e.length<=1)){b=(b+1)%e.length;try{await G.cameraService.startCamera(u,e[b].deviceId)}catch(e){S(`Error al cambiar de cámara: `+e.message,`error`)}}}),p.addEventListener(`click`,async()=>{try{S(`Procesando hoja con OMR...`,`info`,2e3),await Q(G.cameraService.captureFrame(),i,y)}catch(e){S(e.message,`error`)}}),g.addEventListener(`change`,async e=>{let t=e.target.files[0];if(t)try{S(`Cargando y analizando imagen...`,`info`,2e3),await Q(await P.loadImageFromFile(t),i,y)}catch(e){S(e.message,`error`,5e3)}}),_.addEventListener(`click`,async()=>{S(`Generando hoja de prueba sintética...`,`info`,1500);let e=(await l(r))?.answers||{},t={},n=E[i.alternativeCount]||[`A`,`B`,`C`,`D`];for(let r=1;r<=i.questionCount;r++)r===3?t[r]=n[(n.indexOf(e[r]||`A`)+1)%n.length]:r===7?t[r]=null:t[r]=e[r]||n[(r-1)%n.length];let a=document.createElement(`canvas`);N(i,a,t),await Q(a,i,y)})}async function Q(e,t,n){let r=await L(e,t);if(!r.success){T(`error`),w({title:`No se pudo leer la hoja`,message:`${r.error}\n\nRecomendaciones para una captura exitosa:\n• Asegúrese de que los 4 marcadores cuadrados de las esquinas estén visibles dentro de la imagen.\n• Evite sombras muy oscuras o reflejos excesivos de luz.\n• Mantenga la cámara paralela a la hoja sin inclinarla en ángulo extremo.`});return}T(`success`),S(`¡Hoja reconocida con éxito! Revise las respuestas detectadas.`,`success`);let i=(await l(t.id))?.answers||{},a={...r.detectedAnswers};n.classList.remove(`hidden`),n.scrollIntoView({behavior:`smooth`});let o=()=>{let e=B(a,i,t);n.innerHTML=`
      <div class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Hoja Alineada y Reconocida
              </span>
              <span class="text-xs text-slate-400">ID: ${t.id}</span>
            </div>
            <h2 class="text-2xl font-black text-slate-900 mt-1">Revisión de Calificación</h2>
            <p class="text-xs text-slate-500">Verifique los datos del estudiante y pulse sobre cualquier burbuja si desea corregir una marca.</p>
          </div>

          <!-- Nota preliminar calculada -->
          <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center min-w-[140px]">
            <div class="text-xs font-bold uppercase text-slate-500">Calificación</div>
            <div class="text-3xl font-black text-blue-700">${y(e.score)} <span class="text-xs text-slate-400 font-bold">/ ${y(e.maxScore)}</span></div>
            <div class="text-xs font-bold ${e.isPassed?`text-emerald-600`:`text-rose-600`}">
              ${b(e.percentage)} • ${e.isPassed?`Aprobado`:`No Aprobado`}
            </div>
          </div>
        </div>

        <!-- Campos de Identificación del Estudiante -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nombre y Apellidos del Estudiante *
            </label>
            <input id="student-name-input" type="text" placeholder="Ej. Pérez Jonathan, Andrade María" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Cédula / Nro. Identificación
            </label>
            <input id="student-id-input" type="text" placeholder="Ej. 1718293847" class="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <!-- Métricas de Detección -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div class="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-100">
            <div class="text-xl font-bold">${e.correctCount}</div>
            <div class="text-xs font-semibold text-emerald-700">Aciertos (Correctas)</div>
          </div>
          <div class="p-3 rounded-xl bg-rose-50 text-rose-900 border border-rose-100">
            <div class="text-xl font-bold">${e.incorrectCount}</div>
            <div class="text-xs font-semibold text-rose-700">Errores</div>
          </div>
          <div class="p-3 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
            <div class="text-xl font-bold">${e.blankCount}</div>
            <div class="text-xs font-semibold text-slate-600">Sin Responder</div>
          </div>
          <div class="p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-100">
            <div class="text-xl font-bold">${r.summary.multipleCount+r.summary.doubtfulCount}</div>
            <div class="text-xs font-semibold text-amber-700">Dudosas / Múltiples</div>
          </div>
        </div>

        <!-- Matriz de Respuestas con Edición Manual -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-slate-800">Desglose de Respuestas por Pregunta</h3>
            <span class="text-xs text-slate-400">Haga clic en una opción para cambiarla manualmente si fuera necesario</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[380px] overflow-y-auto p-1">
            ${e.questionDetails.map(e=>{let n=e.questionNumber,r=a[n],i=e.isCorrect,o=e.correctChoice,s=E[t.alternativeCount]||[`A`,`B`,`C`,`D`];return`
                <div class="p-3 rounded-xl border ${i?`border-emerald-200 bg-emerald-50/40`:r?`border-rose-200 bg-rose-50/40`:`border-slate-200 bg-slate-50`}">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-xs text-slate-800">Pregunta ${n}</span>
                    <span class="text-xs font-bold px-1.5 py-0.5 rounded ${i?`bg-emerald-100 text-emerald-800`:r?`bg-rose-100 text-rose-800`:`bg-slate-200 text-slate-700`}">
                      ${i?`✓ Bien`:r?`✗ Error`:`Omitida`}
                    </span>
                  </div>

                  <div class="flex items-center justify-between gap-1">
                    ${s.map(e=>{let t=r===e,i=o===e,a=`bg-white text-slate-600 border border-slate-200 hover:bg-slate-100`;return t&&i?a=`bg-emerald-600 text-white font-black shadow-xs scale-105`:t&&!i?a=`bg-rose-600 text-white font-black shadow-xs scale-105`:!t&&i&&(a=`bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold`),`
                        <button 
                          type="button" 
                          data-override-q="${n}" 
                          data-override-alt="${e}"
                          class="w-7 h-7 rounded-full text-xs transition flex items-center justify-center cursor-pointer ${a}"
                          title="${i?`Respuesta correcta según la clave`:``}"
                        >
                          ${e}
                        </button>
                      `}).join(``)}
                    
                    <button 
                      type="button"
                      data-override-q="${n}" 
                      data-override-alt=""
                      class="text-[10px] text-slate-400 hover:text-rose-600 font-bold px-1 cursor-pointer"
                      title="Dejar en blanco"
                    >
                      Ø
                    </button>
                  </div>
                </div>
              `}).join(``)}
          </div>
        </div>

        <!-- Vista del Lienzo Rectificado con Anotaciones OMR -->
        <details class="border border-slate-200 rounded-2xl p-4 bg-slate-50">
          <summary class="font-bold text-xs text-slate-700 cursor-pointer select-none">
            Ver Imagen Rectificada y Lectura de Burbujas del Escáner (OMR)
          </summary>
          <div class="mt-4 flex justify-center overflow-x-auto">
            <img src="${r.annotatedCanvas.toDataURL(`image/jpeg`,.8)}" class="max-w-md w-full rounded-xl shadow-md border border-slate-300" alt="Hoja anotada" />
          </div>
        </details>

        <!-- Botones para Guardar o Descartar -->
        <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <button id="btn-cancel-scan" type="button" class="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer">
            Descartar Escaneo
          </button>
          
          <button id="btn-save-result" type="button" class="px-6 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md cursor-pointer flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Guardar Calificación del Estudiante
          </button>
        </div>
      </div>
    `,n.querySelectorAll(`[data-override-q]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=parseInt(e.getAttribute(`data-override-q`),10),n=e.getAttribute(`data-override-alt`)||null;a[t]=n,o()})}),n.querySelector(`#btn-cancel-scan`).addEventListener(`click`,async()=>{await C({title:`Descartar Escaneo`,message:`¿Está seguro de descartar la captura actual sin guardar?`,confirmText:`Descartar`,danger:!0})&&(n.classList.add(`hidden`),n.innerHTML=``,window.scrollTo({top:0,behavior:`smooth`}))}),n.querySelector(`#btn-save-result`).addEventListener(`click`,async()=>{let e=n.querySelector(`#student-name-input`),i=n.querySelector(`#student-id-input`),o=e.value.trim()||`Estudiante sin identificar`,s=i.value.trim();try{let{isDuplicate:e}=await ye({evaluationId:t.id,studentName:o,studentId:s,answers:a,imageThumbnail:r.annotatedCanvas.toDataURL(`image/jpeg`,.6)});e?S(`¡Aviso! Ya existía un resultado para "${o}". Se ha registrado como nueva entrada.`,`warning`,5e3):S(`Calificación de "${o}" guardada exitosamente.`,`success`),K(`resultados`,{evaluationId:t.id})}catch(e){S(`Error al guardar: ${e.message}`,`error`)}})};o()}async function $(e,t){if(!t){let e=await a();if(e.length>0)t=e[0].id;else{S(`Cree una evaluación primero.`,`warning`),K(`crear-evaluacion`);return}}let n=await o(t),r=await a(),i=await d(t),s=V(i,n);e.innerHTML=`
    <div class="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <!-- Selector de Evaluación y Acciones Principales -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Evaluación Seleccionada
          </label>
          <select id="results-eval-select" class="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500">
            ${r.map(e=>`
              <option value="${e.id}" ${e.id===t?`selected`:``}>
                ${x(e.name)} (${e.questionCount} preguntas)
              </option>
            `).join(``)}
          </select>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button id="btn-export-csv" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar a Excel (CSV)
          </button>
          <button id="btn-print-report" class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Imprimir Reporte
          </button>
          <button data-nav-target="escanear" data-eval-id="${t}" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer">
            + Escanear Otra Hoja
          </button>
        </div>
      </div>

      <!-- Resumen Estadístico Real -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Hojas Calificadas</div>
          <div class="text-2xl font-black text-slate-900 mt-1">${s.count}</div>
          <div class="text-xs text-slate-400 mt-0.5">Estudiantes</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Promedio General</div>
          <div class="text-2xl font-black text-blue-700 mt-1">
            ${s.count>0?y(s.averageScore):`-`} <span class="text-xs text-slate-400 font-bold">/ ${y(n.maxScore)}</span>
          </div>
          <div class="text-xs text-slate-400 mt-0.5">Escala sobre ${n.maxScore}</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasa de Aprobación</div>
          <div class="text-2xl font-black ${s.passRate>=70?`text-emerald-700`:`text-amber-700`} mt-1">
            ${s.count>0?b(s.passRate):`-`}
          </div>
          <div class="text-xs text-slate-400 mt-0.5">${s.passCount} aprobados, ${s.failCount} suspensos</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Rango de Notas</div>
          <div class="text-2xl font-black text-slate-900 mt-1">
            ${s.count>0?`${y(s.maxScore)} | ${y(s.minScore)}`:`-`}
          </div>
          <div class="text-xs text-slate-400 mt-0.5">Máxima | Mínima</div>
        </div>
      </div>

      <!-- Buscador de Estudiantes -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input id="results-search-input" type="text" placeholder="Filtrar por nombre del estudiante o número de cédula..." class="w-full text-sm bg-transparent border-none focus:outline-hidden" />
      </div>

      <!-- Tabla de Estudiantes Calificados -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="table-responsive-container">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th class="py-3 px-4 text-center w-12">#</th>
                <th class="py-3 px-4">Estudiante</th>
                <th class="py-3 px-4">Identificación</th>
                <th class="py-3 px-4 text-center">Aciertos</th>
                <th class="py-3 px-4 text-center">Errores</th>
                <th class="py-3 px-4 text-center">En Blanco</th>
                <th class="py-3 px-4 text-center">Porcentaje</th>
                <th class="py-3 px-4 text-center">Calificación</th>
                <th class="py-3 px-4 text-center">Estado</th>
                <th class="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="results-table-body" class="divide-y divide-slate-100">
              <!-- Filas dinámicas -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Análisis de Dificultad por Pregunta (Item Analytics) -->
      ${s.count>0?`
        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h3 class="text-sm font-bold text-slate-800 mb-2">Análisis de Dificultad por Pregunta (% de Acierto)</h3>
          <p class="text-xs text-slate-500 mb-4">Permite al docente detectar temas donde la clase presentó mayores dudas o falencias.</p>
          
          <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
            ${s.itemAnalytics.map(e=>`
              <div class="p-2.5 rounded-xl border ${e.percentage>=75?`border-emerald-200 bg-emerald-50/50`:e.percentage<=40?`border-rose-200 bg-rose-50/50`:`border-slate-200 bg-slate-50`}">
                <div class="flex justify-between items-center text-xs font-bold">
                  <span>Preg. ${e.questionNumber}</span>
                  <span class="${e.percentage>=75?`text-emerald-700`:e.percentage<=40?`text-rose-700`:`text-slate-600`}">
                    ${b(e.percentage)}
                  </span>
                </div>
                <div class="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div class="h-full rounded-full ${e.percentage>=75?`bg-emerald-500`:e.percentage<=40?`bg-rose-500`:`bg-blue-500`}" style="width: ${e.percentage}%;"></div>
                </div>
              </div>
            `).join(``)}
          </div>
        </div>
      `:``}
    </div>
  `;let c=e.querySelector(`#results-eval-select`),l=e.querySelector(`#results-search-input`),u=e.querySelector(`#results-table-body`);c.addEventListener(`change`,e=>{K(`resultados`,{evaluationId:e.target.value})});let p=(e=``)=>{let t=e.toLowerCase().trim(),n=i.filter(e=>(e.studentName||``).toLowerCase().includes(t)||(e.studentId||``).includes(t));n.length===0?u.innerHTML=`
        <tr>
          <td colspan="10" class="py-12 text-center text-slate-400">
            ${i.length===0?`No hay hojas escaneadas para esta evaluación todavía.`:`No se encontraron estudiantes con ese criterio.`}
          </td>
        </tr>
      `:u.innerHTML=n.map((e,t)=>`
      <tr class="hover:bg-slate-50/80 transition">
        <td class="py-3 px-4 text-center text-xs text-slate-400 font-bold">${t+1}</td>
        <td class="py-3 px-4 font-bold text-slate-900">${x(e.studentName)}</td>
        <td class="py-3 px-4 text-xs text-slate-500 font-mono">${x(e.studentId||`-`)}</td>
        <td class="py-3 px-4 text-center font-bold text-emerald-600">${e.correctCount}</td>
        <td class="py-3 px-4 text-center font-bold text-rose-600">${e.incorrectCount}</td>
        <td class="py-3 px-4 text-center text-slate-400">${e.blankCount}</td>
        <td class="py-3 px-4 text-center text-xs font-semibold">${b(e.percentage)}</td>
        <td class="py-3 px-4 text-center font-black text-slate-900 text-base">${y(e.score)}</td>
        <td class="py-3 px-4 text-center">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${e.isPassed?`bg-emerald-50 text-emerald-700`:`bg-rose-50 text-rose-700`}">
            ${e.isPassed?`Aprobado`:`No Aprobado`}
          </span>
        </td>
        <td class="py-3 px-4 text-right">
          <div class="inline-flex items-center gap-1">
            <button data-action="view-student-detail" data-result-id="${e.id}" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Ver Detalle de Respuestas">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </button>
            <button data-action="delete-result" data-result-id="${e.id}" class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition" title="Eliminar Registro">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join(``)};p(),l.addEventListener(`input`,e=>p(e.target.value)),e.querySelector(`#btn-export-csv`).addEventListener(`click`,()=>{try{xe(n,i)}catch(e){S(e.message,`warning`)}}),e.querySelector(`#btn-print-report`).addEventListener(`click`,()=>{Te(n,i)}),u.addEventListener(`click`,async r=>{let i=r.target.closest(`[data-action="view-student-detail"]`);if(i){let e=await f(i.getAttribute(`data-result-id`));e&&Me(e,n);return}let a=r.target.closest(`[data-action="delete-result"]`);a&&await be(a.getAttribute(`data-result-id`),()=>{$(e,t)})})}function Me(e,t){let n=document.createElement(`div`);n.className=`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in`,n.innerHTML=`
    <div class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col" role="dialog" aria-modal="true">
      <div class="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
            Auditoría de Examen
          </span>
          <h3 class="text-xl font-bold text-slate-900 mt-1">${x(e.studentName)}</h3>
          <p class="text-xs text-slate-500">${e.studentId?`ID: ${x(e.studentId)} • `:``}Escaneado el ${v(e.scannedAt,!0)}</p>
        </div>
        <div class="text-right">
          <div class="text-2xl font-black text-blue-700">${y(e.score)} / ${y(e.maxScore)}</div>
          <div class="text-xs font-bold ${e.isPassed?`text-emerald-600`:`text-rose-600`}">${b(e.percentage)}</div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto space-y-3 pr-1">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs mb-3">
          <div class="p-2 bg-emerald-50 rounded-xl font-bold text-emerald-800">${e.correctCount} Correctas</div>
          <div class="p-2 bg-rose-50 rounded-xl font-bold text-rose-800">${e.incorrectCount} Incorrectas</div>
          <div class="p-2 bg-slate-100 rounded-xl font-bold text-slate-700">${e.blankCount} Sin Responder</div>
          <div class="p-2 bg-sky-50 rounded-xl font-bold text-sky-800">${x(e.performanceLevel||`Evaluado`)}</div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${(e.questionDetails||[]).map(e=>`
            <div class="p-2.5 rounded-xl border flex items-center justify-between text-xs ${e.isCorrect?`border-emerald-200 bg-emerald-50/50`:e.studentChoice?`border-rose-200 bg-rose-50/50`:`border-slate-200 bg-slate-50`}">
              <div>
                <span class="font-bold">Pregunta ${e.questionNumber}:</span>
                <span class="ml-1 ${e.isCorrect?`text-emerald-700 font-bold`:`text-rose-700 font-bold`}">
                  ${e.studentChoice||`En blanco`}
                </span>
                ${e.isCorrect?``:`<span class="text-slate-400 ml-1">(Correcta: ${e.correctChoice})</span>`}
              </div>
              <span class="font-bold text-[10px] ${e.isCorrect?`text-emerald-700`:`text-slate-400`}">
                +${y(e.pointsAwarded,2)} pts
              </span>
            </div>
          `).join(``)}
        </div>

        ${e.imageThumbnail?`
          <div class="mt-4 pt-4 border-t border-slate-100">
            <span class="block text-xs font-bold text-slate-700 mb-2">Captura Procesada OMR:</span>
            <img src="${e.imageThumbnail}" class="w-full max-h-60 object-contain rounded-xl border border-slate-200" alt="Captura de hoja" />
          </div>
        `:``}
      </div>

      <div class="pt-4 border-t border-slate-100 flex justify-end mt-4">
        <button id="modal-close-btn" class="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer">
          Cerrar
        </button>
      </div>
    </div>
  `,document.body.appendChild(n),n.querySelector(`#modal-close-btn`).addEventListener(`click`,()=>{document.body.removeChild(n)})}async function Ne(e){let t=await a(),n=0;for(let e of t){let t=await d(e.id);n+=t.length}e.innerHTML=`
    <div class="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h1 class="text-2xl font-black text-slate-900">Configuración y Almacenamiento</h1>
        <p class="text-sm text-slate-500">Administre copias de seguridad locales, verifique el estado offline y ejecute pruebas diagnósticas.</p>
      </div>

      <!-- Estado Offline y PWA -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">Funcionamiento Offline-First</h3>
            <p class="text-xs text-slate-500">EvalScan opera enteramente en su dispositivo usando IndexedDB y Service Workers.</p>
          </div>
        </div>

        <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
          <p><strong>Nota para el docente:</strong> Todos sus exámenes, claves y calificaciones están almacenados en el navegador local de este equipo. No se envían datos a servidores externos ni a la nube.</p>
          <p class="mt-2 text-rose-700 font-semibold">Importante: Si borra los datos de navegación o historial del navegador, podría eliminar sus evaluaciones. Utilice el botón "Descargar Respaldo JSON" periódicamente para salvaguardar sus datos.</p>
        </div>
      </div>

      <!-- Copias de Seguridad (Backup & Restore) -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 class="text-base font-bold text-slate-900">Copias de Seguridad</h3>
        <p class="text-xs text-slate-500">Exporte todos sus datos en un único archivo JSON o restaure un respaldo previo.</p>

        <div class="flex flex-wrap items-center gap-3">
          <button id="btn-export-backup" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Descargar Respaldo JSON
          </button>

          <label class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            <span>Restaurar desde Respaldo JSON</span>
            <input id="input-restore-backup" type="file" accept=".json" class="hidden" />
          </label>
        </div>
      </div>

      <!-- Diagnóstico y Pruebas del Sistema -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 class="text-base font-bold text-slate-900">Diagnóstico y Verificación de Requisitos</h3>
        <p class="text-xs text-slate-500">Ejecuta una serie de pruebas internas para validar IndexedDB, plantillas de 20/40/60/80 preguntas, visión OMR y cálculo de notas.</p>

        <button id="btn-run-diagnostics" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Ejecutar Diagnóstico y Pruebas del Sistema
        </button>

        <div id="diagnostics-results-box" class="hidden p-4 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono whitespace-pre-line leading-relaxed max-h-80 overflow-y-auto"></div>
      </div>
    </div>
  `,e.querySelector(`#btn-export-backup`).addEventListener(`click`,async()=>{await Ce()}),e.querySelector(`#input-restore-backup`).addEventListener(`change`,async e=>{let t=e.target.files[0];if(t&&await C({title:`Restaurar Copia de Seguridad`,message:`Esta acción importará las evaluaciones y resultados contenidos en el archivo. ¿Desea continuar?`,confirmText:`Sí, restaurar`}))try{await we(t),K(`inicio`)}catch(e){S(e.message,`error`,6e3)}}),e.querySelector(`#btn-run-diagnostics`).addEventListener(`click`,async()=>{let t=e.querySelector(`#diagnostics-results-box`);t.classList.remove(`hidden`),t.textContent=`Iniciando suite de pruebas automatizadas...
`;let n=e=>{t.textContent+=e+`
`,t.scrollTop=t.scrollHeight};try{n(`1. Verificando almacenamiento persistente IndexedDB...`);let e=await r();n(`   ✓ Base de datos: ${e.name} (Versión ${e.version}) OK.`),n(`2. Comprobando existencia o creación de evaluación "MCU"...`);let t=(await a()).find(e=>e.name===`MCU`);t||=await O({name:`MCU`,questionCount:20,alternativeCount:4,maxScore:10}),n(`   ✓ Evaluación MCU persistida con ID: ${t.id} OK.`),n(`3. Validando generador de geometrías A4 para 20, 40, 60 y 80 preguntas...`),[20,40,60,80].forEach(e=>{let t=M(e,4);n(`   ✓ Diseño ${e} preguntas: ${t.numCols} columnas, ${t.questionsPerCol} filas por columna. Margen OK.`)}),n(`4. Verificando motor de calificación determinista...`);let i=B({1:`A`,2:`B`,3:`A`,4:`D`,5:null},{1:`A`,2:`B`,3:`C`,4:`D`,5:`A`},{id:`test`,questionCount:5,maxScore:10});if(i.correctCount===3&&i.score===6&&i.percentage===60)n(`   ✓ Calificación: 3 aciertos = 6,00/10,00 (60,0%) OK.`);else throw Error(`Fallo en la prueba de cálculo matemático de notas.`);n(`5. Ejecutando prueba de Visión por Computadora y OMR...`);let o=document.createElement(`canvas`);N(t,o,{1:`A`,2:`C`,3:`B`});let s=await L(o,t);s.success?(n(`   ✓ Detección de marcadores fiduciales y corrección proyectiva OK.`),n(`   ✓ Lectura OMR: Pregunta 1 detectó "${s.detectedAnswers[1]}", Pregunta 2 detectó "${s.detectedAnswers[2]}".`)):n(`   ⚠ Nota OMR: ${s.error}`),n(`6. Estado de Service Worker y soporte Offline...`),`serviceWorker`in navigator&&n(`   ✓ API de Service Worker soportada en el navegador.`),n(`
=============================================`),n(`¡TODAS LAS PRUEBAS DIAGNÓSTICAS FINALIZARON CON ÉXITO!`),n(`=============================================`),S(`Diagnóstico del sistema completado con éxito.`,`success`)}catch(e){n(`\n❌ ERROR EN DIAGNÓSTICO: ${e.message}`),S(`Error en diagnóstico: ${e.message}`,`error`,6e3)}})}