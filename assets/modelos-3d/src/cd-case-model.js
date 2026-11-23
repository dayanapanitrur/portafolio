/* =====================================================================
   Modelo procedural de un CD jewel case + CD (three.js)
   ---------------------------------------------------------------------
   - Unidades: metros (estándar glTF). Case real: 142 × 125 × 10,4 mm.
   - El case está "de pie": la portada mira hacia +Z, bisagra en el borde
     izquierdo (-X). El CD sale por el lado derecho (+X).
   - Superficies imprimibles (mesh y material con el mismo nombre):
       Print_Cover   portada (120 × 120 mm)
       Print_Back    contraportada (137 × 117 mm, se ve por detrás)
       Print_Spine   lomos (117 × 4,2 mm, izquierdo y derecho)
       Print_Disc    etiqueta del CD (UV cuadrado de 120 × 120 mm)
     Sus UV usan la convención glTF (origen arriba-izquierda): al asignar
     una textura en three.js usa texture.flipY = false.
   - Animación "HoverOpen": la tapa se abre (≤ 30°) y luego el CD se
     levanta del hub y se desliza hacia afuera por el costado.
   ===================================================================== */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const DIMENSIONS = {
  caseWidth: 0.142,
  caseHeight: 0.125,
  cover: [0.120, 0.120],
  back: [0.137, 0.117],
  spine: [0.117, 0.0042],
  disc: [0.120, 0.120],
};

export const PRINT_NAMES = {
  cover: 'Print_Cover',
  back: 'Print_Back',
  spine: 'Print_Spine',
  disc: 'Print_Disc',
};

const W = 0.142;
const H = 0.125;
const PIVOT = new THREE.Vector3(-W / 2, 0, 0.0052); // eje de la bisagra
const DISC_Z = 0.0052;                              // centro del CD dentro del case

/* ---------- materiales ---------- */
function makeMaterials() {
  const clear = new THREE.MeshPhysicalMaterial({
    name: 'ClearPlastic',
    color: 0xf4f7f8,
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    ior: 1.49,
    specularIntensity: 1,
  });
  const black = new THREE.MeshPhysicalMaterial({
    name: 'TrayPlastic',
    color: 0x121315,
    roughness: 0.34,
    metalness: 0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
  });
  const paper = new THREE.MeshStandardMaterial({ name: 'Paper', color: 0xf4f2ee, roughness: 0.7 });
  const print = (name, roughness = 0.55) =>
    new THREE.MeshStandardMaterial({ name, color: 0xffffff, roughness, metalness: 0 });

  const discData = new THREE.MeshPhysicalMaterial({
    name: 'DiscData',
    color: 0xe4e6ea,
    metalness: 1,
    roughness: 0.1,
    iridescence: 1,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: [180, 820],
    side: THREE.DoubleSide,
  });
  const discClear = new THREE.MeshPhysicalMaterial({
    name: 'DiscClear',
    color: 0xe9edf0,
    roughness: 0.15,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const silver = new THREE.MeshStandardMaterial({
    name: 'DiscRim', color: 0xcfd2d6, metalness: 1, roughness: 0.28, side: THREE.DoubleSide,
  });

  return {
    clear, black, paper, discData, discClear, silver,
    cover: print(PRINT_NAMES.cover, 0.5),
    back: print(PRINT_NAMES.back, 0.55),
    spine: print(PRINT_NAMES.spine, 0.55),
    disc: print(PRINT_NAMES.disc, 0.38),
  };
}

/* ---------- utilidades de geometría ---------- */
function mesh(name, geometry, material, position = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  m.position.set(...position);
  return m;
}

const box = (w, h, d, r = 0.0004) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01));

/** Plano con UV en convención glTF (v = 0 arriba). */
function printPlane(w, h) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  return g;
}

/** Anillo con UV planar (cuadrado de lado `size`, convención glTF). */
function planarRing(inner, outer, size, segments = 160) {
  const g = new THREE.RingGeometry(inner, outer, segments, 2);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / size + 0.5, 0.5 - pos.getY(i) / size);
  }
  return g;
}

function tube(radius, height, segments = 160) {
  const g = new THREE.CylinderGeometry(radius, radius, height, segments, 1, true);
  g.rotateX(Math.PI / 2); // eje del cilindro → Z
  return g;
}

/* ---------- partes ---------- */
function buildBase(mat) {
  const base = new THREE.Group();
  base.name = 'Base';
  const inner = H - 0.003;

  base.add(mesh('Base_BackPlate', box(W, inner, 0.0012), mat.clear, [0, 0, 0.0006]));
  base.add(mesh('Base_WallLeft', box(0.0014, inner, 0.0058), mat.clear, [-W / 2 + 0.0007, 0, 0.0029]));
  base.add(mesh('Base_WallRight', box(0.0014, inner, 0.0058), mat.clear, [W / 2 - 0.0007, 0, 0.0029]));

  // bloques de la bisagra en la base
  for (const y of [-1, 1]) {
    const k = mesh('Base_Hinge', tube(0.0022, 0.010, 24), mat.clear, [PIVOT.x + 0.0012, y * 0.043, PIVOT.z]);
    k.geometry.rotateX(Math.PI / 2); // tubo → eje Y
    base.add(k);
  }

  // bandeja negra con hub
  const tray = new THREE.Group();
  tray.name = 'Tray';
  tray.add(mesh('Tray_Body', box(W - 0.0062, inner - 0.003, 0.0032, 0.0006), mat.black, [0, 0, 0.00288]));
  const top = 0.00448;
  // anillo de apoyo donde descansa el CD
  const support = mesh('Tray_Support', new THREE.CylinderGeometry(0.0165, 0.0165, 0.0002, 64), mat.black, [0, 0, top + 0.0001]);
  support.geometry.rotateX(Math.PI / 2);
  tray.add(support);
  // hub (roseta con dientes) que entra en el agujero del CD
  const hub = mesh('Tray_Hub', new THREE.CylinderGeometry(0.0062, 0.0066, 0.0016, 48), mat.black, [0, 0, top + 0.0008]);
  hub.geometry.rotateX(Math.PI / 2);
  tray.add(hub);
  const toothGeo = box(0.0011, 0.0026, 0.0018, 0.0003);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const t = mesh('Tray_HubTooth', toothGeo, mat.black, [Math.cos(a) * 0.0059, Math.sin(a) * 0.0059, top + 0.0009]);
    t.rotation.z = a + Math.PI / 2;
    tray.add(t);
  }
  base.add(tray);

  // contraportada: detrás de la bandeja, se ve a través del plástico trasero
  const back = mesh(PRINT_NAMES.back, printPlane(...DIMENSIONS.back), mat.back, [0, 0, 0.00122]);
  back.rotation.y = Math.PI;
  back.userData.print = 'back';
  base.add(back);

  // lomos (texto de arriba hacia abajo)
  for (const side of [-1, 1]) {
    const g = printPlane(...DIMENSIONS.spine);
    g.rotateZ(-Math.PI / 2);
    g.rotateY(side * Math.PI / 2);
    const s = mesh(PRINT_NAMES.spine, g, mat.spine, [side * (W / 2 - 0.0015), 0, 0.0034]);
    s.userData.print = 'spine';
    base.add(s);
  }
  return base;
}

function buildLid(mat) {
  const pivot = new THREE.Group();
  pivot.name = 'LidPivot';
  pivot.position.copy(PIVOT);

  const lid = new THREE.Group();
  lid.name = 'Lid';
  lid.position.set(-PIVOT.x, 0, -PIVOT.z); // coordenadas del case dentro del pivote
  pivot.add(lid);

  lid.add(mesh('Lid_Front', box(W, H, 0.0011), mat.clear, [0, 0, 0.00985]));
  for (const y of [-1, 1]) {
    lid.add(mesh('Lid_Flange', box(W - 0.003, 0.0012, 0.0094), mat.clear, [0.0005, y * (H / 2 - 0.0006), 0.0057]));
    const k = mesh('Lid_Hinge', tube(0.0024, 0.009, 24), mat.clear, [PIVOT.x + 0.0012, y * 0.054, PIVOT.z]);
    k.geometry.rotateX(Math.PI / 2);
    lid.add(k);
  }
  // pestañas que sujetan el folleto (lado derecho)
  for (const y of [-1, 1]) {
    lid.add(mesh('Lid_Tab', box(0.004, 0.012, 0.0012), mat.clear, [W / 2 - 0.0035, y * 0.038, 0.0086]));
  }

  // folleto de portada justo bajo el plástico
  const cover = mesh(PRINT_NAMES.cover, printPlane(...DIMENSIONS.cover), mat.cover, [0.0035, 0, 0.00925]);
  cover.userData.print = 'cover';
  lid.add(cover);
  const inside = mesh('Cover_Inside', new THREE.PlaneGeometry(...DIMENSIONS.cover), mat.paper, [0.0035, 0, 0.0091]);
  inside.rotation.y = Math.PI;
  lid.add(inside);
  return pivot;
}

function buildDisc(mat) {
  const disc = new THREE.Group();
  disc.name = 'Disc';
  disc.position.set(0, 0, DISC_Z);

  const R = 0.06, HOLE = 0.0075, CLEAR = 0.0195, LABEL = 0.0588, T = 0.0012, S = DIMENSIONS.disc[0];

  const label = mesh(PRINT_NAMES.disc, planarRing(CLEAR, LABEL, S), mat.disc, [0, 0, T / 2 + 0.00002]);
  label.userData.print = 'disc';
  disc.add(label);
  disc.add(mesh('Disc_TopRim', new THREE.RingGeometry(LABEL, R, 160, 1), mat.silver, [0, 0, T / 2]));
  disc.add(mesh('Disc_HubTop', new THREE.RingGeometry(HOLE, CLEAR, 96, 1), mat.discClear, [0, 0, T / 2]));

  const data = mesh('Disc_Data', new THREE.RingGeometry(CLEAR, R, 160, 4), mat.discData, [0, 0, -T / 2]);
  data.rotation.y = Math.PI;
  disc.add(data);
  const hubBottom = mesh('Disc_HubBottom', new THREE.RingGeometry(HOLE, CLEAR, 96, 1), mat.discClear, [0, 0, -T / 2]);
  hubBottom.rotation.y = Math.PI;
  disc.add(hubBottom);

  disc.add(mesh('Disc_EdgeOuter', tube(R, T), mat.silver));
  disc.add(mesh('Disc_EdgeInner', tube(HOLE, T, 64), mat.discClear));
  disc.add(mesh('Disc_EdgeData', tube(CLEAR, T * 0.6, 96), mat.silver));
  return disc;
}

/* ---------- animación ---------- */
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const easeInOutCubic = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

/** Pose para un progreso p ∈ [0,1]. */
export function poseAt(p, { maxAngleDeg = 28, slide = 0.088, lift = 0.0024, spinDeg = 40 } = {}) {
  const lidT = easeInOutCubic(p / 0.42);
  const cdT = clamp01((p - 0.3) / 0.7);
  const liftT = smooth(cdT / 0.22);
  const slideT = easeInOutCubic((cdT - 0.12) / 0.88);
  return {
    lidAngle: -THREE.MathUtils.degToRad(maxAngleDeg) * lidT,
    discPos: [slide * slideT, 0, DISC_Z + lift * liftT],
    discSpin: -THREE.MathUtils.degToRad(spinDeg) * slideT,
  };
}

function buildClip(opts) {
  const duration = 1.4;
  const steps = 48;
  const times = [], lidQ = [], discP = [], discQ = [];
  const q = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const pose = poseAt(p, opts);
    times.push(p * duration);
    q.setFromAxisAngle(Y, pose.lidAngle); lidQ.push(q.x, q.y, q.z, q.w);
    discP.push(...pose.discPos);
    q.setFromAxisAngle(Z, pose.discSpin); discQ.push(q.x, q.y, q.z, q.w);
  }
  return new THREE.AnimationClip('HoverOpen', duration, [
    new THREE.QuaternionKeyframeTrack('LidPivot.quaternion', times, lidQ),
    new THREE.VectorKeyframeTrack('Disc.position', times, discP),
    new THREE.QuaternionKeyframeTrack('Disc.quaternion', times, discQ),
  ]);
}

/**
 * Construye el case completo.
 * @param {{maxAngleDeg?: number, slide?: number, spinDeg?: number}} opts
 * @returns {{ root: THREE.Group, clip: THREE.AnimationClip }}
 */
export function buildCDCase(opts = {}) {
  const maxAngleDeg = Math.min(30, opts.maxAngleDeg ?? 28); // nunca más de 30°
  const options = { ...opts, maxAngleDeg };
  const mat = makeMaterials();
  const root = new THREE.Group();
  root.name = 'CDCase';
  root.add(buildBase(mat));
  root.add(buildLid(mat));
  root.add(buildDisc(mat));
  root.userData = {
    generator: 'cd-case-model.js',
    units: 'meters',
    maxAngleDeg,
    printSurfaces: PRINT_NAMES,
  };
  return { root, clip: buildClip(options) };
}
