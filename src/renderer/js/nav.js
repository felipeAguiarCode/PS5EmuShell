/* Gerenciador de foco com navegação espacial (direcional) para controle e teclado.
 * Qualquer elemento .focusable dentro do escopo atual pode receber foco.
 * Um elemento pode definir el.navHandler(dir) => true para tratar direções por conta própria. */
const Nav = {
  scope: document.body,
  current: null,
  memory: {},

  visible(el) {
    if (!el.isConnected || el.disabled) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && el.offsetParent !== null;
  },

  candidates() {
    return $$('.focusable', this.scope).filter((el) => this.visible(el));
  },

  setScope(el, target) {
    this.scope = el;
    const next = target || this.candidates()[0];
    if (next) this.focus(next, { silent: true, instant: true });
  },

  focus(el, opts = {}) {
    if (!el) return;
    const prev = this.current;
    if (prev === el) return;
    if (prev) {
      prev.classList.remove('focused');
      prev.dispatchEvent(new CustomEvent('navblur', { bubbles: true }));
    }
    this.current = el;
    el.classList.add('focused');
    if (el.dataset.group) this.memory[el.dataset.group] = el;
    const smooth = !opts.instant && (typeof App === 'undefined' || App.motion());
    if (!opts.noScroll) el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
    el.dispatchEvent(new CustomEvent('navfocus', { detail: opts, bubbles: true }));
    if (!opts.silent) Sound.move();
  },

  move(dir) {
    const cur = this.current;
    if (cur && cur.isConnected && cur.navHandler && cur.navHandler(dir)) return true;
    if (!cur || !cur.isConnected || !this.scope.contains(cur)) {
      this.setScope(this.scope);
      return true;
    }
    const next = this.find(cur, dir);
    if (next) {
      this.focus(next);
      return true;
    }
    Sound.edge();
    return false;
  },

  find(cur, dir) {
    const a = cur.getBoundingClientRect();
    const ac = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
    const horiz = dir === 'left' || dir === 'right';
    let best = null;
    let bestScore = Infinity;
    for (const el of this.candidates()) {
      if (el === cur) continue;
      const b = el.getBoundingClientRect();
      let primary;
      if (dir === 'right') primary = b.left - a.right;
      else if (dir === 'left') primary = a.left - b.right;
      else if (dir === 'down') primary = b.top - a.bottom;
      else primary = a.top - b.bottom;
      // Tolerância para elementos que se sobrepõem levemente.
      if (primary < -Math.min(a[horiz ? 'width' : 'height'], b[horiz ? 'width' : 'height']) * 0.3) continue;
      const bc = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      // Distância ortogonal: zero quando as faixas se sobrepõem.
      let ortho;
      if (horiz) ortho = b.bottom < a.top ? a.top - b.bottom : b.top > a.bottom ? b.top - a.bottom : 0;
      else ortho = b.right < a.left ? a.left - b.right : b.left > a.right ? b.left - a.right : 0;
      const align = horiz ? Math.abs(bc.y - ac.y) : Math.abs(b.left - a.left);
      const score = Math.max(0, primary) + ortho * 3 + align * 0.05;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    // Volta para o último item focado do grupo de destino (ex.: mesmo botão ao subir e descer).
    if (best && best.dataset.group && best.dataset.group !== cur.dataset.group) {
      const mem = this.memory[best.dataset.group];
      if (mem && mem !== best && mem.isConnected && this.visible(mem) && this.scope.contains(mem)) return mem;
    }
    return best;
  },

  activate() {
    const el = this.current;
    if (!el || !el.isConnected) return false;
    el.click();
    return true;
  },
};
