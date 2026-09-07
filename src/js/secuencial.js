const Seq = (() => {
  let arr = [];
  let running = false;
  let cancelToken = 0;

  const pcodeLines = [
    'función búsquedaSecuencial(arr, objetivo):',
    '    para i desde 0 hasta n-1:',
    '        si arr[i] == objetivo:',
    '            retornar i',
    '    retornar -1   // no encontrado'
  ];

  function renderPcode() {
    const el = document.getElementById('seqPcode');
    if (el) el.innerHTML = pcodeLines.map((l, i) => `<span data-line="${i + 1}">${l}</span>`).join('\n');
  }

  function renderCells(states = {}) {
    const wrap = document.getElementById('seqCells');
    if (!wrap) return;
    if (arr.length === 0) {
      wrap.innerHTML = `<span style="color:var(--text-dim); font-size:12px; font-family:'JetBrains Mono',monospace;">(Vacío)</span>`;
      return;
    }
    wrap.innerHTML = arr.map((v, i) => {
      const st = states[i] || '';
      return `<div class="cell ${st}"><div class="box">${v}</div><div class="idx">${i}</div></div>`;
    }).join('');
  }

  function clearArray() {
    if (running) return;
    arr = [];
    renderCells();
    const log = document.getElementById('seqLog');
    if (log) log.innerHTML = '';
    const status = document.getElementById('seqStatus');
    if (status) status.textContent = 'Arreglo limpiado.';
    renderPcode();
  }

  function generate() {
    if (running) return;
    const sizeInput = document.getElementById('seqRandSize');
    const size = (sizeInput ? Number(sizeInput.value) : 10) || 10;
    arr = randUniqueArray(size, 1, 99);
    renderPcode();
    renderCells();
    const log = document.getElementById('seqLog');
    if (log) log.innerHTML = '';
    const status = document.getElementById('seqStatus');
    if (status) status.textContent = `Generados ${size} elementos aleatorios.`;
  }

  function insert() {
    if (running) return;
    const input = document.getElementById('seqInput');
    const status = document.getElementById('seqStatus');
    if (!input || !status) return;

    const val = Number(input.value);
    if (input.value === '' || Number.isNaN(val)) {
      status.innerHTML = '<span class="no">Escribe un número válido para insertar.</span>';
      return;
    }
    
    arr.push(val);
    input.value = '';
    renderPcode();
    renderCells();
    status.innerHTML = `<span class="ok">Insertado el valor ${val}.</span>`;
  }

  // Función asíncrona unificada y segura
  async function remove() {
    if (running) return;
    const input = document.getElementById('seqInput');
    const status = document.getElementById('seqStatus');
    const log = document.getElementById('seqLog');
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
      const SEQ_SPEED = 500;
      
      log.innerHTML = '';
      status.innerHTML = `Buscando <b>${val}</b> para eliminar...`;

      for (let i = 0; i < arr.length; i++) {
        if (myToken !== cancelToken) { running = false; return; }
        
        renderCells({ [i]: 'compare' });
        logEntry(log, `<span class="tag">Búsqueda</span> Comparando arr[${i}]=<b>${arr[i]}</b> con objetivo a eliminar <b>${val}</b>`);
        await delay(SEQ_SPEED);

        if (arr[i] === val) {
          if (myToken !== cancelToken) { running = false; return; }
          renderCells({ [i]: 'found' });
          logEntry(log, `<span class="tag ok">Encontrado</span> Valor ${val} hallado en el índice ${i}. Eliminando registro...`);
          
          await delay(SEQ_SPEED + 200); 
          
          arr.splice(i, 1);
          renderCells();
          status.innerHTML = `<span class="ok">Registro ${val} eliminado exitosamente.</span>`;
          input.value = '';
          running = false;
          return;
        }
      }
      
      if (myToken !== cancelToken) { running = false; return; }
      renderCells();
      logEntry(log, `<span class="tag no">✕</span> Se recorrió todo el arreglo. No hay nada que eliminar.`);
      status.innerHTML = `<span class="no">El valor ${val} no existe en el arreglo.</span>`;
    } catch (e) {
      console.error("Error en Seq.remove:", e);
    } finally {
      running = false; // Desbloquea los botones siempre
    }
  }

  async function start() {
    if (running) return;
    const status = document.getElementById('seqStatus');
    const input = document.getElementById('seqInput');
    const log = document.getElementById('seqLog');
    const pcode = document.getElementById('seqPcode');
    if (!status || !input || !log || !pcode) return;

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
      log.innerHTML = '';
      const SEQ_SPEED = 650;
      status.innerHTML = `Buscando <b>${target}</b>...`;

      setPcodeActive(pcode, 1);
      await delay(150);

      for (let i = 0; i < arr.length; i++) {
        if (myToken !== cancelToken) { running = false; return; }
        setPcodeActive(pcode, 2);
        renderCells({ [i]: 'compare' });
        logEntry(log, `<span class="tag">i=${i}</span> comparando arr[${i}]=<b>${arr[i]}</b> con objetivo <b>${target}</b>`);
        await delay(SEQ_SPEED);
        
        if (myToken !== cancelToken) { running = false; return; }
        setPcodeActive(pcode, 3);
        await delay(SEQ_SPEED * 0.4);

        if (arr[i] === target) {
          setPcodeActive(pcode, 4);
          renderCells({ [i]: 'found' });
          logEntry(log, `<span class="tag ok">✓</span> arr[${i}] == ${target} → <b>encontrado en el índice ${i}</b>`);
          status.innerHTML = `<span class="ok">Encontrado en el índice ${i}.</span>`;
          input.value = '';
          running = false;
          return;
        }
      }
      
      if (myToken !== cancelToken) { running = false; return; }
      setPcodeActive(pcode, 5);
      renderCells();
      logEntry(log, `<span class="tag no">✕</span> se recorrió todo el arreglo → <b>no encontrado</b>`);
      status.innerHTML = `<span class="no">Valor no encontrado (-1).</span>`;
    } catch (e) {
      console.error("Error en Seq.start:", e);
    } finally {
      running = false;
    }
  }

  return { clearArray, generate, insert, remove, start, renderPcode };
})();