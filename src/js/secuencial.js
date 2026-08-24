const Seq = (()=>{
  let arr = [];
  let running = false;
  let cancelToken = 0;

  const pcodeLines = [
    'función búsquedaSecuencial(arr, objetivo):',
    '    para i desde 0 hasta n-1:',
    '        si arr[i] == objetivo:',
    '            retornar i',
    '    retornar -1   // no encontrado'
  ];

  function renderPcode(){
    document.getElementById('seqPcode').innerHTML =
      pcodeLines.map((l,i)=>`<span data-line="${i+1}">${l}</span>`).join('\n');
  }

  function renderCells(states={}){
    const wrap = document.getElementById('seqCells');
    wrap.innerHTML = arr.map((v,i)=>{
      const st = states[i] || '';
      return `<div class="cell ${st}"><div class="box">${v}</div><div class="idx">${i}</div></div>`;
    }).join('');
  }

  function newArray(){
    arr = randUniqueArray(10, 1, 99);
    renderPcode();
    renderCells();
    document.getElementById('seqLog').innerHTML = '';
    document.getElementById('seqStatus').textContent = 'Arreglo nuevo generado. Escribe un objetivo y pulsa iniciar.';
    running = false;
  }

  async function start(){
    if(running) return;
    if(arr.length===0) newArray();
    const targetInput = document.getElementById('seqTarget');
    const target = Number(targetInput.value);
    if(targetInput.value==='' || Number.isNaN(target)){
      document.getElementById('seqStatus').innerHTML = '<span class="no">Escribe un número objetivo válido.</span>';
      return;
    }
    running = true;
    cancelToken++;
    const myToken = cancelToken;
    const log = document.getElementById('seqLog');
    log.innerHTML='';
    const SEQ_SPEED = 650;
    const pcode = document.getElementById('seqPcode');
    const status = document.getElementById('seqStatus');
    status.innerHTML = `Buscando <b>${target}</b>…`;

    setPcodeActive(pcode, 1);
    await delay(150);

    for(let i=0;i<arr.length;i++){
      if(myToken!==cancelToken) return;
      setPcodeActive(pcode, 2);
      renderCells({[i]:'compare'});
      logEntry(log, `<span class="tag">i=${i}</span> comparando arr[${i}]=<b>${arr[i]}</b> con objetivo <b>${target}</b>`);
      await delay(SEQ_SPEED);
      if(myToken!==cancelToken) return;
      setPcodeActive(pcode, 3);
      await delay(SEQ_SPEED*0.4);

      if(arr[i]===target){
        setPcodeActive(pcode, 4);
        renderCells({[i]:'found'});
        logEntry(log, `<span class="tag ok">✓</span> arr[${i}] == ${target} → <b>encontrado en el índice ${i}</b>`);
        status.innerHTML = `<span class="ok">Encontrado en el índice ${i}.</span>`;
        running=false;
        return;
      }
    }
    if(myToken!==cancelToken) return;
    setPcodeActive(pcode, 5);
    renderCells();
    logEntry(log, `<span class="tag no">✕</span> se recorrió todo el arreglo → <b>no encontrado</b>`);
    status.innerHTML = `<span class="no">Valor no encontrado (-1).</span>`;
    running=false;
  }

  return { newArray, start };
})();