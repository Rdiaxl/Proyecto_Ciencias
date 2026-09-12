// src/js/residuos-multiples.js
//
// BÚSQUEDA POR RESIDUOS MÚLTIPLES (Trie M-ario)
// (data-screen="busqueda-residuos-multiples")
//
// Igual que en el Trie Binario de Residuos, los nodos intermedios
// están vacíos y las letras se guardan solo en las hojas, pero en
// vez de leer 1 bit por nivel se leen "bloques" de k bits de una
// vez (k configurable), así cada nodo puede tener hasta 2^k ramas.
//
// El árbol es persistente entre operaciones: se puede insertar,
// buscar y eliminar una letra a la vez, además de poder cargar una
// palabra completa (reinicia el árbol e inserta cada letra en
// orden, una por una). Cambiar el tamaño de bloque (k) reinicia
// el árbol, porque cambia la forma en que se codifican los caminos.
//
// Eliminar: se ubica la hoja siguiendo los bloques y se vacía su
// letra; luego se podan hacia arriba los nodos-camino que quedan
// sin hijos y sin letra.
//
// Depende de: utils.js (delay, logEntry, setPcodeActive)
// ============================================================
const ResiduosMultiples = (() => {
  const WIDTH = 5; // bits por letra (alcanza para 1..26)
  let root = null;
  let history = []; // letras actualmente en el árbol, en orden de inserción
  let running = false;
  let cancelToken = 0;
  let nodeSeq = 0;
  let currentK = 2; // tamaño de bloque vigente en el árbol actual
  const SPEED = 850;

  function PCODE(op, k) {
    const maxRamas = Math.pow(2, k);
    if (op === 'buscar') {
      return [
        `función buscarResiduosMúltiples(raíz, letra, k=${k}):`,
        '    código = binario(letra, 5 bits)',
        `    bloques = partir código en grupos de ${k} bits`,
        '    nodo = raíz',
        '    para cada bloque en bloques:',
        '        r = valor decimal del bloque',
        '        si nodo.hijos[r] no existe: retornar no encontrada',
        '        nodo = nodo.hijos[r]',
        '    si nodo.letra == letra: encontrada;  si no: no encontrada'
      ];
    }
    if (op === 'eliminar') {
      return [
        `función eliminarResiduosMúltiples(raíz, letra, k=${k}):`,
        '    hoja = buscarResiduosMúltiples(raíz, letra)',
        '    si hoja no existe: retornar "no encontrada"',
        '    vaciar letra de la hoja',
        '    mientras el nodo actual no tenga hijos ni letra:',
        '        quitarlo de su padre y subir un nivel (podar)'
      ];
    }
    return [
      `función insertarResiduosMúltiples(raíz, letra, k=${k}):`,
      '    código = binario(letra, 5 bits)   // A=1 ... Z=26',
      `    bloques = partir código en grupos de ${k} bits (${maxRamas} ramas por nodo)`,
      '    nodo = raíz',
      '    para cada bloque en bloques:',
      '        r = valor decimal del bloque   // 0 .. 2^k - 1',
      '        si nodo.hijos[r] no existe: crearlo',
      '        nodo = nodo.hijos[r]',
      '    guardar letra en nodo (fin de los bloques)'
    ];
  }

  function renderPcode(op) {
    document.getElementById('resMulPcode').innerHTML =
      PCODE(op, currentK).map((l, i) => `<span data-line="${i + 1}">${l}</span>`).join('\n');
  }

  function normalizeLetters(raw) {
    return (raw || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .split('');
  }

  function letterCode(ch) {
    return ch.charCodeAt(0) - 'A'.charCodeAt(0) + 1; // A=1 ... Z=26
  }

  function toBinary(code) {
    return code.toString(2).padStart(WIDTH, '0');
  }

  function chunksOf(bin, k) {
    const chunks = [];
    for (let i = 0; i < bin.length; i += k) {
      chunks.push(bin.slice(i, Math.min(i + k, bin.length)));
    }
    return chunks;
  }

  function renderStrip(states = {}) {
    const strip = document.getElementById('resMulStrip');
    strip.innerHTML = history.map(({ ch, code, bin }) => {
      const st = states[ch] || '';
      return `<div class="letter-chip ${st}">
                <div class="l">${ch}</div>
                <div class="code">${code}</div>
                <div class="bin">${bin.split('').join(' ')}</div>
              </div>`;
    }).join('');
  }

  function newNode() {
    return { letra: null, children: {} };
  }

  function tagNode(node) {
    if (!node.__id) node.__id = ++nodeSeq;
    return node.__id;
  }

  function renderNode(node, edgeLabel, states) {
    if (!node) return '';
    const id = tagNode(node);
    const st = states[id] || '';
    const edge = edgeLabel !== null
      ? `<span class="redge">${edgeLabel} <small>(${parseInt(edgeLabel, 2)})</small></span>`
      : '';
    const isLeaf = node.letra !== null;
    const box = isLeaf
      ? `<div class="rnode ${st}">${node.letra}</div>`
      : `<div class="rnode-dot ${st}"></div>`;
    const childKeys = Object.keys(node.children);
    const kids = childKeys.length
      ? `<ul>${childKeys.map(k => `<li>${renderNode(node.children[k], k, states)}</li>`).join('')}</ul>`
      : '';
    return `<div class="rnode-wrap">${edge}${box}</div>${kids}`;
  }

  function renderTree(states = {}) {
    const wrap = document.getElementById('resMulTree');
    if (!root) {
      wrap.innerHTML = `<span style="color:var(--text-dim); font-size:12px; font-family:'JetBrains Mono',monospace;">(árbol vacío)</span>`;
      return;
    }
    wrap.innerHTML = `<ul class="rtree"><li>${renderNode(root, null, states)}</li></ul>`;
  }

  function setStatus(html) {
    document.getElementById('resMulStatus').innerHTML = html;
  }

  function getK() {
    return Number(document.getElementById('resMulBlockSize').value) || 2;
  }

  // ------------------------------------------------------------
  // Inserción (motor compartido por insertLetter y loadWord)
  // ------------------------------------------------------------
  async function doInsert(ch, myToken) {
    const code = letterCode(ch);
    const bin = toBinary(code);
    const chunks = chunksOf(bin, currentK);
    const log = document.getElementById('resMulLog');
    const pcode = document.getElementById('resMulPcode');
    const maxRamas = Math.pow(2, currentK);

    logEntry(log, `<span class="tag">letra</span> <b>${ch}</b> → binario <b>${bin}</b> → bloques [ ${chunks.join(' | ')} ]`);
    await delay(SPEED * 0.5);
    if (myToken !== cancelToken) return 'cancelled';

    if (!root) root = newNode();
    let cur = root;

    for (const chunk of chunks) {
      if (myToken !== cancelToken) return 'cancelled';
      const id = tagNode(cur);
      setPcodeActive(pcode, 5);
      renderTree({ [id]: 'compare' });
      await delay(SPEED * 0.35);
      if (myToken !== cancelToken) return 'cancelled';

      const r = parseInt(chunk, 2);
      setPcodeActive(pcode, 6);
      logEntry(log, `bloque <b>${chunk}</b> = rama nº <b>${r}</b> (de 0 a ${maxRamas - 1})`);
      await delay(SPEED * 0.4);
      if (myToken !== cancelToken) return 'cancelled';

      if (!cur.children[chunk]) {
        setPcodeActive(pcode, 7);
        cur.children[chunk] = newNode();
        logEntry(log, `no existía la rama <b>${chunk}</b> → se crea`);
      } else {
        logEntry(log, `la rama <b>${chunk}</b> ya existe → se comparte (prefijo común con otra letra)`);
      }
      setPcodeActive(pcode, 8);
      cur = cur.children[chunk];
      renderTree();
      await delay(SPEED * 0.4);
    }

    if (myToken !== cancelToken) return 'cancelled';
    setPcodeActive(pcode, 9);
    if (cur.letra !== null) {
      logEntry(log, `<span class="tag no">✕</span> La hoja ya está ocupada por <b>${cur.letra}</b> → se omite`);
      return 'duplicate';
    }
    cur.letra = ch;
    logEntry(log, `<span class="tag ok">✓</span> Fin de los bloques → se guarda <b>${ch}</b> en la hoja`);
    renderTree({ [tagNode(cur)]: 'found' });
    return 'inserted';
  }

  async function insertLetter() {
    if (running) return;
    const input = document.getElementById('resMulLetterInput');
    const letters = normalizeLetters(input.value);
    if (letters.length === 0) { setStatus('<span class="no">Escribe una letra (A-Z).</span>'); return; }
    const ch = letters[0];

    if (!root) currentK = getK(); // fija k al primer insertado

    running = true; cancelToken++; const myToken = cancelToken;
    const log = document.getElementById('resMulLog');
    log.innerHTML = '';
    renderPcode('insertar');
    setStatus(`Insertando <b>${ch}</b> (bloques de ${currentK} bit(s))…`);

    const result = await doInsert(ch, myToken);
    if (myToken !== cancelToken) { running = false; return; }

    if (result === 'inserted') {
      history.push({ ch, code: letterCode(ch), bin: toBinary(letterCode(ch)) });
      renderStrip({ [ch]: 'done' });
      setStatus(`<span class="ok">Letra ${ch} insertada.</span>`);
    } else if (result === 'duplicate') {
      renderStrip();
      setStatus(`<span class="no">La letra ${ch} ya está en el árbol.</span>`);
    }
    renderTree();
    input.value = '';
    running = false;
  }

  async function loadWord() {
    if (running) return;
    const input = document.getElementById('resMulWordInput');
    const letters = normalizeLetters(input.value);
    if (letters.length === 0) { setStatus('<span class="no">Escribe una palabra con al menos una letra (A-Z).</span>'); return; }

    currentK = getK();
    root = null; history = []; nodeSeq = 0;
    renderTree(); renderStrip();

    running = true; cancelToken++; const myToken = cancelToken;
    const log = document.getElementById('resMulLog');
    log.innerHTML = '';
    renderPcode('insertar');

    const seen = new Set();
    let insertedCount = 0, dupCount = 0;

    for (const ch of letters) {
      if (seen.has(ch)) continue;
      seen.add(ch);
      if (myToken !== cancelToken) return;
      setStatus(`Insertando <b>${ch}</b> (carga de palabra, bloques de ${currentK} bit(s))…`);
      const result = await doInsert(ch, myToken);
      if (myToken !== cancelToken) return;
      if (result === 'inserted') {
        history.push({ ch, code: letterCode(ch), bin: toBinary(letterCode(ch)) });
        insertedCount++;
        renderStrip({ [ch]: 'done' });
      } else if (result === 'duplicate') dupCount++;
      renderTree();
      await delay(SPEED * 0.25);
    }

    setStatus(`<span class="ok">Árbol cargado</span> con bloques de ${currentK} bit(s): ${insertedCount} letra(s) insertada(s)` +
      (dupCount > 0 ? `, ${dupCount} repetida(s) omitida(s).` : '.'));
    running = false;
  }

  function descend(bin) {
    const chunks = chunksOf(bin, currentK);
    const path = [{ node: root, viaChunk: null }];
    let cur = root;
    for (const chunk of chunks) {
      if (!cur) { path.push({ node: null, viaChunk: chunk }); continue; }
      const next = cur.children[chunk] || null;
      path.push({ node: next, viaChunk: chunk });
      cur = next;
    }
    return path;
  }

  async function searchLetter() {
    if (running) return;
    const input = document.getElementById('resMulLetterInput');
    const letters = normalizeLetters(input.value);
    if (letters.length === 0) { setStatus('<span class="no">Escribe una letra (A-Z) para buscar.</span>'); return; }
    const ch = letters[0];
    if (!root) { setStatus('<span class="no">El árbol está vacío.</span>'); return; }

    running = true; cancelToken++; const myToken = cancelToken;
    const log = document.getElementById('resMulLog');
    const pcode = document.getElementById('resMulPcode');
    log.innerHTML = '';
    renderPcode('buscar');
    renderStrip({ [ch]: 'active' });
    setStatus(`Buscando <b>${ch}</b> (bloques de ${currentK} bit(s))…`);

    const code = letterCode(ch);
    const bin = toBinary(code);
    const chunks = chunksOf(bin, currentK);
    let cur = root;
    let ok = true;

    setPcodeActive(pcode, 4);
    for (const chunk of chunks) {
      if (myToken !== cancelToken) return;
      if (!cur) { ok = false; break; }
      renderTree({ [tagNode(cur)]: 'compare' });
      const r = parseInt(chunk, 2);
      logEntry(log, `bloque <b>${chunk}</b> = rama nº <b>${r}</b>`);
      await delay(SPEED * 0.5);
      if (myToken !== cancelToken) return;
      setPcodeActive(pcode, 6);
      if (!cur.children[chunk]) { ok = false; cur = null; break; }
      cur = cur.children[chunk];
      renderTree();
      await delay(SPEED * 0.35);
    }

    setPcodeActive(pcode, 8);
    if (ok && cur && cur.letra === ch) {
      renderTree({ [tagNode(cur)]: 'found' });
      logEntry(log, `<span class="tag ok">✓</span> Hoja final contiene <b>${ch}</b> → <b>encontrada</b>`);
      setStatus(`<span class="ok">Letra ${ch} encontrada.</span>`);
      renderStrip({ [ch]: 'done' });
    } else {
      logEntry(log, `<span class="tag no">✕</span> El camino no lleva a una hoja con <b>${ch}</b> → <b>no encontrada</b>`);
      setStatus(`<span class="no">La letra ${ch} no está en el árbol.</span>`);
      renderStrip();
    }
    running = false;
  }

  async function deleteLetter() {
    if (running) return;
    const input = document.getElementById('resMulLetterInput');
    const letters = normalizeLetters(input.value);
    if (letters.length === 0) { setStatus('<span class="no">Escribe una letra (A-Z) para eliminar.</span>'); return; }
    const ch = letters[0];
    if (!root) { setStatus('<span class="no">El árbol está vacío.</span>'); return; }

    running = true; cancelToken++; const myToken = cancelToken;
    const log = document.getElementById('resMulLog');
    const pcode = document.getElementById('resMulPcode');
    log.innerHTML = '';
    renderPcode('eliminar');
    setStatus(`Buscando <b>${ch}</b> para eliminar…`);

    const code = letterCode(ch);
    const bin = toBinary(code);
    const path = descend(bin); // path[0]=raíz, path[i].viaChunk = bloque usado para llegar ahí
    const leaf = path[path.length - 1].node;

    setPcodeActive(pcode, 2);
    for (const step of path) {
      if (step.node) renderTree({ [tagNode(step.node)]: 'compare' });
      await delay(SPEED * 0.25);
    }

    if (!leaf || leaf.letra !== ch) {
      setPcodeActive(pcode, 3);
      logEntry(log, `<span class="tag no">✕</span> La letra ${ch} no está en el árbol.`);
      setStatus(`<span class="no">La letra ${ch} no existe en el árbol.</span>`);
      running = false;
      return;
    }

    setPcodeActive(pcode, 4);
    leaf.letra = null;
    logEntry(log, `<span class="tag ok">✓</span> Se vacía la hoja que contenía <b>${ch}</b>.`);
    renderTree({ [tagNode(leaf)]: 'compare' });
    await delay(SPEED * 0.5);
    if (myToken !== cancelToken) return;

    // Poda: desde la hoja hacia la raíz, quita nodos sin hijos y sin letra.
    setPcodeActive(pcode, 5);
    let prunedCount = 0;
    for (let i = path.length - 1; i > 0; i--) {
      const node = path[i].node;
      if (!node) continue;
      if (Object.keys(node.children).length > 0 || node.letra !== null) break;
      const parent = path[i - 1].node;
      delete parent.children[path[i].viaChunk];
      prunedCount++;
    }
    if (root && Object.keys(root.children).length === 0 && root.letra === null) root = null;

    if (prunedCount > 0) {
      logEntry(log, `Se podaron ${prunedCount} nodo(s) de camino que quedaron vacíos.`);
    }

    history = history.filter(h => h.ch !== ch);
    renderStrip();
    renderTree();
    setStatus(`<span class="ok">Letra ${ch} eliminada.</span>`);
    running = false;
  }

  function reset() {
    currentK = getK();
    root = null; history = []; nodeSeq = 0; running = false; cancelToken++;
    document.getElementById('resMulLog').innerHTML = '';
    renderPcode('insertar');
    renderStrip();
    renderTree();
    setStatus(`Árbol reiniciado (bloques de ${currentK} bit(s)). Inserta letras una por una, o carga una palabra completa.`);
  }

  return { insertLetter, searchLetter, deleteLetter, loadWord, reset, build: loadWord };
})();