// src/js/busqueda-residuos.js
//
// BÚSQUEDA POR RESIDUOS (Trie Binario)
// (data-screen="busqueda-residuos")
//
// Los nodos intermedios están siempre vacíos: son solo "caminos".
// Cada letra se inserta recorriendo sus 5 bits (MSB primero) uno
// por uno -bit 0 = izquierda, bit 1 = derecha- creando los nodos
// intermedios que hagan falta, y solo al llegar al final del
// camino (nivel 5) se guarda la letra en ese nodo hoja.
//
// El árbol es persistente entre operaciones: se puede insertar,
// buscar y eliminar una letra a la vez, además de poder cargar
// una palabra completa (reinicia el árbol e inserta cada letra
// en orden, una por una).
//
// Eliminar: se ubica la hoja (nivel 5) y se vacía su letra; luego
// se podan hacia arriba los nodos-camino que quedan sin hijos y
// sin letra, para no dejar ramas muertas colgando.
//
// Depende de: utils.js (delay, logEntry, setPcodeActive)
// ============================================================
const Residuos = (() => {
  const WIDTH = 5; // bits por letra (alcanza para 1..26)
  const SPEED = 850;
  let root = null;
  let history = []; // letras actualmente en el árbol, en orden de inserción
  let running = false;
  let cancelToken = 0;
  let nodeSeq = 0;

  const PCODE = {
    insertar: [
      'función insertarResiduos(raíz, letra):',
      '    código = binario(letra, 5 bits)   // A=1 ... Z=26',
      '    nodo = raíz;  nivel = 1',
      '    mientras nivel <= 5:',
      '        b = bit nivel-ésimo de código',
      '        si b == 0: crear (si falta) y bajar a nodo.izquierda',
      '        si no: crear (si falta) y bajar a nodo.derecha',
      '        nivel = nivel + 1',
      '    guardar letra en el nodo hoja (fin del camino)'
    ],
    buscar: [
      'función buscarResiduos(raíz, letra):',
      '    código = binario(letra, 5 bits)',
      '    nodo = raíz;  nivel = 1',
      '    mientras nodo != nulo y nivel <= 5:',
      '        b = bit nivel-ésimo de código',
      '        nodo = (b==0) ? nodo.izquierda : nodo.derecha',
      '        nivel = nivel + 1',
      '    si nodo != nulo y nodo.letra == letra: encontrada',
      '    si no: no encontrada'
    ],
    eliminar: [
      'función eliminarResiduos(raíz, letra):',
      '    hoja = buscarResiduos(raíz, letra)',
      '    si hoja no existe: retornar "no encontrada"',
      '    vaciar letra de la hoja',
      '    mientras el nodo actual no tenga hijos ni letra:',
      '        quitarlo de su padre y subir un nivel (podar)'
    ]
  };

  function renderPcode(op) {
    document.getElementById('resTriePcode').innerHTML =
      PCODE[op].map((l, i) => `<span data-line="${i + 1}">${l}</span>`).join('\n');
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

  function renderStrip(states = {}) {
    const strip = document.getElementById('resTrieStrip');
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
    return { letra: null, left: null, right: null };
  }

  let _tagCounter = nodeSeq;
  function tagNode(node) {
    if (!node.__id) node.__id = ++nodeSeq;
    return node.__id;
  }

  function renderNode(node, edgeLabel, states) {
    if (!node) return '';
    const id = tagNode(node);
    const st = states[id] || '';
    const edge = edgeLabel !== null ? `<span class="redge">${edgeLabel}</span>` : '';
    const isLeaf = node.letra !== null;
    const box = isLeaf
      ? `<div class="rnode ${st}">${node.letra}</div>`
      : `<div class="rnode-dot ${st}"></div>`;
    const kids = (node.left || node.right)
      ? `<ul>
           ${node.left ? `<li>${renderNode(node.left, 0, states)}</li>` : ''}
           ${node.right ? `<li>${renderNode(node.right, 1, states)}</li>` : ''}
         </ul>`
      : '';
    return `<div class="rnode-wrap">${edge}${box}</div>${kids}`;
  }

  function renderTree(states = {}) {
    const wrap = document.getElementById('resTrieTree');
    if (!root) {
      wrap.innerHTML = `<span style="color:var(--text-dim); font-size:12px; font-family:'JetBrains Mono',monospace;">(árbol vacío)</span>`;
      return;
    }
    wrap.innerHTML = `<ul class="rtree"><li>${renderNode(root, null, states)}</li></ul>`;
  }

  function setStatus(html) {
    document.getElementById('resTrieStatus').innerHTML = html;
  }

  // ------------------------------------------------------------
  // Inserción (motor compartido por insertLetter y loadWord)
  // ------------------------------------------------------------
  async function doInsert(ch, myToken) {
    const code = letterCode(ch);
    const bin = toBinary(code);
    const log = document.getElementById('resTrieLog');
    const pcode = document.getElementById('resTriePcode');

    logEntry(log, `<span class="tag">letra</span> <b>${ch}</b> → código ${code} → binario <b>${bin}</b>`);
    await delay(SPEED * 0.45);
    if (myToken !== cancelToken) return 'cancelled';

    if (!root) root = newNode();
    let cur = root;

    for (let level = 1; level <= WIDTH; level++) {
      if (myToken !== cancelToken) return 'cancelled';
      const id = tagNode(cur);
      setPcodeActive(pcode, 4);
      renderTree({ [id]: 'compare' });
      await delay(SPEED * 0.35);
      if (myToken !== cancelToken) return 'cancelled';

      const b = bin[level - 1];
      logEntry(log, `bit ${level}º de ${ch} (${bin}) = <b>${b}</b>`);
      await delay(SPEED * 0.35);
      if (myToken !== cancelToken) return 'cancelled';

      if (b === '0') {
        setPcodeActive(pcode, 5);
        if (!cur.left) { cur.left = newNode(); logEntry(log, `nivel ${level}: b = 0 → se crea camino a la <b>izquierda</b>`); }
        else logEntry(log, `nivel ${level}: b = 0 → ya existe camino a la <b>izquierda</b>, se comparte`);
        cur = cur.left;
      } else {
        setPcodeActive(pcode, 6);
        if (!cur.right) { cur.right = newNode(); logEntry(log, `nivel ${level}: b = 1 → se crea camino a la <b>derecha</b>`); }
        else logEntry(log, `nivel ${level}: b = 1 → ya existe camino a la <b>derecha</b>, se comparte`);
        cur = cur.right;
      }
      setPcodeActive(pcode, 7);
      renderTree();
      await delay(SPEED * 0.4);
    }

    if (myToken !== cancelToken) return 'cancelled';
    setPcodeActive(pcode, 8);
    if (cur.letra !== null) {
      logEntry(log, `<span class="tag no">✕</span> La hoja ya está ocupada por <b>${cur.letra}</b> → se omite`);
      return 'duplicate';
    }
    cur.letra = ch;
    setPcodeActive(pcode, 9);
    logEntry(log, `<span class="tag ok">✓</span> Fin del camino → se guarda <b>${ch}</b> en la hoja`);
    renderTree({ [tagNode(cur)]: 'found' });
    return 'inserted';
  }

  async function insertLetter() {
    if (running) return;
    const input = document.getElementById('resTrieLetterInput');
    const letters = normalizeLetters(input.value);
    if (letters.length === 0) { setStatus('<span class="no">Escribe una letra (A-Z).</span>'); return; }
    const ch = letters[0];

    running = true; cancelToken++; const myToken = cancelToken;
    const log = document.getElementById('resTrieLog');
    log.innerHTML = '';
    renderPcode('insertar');
    setStatus(`Insertando <b>${ch}</b>…`);

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
    const input = document.getElementById('resTrieWordInput');
    const letters = normalizeLetters(input.value);
    if (letters.length === 0) { setStatus('<span class="no">Escribe una palabra con al menos una letra (A-Z).</span>'); return; }

    root = null; history = []; nodeSeq = 0;
    renderTree(); renderStrip();

    running = true; cancelToken++; const myToken = cancelToken;
    const log = document.getElementById('resTrieLog');
    log.innerHTML = '';
    renderPcode('insertar');

    const seen = new Set();
    let insertedCount = 0, dupCount = 0;

    for (const ch of letters) {
      if (seen.has(ch)) continue;
      seen.add(ch);
      if (myToken !== cancelToken) return;
      setStatus(`Insertando <b>${ch}</b> (carga de palabra)…`);
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

    setStatus(`<span class="ok">Árbol cargado:</span> ${insertedCount} letra(s) insertada(s)` +
      (dupCount > 0 ? `, ${dupCount} repetida(s) omitida(s).` : '.'));
    running = false;
  }

  // Desciende por los punteros existentes (sin crear nada) siguiendo el
  // código de la letra buscada. Devuelve la ruta completa (para poder podar).
  function descend(code, bin) {
    const path = [{ node: root, parentDir: null }]; // path[0] = raíz
    let cur = root;
    for (let level = 1; level <= WIDTH && cur; level++) {
      const b = bin[level - 1];
      const next = (b === '0') ? cur.left : cur.right;
      path.push({ node: next, parentDir: b === '0' ? 'left' : 'right' });
      cur = next;
    }
    return path; // path[path.length-1].node es la posible hoja (o null si no existe)
  }

  async function searchLetter() {
    if (running) return;
    const input = document.getElementById('resTrieLetterInput');
    const letters = normalizeLetters(input.value);
    if (letters.length === 0) { setStatus('<span class="no">Escribe una letra (A-Z) para buscar.</span>'); return; }
    const ch = letters[0];
    if (!root) { setStatus('<span class="no">El árbol está vacío.</span>'); return; }

    running = true; cancelToken++; const myToken = cancelToken;
    const log = document.getElementById('resTrieLog');
    const pcode = document.getElementById('resTriePcode');
    log.innerHTML = '';
    renderPcode('buscar');
    renderStrip({ [ch]: 'active' });
    setStatus(`Buscando <b>${ch}</b>…`);

    const code = letterCode(ch);
    const bin = toBinary(code);
    let cur = root;

    setPcodeActive(pcode, 3);
    for (let level = 1; level <= WIDTH && cur; level++) {
      if (myToken !== cancelToken) return;
      renderTree({ [tagNode(cur)]: 'compare' });
      const b = bin[level - 1];
      logEntry(log, `<span class="tag">nivel ${level}</span> bit = <b>${b}</b> → ${b === '0' ? 'izquierda' : 'derecha'}`);
      await delay(SPEED * 0.55);
      if (myToken !== cancelToken) return;
      setPcodeActive(pcode, 5);
      cur = (b === '0') ? cur.left : cur.right;
      renderTree();
      await delay(SPEED * 0.35);
    }

    setPcodeActive(pcode, 7);
    if (cur && cur.letra === ch) {
      renderTree({ [tagNode(cur)]: 'found' });
      logEntry(log, `<span class="tag ok">✓</span> Hoja final contiene <b>${ch}</b> → <b>encontrada</b>`);
      setStatus(`<span class="ok">Letra ${ch} encontrada.</span>`);
      renderStrip({ [ch]: 'done' });
    } else {
      setPcodeActive(pcode, 8);
      logEntry(log, `<span class="tag no">✕</span> El camino no lleva a una hoja con <b>${ch}</b> → <b>no encontrada</b>`);
      setStatus(`<span class="no">La letra ${ch} no está en el árbol.</span>`);
      renderStrip();
    }
    running = false;
  }

  async function deleteLetter() {
    if (running) return;
    const input = document.getElementById('resTrieLetterInput');
    const letters = normalizeLetters(input.value);
    if (letters.length === 0) { setStatus('<span class="no">Escribe una letra (A-Z) para eliminar.</span>'); return; }
    const ch = letters[0];
    if (!root) { setStatus('<span class="no">El árbol está vacío.</span>'); return; }

    running = true; cancelToken++; const myToken = cancelToken;
    const log = document.getElementById('resTrieLog');
    const pcode = document.getElementById('resTriePcode');
    log.innerHTML = '';
    renderPcode('eliminar');
    setStatus(`Buscando <b>${ch}</b> para eliminar…`);

    const code = letterCode(ch);
    const bin = toBinary(code);
    const path = descend(code, bin); // path[0]=raíz ... path[WIDTH]=posible hoja
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
      if (node.left || node.right || node.letra !== null) break; // ya no se puede podar más
      const parent = path[i - 1].node;
      if (path[i].parentDir === 'left') parent.left = null; else parent.right = null;
      prunedCount++;
    }
    if (root && !root.left && !root.right && root.letra === null) root = null;

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
    root = null; history = []; nodeSeq = 0; running = false; cancelToken++;
    document.getElementById('resTrieLog').innerHTML = '';
    renderPcode('insertar');
    renderStrip();
    renderTree();
    setStatus('Árbol reiniciado. Inserta letras una por una, o carga una palabra completa.');
  }

  return { insertLetter, searchLetter, deleteLetter, loadWord, reset, build: loadWord };
})();