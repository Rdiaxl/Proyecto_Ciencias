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

// TODO: const Residuos = (()=>{ ... })();
// TODO: const ResiduosMultiples = (()=>{ ... })();
// TODO: const Huffman = (()=>{ ... })();