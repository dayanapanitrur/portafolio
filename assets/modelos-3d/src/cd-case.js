/* =====================================================================
   cd-case.js — integra cd-case.glb en cualquier web con three.js
   ---------------------------------------------------------------------
   Uso mínimo:

     import { mountCDCase } from './cd-case.js';
     const cd = await mountCDCase(document.querySelector('#cd'), {
       url: './cd-case.glb',
       prints: {
         cover: './portada.jpg',                       // imagen
         disc:  { text: 'mi disco', background: '#142BFF', color: '#fff' }, // texto
       },
     });
     cd.setPrint('back', './contra.jpg');              // cambiar después

   Interacción: al pasar el cursor por el case la tapa se abre (≤30°) y
   el CD sale por el costado; al quitar el cursor el CD vuelve a entrar
   y la tapa se cierra. En pantallas táctiles, un toque alterna.
   ===================================================================== */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** Superficie imprimible → nombre del material en el GLB y proporción (ancho/alto) en mm. */
export const PRINTS = {
  cover: { material: 'Print_Cover', size: [120, 120], px: [2048, 2048] },
  back:  { material: 'Print_Back',  size: [137, 117], px: [2048, 1749] },
  spine: { material: 'Print_Spine', size: [117, 4.2], px: [4096, 148] },
  disc:  { material: 'Print_Disc',  size: [120, 120], px: [2048, 2048] },
};

/* ---------------- texturas ---------------- */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen: ' + src));
    img.src = src;
  });
}

/**
 * Dibuja `img` cubriendo todo el canvas (como object-fit: cover).
 * position: [x, y] de 0 a 1, como object-position ([0.5, 0.5] = centrado; y = 1 → muestra la parte de abajo).
 * zoom: 1 = sin zoom; > 1 acerca la imagen.
 */
function drawCover(ctx, img, w, h, position = [0.5, 0.5], zoom = 1) {
  const iw = img.naturalWidth || img.videoWidth || img.width;
  const ih = img.naturalHeight || img.videoHeight || img.height;
  const s = Math.max(w / iw, h / ih) * zoom;
  const [px, py] = position;
  ctx.drawImage(img, (w - iw * s) * px, (h - ih * s) * py, iw * s, ih * s);
}

function fitFont(ctx, text, maxW, maxH, family, weight) {
  let size = maxH;
  ctx.font = `${weight} ${size}px ${family}`;
  const w = ctx.measureText(text).width;
  if (w > maxW) size *= maxW / w;
  return size;
}

/**
 * Dibuja texto "impreso".
 * spec: { text, sub?, background?, color?, fontFamily?, fontWeight?, image? }
 */
function drawText(ctx, w, h, spec, key) {
  const family = spec.fontFamily || '"Helvetica Neue", Helvetica, Arial, sans-serif';
  const weight = spec.fontWeight || 700;
  ctx.fillStyle = spec.color || '#111';
  // sombra suave opcional para que el texto se lea sobre una imagen: shadow: 'rgba(0,0,0,.5)'
  if (spec.shadow) {
    ctx.shadowColor = spec.shadow;
    ctx.shadowBlur = h * 0.012;
    ctx.shadowOffsetY = h * 0.002;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (spec.layout === 'paragraph') return drawParagraph(ctx, w, h, spec, family, weight);

  const lines = String(spec.text ?? '').split('\n');
  if (key === 'spine') {
    const size = fitFont(ctx, lines.join('  ·  '), w * 0.9, h * 0.62, family, weight);
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.fillText(lines.join('  ·  '), w / 2, h / 2 + size * 0.04);
    return;
  }
  // en el CD el texto va sobre la zona del agujero (arriba) para no quedar cortado
  const centerY = key === 'disc' ? h * 0.27 : h * (spec.sub ? 0.45 : 0.5);
  const maxW = key === 'disc' ? w * 0.6 : w * 0.82;
  const lineH = Math.min(h * 0.16, ...lines.map((l) => fitFont(ctx, l || ' ', maxW, h * 0.16, family, weight)));
  ctx.font = `${weight} ${lineH}px ${family}`;
  const top = centerY - ((lines.length - 1) * lineH * 1.08) / 2;
  lines.forEach((l, i) => ctx.fillText(l, w / 2, top + i * lineH * 1.08));

  if (spec.sub) {
    const subSize = lineH * 0.28;
    ctx.font = `400 ${subSize}px ${family}`;
    ctx.globalAlpha = 0.85;
    const subY = key === 'disc' ? h * 0.75 : top + (lines.length - 1) * lineH * 1.08 + lineH * 0.95;
    String(spec.sub).split('\n').forEach((l, i) => ctx.fillText(l, w / 2, subY + i * subSize * 1.4));
    ctx.globalAlpha = 1;
  }
}

/**
 * Texto corrido con salto de línea automático, alineado a la izquierda.
 * spec: { size? (fracción del alto, 0.058), lineHeight? (1.32), padding? (fracción del ancho, 0.1),
 *         valign? 'top' | 'center' | 'bottom' }
 * Un "\n" es salto de línea; una línea vacía separa párrafos. Si no cabe, se achica solo.
 */
function drawParagraph(ctx, w, h, spec, family, weight) {
  const pad = w * (spec.padding ?? 0.1);
  const maxW = w - pad * 2;
  const maxH = h - pad * 2;
  let size = h * (spec.size ?? 0.058);
  let lines, lh;
  const wrap = () => {
    ctx.font = `${weight} ${size}px ${family}`;
    lh = size * (spec.lineHeight ?? 1.32);
    lines = [];
    for (const par of String(spec.text ?? '').split('\n')) {
      if (!par.trim()) { lines.push(''); continue; }
      let line = '';
      for (const word of par.trim().split(/\s+/)) {
        const t = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(t).width > maxW) { lines.push(line); line = word; }
        else line = t;
      }
      lines.push(line);
    }
  };
  wrap();
  while (lines.length * lh > maxH && size > 8) { size *= 0.94; wrap(); }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const total = (lines.length - 1) * lh + size;
  let y = spec.valign === 'center' ? (h - total) / 2 + size * 0.85
    : spec.valign === 'bottom' ? h - pad - total + size * 0.85
    : pad + size * 0.85;
  for (const l of lines) { if (l) ctx.fillText(l, pad, y); y += lh; }
}

/** Espera a que la tipografía esté cargada antes de dibujar en el canvas. */
async function ensureFont(spec) {
  if (!document.fonts || !spec.fontFamily) return;
  try { await document.fonts.load(`${spec.fontWeight || 700} 64px ${spec.fontFamily}`, spec.text || 'a'); } catch {}
}

/**
 * Convierte cualquier fuente en un canvas con la proporción correcta.
 * source: string (URL) | HTMLImageElement | HTMLCanvasElement | ImageBitmap | File/Blob
 *         | { image, position: [x, y], zoom }     imagen con encuadre
 *         | { text, sub, background, color, image? }
 */
export async function renderPrintCanvas(key, source) {
  const { px: [w, h] } = PRINTS[key];
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (source instanceof Blob) source = URL.createObjectURL(source);
  if (typeof source === 'string') source = await loadImage(source);

  if (source && typeof source === 'object' && ('text' in source || 'image' in source)) {
    ctx.fillStyle = source.background || '#ffffff';
    ctx.fillRect(0, 0, w, h);
    if (source.image) {
      let img = source.image;
      if (img instanceof Blob) img = URL.createObjectURL(img);
      if (typeof img === 'string') img = await loadImage(img);
      drawCover(ctx, img, w, h, source.position, source.zoom);
    }
    if (source.text) {
      await ensureFont(source);
      drawText(ctx, w, h, source, key);
    }
  } else if (source) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    drawCover(ctx, source, w, h);
  }
  return canvas;
}

/** Aplica una impresión (imagen o texto) a una superficie del modelo. */
export async function applyPrint(root, key, source, renderer) {
  const def = PRINTS[key];
  if (!def) throw new Error(`Superficie desconocida "${key}". Usa: ${Object.keys(PRINTS).join(', ')}`);
  const canvas = await renderPrintCanvas(key, source);
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;                       // UV en convención glTF
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 8;
  tex.userData.mimeType = key === 'spine' ? 'image/png' : 'image/jpeg'; // para exportar más liviano
  root.traverse((o) => {
    if (o.isMesh && o.material?.name === def.material) {
      o.material.map?.dispose();
      o.material.map = tex;
      o.material.color.set(0xffffff);
      o.material.needsUpdate = true;
    }
  });
  return tex;
}

/* ---------------- carga ---------------- */

export async function loadCDCase(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene.getObjectByName('CDCase') || gltf.scene;
  const clip = gltf.animations.find((a) => a.name === 'HoverOpen') || gltf.animations[0];
  return { gltf, root, clip };
}

/* ---------------- interacción hover ---------------- */

export class CDCaseHover {
  /**
   * @param {THREE.Object3D} root   el case cargado
   * @param {THREE.AnimationClip} clip  "HoverOpen"
   * @param {{openSeconds?: number, closeSeconds?: number}} opts
   */
  constructor(root, clip, { openSeconds = 1.1, closeSeconds = 0.9 } = {}) {
    this.root = root;
    this.mixer = new THREE.AnimationMixer(root);
    this.action = this.mixer.clipAction(clip);
    this.action.setLoop(THREE.LoopOnce, 1);
    this.action.clampWhenFinished = true;
    this.action.play();
    this.duration = clip.duration;
    this.openSeconds = openSeconds;
    this.closeSeconds = closeSeconds;
    this.progress = 0;
    this.open = false;
    this.setProgress(0);
  }
  setProgress(p) {
    this.progress = THREE.MathUtils.clamp(p, 0, 1);
    this.action.time = this.progress * (this.duration - 1e-4);
    this.mixer.update(0);
  }
  update(dt) {
    const target = this.open ? 1 : 0;
    if (this.progress === target) return false;
    const step = dt / (this.open ? this.openSeconds : this.closeSeconds);
    this.setProgress(this.open ? Math.min(1, this.progress + step) : Math.max(0, this.progress - step));
    return true;
  }
}

/* ---------------- escena lista para usar ---------------- */

/**
 * Monta el case en un contenedor HTML.
 * @param {HTMLElement} container
 * @param {object} o
 * @param {string} o.url                ruta a cd-case.glb
 * @param {object} [o.prints]           { cover, back, spine, disc } → URL, imagen o { text, ... }
 * @param {boolean} [o.controls=true]   permitir girar con el mouse (OrbitControls)
 * @param {boolean} [o.zoom=false]
 * @param {number[]} [o.cameraPosition] posición de cámara (perspectiva 3/4 por defecto)
 * @param {number} [o.openSeconds]
 * @param {number} [o.closeSeconds]
 * @param {number} [o.leaveDelay=120]   ms de espera antes de cerrar (evita parpadeos)
 * @param {(open:boolean)=>void} [o.onToggle]
 */
export async function mountCDCase(container, o = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NoToneMapping; // colores de impresión fieles
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.65;
  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(0.3, 0.5, 0.6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7);
  fill.position.set(-0.3, 0.3, -0.6);
  scene.add(fill);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 10);
  camera.position.fromArray(o.cameraPosition || [0.15, 0.09, 0.36]);
  const target = new THREE.Vector3(0.035, 0, 0.004);
  camera.lookAt(target);

  let controls = null;
  if (o.controls !== false) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = !!o.zoom;
    controls.minDistance = 0.2;
    controls.maxDistance = 0.8;
  }

  const { root, clip } = await loadCDCase(o.url || './cd-case.glb');
  scene.add(root);
  const hover = new CDCaseHover(root, clip, o);

  await Promise.all(Object.entries(o.prints || {}).map(([k, src]) => applyPrint(root, k, src, renderer)));

  /* --- detección del cursor sobre el modelo --- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let leaveTimer = 0;
  const setOpen = (v) => {
    clearTimeout(leaveTimer);
    if (v === hover.open) return;
    if (v) { hover.open = true; o.onToggle?.(true); }
    else leaveTimer = setTimeout(() => { hover.open = false; o.onToggle?.(false); }, o.leaveDelay ?? 120);
  };
  const hit = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(root, true).length > 0;
  };
  const onMove = (e) => { if (e.pointerType !== 'touch') setOpen(hit(e)); };
  const onLeave = (e) => { if (e.pointerType !== 'touch') setOpen(false); };
  const onDown = (e) => { if (e.pointerType === 'touch' && hit(e)) { clearTimeout(leaveTimer); hover.open = !hover.open; o.onToggle?.(hover.open); } };
  const el = renderer.domElement;
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  el.addEventListener('pointerdown', onDown);

  /* --- tamaño --- */
  // encuadre automático: el case abierto con el CD afuera siempre cabe en pantalla
  const fit = () => {
    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    const dist = Math.max(0.13 / Math.tan(hHalf), 0.08 / Math.tan(vHalf));
    const center = controls ? controls.target : target;
    const dir = camera.position.clone().sub(center).normalize();
    camera.position.copy(center).addScaledVector(dir, dist);
  };
  const resize = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (o.autoFit !== false) fit();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  /* --- bucle --- */
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    hover.update(dt);
    controls?.update();
    renderer.render(scene, camera);
  });

  return {
    renderer, scene, camera, controls, root, clip, hover,
    /** Cambia una impresión: 'cover' | 'back' | 'spine' | 'disc' */
    setPrint: (k, src) => applyPrint(root, k, src, renderer),
    /** Reencuadra la cámara (útil tras moverla por código). */
    fit,
    /** Abre/cierra por código. */
    setOpen: (v) => { clearTimeout(leaveTimer); hover.open = v; },
    /** Exporta el modelo (con las impresiones actuales) como GLB → ArrayBuffer. */
    async exportGLB() {
      const p = hover.progress;
      hover.setProgress(0);
      try {
        return await new GLTFExporter().parseAsync(root, { binary: true, animations: [clip] });
      } finally {
        hover.setProgress(p);
      }
    },
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerdown', onDown);
      controls?.dispose();
      pmrem.dispose();
      renderer.dispose();
      el.remove();
    },
  };
}
