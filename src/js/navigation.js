// Diccionario de nombres legibles para la interfaz
const LABELS = {
  home: 'Inicio', 
  busquedas: 'Búsquedas', 
  grafos: 'Grafos', 
  externas: 'Externas',
  internas: 'Internas', 
  secuencial: 'Secuencial Interna', 
  binaria: 'Binaria Interna', 
  hashmaps: 'Hashmaps',
  'ext-secuencial': 'Secuencial Externa', 
  'ext-binaria': 'Binaria Externa', 
  'ext-hash': 'Hash Estático', 
  'ext-hash-dinamico': 'Hash Dinámico'
};

// Árbol de relaciones (Padre -> Hijo) para generar la ruta correcta
const PARENTS = {
  busquedas: 'home', 
  grafos: 'home', 
  externas: 'busquedas', 
  internas: 'busquedas',
  secuencial: 'internas', 
  binaria: 'internas', 
  hashmaps: 'internas',
  'ext-secuencial': 'externas', 
  'ext-binaria': 'externas', 
  'ext-hash': 'externas', 
  'ext-hash-dinamico': 'externas'
};

function pathTo(id){
  const chain=[id];
  while(PARENTS[chain[0]]) chain.unshift(PARENTS[chain[0]]);
  return chain;
}

function goTo(id){
  // Ocultar todas las pantallas y mostrar solo la activa
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('is-active', s.dataset.screen === id));
  
  // Reconstruir la cinta de navegación (Breadcrumbs)
  const chain = pathTo(id);
  const tape = document.getElementById('tape');
  tape.innerHTML = chain.map((c, i) => {
    const isLast = i === chain.length - 1;
    return `${i > 0 ? '<span class="sep">/</span>' : ''}<span class="crumb ${isLast ? 'is-current' : 'is-link'}" ${isLast ? '' : `onclick="goTo('${c}')"`}>${LABELS[c]}</span>`;
  }).join('');
  
  // Volver arriba al cambiar de pantalla
  window.scrollTo({top: 0, behavior: 'smooth'});
}