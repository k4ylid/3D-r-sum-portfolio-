import * as THREE from 'three';
import {
  CORRIDOR_MAX_Z,
  CORRIDOR_MIN_Z,
  NORTH_ROOM_MIN_Z,
  PROFILE,
  ROOMS,
  SKILLS,
  SOUTH_ROOM_MAX_Z,
  WALL_H,
  WORLD_MAX_X,
  WORLD_MIN_X,
  type Project,
} from './content';
import {
  artworkTexture,
  buildMaterials,
  contactShadowTexture,
  plaqueTexture,
  wallTextTexture,
} from './materials';

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Interactable extends THREE.Object3D {
  userData: { project: Project };
}

export interface BuiltWorld {
  colliders: AABB[];
  interactables: Interactable[];
  zones: { name: string; minX: number; maxX: number; minZ: number; maxZ: number }[];
  dust: THREE.Points;
  shadowLights: THREE.SpotLight[];
  bloomStripes: THREE.Mesh[];
}

const WALL_T = 0.3;

export function buildWorld(scene: THREE.Scene): BuiltWorld {
  const mats = buildMaterials();
  const colliders: AABB[] = [];
  const interactables: Interactable[] = [];
  const shadowLights: THREE.SpotLight[] = [];
  const bloomStripes: THREE.Mesh[] = [];
  const shadowTex = contactShadowTexture();

  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    collide = true,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    if (collide) {
      colliders.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      });
    }
    return m;
  };

  // wall between two points along an axis; axis 'x' = runs along X
  const wall = (x1: number, x2: number, z1: number, z2: number) => {
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const w = Math.max(Math.abs(x2 - x1), WALL_T);
    const d = Math.max(Math.abs(z2 - z1), WALL_T);
    addBox(w, WALL_H, d, cx, WALL_H / 2, cz, mats.wall);
    // skirting boards both faces
    const skirt = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.18, d),
      mats.trim,
    );
    skirt.scale.set(w > d ? 1.002 : 1.06, 1, w > d ? 1.06 : 1.002);
    skirt.position.set(cx, 0.09, cz);
    scene.add(skirt);
  };

  // ---------- shell ----------
  const floorW = WORLD_MAX_X - WORLD_MIN_X;
  const floorD = SOUTH_ROOM_MAX_Z - NORTH_ROOM_MIN_Z;
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(floorW, 0.2, floorD),
    mats.floor,
  );
  floor.position.set(
    (WORLD_MIN_X + WORLD_MAX_X) / 2,
    -0.1,
    (NORTH_ROOM_MIN_Z + SOUTH_ROOM_MAX_Z) / 2,
  );
  floor.receiveShadow = true;
  scene.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(floorW, 0.2, floorD),
    mats.ceiling,
  );
  ceiling.position.set(
    (WORLD_MIN_X + WORLD_MAX_X) / 2,
    WALL_H + 0.1,
    (NORTH_ROOM_MIN_Z + SOUTH_ROOM_MAX_Z) / 2,
  );
  scene.add(ceiling);

  // ---------- outer + inner walls ----------
  wall(WORLD_MIN_X - WALL_T, WORLD_MIN_X, NORTH_ROOM_MIN_Z, SOUTH_ROOM_MAX_Z); // west
  wall(WORLD_MAX_X, WORLD_MAX_X + WALL_T, NORTH_ROOM_MIN_Z, SOUTH_ROOM_MAX_Z); // east
  wall(WORLD_MIN_X, WORLD_MAX_X, NORTH_ROOM_MIN_Z - WALL_T, NORTH_ROOM_MIN_Z); // north
  wall(WORLD_MIN_X, WORLD_MAX_X, SOUTH_ROOM_MAX_Z, SOUTH_ROOM_MAX_Z + WALL_T); // south

  // corridor north wall with 3 doorways (centers -14, 0, 14)
  const nDoor = [-14, 0, 14];
  const nSeg: [number, number][] = [
    [WORLD_MIN_X, -15.5],
    [-12.5, -1.5],
    [1.5, 12.5],
    [15.5, WORLD_MAX_X],
  ];
  for (const [a, b] of nSeg) wall(a, b, CORRIDOR_MIN_Z - WALL_T, CORRIDOR_MIN_Z);
  // lintels above north doors
  for (const dc of nDoor) {
    addBox(3.4, WALL_H - 3, WALL_T, dc, 3 + (WALL_H - 3) / 2, CORRIDOR_MIN_Z - WALL_T / 2, mats.wall, false);
  }

  // corridor south wall with 2 doorways (centers -11, 10)
  const sDoor = [-11, 10];
  const sSeg: [number, number][] = [
    [WORLD_MIN_X, -12.5],
    [-9.5, 8.5],
    [11.5, WORLD_MAX_X],
  ];
  for (const [a, b] of sSeg) wall(a, b, CORRIDOR_MAX_Z, CORRIDOR_MAX_Z + WALL_T);
  for (const dc of sDoor) {
    addBox(3.4, WALL_H - 3, WALL_T, dc, 3 + (WALL_H - 3) / 2, CORRIDOR_MAX_Z + WALL_T / 2, mats.wall, false);
  }

  // room partitions
  wall(-7.5 - WALL_T / 2, -7.5 + WALL_T / 2, NORTH_ROOM_MIN_Z, CORRIDOR_MIN_Z); // N1|N2
  wall(7.5 - WALL_T / 2, 7.5 + WALL_T / 2, NORTH_ROOM_MIN_Z, CORRIDOR_MIN_Z); // N2|N3
  wall(-WALL_T / 2, WALL_T / 2, CORRIDOR_MAX_Z, SOUTH_ROOM_MAX_Z); // S1|S2

  // ---------- corridor dressing ----------
  // carpet runner guiding west
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_MAX_X - WORLD_MIN_X - 4, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x5d1f24, roughness: 0.95 }),
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.012, 0);
  carpet.receiveShadow = true;
  scene.add(carpet);

  // ceiling light strips (emissive; feed bloom)
  for (const z of [-1.6, 1.6]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(floorW - 2, 0.06, 0.35),
      mats.emissiveStrip,
    );
    strip.position.set(0, WALL_H - 0.05, z);
    scene.add(strip);
    bloomStripes.push(strip);
  }

  // ---------- title wall (east, behind spawn) ----------
  const titleTex = wallTextTexture([PROFILE.name, PROFILE.tagline], {
    w: 2048,
    h: 640,
    fg: '#efe3cb',
  });
  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(7.4, 2.3),
    new THREE.MeshStandardMaterial({
      map: titleTex,
      transparent: true,
      roughness: 0.8,
      emissive: 0xffffff,
      emissiveMap: titleTex,
      emissiveIntensity: 0.5,
    }),
  );
  title.position.set(WORLD_MAX_X - 0.16, 2.3, 0);
  title.rotation.y = -Math.PI / 2;
  scene.add(title);

  const lobbySpot = new THREE.SpotLight(0xffe6c0, 45, 22, Math.PI / 6, 0.7, 1.8);
  lobbySpot.position.set(WORLD_MAX_X - 1.3, WALL_H - 0.25, 0);
  lobbySpot.target.position.set(WORLD_MAX_X - 0.1, 1.5, 0);
  lobbySpot.castShadow = true;
  lobbySpot.shadow.mapSize.set(1024, 1024);
  scene.add(lobbySpot, lobbySpot.target);
  shadowLights.push(lobbySpot);

  // intro board near spawn
  const introTex = wallTextTexture(
    ['WELCOME', PROFILE.intro],
    { w: 1600, h: 700, fg: '#e8dcc8', font: 'Georgia' },
  );
  const intro = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 2.0),
    new THREE.MeshStandardMaterial({
      map: introTex,
      transparent: true,
      roughness: 0.85,
      emissive: 0xffffff,
      emissiveMap: introTex,
      emissiveIntensity: 0.4,
    }),
  );
  intro.position.set(18, 2.0, CORRIDOR_MAX_Z - 0.18);
  intro.rotation.y = Math.PI;
  scene.add(intro);

  // ---------- per-room content ----------
  const zones: BuiltWorld['zones'] = ROOMS.map((r) => ({
    name: r.name,
    minX: r.rect.minX,
    maxX: r.rect.maxX,
    minZ: r.rect.minZ,
    maxZ: r.rect.maxZ,
  }));
  zones.push({ name: 'The Corridor', minX: -12, maxX: 12, minZ: CORRIDOR_MIN_Z, maxZ: CORRIDOR_MAX_Z });

  // room name signs above each door (corridor side)
  for (const room of ROOMS) {
    if (room.id === 'lobby') continue;
    const tex = wallTextTexture([room.name], {
      w: 1024,
      h: 128,
      fg: '#e8d9b8',
      bg: 'rgba(24,20,16,0.92)',
    });
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.33),
      new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        roughness: 0.8,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 0.5,
      }),
    );
    const z = room.side === 'north' ? CORRIDOR_MIN_Z + 0.16 : CORRIDOR_MAX_Z - 0.16;
    sign.position.set(room.doorCenter, 3.45, z);
    if (room.side === 'south') sign.rotation.y = Math.PI;
    scene.add(sign);

    // wall text inside room facing entrance
    const themeTex = wallTextTexture([room.theme], { w: 1400, h: 200, fg: '#cfc3ab' });
    const theme = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 0.74),
      new THREE.MeshStandardMaterial({
        map: themeTex,
        transparent: true,
        roughness: 0.85,
        emissive: 0xffffff,
        emissiveMap: themeTex,
        emissiveIntensity: 0.35,
      }),
    );
    const tz = room.side === 'north' ? NORTH_ROOM_MIN_Z + 0.21 : SOUTH_ROOM_MAX_Z - 0.21;
    theme.position.set((room.rect.minX + room.rect.maxX) / 2, 3.35, tz);
    if (room.side === 'north') theme.rotation.y = 0;
    else theme.rotation.y = Math.PI;
    scene.add(theme);
  }

  // ---------- exhibit stations ----------
  const glassGeo = new THREE.PlaneGeometry(1.7, 2.15);
  const contactGeo = new THREE.PlaneGeometry(2.6, 2.6);
  const contactMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
  });

  const addExhibit = (p: Project, cx: number, facing: 'n' | 's') => {
    // facing 'n' = artwork hangs on north wall, visitor stands south of it
    const wallZ = facing === 'n' ? NORTH_ROOM_MIN_Z : SOUTH_ROOM_MAX_Z;
    const dir = facing === 'n' ? 1 : -1; // toward visitor

    // frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 2.35, 0.09),
      mats.frameGold,
    ) as unknown as Interactable;
    frame.position.set(cx, 2.05, wallZ + dir * (WALL_T / 2 + 0.07));
    frame.castShadow = true;
    frame.userData.project = p;
    scene.add(frame);
    interactables.push(frame);

    // canvas inside frame
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(1.62, 2.07),
      new THREE.MeshStandardMaterial({
        map: artworkTexture(p.seed, p.palette),
        roughness: 0.85,
      }),
    );
    art.position.copy(frame.position);
    art.position.z += dir * 0.06;
    if (facing === 's') art.rotation.y = Math.PI;
    scene.add(art);

    // glass sheen
    const glass = new THREE.Mesh(glassGeo, mats.glass);
    glass.position.copy(frame.position);
    glass.position.z += dir * 0.075;
    if (facing === 's') glass.rotation.y = Math.PI;
    scene.add(glass);

    // museum plaque to the right of frame
    const plaqueTex = plaqueTexture(p.title, p.subtitle, p.year);
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 0.5),
      new THREE.MeshStandardMaterial({
        map: plaqueTex,
        roughness: 0.9,
        emissive: 0xffffff,
        emissiveMap: plaqueTex,
        emissiveIntensity: 0.25,
      }),
    );
    plaque.position.set(cx + 1.65, 1.5, wallZ + dir * (WALL_T / 2 + 0.03));
    if (facing === 's') plaque.rotation.y = Math.PI;
    scene.add(plaque);

    // pedestal with artifact (interactable too)
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.05, 0.62), mats.pedestal);
    ped.position.set(cx, 0.525, wallZ + dir * 3.1);
    ped.castShadow = true;
    ped.receiveShadow = true;
    ped.userData.project = p;
    scene.add(ped);
    interactables.push(ped as unknown as Interactable);
    colliders.push({
      minX: cx - 0.31,
      maxX: cx + 0.31,
      minZ: wallZ + dir * 3.1 - 0.31,
      maxZ: wallZ + dir * 3.1 + 0.31,
    });

    // small artifact on top of pedestal — a stylized glyph
    const artifact = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(p.palette[1]),
        roughness: 0.3,
        metalness: 0.6,
        emissive: new THREE.Color(p.palette[1]),
        emissiveIntensity: 0.25,
      }),
    );
    artifact.position.set(cx, 1.3, wallZ + dir * 3.1);
    artifact.castShadow = true;
    artifact.rotation.set(0.4, p.seed, 0.2);
    scene.add(artifact);

    // contact shadow decal
    const cs = new THREE.Mesh(contactGeo, contactMat);
    cs.rotation.x = -Math.PI / 2;
    cs.position.set(cx, 0.015, wallZ + dir * 3.1);
    scene.add(cs);

    // dedicated spotlight: ceiling → frame+pedestal area
    const spot = new THREE.SpotLight(0xffe9c9, 160, 16, Math.PI / 6.5, 0.45, 1.6);
    spot.position.set(cx, WALL_H - 0.35, wallZ + dir * 3.6);
    spot.target.position.set(cx, 1.4, wallZ + dir * 0.6);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0002;
    scene.add(spot, spot.target);
    shadowLights.push(spot);
  };

  const layout: Record<string, { xs: number[]; facing: 'n' | 's' }> = {
    tools: { xs: [-18.3, -14.25, -10.2], facing: 'n' },
    play: { xs: [-4.4, 0, 4.4], facing: 'n' },
  };

  for (const room of ROOMS) {
    const l = layout[room.id];
    if (!l) continue;
    room.projects.forEach((p, i) => addExhibit(p, l.xs[i], l.facing));
  }

  // ---------- about room (S1) ----------
  const aboutTex = wallTextTexture(
    ['I build things that move.', 'Apps, games, shaders — software you can feel.'],
    { w: 2048, h: 420, fg: '#e8dcc8' },
  );
  const about = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 1.95),
    new THREE.MeshStandardMaterial({
      map: aboutTex,
      transparent: true,
      roughness: 0.85,
      emissive: 0xffffff,
      emissiveMap: aboutTex,
      emissiveIntensity: 0.45,
    }),
  );
  about.position.set(-10.5, 2.4, SOUTH_ROOM_MAX_Z - 0.18);
  about.rotation.y = Math.PI;
  scene.add(about);

  const aboutSpot = new THREE.SpotLight(0xffe9c9, 40, 16, Math.PI / 7, 0.7, 1.8);
  aboutSpot.position.set(-10.5, WALL_H - 0.25, SOUTH_ROOM_MAX_Z - 1.4);
  aboutSpot.target.position.set(-10.5, 1.2, SOUTH_ROOM_MAX_Z - 0.1);
  aboutSpot.castShadow = true;
  aboutSpot.shadow.mapSize.set(1024, 1024);
  scene.add(aboutSpot, aboutSpot.target);
  shadowLights.push(aboutSpot);

  // bench in about room
  addBox(2.6, 0.45, 0.7, -10.5, 0.225, 7.5, mats.frameDark);

  // ---------- skills room (N3): glowing pylons ----------
  SKILLS.forEach((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 10.8 + col * 3.4;
    const z = -20.5 + row * 6;
    const h = 1.5 + (i % 3) * 0.35;
    const pylon = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, h, 0.9),
      new THREE.MeshStandardMaterial({
        color: 0x2e3b46,
        roughness: 0.4,
        metalness: 0.5,
        emissive: 0x3df0d0,
        emissiveIntensity: 0.12,
      }),
    );
    pylon.position.set(x, h / 2, z);
    pylon.castShadow = true;
    pylon.receiveShadow = true;
    scene.add(pylon);
    colliders.push({ minX: x - 0.45, maxX: x + 0.45, minZ: z - 0.45, maxZ: z + 0.45 });

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.62),
      new THREE.MeshStandardMaterial({
        map: wallTextTexture([s.label, s.level], { w: 900, h: 320, fg: '#d7f5ee' }),
        transparent: true,
        roughness: 0.85,
      }),
    );
    label.position.set(x, h + 0.55, z);
    scene.add(label);

    const cs = new THREE.Mesh(contactGeo, contactMat);
    cs.rotation.x = -Math.PI / 2;
    cs.scale.setScalar(0.7);
    cs.position.set(x, 0.015, z);
    scene.add(cs);
  });

  const skillSpot = new THREE.SpotLight(0xd9f5ff, 90, 20, Math.PI / 4.5, 0.6, 1.5);
  skillSpot.position.set(14.2, WALL_H - 0.4, -14);
  skillSpot.target.position.set(14.2, 0.8, -17);
  skillSpot.castShadow = true;
  scene.add(skillSpot, skillSpot.target);
  shadowLights.push(skillSpot);

  // ---------- contact room (S2) ----------
  const contactTex = wallTextTexture(
    ['Say hello.', PROFILE.github.replace('https://', '') + '  ·  ' + PROFILE.email],
    { w: 2048, h: 420, fg: '#efe3cb' },
  );
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 2.05),
    new THREE.MeshStandardMaterial({
      map: contactTex,
      transparent: true,
      roughness: 0.85,
      emissive: 0xffffff,
      emissiveMap: contactTex,
      emissiveIntensity: 0.45,
    }),
  );
  contact.position.set(10.5, 2.4, SOUTH_ROOM_MAX_Z - 0.18);
  contact.rotation.y = Math.PI;
  scene.add(contact);

  const contactSpot = new THREE.SpotLight(0xffe9c9, 45, 18, Math.PI / 6.5, 0.7, 1.8);
  contactSpot.position.set(10.5, WALL_H - 0.25, SOUTH_ROOM_MAX_Z - 1.4);
  contactSpot.target.position.set(10.5, 1.2, SOUTH_ROOM_MAX_Z - 0.1);
  contactSpot.castShadow = true;
  scene.add(contactSpot, contactSpot.target);
  shadowLights.push(contactSpot);

  // two link pedestals — reuse exhibit interaction with pseudo-projects
  const linkPads: Project[] = [
    {
      id: 'gh',
      title: 'GitHub',
      subtitle: 'All the code',
      year: 'github.com/k4ylid',
      role: '',
      description: 'Every project in this building — and the ones still on the bench — lives on my GitHub.',
      tech: [],
      link: PROFILE.github,
      seed: 3,
      palette: ['#111418', '#e8dcc8', '#7ea8ff'],
    },
    {
      id: 'mail',
      title: 'Email',
      subtitle: 'Direct line',
      year: PROFILE.email,
      role: '',
      description: `Fastest way to reach me: ${PROFILE.email}.`,
      tech: [],
      link: 'mailto:' + PROFILE.email,
      seed: 9,
      palette: ['#241a12', '#ffcf99', '#ff8d5c'],
    },
  ];
  linkPads.forEach((p, i) => {
    const x = 7.2 + i * 6.6;
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.7), mats.pedestal);
    ped.position.set(x, 0.5, 7.5);
    ped.castShadow = true;
    ped.receiveShadow = true;
    ped.userData.project = p;
    scene.add(ped);
    interactables.push(ped as unknown as Interactable);
    colliders.push({ minX: x - 0.35, maxX: x + 0.35, minZ: 7.15, maxZ: 7.85 });

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 24, 16),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(p.palette[1]),
        emissive: new THREE.Color(p.palette[1]),
        emissiveIntensity: 0.7,
        roughness: 0.3,
      }),
    );
    orb.position.set(x, 1.32, 7.5);
    scene.add(orb);
    bloomStripes.push(orb as unknown as THREE.Mesh & { material: THREE.MeshStandardMaterial });

    const lbl = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.55),
      new THREE.MeshStandardMaterial({
        map: wallTextTexture([p.title, p.subtitle], { w: 900, h: 300, fg: '#f5e7cf' }),
        transparent: true,
      }),
    );
    lbl.position.set(x, 2.0, 7.5);
    lbl.rotation.y = Math.PI; // face -z (toward door)
    scene.add(lbl);

    const cs = new THREE.Mesh(contactGeo, contactMat);
    cs.rotation.x = -Math.PI / 2;
    cs.scale.setScalar(0.7);
    cs.position.set(x, 0.015, 7.5);
    scene.add(cs);
  });

  // ---------- base lighting ----------
  const hemi = new THREE.HemisphereLight(0x93a7c4, 0x4a3b28, 0.75);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0x2a2620, 0.6);
  scene.add(amb);

  // corridor wash lights — warm pools between the ceiling strips, no shadows
  for (const lx of [-16, -8, 0, 8, 16]) {
    const pt = new THREE.PointLight(0xffe0b0, 40, 18, 1.8);
    pt.position.set(lx, WALL_H - 0.7, 0);
    scene.add(pt);
  }
  // north rooms get a soft ceiling wash each so they aren't caves
  for (const rx of [-14, 0, 14]) {
    const pt = new THREE.PointLight(0xffe6c4, 70, 26, 1.8);
    pt.position.set(rx, WALL_H - 0.6, -14);
    scene.add(pt);
  }
  for (const rx of [-10.5, 10.5]) {
    const pt = new THREE.PointLight(0xffe6c4, 60, 22, 1.8);
    pt.position.set(rx, WALL_H - 0.6, 7.5);
    scene.add(pt);
  }

  // ---------- dust motes ----------
  const dustGeo = new THREE.BufferGeometry();
  const N = 500;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = WORLD_MIN_X + Math.random() * floorW;
    pos[i * 3 + 1] = 0.3 + Math.random() * 3.6;
    pos[i * 3 + 2] = NORTH_ROOM_MIN_Z + Math.random() * floorD;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0xffe9c9,
      size: 0.022,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(dust);

  // atmosphere
  scene.fog = new THREE.FogExp2(0x181410, 0.014);
  scene.background = new THREE.Color(0x0b0a09);

  return { colliders, interactables, zones, dust, shadowLights, bloomStripes };
}
