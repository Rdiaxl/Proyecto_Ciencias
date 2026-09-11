const ExtBin = (() => {
  let blocks = [];      // array de bloques; cada bloque es un array de tamaño fijo con números o null (vacío)
  let blockSize = 0;
  let numBlocks = 0;
  let running = false;
  let cancelToken = 0;
  const SPEED = 850;

  function currentN() {
    let N = Number(document.getElementById('extBinN').value);
    if (N < 4) N = 4;
    return N;
  }

  function setupSizing(N) {
    // Igual que en la Secuencial Externa: el tamaño de bloque depende de la raíz de N
    blockSize = Math.ceil(Math.sqrt(N));
    numBlocks = Math.ceil(N / blockSize);
    document.getElementById('extBinBlockSize').innerHTML = `Bloque (√${N}) = <b>${blockSize}</b> · Bloques = <b>${numBlocks}</b>`;

    const blockIndexInput = document.getElementById('extBinBlockIndex');
    blockIndexInput.max = numBlocks - 1;
    blockIndexInput.value = 0;
  }

  function resetPanels(statusHtml) {
    renderDisk(-1, -1, -1);
    renderRam(null);
    document.getElementById('extBinLog').innerHTML = '';
    document.getElementById('extBinStatus').innerHTML = statusHtml;
    running = false;
  }

  function generate() {
    const N = currentN();
    setupSizing(N);

    // Los bloques se crean vacíos: el usuario decide qué números va en cada uno
    blocks = Array.from({ length: numBlocks }, () => Array(blockSize).fill(null));

    resetPanels(`Se crearon <b>${numBlocks}</b> bloques vacíos de tamaño <b>${blockSize}</b>. Asigna números a cada uno (deben quedar en orden ascendente entre bloques) o usa "Rellenar Aleatoriamente".`);
  }

  function fillRandom() {
    const N = currentN();
    setupSizing(N);

    // Datos únicos y ordenados repartidos en bloques consecutivos: así el disco
    // queda válido para la búsqueda binaria (bloque i siempre < bloque i+1).
    const data = randUniqueArray(N, 1, N * 4).sort((a, b) => a - b);
    blocks = [];
    for (let i = 0; i < numBlocks; i++) {
      const chunk = data.slice(i * blockSize, (i + 1) * blockSize);
      const padded = Array(blockSize).fill(null);
      chunk.forEach((v, j) => { padded[j] = v; });
      blocks.push(padded);
    }

    resetPanels(`Se generaron <b>${N}</b> registros aleatorios ordenados en <b>${numBlocks}</b> bloques.`);
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
    const status = document.getElementById('extBinStatus');

    if (blocks.length === 0) {
      status.innerHTML = '<span class="no">Primero genera los bloques.</span>';
      return;
    }

    const idxInput = document.getElementById('extBinBlockIndex');
    const idx = Number(idxInput.value);

    if (!Number.isInteger(idx) || idx < 0 || idx >= numBlocks) {
      status.innerHTML = `<span class="no">Elige un bloque válido (0 a ${numBlocks - 1}).</span>`;
      return;
    }

    const raw = document.getElementById('extBinBlockNumbers').value.trim();
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

    // La búsqueda binaria por bloques asume que Bloque(i) < Bloque(i+1) en todo su rango.
    // Se valida contra el bloque lleno más cercano a cada lado antes de guardar.
    const prevRange = nearestFilledRange(idx, -1);
    const nextRange = nearestFilledRange(idx, 1);

    if (prevRange && candidateMin < prevRange.max) {
      status.innerHTML = `<span class="no">Los valores del Bloque ${idx} deben ser mayores o iguales a ${prevRange.max} (fin del bloque anterior con datos), para que el disco quede ordenado.</span>`;
      return;
    }
    if (nextRange && candidateMax > nextRange.min) {
      status.innerHTML = `<span class="no">Los valores del Bloque ${idx} deben ser menores o iguales a ${nextRange.min} (inicio del bloque siguiente con datos), para que el disco quede ordenado.</span>`;
      return;
    }

    // Si faltan números respecto a la capacidad, los espacios restantes quedan en blanco (null).
    const newBlock = Array(blockSize).fill(null);
    sorted.forEach((v, i) => { newBlock[i] = v; });
    blocks[idx] = newBlock;

    renderDisk(-1, -1, -1);
    document.getElementById('extBinBlockNumbers').value = '';
    status.innerHTML = `<span class="ok">Bloque ${idx} actualizado: ${sorted.length}/${blockSize} espacios llenos.</span>`;
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

      const cells = chunk.map(v => {
        if (v === null) {
          return `<div class="cell empty"><div class="box" style="width:38px;height:38px;font-size:11px;">—</div></div>`;
        }
        return `<div class="cell"><div class="box" style="width:38px;height:38px;font-size:13px;">${v}</div></div>`;
      }).join('');
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

    if (blocks.length === 0) {
      document.getElementById('extBinStatus').innerHTML = '<span class="no">Primero genera los bloques y asigna sus números.</span>';
      return;
    }

    // No se puede buscar si hay bloques totalmente vacíos: no tendrían rango de comparación.
    const emptyBlockIdx = blocks.findIndex(chunk => chunk.every(v => v === null));
    if (emptyBlockIdx !== -1) {
      document.getElementById('extBinStatus').innerHTML = `<span class="no">El Bloque ${emptyBlockIdx} no tiene números asignados. Complétalo antes de buscar.</span>`;
      return;
    }

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
      const filled = blocks[mid].filter(v => v !== null);
      renderRam(filled);
      await delay(SPEED);

      const first = filled[0];
      const last = filled[filled.length - 1];
      logEntry(log, `Límites del Bloque ${mid} (${filled.length}/${blockSize} llenos): Menor=<b>${first}</b>, Mayor=<b>${last}</b>`);
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
        let innerHi = filled.length - 1;
        let innerFound = false;

        while (innerLo <= innerHi) {
          if (myToken !== cancelToken) return;
          let innerMid = Math.floor((innerLo + innerHi) / 2);
          renderRam(filled, target, innerMid);
          logEntry(log, `Comparando con índice local ${innerMid} (Valor: <b>${filled[innerMid]}</b>)`);
          await delay(SPEED * 0.8);

          if (filled[innerMid] === target) {
            renderRam(filled, target, -1, innerMid);
            logEntry(log, `<span class="tag ok">¡Éxito!</span> <b>${target}</b> encontrado en Bloque ${mid}, índice local ${innerMid}.`);
            status.innerHTML = `<span class="ok">Encontrado en el Bloque ${mid}.</span>`;
            innerFound = true;
            found = true;
            break;
          } else if (filled[innerMid] < target) {
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

  return { generate, fillRandom, start, assignBlock };
})();
