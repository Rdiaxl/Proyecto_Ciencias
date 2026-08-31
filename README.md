# Algoritmos de Búsqueda — Laboratorio Interactivo

Aplicación web autocontenida (HTML + CSS + JavaScript puro, sin frameworks ni build tools) que permite visualizar, paso a paso, el funcionamiento de distintos algoritmos de búsqueda. Cada demo sincroniza pseudocódigo, animación de la estructura de datos y un registro (log) de ejecución.

##  Cómo ejecutarlo

No requiere instalación ni servidor. Basta con abrir `index.html` con doble clic en cualquier navegador moderno (Chrome, Firefox, Edge).

##  Estructura del proyecto

```
.
├── index.html                     # Estructura de todas las pantallas (SPA de una sola página)
├── src/
│   ├── css/
│   │   └── styles.css             # Estilos globales, tema oscuro, animaciones
│   └── js/
│       ├── utils.js                # Helpers compartidos (delay, logEntry, randUniqueArray, etc.)
│       ├── navigation.js           # Router simple entre "pantallas" + breadcrumbs
│       ├── secuencial.js           # Búsqueda secuencial (interna)
│       ├── binaria.js              # Búsqueda binaria (interna)
│       ├── hash.js                 # Hashmaps con 4 métodos de resolución de colisiones
│       ├── ext-secuencial.js       # Búsqueda secuencial externa (bloques + índices)
│       ├── ext-binaria.js          # Búsqueda binaria externa (sobre bloques)
│       ├── ext-hash.js             # Hash estático externo (cubetas + 5 funciones hash)
│       ├── ext-hash-dinamico.js    # Hash dinámico externo (expansión/reducción)
│       └── main.js                 # Inicialización de todos los módulos al cargar la página
└── README.md
```

##  Navegación

La app funciona como una SPA: todas las "pantallas" (`<section class="screen" data-screen="...">`) viven en el mismo `index.html` y se muestran/ocultan con `goTo(id)` (definido en `navigation.js`). Este módulo también arma el breadcrumb (`.tape`) según el árbol de relaciones padre-hijo definido en `PARENTS`.

Mapa de pantallas:

```
home
 └── busquedas
      ├── internas
      │    ├── secuencial
      │    ├── binaria
      │    └── hashmaps
      └── externas
           ├── ext-secuencial
           ├── ext-binaria
           ├── ext-hash
           └── ext-hash-dinamico
 └── grafos   (placeholder, pendiente de implementar)
```

##  Algoritmos implementados

### Búsquedas internas (en memoria / arreglos)

| Módulo | Algoritmo | Complejidad | Detalles |
|---|---|---|---|
| `secuencial.js` | Búsqueda secuencial | O(n) | Recorre el arreglo comparando elemento por elemento, con pseudocódigo resaltado línea a línea. |
| `binaria.js` | Búsqueda binaria | O(log n) | Arreglo ordenado, muestra marcadores `bajo/medio/alto` y descarta mitades. |
| `hash.js` | Hashmaps | O(1) prom. | `h(K) = (K mod m) + 1`. Soporta sondeo lineal, sondeo cuadrático, doble hash y encadenamiento. Permite tabla de 10 o 100 celdas, y `m` exacto o primo anterior. |

### Búsquedas externas (simulación de disco / bloques)

| Módulo | Algoritmo | Detalles |
|---|---|---|
| `ext-secuencial.js` | Secuencial por bloques | Divide el archivo en bloques de tamaño `√N`. Permite comparar búsqueda bloque-a-bloque vs. usando una tabla de índices en RAM. |
| `ext-binaria.js` | Binaria por bloques | Aplica búsqueda binaria sobre los bloques del "disco" y luego una binaria interna dentro del bloque cargado en RAM. |
| `ext-hash.js` | Hash estático | Cubetas fijas (M) con capacidad (B). Incluye 5 funciones hash: módulo, mitad del cuadrado, truncamiento, plegamiento y conversión de bases. |
| `ext-hash-dinamico.js` | Hash dinámico | Expansión automática si la densidad de ocupación supera 75% y reducción si cae bajo 50%. Soporta estrategia total (x2 / ÷2) o parcial (+50% / -33%). |

### Grafos

Sección `grafos` presente en la navegación pero aún **sin implementar** (placeholder visible en `index.html`).

##  Convenciones internas del código

- **Módulos con IIFE + closures**: cada archivo `.js` expone un único objeto global (`Seq`, `Bin`, `Hash`, `ExtSeq`, `ExtBin`, `ExtHash`, `ExtHashDin`) con métodos públicos, ocultando el estado interno (arreglos, flags `running`, etc.).
- **`cancelToken`**: patrón usado en las animaciones asíncronas (`async/await` + `delay()`) para poder cancelar una búsqueda en curso si el usuario inicia otra antes de que termine.
- **`utils.js`** centraliza:
  - `randUniqueArray(n, min, max)`: genera arreglos de valores únicos aleatorios.
  - `delay(ms)`: promesa para pausas controladas (usada para "ritmo" de la animación).
  - `logEntry(container, html)`: agrega una línea al panel de registro de ejecución.
  - `setPcodeActive(preEl, lineNum)`: resalta la línea activa del pseudocódigo.
- **Inicialización robusta**: `main.js` llama a `newArray()`/`generate()`/`reset()` de cada módulo dentro de bloques `try/catch`, de modo que si un módulo falla al cargar, el resto de la aplicación sigue funcionando.

##  Estilos

Tema oscuro definido con variables CSS en `:root` (`styles.css`), con acentos de color para distintos estados:

- `--accent-scan` (ámbar): elemento en comparación / advertencia.
- `--accent-found` (verde-agua): elemento encontrado / éxito.
- `--accent-collision` (rojo): colisión / error / no encontrado.

Tipografías: `Space Grotesk` (títulos), `JetBrains Mono` (código, datos), `Inter` (texto general), cargadas desde Google Fonts.
