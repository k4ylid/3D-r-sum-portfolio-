// All career content lives here — edit this file to update the gallery.

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  year: string;
  role: string;
  description: string;
  tech: string[];
  link?: string;
  /** seed + palette drive the procedural artwork */
  seed: number;
  palette: [string, string, string];
}

export interface Room {
  id: string;
  name: string;
  /** world-space rect used for the HUD room-title + door placement */
  rect: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** where the doorway in the corridor wall sits (x for N rooms, x for S rooms) */
  doorCenter: number;
  side: 'north' | 'south';
  theme: string;
  projects: Project[];
}

export const PROFILE = {
  name: 'KHALID',
  tagline: 'Creative developer — tools, games & interactive experiences',
  intro:
    'This building is my résumé. Each room is a chapter of my career — walk in, look around, and press E on anything that catches your eye.',
  github: 'https://github.com/k4ylid',
  email: 'k74l3d@gmail.com',
};

export const PROJECTS: Project[] = [
  {
    id: 'triqi',
    title: 'Triqi',
    subtitle: 'Delivery route optimization',
    year: '2025',
    role: 'Design & full-stack build',
    description:
      'A courier operating system for local delivery: Android client in Kotlin + Jetpack Compose, and a Python/FastAPI backend that sequences stops with Google OR-Tools over real road networks (OSMnx/NetworkX). Tracks cash-on-delivery, outcomes per stop, daily earnings and route distance.',
    tech: ['Kotlin', 'Jetpack Compose', 'Python', 'FastAPI', 'OR-Tools', 'OSMnx'],
    link: 'https://github.com/k4ylid/Triqi',
    seed: 11,
    palette: ['#0e2a47', '#e8b04b', '#4dc6e8'],
  },
  {
    id: 'deckforge',
    title: 'DeckForge',
    subtitle: 'Spaced-repetition study app',
    year: '2025',
    role: 'Design & Android build',
    description:
      'An offline flashcard app built around SM-2 spaced repetition, an arcade "scratch-to-reveal" practice mode, deck ranks from Iron to Master, and CSV import. Room database, Material 3, custom Compose canvas effects.',
    tech: ['Kotlin', 'Jetpack Compose', 'Room', 'Material 3', 'Coroutines'],
    link: 'https://github.com/k4ylid/DeckForge',
    seed: 27,
    palette: ['#2a1440', '#f0c75e', '#8e5cf0'],
  },
  {
    id: 'liquidtype',
    title: 'LiquidType',
    subtitle: 'Liquid-fill narration typography',
    year: '2025',
    role: 'Design & build',
    description:
      'An offline-first PWA for video production: English typography filled with procedural animated liquid, driven by a GLSL shader pipeline in PixiJS and synchronized to narration audio through a master clock. Includes a fullscreen recording mode for capture.',
    tech: ['TypeScript', 'PixiJS', 'WebGL', 'GLSL', 'Vite', 'Workbox'],
    link: 'https://github.com/k4ylid/LiquidType',
    seed: 43,
    palette: ['#062b33', '#3df0d0', '#0a7d8c'],
  },
  {
    id: 'mecha',
    title: 'Mecha Runner',
    subtitle: 'Browser game experiments',
    year: '2025',
    role: 'Design & build',
    description:
      'A series of web game prototypes — a transforming-mecha runner and related experiments in fast iteration: procedural sprites, tight game loops, and instant browser playability.',
    tech: ['TypeScript', 'Canvas/WebGL', 'Game loops'],
    link: 'https://github.com/k4ylid/Mecha-runner-',
    seed: 68,
    palette: ['#3a0d16', '#ff5d47', '#ffb347'],
  },
  {
    id: 'minepixel',
    title: 'Mine Pixel',
    subtitle: 'Pixel-art prototype & assets',
    year: '2025',
    role: 'Design & build',
    description:
      'A pixel-art game prototype with its own sprite and tilemap pipeline — 2D environmental assets, texture atlases, and asset provenance tracking built to feed a rendering engine.',
    tech: ['Python', 'Pixel art', 'Sprite pipeline'],
    link: 'https://github.com/k4ylid/Mine-pixel',
    seed: 84,
    palette: ['#1a2b12', '#7ddc5f', '#d8b25c'],
  },
  {
    id: 'darijalink',
    title: 'DarijaLink',
    subtitle: 'Language tooling',
    year: '2024',
    role: 'Design & build',
    description:
      'A Python project exploring tooling around Darija (Moroccan Arabic) — earlier work that seeded the habit of shipping small, focused tools.',
    tech: ['Python'],
    link: 'https://github.com/k4ylid/DarijaLink',
    seed: 97,
    palette: ['#33302a', '#e8734d', '#f2e6c9'],
  },
];

export const SKILLS: { label: string; level: string }[] = [
  { label: 'Kotlin / Android', level: 'Production apps' },
  { label: 'TypeScript / Web', level: 'PWAs & games' },
  { label: 'Python', level: 'Backends & tooling' },
  { label: 'Three.js / WebGL', level: 'This building' },
  { label: 'FastAPI / OR-Tools', level: 'Routing backends' },
  { label: 'PixiJS / GLSL', level: 'Shader-driven graphics' },
];

// World layout constants shared between world.ts and player.ts
export const WALL_H = 4.2;
export const CORRIDOR_MIN_Z = -3;
export const CORRIDOR_MAX_Z = 3;
export const WORLD_MIN_X = -21;
export const WORLD_MAX_X = 21;
export const NORTH_ROOM_MIN_Z = -24;
export const SOUTH_ROOM_MAX_Z = 12;
export const SPAWN = { x: 18, z: 0 };

export const ROOMS: Room[] = [
  {
    id: 'lobby',
    name: 'The Lobby',
    rect: { minX: 12, maxX: 21, minZ: -3, maxZ: 3 },
    doorCenter: 0,
    side: 'south',
    theme: 'Orientation',
    projects: [],
  },
  {
    id: 'about',
    name: 'Origin — About Me',
    rect: { minX: -21, maxX: -0.5, minZ: 3, maxZ: 12 },
    doorCenter: -11,
    side: 'south',
    theme: 'Where it started',
    projects: [],
  },
  {
    id: 'contact',
    name: 'The Exit — Contact',
    rect: { minX: 0.5, maxX: 21, minZ: 3, maxZ: 12 },
    doorCenter: 10,
    side: 'south',
    theme: 'Say hello',
    projects: [],
  },
  {
    id: 'tools',
    name: 'Room I — Tools That Work',
    rect: { minX: -21, maxX: -7.5, minZ: -24, maxZ: -3 },
    doorCenter: -14,
    side: 'north',
    theme: 'Software with a job to do',
    projects: [PROJECTS[0], PROJECTS[1], PROJECTS[5]],
  },
  {
    id: 'play',
    name: 'Room II — Play & Motion',
    rect: { minX: -7.5, maxX: 7.5, minZ: -24, maxZ: -3 },
    doorCenter: 0,
    side: 'north',
    theme: 'Experiments in movement',
    projects: [PROJECTS[2], PROJECTS[3], PROJECTS[4]],
  },
  {
    id: 'skills',
    name: 'Room III — The Toolbox',
    rect: { minX: 7.5, maxX: 21, minZ: -24, maxZ: -3 },
    doorCenter: 14,
    side: 'north',
    theme: 'What I reach for',
    projects: [],
  },
];
