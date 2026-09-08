// src/js/busqueda-digital.js
//
// BÚSQUEDA DIGITAL (Digital Search Tree)
// (data-screen="busqueda-digital")
//
// Cada letra se codifica según su posición en el alfabeto
// (A=1, B=2, ... Z=26) en binario de 5 bits (MSB primero).
// El árbol es persistente entre operaciones: se puede insertar,
// buscar y eliminar una letra a la vez, además de poder cargar
// una palabra completa (lo que reinicia el árbol e inserta cada
// letra en orden, una por una, con la misma animación).
//
// A diferencia del Trie de Residuos, aquí una letra puede quedar
// guardada en CUALQUIER nodo del camino (no solo en las hojas):
// en cada nivel se compara el bit correspondiente de la letra que
// se está insertando/buscando y, si el nodo actual está vacío,
// ahí mismo se guarda.
//
// Eliminar: si el nodo no tiene hijos, se quita del árbol. Si
// tiene hijos, se "vacía" (queda como nodo de paso vacío) para
// no romper las ramas inferiores; ese hueco queda disponible para
// una futura inserción cuyo camino de bits pase por ahí.
//
// Depende de: utils.js (delay, logEntry, setPcodeActive)
// ============================================================
const Digital = (() => {
  const WIDTH = 5; // bits por letra (alcanza para 1..26)
  const SPEED = 900;
  let root = null;       // {letra|null, code|null, bin|null, left, right, __id}
  let history = [];      // letras actualmente en el árbol, en orden de inserción
  let running = false;
  let cancelToken = 0;
  let nodeSeq = 0;

  const PCODE = {
    insertar: [
      'función insertarDigital(raíz, letra):',
      '    código = binario(letra, 5 bits)   // A=1 ... Z=26',
      '    nodo = raíz;  nivel = 1',
      '    mientras nivel <= 5:',
      '        si nodo está vacío: guardar letra aquí;  fin',
      '        si nodo.código == código: ya existe (duplicada); fin',
      '        b = bit nivel-ésimo de código',
      '        si b == 0: bajar/crear a la izquierda',
      '        si no: bajar/crear a la derecha',
      '        nivel = nivel + 1'
    ],
    buscar: [
      'función buscarDigital(raíz, letra):',
      '    código = binario(letra, 5 bits)',
      '    nodo = raíz;  nivel = 1',
      '    mientras nodo != nulo:',
      '        si nodo.código == código: retornar encontrado',
      '        b = bit nivel-ésimo de código',
      '        si b == 0: nodo = nodo.izquierda',
      '        si no: nodo = nodo.derecha',
      '        nivel = nivel + 1',
      '    retornar no encontrado'
    ],
    eliminar: [
      'función eliminarDigital(raíz, letra):',
      '    nodo = buscarDigital(raíz, letra)',
      '    si nodo no existe: retornar "no encontrado"',
      '    si nodo no tiene hijos: quitar nodo del árbol',
      '    si no: vaciar nodo (queda como camino vacío, reutilizable)'
    ]
  };

  function renderPcode(op) {
    document.getElementById('digitalPcode').innerHTML =
      PCODE[op].map((l, i) => `<span data-line="${i + 1}">${l}</span>`).join('\n');
  }

  // Normaliza: quita acentos, deja solo A-Z en mayúsculas
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

  function bitAt(binStr, level) { // level: 1..5
    return binStr[level - 1];
  }

  function emptyNode() {
    return { letra: null, code: null, bin: null, left: null, right: null };
  }

  function tagNode(node) {
    if (!node.__id) node.__id = ++nodeSeq;
    return node.__id;
  }

  function isTreeEmpty() {
    return !root || (root.letra === null && !root.left && !root.right);
  }

  function renderStrip(states = {}) {
    const strip = document.getElementById('digitalStrip');
    strip.innerHTML = history.map(({ ch, code, bin }) => {
      const st = states[ch] || '';
      return `<div class="letter-chip ${st}">
                <div class="l">${ch}</div>
                <div class="code">${code}</div>
                <div class="bin">${bin.split('').join(' ')}</div>
              </div>`;
    }).join('');
  }

  function renderNode(node, edgeLabel, states) {
    if (!node) return '';
    const id = tagNode(node);
    const st = states[id] || '';
    const edge = edgeLabel !== null ? `<span class="redge">${edgeLabel}</span>` : '';
    const isEmpty = node.letra === null;
    const box = isEmpty
      ? `<div class="rnode-dot ${st}"></div>`
      : `<div class="rnode ${st}">${node.letra}</div>`;
    const kids = (node.left || node.right)
      ? `<ul>
           ${node.left ? `<li>${renderNode(node.left, 0, states)}</li>` : ''}
           ${node.right ? `<li>${renderNode(node.right, 1, states)}</li>` : ''}
         </ul>`
      : '';
    return `<div class="rnode-wrap">${edge}${box}</div>${kids}`;
  }

  function renderTree(states = {}) {
    const wrap = document.getElementById('digitalTree');
    if (isTreeEmpty()) {
      wrap.innerHTML = `<span style="color:var(--text-dim); font-size:12px; font-family:'JetBrains Mono',monospace;">(árbol vacío)</span>`;
      return;
    }
    wrap.innerHTML = `<ul class="rtree"><li>${renderNode(root, null, states)}</li></ul>`;
  }

  function setStatus(html) {
    document.getElementById('digitalStatus').innerHTML = html;
  }

  // ------------------------------------------------------------
  // Inserción (motor compartido por insertLetter y loadWord)
  // ------------------------------------------------------------
  async function doInsert(ch, myToken) {
    const code = letterCode(ch);
    const bin = toBinary(code);
    const log = document.getElementById('digitalLog');
    const pcode = document.getElementById('digitalPcode');

    logEntry(log, `<span class="tag">letra</span> <b>${ch}</b> → código ${code} → binario <b>${bin}</b>`);
    await delay(SPEED * 0.45);
    if (myToken !== cancelToken) return 'cancelled';

    if (!root) root = emptyNode();
    let cur = root;
    let level = 1;

    while (level <= WIDTH) {
      if (myToken !== cancelToken) return 'cancelled';
      const id = tagNode(cur);
      setPcodeActive(pcode, 5);
      renderTree({ [id]: 'compare' });
      await delay(SPEED * 0.5);
      if (myToken !== cancelToken) return 'cancelled';

      if (cur.letra === null) {
        cur.letra = ch; cur.code = code; cur.bin = bin;
        logEntry(log, `<span class="tag ok">✓</span> Nodo vacío en nivel ${level} → <b>${ch}</b> se guarda ahí`);
        renderTree({ [id]: 'found' });
        return 'inserted';
      }
      setPcodeActive(pcode, 6);
      if (cur.code === code) {
        logEntry(log, `<span class="tag no">✕</span> Ya existe <b>${ch}</b> en el árbol → se omite`);
        return 'duplicate';
      }

      setPcodeActive(pcode, 7);
      const b = bitAt(bin, level);
      logEntry(log, `bit ${level}º de ${ch} (${bin}) = <b>${b}</b> → nodo actual = <b>${cur.letra}</b>`);
      await delay(SPEED * 0.45);
      if (myToken !== cancelToken) return 'cancelled';

      if (b === '0') {
        if (!cur.left) cur.left = emptyNode();
        logEntry(log, `b = 0 → bajar a la izquierda de <b>${cur.letra}</b>`);
        cur = cur.left;
      } else {
        if (!cur.right) cur.right = emptyNode();
        logEntry(log, `b = 1 → bajar a la derecha de <b>${cur.letra}</b>`);
        cur = cur.right;
      }
      level++;
      renderTree();
      await delay(SPEED * 0.4);
    }
    return 'full'; // no debería pasar: A-Z cabe en 5 bits
  }

  async function insertLetter() {
    if (running) return;
    const input = document.getElementById('digitalLetterInput');
    const letters = normalizeLetters(input.value);
    if (letters.length === 0) {
      setStatus('<span class="no">Escribe una letra (A-Z).</span>');
      return;
    }
    const ch = letters[0];

    running = true;
    cancelToken++;
    const myToken = cancelToken;
    const log = document.getElementById('digitalLog');
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
    } else {
      setStatus(`<span class="no">No se pudo insertar ${ch}.</span>`);
    }
    renderTree();
    input.value = '';
    running = false;
  }

  async function loadWord() {
    if (running) return;
    const input = document.getElementById('digitalWordInput');
    const letters = normalizeLetters(input.value);
    if (letters.length === 0) {
      setStatus('<span class="no">Escribe una palabra con al menos una letra (A-Z).</span>');
      return;
    }

    // Reinicia el árbol antes de cargar la palabra completa
    root = null; history = []; nodeSeq = 0;
    renderTree(); renderStrip();

    running = true;
    cancelToken++;
    const myToken = cancelToken;
    const log = document.getElementById('digitalLog');
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
      } else if (result === 'duplicate') {
        dupCount++;
      }
      renderTree();
      await delay(SPEED * 0.25);
    }

    setStatus(`<span class="ok">Árbol cargado:</span> ${insertedCount} letra(s) insertada(s)` +
      (dupCount > 0 ? `, ${dupCount} repetida(s) omitida(s).` : '.'));
    running = false;
  }

  async function searchLetter() {
    if (running) return;
    const input = document.getElementById('digitalLetterInput');
    const letters = normalizeLetters(input.value);
    if (letters.length === 0) {
      setStatus('<span class="no">Escribe una letra (A-Z) para buscar.</span>');
      return;
    }
    const ch = letters[0];
    if (isTreeEmpty()) {
      setStatus('<span class="no">El árbol está vacío.</span>');
      return;
    }

    running = true;
    cancelToken++;
    const myToken = cancelToken;
    const log = document.getElementById('digitalLog');
    const pcode = document.getElementById('digitalPcode');
    log.innerHTML = '';
    renderPcode('buscar');
    renderStrip({ [ch]: 'active' });
    setStatus(`Buscando <b>${ch}</b>…`);

    const code = letterCode(ch);
    const bin = toBinary(code);
    let cur = root;
    let level = 1;
    let found = false;

    while (cur) {
      if (myToken !== cancelToken) return;
      const id = tagNode(cur);
      setPcodeActive(pcode, 4);
      renderTree({ [id]: 'compare' });

      if (cur.letra !== null) {
        logEntry(log, `<span class="tag">nivel ${level}</span> nodo actual → <b>${cur.letra}</b>`);
        await delay(SPEED * 0.55);
        if (myToken !== cancelToken) return;
        setPcodeActive(pcode, 5);
        if (cur.code === code) {
          renderTree({ [id]: 'found' });
          logEntry(log, `<span class="tag ok">✓</span> ${cur.letra} == ${ch} → <b>encontrada</b>`);
          setStatus(`<span class="ok">Letra ${ch} encontrada.</span>`);
          renderStrip({ [ch]: 'done' });
          found = true;
          break;
        }
      } else {
        logEntry(log, `<span class="tag">nivel ${level}</span> nodo camino vacío, se continúa`);
        await delay(SPEED * 0.4);
        if (myToken !== cancelToken) return;
      }

      setPcodeActive(pcode, 6);
      const b = bitAt(bin, level);
      logEntry(log, `bit ${level}º de ${ch} (${bin}) = <b>${b}</b>`);
      await delay(SPEED * 0.45);
      if (myToken !== cancelToken) return;

      setPcodeActive(pcode, b === '0' ? 7 : 8);
      cur = (b === '0') ? cur.left : cur.right;
      level++;
      if (level > WIDTH + 1) break;
      renderTree();
      await delay(SPEED * 0.35);
    }

    if (!found) {
      logEntry(log, `<span class="tag no">✕</span> Rama vacía o fin del recorrido → <b>no encontrada</b>`);
      setStatus(`<span class="no">La letra ${ch} no está en el árbol.</span>`);
      renderStrip();
    }
    running = false;
  }

  async function deleteLetter() {
    if (running) return;
    const input = document.getElementById('digitalLetterInput');
    const letters = normalizeLetters(input.value);
    if (letters.length === 0) {
      setStatus('<span class="no">Escribe una letra (A-Z) para eliminar.</span>');
      return;
    }
    const ch = letters[0];
    if (isTreeEmpty()) {
      setStatus('<span class="no">El árbol está vacío.</span>');
      return;
    }

    running = true;
    cancelToken++;
    const myToken = cancelToken;
    const log = document.getElementById('digitalLog');
    const pcode = document.getElementById('digitalPcode');
    log.innerHTML = '';
    renderPcode('eliminar');
    setStatus(`Buscando <b>${ch}</b> para eliminar…`);

    const code = letterCode(ch);
    const bin = toBinary(code);
    let cur = root;
    let level = 1;
    let target = null;

    setPcodeActive(pcode, 2);
    while (cur) {
      if (myToken !== cancelToken) return;
      const id = tagNode(cur);
      renderTree({ [id]: 'compare' });
      await delay(SPEED * 0.4);
      if (myToken !== cancelToken) return;

      if (cur.letra !== null && cur.code === code) { target = cur; break; }

      const b = bitAt(bin, level);
      cur = (b === '0') ? cur.left : cur.right;
      level++;
      if (level > WIDTH + 1) break;
    }

    if (!target) {
      setPcodeActive(pcode, 3);
      logEntry(log, `<span class="tag no">✕</span> La letra ${ch} no está en el árbol.`);
      setStatus(`<span class="no">La letra ${ch} no existe en el árbol.</span>`);
      running = false;
      return;
    }

    renderTree({ [tagNode(target)]: 'compare' });
    await delay(SPEED * 0.5);
    if (myToken !== cancelToken) return;

    if (!target.left && !target.right) {
      setPcodeActive(pcode, 4);
      target.letra = null; target.code = null; target.bin = null;
      if (target === root) root = null;
      logEntry(log, `<span class="tag ok">✓</span> ${ch} no tenía hijos → nodo eliminado del árbol.`);
    } else {
      setPcodeActive(pcode, 5);
      target.letra = null; target.code = null; target.bin = null;
      logEntry(log, `<span class="tag ok">✓</span> ${ch} tenía hijos → nodo vaciado (queda como camino).`);
    }

    history = history.filter(h => h.ch !== ch);
    renderStrip();
    renderTree();
    setStatus(`<span class="ok">Letra ${ch} eliminada.</span>`);
    running = false;
  }

  function reset() {
    root = null; history = []; nodeSeq = 0; running = false; cancelToken++;
    document.getElementById('digitalLog').innerHTML = '';
    renderPcode('insertar');
    renderStrip();
    renderTree();
    setStatus('Árbol reiniciado. Inserta letras una por una, o carga una palabra completa.');
  }

  // Compatibilidad: mantiene el nombre "build" apuntando a la carga de palabra completa.
  return { insertLetter, searchLetter, deleteLetter, loadWord, reset, build: loadWord };
})();