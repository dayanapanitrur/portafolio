/* =====================================================================
   main.js — interacciones del sitio
   1. Header: invierte el color del texto y marca la sección visible.
   2. Carrusel de vinilos: hover/toque saca un vinilo; scroll o swipe
      hacen avanzar la pila en loop y al detenerse sale el de adelante.
   3. Fondo que se rasca: donde pasa el mouse el azul deja ver la foto
      durante medio segundo y luego vuelve.
   4. Cursor "bounding box" con el nombre de lo que apunta y sus coordenadas.
   ===================================================================== */

// true en pantallas táctiles (sin mouse): ahí se usan toques en vez de hover
const esTactil = window.matchMedia('(hover: none)').matches;

// true si hay un mouse o trackpad (la pintura del fondo y el cursor solo existen ahí)
const hayMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// Convierte píxeles a rem (1rem = 16 px) para escribir las medidas en rem
const aRem = (px) => `${px / 16}rem`;


/* ---------------------------------------------------------------------
   1. HEADER
   --------------------------------------------------------------------- */
const header = document.querySelector('.header');
const portada = document.querySelector('.portada');
const enlacesSeccion = [...document.querySelectorAll('.nav__enlace[href^="#"]')];

function actualizarHeader() {
  if (!header || !portada) return;

  // Altura de la línea del menú: cuando la portada azul ya pasó por debajo,
  // el texto del header cambia a azul (clase header--claro)
  const lineaMenu = header.offsetHeight * 0.75;
  header.classList.toggle('header--claro', portada.getBoundingClientRect().bottom < lineaMenu);

  // Marca con el punto la sección que ocupa la parte de arriba de la pantalla
  const limite = window.innerHeight * 0.4;
  enlacesSeccion.forEach((enlace) => {
    const seccion = document.querySelector(enlace.getAttribute('href'));
    const caja = seccion.getBoundingClientRect();
    enlace.classList.toggle('nav__enlace--activo', caja.top <= limite && caja.bottom > limite);
  });
}

window.addEventListener('scroll', actualizarHeader, { passive: true });
window.addEventListener('resize', actualizarHeader);
actualizarHeader();


/* ---------------------------------------------------------------------
   2. CARRUSEL DE VINILOS
   --------------------------------------------------------------------- */
const pila = document.querySelector('.pila');

if (pila) {
  const vinilos = [...pila.querySelectorAll('.vinilo')];
  const total = vinilos.length;

  // lugar[k] = posición del vinilo k en la pila (0 = el de adelante)
  let lugar = vinilos.map((_, k) => k);

  // Centra la diagonal según la cantidad de vinilos
  pila.style.setProperty('--centro', (total - 1) / 2);

  // Escribe en cada vinilo su lugar (--i), que el CSS usa para moverlo
  function pintar() {
    vinilos.forEach((vinilo, k) => vinilo.style.setProperty('--i', lugar[k]));
  }

  // Saca un vinilo y guarda los demás (solo uno afuera a la vez)
  function activar(vinilo) {
    vinilos.forEach((v) => v.classList.toggle('vinilo--activo', v === vinilo));
  }

  function guardarTodos() {
    activar(null);
  }

  // Avanza la pila un lugar: con paso 1 el de adelante se va al fondo,
  // con paso -1 el del fondo pasa adelante (loop)
  function avanzar(paso) {
    lugar = lugar.map((p) => (p - paso + total) % total);
    pintar();
  }

  function viniloDeAdelante() {
    return vinilos[lugar.indexOf(0)];
  }

  // Después de moverse, cuando la pila se detiene, sale el vinilo de adelante
  let temporizadorQuieto = 0;
  function alDetenerse() {
    clearTimeout(temporizadorQuieto);
    temporizadorQuieto = setTimeout(() => activar(viniloDeAdelante()), 450);
  }

  /* --- Desktop: hover y rueda del mouse --- */
  if (!esTactil) {
    // Al pasar el mouse por un vinilo se guarda el que estaba afuera
    vinilos.forEach((vinilo) => {
      vinilo.addEventListener('pointerenter', () => guardarTodos());
    });

    // La rueda del mouse sobre la pila la hace avanzar en loop
    let acumulado = 0;
    let enPausa = false;
    pila.addEventListener('wheel', (evento) => {
      evento.preventDefault();
      if (enPausa) return;
      acumulado += evento.deltaY;
      if (Math.abs(acumulado) < 40) return;

      guardarTodos();
      avanzar(acumulado > 0 ? 1 : -1);
      acumulado = 0;
      enPausa = true;
      setTimeout(() => { enPausa = false; }, 350);
      alDetenerse();
    }, { passive: false });
  }

  /* --- Mobile: toque y swipe --- */
  if (esTactil) {
    // Primer toque: saca el vinilo. Segundo toque en el mismo: abre el proyecto
    vinilos.forEach((vinilo) => {
      vinilo.querySelector('a').addEventListener('click', (evento) => {
        if (!vinilo.classList.contains('vinilo--activo')) {
          evento.preventDefault();
          activar(vinilo);
        }
      });
    });

    // Tocar el fondo del carrusel guarda el vinilo
    pila.closest('.carrusel').addEventListener('click', (evento) => {
      if (!evento.target.closest('.vinilo')) guardarTodos();
    });

    // Swipe hacia los lados: la pila avanza o retrocede
    let inicioX = 0;
    let inicioY = 0;
    pila.addEventListener('touchstart', (evento) => {
      inicioX = evento.touches[0].clientX;
      inicioY = evento.touches[0].clientY;
    }, { passive: true });

    pila.addEventListener('touchend', (evento) => {
      const dx = evento.changedTouches[0].clientX - inicioX;
      const dy = evento.changedTouches[0].clientY - inicioY;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;

      guardarTodos();
      avanzar(dx < 0 ? 1 : -1);
      alDetenerse();
    });
  }

  pintar();
}


/* ---------------------------------------------------------------------
   3. FONDO QUE SE "RASCA" CON EL CURSOR (solo inicio y solo con mouse)
   El canvas .fondo-pintura se pinta entero de azul. Donde pasa el cursor
   se borra un círculo (como un rascador) y se ve la foto que el CSS pone
   detrás del canvas. Cada trazo dura medio segundo y luego se desvanece
   hasta volver al azul.
   --------------------------------------------------------------------- */
const RADIO_PINCEL = 80;    // radio del pincel en px (5rem)
const DURACION = 500;       // ms que el trazo queda abierto (medio segundo)
const DESVANECER = 300;     // ms que tarda en volver al azul
const ESCALA = 0.5;         // el canvas se dibuja a la mitad del tamaño: bordes suaves y más liviano

const lienzo = document.querySelector('.fondo-pintura');

if (hayMouse && lienzo && portada) {
  const pincel = lienzo.getContext('2d');
  const azul = getComputedStyle(document.documentElement).getPropertyValue('--azul').trim();

  let puntos = [];          // trazos: { x, y, tiempo } en coordenadas de la página
  let altoZona = 0;
  let animando = false;
  let ultimoX = -1;
  let ultimoY = -1;

  // Pinta todo el canvas de azul (el estado de reposo)
  function pintarAzul() {
    pincel.globalCompositeOperation = 'source-over';
    pincel.globalAlpha = 1;
    pincel.fillStyle = azul;
    pincel.fillRect(0, 0, lienzo.width, lienzo.height);
  }

  // Mide la zona del header + la portada y ajusta el canvas a ese tamaño
  function medirZona() {
    altoZona = portada.getBoundingClientRect().bottom + window.scrollY;
    lienzo.style.setProperty('--alto-fondo', aRem(altoZona));
    lienzo.width = Math.ceil(lienzo.clientWidth * ESCALA);
    lienzo.height = Math.ceil(altoZona * ESCALA);
    pintarAzul();
  }

  // Primero se pinta azul y recién después se pone la foto detrás,
  // así nunca se ve la foto completa de golpe
  medirZona();
  lienzo.classList.add('fondo-pintura--activa');

  // Agrega un punto al trazo. Si el mouse se movió rápido, rellena el espacio
  // entre el punto anterior y el nuevo para que el trazo sea continuo
  function agregarPunto(x, y) {
    if (y > altoZona + RADIO_PINCEL) return;
    const ahora = performance.now();
    const anterior = puntos[puntos.length - 1];
    if (anterior) {
      const distancia = Math.hypot(x - anterior.x, y - anterior.y);
      const pasos = Math.floor(distancia / (RADIO_PINCEL / 3));
      for (let i = 1; i < pasos; i++) {
        const t = i / pasos;
        puntos.push({ x: anterior.x + (x - anterior.x) * t, y: anterior.y + (y - anterior.y) * t, tiempo: ahora });
      }
    }
    puntos.push({ x, y, tiempo: ahora });
    if (!animando) {
      animando = true;
      requestAnimationFrame(dibujar);
    }
  }

  // Dibuja un cuadro: pinta todo azul y rasca los círculos de los trazos vivos
  function dibujar() {
    const ahora = performance.now();
    puntos = puntos.filter((p) => ahora - p.tiempo < DURACION + DESVANECER);

    pintarAzul();
    pincel.globalCompositeOperation = 'destination-out';
    puntos.forEach((p) => {
      const edad = ahora - p.tiempo;
      pincel.globalAlpha = edad < DURACION ? 1 : 1 - (edad - DURACION) / DESVANECER;
      pincel.beginPath();
      pincel.arc(p.x * ESCALA, p.y * ESCALA, RADIO_PINCEL * ESCALA, 0, Math.PI * 2);
      pincel.fill();
    });

    // Si quedan trazos sigue animando; si no, queda azul y se detiene
    if (puntos.length > 0) {
      requestAnimationFrame(dibujar);
    } else {
      pintarAzul();
      animando = false;
    }
  }

  document.addEventListener('pointermove', (evento) => {
    ultimoX = evento.clientX;
    ultimoY = evento.clientY;
    agregarPunto(evento.clientX + window.scrollX, evento.clientY + window.scrollY);
  });

  // Al hacer scroll el cursor también recorre la página, así que también rasca
  window.addEventListener('scroll', () => {
    if (ultimoX >= 0) agregarPunto(ultimoX + window.scrollX, ultimoY + window.scrollY);
  }, { passive: true });

  // Se vuelve a medir cuando terminan de cargar las tipografías y la página,
  // y si cambia el tamaño de la ventana
  document.fonts.ready.then(medirZona);
  window.addEventListener('load', medirZona);
  window.addEventListener('resize', medirZona);
}


/* ---------------------------------------------------------------------
   4. CURSOR "BOUNDING BOX" (solo con mouse)
   Muestra "ID 00 · nombre" de lo que apunta y las coordenadas X / Y en vivo.
   El número sale del data-id de la sección y el nombre del data-cursor
   (o del texto del enlace).
   --------------------------------------------------------------------- */
if (hayMouse) {
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML =
    '<span class="cursor__id"></span>' +
    '<span class="cursor__caja"></span>' +
    '<span class="cursor__coordenadas"></span>';
  document.body.append(cursor);
  document.documentElement.classList.add('con-cursor');

  const textoId = cursor.querySelector('.cursor__id');
  const caja = cursor.querySelector('.cursor__caja');
  const textoCoordenadas = cursor.querySelector('.cursor__coordenadas');

  let mouseX = -100;
  let mouseY = -100;

  // Rellena con ceros a la izquierda: 42 → "0042"
  const cuatroCifras = (n) => String(Math.max(0, Math.round(n))).padStart(4, '0');

  // Mueve el cursor para que el centro de la caja quede justo en la punta del mouse.
  // El cursor vive al final de la página, así que se calcula desde su lugar original
  function ubicarCursor() {
    // Medidas dentro del cursor: dónde está el centro de la caja y cuánto mide en total
    const marco = cursor.getBoundingClientRect();
    const marcoCaja = caja.getBoundingClientRect();
    const centroX = marcoCaja.left - marco.left + marcoCaja.width / 2;
    const centroY = marcoCaja.top - marco.top + marcoCaja.height / 2;
    const altoCursor = textoCoordenadas.getBoundingClientRect().bottom - marco.top;

    let x = mouseX + window.scrollX - centroX;
    let y = mouseY + window.scrollY - centroY;

    // Evita que el cursor alargue la página por abajo
    y = Math.min(y, document.body.offsetHeight - altoCursor);

    cursor.style.transform = `translate(${aRem(x)}, ${aRem(y - cursor.offsetTop)})`;
    textoCoordenadas.textContent = `X ${cuatroCifras(mouseX)} Y ${cuatroCifras(mouseY)}`;
  }

  // Escribe el número de la sección y el nombre de lo que está bajo el mouse
  function actualizarEtiqueta(objetivo) {
    if (!(objetivo instanceof Element)) return;
    const seccion = objetivo.closest('[data-id]');
    const elemento = objetivo.closest('[data-cursor], a, button');
    const numero = seccion ? seccion.dataset.id : '00';
    let nombre = '';
    if (elemento) {
      nombre = elemento.dataset.cursor || elemento.textContent.trim();
    }
    textoId.textContent = `ID ${numero} · ${nombre.toLowerCase()}`;
  }

  document.addEventListener('pointermove', (evento) => {
    mouseX = evento.clientX;
    mouseY = evento.clientY;
    cursor.classList.add('cursor--visible');
    actualizarEtiqueta(evento.target);
    ubicarCursor();
  });

  // Al hacer scroll sin mover el mouse, el cursor sigue en el mismo lugar de la pantalla
  window.addEventListener('scroll', () => {
    ubicarCursor();
    actualizarEtiqueta(document.elementFromPoint(mouseX, mouseY));
  }, { passive: true });

  // Se esconde cuando el mouse sale de la ventana y vuelve al entrar
  document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('cursor--visible'));
  document.documentElement.addEventListener('mouseenter', () => cursor.classList.add('cursor--visible'));
}
