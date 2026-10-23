/* Partículas de luz flutuando no fundo, como no menu do PS5. */
const Particles = (() => {
  const canvas = $('#particles');
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let dpr = 1;
  let items = [];
  let running = false;
  let last = 0;
  let sprite = null;

  function makeSprite() {
    const s = document.createElement('canvas');
    s.width = s.height = 64;
    const c = s.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(200,225,255,0.6)');
    g.addColorStop(1, 'rgba(160,200,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    return s;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(initial) {
    return {
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 20,
      r: 4 + Math.random() * 14,
      vy: 6 + Math.random() * 16,
      vx: (Math.random() - 0.5) * 6,
      a: 0.05 + Math.random() * 0.3,
      ph: Math.random() * Math.PI * 2,
    };
  }

  function frame(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    ctx.clearRect(0, 0, w, h);
    for (const p of items) {
      p.y -= p.vy * dt;
      p.x += p.vx * dt + Math.sin(t / 2400 + p.ph) * 0.15;
      if (p.y < -30) Object.assign(p, spawn(false));
      ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t / 1200 + p.ph));
      ctx.drawImage(sprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      if (!sprite) sprite = makeSprite();
      resize();
      if (!items.length) items = Array.from({ length: 46 }, () => spawn(true));
      running = true;
      canvas.style.display = '';
      requestAnimationFrame((t) => {
        last = t;
        frame(t);
      });
    },
    stop() {
      running = false;
      ctx.clearRect(0, 0, w, h);
      canvas.style.display = 'none';
    },
    resize,
    get running() {
      return running;
    },
  };
})();
window.addEventListener('resize', () => Particles.running && Particles.resize());
