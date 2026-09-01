// src/js/arbol-busqueda.js
//
// Módulo para las 4 variantes de "Árbol de Búsquedas":
//   1. Búsqueda Digital           (data-screen="busqueda-digital")
//   2. Búsqueda por Residuos       (data-screen="busqueda-residuos")
//   3. Búsqueda por Residuos Múltiples (data-screen="busqueda-residuos-multiples")
//   4. Árbol de Huffman            (data-screen="arbol-huffman")
//
// Las 4 pantallas ya existen en index.html (como "Próximamente") y ya están
// conectadas en la navegación. Este archivo se irá llenando con un módulo
// IIFE por técnica (similar a Seq, Bin, Hash) a medida que se definan
// los algoritmos correspondientes.

// ============================================================
// 1. BÚSQUEDA DIGITAL (Digital Search Tree)
//
// Cada letra se codifica según su posición en el alfabeto
// (A=1, B=2, ... Z=26) en binario de 5 bits (MSB primero).
// Las letras se insertan en el orden en que aparecen en la
// palabra. En el nivel k del árbol se compara el bit k-ésimo
// (contando desde el más significativo) del código de la letra:
// bit 0 -> izquierda, bit 1 -> derecha.
// ============================================================
const Digital = (() => {
  const WIDTH = 5; // bits por letra (alcanza para 1..26)
  const SPEED = 900;
  let root = null;
  let running = false;
  let cancelToken = 0;

  const pcodeLines = [
    'función insertarDigital(raíz, letra):',
    '    código = binario(letra, 5 bits)   // A=1 ... Z=26',
    '    si raíz es vacío: raíz = nodo(letra);  fin',
    '    nodo = raíz;  nivel = 1',
    '    mientras nivel <= 5:',
    '        b = bit nivel-ésimo de código',
    '        si b == 0: bajar/crear a la izquierda',
    '        si no: bajar/crear a la derecha',
    '        nivel = nivel + 1'
  ];

  function renderPcode() {
    document.getElementById('digitalPcode').innerHTML =
      pcodeLines.map((l, i) => `<span data-line="${i + 1}">${l}</span>`).join('\n');
  }

  // Normaliza: quita acentos, deja solo A-Z en mayúsculas
  function normalizeWord(raw) {
    return raw
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
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

  function renderStrip(letters, states) {
    const strip = document.getElementById('digitalStrip');
    strip.innerHTML = letters.map(({ ch, code, bin }) => {
      const st = states[ch] || '';
      return `<div class="letter-chip ${st}">
                <div class="l">${ch}</div>
                <div class="code">${code}</div>
                <div class="bin">${bin.split('').join(' ')}</div>
              </div>`;
    }).join('');
  }

  function newNode(letra, code, bin) {
    return { letra, code, bin, left: null, right: null };
  }

  function renderNode(node, edgeLabel, states) {
    if (!node) return '';
    const st = states[node.letra] || '';
    const edge = edgeLabel !== null ? `<span class="redge">${edgeLabel}</span>` : '';
    const kids = (node.left || node.right)
      ? `<ul>
           ${node.left ? `<li>${renderNode(node.left, 0, states)}</li>` : ''}
           ${node.right ? `<li>${renderNode(node.right, 1, states)}</li>` : ''}
         </ul>`
      : '';
    return `<div class="rnode-wrap">${edge}<div class="rnode ${st}">${node.letra}</div></div>${kids}`;
  }

  function renderTree(states = {}) {
    const wrap = document.getElementById('digitalTree');
    if (!root) {
      wrap.innerHTML = `<span style="color:var(--text-dim); font-size:12px; font-family:'JetBrains Mono',monospace;">(árbol vacío)</span>`;
      return;
    }
    wrap.innerHTML = `<ul class="rtree"><li>${renderNode(root, null, states)}</li></ul>`;
  }

  async function build() {
    if (running) return;
    const input = document.getElementById('digitalWordInput');
    const word = normalizeWord(input.value || '');
    const status = document.getElementById('digitalStatus');
    const log = document.getElementById('digitalLog');
    const pcode = document.getElementById('digitalPcode');
    log.innerHTML = '';
    renderPcode();

    if (word.length === 0) {
      status.innerHTML = '<span class="no">Escribe una palabra con al menos una letra (A-Z).</span>';
      root = null;
      renderTree();
      document.getElementById('digitalStrip').innerHTML = '';
      return;
    }

    // evita letras repetidas duplicadas en la tira de códigos
    const seen = new Set();
    const letters = [];
    word.forEach(ch => {
      if (seen.has(ch)) return;
      seen.add(ch);
      const code = letterCode(ch);
      letters.push({ ch, code, bin: toBinary(code) });
    });

    renderStrip(letters, {});
    root = null;
    renderTree();

    running = true;
    cancelToken++;
    const myToken = cancelToken;
    let insertedCount = 0;
    let dupCount = 0;

    for (const { ch, code, bin } of letters) {
      if (myToken !== cancelToken) return;
      renderStrip(letters, { [ch]: 'active' });
      status.innerHTML = `Insertando <b>${ch}</b> (código ${code} → <span style="font-family:'JetBrains Mono',monospace;">${bin}</span>)…`;
      setPcodeActive(pcode, 2);
      logEntry(log, `<span class="tag">letra</span> <b>${ch}</b> → código ${code} → binario <b>${bin}</b>`);
      await delay(SPEED * 0.55);
      if (myToken !== cancelToken) return;

      if (!root) {
        setPcodeActive(pcode, 3);
        root = newNode(ch, code, bin);
        logEntry(log, `<span class="tag ok">✓</span> Árbol vacío → <b>${ch}</b> se convierte en la <b>raíz</b> (nivel 1)`);
        renderTree({ [ch]: 'found' });
        insertedCount++;
        await delay(SPEED);
        renderStrip(letters, { [ch]: 'done' });
        continue;
      }

      let cur = root;
      let level = 1;
      let placed = false;
      let duplicate = false;

      while (level <= WIDTH) {
        if (myToken !== cancelToken) return;
        if (cur.code === code) { duplicate = true; break; }

        setPcodeActive(pcode, 5);
        renderTree({ [cur.letra]: 'compare' });
        logEntry(log, `<span class="tag">nivel ${level}</span> nodo actual → <b>${cur.letra}</b>`);
        await delay(SPEED * 0.6);
        if (myToken !== cancelToken) return;

        setPcodeActive(pcode, 6);
        const b = bitAt(bin, level);
        logEntry(log, `bit ${level}º de ${ch} (${bin}) = <b>${b}</b>`);
        await delay(SPEED * 0.5);
        if (myToken !== cancelToken) return;

        if (b === '0') {
          setPcodeActive(pcode, 7);
          if (!cur.left) {
            cur.left = newNode(ch, code, bin);
            logEntry(log, `b = 0 y la izquierda de <b>${cur.letra}</b> está vacía → <b>${ch}</b> se ubica ahí (nivel ${level + 1})`);
            placed = true;
            break;
          }
          logEntry(log, `b = 0 → bajar a la izquierda de <b>${cur.letra}</b>`);
          cur = cur.left;
        } else {
          setPcodeActive(pcode, 8);
          if (!cur.right) {
            cur.right = newNode(ch, code, bin);
            logEntry(log, `b = 1 y la derecha de <b>${cur.letra}</b> está vacía → <b>${ch}</b> se ubica ahí (nivel ${level + 1})`);
            placed = true;
            break;
          }
          logEntry(log, `b = 1 → bajar a la derecha de <b>${cur.letra}</b>`);
          cur = cur.right;
        }
        setPcodeActive(pcode, 9);
        level++;
        renderTree();
        await delay(SPEED * 0.5);
      }

      if (duplicate) {
        dupCount++;
        logEntry(log, `<span class="tag no">✕</span> <b>${ch}</b> ya tiene el mismo código que un nodo existente → se omite (letra repetida)`);
        renderStrip(letters, { [ch]: 'dup' });
        await delay(SPEED * 0.6);
        continue;
      }

      insertedCount++;
      renderTree({ [ch]: 'found' });
      await delay(SPEED * 0.5);
      renderStrip(letters, { [ch]: 'done' });
    }

    if (myToken !== cancelToken) return;
    renderTree();
    status.innerHTML = `<span class="ok">Árbol construido:</span> ${insertedCount} letra(s) insertada(s)` +
      (dupCount > 0 ? `, ${dupCount} repetida(s) omitida(s).` : '.');
    running = false;
  }

  return { build };
})();

// ============================================================
// 2. BÚSQUEDA POR RESIDUOS (Trie Binario)
//
// A diferencia del Árbol de Búsqueda Digital, aquí los nodos
// intermedios están siempre vacíos: son solo "caminos". Cada
// letra se inserta recorriendo sus 5 bits (MSB primero) uno por
// uno -bit 0 = izquierda, bit 1 = derecha- creando los nodos
// intermedios que hagan falta, y solo al llegar al final del
// camino (nivel 5) se guarda la letra en ese nodo hoja. Las
// letras que comparten prefijo comparten camino y solo se
// bifurcan donde sus bits realmente difieren.
// ============================================================
const Residuos = (() => {
  const WIDTH = 5; // bits por letra (alcanza para 1..26)
  const SPEED = 850;
  let root = null;
  let running = false;
  let cancelToken = 0;

  const pcodeLines = [
    'función insertarResiduos(raíz, letra):',
    '    código = binario(letra, 5 bits)   // A=1 ... Z=26',
    '    nodo = raíz;  nivel = 1',
    '    mientras nivel <= 5:',
    '        b = bit nivel-ésimo de código',
    '        si b == 0: crear (si falta) y bajar a nodo.izquierda',
    '        si no: crear (si falta) y bajar a nodo.derecha',
    '        nivel = nivel + 1',
    '    guardar letra en el nodo hoja (fin del camino)'
  ];

  function renderPcode() {
    document.getElementById('resTriePcode').innerHTML =
      pcodeLines.map((l, i) => `<span data-line="${i + 1}">${l}</span>`).join('\n');
  }

  function normalizeWord(raw) {
    return raw
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

  function renderStrip(letters, states) {
    const strip = document.getElementById('resTrieStrip');
    strip.innerHTML = letters.map(({ ch, code, bin }) => {
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

  // id único por nodo, para poder distinguir estados de comparación
  // entre nodos intermedios (que no tienen letra propia)
  let nodeSeq = 0;
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

  async function build() {
    if (running) return;
    const input = document.getElementById('resTrieWordInput');
    const word = normalizeWord(input.value || '');
    const status = document.getElementById('resTrieStatus');
    const log = document.getElementById('resTrieLog');
    const pcode = document.getElementById('resTriePcode');
    log.innerHTML = '';
    renderPcode();
    root = null;
    nodeSeq = 0;

    if (word.length === 0) {
      status.innerHTML = '<span class="no">Escribe una palabra con al menos una letra (A-Z).</span>';
      renderTree();
      document.getElementById('resTrieStrip').innerHTML = '';
      return;
    }

    const seen = new Set();
    const letters = [];
    word.forEach(ch => {
      if (seen.has(ch)) return;
      seen.add(ch);
      const code = letterCode(ch);
      letters.push({ ch, code, bin: toBinary(code) });
    });

    renderStrip(letters, {});
    root = newNode();
    renderTree();

    running = true;
    cancelToken++;
    const myToken = cancelToken;
    let insertedCount = 0;
    let dupCount = 0;

    for (const { ch, code, bin } of letters) {
      if (myToken !== cancelToken) return;
      renderStrip(letters, { [ch]: 'active' });
      status.innerHTML = `Insertando <b>${ch}</b> (código ${code} → <span style="font-family:'JetBrains Mono',monospace;">${bin}</span>)…`;
      setPcodeActive(pcode, 2);
      logEntry(log, `<span class="tag">letra</span> <b>${ch}</b> → código ${code} → binario <b>${bin}</b>`);
      await delay(SPEED * 0.55);
      if (myToken !== cancelToken) return;

      let cur = root;
      setPcodeActive(pcode, 3);

      for (let level = 1; level <= WIDTH; level++) {
        if (myToken !== cancelToken) return;
        const id = tagNode(cur);
        setPcodeActive(pcode, 5);
        renderTree({ [id]: 'compare' });
        await delay(SPEED * 0.4);
        if (myToken !== cancelToken) return;

        const b = bin[level - 1];
        logEntry(log, `bit ${level}º de ${ch} (${bin}) = <b>${b}</b>`);
        await delay(SPEED * 0.4);
        if (myToken !== cancelToken) return;

        if (b === '0') {
          setPcodeActive(pcode, 6);
          if (!cur.left) {
            cur.left = newNode();
            logEntry(log, `nivel ${level}: b = 0 → se crea camino a la <b>izquierda</b>`);
          } else {
            logEntry(log, `nivel ${level}: b = 0 → ya existe camino a la <b>izquierda</b>, se comparte`);
          }
          cur = cur.left;
        } else {
          setPcodeActive(pcode, 7);
          if (!cur.right) {
            cur.right = newNode();
            logEntry(log, `nivel ${level}: b = 1 → se crea camino a la <b>derecha</b>`);
          } else {
            logEntry(log, `nivel ${level}: b = 1 → ya existe camino a la <b>derecha</b>, se comparte`);
          }
          cur = cur.right;
        }
        setPcodeActive(pcode, 8);
        renderTree();
        await delay(SPEED * 0.45);
      }

      // cur ahora es la hoja final del camino (nivel 5)
      if (myToken !== cancelToken) return;
      setPcodeActive(pcode, 9);
      if (cur.letra !== null) {
        dupCount++;
        logEntry(log, `<span class="tag no">✕</span> El camino de <b>${ch}</b> termina en una hoja ya ocupada por <b>${cur.letra}</b> (código repetido) → se omite`);
        renderStrip(letters, { [ch]: 'dup' });
      } else {
        cur.letra = ch;
        insertedCount++;
        logEntry(log, `<span class="tag ok">✓</span> Fin del camino → se guarda <b>${ch}</b> en la hoja`);
        renderTree({ [tagNode(cur)]: 'found' });
        await delay(SPEED * 0.5);
        renderStrip(letters, { [ch]: 'done' });
      }
      await delay(SPEED * 0.35);
    }

    if (myToken !== cancelToken) return;
    renderTree();
    status.innerHTML = `<span class="ok">Árbol construido:</span> ${insertedCount} letra(s) insertada(s)` +
      (dupCount > 0 ? `, ${dupCount} repetida(s) omitida(s).` : '.');
    running = false;
  }

  return { build };
})();

// ============================================================
// 3. BÚSQUEDA POR RESIDUOS MÚLTIPLES (Trie M-ario)
//
// Igual que en el Trie Binario de Residuos, los nodos intermedios
// están vacíos y las letras se guardan solo en las hojas. La
// diferencia es que en vez de leer 1 bit por nivel, se leen
// "bloques" de k bits de una sola vez (k configurable). Cada
// nodo puede tener hasta 2^k ramas en vez de solo 2, así que el
// árbol queda más ancho pero mucho menos profundo. Si k=5 (todo
// el código de una vez), cada letra cuelga directamente de la
// raíz, en la rama número = su código decimal.
// ============================================================
const ResiduosMultiples = (() => {
  const WIDTH = 5; // bits por letra (alcanza para 1..26)
  const SPEED = 850;
  let root = null;
  let running = false;
  let cancelToken = 0;

  function pcodeLines(k) {
    return [
      `función insertarResiduosMúltiples(raíz, letra, k=${k}):`,
      '    código = binario(letra, 5 bits)   // A=1 ... Z=26',
      `    bloques = partir código en grupos de ${k} bits`,
      '    nodo = raíz',
      '    para cada bloque en bloques:',
      '        r = valor decimal del bloque   // 0 .. 2^k - 1',
      '        si nodo.hijos[r] no existe: crearlo',
      '        nodo = nodo.hijos[r]',
      '    guardar letra en nodo (fin de los bloques)'
    ];
  }

  function renderPcode(k) {
    document.getElementById('resMulPcode').innerHTML =
      pcodeLines(k).map((l, i) => `<span data-line="${i + 1}">${l}</span>`).join('\n');
  }

  function normalizeWord(raw) {
    return raw
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

  // parte un string binario en bloques de tamaño k (el último
  // bloque puede quedar más corto si WIDTH no es múltiplo de k)
  function chunksOf(bin, k) {
    const chunks = [];
    for (let i = 0; i < bin.length; i += k) {
      chunks.push(bin.slice(i, Math.min(i + k, bin.length)));
    }
    return chunks;
  }

  function renderStrip(letters, states) {
    const strip = document.getElementById('resMulStrip');
    strip.innerHTML = letters.map(({ ch, code, bin }) => {
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

  let nodeSeq = 0;
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

  async function build() {
    if (running) return;
    const input = document.getElementById('resMulWordInput');
    const k = Number(document.getElementById('resMulBlockSize').value) || 2;
    const word = normalizeWord(input.value || '');
    const status = document.getElementById('resMulStatus');
    const log = document.getElementById('resMulLog');
    const pcode = document.getElementById('resMulPcode');
    log.innerHTML = '';
    renderPcode(k);
    root = null;
    nodeSeq = 0;

    if (word.length === 0) {
      status.innerHTML = '<span class="no">Escribe una palabra con al menos una letra (A-Z).</span>';
      renderTree();
      document.getElementById('resMulStrip').innerHTML = '';
      return;
    }

    const seen = new Set();
    const letters = [];
    word.forEach(ch => {
      if (seen.has(ch)) return;
      seen.add(ch);
      const code = letterCode(ch);
      letters.push({ ch, code, bin: toBinary(code) });
    });

    renderStrip(letters, {});
    root = newNode();
    renderTree();

    running = true;
    cancelToken++;
    const myToken = cancelToken;
    let insertedCount = 0;
    let dupCount = 0;
    const maxRamas = Math.pow(2, k);

    for (const { ch, code, bin } of letters) {
      if (myToken !== cancelToken) return;
      const chunks = chunksOf(bin, k);
      renderStrip(letters, { [ch]: 'active' });
      status.innerHTML = `Insertando <b>${ch}</b> (${bin}) con bloques de <b>${k}</b> bit(s) → hasta <b>${maxRamas}</b> ramas por nodo…`;
      setPcodeActive(pcode, 3);
      logEntry(log, `<span class="tag">letra</span> <b>${ch}</b> → binario <b>${bin}</b> → bloques [ ${chunks.join(' | ')} ]`);
      await delay(SPEED * 0.6);
      if (myToken !== cancelToken) return;

      let cur = root;
      for (const chunk of chunks) {
        if (myToken !== cancelToken) return;
        const id = tagNode(cur);
        setPcodeActive(pcode, 5);
        renderTree({ [id]: 'compare' });
        await delay(SPEED * 0.4);
        if (myToken !== cancelToken) return;

        const r = parseInt(chunk, 2);
        setPcodeActive(pcode, 6);
        logEntry(log, `bloque <b>${chunk}</b> = rama nº <b>${r}</b> (de 0 a ${maxRamas - 1})`);
        await delay(SPEED * 0.45);
        if (myToken !== cancelToken) return;

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
        await delay(SPEED * 0.45);
      }

      if (myToken !== cancelToken) return;
      setPcodeActive(pcode, 9);
      if (cur.letra !== null) {
        dupCount++;
        logEntry(log, `<span class="tag no">✕</span> El camino de <b>${ch}</b> termina en una hoja ya ocupada por <b>${cur.letra}</b> → se omite`);
        renderStrip(letters, { [ch]: 'dup' });
      } else {
        cur.letra = ch;
        insertedCount++;
        logEntry(log, `<span class="tag ok">✓</span> Fin de los bloques → se guarda <b>${ch}</b> en la hoja`);
        renderTree({ [tagNode(cur)]: 'found' });
        await delay(SPEED * 0.5);
        renderStrip(letters, { [ch]: 'done' });
      }
      await delay(SPEED * 0.35);
    }

    if (myToken !== cancelToken) return;
    renderTree();
    status.innerHTML = `<span class="ok">Árbol construido</span> con bloques de ${k} bit(s) (${maxRamas} ramas por nodo): ${insertedCount} letra(s) insertada(s)` +
      (dupCount > 0 ? `, ${dupCount} repetida(s) omitida(s).` : '.');
    running = false;
  }

  return { build };
})();

// ============================================================
// 4. ÁRBOL DE HUFFMAN (compresión)
//
// Construcción con "dos colas" (técnica clásica de tiempo lineal
// cuando las frecuencias ya están ordenadas):
//   Cola 1: caracteres sueltos (hojas), ordenados de menor a
//           mayor frecuencia (empate → se respeta el orden de
//           primera aparición en la palabra).
//   Cola 2: bloques ya combinados (nodos internos), inicialmente
//           vacía; los nuevos bloques se agregan siempre al final.
// En cada paso se toman los DOS nodos de menor peso comparando
// el frente de ambas colas (si hay empate, se prioriza la Cola 1)
// y se combinan en un nuevo bloque que se agrega al final de la
// Cola 2. El primer nodo tomado queda como hijo izquierdo (bit 0)
// y el segundo como hijo derecho (bit 1). Se repite hasta que solo
// quede un nodo: la raíz.
// ============================================================
const Huffman = (() => {
  const SPEED = 900;
  let running = false;
  let cancelToken = 0;

  function renderStrip(containerId, items, states) {
    document.getElementById(containerId).innerHTML = items.map(it => {
      const st = states[it.key] || '';
      return `<div class="letter-chip ${st}">
                <div class="l">${it.top}</div>
                <div class="code">${it.mid || ''}</div>
                <div class="bin">${it.bottom || ''}</div>
              </div>`;
    }).join('');
  }

  function displayCh(ch) {
    if (ch === ' ') return '␣';
    if (ch === '\t') return '⇥';
    return ch;
  }

  function newLeaf(ch, freq) {
    return { ch, freq, left: null, right: null };
  }

  function label(n) {
    if (n.ch !== undefined && n.ch !== null) return displayCh(n.ch);
    return `(${label(n.left)}+${label(n.right)})`;
  }

  let nodeSeq = 0;
  function tagNode(node) {
    if (!node.__id) node.__id = ++nodeSeq;
    return node.__id;
  }

  function renderNode(node, edgeLabel, states, total, isRoot) {
    if (!node) return '';
    const id = tagNode(node);
    const st = states[id] || '';
    const edge = edgeLabel !== null ? `<span class="redge">${edgeLabel}</span>` : '';
    const isLeaf = !node.left && !node.right;
    let box;
    if (isLeaf) {
      box = `<div class="rnode ${st}" title="frecuencia ${node.freq}/${total}">${displayCh(node.ch)}</div>
             <div class="hf-node-freq">${node.freq}/${total}</div>`;
    } else if (isRoot) {
      box = `<div class="rnode-dot ${st}" title="raíz"></div>`;
    } else {
      box = `<div class="rnode hf-node-sum ${st}" title="peso ${node.freq}/${total}">${node.freq}/${total}</div>`;
    }
    const kids = (node.left || node.right)
      ? `<ul>
           ${node.left ? `<li>${renderNode(node.left, 0, states, total, false)}</li>` : ''}
           ${node.right ? `<li>${renderNode(node.right, 1, states, total, false)}</li>` : ''}
         </ul>`
      : '';
    return `<div class="rnode-wrap">${edge}${box}</div>${kids}`;
  }

  function renderTree(root, states = {}, total = 0) {
    const wrap = document.getElementById('huffmanTree');
    if (!root) {
      wrap.innerHTML = `<span style="color:var(--text-dim); font-size:12px; font-family:'JetBrains Mono',monospace;">(árbol vacío)</span>`;
      return;
    }
    wrap.innerHTML = `<ul class="rtree"><li>${renderNode(root, null, states, total, true)}</li></ul>`;
  }

  function computeCodes(root) {
    const codes = {};
    (function walk(n, path) {
      if (!n.left && !n.right) { codes[n.ch] = path || '0'; return; }
      if (n.left) walk(n.left, path + '0');
      if (n.right) walk(n.right, path + '1');
    })(root, '');
    return codes;
  }

  async function build() {
    if (running) return;
    const input = document.getElementById('huffmanWordInput');
    const word = input.value || '';
    const status = document.getElementById('huffmanStatus');
    const tableBody = document.querySelector('#huffmanTable tbody');
    tableBody.innerHTML = '';
    document.getElementById('huffmanSummary').textContent = '';
    document.getElementById('huffmanBitsInfo').textContent = '';
    document.getElementById('huffmanBytes').innerHTML = '';

    if (word.length === 0) {
      status.innerHTML = '<span class="no">Escribe una palabra o frase con al menos un carácter.</span>';
      renderTree(null);
      document.getElementById('huffmanStrip').innerHTML = '';
      return;
    }

    // 1) Frecuencias, en orden de primera aparición
    const freqMap = new Map();
    const order = [];
    word.split('').forEach(ch => {
      if (!freqMap.has(ch)) { freqMap.set(ch, 0); order.push(ch); }
      freqMap.set(ch, freqMap.get(ch) + 1);
    });

    const stripItems = order.map(ch => ({
      key: ch, top: displayCh(ch), mid: `f=${freqMap.get(ch)}`, bottom: `${freqMap.get(ch)}/${word.length}`
    }));
    renderStrip('huffmanStrip', stripItems, {});

    if (order.length === 1) {
      status.innerHTML = '<span class="no">Se necesitan al menos 2 caracteres distintos para construir un árbol.</span>';
      renderTree(null);
      return;
    }

    running = true;
    cancelToken++;
    const myToken = cancelToken;
    nodeSeq = 0;

    // 2) Colas: Cola1 = hojas ordenadas ascendente por frecuencia (empate = orden de aparición)
    let queue1 = order.map(ch => newLeaf(ch, freqMap.get(ch)));
    queue1.sort((a, b) => a.freq - b.freq); // sort estable
    let queue2 = [];

    status.innerHTML = `Cola inicial (ordenada por frecuencia): ${queue1.map(n => displayCh(n.ch)).join(', ')}`;
    await delay(SPEED * 0.7);

    function popSmallest() {
      if (queue1.length && queue2.length) {
        return (queue1[0].freq <= queue2[0].freq) ? queue1.shift() : queue2.shift();
      }
      return queue1.length ? queue1.shift() : queue2.shift();
    }

    // Simula dos "pop" sin mutar las colas reales, para saber de antemano
    // cuáles dos nodos se van a sumar y así poder resaltarlos en la columna.
    function peekTwoSmallest() {
      const q1 = queue1.slice();
      const q2 = queue2.slice();
      function pop() {
        if (q1.length && q2.length) return (q1[0].freq <= q2[0].freq) ? q1.shift() : q2.shift();
        return q1.length ? q1.shift() : q2.shift();
      }
      return [pop(), pop()];
    }

    const columnsWrap = document.getElementById('huffmanColumns');
    columnsWrap.innerHTML = '';
    let colIndex = 1;

    // Dibuja una columna completa (todos los nodos vigentes en ese momento).
    // Orden: por peso descendente (los más pequeños, que se van a sumar,
    // quedan abajo); en caso de empate se usa el orden inverso de aparición
    // (r,a,s,e,c,_,o,i,l,u,j) sin afectar cuáles dos se suman.
    function addColumn(nodes, highlightSet) {
      const sorted = nodes.slice().reverse().sort((x, y) => y.freq - x.freq);
      const itemsHtml = sorted.map(n => {
        const picked = highlightSet && highlightSet.has(n);
        return `<div class="hf-item${picked ? ' merge-pick' : ''}">
                  <div class="hf-label">${label(n)}</div>
                  <div class="hf-freq">${n.freq}/${word.length}</div>
                </div>`;
      }).join('');
      const col = document.createElement('div');
      col.className = 'hf-column';
      col.innerHTML = `<div class="hf-col-title">Col. ${colIndex}</div>${itemsHtml}`;
      columnsWrap.appendChild(col);
      columnsWrap.scrollLeft = columnsWrap.scrollWidth;
      return col;
    }

    // Dibuja la flecha con la operación de suma entre una columna y la siguiente.
    function addArrow(a, b, merged) {
      const arrow = document.createElement('div');
      arrow.className = 'hf-col-arrow';
      arrow.innerHTML = `<span class="hf-op">${label(a)} (${a.freq}/${word.length}) + ${label(b)} (${b.freq}/${word.length})<br>= <b>${merged.freq}/${word.length}</b></span><span class="hf-arrow-glyph">→</span>`;
      columnsWrap.appendChild(arrow);
      columnsWrap.scrollLeft = columnsWrap.scrollWidth;
    }

    while (queue1.length + queue2.length > 1) {
      if (myToken !== cancelToken) return;

      // 1) Se imprime toda la columna vigente, resaltando los dos que se sumarán.
      const currentNodes = queue1.concat(queue2);
      const [peekA, peekB] = peekTwoSmallest();
      addColumn(currentNodes, new Set([peekA, peekB]));
      status.innerHTML = `Columna ${colIndex}: se suman los dos valores más pequeños → <b>${label(peekA)}</b> (${peekA.freq}/${word.length}) + <b>${label(peekB)}</b> (${peekB.freq}/${word.length})`;
      await delay(SPEED * 0.9);
      if (myToken !== cancelToken) return;

      // 2) Se hace la operación de suma.
      const a = popSmallest();
      const b = popSmallest();
      const merged = { freq: a.freq + b.freq, left: a, right: b };
      queue2.push(merged);
      addArrow(a, b, merged);
      await delay(SPEED * 0.7);
      if (myToken !== cancelToken) return;

      colIndex++;
      // 3) La siguiente vuelta del bucle vuelve a imprimir toda la columna
      //    (ya una línea más corta) con el nuevo bloque incluido.
    }

    // 4) Al quedar un solo nodo, se imprime la columna final de una sola línea.
    const root = queue2[0] || queue1[0];
    addColumn([root], null);
    renderTree(root, {}, word.length);

    // 3) Códigos y tabla (orden inverso al de primera aparición)
    const codes = computeCodes(root);
    const total = word.length;
    let sumL = 0;
    const tableOrder = order.slice().reverse();
    tableOrder.forEach(ch => {
      const li = codes[ch].length;
      const pi = freqMap.get(ch) / total;
      const l = pi * li;
      sumL += l;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${displayCh(ch)}</td><td>${codes[ch]}</td><td>${li}</td><td>${freqMap.get(ch)}/${total}</td><td>${freqMap.get(ch)}×${li}/${total} = ${freqMap.get(ch) * li}/${total}</td>`;
      tableBody.appendChild(tr);
    });
    document.getElementById('huffmanSummary').innerHTML =
      `Longitud promedio ponderada: <b>${sumL.toFixed(2)}</b> bits/carácter (vs. ${Math.ceil(Math.log2(order.length))} bits fijos sin comprimir).`;

    // 4) Cadena de bits (en el orden de la tabla) y bytes
    let bits = '';
    tableOrder.forEach(ch => { bits += codes[ch]; });
    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = bits.slice(i, i + 8);
      const padded = b.length < 8;
      if (padded) b = b.padEnd(8, '0');
      bytes.push({ bits: b, padded });
    }
    document.getElementById('huffmanBitsInfo').innerHTML =
      `Cadena comprimida: <b>${bits.length} bits</b> → se agrupan en <b>${bytes.length} bytes</b> de 8 bits` +
      (bytes[bytes.length - 1].padded ? ` (el último se rellena con 0 al final).` : `.`);
    renderStrip('huffmanBytes', bytes.map((b, i) => ({
      key: 'byte' + i, top: `Byte ${i + 1}`, mid: '', bottom: b.bits
    })), {});

    status.innerHTML = `<span class="ok">Árbol de Huffman generado.</span> ${order.length} códigos, ${bits.length} bits totales.`;
    running = false;
  }

  return { build };
})();