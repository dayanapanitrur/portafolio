# CD jewel case 3D (glTF / GLB)

Modelo hecho 100 % con código (three.js), exportado a `dist/cd-case.glb`.

## Archivos

| Archivo | Para qué |
|---|---|
| `dist/cd-case.glb` | El modelo: case + CD + animación `HoverOpen` (≈460 KB, sin texturas) |
| `dist/cd-case-con-foto.glb` | **Versión final**: mismo modelo con los diseños ya impresos (portada con imagen + texto en Lexend, foto en el CD) (≈2,6 MB) |
| `src/disenos.js` | **Diseños finales guardados** (textos, tipografía, colores, encuadres) para usar con `cd-case.js` |
| `img/portada.webp` | Imagen de fondo de la portada |
| `img/foto-cd.jpg` | Foto que va en el CD |
| `src/cd-case.js` | Módulo para usarlo en tu web: carga el GLB, imprime imágenes/texto y maneja el hover |
| `src/cd-case-model.js` | Código que construye la geometría y la animación (edítalo para cambiar medidas/ángulo) |
| `tools/generar-glb.html` | Regenera `dist/cd-case.glb` desde el código |
| `index.html` | Previsualización con panel para probar diseños y exportar un GLB con ellos |
| `server.rb` | Servidor local (`ruby server.rb` → http://127.0.0.1:8123) |

## Superficies imprimibles

Mesh y material se llaman igual. Las UV usan la convención glTF → en three.js `texture.flipY = false`.

| Clave | Material | Medida real | Imagen ideal |
|---|---|---|---|
| `cover` | `Print_Cover` | 120 × 120 mm | 2048 × 2048 |
| `back` | `Print_Back` | 137 × 117 mm | 2048 × 1749 |
| `spine` | `Print_Spine` | 117 × 4,2 mm (los dos lomos) | 4096 × 148 |
| `disc` | `Print_Disc` | Ø 120 mm (cuadrado; el centro se recorta) | 2048 × 2048 |

## Uso en una web

```html
<script type="importmap">
  { "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  } }
</script>
<!-- la tipografía de la portada tiene que estar cargada en la página -->
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300..600&display=swap" rel="stylesheet">

<div id="cd" style="width:100%;height:520px"></div>
<script type="module">
  import { mountCDCase } from './assets/modelos-3d/src/cd-case.js';
  import { DISENOS } from './assets/modelos-3d/src/disenos.js';   // diseños finales

  const cd = await mountCDCase(document.getElementById('cd'), {
    url: './assets/modelos-3d/dist/cd-case.glb',
    prints: DISENOS,
    controls: true,   // girar con el mouse
  });
</script>
```

Sin código extra también puedes usar directamente `dist/cd-case-con-foto.glb` (los diseños ya vienen impresos; ahí no necesitas `prints` ni cargar Lexend):

```js
mountCDCase(el, { url: './assets/modelos-3d/dist/cd-case-con-foto.glb' });
```

Para cambiar un diseño más adelante, edita `src/disenos.js`. Cada superficie acepta:
- una imagen: `'./foto.jpg'` o `{ image, position: [x, y], zoom }` (`position` = object-position)
- texto: `{ text, sub, background, color, fontFamily, fontWeight }`
- párrafo: `{ layout: 'paragraph', text, size (0.058), lineHeight (1.32), padding (0.1), valign: 'top' | 'center' | 'bottom' }`
- y combinarlos: `{ image, layout: 'paragraph', text, ... }`

Opciones útiles: `controls`, `zoom`, `cameraPosition`, `openSeconds`, `closeSeconds`, `leaveDelay`, `onToggle(open)`.

## Interacción

- Cursor sobre el case → la tapa gira 28° (tope en el código: 30°) y el CD se levanta del hub y sale por el costado derecho.
- Cursor fuera → el CD vuelve a entrar y luego la tapa se cierra.
- Táctil: un toque alterna abierto/cerrado.

La animación vive dentro del GLB (`HoverOpen`, 1,4 s), así que también sirve en otros visores o con tu propio `AnimationMixer`.
