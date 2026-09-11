const ExtHashDin = (() => {
  let buckets = [];
  let allKeys = [];
  let initialM = 4;
  let M = 4;
  let B = 3;
  let strategy = 'total';
  let expandLimit = 0.75;
  let running = false;
  const SPEED = 750;

  function generate() {
    initialM = Number(document.getElementById('ehdInitialM').value);
    B = Number(document.getElementById('ehdB').value);
    if(initialM < 2) initialM = 2;
    if(B < 1) B = 1;
    
    strategy = document.getElementById('ehdStrategy').value;

    let limitInput = Number(document.getElementById('ehdExpandLimit').value);
    if (Number.isNaN(limitInput) || limitInput < 1) limitInput = 75;
    if (limitInput > 100) limitInput = 100;
    document.getElementById('ehdExpandLimit').value = limitInput;
    expandLimit = limitInput / 100;
    const expandLabel = document.getElementById('ehdExpandLabel');
    if (expandLabel) expandLabel.textContent = `Expansión ≥ ${limitInput}%`;

    M = initialM;
    allKeys = [];
    
    initBuckets(M);
    renderDisk();
    updateMetrics();
    updateCalc('—', '—', '—');
    
    document.getElementById('ehdLog').innerHTML = '';
    document.getElementById('ehdStatus').textContent = `Sistema iniciado. Densidad límite: Expansión ≥ ${limitInput}%, Reducción < 50%.`;
    running = false; // Reset de seguridad
  }

  function initBuckets(size) {
    buckets = Array.from({length: size}, () => []);
  }

  function getDensity() {
    if (M === 0 || B === 0) return 0;
    return allKeys.length / (M * B);
  }

  function updateMetrics() {
    const density = getDensity();
    const pct = (density * 100).toFixed(1);
    
    document.getElementById('ehdKeysCount').textContent = allKeys.length;
    document.getElementById('ehdCurrentM').textContent = M;
    document.getElementById('ehdDensity').textContent = `${pct}%`;
    
    const bar = document.getElementById('ehdDensityBar');
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
    const keyEl = document.getElementById('ehdCalcKey');
    const opEl = document.getElementById('ehdCalcOp');
    const resEl = document.getElementById('ehdCalcResult');
    if (keyEl) keyEl.textContent = key;
    if (opEl) opEl.textContent = opText;
    if (resEl) resEl.textContent = resultText;
  }

  function renderDisk() {
    const wrap = document.getElementById('ehdDisk');
    wrap.innerHTML = buckets.map((chunk, i) => {
      const emptyCellsCount = B - chunk.length;
      let cells = chunk.map(v => `<div class="cell"><div class="box" style="width:38px;height:38px;font-size:13px;border-color:var(--accent-found); background:#DFF5F2;">${v}</div></div>`).join('');
      
      for(let e=0; e<emptyCellsCount; e++) {
        cells += `<div class="cell empty"><div class="box" style="width:38px;height:38px;">-</div></div>`;
      }

      return `<div class="disk-block" style="padding:10px; flex-shrink:0;">
                <h5 style="margin:0 0 8px;">${i}</h5>
                <div class="cells-row" style="flex-direction:column; align-items:flex-start; justify-content:flex-start;">${cells}</div>
              </div>`;
    }).join('');
  }

  async function rehash(newM, reasonTag, reasonText) {
    const log = document.getElementById('ehdLog');
    logEntry(log, `<span class="tag" style="color:var(--accent-scan)">${reasonTag}</span> ${reasonText}`);
    logEntry(log, `Reestructurando disco de <b>${M}</b> a <b>${newM}</b> cubetas...`);
    await delay(SPEED);
    
    M = newM;
    initBuckets(M);
    
    for (let k of allKeys) {
      let h = Math.abs(k) % M;
      buckets[h].push(k);
    }
    
    renderDisk();
    updateMetrics();
    logEntry(log, `<span class="tag ok">Rehashing Completo</span> Las claves fueron reasignadas usando (K mod ${M}).`);
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
    const input = document.getElementById('ehdKey');
    const k = Number(input.value);
    const status = document.getElementById('ehdStatus');
    const log = document.getElementById('ehdLog');

    if (input.value === '' || Number.isNaN(k)) {
      status.innerHTML = '<span class="no">Por favor, escribe una clave numérica válida.</span>';
      return;
    }
    
    if (allKeys.includes(k)) {
      status.innerHTML = `<span class="no">La clave ${k} ya existe.</span>`;
      input.value = ''; 
      return;
    }

    running = true;
    try {
      let targetId = Math.abs(k) % M;
      updateCalc(k, `${k} mod ${M} = ${targetId}`, targetId);

      if (buckets[targetId].length >= B) {
          logEntry(log, `<span class="tag no">Colisión Lleno</span> Cubeta ${targetId} llena. Forzando expansión...`);
          let newM = strategy === 'total' ? M * 2 : Math.ceil(M * 1.5);
          await rehash(newM, 'DESBORDAMIENTO', 'Expansión de emergencia.');
          targetId = Math.abs(k) % M; // Recalcular
          updateCalc(k, `${k} mod ${M} = ${targetId}`, targetId);
      }

      allKeys.push(k);
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
    const input = document.getElementById('ehdKey');
    const k = Number(input.value);
    const status = document.getElementById('ehdStatus');
    const log = document.getElementById('ehdLog');

    if (input.value === '' || Number.isNaN(k)) {
      status.innerHTML = '<span class="no">Por favor, escribe una clave.</span>';
      return;
    }
    
    const index = allKeys.indexOf(k);
    if (index === -1) {
      status.innerHTML = `<span class="no">La clave ${k} no existe.</span>`;
      input.value = '';
      return;
    }

    running = true;
    try {
      allKeys.splice(index, 1);
      let targetId = Math.abs(k) % M;
      updateCalc(k, `${k} mod ${M} = ${targetId}`, targetId);
      let bucketIndex = buckets[targetId].indexOf(k);
      if(bucketIndex !== -1) {
         buckets[targetId].splice(bucketIndex, 1);
      }

      renderDisk();
      updateMetrics();
      logEntry(log, `Clave <b>${k}</b> eliminada de la Cubeta ${targetId}.`);
      
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