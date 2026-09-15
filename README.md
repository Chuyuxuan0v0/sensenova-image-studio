# SenseNova U1.5 Lite Image Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-4c82fb.svg)](LICENSE)

**English** · [中文](README.zh-CN.md)

A local studio for [SenseNova U1.5 Lite](https://platform.sensenova.cn/docs) (`sensenova-u1.5-lite`, built on the Neo-unify architecture): text-to-image and image editing. Every result is archived locally, and a draggable time tree gives you git-like branching from any past generation.

![UI overview](docs/ui-overview.png)

## Interface

A three-pane layout that fills the viewport with no page scrollbar. The UI labels are currently in Chinese.

| Pane | Contents |
|------|----------|
| Top bar | Brand, model id, archive service status, `output/` link |
| Left, Studio | API key, base URL, mode switch, reference images, prompt, parameters, generate button |
| Center, History time tree | React Flow canvas: draggable, zoomable, pannable nodes with thumbnails and a minimap |
| Right, Node inspector | Large preview of the selected node, full parameters, actions (branch from this / reuse params / download / remove) |

### Time tree: a draggable generation history

![Time tree](docs/ui-tree.png)

Each result image is a node. A text-to-image run creates a root node; an image edit attaches under the node its reference image came from. That is what makes branching from any historical node possible, the way you would in git. Nodes can be dragged anywhere on the canvas, which also supports zoom, pan, and minimap navigation.

### Branching from any node

![Branching from a historical node](docs/ui-edit-branch.png)

Click a node on the tree, then hit "基于此编辑" (branch from this) in the inspector. The reference image and prompt are filled in for you, and the next edit attaches under the node you picked, creating a new branch.

## Tech stack

- **Vite + React 19**: split into components, builds to `dist/`
- **@xyflow/react (React Flow)**: the time tree canvas. Node dragging, zoom, pan, and minimap come from the library
- **@dagrejs/dagre**: automatic left-to-right tree layout, plus one-click re-layout
- **Tailwind CSS v4**: design tokens declared via `@theme`
- **@phosphor-icons/react**: icons (no emoji)
- **zustand**: state shared across the three panes
- **@fontsource-variable/geist**: self-hosted Geist / Geist Mono

## Features

- **Text-to-image**: `POST /v1/images/generations`
- **Image editing**: `POST /v1/images/edits` (a separate endpoint that requires a reference image)
- Parameters: `size` (auto plus six 2K/4K presets), `output_format`, `response_format`, `watermark`, `prompt_extend`, `n=1`
- **Local archiving**: every result lands in `output/`, indexed by `output/tree.json`. The server downloads the image itself, which sidesteps both the 24-hour CDN link expiry and browser CORS
- **Time tree (git-like)**: text-to-image creates root nodes; edits attach under the node their reference came from. Branch from any historical node to evolve non-linearly
- API key and parameters are stored in localStorage

## Quick start

```bash
npm install
npm start          # build output + archive API + same-origin proxy, opens the browser
```

Then paste an `sk-` key from the [console](https://platform.sensenova.cn/console/keys) into the page.

### Development mode (hot reload)

```bash
npm start          # terminal 1: archive API + proxy (9119)
npm run dev        # terminal 2: Vite dev server (5173, proxies /api and /v1)
```

Use `npm run dev` while iterating on the frontend, so you get hot reload. Changes to `serve.js` require restarting `npm start`. Run `npm run build` before publishing.

## Project structure

```
web/
  index.html              Vite entry
  src/
    main.jsx              entry (fonts, React Flow styles)
    App.jsx               layout shell, top bar, toast
    store.js              zustand state (config / generation / archive / branching)
    api.js                API wrappers (/api/* and the image endpoints)
    theme.css             design tokens + React Flow dark overrides
    components/
      ControlPanel.jsx    left: studio
      TreeGraph.jsx       center: React Flow time tree (dagre layout)
      ImageNode.jsx       tree node card
      Inspector.jsx       right: node inspector
serve.js                  local server: dist/ + /api archive + /v1 proxy
proxy.js                  standalone CORS proxy (for opening static files directly)
vite.config.mjs           Vite config (root=web, outDir=../dist, dev proxy)
docs/                     README screenshots
output/                   archived images (includes tree.json, gitignored)
```

## Archive API (served by serve.js)

| Endpoint | Description |
|----------|-------------|
| `POST /api/save` | Archive a result. Body: `{mode, prompt, params, parentId, imageBase64 \| imageUrl}` |
| `GET /api/tree` | Return all nodes (the time tree index) |
| `GET /api/image/<id>` | Return a node's image (served locally, so it never expires with the CDN) |
| `DELETE /api/node/<id>` | Remove a node from the tree (index only; the file stays on disk so other branches keep working) |
| `GET /output/` | Browse the archive directory |

## Ports

The server and proxy default to `9119`. Override with an environment variable: `PORT=8080 npm start`.
The Vite dev server defaults to `5173`.

## License

MIT License. See [LICENSE](LICENSE).

The English text is authoritative. A Chinese reference translation is in [LICENSE.zh-CN.md](LICENSE.zh-CN.md).

Copyright (c) 2026 Chuyuxuan0v0
