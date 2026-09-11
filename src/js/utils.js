function randUniqueArray(n, min, max){
  const set = new Set();
  while(set.size < n) set.add(Math.floor(Math.random()*(max-min+1))+min);
  return [...set];
}

function delay(ms){ 
  return new Promise(res=>setTimeout(res, ms)); 
}

function logEntry(container, html){
  const div = document.createElement('div');
  div.className='log-entry';
  div.innerHTML = html;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function setPcodeActive(preEl, lineNum){
  preEl.querySelectorAll('span').forEach(s=> s.classList.toggle('active', Number(s.dataset.line)===lineNum));
}