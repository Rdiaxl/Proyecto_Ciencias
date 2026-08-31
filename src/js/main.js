// src/js/main.js
// Iniciamos cada módulo de forma segura. Si uno falla o falta, los demás siguen funcionando.

try { Seq.newArray(); } catch(e) { console.warn("Módulo Seq no cargado"); }
try { Bin.newArray(); } catch(e) { console.warn("Módulo Bin no cargado"); }
try { Hash.reset(); } catch(e) { console.warn("Módulo Hash no cargado"); }
try { Res.newTree(); } catch(e) { console.warn("Módulo Res no cargado"); }
try { Digital.build(); } catch(e) { console.warn("Módulo Digital no cargado"); }
try { ExtSeq.generate(); } catch(e) { console.warn("Módulo ExtSeq no cargado"); }
try { ExtBin.generate(); } catch(e) { console.warn("Módulo ExtBin no cargado"); }
try { ExtHash.generate(); } catch(e) { console.warn("Módulo ExtHash no cargado"); }
try { ExtHashDin.generate(); } catch(e) { console.error("Módulo ExtHashDin no cargado:", e); }

// Navegar a la pantalla de inicio por defecto (Evita la pantalla en blanco)
goTo('home');