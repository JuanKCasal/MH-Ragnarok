# MH-Ragnarok

Web del gremio **Ragnarok** de *Monster Hunter Outlanders*: noticias, guías, perfiles y builds de los miembros, y organización del Guild Clash.

> Sitio de fans no oficial. Monster Hunter es marca de Capcom. No afiliado a Capcom ni a TiMi Studio Group.

- **Frontend:** HTML/CSS/JS sin dependencias en `site/`, publicado en GitHub Pages.
- **Backend:** Google Apps Script en `apps-script/` (API JSON sobre Google Sheets y Drive).
- **Especificación:** [`SPEC.md`](SPEC.md) · **Diseño:** [`DESIGN.md`](DESIGN.md) · **Montar el backend:** [`docs/SETUP-backend.md`](docs/SETUP-backend.md)

## Ver en local

```bash
python -m http.server 8000 -d site   # y abrir http://localhost:8000
```

Sin `API_URL` en `site/config.js`, la web muestra datos de ejemplo (modo demostración).

## Pruebas

```bash
npm test   # Node 22+, sin dependencias
```

Incluye el algoritmo de balanceo de brigadas de Clash, los horarios de eventos y el backend completo sobre un simulador de Apps Script (`tests/gas-mock.mjs`).
