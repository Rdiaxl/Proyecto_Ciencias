const Res = (() => {
  let root = null;
  let running = false;
  let cancelToken = 0;
  const SPEED = 850;

  const pcodeLines = [
    'función búsquedaResiduos(raíz, objetivo):',
    '    nodo = raíz;  i = 0',
    '    mientras nodo != nulo:',
    '        si nodo.clave == objetivo: retornar encontrado',
    '        r = (objetivo >> i) & 1   // residuo i',
    '        si r == 0: nodo = nodo.izquierda',
    '        si no: nodo = nodo.derecha  ;  i = i + 1',
    '    retornar no encontrado'
  ];

  function renderPcode() {
    document.getElementById('residuosPcode').innerHTML =
      pcodeLines.map((l, i) => `<span data-line="${i + 1}">${l}</span>`).join('\n');
  }

  // Bit i-ésimo de key (0 = bit menos significativo), equivalente al
  // residuo de dividir sucesivamente la clave por 2, i veces.
  function bit(key, i) {
    return (key >> i) & 1;
  }

  function newNode() {
    return { key: null, left: null, right: null };
  }

  function insertKey(node, key) {
    if (!node) node = newNode();
    let cur = node;
    let i = 0;
    while (i < 32) {
      if (cur.key === null) { cur.key = key; break; }
      if (cur.key === key) break; // clave duplicada, se ignora
      const r = bit(key, i);
      if (r === 0) {
        if (!cur.left) cur.left = newNode();
        cur = cur.left;
      } else {
        if (!cur.right) cur.right = newNode();
        cur = cur.right;
      }
      i++;
    }
    return node;
  }

  function buildTree(arr) {
    root = null;
    arr.forEach(k => { root = insertKey(root, k); });
  }

  function renderNode(node, edgeLabel, states) {
    if (!node || node.key === null) return '';
    const st = states[node.key] || '';
    const edge = edgeLabel !== null ? `<span class="redge">${edgeLabel}</span>` : '';
    const kids = (node.left || node.right)
      ? `<ul>
           ${node.left ? `<li>${renderNode(node.left, 0, states)}</li>` : ''}
           ${node.right ? `<li>${renderNode(node.right, 1, states)}</li>` : ''}
         </ul>`
      : '';
    return `<div class="rnode-wrap">${edge}<div class="rnode ${st}">${node.key}</div></div>${kids}`;
  }

  function renderTree(states = {}) {
    const wrap = document.getElementById('residuosTree');
    if (!root || root.key === null) {
      wrap.innerHTML = `<span style="color:var(--text-dim); font-size:12px; font-family:'JetBrains Mono',monospace;">(árbol vacío)</span>`;
      return;
    }
    wrap.innerHTML = `<ul class="rtree"><li>${renderNode(root, null, states)}</li></ul>`;
  }

  function newTree() {
    const arr = randUniqueArray(9, 1, 99);
    buildTree(arr);
    renderPcode();
    renderTree();
    document.getElementById('residuosLog').innerHTML = '';
    document.getElementById('residuosStatus').textContent =
      `Árbol generado con ${arr.length} claves. Escribe un objetivo y pulsa iniciar.`;
    running = false;
  }

  function useManualArray() {
    const input = document.getElementById('residuosManualInput');
    const raw = input.value.trim();
    const status = document.getElementById('residuosStatus');

    if (raw === '') {
      status.innerHTML = '<span class="no">Escribe al menos un número (separados por comas).</span>';
      return;
    }

    const parts = raw.split(/[,\s]+/).filter(Boolean);
    const nums = parts.map(Number);

    if (nums.some(n => Number.isNaN(n) || n < 0 || !Number.isInteger(n))) {
      status.innerHTML = '<span class="no">Solo se permiten números enteros positivos, separados por comas o espacios.</span>';
      return;
    }
    if (nums.length < 1) {
      status.innerHTML = '<span class="no">Ingresa al menos un número.</span>';
      return;
    }

    const arr = [...new Set(nums)];
    buildTree(arr);
    renderPcode();
    renderTree();
    document.getElementById('residuosLog').innerHTML = '';
    status.innerHTML = `<span class="ok">Árbol personalizado cargado (${arr.length} claves).</span> Escribe un objetivo y pulsa iniciar.`;
    running = false;
  }

  async function start() {
    if (running) return;
    if (!root) newTree();

    const targetInput = document.getElementById('residuosTarget');
    const target = Number(targetInput.value);
    if (targetInput.value === '' || Number.isNaN(target) || target < 0 || !Number.isInteger(target)) {
      document.getElementById('residuosStatus').innerHTML = '<span class="no">Escribe un número entero positivo válido.</span>';
      return;
    }

    running = true;
    cancelToken++;
    const myToken = cancelToken;
    const log = document.getElementById('residuosLog');
    log.innerHTML = '';
    const pcode = document.getElementById('residuosPcode');
    const status = document.getElementById('residuosStatus');
    status.innerHTML = `Buscando <b>${target}</b>…`;

    setPcodeActive(pcode, 2);
    let node = root;
    let i = 0;
    renderTree();
    await delay(300);

    while (node && node.key !== null) {
      if (myToken !== cancelToken) return;
      setPcodeActive(pcode, 3);
      renderTree({ [node.key]: 'compare' });
      logEntry(log, `<span class="tag">nivel ${i}</span> nodo actual → clave <b>${node.key}</b>`);
      await delay(SPEED);
      if (myToken !== cancelToken) return;

      setPcodeActive(pcode, 4);
      if (node.key === target) {
        renderTree({ [node.key]: 'found' });
        logEntry(log, `<span class="tag ok">✓</span> ${node.key} == ${target} → <b>encontrado</b>`);
        status.innerHTML = `<span class="ok">Encontrado tras ${i + 1} comparaciones.</span>`;
        running = false;
        return;
      }
      await delay(SPEED * 0.4);
      if (myToken !== cancelToken) return;

      setPcodeActive(pcode, 5);
      const r = bit(target, i);
      logEntry(log, `residuo<sub>${i}</sub>(${target}) = (${target} &gt;&gt; ${i}) &amp; 1 = <b>${r}</b>`);
      await delay(SPEED * 0.6);
      if (myToken !== cancelToken) return;

      if (r === 0) {
        setPcodeActive(pcode, 6);
        logEntry(log, `r = 0 → bajar a la <b>izquierda</b>`);
        node = node.left;
      } else {
        setPcodeActive(pcode, 7);
        logEntry(log, `r = 1 → bajar a la <b>derecha</b>`);
        node = node.right;
      }
      i++;
      renderTree();
      await delay(SPEED * 0.5);
    }

    if (myToken !== cancelToken) return;
    setPcodeActive(pcode, 8);
    logEntry(log, `<span class="tag no">✕</span> Rama vacía → <b>no encontrado</b>`);
    status.innerHTML = `<span class="no">Valor no encontrado.</span>`;
    running = false;
  }

  return { newTree, start, useManualArray };
})();
