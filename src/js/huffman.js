// src/js/huffman.js
//
// ÁRBOL DE HUFFMAN (compresión)
// (data-screen="arbol-huffman")
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
//
// Depende de: utils.js (delay, logEntry)
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