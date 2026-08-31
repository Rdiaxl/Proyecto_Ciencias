const ExtSeq = (() => {
  let blocks = [];
  let indexTable = [];
  let running = false;
  let cancelToken = 0;
  const SPEED = 800;

  function generate() {
    const nInput = document.getElementById('extSeqN');
    let N = Number(nInput.value);
    if (N < 4) N = 4;
    
    // Cálculo de la raíz de N
    const blockSize = Math.ceil(Math.sqrt(N));
    document.getElementById('extSeqBlockSize').innerHTML = `Bloque (√${N}) = <b>${blockSize}</b>`;

    // Generar datos ordenados simulando un archivo secuencial indexado
    const data = randUniqueArray(N, 1, N * 3).sort((a, b) => a - b);
    
    blocks = [];
    indexTable = [];
    
    for (let i = 0; i < data.length; i += blockSize) {
      const chunk = data.slice(i, i + blockSize);
      blocks.push(chunk);
      indexTable.push({
        blockId: blocks.length - 1,
        maxKey: chunk[chunk.length - 1]
      });
    }

    renderDisk();
    renderIndex();
    document.getElementById('extSeqRam').innerHTML = `<span style="color:var(--text-dim); font-size:12px; font-family:'JetBrains Mono',monospace;">(La RAM está vacía)</span>`;
    document.getElementById('extSeqLog').innerHTML = '';
    document.getElementById('extSeqStatus').textContent = `Archivo creado: ${N} registros en ${blocks.length} bloques.`;
    running = false;
  }

  function renderDisk(activeBlock = -1, loadedBlock = -1) {
    const wrap = document.getElementById('extSeqDisk');
    wrap.innerHTML = blocks.map((chunk, i) => {
      let state = '';
      if (i === activeBlock) state = 'reading';
      if (i === loadedBlock) state = 'loaded';
      
      const cells = chunk.map(v => `<div class="cell"><div class="box" style="width:38px;height:38px;font-size:13px;">${v}</div></div>`).join('');
      return `<div class="disk-block ${state}"><h5>Bloque ${i}</h5><div class="cells-row">${cells}</div></div>`;
    }).join('');
  }

  function renderIndex(activeIndex = -1, foundIndex = -1) {
    const tbody = document.getElementById('extSeqIndex');
    tbody.innerHTML = indexTable.map((entry, i) => {
      let cls = '';
      if (i === activeIndex) cls = 'active';
      if (i === foundIndex) cls = 'found';
      return `<tr class="${cls}"><td>Bloque ${entry.blockId}</td><td>${entry.maxKey}</td></tr>`;
    }).join('');
  }

  function renderRam(chunk, target = null, compareIdx = -1, foundIdx = -1) {
    const wrap = document.getElementById('extSeqRam');
    
    // Si no se pasa un bloque (null), renderiza el estado vacío limpiamente.
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
  async function start(useIndex) {
    if (running) return;
    if (blocks.length === 0) generate();
    
    const targetInput = document.getElementById('extSeqTarget');
    const target = Number(targetInput.value);
    
    if (targetInput.value === '' || Number.isNaN(target)) {
      document.getElementById('extSeqStatus').innerHTML = '<span class="no">Escribe un objetivo numérico válido.</span>';
      return;
    }

    running = true;
    cancelToken++;
    const myToken = cancelToken;
    const log = document.getElementById('extSeqLog');
    const status = document.getElementById('extSeqStatus');
    
    log.innerHTML = '';
    status.innerHTML = `Buscando <b>${target}</b>...`;

    let targetBlockId = -1;

    // --- BÚSQUEDA CON ÍNDICES ---
    if (useIndex) {
      logEntry(log, `<span class="tag">Índices</span> Explorando tabla de índices en memoria RAM...`);
      await delay(SPEED);
      
      for (let i = 0; i < indexTable.length; i++) {
        if (myToken !== cancelToken) return;
        renderIndex(i);
        logEntry(log, `¿Objetivo <b>${target}</b> <= Clave Mayor <b>${indexTable[i].maxKey}</b>?`);
        await delay(SPEED * 0.8);
        
        if (target <= indexTable[i].maxKey) {
          renderIndex(-1, i);
          targetBlockId = i;
          logEntry(log, `<span class="tag ok">✓ Sí</span> El registro podría estar en el <b>Bloque ${i}</b>.`);
          await delay(SPEED);
          break;
        } else {
          logEntry(log, `<span class="tag no">✕ No</span> Descartando Bloque ${i}.`);
        }
      }

      if (targetBlockId === -1 && indexTable.length > 0) {
        // Si el objetivo es mayor a todos, por diseño secuencial podría estar en el último bloque, o simplemente no está.
        logEntry(log, `<span class="tag no">Aviso</span> El objetivo supera la clave mayor máxima. No está en el archivo.`);
        status.innerHTML = `<span class="no">No encontrado. (Ahorro total de I/O)</span>`;
        running = false;
        return;
      }
    }

    // --- BÚSQUEDA Y TRANSFERENCIA DE BLOQUES (I/O) ---
    const blocksToScan = useIndex ? [targetBlockId] : blocks.map((_, i) => i);
    let found = false;

    for (let b of blocksToScan) {
      if (myToken !== cancelToken) return;
      
      logEntry(log, `<span class="tag">I/O Disco</span> Leyendo <b>Bloque ${b}</b> del disco secundario...`);
      renderDisk(b);
      await delay(SPEED);
      
      logEntry(log, `Transfiriendo Bloque ${b} a memoria RAM principal...`);
      renderDisk(-1, b);
      const currentBlock = blocks[b];
      renderRam(currentBlock);
      await delay(SPEED);

      // Búsqueda secuencial interna dentro de la RAM
      for (let i = 0; i < currentBlock.length; i++) {
        if (myToken !== cancelToken) return;
        renderRam(currentBlock, target, i);
        await delay(SPEED * 0.5);

        if (currentBlock[i] === target) {
          renderRam(currentBlock, target, -1, i);
          logEntry(log, `<span class="tag ok">¡Éxito!</span> <b>${target}</b> encontrado en el Bloque ${b}, índice local ${i}.`);
          status.innerHTML = `<span class="ok">Encontrado en Bloque ${b}.</span>`;
          found = true;
          break;
        } else if (currentBlock[i] > target) {
          // Como está ordenado, si el valor actual es mayor, ya no está en este bloque
          break;
        }
      }
      
      if (found) break;
      
      logEntry(log, `<span class="tag no">No encontrado</span> en Bloque ${b}. Liberando memoria RAM...`);
      document.getElementById('extSeqRam').innerHTML = `<span style="color:var(--text-dim); font-size:12px; font-family:'JetBrains Mono',monospace;">(Memoria liberada)</span>`;
      renderDisk();
    }

    if (!found) {
      logEntry(log, `Fin de la búsqueda. El elemento no existe en el archivo.`);
      status.innerHTML = `<span class="no">Valor no encontrado en almacenamiento secundario.</span>`;
    }

    running = false;
  }

  return { generate, start };
})();