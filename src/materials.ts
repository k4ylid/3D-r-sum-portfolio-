import * as THREE from 'three';

// ---------- procedural textures ----------

function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeat?: [number, number],
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  if (repeat) tex.repeat.set(repeat[0], repeat[1]);
  return tex;
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** herringbone-ish parquet floor */
export function woodFloorTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#6d4a2f';
    ctx.fillRect(0, 0, 512, 512);
    const rnd = seeded(7);
    const pw = 128;
    const ph = 32;
    for (let y = 0; y < 512 / ph; y++) {
      for (let x = 0; x < 512 / pw + 1; x++) {
        const off = (y % 2) * (pw / 2);
        const l = 0.82 + rnd() * 0.32;
        ctx.fillStyle = `rgb(${Math.round(109 * l)},${Math.round(
          74 * l,
        )},${Math.round(47 * l)})`;
        ctx.fillRect(x * pw - off, y * ph, pw - 2, ph - 2);
        // grain
        ctx.strokeStyle = 'rgba(40,24,12,0.25)';
        for (let g = 0; g < 3; g++) {
          const gy = y * ph + rnd() * ph;
          ctx.beginPath();
          ctx.moveTo(x * pw - off, gy);
          ctx.bezierCurveTo(
            x * pw - off + pw * 0.3,
            gy + 3,
            x * pw - off + pw * 0.7,
            gy - 3,
            x * pw - off + pw,
            gy,
          );
          ctx.stroke();
        }
      }
    }
  });
}

/** warm plaster with subtle mottling — also used as a roughness variation source */
export function plasterTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#d8d0c4';
    ctx.fillRect(0, 0, 512, 512);
    const rnd = seeded(23);
    for (let i = 0; i < 2200; i++) {
      const a = 0.02 + rnd() * 0.05;
      ctx.fillStyle = rnd() > 0.5 ? `rgba(120,110,95,${a})` : `rgba(255,252,245,${a})`;
      const r = 2 + rnd() * 14;
      ctx.beginPath();
      ctx.arc(rnd() * 512, rnd() * 512, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** dark ceiling tiles */
export function ceilingTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#2b2825';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, 254, 254);
    const rnd = seeded(5);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.03})`;
      ctx.fillRect(rnd() * 256, rnd() * 256, 2, 2);
    }
  });
}

/** procedural "artwork" for a project — layered arcs/horizons seeded per project */
export function artworkTexture(seed: number, palette: [string, string, string]): THREE.CanvasTexture {
  return canvasTexture(512, 640, (ctx) => {
    const rnd = seeded(seed);
    const [bg, a, b] = palette;
    const grad = ctx.createLinearGradient(0, 0, 0, 640);
    grad.addColorStop(0, bg);
    grad.addColorStop(1, '#0a0a0c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 640);

    // horizon bands
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = a + '22';
      const y = 120 + i * 90 + rnd() * 30;
      ctx.fillRect(0, y, 512, 3 + rnd() * 8);
    }
    // glyph arcs
    ctx.lineWidth = 5;
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = (i % 2 ? a : b) + 'cc';
      ctx.beginPath();
      const cx = 100 + rnd() * 312;
      const cy = 140 + rnd() * 360;
      const r = 30 + rnd() * 110;
      ctx.arc(cx, cy, r, rnd() * Math.PI, rnd() * Math.PI + 1 + rnd() * 2);
      ctx.stroke();
    }
    // focal node
    const fx = 170 + rnd() * 170;
    const fy = 220 + rnd() * 200;
    const glow = ctx.createRadialGradient(fx, fy, 4, fx, fy, 90);
    glow.addColorStop(0, b);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 512, 640);
    // scatter
    ctx.fillStyle = b;
    for (let i = 0; i < 40; i++) {
      ctx.globalAlpha = 0.25 + rnd() * 0.6;
      ctx.fillRect(rnd() * 512, rnd() * 640, 2 + rnd() * 4, 2 + rnd() * 4);
    }
    ctx.globalAlpha = 1;
    // scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < 640; y += 6) ctx.fillRect(0, y, 512, 2);
  });
}

/** wall plaque: title + subtitle + year, museum label style */
export function plaqueTexture(title: string, subtitle: string, year: string): THREE.CanvasTexture {
  return canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = '#efe9df';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#8a8274';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 496, 240);
    ctx.fillStyle = '#1d1a16';
    ctx.font = '600 44px Georgia, serif';
    ctx.fillText(title, 36, 86);
    ctx.font = 'italic 28px Georgia, serif';
    ctx.fillStyle = '#4d463c';
    ctx.fillText(subtitle, 36, 138);
    ctx.font = '24px Georgia, serif';
    ctx.fillStyle = '#7a7264';
    ctx.fillText(year, 36, 196);
    ctx.fillStyle = '#b39155';
    ctx.fillRect(36, 214, 90, 6);
  });
}

/** big wall lettering for room names / statements */
export function wallTextTexture(
  lines: string[],
  opts: { w?: number; h?: number; fg?: string; bg?: string; font?: string } = {},
): THREE.CanvasTexture {
  const w = opts.w ?? 1024;
  const h = opts.h ?? 256;
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = opts.bg ?? 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = opts.fg ?? '#e8dcc8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lh = h / (lines.length + 0.4);
    lines.forEach((line, i) => {
      const size = i === 0 ? lh * 0.72 : lh * 0.4;
      ctx.font = `${i === 0 ? '700' : '400'} ${size}px Georgia, serif`;
      ctx.fillText(line, w / 2, lh * (i + 0.7));
    });
  });
}

/** dark radial contact-shadow decal */
export function contactShadowTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

// ---------- material presets ----------

export interface MaterialKit {
  floor: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  ceiling: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  frameGold: THREE.MeshStandardMaterial;
  frameDark: THREE.MeshStandardMaterial;
  pedestal: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  metalDark: THREE.MeshStandardMaterial;
  emissiveStrip: THREE.MeshStandardMaterial;
}

export function buildMaterials(): MaterialKit {
  const wood = woodFloorTexture();
  wood.repeat.set(14, 14);
  const plaster = plasterTexture();
  plaster.repeat.set(6, 2);
  const ceil = ceilingTexture();
  ceil.repeat.set(10, 10);

  return {
    floor: new THREE.MeshStandardMaterial({
      map: wood,
      roughness: 0.55,
      metalness: 0.08,
      envMapIntensity: 0.6,
    }),
    wall: new THREE.MeshStandardMaterial({
      map: plaster,
      roughness: 0.93,
      metalness: 0.0,
      envMapIntensity: 0.25,
    }),
    ceiling: new THREE.MeshStandardMaterial({
      map: ceil,
      roughness: 0.95,
      metalness: 0.0,
    }),
    trim: new THREE.MeshStandardMaterial({ color: 0x3a332c, roughness: 0.7, metalness: 0.2 }),
    frameGold: new THREE.MeshStandardMaterial({
      color: 0xb39155,
      roughness: 0.35,
      metalness: 0.85,
      envMapIntensity: 1.1,
    }),
    frameDark: new THREE.MeshStandardMaterial({
      color: 0x241d16,
      roughness: 0.5,
      metalness: 0.3,
    }),
    pedestal: new THREE.MeshStandardMaterial({
      color: 0xd9d2c5,
      roughness: 0.6,
      metalness: 0.05,
      envMapIntensity: 0.4,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.95,
      roughness: 0.04,
      metalness: 0,
      transparent: true,
      opacity: 0.1,
      envMapIntensity: 1.4,
    }),
    metalDark: new THREE.MeshStandardMaterial({
      color: 0x2c2c30,
      roughness: 0.4,
      metalness: 0.8,
      envMapIntensity: 0.8,
    }),
    emissiveStrip: new THREE.MeshStandardMaterial({
      color: 0xfff2d9,
      emissive: 0xffe7bd,
      emissiveIntensity: 2.4,
    }),
  };
}
