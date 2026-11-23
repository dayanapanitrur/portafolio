/* ==========================================
   CARRUSEL DE PROYECTOS
   - Al hacer scroll en la página, la pila de vinilos avanza en diagonal y en loop.
   - Al detener el scroll, sale el vinilo que está en foco (el más cercano al punto de foco).
   - Desktop: el hover saca el vinilo. Mobile: el tap.
   ========================================== */

const carrusel = document.querySelector(".carrusel");
const pila = document.querySelector(".carrusel__pila");

if (carrusel && pila) {

  const TOTAL = 24;              // vinilos en la pila: múltiplo de 12 para que el loop no salte
  const PX_POR_PASO = 140;       // píxeles de scroll para avanzar un vinilo
  const ESPERA_FOCO = 220;       // ms sin scroll para sacar el vinilo en foco

  /* --- 1. Armar la pila ---
     En el HTML hay 12 proyectos (uno → doce). Para llenar la diagonal se repiten
     (las copias se ocultan a lectores de pantalla) y se ordenan como en Figma:
     del fondo al frente: diez, nueve, … , uno, doce, once, diez, … */
  const originales = Array.from(pila.children);
  const usados = new Set();
  const ordenados = [];

  for (let lugar = 0; lugar < TOTAL; lugar++) {
    const indice = (((9 - lugar) % originales.length) + originales.length) % originales.length;
    const original = originales[indice];

    if (usados.has(indice)) {
      const copia = original.cloneNode(true);
      copia.setAttribute("aria-hidden", "true");
      copia.setAttribute("tabindex", "-1");
      ordenados.push(copia);
    } else {
      usados.add(indice);
      ordenados.push(original);
    }
  }

  pila.replaceChildren(...ordenados);

  /* Le dice a cada vinilo su lugar en la pila (el CSS lo usa para bajarlo) */
  function numerarVinilos() {
    Array.from(pila.children).forEach((vinilo, i) => {
      vinilo.style.setProperty("--i", i);
    });
  }

  numerarVinilos();

  /* --- 2. Activar un vinilo (solo uno a la vez) --- */
  function activar(vinilo) {
    pila.querySelectorAll(".vinilo.activo").forEach((v) => {
      if (v !== vinilo) v.classList.remove("activo");
    });
    if (vinilo) vinilo.classList.add("activo");
  }

  function desactivarTodos() {
    activar(null);
  }

  /* Hover (desktop), tap (mobile) y teclado */
  pila.addEventListener("mouseover", (e) => {
    const vinilo = e.target.closest(".vinilo");
    if (vinilo) activar(vinilo);
  });

  carrusel.addEventListener("mouseleave", desactivarTodos);

  /* Abre la página del proyecto (data-url en el HTML) */
  function abrirProyecto(vinilo) {
    if (vinilo.dataset.url) window.location.href = vinilo.dataset.url;
  }

  /* Desktop (hay hover): el clic abre el proyecto.
     Mobile: el primer toque saca el vinilo y el segundo abre el proyecto */
  const tieneHover = window.matchMedia("(hover: hover)").matches;

  pila.addEventListener("click", (e) => {
    const vinilo = e.target.closest(".vinilo");
    if (!vinilo) return;
    if (tieneHover || vinilo.classList.contains("activo")) {
      abrirProyecto(vinilo);
    } else {
      activar(vinilo);
    }
  });

  /* Teclado: Enter sobre un vinilo abre el proyecto */
  pila.addEventListener("keydown", (e) => {
    const vinilo = e.target.closest(".vinilo");
    if (vinilo && e.key === "Enter") abrirProyecto(vinilo);
  });

  pila.addEventListener("focusin", (e) => {
    const vinilo = e.target.closest(".vinilo");
    if (vinilo) activar(vinilo);
  });

  /* --- 3. Avance en diagonal con el scroll (loop) ---
     "avance" va de 0 a 1 mientras la pila se corre un paso.
     Al completar un paso, el vinilo del frente pasa al fondo (o al revés)
     y avance vuelve a 0: así el movimiento nunca se acaba. */
  let avance = 0;
  let ultimoScroll = window.scrollY;
  let temporizador = null;
  let pendiente = false;

  function pintar() {
    pendiente = false;

    const delta = window.scrollY - ultimoScroll;
    ultimoScroll = window.scrollY;
    avance += delta / PX_POR_PASO;

    // Avanzó hacia el frente: el último (frente) pasa a ser el primero (fondo)
    while (avance >= 1) {
      pila.prepend(pila.lastElementChild);
      avance -= 1;
      numerarVinilos();
    }

    // Retrocedió: el primero (fondo) pasa a ser el último (frente)
    while (avance < 0) {
      pila.append(pila.firstElementChild);
      avance += 1;
      numerarVinilos();
    }

    carrusel.style.setProperty("--avance", avance.toFixed(4));
  }

  /* Busca el vinilo cuyo centro está más cerca del punto de foco
     (--foco-x en el CSS: en mobile está más a la izquierda para que quepa el nombre) */
  function viniloEnFoco() {
    const caja = carrusel.getBoundingClientRect();
    const foco = parseFloat(getComputedStyle(carrusel).getPropertyValue("--foco-x")) || 0.5;
    const centroX = caja.left + caja.width * foco;
    const centroY = caja.top + caja.height / 2;
    let mejor = null;
    let menorDistancia = Infinity;

    pila.querySelectorAll(".vinilo").forEach((vinilo) => {
      const r = vinilo.getBoundingClientRect();
      const dx = r.left + r.width / 2 - centroX;
      const dy = r.top + r.height / 2 - centroY;
      const distancia = dx * dx + dy * dy;
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        mejor = vinilo;
      }
    });

    return mejor;
  }

  /* Solo se reacciona al scroll cuando el carrusel se ve en pantalla */
  function carruselVisible() {
    const r = carrusel.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  window.addEventListener("scroll", () => {
    if (!carruselVisible()) {
      ultimoScroll = window.scrollY;
      return;
    }

    if (!pendiente) {
      pendiente = true;
      requestAnimationFrame(pintar);
    }

    // Mientras se hace scroll, los vinilos vuelven a la pila
    if (!carrusel.matches(":hover")) desactivarTodos();

    // Al detenerse, sale el vinilo en foco
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      if (!carrusel.matches(":hover")) activar(viniloEnFoco());
    }, ESPERA_FOCO);
  }, { passive: true });
}


/* ==========================================
   SOBRE MÍ: MODELO 3D DE LA CARCASA + CD
   - Carga assets/modelos-3d/dist/cd-case.glb con el módulo cd-case.js (three.js).
   - Los textos del HTML se "imprimen" sobre el modelo:
       .sobre-mi__texto → portada de la carcasa
       .sobre-mi__cd    → el disco
   - Desktop: al pasar el cursor la tapa se abre y el cd sale. Mobile: un toque.
   - Se puede girar arrastrando.
   - Si algo falla (sin WebGL, sin internet…), se muestran los textos HTML de respaldo.
   ========================================== */

const RUTA_CD_JS = "../assets/modelos-3d/src/cd-case.js";   // relativa a este archivo
const RUTA_CD_GLB = "../assets/modelos-3d/dist/cd-case.glb"; // relativa a index-v01.html

const sobreMi = document.querySelector(".sobre-mi");
const contenedorCD = document.querySelector("#cd-3d");

/* Parte un texto en líneas que quepan en "anchoMax" (para el canvas) */
function partirEnLineas(ctx, texto, anchoMax) {
  const palabras = texto.split(/\s+/);
  const lineas = [];
  let linea = "";

  palabras.forEach((palabra) => {
    const prueba = linea ? linea + " " + palabra : palabra;
    if (ctx.measureText(prueba).width > anchoMax && linea) {
      lineas.push(linea);
      linea = palabra;
    } else {
      linea = prueba;
    }
  });

  if (linea) lineas.push(linea);
  return lineas;
}

/* Dibuja la portada de la carcasa (2048 × 2048 px) con los párrafos de presentación,
   imitando el recuadro blanco del diseño: fondo blanco roto, texto negro, Lexend Medium */
function dibujarPortada(parrafos) {
  const lado = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFEFC";
  ctx.fillRect(0, 0, lado, lado);

  const margen = lado * 0.11;
  const anchoMax = lado - margen * 2;
  const separacionParrafos = lado * 0.07;
  let tamano = 120;
  let bloques;
  let altoTotal;

  // Achica la letra hasta que todo el texto quepa en la portada
  do {
    ctx.font = `500 ${tamano}px "Lexend", sans-serif`;
    bloques = parrafos.map((p) => partirEnLineas(ctx, p, anchoMax));
    const totalLineas = bloques.reduce((suma, b) => suma + b.length, 0);
    altoTotal = totalLineas * tamano * 1.3 + separacionParrafos * (bloques.length - 1);
    tamano -= 4;
  } while (altoTotal > lado - margen * 2 && tamano > 40);
  tamano += 4;

  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  let y = (lado - altoTotal) / 2;

  bloques.forEach((lineas) => {
    lineas.forEach((linea) => {
      ctx.fillText(linea, margen, y);
      y += tamano * 1.3;
    });
    y += separacionParrafos;
  });

  return canvas;
}

async function montarCD() {
  if (!sobreMi || !contenedorCD) return;

  // Se esconden los textos HTML de inmediato para que no "parpadeen" antes del 3D
  sobreMi.classList.add("sobre-mi--3d");

  try {
    // Textos que se imprimen sobre el modelo, tomados del HTML
    const parrafosPortada = Array.from(document.querySelectorAll(".sobre-mi__texto p"))
      .map((p) => p.textContent.trim());
    const [textoCD = "", subtextoCD = ""] = Array.from(document.querySelectorAll(".sobre-mi__cd p"))
      .map((p) => p.textContent.trim());

    // El canvas necesita que Lexend ya esté cargada para dibujar con ella
    await document.fonts.load('500 100px "Lexend"');

    const { mountCDCase } = await import(RUTA_CD_JS);
    const menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    await mountCDCase(contenedorCD, {
      url: RUTA_CD_GLB,
      controls: true,   // girar arrastrando
      zoom: false,      // sin zoom, así el scroll de la página no se traba
      openSeconds: menosMovimiento ? 0.01 : 1.1,
      closeSeconds: menosMovimiento ? 0.01 : 0.9,
      prints: {
        cover: dibujarPortada(parrafosPortada),
        disc: dibujarDisco(textoCD, subtextoCD),
        spine: {
          text: "dayana pañitrur  ·  sobre mí",
          background: "#142BFF",
          color: "#FFFEFC",
          fontFamily: '"Lexend", sans-serif',
          fontWeight: 500,
        },
      },
    });

    sobreMi.classList.add("sobre-mi--3d-listo");
  } catch (error) {
    // Respaldo: vuelven los textos HTML
    console.warn("No se pudo cargar el cd 3D:", error);
    sobreMi.classList.remove("sobre-mi--3d", "sobre-mi--3d-listo");
    contenedorCD.replaceChildren();
  }
}

/* Dibuja el disco (2048 × 2048 px): azul eléctrico con dos textos en blanco roto,
   uno arriba y otro abajo del agujero, del mismo tamaño (como en Figma) */
function dibujarDisco(textoArriba, textoAbajo) {
  const lado = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#142BFF";
  ctx.fillRect(0, 0, lado, lado);

  const anchoMax = lado * 0.56;  // que no se salga del borde redondo del disco
  let tamano = 110;
  let arriba;
  let abajo;

  // Achica la letra hasta que cada texto quepa en máximo 2 líneas
  do {
    ctx.font = `500 ${tamano}px "Lexend", sans-serif`;
    arriba = partirEnLineas(ctx, textoArriba, anchoMax);
    abajo = partirEnLineas(ctx, textoAbajo, anchoMax);
    tamano -= 4;
  } while ((arriba.length > 2 || abajo.length > 2) && tamano > 40);
  tamano += 4;

  ctx.fillStyle = "#FFFEFC";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const interlineado = tamano * 1.3;

  // Cada bloque se centra en su zona: 27% (arriba del agujero) y 73% (abajo)
  [[arriba, 0.27], [abajo, 0.73]].forEach(([lineas, centro]) => {
    const inicio = lado * centro - ((lineas.length - 1) * interlineado) / 2;
    lineas.forEach((linea, i) => ctx.fillText(linea, lado / 2, inicio + i * interlineado));
  });

  return canvas;
}

montarCD();
