/* ==========================================
   CD 3D para la sección "sobre mí"
   Hecho con three.js (se carga desde el importmap del HTML)
   ========================================== */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ------------------------------------------
   CONFIGURACIÓN: lo que tú vas a querer cambiar
   ------------------------------------------ */
const CONFIG = {
  // Foto que va impresa en el CD (idealmente cuadrada). Si no existe, se usa un relleno de prueba.
  foto: '../assets/foto-dayana.jpg',

  // Texto impreso en la portada del case
  titulo: 'sobre mí',
  parrafo:
    'Soy Dayana Pañitrur, diseñadora. Este texto es de prueba: ' +
    'aquí va tu presentación, lo que haces y lo que te mueve. ' +
    'Se dibuja directamente sobre la portada, así que se ve impreso.',

  // Colores (los mismos de style.css)
  colorPortada: '#142BFF',
  colorTexto: '#FFFEFC',
};

/* ------------------------------------------
   Medidas reales de un CD y su case, en centímetros
   ------------------------------------------ */
const CASE_ANCHO = 14.2;
const CASE_ALTO = 12.5;
const PORTADA = 12;          // el folleto de la portada es de 12 × 12 cm
const CD_RADIO = 6;          // CD de 12 cm
const CD_GROSOR = 0.12;
const CD_HOYO = 0.75;

// Cuánto se separan al abrir
const CASE_X_ABIERTO = -5.5;
const CD_X_CERRADO = 1;      // dentro del case, detrás de la portada
const CD_X_ABIERTO = 7.5;

const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------
   Escena, cámara y render
   ------------------------------------------ */
const contenedor = document.querySelector('#escena-cd');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
contenedor.appendChild(renderer.domElement);

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

// Reflejos realistas (sin cargar ninguna imagen extra)
const pmrem = new THREE.PMREMGenerator(renderer);
escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const luz = new THREE.DirectionalLight(0xffffff, 1.2);
luz.position.set(5, 8, 10);
escena.add(luz);

// Todo va dentro de "escenario" para poder inclinarlo un poco con el mouse
const escenario = new THREE.Group();
escena.add(escenario);

/* ------------------------------------------
   EL CASE
   ------------------------------------------ */
const grupoCase = new THREE.Group();
escenario.add(grupoCase);

// Bandeja de atrás (plástico negro)
const bandeja = new THREE.Mesh(
  new RoundedBoxGeometry(CASE_ANCHO, CASE_ALTO, 0.3, 4, 0.08),
  new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.45 })
);
bandeja.position.z = -0.35;
grupoCase.add(bandeja);

// Portada impresa: el texto se dibuja en un canvas y se usa como textura
const canvasPortada = document.createElement('canvas');
canvasPortada.width = canvasPortada.height = 2048;
const texturaPortada = new THREE.CanvasTexture(canvasPortada);
texturaPortada.colorSpace = THREE.SRGBColorSpace;
texturaPortada.anisotropy = renderer.capabilities.getMaxAnisotropy();

const portada = new THREE.Mesh(
  new THREE.PlaneGeometry(PORTADA, PORTADA),
  new THREE.MeshStandardMaterial({ map: texturaPortada, roughness: 0.6 })
);
portada.position.set(CASE_ANCHO / 2 - PORTADA / 2 - 0.1, 0, 0);
grupoCase.add(portada);

// Tapa de plástico transparente encima de la portada
const tapa = new THREE.Mesh(
  new RoundedBoxGeometry(CASE_ANCHO, CASE_ALTO, 0.4, 4, 0.08),
  new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 1,
    thickness: 0.1,
    roughness: 0.03,
    ior: 1.5,
    clearcoat: 1,
  })
);
tapa.position.z = 0.22;
grupoCase.add(tapa);

/* ------------------------------------------
   EL CD
   ------------------------------------------ */
const grupoCD = new THREE.Group();
grupoCD.position.set(CD_X_CERRADO, 0, -0.12);
escenario.add(grupoCD);

// Cuerpo del disco: metálico y tornasol, con el hoyo al centro
const formaDisco = new THREE.Shape().absarc(0, 0, CD_RADIO, 0, Math.PI * 2);
formaDisco.holes.push(new THREE.Path().absarc(0, 0, CD_HOYO, 0, Math.PI * 2, true));
const geoDisco = new THREE.ExtrudeGeometry(formaDisco, { depth: CD_GROSOR, bevelEnabled: false, curveSegments: 96 });
geoDisco.translate(0, 0, -CD_GROSOR / 2);
grupoCD.add(new THREE.Mesh(geoDisco, new THREE.MeshPhysicalMaterial({
  color: 0xdddddd,
  metalness: 1,
  roughness: 0.15,
  iridescence: 1,
  iridescenceIOR: 1.6,
  iridescenceThicknessRange: [200, 800],
})));

// Cara impresa con la foto (un anillo, como la etiqueta de un CD real)
const materialFoto = new THREE.MeshStandardMaterial({
  roughness: 0.45,
  polygonOffset: true,
  polygonOffsetFactor: -1,
});
const caraImpresa = new THREE.Mesh(new THREE.RingGeometry(2.2, CD_RADIO - 0.1, 128), materialFoto);
caraImpresa.position.z = CD_GROSOR / 2 + 0.001;
grupoCD.add(caraImpresa);

cargarFoto(CONFIG.foto);

/* ------------------------------------------
   Dibujar la portada (espera a que carguen las tipografías)
   ------------------------------------------ */
async function dibujarPortada() {
  await Promise.all([
    document.fonts.load('400 200px "Pixelify Sans"'),
    document.fonts.load('400 80px "Lexend"'),
  ]).catch(() => {});

  const ctx = canvasPortada.getContext('2d');
  const t = canvasPortada.width;
  const margen = t * 0.08;

  ctx.fillStyle = CONFIG.colorPortada;
  ctx.fillRect(0, 0, t, t);

  ctx.fillStyle = CONFIG.colorTexto;
  ctx.textBaseline = 'top';
  ctx.font = `400 ${t * 0.13}px "Pixelify Sans", sans-serif`;
  ctx.fillText(CONFIG.titulo, margen, margen);

  ctx.font = `300 ${t * 0.035}px "Lexend", sans-serif`;
  escribirParrafo(ctx, CONFIG.parrafo, margen, t * 0.62, t - margen * 2, t * 0.05);

  texturaPortada.needsUpdate = true;
}

// Corta el párrafo en líneas para que no se salga del ancho
function escribirParrafo(ctx, texto, x, y, anchoMax, alturaLinea) {
  let linea = '';
  for (const palabra of texto.split(' ')) {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > anchoMax && linea) {
      ctx.fillText(linea, x, y);
      linea = palabra;
      y += alturaLinea;
    } else {
      linea = prueba;
    }
  }
  ctx.fillText(linea, x, y);
}

/* ------------------------------------------
   Cargar la foto del CD (recortada al centro si no es cuadrada)
   ------------------------------------------ */
function cargarFoto(ruta) {
  new THREE.TextureLoader().load(
    ruta,
    (textura) => {
      textura.colorSpace = THREE.SRGBColorSpace;
      const proporcion = textura.image.width / textura.image.height;
      if (proporcion > 1) {
        textura.repeat.set(1 / proporcion, 1);
        textura.offset.set((1 - 1 / proporcion) / 2, 0);
      } else {
        textura.repeat.set(1, proporcion);
        textura.offset.set(0, (1 - proporcion) / 2);
      }
      materialFoto.map = textura;
      materialFoto.needsUpdate = true;
    },
    undefined,
    () => usarFotoDePrueba()
  );
}

function usarFotoDePrueba() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const ctx = c.getContext('2d');
  const degradado = ctx.createLinearGradient(0, 0, 1024, 1024);
  degradado.addColorStop(0, '#AAC49E');
  degradado.addColorStop(1, '#142BFF');
  ctx.fillStyle = degradado;
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.fillStyle = '#FFFEFC';
  ctx.font = '400 64px "Lexend", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('tu foto aquí', 512, 160);
  const textura = new THREE.CanvasTexture(c);
  textura.colorSpace = THREE.SRGBColorSpace;
  materialFoto.map = textura;
  materialFoto.needsUpdate = true;
}

/* ------------------------------------------
   Interacción: abrir al pasar el cursor por encima
   ------------------------------------------ */
const raycaster = new THREE.Raycaster();
const puntero = new THREE.Vector2();
const tocables = [bandeja, tapa, portada, ...grupoCD.children];

let abierto = false;
let progreso = 0;              // 0 = cerrado, 1 = abierto
let temporizadorCierre = null;
const inclinacion = new THREE.Vector2();

function estaEncima(evento) {
  const r = renderer.domElement.getBoundingClientRect();
  puntero.set(((evento.clientX - r.left) / r.width) * 2 - 1, -((evento.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(puntero, camara);
  return raycaster.intersectObjects(tocables, false).length > 0;
}

function abrir(valor) {
  clearTimeout(temporizadorCierre);
  if (valor) {
    abierto = true;
  } else {
    // pequeña espera para que no parpadee cuando el case se mueve bajo el cursor
    temporizadorCierre = setTimeout(() => { abierto = false; }, 250);
  }
}

renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const encima = estaEncima(e);
  renderer.domElement.style.cursor = encima ? 'pointer' : 'default';
  if (encima !== abierto) abrir(encima);
  inclinacion.set(puntero.x, puntero.y);
});

renderer.domElement.addEventListener('pointerleave', () => {
  abrir(false);
  inclinacion.set(0, 0);
});

// En celular no hay "hover": un toque abre y otro cierra
renderer.domElement.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'mouse' && estaEncima(e)) {
    clearTimeout(temporizadorCierre);
    abierto = !abierto;
  }
});

// Con teclado: al enfocar se abre, Enter o Espacio lo alternan
contenedor.addEventListener('focus', () => abrir(true));
contenedor.addEventListener('blur', () => abrir(false));
contenedor.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    clearTimeout(temporizadorCierre);
    abierto = !abierto;
  }
});

/* ------------------------------------------
   Tamaño: la cámara se aleja en pantallas angostas para que quepa todo
   ------------------------------------------ */
function ajustarTamano() {
  const { clientWidth: ancho, clientHeight: alto } = contenedor;
  renderer.setSize(ancho, alto);
  camara.aspect = ancho / alto;
  const tanMitad = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
  const distanciaPorAlto = 16 / (2 * tanMitad);
  const distanciaPorAncho = 29 / (2 * tanMitad * camara.aspect);
  camara.position.set(0, 0, Math.max(distanciaPorAlto, distanciaPorAncho));
  camara.updateProjectionMatrix();
}
new ResizeObserver(ajustarTamano).observe(contenedor);
ajustarTamano();

/* ------------------------------------------
   Animación
   ------------------------------------------ */
const reloj = new THREE.Clock();
const suave = (t) => t * t * (3 - 2 * t);

function animar() {
  const dt = Math.min(reloj.getDelta(), 0.05);
  const objetivo = abierto ? 1 : 0;
  progreso += (objetivo - progreso) * (1 - Math.exp(-dt * (reducirMovimiento ? 20 : 5)));
  const p = suave(progreso);

  grupoCase.position.x = THREE.MathUtils.lerp(0, CASE_X_ABIERTO, p);
  grupoCD.position.x = THREE.MathUtils.lerp(CD_X_CERRADO, CD_X_ABIERTO, p);
  // el CD "rueda" al salir y termina derecho (una vuelta completa)
  grupoCD.rotation.z = reducirMovimiento ? 0 : -p * Math.PI * 2;

  // leve inclinación siguiendo el mouse
  if (!reducirMovimiento) {
    escenario.rotation.y += (inclinacion.x * 0.18 - escenario.rotation.y) * 0.06;
    escenario.rotation.x += (-inclinacion.y * 0.12 - escenario.rotation.x) * 0.06;
  }

  renderer.render(escena, camara);
}

// Solo anima cuando la sección está en pantalla (ahorra batería)
new IntersectionObserver(([entrada]) => {
  renderer.setAnimationLoop(entrada.isIntersecting ? animar : null);
}).observe(contenedor);

dibujarPortada();
