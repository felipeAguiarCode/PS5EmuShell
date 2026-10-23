/* Sons de interface sintetizados com WebAudio (sem arquivos externos). */
const Sound = (() => {
  let ctx = null;
  let master = null;

  function ensure() {
    if (!App.config || !App.config.sounds) return null;
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    master.gain.value = (App.config.volume ?? 60) / 100;
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, { dur = 0.08, type = 'sine', gain = 0.12, at = 0, slideTo = null, attack = 0.004 } = {}) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + at;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.6, gain = 0.08, from = 400, to = 4000, at = 0 } = {}) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + at;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(from, t0);
    f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
  }

  let lastMove = 0;
  return {
    move() {
      const now = performance.now();
      if (now - lastMove < 35) return;
      lastMove = now;
      tone(1320, { dur: 0.045, gain: 0.05 });
      tone(2640, { dur: 0.03, gain: 0.015 });
    },
    edge() {
      tone(220, { dur: 0.08, gain: 0.06, type: 'triangle' });
    },
    select() {
      tone(880, { dur: 0.09, gain: 0.08 });
      tone(1320, { dur: 0.14, gain: 0.07, at: 0.05 });
    },
    back() {
      tone(990, { dur: 0.08, gain: 0.06, slideTo: 660 });
    },
    toggle() {
      tone(1500, { dur: 0.05, gain: 0.05 });
    },
    open() {
      tone(660, { dur: 0.12, gain: 0.05, slideTo: 990 });
    },
    notify() {
      tone(1046, { dur: 0.18, gain: 0.06 });
      tone(1568, { dur: 0.3, gain: 0.05, at: 0.09 });
    },
    launch() {
      noise({ dur: 0.9, gain: 0.07, from: 300, to: 5000 });
      [523, 659, 784, 1046].forEach((f, i) => tone(f, { dur: 0.5, gain: 0.045, at: i * 0.07, attack: 0.02 }));
    },
    boot() {
      [261.6, 329.6, 392, 523.3].forEach((f, i) => tone(f, { dur: 1.8, gain: 0.04, at: 0.1 + i * 0.12, attack: 0.15, type: 'sine' }));
      tone(1046, { dur: 1.4, gain: 0.02, at: 0.6, attack: 0.3 });
    },
  };
})();
