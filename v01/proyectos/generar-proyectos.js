/* ==========================================
   GENERADOR DE PÁGINAS DE PROYECTO
   Crea proyecto-01.html … proyecto-12.html en esta carpeta,
   todas con la misma plantilla.

   Cómo usarlo (en la terminal de VS Code):
     cd v01/proyectos
     node generar-proyectos.js

   IMPORTANTE: el contenido de cada proyecto se edita AQUÍ, en la lista PROYECTOS.
   Si editas directo un proyecto-XX.html, el cambio se pierde
   la próxima vez que corras el generador.
   ========================================== */

const fs = require("fs");
const path = require("path");

/* ------------------------------------------
   1. DATOS DE CADA PROYECTO
   - nombre: título del proyecto
   - año, tipo, rol, herramientas: la ficha técnica
   - descripcion: lista de párrafos
   - portada: ruta a la imagen (relativa a esta carpeta), ej: "img/proyecto-01/portada.jpg".
              Si está vacía, se muestra un recuadro gris de "Portada".
   - galeria: lista de imágenes { src, alt }. Si está vacía, se muestran 3 recuadros grises.
   - tono: el mismo tono de gris del vinilo en el carrusel (1 a 6)
   ------------------------------------------ */
const PROYECTOS = [
  {
    nombre: "Proyecto uno",
    tono: 4,
    año: "año",
    tipo: "tipo de proyecto",
    rol: "tu rol",
    herramientas: ["herramienta 1", "herramienta 2"],
    descripcion: [
      "Descripción breve del proyecto: qué es, para quién y por qué.",
      "Proceso, decisiones de diseño y resultado.",
    ],
    portada: "",
    galeria: [],
  },
  {
    nombre: "Proyecto dos",
    tono: 3,
    año: "año",
    tipo: "tipo de proyecto",
    rol: "tu rol",
    herramientas: ["herramienta 1", "herramienta 2"],
    descripcion: [
      "Descripción breve del proyecto: qué es, para quién y por qué.",
      "Proceso, decisiones de diseño y resultado.",
    ],
    portada: "",
    galeria: [],
  },
  {
    nombre: "Proyecto tres",
    tono: 2,
    año: "año",
    tipo: "tipo de proyecto",
    rol: "tu rol",
    herramientas: ["herramienta 1", "herramienta 2"],
    descripcion: [
      "Descripción breve del proyecto: qué es, para quién y por qué.",
      "Proceso, decisiones de diseño y resultado.",
    ],
    portada: "",
    galeria: [],
  },
  {
    nombre: "Proyecto cuatro",
    tono: 1,
    año: "año",
    tipo: "tipo de proyecto",
    rol: "tu rol",
    herramientas: ["herramienta 1", "herramienta 2"],
    descripcion: [
      "Descripción breve del proyecto: qué es, para quién y por qué.",
      "Proceso, decisiones de diseño y resultado.",
    ],
    portada: "",
    galeria: [],
  },
  {
    nombre: "Proyecto cinco",
    tono: 6,
    año: "año",
    tipo: "tipo de proyecto",
    rol: "tu rol",
    herramientas: ["herramienta 1", "herramienta 2"],
    descripcion: [
      "Descripción breve del proyecto: qué es, para quién y por qué.",
      "Proceso, decisiones de diseño y resultado.",
    ],
    portada: "",
    galeria: [],
  },
  {
    nombre: "Proyecto seis",
    tono: 5,
    año: "año",
    tipo: "tipo de proyecto",
    rol: "tu rol",
    herramientas: ["herramienta 1", "herramienta 2"],
    descripcion: [
      "Descripción breve del proyecto: qué es, para quién y por qué.",
      "Proceso, decisiones de diseño y resultado.",
    ],
    portada: "",
    galeria: [],
  },
  {
    nombre: "Proyecto siete",
    tono: 4,
    año: "año",
    tipo: "tipo de proyecto",
    rol: "tu rol",
    herramientas: ["herramienta 1", "herramienta 2"],
    descripcion: [
      "Descripción breve del proyecto: qué es, para quién y por qué.",
      "Proceso, decisiones de diseño y resultado.",
    ],
    portada: "",
    galeria: [],
  },
  {
    nombre: "Proyecto ocho",
    tono: 3,
    año: "año",
    tipo: "tipo de proyecto",
    rol: "tu rol",
    herramientas: ["herramienta 1", "herramienta 2"],
    descripcion: [
      "Descripción breve del proyecto: qué es, para quién y por qué.",
      "Proceso, decisiones de diseño y resultado.",
    ],
    portada: "",
    galeria: [],
  },
  {
    nombre: "Proyecto nueve",
    tono: 2,
    año: "año",
    tipo: "tipo de proyecto",
    rol: "tu rol",
    herramientas: ["herramienta 1", "herramienta 2"],
    descripcion: [
      "Descripción breve del proyecto: qué es, para quién y por qué.",
      "Proceso, decisiones de diseño y resultado.",
    ],
    portada: "",
    galeria: [],
  },
  {
    nombre: "Proyecto diez",
    tono: 1,
    año: "año",
    tipo: "tipo de proyecto",
    rol: "tu rol",
    herramientas: ["herramienta 1", "herramienta 2"],
    descripcion: [
      "Descripción breve del proyecto: qué es, para quién y por qué.",
      "Proceso, decisiones de diseño y resultado.",
    ],
    portada: "",
    galeria: [],
  },
  {
    nombre: "Proyecto once",
    tono: 6,
    año: "año",
    tipo: "tipo de proyecto",
    rol: "tu rol",
    herramientas: ["herramienta 1", "herramienta 2"],
    descripcion: [
      "Descripción breve del proyecto: qué es, para quién y por qué.",
      "Proceso, decisiones de diseño y resultado.",
    ],
    portada: "",
    galeria: [],
  },
  {
    nombre: "Proyecto doce",
    tono: 5,
    año: "año",
    tipo: "tipo de proyecto",
    rol: "tu rol",
    herramientas: ["herramienta 1", "herramienta 2"],
    descripcion: [
      "Descripción breve del proyecto: qué es, para quién y por qué.",
      "Proceso, decisiones de diseño y resultado.",
    ],
    portada: "",
    galeria: [],
  },
];

/* ------------------------------------------
   2. AYUDANTES
   ------------------------------------------ */

/* Número con dos dígitos: 1 → "01" */
const dosDigitos = (n) => String(n).padStart(2, "0");

/* Nombre del archivo de cada proyecto */
const archivo = (i) => `proyecto-${dosDigitos(i + 1)}.html`;

/* Evita que caracteres como < o & rompan el HTML */
const limpiar = (texto) =>
  String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* Recuadro gris de placeholder (como las portadas del carrusel) */
const placeholder = (texto, clase) => `
          <div class="${clase} placeholder">
            <span class="placeholder__icono" aria-hidden="true"></span>
            <span class="placeholder__texto">${texto}</span>
          </div>`;

/* ------------------------------------------
   3. PLANTILLA
   ------------------------------------------ */
function plantilla(p, i) {
  const total = PROYECTOS.length;
  const anterior = (i - 1 + total) % total;
  const siguiente = (i + 1) % total;

  const portada = p.portada
    ? `
          <img class="proyecto__portada" src="${limpiar(p.portada)}" alt="Portada de ${limpiar(p.nombre)}">`
    : placeholder("Portada", "proyecto__portada");

  const galeria = p.galeria.length
    ? p.galeria
        .map((img) => `
          <img class="galeria__item" src="${limpiar(img.src)}" alt="${limpiar(img.alt || p.nombre)}" loading="lazy">`)
        .join("")
    : [1, 2, 3].map((n) => placeholder(`Imagen ${n}`, "galeria__item")).join("");

  const descripcion = p.descripcion.map((parrafo) => `
            <p>${limpiar(parrafo)}</p>`).join("");

  return `<!DOCTYPE html>
<!-- Archivo generado por generar-proyectos.js: edita el contenido allá, no aquí -->
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${limpiar(p.nombre)} — Portafolio de Dayana Pañitrur">
  <meta name="author" content="Dayana Pañitrur">
  <title>${limpiar(p.nombre)} — Dayana Pañitrur</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Baskervville:ital@1&family=Pixelify+Sans&family=Lexend:wght@300;400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../style-v01.css">
  <link rel="stylesheet" href="proyecto-v01.css">
</head>
<body class="pagina-proyecto">

  <header class="header">
    <nav class="nav" aria-label="Navegación principal">
      <ul class="nav__lista">
        <li><a href="../index-v01.html#sobre-mi">sobre mí</a></li>
        <li><a href="../index-v01.html#proyectos">proyectos</a></li>
        <li><a href="../index-v01.html#contacto">contacto</a></li>
      </ul>
    </nav>
  </header>

  <main>

    <!-- Encabezado azul con el número y el nombre del proyecto -->
    <section class="proyecto-titulo">
      <p class="proyecto-titulo__numero">proyecto ${dosDigitos(i + 1)} / ${dosDigitos(total)}</p>
      <h1 class="proyecto-titulo__nombre">${limpiar(p.nombre)}</h1>
    </section>

    <!-- Tarjeta gris: portada + ficha + descripción -->
    <article class="proyecto" style="--tono: var(--tono-${p.tono})">

      <div class="proyecto__cabecera">${portada}

        <div class="proyecto__info">
          <dl class="ficha">
            <div class="ficha__fila">
              <dt>año</dt>
              <dd>${limpiar(p.año)}</dd>
            </div>
            <div class="ficha__fila">
              <dt>tipo</dt>
              <dd>${limpiar(p.tipo)}</dd>
            </div>
            <div class="ficha__fila">
              <dt>rol</dt>
              <dd>${limpiar(p.rol)}</dd>
            </div>
            <div class="ficha__fila">
              <dt>herramientas</dt>
              <dd>${p.herramientas.map(limpiar).join(", ")}</dd>
            </div>
          </dl>

          <div class="proyecto__descripcion">${descripcion}
          </div>
        </div>
      </div>

      <!-- Galería de imágenes del proceso -->
      <section class="galeria" aria-label="Galería">${galeria}
      </section>

    </article>

    <!-- Navegación entre proyectos -->
    <nav class="proyecto-nav" aria-label="Otros proyectos">
      <a class="proyecto-nav__enlace" href="${archivo(anterior)}">
        <span class="proyecto-nav__flecha" aria-hidden="true">←</span>
        <span>${limpiar(PROYECTOS[anterior].nombre)}</span>
      </a>
      <a class="proyecto-nav__volver" href="../index-v01.html#proyectos">todos los proyectos</a>
      <a class="proyecto-nav__enlace proyecto-nav__enlace--siguiente" href="${archivo(siguiente)}">
        <span>${limpiar(PROYECTOS[siguiente].nombre)}</span>
        <span class="proyecto-nav__flecha" aria-hidden="true">→</span>
      </a>
    </nav>

  </main>

</body>
</html>
`;
}

/* ------------------------------------------
   4. GENERAR LOS ARCHIVOS
   ------------------------------------------ */
PROYECTOS.forEach((p, i) => {
  const ruta = path.join(__dirname, archivo(i));
  fs.writeFileSync(ruta, plantilla(p, i), "utf8");
  console.log("✓", archivo(i), "—", p.nombre);
});

console.log(`\nListo: ${PROYECTOS.length} páginas generadas.`);
