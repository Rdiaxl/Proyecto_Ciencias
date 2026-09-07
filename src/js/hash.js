const Hash = (() => {
  let buckets = [];
  let overflow = []; 
  let M = 5;
  let B = 3;
  let currentMethod = 'modulo';
  let running = false;
  let cancelToken = 0;
  const SPEED = 700;

  function setMethod(method) {
    if (running) return;
    currentMethod = method;
    
    // Actualizar estilos visuales del menú
    document.querySelectorAll('[id^="btn-"]').forEach(btn => {
      btn.style.borderColor = 'var(--border)';
      btn.style.background = 'var(--bg-panel)';
    });
    
    const activeBtn = document.getElementById(`btn-${method}`);
    if (activeBtn) {
      activeBtn.style.borderColor = 'var(--accent-scan)';
      activeBtn.style.background = '#142036';
    }
    
    generate();
  }

  function generate() {
    if (running) return;
    const mInput = document.getElementById('hashM');
    const bInput = document.getElementById('hashB');
    
    M = (mInput ? Number(mInput.value) : 5) || 5;
    B = (bInput ? Number(bInput.value) : 3) || 3;
    if (M < 2) M = 2;
    if (B < 1) B = 1;

    buckets = Array.from({ length: M }, () => []);
    overflow = [];
    
    renderBuckets();
    renderOverflow();
    updateCalc('—', '—', '—');
    
    const log = document.getElementById('hashLog');
    if (log) log.innerHTML = '';
    const status = document.getElementById('hashStatus');
    if (status) status.textContent = `Tabla reiniciada: ${M} cubetas, capacidad ${B}. Método: ${currentMethod.toUpperCase()}`;
  }

  function getHash(k, method) {
    let steps = "";
    let h = 0;
    let absK = Math.abs(k);
    let kStr = String(absK);
    
    switch(method) {
      case 'modulo': {
        h = absK % M;
        steps = `${absK} mod ${M}`;
        break;
      }
      case 'cuadrado': {
        const sq = (absK * absK).toString();
        const mid = Math.floor(sq.length / 2);
        let extr = sq.length > 1 ? sq.substring(mid - 1, mid + 1) : sq;
        if (extr === "") extr = "0";
        let valC = parseInt(extr, 10);
        h = valC % M;
        steps = `${absK}² = ${sq} → centro = ${valC} → ${valC} mod ${M}`;
        break;
      }
      case 'truncamiento': {
        let trunc = "";
        for (let i = 0; i < kStr.length; i += 2) {
          trunc += kStr[i];
        }
        let valT = parseInt(trunc, 10) || 0;
        h = valT % M;
        steps = `Dígitos impares = ${valT} → ${valT} mod ${M}`;
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
        h = sum % M;
        steps = `Suma(${parts.join('+')}) = ${sum} → ${sum} mod ${M}`;
        break;
      }
      case 'bases': {
        let valB = parseInt(kStr, 16);
        if (isNaN(valB)) valB = absK; 
        h = valB % M;
        steps = `Base 16 = ${valB}₍₁₀₎ → ${valB} mod ${M}`;
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

  function renderBuckets(activeBucket = -1, targetVal = null, activeIdx = -1) {
    const wrap = document.getElementById('hashBucketsTrack');
    if (!wrap) return;

    wrap.innerHTML = buckets.map((chunk, i) => {
      const isActive = i === activeBucket ? 'active' : '';
      const emptyCells = B - chunk.length;
      
      let cellsHTML = chunk.map((v, idx) => {
        let cls = '';
        if (i === activeBucket && v === targetVal && activeIdx === -1) cls = 'found';
        else if (i === activeBucket && idx === activeIdx) cls = 'compare';
        
        return `<div class="cell ${cls}"><div class="box" style="width:42px;height:42px;font-size:14px;">${v}</div></div>`;
      }).join('');
      
      for(let e = 0; e < emptyCells; e++) {
        cellsHTML += `<div class="cell"><div class="box" style="width:42px;height:42px;font-size:12px;opacity:0.2;">-</div></div>`;
      }

      return `<div class="bucket-col ${isActive}"><h5>C-${i}</h5><div class="cells-vertical">${cellsHTML}</div></div>`;
    }).join('');
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
    for (let b of buckets) {
      if (b.includes(val)) return true;
    }
    return false;
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
      const targetB = hashData.bucketId;
      
      updateCalc(k, 'Calculando...', '...');
      await delay(SPEED * 0.5);
      if (myToken !== cancelToken) { running = false; return; }

      updateCalc(k, hashData.calcText, targetB);
      logEntry(log, `<span class="tag">Función</span> ${hashData.calcText}. Destino: <b>Cubeta ${targetB}</b>.`);
      renderBuckets(targetB);
      await delay(SPEED);

      // --- INSERCIÓN ---
      if (mode === 'insert') {
        if (buckets[targetB].length < B) {
          buckets[targetB].push(k);
          renderBuckets(targetB, k, buckets[targetB].length - 1);
          await delay(SPEED * 0.5);
          renderBuckets(targetB, k, -1); 
          logEntry(log, `<span class="tag ok">Insertado</span> Clave ${k} asignada a la Cubeta ${targetB}.`);
          status.innerHTML = `<span class="ok">Clave almacenada.</span>`;
        } else {
          logEntry(log, `<span class="tag no">Colisión</span> La Cubeta ${targetB} está llena. Enviando a Zona de Colisiones.`);
          overflow.push(k);
          renderOverflow(k, overflow.length - 1);
          await delay(SPEED * 0.5);
          renderOverflow(k, -1);
          status.innerHTML = `<span class="no">Clave guardada en Zona de Colisiones.</span>`;
        }
      } 
      // --- BÚSQUEDA Y ELIMINACIÓN ---
      else {
        let foundInBucket = false;
        let foundInOverflow = false;

        for (let i = 0; i < buckets[targetB].length; i++) {
          if (myToken !== cancelToken) { running = false; return; }
          renderBuckets(targetB, null, i);
          await delay(SPEED * 0.6);
          
          if (buckets[targetB][i] === k) {
            renderBuckets(targetB, k, -1);
            foundInBucket = true;
            logEntry(log, `<span class="tag ok">Encontrado</span> Clave ${k} en la Cubeta ${targetB}.`);
            
            if (mode === 'remove') {
              await delay(SPEED);
              buckets[targetB].splice(i, 1);
              renderBuckets();
              logEntry(log, `<span class="tag ok">Eliminado</span> Clave removida de la estructura principal.`);
              status.innerHTML = `<span class="ok">Registro eliminado exitosamente.</span>`;
              
              // FIX: Reubicación desde la zona de colisiones (Overflow)
              if (overflow.length > 0) {
                logEntry(log, `<span class="tag">Verificando</span> Escaneando Zona de Colisiones por claves compatibles...`);
                for (let j = 0; j < overflow.length; j++) {
                  let ovKey = overflow[j];
                  let ovHash = getHash(ovKey, currentMethod).bucketId;
                  
                  if (ovHash === targetB) {
                    logEntry(log, `<span class="tag ok">Reubicación</span> Espacio liberado. Moviendo clave <b>${ovKey}</b> a la Cubeta ${targetB}.`);
                    await delay(SPEED);
                    
                    overflow.splice(j, 1);
                    buckets[targetB].push(ovKey);
                    
                    renderOverflow();
                    renderBuckets(targetB, ovKey, buckets[targetB].length - 1);
                    await delay(SPEED * 0.5);
                    renderBuckets();
                    break; // Solo reubicamos 1 porque solo se liberó 1 espacio
                  }
                }
              }
            } else {
              status.innerHTML = `<span class="ok">¡Elemento encontrado!</span>`;
            }
            break;
          }
        }

        if (!foundInBucket) {
          logEntry(log, `<span class="tag">Desbordamiento</span> No hallado en cubeta principal. Buscando en Zona de Colisiones...`);
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

        if (!foundInBucket && !foundInOverflow) {
          logEntry(log, `<span class="tag no">✕</span> Búsqueda agotada. El elemento no existe.`);
          status.innerHTML = `<span class="no">El valor ${k} no se encuentra en el Hashmap.</span>`;
          renderBuckets();
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