/* Anel de seleção deslizante (estilo PS5): um único contorno que viaja suavemente de um item
 * focado para o próximo. Acompanha rolagem, re-renderizações e itens que mudam de tamanho.
 * Desligado quando "Animações" está desativado em Configurações › Aparência. */
const FocusRing = {
  el: null,
  target: null,
  last: null,
  glideUntil: 0,
  enabled: true,

  // Itens que têm destaque próprio (preenchimento, brilho do tile) continuam com o anel deles.
  OWN_HIGHLIGHT: '#row, .btn-play, .btn-round, .tab, .icon-btn, .chip, .key, .td-mode, .tr-back, .rng-reset',

  init() {
    this.el = document.createElement('div');
    this.el.id = 'focus-ring';
    document.body.appendChild(this.el);
    document.addEventListener('navfocus', (e) => this.follow(e.target));
    const loop = () => {
      this.update();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.hide();
    else if (Nav.current) this.follow(Nav.current);
  },

  // gcard/ccard: o anel abraça só a capa, não o texto embaixo.
  shapeOf(el) {
    if (el.matches('.gcard')) return el.querySelector('.art') || el;
    if (el.matches('.ccard')) return el.querySelector('.mosaic') || el;
    return el;
  },

  follow(el) {
    if (this.target && this.target !== el) this.target.classList.remove('glide');
    if (!this.enabled || !el || el.matches(this.OWN_HIGHLIGHT)) {
      this.target = null;
      this.hide();
      return;
    }
    this.target = el;
    el.classList.add('glide');
    // Desliza só na troca de foco; depois segue a rolagem sem atraso.
    this.glideUntil = performance.now() + 340;
    if (!this.el.classList.contains('show')) {
      this.last = null; // primeira aparição: posiciona direto, sem vir de longe
      this.place(true);
    }
  },

  hide() {
    this.el.classList.remove('show');
    this.last = null;
  },

  place(instant) {
    const t = this.target;
    if (!t || !t.isConnected || t !== Nav.current) {
      if (t && t !== Nav.current) t.classList.remove('glide');
      this.target = null;
      this.hide();
      return;
    }
    const shape = this.shapeOf(t);
    const r = shape.getBoundingClientRect();
    if (!r.width || !r.height) return this.hide();
    const pad = 5;
    const box = { x: Math.round(r.left - pad), y: Math.round(r.top - pad), w: Math.round(r.width + pad * 2), h: Math.round(r.height + pad * 2) };
    const radius = (parseFloat(getComputedStyle(shape).borderTopLeftRadius) || 8) + pad;
    const key = `${box.x},${box.y},${box.w},${box.h},${radius}`;
    if (key === this.last) return;
    this.last = key;
    const gliding = !instant && performance.now() < this.glideUntil;
    this.el.classList.toggle('gliding', gliding);
    this.el.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`;
    this.el.style.width = box.w + 'px';
    this.el.style.height = box.h + 'px';
    this.el.style.borderRadius = radius + 'px';
    this.el.classList.add('show');
  },

  update() {
    if (!this.enabled || !this.target) return;
    this.place(false);
  },
};
