const Hash = (() => {
  let table = [];      // tabla plana: 1 valor por celda (o null si está vacía)
  let overflow = [];   // Zona de Colisiones
  let N = 10;           // capacidad de la tabla (10 / 100 / 1000 / 10000)
  let currentMethod = 'modulo';
  let running = false;
  let cancelToken = 0;
  const SPEED = 700;

  function setMethod(method) {
    if (running) return;
    currentMethod = method;

    // Sincronizar el menú desplegable con el método actual
    const select = document.getElementById('hashMethod');
    if (select) select.value = method;

    generate();
  }

  function generate() {
    if (running) return;
    const nSelect = document.getElementById('hashN');

    N = (nSelect ? Number(nSelect.value) : 10) || 10;
    if (N < 1) N = 1;

    table = new Array(N).fill(null);
    overflow = [];

    renderTable();
    renderOverflow();
    updateCalc('—', '—', '—');

    const log = document.getElementById('hashLog');
    if (log) log.innerHTML = '';
    const status = document.getElementById('hashStatus');
    if (status) status.textContent = `Tabla creada: ${N} celdas. Método: ${currentMethod.toUpperCase()}`;
  }

  function getHash(k, method) {
    let steps = "";
    let h = 0;
    let absK = Math.abs(k);
    let kStr = String(absK);

    switch(method) {
      case 'modulo': {
        h = absK % N;
        steps = `${absK} mod ${N}`;
        break;
      }
      case 'cuadrado': {
        const sq = (absK * absK).toString();
        const mid = Math.floor(sq.length / 2);
        let extr = sq.length > 1 ? sq.substring(mid - 1, mid + 1) : sq;
        if (extr === "") extr = "0";
        let valC = parseInt(extr, 10);
        h = valC % N;
        steps = `${absK}² = ${sq} → centro = ${valC} → ${valC} mod ${N}`;
        break;
      }
      case 'truncamiento': {
        let trunc = "";
        for (let i = 0; i < kStr.length; i += 2) {
          trunc += kStr[i];
        }
        let valT = parseInt(trunc, 10) || 0;
        h = valT % N;
        steps = `Dígitos impares = ${valT} → ${valT} mod ${N}`;
        break;
      }
      case 'plegamiento': {
        let sum = 0;
        let parts = [];
        for (let i = 0; i < kStr.length; i += 2) {
          let part = kStr.substring(i, i + 2);
          parts.push(part);
          sum += parseInt(part, 10) || 0;
        }
        h = sum % N;
        steps = `Suma(${parts.join('+')}) = ${sum} → ${sum} mod ${N}`;
        break;
      }
      case 'bases': {
        let valB = parseInt(kStr, 16);
        if (isNaN(valB)) valB = absK;
        h = valB % N;
        steps = `Base 16 = ${valB}₍₁₀₎ → ${valB} mod ${N}`;
        break;
      }
    }

    if (isNaN(h) || h < 0) h = 0;
    return { bucketId: h, calcText: steps };
  }

  function updateCalc(key, opText, resultText) {
    const keyEl = document.getElementById('hCalcKey');
    const opEl = document.getElementById('hCalcOp');
    const resEl = document.getElementById('hCalcResult');

    if (keyEl) keyEl.textContent = key;
    if (opEl) opEl.innerHTML = opText;
    if (resEl) resEl.textContent = resultText;

    document.querySelectorAll('#hashCalc .calc-box').forEach(b => {
      b.classList.remove('pulse');
      void b.offsetWidth;
      b.classList.add('pulse');
    });
  }

  // Dibuja TODAS las celdas de la tabla de una sola vez (0..N-1)
  function renderTable() {
    const wrap = document.getElementById('hashBucketsTrack');
    if (!wrap) return;

    let html = '';
    for (let i = 0; i < N; i++) {
      const v = table[i];
      html += `<div class="hcell" id="hcell-${i}"><span class="hcell-idx">${i}</span><div class="hcell-box">${v === null ? '' : v}</div></div>`;
    }
    wrap.innerHTML = html;
  }

  // Actualiza solo el valor mostrado en una celda puntual (evita redibujar todo)
  function setCellValue(i, v) {
    const cell = document.getElementById(`hcell-${i}`);
    if (!cell) return;
    const box = cell.querySelector('.hcell-box');
    if (box) box.textContent = (v === null || v === undefined) ? '' : v;
  }

  // Aplica/limpia el estado visual (activo, comparando, encontrado) de una celda
  function setCellState(i, cls) {
    const cell = document.getElementById(`hcell-${i}`);
    if (!cell) return;
    cell.classList.remove('active', 'found');
    if (cls) cell.classList.add(cls);
  }

  function renderOverflow(targetVal = null, activeIdx = -1) {
    const wrap = document.getElementById('hashOverflowTrack');
    if (!wrap) return;

    if (overflow.length === 0) {
      wrap.innerHTML = `<span style="color:var(--accent-collision); opacity:0.6; font-size:12px; font-family:'JetBrains Mono',monospace;">(Sin desbordamientos)</span>`;
      return;
    }

    wrap.innerHTML = overflow.map((v, i) => {
      let cls = '';
      if (v === targetVal && activeIdx === -1) cls = 'found';
      else if (i === activeIdx) cls = 'compare';

      return `<div class="cell ${cls}"><div class="box" style="width:42px;height:42px;border-color:var(--accent-collision);">${v}</div></div>`;
    }).join('');
  }

  function valueExists(val) {
    if (overflow.includes(val)) return true;
    return table.includes(val);
  }

  async function processAction(mode) {
    if (running) return;
    const input = document.getElementById('hashInput');
    const status = document.getElementById('hashStatus');
    const log = document.getElementById('hashLog');

    if (!input || !status || !log) return;
    const k = Number(input.value);

    if (input.value === '' || Number.isNaN(k)) {
      status.innerHTML = '<span class="no">Escribe un número válido.</span>';
      return;
    }

    if (mode === 'insert' && valueExists(k)) {
      status.innerHTML = `<span class="no">La clave ${k} ya existe en la tabla.</span>`;
      input.value = '';
      return;
    }

    running = true;
    try {
      cancelToken++;
      const myToken = cancelToken;

      log.innerHTML = '';
      if (mode === 'insert') status.innerHTML = `Insertando <b>${k}</b>...`;
      else if (mode === 'search') status.innerHTML = `Buscando <b>${k}</b>...`;
      else status.innerHTML = `Eliminando <b>${k}</b>...`;

      const hashData = getHash(k, currentMethod);
      const targetIdx = hashData.bucketId;

      updateCalc(k, 'Calculando...', '...');
      await delay(SPEED * 0.5);
      if (myToken !== cancelToken) { running = false; return; }

      updateCalc(k, hashData.calcText, targetIdx);
      logEntry(log, `<span class="tag">Función</span> ${hashData.calcText}. Destino: <b>Celda ${targetIdx}</b>.`);
      setCellState(targetIdx, 'active');
      await delay(SPEED);
      if (myToken !== cancelToken) { running = false; return; }

      // --- INSERCIÓN ---
      if (mode === 'insert') {
        if (table[targetIdx] === null) {
          table[targetIdx] = k;
          setCellValue(targetIdx, k);
          setCellState(targetIdx, 'found');
          logEntry(log, `<span class="tag ok">Insertado</span> Clave ${k} asignada a la Celda ${targetIdx}.`);
          status.innerHTML = `<span class="ok">Clave almacenada.</span>`;
        } else {
          logEntry(log, `<span class="tag no">Colisión</span> La Celda ${targetIdx} ya está ocupada. Enviando a Zona de Colisiones.`);
          setCellState(targetIdx, null);
          overflow.push(k);
          renderOverflow(k, overflow.length - 1);
          await delay(SPEED * 0.5);
          renderOverflow(k, -1);
          status.innerHTML = `<span class="no">Clave guardada en Zona de Colisiones.</span>`;
        }
      }
      // --- BÚSQUEDA Y ELIMINACIÓN ---
      else {
        let foundInTable = false;
        let foundInOverflow = false;

        if (table[targetIdx] === k) {
          setCellState(targetIdx, 'found');
          foundInTable = true;
          logEntry(log, `<span class="tag ok">Encontrado</span> Clave ${k} en la Celda ${targetIdx}.`);

          if (mode === 'remove') {
            await delay(SPEED);
            table[targetIdx] = null;
            setCellValue(targetIdx, null);
            setCellState(targetIdx, null);
            logEntry(log, `<span class="tag ok">Eliminado</span> Clave removida de la estructura principal.`);
            status.innerHTML = `<span class="ok">Registro eliminado exitosamente.</span>`;

            // Reubicación desde la zona de colisiones (Overflow)
            if (overflow.length > 0) {
              logEntry(log, `<span class="tag">Verificando</span> Escaneando Zona de Colisiones por claves compatibles...`);
              for (let j = 0; j < overflow.length; j++) {
                let ovKey = overflow[j];
                let ovIdx = getHash(ovKey, currentMethod).bucketId;

                if (ovIdx === targetIdx) {
                  logEntry(log, `<span class="tag ok">Reubicación</span> Espacio liberado. Moviendo clave <b>${ovKey}</b> a la Celda ${targetIdx}.`);
                  await delay(SPEED);

                  overflow.splice(j, 1);
                  table[targetIdx] = ovKey;

                  renderOverflow();
                  setCellValue(targetIdx, ovKey);
                  setCellState(targetIdx, 'found');
                  await delay(SPEED * 0.5);
                  setCellState(targetIdx, null);
                  break; // Solo reubicamos 1 porque solo se liberó 1 espacio
                }
              }
            }
          } else {
            status.innerHTML = `<span class="ok">¡Elemento encontrado!</span>`;
          }
        }

        if (!foundInTable) {
          setCellState(targetIdx, null);
          logEntry(log, `<span class="tag">Desbordamiento</span> No hallado en la celda principal. Buscando en Zona de Colisiones...`);
          for (let j = 0; j < overflow.length; j++) {
            if (myToken !== cancelToken) { running = false; return; }
            renderOverflow(null, j);
            await delay(SPEED * 0.6);

            if (overflow[j] === k) {
              renderOverflow(k, -1);
              foundInOverflow = true;
              logEntry(log, `<span class="tag ok">Encontrado</span> Clave ${k} hallada en Zona de Colisiones.`);

              if (mode === 'remove') {
                await delay(SPEED);
                overflow.splice(j, 1);
                renderOverflow();
                logEntry(log, `<span class="tag ok">Eliminado</span> Clave removida de colisiones.`);
                status.innerHTML = `<span class="ok">Registro eliminado exitosamente.</span>`;
              } else {
                status.innerHTML = `<span class="ok">¡Elemento encontrado en colisiones!</span>`;
              }
              break;
            }
          }
        }

        if (!foundInTable && !foundInOverflow) {
          logEntry(log, `<span class="tag no">✕</span> Búsqueda agotada. El elemento no existe.`);
          status.innerHTML = `<span class="no">El valor ${k} no se encuentra en el Hashmap.</span>`;
          renderOverflow();
        }
      }

      input.value = '';
    } catch (e) {
      console.error("Error en Hashmap:", e);
    } finally {
      running = false;
    }
  }

  // Inicialización segura para que el HTML se dibuje correctamente al cargar
  setTimeout(() => {
    setMethod('modulo');
  }, 100);

  return {
    generate,
    setMethod,
    insert: () => processAction('insert'),
    search: () => processAction('search'),
    remove: () => processAction('remove')
  };
})();
