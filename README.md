# Shadow Monk — 3D Portfolio

A dark-fantasy, scroll-driven 3D portfolio built around the shadow monk assassin
character. Inspired by the `sen-3d-resume` style: a fixed full-screen 3D canvas
with scroll-choreographed camera and model motion, layered content sections.

## Stack

- **Vite + React**
- **three.js** via `@react-three/fiber`
- **@react-three/drei** (loaders, environment, contact shadows)
- Scroll-driven camera + model choreography (no external scroll lib — a shared
  `scrollRef` is read inside the render loop)

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Customize your content

All visible text lives in **`src/content.js`** — edit your name, title, about
copy, skills, projects, and contact links there. The sections array also drives
the side navigation.

## The 3D character

- Source model: `shadow_monk_assassin_-_dark_fantasy.glb` (~124 MB, static sculpt
  from Tripo/Sketchfab — no rig, no animations).
- Optimized to **`public/models/monk-optimized.glb`** (~2.5 MB) via glTF-Transform:
  mesh simplification, 2048px WebP textures, Draco compression. Visually ~identical
  at portfolio distance, ~98% smaller.

### Re-optimizing (if you swap the model)

```bash
npx @gltf-transform/cli optimize input.glb public/models/monk-optimized.glb \
  --texture-compress webp --texture-size 2048 --simplify-error 0.001 --compress draco
```

### Animation notes

The model has no skeleton, so motion is driven in `src/components/MonkModel.jsx`
by rotating/bobbing the whole group. On scroll the character turns (reads like it
whirls with the staff) while the camera orbits and dollies — see
`src/components/Scene.jsx` (`CameraRig`). To spin *only* the staff you'd need to
rig the model (separate the rod into its own pivoted node), which is a larger task.

## Tuning knobs

- **Bust framing:** `MODEL_SCALE` / `BASE_Y` in `MonkModel.jsx`, and the camera
  `lookAt` target in `Scene.jsx` (`CameraRig`).
- **Rotation amount:** `targetYaw` in `MonkModel.jsx`.
- **Camera orbit range / dolly:** `angle` / `radius` in `CameraRig`.
- **Mood:** lights + `fog` in `Scene.jsx`; palette in `src/index.css` (`:root`).
- **Atmosphere:** ember count/color in `src/components/Embers.jsx`.
```
