/* =====================================================================
   Diseños finales del CD case (versión aprobada)
   ---------------------------------------------------------------------
   Úsalo así en tu web:
     import { mountCDCase } from './src/cd-case.js';
     import { DISENOS } from './src/disenos.js';
     mountCDCase(el, { url: './dist/cd-case.glb', prints: DISENOS });

   La portada usa Lexend: carga la fuente en el <head> de la página:
     <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300..600&display=swap" rel="stylesheet">

   Las rutas de imagen se resuelven desde este archivo, así que funcionan
   sin importar desde qué página se importe.
   ===================================================================== */
const img = (name) => new URL(`../img/${name}`, import.meta.url).href;

export const AZUL = '#142BFF';
export const CREMA = '#FFFEFC';

export const DISENOS = {
  // Portada: imagen oscura de Sketchtools + descripción en Lexend, centrada
  cover: {
    image: img('portada.webp'),
    layout: 'paragraph',
    fontFamily: '"Lexend"',
    fontWeight: 400,
    color: CREMA,
    background: AZUL,
    valign: 'center',
    padding: 0.13,
    text:
      'Holaa :) soy Dayana, diseñadora con mención industrial.\n\n' +
      'Actualmente estoy expandiendo mi práctica hacia el diseño de interacción digital.\n' +
      'Me motiva crear desde la inspiración del sonido hasta la experimentación visual y objetual.',
  },
  // Contraportada
  back: { text: 'lado B', sub: '01 intro · 02 proyectos · 03 contacto', background: CREMA, color: AZUL },
  // Lomos
  spine: { text: 'sobre mí\nportafolio', background: AZUL, color: CREMA },
  // CD: foto encuadrada hacia abajo para que la cara quede fuera del agujero central
  disc: { image: img('foto-cd.jpg'), position: [0.5, 1] },
};
