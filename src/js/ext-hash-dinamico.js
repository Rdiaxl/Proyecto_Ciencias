const BusquedasDinamicas = (() => {
  let buckets = [];
  let placed = [];      // claves que sí están físicamente en una cubeta (cuentan para la densidad)
  let overflow = [];    // claves que no cupieron: { key, targetId } -> Zona de Colisión
  let initialM = 4;
  let M = 4;
  let B = 3;
  let strategy = 'total';
  let expandLimit = 0.75;
  let running = false;
  const SPEED = 750;

  function generate() {
    initialM = Number(document.getElementById('bdInitialM').value);
    B = Number(document.getElementById('bdB').value);
    if(initialM < 2) initialM = 2;
    if(B < 1) B = 1;
    
    strategy = document.getElementById('bdStrategy').value;

    let limitInput = Number(document.getElementById('bdExpandLimit').value);
    if (Number.isNaN(limitInput) || limitInput < 1) limitInput = 75;
    if (limitInput > 100) limitInput = 100;
    document.getElementById('bdExpandLimit').value = limitInput;
    expandLimit = limitInput / 100;
    const expandLabel = document.getElementById('bdExpandLabel');
    if (expandLabel) expandLabel.textContent = `Expansión ≥ ${limitInput}%`;

    M = initialM;
    placed = [];
    overflow = [];
    
    initBuckets(M);
    renderDisk();
    renderOverflow();
    updateMetrics();
    updateCalc('—', '—', '—');
    
    document.getElementById('bdLog').innerHTML = '';
    document.getElementById('bdStatus').textContent = `Sistema iniciado. Densidad límite: Expansión ≥ ${limitInput}%, Reducción < 50%.`;
    running = false; // Reset de seguridad
  }

  function initBuckets(size) {
    buckets = Array.from({length: size}, () => []);
  }

  function getDensity() {
    if (M === 0 || B === 0) return 0;
    return placed.length / (M * B);
  }

  function updateMetrics() {
    const density = getDensity();
    const pct = (density * 100).toFixed(1);
    
    document.getElementById('bdKeysCount').textContent = placed.length + overflow.length;
    document.getElementById('bdCurrentM').textContent = M;
    document.getElementById('bdDensity').textContent = `${pct}%`;

    const collisionEl = document.getElementById('bdOverflowCount');
    if (collisionEl) collisionEl.textContent = overflow.length;
    
    const bar = document.getElementById('bdDensityBar');
    bar.style.width = `${Math.min(pct, 100)}%`;
    
    if (density >= expandLimit) {
      bar.style.backgroundColor = 'var(--accent-collision)'; 
    } else if (density < 0.50 && M > initialM) {
      bar.style.backgroundColor = 'var(--accent-scan)'; 
    } else {
      bar.style.backgroundColor = 'var(--accent-found)'; 
    }
  }

  function updateCalc(key, opText, resultText) {
    const keyEl = document.getElementById('bdCalcKey');
    const opEl = document.getElementById('bdCalcOp');
    const resEl = document.getElementById('bdCalcResult');
    if (keyEl) keyEl.textContent = key;
    if (opEl) opEl.textContent = opText;
    if (resEl) resEl.textContent = resultText;
  }

  function renderDisk() {
    const wrap = document.getElementById('bdDisk');
    wrap.classList.add('bd-table');
    wrap.innerHTML = buckets.map((chunk, i) => {
      const emptyCellsCount = B - chunk.length;
      let rows = chunk.map(v => `<div class="bd-row filled">${v}</div>`).join('');

      for(let e=0; e<emptyCellsCount; e++) {
        rows += `<div class="bd-row empty">-</div>`;
      }

      return `<div class="bd-col">
                <div class="bd-col-head">${i}</div>
                <div class="bd-col-body">${rows}</div>
              </div>`;
    }).join('');
  }

  function renderOverflow() {
    const wrap = document.getElementById('bdOverflow');
    if (!wrap) return;
    if (overflow.length === 0) {
      wrap.innerHTML = `<span class="bd-overflow-empty">Sin colisiones pendientes.</span>`;
      return;
    }
    wrap.innerHTML = overflow.map(o =>
      `<div class="bd-overflow-chip" title="Destino original: Cubeta ${o.targetId}">${o.key}<span class="bd-overflow-chip-idx">→ C${o.targetId}</span></div>`
    ).join('');
  }

  async function rehash(newM, reasonTag, reasonText) {
    const log = document.getElementById('bdLog');
    logEntry(log, `<span class="tag" style="color:var(--accent-scan)">${reasonTag}</span> ${reasonText}`);
    logEntry(log, `Reestructurando disco de <b>${M}</b> a <b>${newM}</b> cubetas...`);
    await delay(SPEED);
    
    M = newM;
    initBuckets(M);
    
    for (let k of placed) {
      let h = Math.abs(k) % M;
      buckets[h].push(k);
    }

    const stillOverflow = [];
    for (let o of overflow) {
      let h = Math.abs(o.key) % M;
      if (buckets[h].length < B) {
        buckets[h].push(o.key);
        placed.push(o.key);
      } else {
        stillOverflow.push({ key: o.key, targetId: h });
      }
    }
    overflow = stillOverflow;
    
    renderDisk();
    renderOverflow();
    updateMetrics();
    logEntry(log, `<span class="tag ok">Rehashing Completo</span> Las claves fueron reasignadas usando (K mod ${M}).`);
    if (overflow.length > 0) {
      logEntry(log, `<span class="tag no">Colisión</span> ${overflow.length} clave(s) siguen en la Zona de Colisión.`);
    }
    await delay(SPEED);
  }

  async function checkExpansion() {
    if (getDensity() >= expandLimit) {
      let newM = strategy === 'total' ? M * 2 : Math.ceil(M * 1.5);
      await rehash(newM, `EXCESO ${(expandLimit*100).toFixed(0)}%`, `Expansión ${strategy} disparada.`);
    }
  }

  async function checkReduction() {
    if (getDensity() < 0.50 && M > initialM) {
      let newM = strategy === 'total' ? Math.ceil(M / 2) : Math.ceil(M / 1.5);
      if (newM < initialM) newM = initialM;
      if (newM !== M) {
        await rehash(newM, 'BAJA 50%', `Reducción ${strategy} disparada.`);
      }
    }
  }

  async function insert() {
    if (running) return;
    const input = document.getElementById('bdKey');
    const k = Number(input.value);
    const status = document.getElementById('bdStatus');
    const log = document.getElementById('bdLog');

    if (input.value === '' || Number.isNaN(k)) {
      status.innerHTML = '<span class="no">Por favor, escribe una clave numérica válida.</span>';
      return;
    }
    
    if (placed.includes(k) || overflow.some(o => o.key === k)) {
      status.innerHTML = `<span class="no">La clave ${k} ya existe.</span>`;
      input.value = ''; 
      return;
    }

    running = true;
    try {
      let targetId = Math.abs(k) % M;
      updateCalc(k, `${k} mod ${M} = ${targetId}`, targetId);

      if (buckets[targetId].length >= B) {
          overflow.push({ key: k, targetId });
          renderOverflow();
          updateMetrics();
          logEntry(log, `<span class="tag no">Colisión</span> Cubeta ${targetId} llena. Clave <b>${k}</b> enviada a la Zona de Colisión.`);
          status.innerHTML = `<span class="no">Cubeta llena: la clave ${k} fue a la Zona de Colisión.</span>`;
          input.value = '';
          return;
      }

      placed.push(k);
      buckets[targetId].push(k);
      renderDisk();
      updateMetrics();
      logEntry(log, `Clave <b>${k}</b> insertada en Cubeta ${targetId}.`);
      
      await delay(SPEED * 0.5);
      await checkExpansion();

      status.innerHTML = `<span class="ok">Operación finalizada.</span>`;
      input.value = ''; 
    } catch (e) {
      console.error("Error en Hash Dinámico (Insertar):", e);
    } finally {
      running = false; // Desbloquea el botón siempre
    }
  }

  async function remove() {
    if (running) return;
    const input = document.getElementById('bdKey');
    const k = Number(input.value);
    const status = document.getElementById('bdStatus');
    const log = document.getElementById('bdLog');

    if (input.value === '' || Number.isNaN(k)) {
      status.innerHTML = '<span class="no">Por favor, escribe una clave.</span>';
      return;
    }
    
    const placedIndex = placed.indexOf(k);
    const overflowIndex = overflow.findIndex(o => o.key === k);
    if (placedIndex === -1 && overflowIndex === -1) {
      status.innerHTML = `<span class="no">La clave ${k} no existe.</span>`;
      input.value = '';
      return;
    }

    running = true;
    try {
      if (overflowIndex !== -1) {
        // La clave estaba en la Zona de Colisión: solo se retira de ahí.
        const targetId = overflow[overflowIndex].targetId;
        overflow.splice(overflowIndex, 1);
        renderOverflow();
        logEntry(log, `Clave <b>${k}</b> eliminada de la Zona de Colisión (destino original Cubeta ${targetId}).`);
      } else {
        placed.splice(placedIndex, 1);
        let targetId = Math.abs(k) % M;
        updateCalc(k, `${k} mod ${M} = ${targetId}`, targetId);
        let bucketIndex = buckets[targetId].indexOf(k);
        if(bucketIndex !== -1) {
           buckets[targetId].splice(bucketIndex, 1);
        }
        logEntry(log, `Clave <b>${k}</b> eliminada de la Cubeta ${targetId}.`);

        // Se liberó un puesto: intenta promover una clave en espera de esa misma cubeta.
        const waitingIndex = overflow.findIndex(o => o.targetId === targetId);
        if (waitingIndex !== -1 && buckets[targetId].length < B) {
          const promoted = overflow.splice(waitingIndex, 1)[0];
          buckets[targetId].push(promoted.key);
          placed.push(promoted.key);
          renderOverflow();
          logEntry(log, `<span class="tag ok">Reubicada</span> Clave <b>${promoted.key}</b> pasó de la Zona de Colisión a la Cubeta ${targetId}.`);
        }
      }

      renderDisk();
      updateMetrics();
      
      await delay(SPEED * 0.5);
      await checkReduction();

      status.innerHTML = `<span class="ok">Operación finalizada.</span>`;
      input.value = ''; 
    } catch (e) {
      console.error("Error en Hash Dinámico (Eliminar):", e);
    } finally {
      running = false; 
    }
  }

  return { generate, insert, remove };
})();