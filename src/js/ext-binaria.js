const ExtBin = (() => {
  let blocks = [];
  let running = false;
  let cancelToken = 0;
  const SPEED = 850;

  function generate() {
    const nInput = document.getElementById('extBinN');
    let N = Number(nInput.value);
    if (N < 4) N = 4;
    
    const blockSize = Math.ceil(Math.sqrt(N));
    document.getElementById('extBinBlockSize').innerHTML = `Bloque = <b>${blockSize}</b>`;

    // Archivo estrictamente ordenado y sin repetidos
    const data = randUniqueArray(N, 1, N * 4).sort((a, b) => a - b);
    blocks = [];
    
    for (let i = 0; i < data.length; i += blockSize) {
      blocks.push(data.slice(i, i + blockSize));
    }

    renderDisk(-1, -1, -1);
    renderRam(null);
    document.getElementById('extBinLog').innerHTML = '';
    document.getElementById('extBinStatus').textContent = `Archivo creado: ${N} registros en ${blocks.length} bloques.`;
    running = false;
  }

  function renderDisk(lo = -1, mid = -1, hi = -1) {
    const wrap = document.getElementById('extBinDisk');
    wrap.innerHTML = blocks.map((chunk, i) => {
      let state = '';
      let label = `Bloque ${i}`;
      let styleOpacity = '';
      
      if (i === mid) {
        state = 'loaded'; // Bloque transferido a RAM
        label += ` <span style="color:var(--accent-found); font-size:10px;">[MEDIO]</span>`;
      } else if (lo !== -1 && (i < lo || i > hi)) {
        // Bloques descartados por la partición binaria
        styleOpacity = 'opacity: 0.25; filter: grayscale(1);';
      }
      
      const cells = chunk.map(v => `<div class="cell"><div class="box" style="width:38px;height:38px;font-size:13px;">${v}</div></div>`).join('');
      return `<div class="disk-block ${state}" style="${styleOpacity}"><h5>${label}</h5><div class="cells-row">${cells}</div></div>`;
    }).join('');
  }

  function renderRam(chunk, target = null, compareIdx = -1, foundIdx = -1) {
    const wrap = document.getElementById('extBinRam');
    if (!chunk) {
      wrap.innerHTML = `<span style="color:var(--text-dim); font-size:12px; font-family:'JetBrains Mono',monospace;">(La RAM está vacía)</span>`;
      return;
    }

    wrap.innerHTML = chunk.map((v, i) => {
      let cls = '';
      if (i === compareIdx) cls = 'compare';
      if (i === foundIdx) cls = 'found';
      return `<div class="cell ${cls}"><div class="box">${v}</div></div>`;
    }).join('');
  }

  async function start() {
    if (running) return;
    if (blocks.length === 0) generate();
    
    const targetInput = document.getElementById('extBinTarget');
    const target = Number(targetInput.value);
    if (targetInput.value === '' || Number.isNaN(target)) {
      document.getElementById('extBinStatus').innerHTML = '<span class="no">Escribe un objetivo numérico válido.</span>';
      return;
    }

    running = true;
    cancelToken++;
    const myToken = cancelToken;
    const log = document.getElementById('extBinLog');
    const status = document.getElementById('extBinStatus');
    
    log.innerHTML = '';
    status.innerHTML = `Buscando <b>${target}</b>...`;

    let lo = 0;
    let hi = blocks.length - 1;
    let found = false;

    while (lo <= hi) {
      if (myToken !== cancelToken) return;
      
      const mid = Math.floor((lo + hi) / 2);
      logEntry(log, `<span class="tag">Espacio</span> Evaluando bloques del ${lo} al ${hi}. Centro = <b>Bloque ${mid}</b>`);
      renderDisk(lo, mid, hi);
      await delay(SPEED);
      if (myToken !== cancelToken) return;

      logEntry(log, `<span class="tag">I/O Disco</span> Leyendo <b>Bloque ${mid}</b> y transfiriendo a RAM...`);
      const currentBlock = blocks[mid];
      renderRam(currentBlock);
      await delay(SPEED);

      const first = currentBlock[0];
      const last = currentBlock[currentBlock.length - 1];
      logEntry(log, `Límites del Bloque ${mid}: Menor=<b>${first}</b>, Mayor=<b>${last}</b>`);
      await delay(SPEED * 0.8);

      if (target < first) {
        logEntry(log, `Objetivo ${target} es menor que ${first}. Descartando mitad derecha del disco.`);
        hi = mid - 1;
      } else if (target > last) {
        logEntry(log, `Objetivo ${target} es mayor que ${last}. Descartando mitad izquierda del disco.`);
        lo = mid + 1;
      } else {
        // Si el objetivo está entre el primer y último registro, tiene que estar en este bloque.
        logEntry(log, `El objetivo está dentro de los límites del bloque. Iniciando búsqueda binaria interna en RAM...`);
        await delay(SPEED * 0.5);
        
        let innerLo = 0;
        let innerHi = currentBlock.length - 1;
        let innerFound = false;

        while(innerLo <= innerHi) {
           if (myToken !== cancelToken) return;
           let innerMid = Math.floor((innerLo + innerHi) / 2);
           renderRam(currentBlock, target, innerMid);
           logEntry(log, `Comparando con índice local ${innerMid} (Valor: <b>${currentBlock[innerMid]}</b>)`);
           await delay(SPEED * 0.8);

           if (currentBlock[innerMid] === target) {
              renderRam(currentBlock, target, -1, innerMid);
              logEntry(log, `<span class="tag ok">¡Éxito!</span> <b>${target}</b> encontrado en Bloque ${mid}, índice local ${innerMid}.`);
              status.innerHTML = `<span class="ok">Encontrado en el Bloque ${mid}.</span>`;
              innerFound = true;
              found = true;
              break;
           } else if (currentBlock[innerMid] < target) {
              innerLo = innerMid + 1;
           } else {
              innerHi = innerMid - 1;
           }
        }

        if (!innerFound) {
           logEntry(log, `<span class="tag no">No encontrado</span> El objetivo debería estar en este bloque, pero no existe.`);
           status.innerHTML = `<span class="no">Valor no existe en el archivo.</span>`;
        }
        break; // Al terminar de revisar el bloque correcto, se acaba la búsqueda.
      }
      
      if (!found && lo <= hi) {
        logEntry(log, `Liberando RAM para el próximo salto de disco...`);
        renderRam(null);
        await delay(SPEED * 0.5);
      }
    }

    if (!found && lo > hi) {
       renderDisk(-1, -1, -1);
       logEntry(log, `<span class="tag no">✕</span> Se agotó el espacio de búsqueda. No encontrado.`);
       status.innerHTML = `<span class="no">Valor no encontrado en el disco.</span>`;
    }
    
    running = false;
  }

  return { generate, start };
})();