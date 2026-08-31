const Bin = (()=>{
  let arr = [];
  let running = false;
  let cancelToken = 0;

  const pcodeLines = [
    'función búsquedaBinaria(arr, objetivo):',
    '    bajo = 0;  alto = n-1',
    '    mientras bajo <= alto:',
    '        medio = piso((bajo+alto)/2)',
    '        si arr[medio] == objetivo: retornar medio',
    '        si arr[medio] < objetivo: bajo = medio+1',
    '        si no: alto = medio-1',
    '    retornar -1   // no encontrado'
  ];

  function renderPcode(){
    document.getElementById('binPcode').innerHTML =
      pcodeLines.map((l,i)=>`<span data-line="${i+1}">${l}</span>`).join('\n');
  }

  function renderCells(states={}, range=null){
    const wrap = document.getElementById('binCells');
    wrap.innerHTML = arr.map((v,i)=>{
      let st = states[i] || '';
      if(range && (i<range[0] || i>range[1])) st += ' out-of-range';
      return `<div class="cell ${st}"><div class="box">${v}</div><div class="idx">${i}</div></div>`;
    }).join('');
  }

  function renderMarkers(lo,mid,hi){
    const wrap = document.getElementById('binMarkers');
    wrap.innerHTML = arr.map((_,i)=>{
      const labels=[];
      if(i===lo) labels.push('<span class="m-b">bajo</span>');
      if(i===mid) labels.push('<span class="m-m">medio</span>');
      if(i===hi) labels.push('<span class="m-a">alto</span>');
      return `<div class="marker-slot">${labels.join('<br>')}</div>`;
    }).join('');
  }

  function newArray(){
    arr = randUniqueArray(11, 1, 99).sort((a,b)=>a-b);
    renderPcode();
    renderCells();
    document.getElementById('binMarkers').innerHTML='';
    document.getElementById('binLog').innerHTML = '';
    document.getElementById('binStatus').textContent = 'Arreglo ordenado generado. Escribe un objetivo y pulsa iniciar.';
    running = false;
  }

  function useManualArray(){
    const input = document.getElementById('binManualInput');
    const raw = input.value.trim();
    const status = document.getElementById('binStatus');

    if(raw===''){
      status.innerHTML = '<span class="no">Escribe al menos un número (separados por comas).</span>';
      return;
    }

    const parts = raw.split(/[,\s]+/).filter(Boolean);
    const nums = parts.map(Number);

    if(nums.some(n => Number.isNaN(n))){
      status.innerHTML = '<span class="no">Solo se permiten números, separados por comas o espacios.</span>';
      return;
    }
    if(nums.length < 1){
      status.innerHTML = '<span class="no">Ingresa al menos un número.</span>';
      return;
    }

    arr = [...new Set(nums)].sort((a,b)=>a-b);
    renderPcode();
    renderCells();
    document.getElementById('binMarkers').innerHTML='';
    document.getElementById('binLog').innerHTML = '';
    status.innerHTML = `<span class="ok">Arreglo personalizado cargado y ordenado (${arr.length} elementos).</span> Escribe un objetivo y pulsa iniciar.`;
    running = false;
  }

  async function start(){
    if(running) return;
    if(arr.length===0) newArray();
    const targetInput = document.getElementById('binTarget');
    const target = Number(targetInput.value);
    if(targetInput.value==='' || Number.isNaN(target)){
      document.getElementById('binStatus').innerHTML = '<span class="no">Escribe un número objetivo válido.</span>';
      return;
    }
    running = true;
    cancelToken++;
    const myToken = cancelToken;
    const log = document.getElementById('binLog');
    log.innerHTML='';
    const BIN_SPEED = 850;
    const pcode = document.getElementById('binPcode');
    const status = document.getElementById('binStatus');
    status.innerHTML = `Buscando <b>${target}</b>…`;

    let lo=0, hi=arr.length-1;
    setPcodeActive(pcode,2);
    renderCells({}, [lo,hi]);
    renderMarkers(lo,null,hi);
    await delay(300);

    while(lo<=hi){
      if(myToken!==cancelToken) return;
      setPcodeActive(pcode,3);
      const mid = Math.floor((lo+hi)/2);
      setPcodeActive(pcode,4);
      renderCells({[mid]:'compare'}, [lo,hi]);
      renderMarkers(lo,mid,hi);
      logEntry(log, `<span class="tag">rango [${lo},${hi}]</span> medio=${mid} → arr[${mid}]=<b>${arr[mid]}</b>`);
      await delay(BIN_SPEED);
      if(myToken!==cancelToken) return;

      setPcodeActive(pcode,5);
      if(arr[mid]===target){
        renderCells({[mid]:'found'}, [lo,hi]);
        logEntry(log, `<span class="tag ok">✓</span> arr[${mid}] == ${target} → <b>encontrado en el índice ${mid}</b>`);
        status.innerHTML = `<span class="ok">Encontrado en el índice ${mid}.</span>`;
        running=false;
        return;
      }
      await delay(BIN_SPEED*0.4);
      if(myToken!==cancelToken) return;

      if(arr[mid] < target){
        setPcodeActive(pcode,6);
        logEntry(log, `arr[${mid}] &lt; ${target} → descarta mitad izquierda, bajo = ${mid+1}`);
        lo = mid+1;
      } else {
        setPcodeActive(pcode,7);
        logEntry(log, `arr[${mid}] &gt; ${target} → descarta mitad derecha, alto = ${mid-1}`);
        hi = mid-1;
      }
      renderCells({}, [lo,hi]);
      renderMarkers(lo,null,hi);
      await delay(BIN_SPEED*0.5);
    }
    if(myToken!==cancelToken) return;
    setPcodeActive(pcode,8);
    logEntry(log, `<span class="tag no">✕</span> bajo &gt; alto → <b>no encontrado</b>`);
    status.innerHTML = `<span class="no">Valor no encontrado (-1).</span>`;
    running=false;
  }

  return { newArray, start, useManualArray };
})();