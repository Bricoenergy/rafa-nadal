# Ciencias con Sara

App de estudio para el examen de Science (The human body, págs. 29–32): sistema nervioso, huesos y articulaciones, músculos y reproducción.

Abre `index.html` en cualquier navegador. No necesita instalación.

- **Tarjetas**: vocabulario inglés ↔ español con pronunciación.
- **Posiciones**: diagramas para situar huesos, articulaciones, músculos y órganos.
- **Test** y **examen de prueba** con nota sobre 10 y repaso de fallos.
- **Ordenar**: procesos paso a paso.
- **Comprensión**: resumen del libro y preguntas abiertas con respuesta modelo.

## Voces

Las voces son audios generados en local con el Estudio creativo (Chatterbox V3), en `audio/`. Si falta un audio, la app usa la voz del navegador.

Para regenerarlas tras cambiar el contenido: `node tools/extract_phrases.cjs`, `node tools/build_jobs.cjs` y `python_embeded\python.exe tools/gen_voices.py tools/jobs.json` (solo genera los que faltan).

# Misión Relieve

App para estudiar **los paisajes y el relieve de España** (Sociales, 5.º, tema 2). Abre `relieve/index.html` en cualquier navegador.

- **Mapa interactivo con alturas reales** (sombreado del terreno y colores por altura), zoom y Canarias.
- **8 misiones** con plan de 5 días: paisaje, tipos de paisaje, Meseta, unidades que la rodean, exteriores y depresiones, picos, costas y gran examen.
- **Retos**: ¿Dónde está?, ¿Qué es?, Clasifícalo, Contrarreloj, Cumbres y Repasar mis fallos.
- XP, niveles y estrellas guardados en el navegador.

Para regenerar el mapa: en `relieve/tools`, `npm install`, `node gen.mjs`, `node relief.mjs` (descarga datos de elevación públicos) y `node build.mjs`.
