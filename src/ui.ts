import { PROFILE, type Project } from './content';

export type Quality = 'low' | 'medium' | 'high';

export interface UICallbacks {
  onEnter: () => void;
  onQuality: (q: Quality) => void;
  isTouch: boolean;
}

export class UI {
  private roomEl: HTMLElement;
  private promptEl: HTMLElement;
  private cardEl: HTMLElement;
  private cardTitle: HTMLElement;
  private cardSub: HTMLElement;
  private cardYear: HTMLElement;
  private cardBody: HTMLElement;
  private cardChips: HTMLElement;
  private cardLink: HTMLAnchorElement;
  private introEl: HTMLElement;
  cardOpen = false;
  onCardClosed: (() => void) | null = null;

  constructor(cb: UICallbacks) {
    document.body.insertAdjacentHTML(
      'beforeend',
      `
      <div id="hud">
        <div id="crosshair"></div>
        <div id="room-name"></div>
        <div id="prompt"></div>
        <div id="hint">${cb.isTouch
          ? 'Left half: move · Right half: look · Tap artwork to read'
          : 'WASD move · Mouse look · Shift run · E / click: read exhibit · Esc: release'}</div>
        <div id="topbar">
          <span id="brand">${PROFILE.name} — résumé</span>
          <select id="quality" title="Render quality">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      <div id="intro">
        <div class="panel">
          <h1>${PROFILE.name}</h1>
          <p class="tag">${PROFILE.tagline}</p>
          <p class="desc">${PROFILE.intro}</p>
          <button id="enter">Enter the gallery</button>
          <p class="small">${cb.isTouch ? 'Touch controls enabled' : 'Click locks the mouse · Esc frees it'}</p>
        </div>
      </div>
      <div id="card">
        <div class="panel">
          <div class="card-head">
            <div>
              <h2 id="c-title"></h2>
              <p id="c-sub" class="tag"></p>
            </div>
            <span id="c-year"></span>
          </div>
          <p id="c-body" class="desc"></p>
          <div id="c-chips"></div>
          <div class="card-foot">
            <a id="c-link" target="_blank" rel="noopener">Open ↗</a>
            <span class="small">${cb.isTouch ? 'Tap outside to close' : 'Esc / E to close'}</span>
          </div>
        </div>
      </div>`,
    );

    this.roomEl = document.getElementById('room-name')!;
    this.promptEl = document.getElementById('prompt')!;
    this.cardEl = document.getElementById('card')!;
    this.cardTitle = document.getElementById('c-title')!;
    this.cardSub = document.getElementById('c-sub')!;
    this.cardYear = document.getElementById('c-year')!;
    this.cardBody = document.getElementById('c-body')!;
    this.cardChips = document.getElementById('c-chips')!;
    this.cardLink = document.getElementById('c-link') as HTMLAnchorElement;
    this.introEl = document.getElementById('intro')!;

    document.getElementById('enter')!.addEventListener('click', () => {
      this.introEl.classList.add('hidden');
      cb.onEnter();
    });
    document.getElementById('quality')!.addEventListener('change', (e) => {
      cb.onQuality((e.target as HTMLSelectElement).value as Quality);
    });
    this.cardEl.addEventListener('click', (e) => {
      if (e.target === this.cardEl) this.closeCard();
    });
  }

  enter() {
    this.introEl.classList.add('hidden');
  }

  setRoom(name: string) {
    if (this.roomEl.textContent !== name) {
      this.roomEl.textContent = name;
      this.roomEl.classList.remove('flash');
      void this.roomEl.offsetWidth;
      this.roomEl.classList.add('flash');
    }
  }

  setPrompt(text: string | null) {
    this.promptEl.textContent = text ?? '';
    this.promptEl.style.opacity = text ? '1' : '0';
  }

  openCard(p: Project) {
    this.cardTitle.textContent = p.title;
    this.cardSub.textContent = p.subtitle;
    this.cardYear.textContent = p.year;
    this.cardBody.textContent = p.description;
    this.cardChips.innerHTML = p.tech.map((t) => `<span>${t}</span>`).join('');
    if (p.link) {
      this.cardLink.href = p.link;
      this.cardLink.style.display = '';
      this.cardLink.textContent = p.link.startsWith('mailto:') ? 'Email me' : 'View on GitHub ↗';
    } else {
      this.cardLink.style.display = 'none';
    }
    this.cardEl.classList.add('open');
    this.cardOpen = true;
  }

  closeCard() {
    if (!this.cardOpen) return;
    this.cardEl.classList.remove('open');
    this.cardOpen = false;
    this.onCardClosed?.();
  }

  /** show intro again (e.g. after pointer lock lost without card) */
  showIntroHint(show: boolean) {
    document.getElementById('hint')!.style.opacity = show ? '1' : '0.55';
  }
}
