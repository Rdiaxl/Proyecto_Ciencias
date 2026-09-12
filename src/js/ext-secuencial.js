const ExtSeq = (() => {
  let blocks = [];       // array de bloques; cada bloque es un array de tamaño fijo con números o null (vacío)
  let indexTable = [];
  let blockSize = 0;
  let numBlocks = 0;
  let running = false;
  let cancelToken = 0;
  const SPEED = 800;

  function currentN() {
    let N = Number(document.getElementById('extSeqN').value);
    if (N < 4) N = 4;
    return N;
  }

  function setupSizing(N) {
    // El tamaño de bloque depende de la raíz del número de registros
    blockSize = Math.ceil(Math.sqrt(N));
    numBlocks = Math.ceil(N / blockSize);
    document.getElementById('extSeqBlockSize').innerHTML = `Bloque (√${N}) = <b>${blockSize}</b> · Bloques = <b>${numBlocks}</b>`;

    const blockIndexInput = document.getElementById('extSeqBlockIndex');
    blockIndexInput.max = numBlocks - 1;
    blockIndexInput.value = 0;
  }

  function rebuildIndexTable() {
    indexTable = blocks.map((chunk, i) => {
      const filled = chunk.filter(v => v !== null);
      return {
        blockId: i,
        maxKey: filled.length ? filled[filled.length - 1] : null
      };
    });
  }

  function resetPanels(statusHtml) {
    renderDisk();
    renderIndex();
    renderRam(null);
    document.getElementById('extSeqLog').innerHTML = '';
    document.getElementById('extSeqStatus').innerHTML = statusHtml;
    running = false;
  }

  function generate() {
    const N = currentN();
    setupSizing(N);

    // Los bloques se crean vacíos: el usuario decide qué números va en cada uno
    blocks = Array.from({ length: numBlocks }, () => Array(blockSize).fill(null));
    rebuildIndexTable();

    resetPanels(`Se crearon <b>${numBlocks}</b> bloques vacíos de tamaño <b>${blockSize}</b>. Asigna números a cada uno (deben quedar en orden ascendente entre bloques).`);
  }

  function fillRandom() {
    const N = currentN();
    setupSizing(N);

    // Datos únicos y ordenados repartidos en bloques consecutivos: así el archivo
    // queda válido tanto para la búsqueda por bloques como para la búsqueda con índices.
    const data = randUniqueArray(N, 1, N * 3).sort((a, b) => a - b);
    blocks = [];
    for (let i = 0; i < numBlocks; i++) {
      const chunk = data.slice(i * blockSize, (i + 1) * blockSize);
      const padded = Array(blockSize).fill(null);
      chunk.forEach((v, j) => { padded[j] = v; });
      blocks.push(padded);
    }
    rebuildIndexTable();

    resetPanels(`Se generaron <b>${N}</b> registros aleatorios ordenados en <b>${numBlocks}</b> bloques.`);
  }

  function useManualArray() {
    const input = document.getElementById('extSeqManualInput');
    const raw = input.value.trim();
    const status = document.getElementById('extSeqStatus');

    if (raw === '') {
      status.innerHTML = '<span class="no">Escribe al menos un número (separados por comas).</span>';
      return;
    }

    const parts = raw.split(/[,\s]+/).filter(Boolean);
    const nums = parts.map(Number);

    if (nums.some(n => Number.isNaN(n))) {
      status.innerHTML = '<span class="no">Solo se permiten números, separados por comas o espacios.</span>';
      return;
    }
    if (nums.length < 4) {
      status.innerHTML = '<span class="no">Ingresa al menos 4 números para formar bloques.</span>';
      return;
    }

    const data = [...new Set(nums)].sort((a, b) => a - b);
    document.getElementById('extSeqN').value = data.length;
    setupSizing(data.length);

    blocks = [];
    for (let i = 0; i < numBlocks; i++) {
      const chunk = data.slice(i * blockSize, (i + 1) * blockSize);
      const padded = Array(blockSize).fill(null);
      chunk.forEach((v, j) => { padded[j] = v; });
      blocks.push(padded);
    }
    rebuildIndexTable();

    renderDisk();
    renderIndex();
    document.getElementById('extSeqRam').innerHTML = `<span style="color:var(--text-dim); font-size:12px; font-family:'JetBrains Mono',monospace;">(La RAM está vacía)</span>`;
    document.getElementById('extSeqLog').innerHTML = '';
    running = false;
    status.innerHTML = `<span class="ok">Archivo personalizado cargado y ordenado (${data.length} registros en ${blocks.length} bloques).</span>`;
  }

  // Rango (min,max) de valores llenos de un bloque, o null si está totalmente vacío.
  function blockRange(chunk) {
    const filled = chunk.filter(v => v !== null);
    if (filled.length === 0) return null;
    return { min: filled[0], max: filled[filled.length - 1] };
  }

  // Bloque más cercano con datos, buscando hacia atrás o hacia adelante desde idx (sin incluirlo).
  function nearestFilledRange(fromIdx, direction) {
    for (let i = fromIdx + direction; i >= 0 && i < blocks.length; i += direction) {
      const range = blockRange(blocks[i]);
      if (range) return range;
    }
    return null;
  }

  function assignBlock() {
    const status = document.getElementById('extSeqStatus');

    if (blocks.length === 0) {
      status.innerHTML = '<span class="no">Primero genera los bloques.</span>';
      return;
    }

    const idxInput = document.getElementById('extSeqBlockIndex');
    const idx = Number(idxInput.value);

    if (!Number.isInteger(idx) || idx < 0 || idx >= numBlocks) {
      status.innerHTML = `<span class="no">Elige un bloque válido (0 a ${numBlocks - 1}).</span>`;
      return;
    }

    const raw = document.getElementById('extSeqBlockNumbers').value.trim();
    if (raw === '') {
      status.innerHTML = '<span class="no">Escribe al menos un número para asignar al bloque.</span>';
      return;
    }

    const parts = raw.split(/[,\s]+/).filter(Boolean);
    const nums = parts.map(Number);

    if (nums.some(n => Number.isNaN(n))) {
      status.innerHTML = '<span class="no">Solo se permiten números, separados por comas o espacios.</span>';
      return;
    }

    // Si sobran números respecto a la capacidad del bloque, se avisa y no se asigna nada.
    if (nums.length > blockSize) {
      status.innerHTML = `<span class="no">Son demasiados números para el Bloque ${idx}: capacidad máxima ${blockSize}, recibiste ${nums.length}.</span>`;
      return;
    }

    const sorted = [...nums].sort((a, b) => a - b);
    const candidateMin = sorted[0];
    const candidateMax = sorted[sorted.length - 1];

    // Tanto la búsqueda por bloques como la búsqueda con índices asumen que
    // Bloque(i) < Bloque(i+1) en todo su rango. Se valida contra el bloque
    // lleno más cercano a cada lado antes de guardar.
    const prevRange = nearestFilledRange(idx, -1);
    const nextRange = nearestFilledRange(idx, 1);

    if (prevRange && candidateMin < prevRange.max) {
      status.innerHTML = `<span class="no">Los valores del Bloque ${idx} deben ser mayores o iguales a ${prevRange.max} (fin del bloque anterior con datos), para que el archivo quede ordenado.</span>`;
      return;
    }
    if (nextRange && candidateMax > nextRange.min) {
      status.innerHTML = `<span class="no">Los valores del Bloque ${idx} deben ser menores o iguales a ${nextRange.min} (inicio del bloque siguiente con datos), para que el archivo quede ordenado.</span>`;
      return;
    }

    // Si faltan números respecto a la capacidad, los espacios restantes quedan en blanco (null).
    const newBlock = Array(blockSize).fill(null);
    sorted.forEach((v, i) => { newBlock[i] = v; });
    blocks[idx] = newBlock;
    rebuildIndexTable();

    renderDisk();
    renderIndex();
    document.getElementById('extSeqBlockNumbers').value = '';
    status.innerHTML = `<span class="ok">Bloque ${idx} actualizado: ${sorted.length}/${blockSize} espacios llenos.</span>`;
  }

  function renderDisk(activeBlock = -1, loadedBlock = -1) {
    const wrap = document.getElementById('extSeqDisk');
    wrap.innerHTML = blocks.map((chunk, i) => {
      let state = '';
      if (i === activeBlock) state = 'reading';
      if (i === loadedBlock) state = 'loaded';

      const cells = chunk.map(v => {
        if (v === null) {
          return `<div class="cell empty"><div class="box" style="width:38px;height:38px;font-size:11px;">—</div></div>`;
        }
        return `<div class="cell"><div class="box" style="width:38px;height:38px;font-size:13px;">${v}</div></div>`;
      }).join('');
      return `<div class="disk-block ${state}"><h5>Bloque ${i}</h5><div class="cells-row">${cells}</div></div>`;
    }).join('');
  }

  function renderIndex(activeIndex = -1, foundIndex = -1) {
    const tbody = document.getElementById('extSeqIndex');
    tbody.innerHTML = indexTable.map((entry, i) => {
      let cls = '';
      if (i === activeIndex) cls = 'active';
      if (i === foundIndex) cls = 'found';
      const maxKeyLabel = entry.maxKey === null ? '—' : entry.maxKey;
      return `<tr class="${cls}"><td>Bloque ${entry.blockId}</td><td>${maxKeyLabel}</td></tr>`;
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

    if (blocks.length === 0) {
      document.getElementById('extSeqStatus').innerHTML = '<span class="no">Primero genera los bloques y asigna sus números.</span>';
      return;
    }

    // No se puede buscar si hay bloques totalmente vacíos: romperían el recorrido secuencial y la tabla de índices.
    const emptyBlockIdx = blocks.findIndex(chunk => chunk.every(v => v === null));
    if (emptyBlockIdx !== -1) {
      document.getElementById('extSeqStatus').innerHTML = `<span class="no">El Bloque ${emptyBlockIdx} no tiene números asignados. Complétalo antes de buscar.</span>`;
      return;
    }

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
      const currentBlock = blocks[b].filter(v => v !== null);
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

  return { generate, fillRandom, start, useManualArray, assignBlock };
})();
