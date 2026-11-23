/* =====================================================================
   sobre-mi.js — monta la caja de CD en 3D de la sección "sobre mí"
   Usa el modelo final cd-case-con-foto.glb (los diseños ya vienen impresos).
   Desktop: se abre con hover y se cierra al sacar el mouse.
   Mobile: se abre y se cierra con un toque.
   ===================================================================== */
import { mountCDCase } from '../modelos-3d/cd-case.js';

const contenedor = document.getElementById('cd-3d');

if (contenedor) {
  try {
    await mountCDCase(contenedor, {
      // Ruta al modelo, calculada desde este archivo para que funcione en GitHub Pages
      url: new URL('../modelos-3d/cd-case-con-foto.glb', import.meta.url).href,
      // Sin girar con el mouse: así en mobile se puede seguir haciendo scroll sobre el CD
      controls: false,
    });

    // Si el modelo cargó, se quita el texto de respaldo
    contenedor.querySelector('.cd__respaldo')?.remove();
  } catch (error) {
    // Si el 3D no carga, se queda visible el texto de respaldo
    console.error('No se pudo cargar el modelo 3D del CD:', error);
  }
}
