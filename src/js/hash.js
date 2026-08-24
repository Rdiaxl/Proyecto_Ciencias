const Hash = (()=>{
  let table = [];        // for open addressing: array of null|value ; for chaining: array of arrays
  let m = 10;
  let cellCount = 10;
  let mMode = 'exact';
  let method = 'lineal';
  let running = false;
  const HASH_SPEED = 600;

  const notes = {
    lineal: 'Sondeo lineal: si la posición h(k) está ocupada, prueba (h(k)+1) mod m, luego (h(k)+2) mod m, etc., hasta hallar un espacio libre.',
    cuadratico: 'Sondeo cuadrático: si la posición está ocupada, prueba (h(k)+1²) mod m, (h(k)+2²) mod m, (h(k)+3²) mod m… para reducir el agrupamiento (clustering) del sondeo lineal.',
    doble: 'Doble hash: usa una segunda función h₂(k) = R − (k mod R) para calcular el salto entre intentos: (h(k) + i·h₂(k)) mod m. Distribuye mejor las colisiones.',
    encadenado: 'Arreglos anidados (encadenamiento): cada posición de la tabla guarda una lista. Si hay colisión, el valor de K simplemente se agrega a la lista de esa posición — no se necesita sondeo.'
  };

  function isPrime(n){
    if(n<2) return false;
    for(let i=2;i*i<=n;i++){ if(n%i===0) return false; }
    return true;
  }
  
  function prevPrime(n){
    let p=n-1;
    while(p>2 && !isPrime(p)) p--;
    return Math.max(p,2);
  }

  function h1(k){ return ((k % m) + m) % m; }
  function h2(k){
    const R = prevPrime(m);
    const r = k % R;
    return r===0 ? R : R - r;
  }
  function existsInTable(k){
    if(method==='encadenado') return table.some(bucket=>bucket.includes(k));
    return table.includes(k);
  }

  function updateCalc(key, opText, resultText){
    document.getElementById('calcKey').textContent = key;
    document.getElementById('calcOp').textContent = opText;
    document.getElementById('calcResult').textContent = resultText;
    document.querySelectorAll('#hashCalc .calc-box').forEach(b=>{
      b.classList.remove('pulse');
      void b.offsetWidth; // restart animation
      b.classList.add('pulse');
    });
  }

  function reset(){
    cellCount = Number(document.getElementById('hashSize').value);
    mMode = document.getElementById('hashMMode').value;
    m = mMode==='prime' ? prevPrime(cellCount) : cellCount;
    method = document.getElementById('hashMethod').value;
    table = method==='encadenado' ? Array.from({length:m}, ()=>[]) : Array(m).fill(null);

    const readout = document.getElementById('hashMReadout');
    readout.textContent = mMode==='prime'
      ? `m = ${m} (primo anterior a ${cellCount})`
      : `m = ${m}`;

    document.getElementById('hashMethodNote').textContent = notes[method];
    document.getElementById('hashLog').innerHTML = '';
    document.getElementById('hashStatus').textContent = `Tabla lista con ${m} celdas. Inserta un valor de K para comenzar.`;
    updateCalc('—','—','—');
    document.querySelectorAll('#hashCalc .calc-box').forEach(b=>b.classList.remove('pulse'));
    renderBuckets();
  }
  function onMethodChange(){ reset(); }

  function renderBuckets(states={}){
    const wrap = document.getElementById('hashBuckets');
    wrap.innerHTML = table.map((cell,i)=>{
      const st = states[i] || '';
      let inner;
      if(method==='encadenado'){
        inner = cell.length
          ? cell.map(v=>`<span class="chip">${v}</span>`).join('')
          : '<span style="color:var(--text-dim);font-size:11px;">vacío</span>';
        return `<div class="bucket"><div class="b-idx">${i+1}</div><div class="b-slot chain ${st}">${inner}</div></div>`;
      } else {
        inner = cell===null ? '<span style="color:var(--text-dim);font-size:11px;">vacío</span>' : cell;
        return `<div class="bucket"><div class="b-idx">${i+1}</div><div class="b-slot ${st}">${inner}</div></div>`;
      }
    }).join('');
  }

  async function insertOne(k){
    const log = document.getElementById('hashLog');

    if(existsInTable(k)){
      logEntry(log, `<span class="tag no">⚠ duplicado</span> K=${k} ya existe en la tabla — se omite la inserción`);
      return 'duplicate';
    }

    const speed = HASH_SPEED;
    const base = h1(k);       // índice interno 0..m-1
    const basePos = base+1;   // posición mostrada 1..m

    updateCalc(k, `${k} mod ${m} + 1`, '…');
    await delay(speed*0.6);
    updateCalc(k, `${k} mod ${m} + 1`, basePos);
    await delay(speed*0.3);

    if(method==='encadenado'){
      renderBuckets({[base]:'probe'});
      logEntry(log, `<span class="tag">h(${k})</span> = ${k} mod ${m} + 1 = <b>${basePos}</b> → se agrega a la lista de esa posición`);
      await delay(speed);
      table[base].push(k);
      renderBuckets({[base]:'placed'});
      logEntry(log, `<span class="tag ok">✓</span> ${k} insertado en la lista de la posición ${basePos} (tamaño de lista: ${table[base].length})`);
      return 'ok';
    }

    let i=0, idx=base, placed=false;
    const maxAttempts = m;
    while(i<maxAttempts){
      if(method==='lineal') idx = (base + i) % m;
      else if(method==='cuadratico') idx = (base + i*i) % m;
      else if(method==='doble') idx = (base + i*h2(k)) % m;
      const pos = idx+1;

      const formula = method==='lineal' ? `(${base} + ${i}) mod ${m} + 1`
        : method==='cuadratico' ? `(${base} + ${i}²) mod ${m} + 1`
        : `(${base} + ${i}·h₂(${k})) mod ${m} + 1   [h₂=${h2(k)}]`;

      if(i>0){
        updateCalc(k, formula, '…');
        await delay(speed*0.5);
        updateCalc(k, formula, pos);
        await delay(speed*0.25);
      }

      if(table[idx]===null){
        renderBuckets({[idx]:'probe'});
        logEntry(log, `<span class="tag">intento ${i+1}</span> ${formula} = <b>${pos}</b> → libre`);
        await delay(speed);
        table[idx]=k;
        renderBuckets({[idx]:'placed'});
        logEntry(log, `<span class="tag ok">✓</span> ${k} insertado en la posición ${pos}`);
        placed=true;
        break;
      } else {
        renderBuckets({[idx]:'occupied-hit'});
        logEntry(log, `<span class="tag no">colisión</span> intento ${i+1}: ${formula} = <b>${pos}</b> → ocupado por ${table[idx]}`);
        await delay(speed*0.85);
        i++;
      }
    }
    if(!placed){
      logEntry(log, `<span class="tag no">✕</span> no se encontró espacio libre para ${k} tras ${maxAttempts} intentos (tabla llena o ciclo de sondeo)`);
      renderBuckets();
      return 'full';
    }
    renderBuckets();
    return 'ok';
  }

  async function insert(){
    if(running) return;
    const input = document.getElementById('hashKey');
    const k = Number(input.value);
    if(input.value===''||Number.isNaN(k)){
      document.getElementById('hashStatus').innerHTML = '<span class="no">Escribe un valor de K numérico válido.</span>';
      return;
    }
    running=true;
    document.getElementById('hashStatus').innerHTML = `Insertando <b>${k}</b>…`;
    const result = await insertOne(k);
    if(result==='duplicate'){
      document.getElementById('hashStatus').innerHTML = `<span class="no">⚠ K=${k} ya existe en la tabla — no se insertó de nuevo.</span>`;
    } else if(result==='full'){
      document.getElementById('hashStatus').innerHTML = `<span class="no">No se encontró espacio libre para K=${k}.</span>`;
    } else {
      document.getElementById('hashStatus').textContent = 'Listo. Inserta otro valor de K cuando quieras.';
    }
    input.value='';
    running=false;
  }

  async function insertRandom(){
    if(running) return;
    const countInput = document.getElementById('hashRandomCount');
    let count = Number(countInput.value);
    if(countInput.value===''||Number.isNaN(count)||count<1){
      document.getElementById('hashStatus').innerHTML = '<span class="no">Escribe una cantidad válida.</span>';
      return;
    }
    const maxUnique = 99; // rango de claves aleatorias: 1..99
    if(count>maxUnique) count = maxUnique;
    running=true;
    const keys = randUniqueArray(count, 1, 99);
    let inserted=0, duplicates=0, full=0;
    for(const k of keys){
      document.getElementById('hashStatus').innerHTML = `Insertando <b>${k}</b>…`;
      const result = await insertOne(k);
      if(result==='duplicate') duplicates++;
      else if(result==='full') full++;
      else inserted++;
    }
    let summary = `Listo: ${inserted} insertado${inserted===1?'':'s'}`;
    if(duplicates) summary += `, ${duplicates} omitido${duplicates===1?'':'s'} por ser duplicado${duplicates===1?'':'s'}`;
    if(full) summary += `, ${full} sin espacio disponible`;
    summary += '.';
    document.getElementById('hashStatus').innerHTML = (duplicates||full) ? `<span class="no">${summary}</span>` : summary;
    running=false;
  }

  return { reset, onMethodChange, insert, insertRandom };
})();