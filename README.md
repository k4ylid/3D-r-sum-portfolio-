# 3D Résumé Portfolio

A walkable 3D gallery built with Three.js — a résumé you enter instead of read.
Each room is a chapter of a career: projects hang on walls like artwork, skills stand
as exhibits, and the exit is the contact page.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production bundle in dist/
npm run preview  # serve the production build
```

## Controls

| Input | Action |
| --- | --- |
| Click "Enter the gallery" | locks the pointer |
| WASD / arrows | walk |
| Mouse | look |
| Shift | run |
| E or click | read an exhibit (title, story, tech, link) |
| Esc | release pointer / close card |
| Touch | left half = move stick, right half = look, tap = read |

## Layout

```
        Room I      Room II      Room III
   (Tools That Work) (Play & Motion) (The Toolbox)
  ┌────────────┬────────────┬────────────┐
  └──door──────┴───door─────┴──door──────┘
  │             CORRIDOR  + lobby (spawn, east end)  │
  ├──door──────┬────────────┴──door──────┤
  │  About     │            Contact      │
  └────────────┴─────────────────────────┘
```

## Editing content

All career content lives in `src/content.ts` — profile, projects (title,
description, tech chips, link, artwork seed/palette), skills, room names.
Edit that file; the gallery rebuilds from it.

## Tech notes

- Three.js + TypeScript + Vite, no engine framework
- EffectComposer: MSAA render target, subtle bloom, custom grade pass
  (contrast S-curve, warm shadow lift, vignette), OutputPass (ACES tone mapping)
- Procedural everything: wood floor, plaster, artwork, plaques are canvas textures
- Per-exhibit spotlights (grazing picture lights) + corridor wash points + emissive strips
- Circle-vs-AABB collision, pointer-lock FPS controls, touch fallback
- Quality tiers (Low / Medium / High) in the top-right selector — pixel ratio,
  shadows, bloom, dust scale with the tier
