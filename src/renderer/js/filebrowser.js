/* Explorador de arquivos do launcher: escolhe um .exe (jogos de PC) ou uma pasta (ROMs).
 * Controle: ✕ abre/escolhe · ○ volta uma pasta · △ usa a pasta atual (modo pasta) · □ Explorer do Windows
 * · L1/R1 alterna entre Locais e a lista. Mouse e teclado (Enter, Backspace, Esc) também funcionam. */
const FB_PAGE = 300;

const FileBrowser = {
  // mode: 'exe' (escolher executável) ou 'dir' (escolher pasta). Retorna o caminho ou null.
  async open({ mode = 'exe', title, start } = {}) {
    const places = await api.invoke('fs:places');
    const st = { mode, places, dir: null, data: null, limit: FB_PAGE, focusName: {}, box: null };
    this.st = st;
    const placeHtml = places
      .map((p, i) => `<button class="fb-place focusable" data-group="fbplaces" data-p="${i}"><span class="ico">${this.placeIcon(p.kind)}</span><span class="n">${esc(p.label)}</span></button>`)
      .join('');
    const hints = [['a', 'Abrir'], ['b', 'Voltar'], ...(mode === 'dir' ? [['y', 'Usar esta pasta']] : []), ['x', 'Explorer do Windows'], ['lb+rb', 'Locais / lista']];
    const first = start || (places.find((p) => (mode === 'dir' ? p.kind === 'base' && /ROMs/.test(p.label) : p.kind === 'games')) || places.find((p) => p.kind === 'user') || places[0] || {}).path;
    const result = Modal.open({
      className: 'file-browser',
      html:
        `<div class="fb-head"><div class="fb-ico">${mode === 'dir' ? Icons.folder : Icons.gamepad}</div><div class="fb-titles"><h3>${esc(title || (mode === 'dir' ? 'Escolha a pasta' : 'Escolha o executável do jogo'))}</h3>` +
        `<div class="fb-path"></div></div></div>` +
        `<div class="fb-body"><div class="fb-places">${placeHtml}</div><div class="fb-list"></div></div>` +
        `<div class="fb-foot"><span class="fb-count"></span>` +
        (mode === 'dir' ? `<button class="btn-pill focusable fb-use" data-group="fbfoot" data-act="use">${glyph('y')} Usar esta pasta</button>` : '') +
        `<button class="btn-pill focusable" data-group="fbfoot" data-act="native">${glyph('x')} Explorer do Windows</button>` +
        `<button class="btn-pill focusable" data-group="fbfoot" data-act="cancel">Cancelar</button></div>`,
      hints,
      onMount: (box) => {
        st.box = box;
        box.addEventListener('click', (e) => this.onClick(e));
      },
      onButton: (btn) => this.onButton(btn),
      onKey: (e) => {
        if (e.target.tagName === 'INPUT') return false;
        if (e.key === 'Backspace') {
          this.up();
          return true;
        }
        if (e.key === 'Escape') {
          Modal.close(null);
          return true;
        }
        return false;
      },
    });
    if (first) await this.go(first);
    return result;
  },

  placeIcon(kind) {
    return { drive: Icons.chip, games: Icons.gamepad, base: Icons.folder, user: Icons.folder, system: Icons.folder }[kind] || Icons.folder;
  },

  async go(dir, focusName) {
    const st = this.st;
    if (!st || !st.box.isConnected) return;
    if (st.dir && Nav.current && Nav.current.dataset.name) st.focusName[st.dir] = Nav.current.dataset.name;
    const data = await api.invoke('fs:list', dir, st.mode);
    st.dir = data.dir;
    st.data = data;
    st.limit = FB_PAGE;
    this.render(focusName || st.focusName[data.dir]);
  },

  up() {
    const st = this.st;
    if (!st || !st.data || !st.data.parent) return false;
    Sound.back();
    this.go(st.data.parent, baseName(st.dir));
    return true;
  },

  render(focusName) {
    const { box, data, mode } = this.st;
    const list = $('.fb-list', box);
    $('.fb-path', box).textContent = data.dir;
    const shown = data.entries.slice(0, this.st.limit);
    const item = (e, i) =>
      `<button class="fb-item focusable ${e.type}" data-group="fblist" data-i="${i}" data-name="${esc(e.name)}">` +
      `<span class="ico">${e.type === 'dir' ? Icons.folder : Icons.play}</span><span class="n">${esc(e.name)}</span>` +
      `<span class="m">${e.type === 'exe' ? fmtSize(e.size) : ''}</span></button>`;
    list.innerHTML =
      (data.parent ? `<button class="fb-item focusable up" data-group="fblist" data-up="1"><span class="ico">${Icons.chevL}</span><span class="n">Voltar para ${esc(data.parent)}</span></button>` : '') +
      (data.error ? `<div class="fb-empty">${esc(data.error)}</div>` : '') +
      shown.map(item).join('') +
      (data.entries.length > shown.length ? `<button class="fb-item focusable more" data-group="fblist" data-more="1"><span class="ico">${Icons.plus}</span><span class="n">Mostrar mais ${Math.min(FB_PAGE, data.entries.length - shown.length)} (de ${data.entries.length - shown.length})</span></button>` : '') +
      (!data.error && !data.entries.length ? `<div class="fb-empty">${mode === 'dir' ? 'Nenhuma subpasta aqui.' : 'Nenhuma pasta ou executável aqui.'}</div>` : '');
    const exes = data.entries.filter((e) => e.type === 'exe').length;
    const dirs = data.entries.length - exes;
    $('.fb-count', box).textContent = `${dirs} ${dirs === 1 ? 'pasta' : 'pastas'}${mode === 'exe' ? ` · ${exes} ${exes === 1 ? 'executável' : 'executáveis'}` : ''}`;
    list.scrollTop = 0;
    const target = (focusName && [...$$('.fb-item', list)].find((b) => b.dataset.name === focusName)) || $('.fb-item:not(.up)', list) || $('.fb-item', list) || $('.fb-place', box);
    if (target) Nav.focus(target, { silent: true });
  },

  async pick(el) {
    const st = this.st;
    if (el.classList.contains('fb-place')) return this.go(st.places[+el.dataset.p].path);
    if (el.dataset.up) return this.up();
    if (el.dataset.more) {
      st.limit += FB_PAGE;
      const keep = $$('.fb-item[data-i]', st.box).length;
      this.render();
      const next = $(`.fb-item[data-i="${keep}"]`, st.box);
      if (next) Nav.focus(next, { silent: true });
      return;
    }
    const e = st.data.entries[+el.dataset.i];
    if (!e) return;
    const full = st.dir.replace(/[\\/]+$/, '') + '\\' + e.name;
    if (e.type === 'dir') return this.go(full);
    Sound.select();
    Modal.close(full);
  },

  onClick(e) {
    const act = e.target.closest('[data-act]');
    if (act) return this.action(act.dataset.act);
    const el = e.target.closest('.fb-place, .fb-item');
    if (el) {
      Sound.select();
      this.pick(el);
    }
  },

  async action(act) {
    const st = this.st;
    if (act === 'cancel') return Modal.close(null);
    if (act === 'use' && st.mode === 'dir' && st.dir) {
      Sound.select();
      return Modal.close(st.dir);
    }
    if (act === 'native') {
      const p = await api.invoke('dialog:pick', {
        kind: st.mode === 'dir' ? 'folder' : 'file',
        title: st.mode === 'dir' ? 'Pasta de ROMs' : 'Executável do jogo',
        defaultPath: st.dir,
        filters: [{ name: 'Executáveis', extensions: ['exe'] }],
      });
      if (p) Modal.close(p);
    }
  },

  onButton(btn) {
    const st = this.st;
    if (!st) return false;
    if (btn === 'a') {
      const el = Nav.current;
      if (el && (el.classList.contains('fb-place') || el.classList.contains('fb-item'))) {
        Sound.select();
        this.pick(el);
        return true;
      }
      return false; // botões do rodapé: ativação normal
    }
    if (btn === 'b') {
      if (this.up()) return true;
      Sound.back();
      Modal.close(null);
      return true;
    }
    if (btn === 'y' && st.mode === 'dir') {
      this.action('use');
      return true;
    }
    if (btn === 'x') {
      this.action('native');
      return true;
    }
    if (btn === 'lb' || btn === 'rb') {
      const inPlaces = Nav.current && Nav.current.classList.contains('fb-place');
      const target = inPlaces ? $('.fb-item:not(.up)', st.box) || $('.fb-item', st.box) : $('.fb-place', st.box);
      if (target) Nav.focus(target);
      return true;
    }
    return false;
  },
};

const baseName = (p) => p.replace(/[\\/]+$/, '').split(/[\\/]/).pop();
