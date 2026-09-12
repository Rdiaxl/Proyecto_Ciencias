const Bin = (() => {
  let arr = [];
  let running = false;
  let cancelToken = 0;

  const pcodeLines = [
    'función búsquedaBinaria(arr, objetivo):',
    '    bajo = 0;  alto = n-1',
    '    mientras bajo <= alto:',
    '        medio = piso((bajo+alto)/2)',
    '        si arr[medio] == objetivo: retornar medio',
    '        si arr[medio] < objetivo: bajo = medio+1',
    '        si no: alto = medio-1',
    '    retornar -1   // no encontrado'
  ];

  function renderPcode() {
    const el = document.getElementById('binPcode');
    if (el) el.innerHTML = pcodeLines.map((l, i) => `<span data-line="${i + 1}">${l}</span>`).join('\n');
  }

  function renderCells(states = {}, range = null) {
    const wrap = document.getElementById('binCells');
    if (!wrap) return;
    if (arr.length === 0) {
      wrap.innerHTML = `<span style="color:var(--text-dim); font-size:12px; font-family:'JetBrains Mono',monospace;">(Vacío)</span>`;
      return;
    }
    wrap.innerHTML = arr.map((v, i) => {
      let st = states[i] || '';
      if (range && (i < range[0] || i > range[1])) st += ' out-of-range';
      return `<div class="cell ${st}"><div class="box">${v}</div><div class="idx">${i}</div></div>`;
    }).join('');
  }

  function renderMarkers(lo, mid, hi) {
    const wrap = document.getElementById('binMarkers');
    if (!wrap) return;
    if (arr.length === 0) {
      wrap.innerHTML = '';
      return;
    }
    wrap.innerHTML = arr.map((_, i) => {
      const labels = [];
      if (i === lo) labels.push('<span class="m-b">bajo</span>');
      if (i === mid) labels.push('<span class="m-m">medio</span>');
      if (i === hi) labels.push('<span class="m-a">alto</span>');
      return `<div class="marker-slot">${labels.join('<br>')}</div>`;
    }).join('');
  }

  function clearArray() {
    if (running) return;
    arr = [];
    renderCells();
    renderMarkers(-1, -1, -1);
    const log = document.getElementById('binLog');
    if(log) log.innerHTML = '';
    const status = document.getElementById('binStatus');
    if(status) status.textContent = 'Arreglo limpiado.';
    renderPcode();
  }

  function generate() {
    if (running) return;
    const sizeInput = document.getElementById('binRandSize');
    const status = document.getElementById('binStatus');
    const rawSize = sizeInput ? Number(sizeInput.value) : 11;

    if (sizeInput && (sizeInput.value === '' || Number.isNaN(rawSize) || rawSize < 1 || rawSize > 99)) {
      if (status) status.innerHTML = '<span class="no">Número no válido. La cantidad debe estar entre 1 y 99.</span>';
      return;
    }

    const size = rawSize || 11;
    arr = randUniqueArray(size, 1, 99).sort((a, b) => a - b);
    renderPcode();
    renderCells();
    renderMarkers(-1, -1, -1);
    const log = document.getElementById('binLog');
    if(log) log.innerHTML = '';
    if(status) status.textContent = `Generados ${size} elementos ordenados.`;
  }

  function insert() {
    if (running) return;
    const input = document.getElementById('binInput');
    const status = document.getElementById('binStatus');
    if (!input || !status) return;

    const val = Number(input.value);
    if (input.value === '' || Number.isNaN(val)) {
      status.innerHTML = '<span class="no">Escribe un número válido para insertar.</span>';
      return;
    }

    if (arr.includes(val)) {
      status.innerHTML = '<span class="no">Ese número ya se encuentra en el arreglo.</span>';
      return;
    }

    arr.unshift(val);

    input.value = '';
    renderPcode();
    renderCells();
    renderMarkers(-1, -1, -1);
    status.innerHTML = `<span class="ok">Insertado ${val} en la primera posición del arreglo.</span>`;
  }

  async function remove() {
    if (running) return;
    const input = document.getElementById('binInput');
    const status = document.getElementById('binStatus');
    const log = document.getElementById('binLog');
    if (!input || !status || !log) return;

    const val = Number(input.value);
    if (input.value === '' || Number.isNaN(val)) {
      status.innerHTML = '<span class="no">Escribe un número válido para eliminar.</span>';
      return;
    }

    if (arr.length === 0) {
      status.innerHTML = '<span class="no">El arreglo está vacío.</span>';
      return;
    }

    running = true;
    try {
      cancelToken++;
      const myToken = cancelToken;
      const BIN_SPEED = 650;
      
      log.innerHTML = '';
      status.innerHTML = `Buscando <b>${val}</b> para eliminar...`;

      let lo = 0, hi = arr.length - 1;
      renderCells({}, [lo, hi]);
      renderMarkers(lo, null, hi);
      await delay(400);

      while (lo <= hi) {
        if (myToken !== cancelToken) { running = false; return; }
        
        const mid = Math.floor((lo + hi) / 2);
        renderCells({ [mid]: 'compare' }, [lo, hi]);
        renderMarkers(lo, mid, hi);
        logEntry(log, `<span class="tag">rango [${lo},${hi}]</span> medio=${mid} → Evaluando arr[${mid}]=<b>${arr[mid]}</b> para eliminar`);
        await delay(BIN_SPEED);

        if (arr[mid] === val) {
          if (myToken !== cancelToken) { running = false; return; }
          renderCells({ [mid]: 'found' }, [lo, hi]);
          logEntry(log, `<span class="tag ok">Encontrado</span> Valor ${val} hallado en el índice ${mid}. Eliminando registro...`);
          
          await delay(BIN_SPEED + 200); 
          
          arr.splice(mid, 1);
          renderCells();
          renderMarkers(-1, -1, -1);
          status.innerHTML = `<span class="ok">Registro ${val} eliminado exitosamente.</span>`;
          input.value = '';
          running = false;
          return;
        } 
        
        if (arr[mid] < val) {
          logEntry(log, `arr[${mid}] &lt; ${val} → buscando en la mitad derecha`);
          lo = mid + 1;
        } else {
          logEntry(log, `arr[${mid}] &gt; ${val} → buscando en la mitad izquierda`);
          hi = mid - 1;
        }
        
        renderCells({}, [lo, hi]);
        renderMarkers(lo, null, hi);
        await delay(BIN_SPEED * 0.6);
      }
      
      if (myToken !== cancelToken) { running = false; return; }
      logEntry(log, `<span class="tag no">✕</span> Rango agotado. No se encontró el registro.`);
      status.innerHTML = `<span class="no">El valor ${val} no existe en el arreglo.</span>`;
      renderMarkers(-1, -1, -1);
    } catch (e) {
      console.error("Error en Bin.remove:", e);
    } finally {
      running = false;
    }
  }

  async function start() {
    if (running) return;
    const status = document.getElementById('binStatus');
    const input = document.getElementById('binInput');
    const log = document.getElementById('binLog');
    const pcode = document.getElementById('binPcode');
    if (!status || !input) return;

    if (arr.length === 0) {
      status.innerHTML = '<span class="no">El arreglo está vacío. Inserta datos primero.</span>';
      return;
    }
    
    const target = Number(input.value);
    if (input.value === '' || Number.isNaN(target)) {
      status.innerHTML = '<span class="no">Escribe un número objetivo válido.</span>';
      return;
    }
    
    running = true;
    try {
      cancelToken++;
      const myToken = cancelToken;
      const BIN_SPEED = 850;
      
      if (log) log.innerHTML = '';
      status.innerHTML = `Buscando <b>${target}</b>...`;

      let lo = 0, hi = arr.length - 1;
      if (pcode) setPcodeActive(pcode, 2);
      renderCells({}, [lo, hi]);
      renderMarkers(lo, null, hi);
      await delay(300);

      while (lo <= hi) {
        if (myToken !== cancelToken) { running = false; return; }
        if (pcode) setPcodeActive(pcode, 3);
        const mid = Math.floor((lo + hi) / 2);
        if (pcode) setPcodeActive(pcode, 4);
        renderCells({ [mid]: 'compare' }, [lo, hi]);
        renderMarkers(lo, mid, hi);
        if (log) logEntry(log, `<span class="tag">rango [${lo},${hi}]</span> medio=${mid} → arr[${mid}]=<b>${arr[mid]}</b>`);
        await delay(BIN_SPEED);
        if (myToken !== cancelToken) { running = false; return; }

        if (pcode) setPcodeActive(pcode, 5);
        if (arr[mid] === target) {
          renderCells({ [mid]: 'found' }, [lo, hi]);
          if (log) logEntry(log, `<span class="tag ok">✓</span> arr[${mid}] == ${target} → <b>encontrado en el índice ${mid}</b>`);
          status.innerHTML = `<span class="ok">Encontrado en el índice ${mid}.</span>`;
          input.value = '';
          running = false;
          return;
        }
        await delay(BIN_SPEED * 0.4);
        if (myToken !== cancelToken) { running = false; return; }

        if (arr[mid] < target) {
          if (pcode) setPcodeActive(pcode, 6);
          if (log) logEntry(log, `arr[${mid}] &lt; ${target} → descarta mitad izquierda, bajo = ${mid + 1}`);
          lo = mid + 1;
        } else {
          if (pcode) setPcodeActive(pcode, 7);
          if (log) logEntry(log, `arr[${mid}] &gt; ${target} → descarta mitad derecha, alto = ${mid - 1}`);
          hi = mid - 1;
        }
        renderCells({}, [lo, hi]);
        renderMarkers(lo, null, hi);
        await delay(BIN_SPEED * 0.5);
      }
      
      if (myToken !== cancelToken) { running = false; return; }
      if (pcode) setPcodeActive(pcode, 8);
      if (log) logEntry(log, `<span class="tag no">✕</span> bajo &gt; alto → <b>no encontrado</b>`);
      status.innerHTML = `<span class="no">Valor no encontrado (-1).</span>`;
    } catch (e) {
      console.error("Error en Bin.start:", e);
    } finally {
      running = false;
    }
  }

  return { clearArray, generate, insert, remove, start, renderPcode };
})();