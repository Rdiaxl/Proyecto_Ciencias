const Seq = (() => {
  let arr = [];
  let running = false;
  let cancelToken = 0;
  const SPEED = 700;

  const pcodeLines = [
    'función búsquedaSecuencial(arr, objetivo):',
    '    para i = 0 hasta n-1:',
    '        si arr[i] == objetivo:',
    '            retornar i',
    '    retornar -1   // no encontrado'
  ];

  function renderPcode() {
    document.getElementById('seqPcode').innerHTML =
      pcodeLines.map((l, i) => `<span data-line="${i + 1}">${l}</span>`).join('\n');
  }

  function renderCells(states = {}) {
    const wrap = document.getElementById('seqCells');
    wrap.innerHTML = arr.map((v, i) => {
      const st = states[i] || '';
      return `<div class="cell ${st}"><div class="box">${v}</div><div class="idx">${i}</div></div>`;
    }).join('');
  }

  function newArray() {
    arr = randUniqueArray(10, 1, 99);
    renderPcode();
    renderCells();
    document.getElementById('seqLog').innerHTML = '';
    document.getElementById('seqStatus').textContent = 'Arreglo generado. Escribe un objetivo y pulsa iniciar.';
    running = false;
  }

  function useManualArray() {
    const input = document.getElementById('seqManualInput');
    const raw = input.value.trim();
    const status = document.getElementById('seqStatus');

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
    if (nums.length < 1) {
      status.innerHTML = '<span class="no">Ingresa al menos un número.</span>';
      return;
    }

    arr = [...new Set(nums)];
    renderPcode();
    renderCells();
    document.getElementById('seqLog').innerHTML = '';
    status.innerHTML = `<span class="ok">Arreglo personalizado cargado (${arr.length} elementos).</span> Escribe un objetivo y pulsa iniciar.`;
    running = false;
  }

  async function start() {
    if (running) return;
    if (arr.length === 0) newArray();

    const targetInput = document.getElementById('seqTarget');
    const target = Number(targetInput.value);

    if (targetInput.value === '' || Number.isNaN(target)) {
      document.getElementById('seqStatus').innerHTML = '<span class="no">Escribe un número objetivo válido.</span>';
      return;
    }

    running = true;
    cancelToken++;
    const myToken = cancelToken;
    const log = document.getElementById('seqLog');
    const pcode = document.getElementById('seqPcode');
    const status = document.getElementById('seqStatus');

    log.innerHTML = '';
    status.innerHTML = `Buscando <b>${target}</b>…`;

    setPcodeActive(pcode, 2);
    await delay(300);

    for (let i = 0; i < arr.length; i++) {
      if (myToken !== cancelToken) return;

      setPcodeActive(pcode, 3);
      renderCells({ [i]: 'compare' });
      logEntry(log, `Comparando <span class="tag">arr[${i}]</span> = <b>${arr[i]}</b> con el objetivo <b>${target}</b>`);
      await delay(SPEED);
      if (myToken !== cancelToken) return;

      if (arr[i] === target) {
        setPcodeActive(pcode, 4);
        renderCells({ [i]: 'found' });
        logEntry(log, `<span class="tag ok">✓</span> arr[${i}] == ${target} → <b>encontrado en el índice ${i}</b>`);
        status.innerHTML = `<span class="ok">Encontrado en el índice ${i}.</span>`;
        running = false;
        return;
      }

      await delay(SPEED * 0.3);
    }

    if (myToken !== cancelToken) return;
    setPcodeActive(pcode, 5);
    renderCells({});
    logEntry(log, `<span class="tag no">✕</span> Se recorrió todo el arreglo → <b>no encontrado</b>`);
    status.innerHTML = `<span class="no">Valor no encontrado (-1).</span>`;
    running = false;
  }

  return { newArray, start, useManualArray };
})();
