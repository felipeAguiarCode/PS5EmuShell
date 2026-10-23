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

  // A barra superior (abas e ícones) só recebe foco de propósito: subindo com ↑ a partir do conteúdo,
  // com o mouse ou pelo L2/R2. Nunca como "primeiro item" nem ao recuperar o foco.
  isTop(el) {
    return !!el && el.dataset.group === 'top';
  },

  setScope(el, target) {
    this.scope = el;
    const list = this.candidates();
    const next = target || list.find((c) => !this.isTop(c)) || list[0];
    if (next) this.focus(next, { silent: true, instant: true });
  },

  // O item focado sumiu (a lista foi redesenhada): volta para o item equivalente,
  // o último do mesmo grupo ou o mais próximo de onde o foco estava.
  recover() {
    const last = this.last || {};
    const list = this.candidates().filter((c) => last.top || !this.isTop(c));
    if (!list.length) return this.candidates()[0] || null;
    const mem = last.group && this.memory[last.group];
    if (mem && mem.isConnected && this.visible(mem) && this.scope.contains(mem) && (!last.id || mem.dataset.id === last.id)) return mem;
    if (last.id) {
      const same = list.find((c) => c.dataset.id === last.id && c.dataset.group === last.group);
      if (same) return same;
    }
    if (!last.rect) return list[0];
    const dist = (c) => {
      const b = c.getBoundingClientRect();
      return Math.hypot(b.left + b.width / 2 - last.rect.x, b.top + b.height / 2 - last.rect.y) + (c.dataset.group === last.group ? 0 : 400);
    };
    return list.reduce((a, c) => (dist(c) < dist(a) ? c : a));
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
    const r = el.getBoundingClientRect();
    this.last = { group: el.dataset.group, id: el.dataset.id, top: this.isTop(el), rect: { x: r.left + r.width / 2, y: r.top + r.height / 2 } };
    const smooth = !opts.instant && (typeof App === 'undefined' || App.motion());
    if (!opts.noScroll) el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
    el.dispatchEvent(new CustomEvent('navfocus', { detail: opts, bubbles: true }));
    if (!opts.silent) Sound.move();
  },

  move(dir) {
    const cur = this.current;
    if (cur && cur.isConnected && cur.navHandler && cur.navHandler(dir)) return true;
    if (!cur || !cur.isConnected || !this.scope.contains(cur) || !this.visible(cur)) {
      const prevId = this.last && this.last.id;
      const back = this.recover();
      if (!back) return false;
      this.focus(back, { silent: true });
      // Era o mesmo item redesenhado: o direcional segue normalmente a partir dele.
      if (prevId && back.dataset.id === prevId && back.isConnected) return this.move(dir);
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
    // Do conteúdo, só ↑ chega à barra superior; ←/→/↓ nunca "escapam" para lá.
    const fromTop = this.isTop(cur);
    for (const el of this.candidates()) {
      if (el === cur) continue;
      if (!fromTop && dir !== 'up' && this.isTop(el)) continue;
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
    // Subindo para a barra superior: cai na aba da tela atual.
    if (best && this.isTop(best) && !fromTop) {
      const active = $('.tab.active', this.scope);
      if (active && this.visible(active)) return active;
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
