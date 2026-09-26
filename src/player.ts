import * as THREE from 'three';
import { SPAWN } from './content';
import type { AABB } from './world';

const EYE = 1.62;
const RADIUS = 0.38;
const WALK = 3.4;
const SPRINT = 5.6;

export class Player {
  readonly camera: THREE.PerspectiveCamera;
  yaw = Math.PI / 2; // face -X (down the corridor)
  pitch = 0;
  targetYaw = this.yaw;
  targetPitch = 0;
  pos = new THREE.Vector3(SPAWN.x, EYE, SPAWN.z);
  vel = new THREE.Vector3();
  keys = new Set<string>();
  locked = false;
  bobPhase = 0;
  // touch state
  private moveTouch: { id: number; x0: number; y0: number; dx: number; dy: number } | null = null;
  private lookTouch: { id: number; lx: number; ly: number } | null = null;

  constructor(private dom: HTMLElement) {
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 80);
    this.camera.position.copy(this.pos);
    this.bind();
  }

  private bind() {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.repeat) return;
      this.keys[down ? 'add' : 'delete'](e.code);
    };
    addEventListener('keydown', (e) => onKey(e, true));
    addEventListener('keyup', (e) => onKey(e, false));
    addEventListener('blur', () => this.keys.clear());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
    });
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.targetYaw -= e.movementX * 0.0021;
      this.targetPitch -= e.movementY * 0.0021;
      this.targetPitch = Math.max(-1.35, Math.min(1.35, this.targetPitch));
    });

    // touch: left half = move stick, right half = look
    this.dom.addEventListener('touchstart', (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX < innerWidth / 2 && !this.moveTouch) {
          this.moveTouch = { id: t.identifier, x0: t.clientX, y0: t.clientY, dx: 0, dy: 0 };
        } else if (!this.lookTouch) {
          this.lookTouch = { id: t.identifier, lx: t.clientX, ly: t.clientY };
        }
      }
      e.preventDefault();
    }, { passive: false });
    this.dom.addEventListener('touchmove', (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (this.moveTouch && t.identifier === this.moveTouch.id) {
          this.moveTouch.dx = (t.clientX - this.moveTouch.x0) / 46;
          this.moveTouch.dy = (t.clientY - this.moveTouch.y0) / 46;
        } else if (this.lookTouch && t.identifier === this.lookTouch.id) {
          this.targetYaw -= (t.clientX - this.lookTouch.lx) * 0.005;
          this.targetPitch -= (t.clientY - this.lookTouch.ly) * 0.005;
          this.targetPitch = Math.max(-1.35, Math.min(1.35, this.targetPitch));
          this.lookTouch.lx = t.clientX;
          this.lookTouch.ly = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const endTouch = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (this.moveTouch && t.identifier === this.moveTouch.id) this.moveTouch = null;
        if (this.lookTouch && t.identifier === this.lookTouch.id) this.lookTouch = null;
      }
    };
    this.dom.addEventListener('touchend', endTouch);
    this.dom.addEventListener('touchcancel', endTouch);
  }

  requestLock() {
    this.dom.requestPointerLock();
  }

  moveVector(): { fwd: number; str: number } {
    let fwd = 0;
    let str = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) fwd += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) fwd -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) str += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) str -= 1;
    if (this.moveTouch) {
      str += Math.max(-1, Math.min(1, this.moveTouch.dx));
      fwd -= Math.max(-1, Math.min(1, this.moveTouch.dy));
    }
    return { fwd, str };
  }

  update(dt: number, colliders: AABB[]) {
    // smoothed look
    const ease = 1 - Math.pow(0.0001, dt);
    this.yaw += (this.targetYaw - this.yaw) * ease;
    this.pitch += (this.targetPitch - this.pitch) * ease;

    const { fwd, str } = this.moveVector();
    const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? SPRINT : WALK;
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = -fz; // right = forward rotated -90°
    const rz = fx;

    const ax = (fx * fwd + rx * str) * speed;
    const az = (fz * fwd + rz * str) * speed;
    const accel = 1 - Math.pow(0.0015, dt);
    this.vel.x += (ax - this.vel.x) * accel;
    this.vel.z += (az - this.vel.z) * accel;

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    // circle-vs-AABB resolution, 3 iterations
    for (let it = 0; it < 3; it++) {
      for (const c of colliders) {
        const nx = Math.max(c.minX, Math.min(this.pos.x, c.maxX));
        const nz = Math.max(c.minZ, Math.min(this.pos.z, c.maxZ));
        const dx = this.pos.x - nx;
        const dz = this.pos.z - nz;
        const d2 = dx * dx + dz * dz;
        if (d2 < RADIUS * RADIUS) {
          if (d2 > 1e-9) {
            const d = Math.sqrt(d2);
            this.pos.x = nx + (dx / d) * RADIUS;
            this.pos.z = nz + (dz / d) * RADIUS;
          } else {
            // center inside box — push out along smallest penetration axis
            const pl = this.pos.x - c.minX;
            const pr = c.maxX - this.pos.x;
            const pt = this.pos.z - c.minZ;
            const pb = c.maxZ - this.pos.z;
            const m = Math.min(pl, pr, pt, pb);
            if (m === pl) this.pos.x = c.minX - RADIUS;
            else if (m === pr) this.pos.x = c.maxX + RADIUS;
            else if (m === pt) this.pos.z = c.minZ - RADIUS;
            else this.pos.z = c.maxZ + RADIUS;
          }
        }
      }
    }

    // gentle head bob scaled by actual speed
    const spd = Math.hypot(this.vel.x, this.vel.z);
    this.bobPhase += dt * spd * 2.2;
    const bob = Math.sin(this.bobPhase) * Math.min(0.035, spd * 0.009);

    this.camera.position.set(this.pos.x, EYE + bob + Math.sin(this.bobPhase * 0.5) * 0.008, this.pos.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
