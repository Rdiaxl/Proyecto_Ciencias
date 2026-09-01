const ExtHash = (() => {
  let buckets = [];
  let M = 7;
  let B = 4;
  let running = false;
  let cancelToken = 0;
  const SPEED = 850;

  function generate() {
    M = Number(document.getElementById('extHashM').value);
    B = Number(document.getElementById('extHashB').value);
    if(M < 2) M = 2;
    if(B < 1) B = 1;

    buckets = Array.from({length: M}, () => []);
    renderDisk();
    renderRam(null);
    updateCalc('—', '—', '—');
    document.getElementById('extHashLog').innerHTML = '';
    document.getElementById('extHashStatus').textContent = `Disco preparado: ${M} cubetas de capacidad ${B}.`;
    running = false; // Resetear estado de seguridad
  }

  function getHash(k, method) {
    let steps = "";
    let h = 0;
    let absK = Math.abs(k); // Usamos valor absoluto siempre para evitar índices negativos
    let kStr = String(absK);
    
    // Las llaves {} en los cases evitan errores de sintaxis en JS al usar let/const
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
        if(isNaN(valB)) valB = absK; 
        h = valB % M;
        steps = `Base 16 = ${valB}₍₁₀₎ → ${valB} mod ${M}`;
        break;
      }
    }
    
    if (isNaN(h) || h < 0) h = 0; // Seguridad extra
    return { bucketId: h, calcText: steps };
  }

  function updateCalc(key, opText, resultText) {
    document.getElementById('ehCalcKey').textContent = key;
    document.getElementById('ehCalcOp').innerHTML = opText;
    document.getElementById('ehCalcResult').textContent = resultText;
    
    document.querySelectorAll('#extHashCalc .calc-box').forEach(b => {
      b.classList.remove('pulse');
      void b.offsetWidth;
      b.classList.add('pulse');
    });
  }

  function renderDisk(activeBucket = -1, loadedBucket = -1) {
    const wrap = document.getElementById('extHashDisk');
    wrap.innerHTML = buckets.map((chunk, i) => {
      let state = '';
      if (i === activeBucket) state = 'reading';
      if (i === loadedBucket) state = 'loaded';
      
      const emptyCellsCount = B - chunk.length;
      let cells = chunk.map(v => `<div class="cell"><div class="box" style="width:38px;height:38px;font-size:13px;border-color:var(--accent-found);">${v}</div></div>`).join('');
      
      for(let e=0; e<emptyCellsCount; e++) {
        cells += `<div class="cell"><div class="box" style="width:38px;height:38px;font-size:11px;opacity:0.2;">-</div></div>`;
      }

      return `<div class="disk-block ${state}"><h5>Cubeta ${i} <span style="text-transform:lowercase; color:var(--text-dim);">(${chunk.length}/${B})</span></h5><div class="cells-row" style="justify-content:flex-start;">${cells}</div></div>`;
    }).join('');
  }

  function renderRam(chunk, target = null, activeIdx = -1) {
    const wrap = document.getElementById('extHashRam');
    if (!chunk) {
      wrap.innerHTML = `<span style="color:var(--text-dim); font-size:12px; font-family:'JetBrains Mono',monospace;">(La RAM está vacía)</span>`;
      return;
    }
    wrap.innerHTML = chunk.map((v, i) => {
      let cls = (i === activeIdx) ? 'compare' : '';
      if (v === target && activeIdx === -1) cls = 'found'; 
      return `<div class="cell ${cls}"><div class="box">${v}</div></div>`;
    }).join('');
  }

  async function processHash(mode) {
    if (running) return;
    
    const keyInput = document.getElementById('extHashKey');
    const k = Number(keyInput.value);
    const status = document.getElementById('extHashStatus');
    const log = document.getElementById('extHashLog');

    // Validación temprana para evitar crasheos
    if (keyInput.value === '' || Number.isNaN(k)) {
      status.innerHTML = '<span class="no">Por favor, escribe una clave numérica válida.</span>';
      return;
    }

    running = true;
    try {
      cancelToken++;
      const myToken = cancelToken;
      const method = document.getElementById('extHashMethod').value;
      
      log.innerHTML = '';
      status.innerHTML = mode === 'insert' ? `Insertando <b>${k}</b>...` : `Buscando <b>${k}</b>...`;

      const hashData = getHash(k, method);
      const targetBucket = hashData.bucketId;
      
      logEntry(log, `<span class="tag">CPU</span> Aplicando Función Hash...`);
      updateCalc(k, 'Calculando...', '...');
      await delay(SPEED * 0.5);
      if (myToken !== cancelToken) return;

      updateCalc(k, hashData.calcText, targetBucket);
      logEntry(log, `Resultado: La clave corresponde a la <b>Cubeta ${targetBucket}</b>.`);
      await delay(SPEED);

      logEntry(log, `<span class="tag">I/O Disco</span> Localizando Cubeta ${targetBucket} en disco secundario...`);
      renderDisk(targetBucket, -1);
      await delay(SPEED);

      logEntry(log, `Transfiriendo Cubeta ${targetBucket} a memoria RAM...`);
      renderDisk(-1, targetBucket);
      renderRam(buckets[targetBucket], k);
      await delay(SPEED);

      if (mode === 'insert') {
        if (buckets[targetBucket].includes(k)) {
          logEntry(log, `<span class="tag no">Atención</span> La clave ${k} ya existe en la cubeta.`);
          status.innerHTML = `<span class="no">Clave duplicada.</span>`;
        } else if (buckets[targetBucket].length < B) {
          buckets[targetBucket].push(k);
          renderRam(buckets[targetBucket], k, buckets[targetBucket].length - 1);
          logEntry(log, `<span class="tag ok">¡Éxito!</span> Clave insertada correctamente en el bloque.`);
          status.innerHTML = `<span class="ok">Clave almacenada.</span>`;
        } else {
          logEntry(log, `<span class="tag no">Desbordamiento (Overflow)</span> La Cubeta ${targetBucket} está llena (Límite: ${B}). No se puede insertar.`);
          status.innerHTML = `<span class="no">Error: Colisión y desbordamiento.</span>`;
        }
      } else {
        const foundIdx = buckets[targetBucket].indexOf(k);
        if (foundIdx !== -1) {
          renderRam(buckets[targetBucket], k, -1);
          logEntry(log, `<span class="tag ok">Encontrado</span> Búsqueda exitosa con 1 solo acceso a disco.`);
          status.innerHTML = `<span class="ok">¡Elemento encontrado!</span>`;
        } else {
          logEntry(log, `<span class="tag no">No encontrado</span> Escaneo de cubeta en RAM terminado.`);
          status.innerHTML = `<span class="no">El elemento no existe en la base de datos.</span>`;
        }
      }
      
      renderDisk();
      keyInput.value = ''; // Limpiar input
    } catch (e) {
      console.error("Error en processHash:", e);
    } finally {
      // ESTO ES CLAVE: Garantiza que el botón siempre vuelva a funcionar
      running = false; 
    }
  }

  return { 
    generate, 
    insert: () => processHash('insert'), 
    search: () => processHash('search') 
  };
})();