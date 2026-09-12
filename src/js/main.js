// src/js/main.js
// Iniciamos cada módulo de forma segura. Si uno falla o falta, los demás siguen funcionando.

try { Seq.renderPcode(); } catch(e) {}
try { Bin.renderPcode(); } catch(e) {}
try { Hash.reset(); } catch(e) { console.warn("Módulo Hash no cargado"); }
try { Digital.build(); } catch(e) { console.warn("Módulo Digital no cargado"); }
try { Residuos.build(); } catch(e) { console.warn("Módulo Residuos no cargado"); }
try { ResiduosMultiples.build(); } catch(e) { console.warn("Módulo ResiduosMultiples no cargado"); }
try { Huffman.build(); } catch(e) { console.warn("Módulo Huffman no cargado"); }
try { ExtSeq.generate(); } catch(e) { console.warn("Módulo ExtSeq no cargado"); }
try { ExtBin.generate(); } catch(e) { console.warn("Módulo ExtBin no cargado"); }
try { ExtTransformacion.generate(); } catch(e) { console.warn("Módulo ExtTransformacion no cargado"); }
try { BusquedasDinamicas.generate(); } catch(e) { console.error("Módulo BusquedasDinamicas no cargado:", e); }

// Navegar a la pantalla de inicio por defecto (Evita la pantalla en blanco)
goTo('home');