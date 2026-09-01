const Hash = (()=>{
  let table = [];        // array de posiciones: null | valor
  let m = 10;
  let cellCount = 10;
  let mMode = 'exact';
  let method = 'division';
  let running = false;
  let collisionResolve = null; // resuelve la promesa de elección de colisión
  const HASH_SPEED = 1200; // más lento para que se entienda cada paso

  // Explicación estructurada de cada método (título, fórmula, mecánica, dato extra).
  const methodInfo = {
    division: {
      title: 'División (Módulo)',
      formula: 'h(k) = k mod m',
      mechanic: 'Divides la clave k entre el tamaño de la tabla m y usas el residuo de esa división como índice.',
      extra: 'El tamaño de la tabla (m) suele ser un número primo, porque ayuda a distribuir las claves de forma más uniforme.'
    },
    cuadrado: {
      title: 'Centro del Cuadrado (Mid-Square)',
      formula: 'h(k) = dígitos centrales de k²',
      mechanic: 'Tomas la clave, la elevas al cuadrado (k²), y extraes una cantidad específica de dígitos del centro de ese número resultante para usarlos como índice.',
      extra: 'Todos los dígitos de la clave original influyen en el resultado final, lo que ayuda a reducir las colisiones.'
    },
    plegamiento: {
      title: 'Plegamiento (Folding)',
      formula: 'h(k) = (p₁ + p₂ + … + pₙ) mod m',
      mechanic: 'Divides la clave original en partes más pequeñas y de igual tamaño. Luego sumas esas partes para obtener el índice.',
      extra: 'Es ideal cuando las claves son números extremadamente largos (como un teléfono, un documento de identidad o una cuenta bancaria).'
    },
    truncamiento: {
      title: 'Truncamiento (Extracción)',
      formula: 'h(k) = dígitos en posiciones fijas',
      mechanic: 'Extraes dígitos en posiciones específicas de la clave (aquí: primero, tercero, quinto…) y descartas todo lo demás.',
      extra: 'No requiere cálculos matemáticos complejos, pero falla si muchas claves comparten los mismos dígitos en esas posiciones.'
    },
    bases: {
      title: 'Cambio de Base (Radix)',
      formula: 'h(k) = valor de k interpretado en otra base',
      mechanic: 'Tomas la clave, que normalmente está en base 10 (decimal), y calculas su valor como si estuviera escrita en un sistema numérico distinto (aquí, base 16).',
      extra: 'El nuevo valor resultante en base 10 es el que se usa (tras aplicar el módulo m) para obtener el índice.'
    }
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

  // Extrae 'need' dígitos centrales de una cadena numérica (para Centro del Cuadrado).
  function centerDigits(str, need=2){
    if(str.length <= need) return str;
    const start = Math.ceil((str.length - need)/2);
    return str.substring(start, start+need);
  }

  // Calcula la posición (0..m-1) y el texto del procedimiento para un método dado.
  // Se usa tanto para el cálculo inicial como para recalcular tras una colisión.
  // Ninguno de los 5 métodos suma +1: el índice mostrado es el resultado matemático directo.
  function computeWithMethod(k, mth){
    const kStr = String(Math.abs(k));
    let idx, formula;

    if(mth==='cuadrado'){
      const sq = (k*k).toString();
      const extrStr = centerDigits(sq, 2);
      const val = parseInt(extrStr,10) || 0;
      idx = ((val % m)+m)%m;
      formula = `${k}² = ${sq} → centro = ${val}`;

    } else if(mth==='truncamiento'){
      let trunc = '';
      for(let i=0;i<kStr.length;i+=2) trunc += kStr[i];
      const val = parseInt(trunc,10) || 0;
      idx = ((val % m)+m)%m;
      formula = `dígitos impares = ${val}`;

    } else if(mth==='plegamiento'){
      let sum = 0; const parts = [];
      for(let i=0;i<kStr.length;i+=2){
        const part = kStr.substring(i,i+2);
        parts.push(part);
        sum += parseInt(part,10) || 0;
      }
      idx = ((sum % m)+m)%m;
      formula = `${parts.join('+')} = ${sum}`;

    } else if(mth==='bases'){
      // Desglose completo: cada dígito decimal de K interpretado como dígito hexadecimal.
      const digits = kStr.split('').map(Number);
      const n = digits.length;
      const terms = [];
      const products = [];
      digits.forEach((d,i)=>{
        const power = n-1-i;
        products.push(d * Math.pow(16, power));
        terms.push(`(${d}×16^${power})`);
      });
      const total = products.reduce((a,b)=>a+b,0);
      idx = ((total % m)+m)%m;
      formula = `${terms.join(' + ')} = ${products.join('+')} = ${total}`;

    } else { // division
      idx = ((k % m) + m) % m;
      formula = `${k} mod ${m}`;
    }
    return { idx, formula };
  }

  function existsInTable(k){ return table.includes(k); }

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

  function renderMethodNote(){
    const info = methodInfo[method];
    document.getElementById('hashMethodNote').innerHTML = `
      <div class="method-card-head">
        <span class="method-tag">MÉTODO</span>
        <h5>${info.title}</h5>
      </div>
      <div class="method-formula">${info.formula}</div>
      <p><strong>Mecánica:</strong> ${info.mechanic}</p>
      <p><strong>Dato extra:</strong> ${info.extra}</p>
    `;
  }

  function reset(){
    cellCount = Number(document.getElementById('hashSize').value);
    mMode = document.getElementById('hashMMode').value;
    m = mMode==='prime' ? prevPrime(cellCount) : cellCount;
    method = document.getElementById('hashMethod').value;
    table = Array(m).fill(null);

    const readout = document.getElementById('hashMReadout');
    readout.textContent = mMode==='prime'
      ? `m = ${m} (primo anterior a ${cellCount})`
      : `m = ${m}`;

    renderMethodNote();
    document.getElementById('hashLog').innerHTML = '';
    document.getElementById('hashStatus').textContent = `Tabla lista con ${m} celdas. Inserta un valor de K para comenzar.`;
    updateCalc('—','—','—');
    document.querySelectorAll('#hashCalc .calc-box').forEach(b=>b.classList.remove('pulse'));

    // ocultar cualquier aviso de colisión pendiente
    document.getElementById('hashCollisionAlert').style.display = 'none';
    collisionResolve = null;

    renderBuckets();
  }
  function onMethodChange(){ reset(); }

  function renderBuckets(states={}){
    const wrap = document.getElementById('hashBuckets');
    wrap.innerHTML = table.map((cell,i)=>{
      const st = states[i] || '';
      const inner = cell===null ? '<span style="color:var(--text-dim);font-size:11px;">vacío</span>' : cell;
      return `<div class="bucket"><div class="b-idx">${i}</div><div class="b-slot ${st}">${inner}</div></div>`;
    }).join('');
  }

  // Muestra el aviso de colisión y espera a que el usuario elija con qué método recalcular.
  function askCollisionMethod(){
    document.getElementById('hashCollisionAlert').style.display = 'block';
    return new Promise(resolve => { collisionResolve = resolve; });
  }

  function chooseCollisionMethod(mth){
    document.getElementById('hashCollisionAlert').style.display = 'none';
    if(collisionResolve){
      collisionResolve(mth);
      collisionResolve = null;
    }
  }

  async function insertOne(k){
    const log = document.getElementById('hashLog');

    if(existsInTable(k)){
      logEntry(log, `<span class="tag no">⚠ duplicado</span> K=${k} ya existe en la tabla — se omite la inserción`);
      return 'duplicate';
    }

    const speed = HASH_SPEED;
    let { idx, formula } = computeWithMethod(k, method);

    updateCalc(k, formula, '…');
    await delay(speed*0.6);
    updateCalc(k, formula, idx);
    await delay(speed*0.4);

    let attempts = 0;
    let placed = false;
    const maxAttempts = 12; // límite de reintentos manuales de rehash

    while(attempts < maxAttempts){
      const pos = idx;

      if(table[idx]===null){
        renderBuckets({[idx]:'probe'});
        logEntry(log, `<span class="tag">intento ${attempts+1}</span> posición ${pos} → libre`);
        await delay(speed);
        table[idx]=k;
        renderBuckets({[idx]:'placed'});
        logEntry(log, `<span class="tag ok">✓</span> ${k} insertado en la posición ${pos}`);
        placed=true;
        break;
      }

      // Colisión: mostramos el estado y pedimos con cuál método recalcular.
      renderBuckets({[idx]:'occupied-hit'});
      logEntry(log, `<span class="tag no">colisión</span> posición ${pos} → ocupado por ${table[idx]}`);
      await delay(speed*0.5);

      document.getElementById('hashStatus').innerHTML = `<span class="no">⚠ Colisión en la posición ${pos}. Elige con qué método recalcular.</span>`;
      const newMethod = await askCollisionMethod();
      document.getElementById('hashStatus').innerHTML = `Insertando <b>${k}</b>…`;

      const result = computeWithMethod(k, newMethod);
      idx = result.idx;
      formula = result.formula;
      const label = methodInfo[newMethod].title;

      logEntry(log, `<span class="tag ok">→</span> recalculando con <b>${label}</b>: ${formula} = <b>${idx}</b>`);
      updateCalc(k, formula, '…');
      await delay(speed*0.5);
      updateCalc(k, formula, idx);
      await delay(speed*0.4);

      attempts++;
    }

    if(!placed){
      logEntry(log, `<span class="tag no">✕</span> no se encontró espacio libre para ${k} tras ${maxAttempts} intentos`);
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

  return { reset, onMethodChange, insert, insertRandom, chooseCollisionMethod };
})();