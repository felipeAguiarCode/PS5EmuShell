// Ferramenta de desenvolvimento: EMU_SNAPSHOT=pasta EMU_INPUTS="right,right,a" npm start
// Envia entradas simuladas e salva capturas da janela (snap-0.png, snap-1.png, ...), depois fecha.
const fs = require('fs');
const path = require('path');

// main:<js> roda no processo main com acesso a `ctx` (ex.: ctx.pads.fake = [...] simula controles).
module.exports = function devSnapshot(win, app, ctx = {}) {
  const dir = process.env.EMU_SNAPSHOT;
  const steps = (process.env.EMU_INPUTS || '').split(process.env.EMU_SEP || ',').map((s) => s.trim()).filter(Boolean);
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  fs.mkdirSync(dir, { recursive: true });
  win.webContents.on('console-message', (e) => {
    fs.appendFileSync(path.join(dir, 'console.log'), `[${e.level}] ${e.message} (${e.sourceId}:${e.lineNumber})\n`);
  });
  win.webContents.once('did-finish-load', async () => {
    await delay(+process.env.EMU_SNAP_DELAY || 4200);
    let n = 0;
    const snap = async () => {
      const img = await win.webContents.capturePage();
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `snap-${n++}.png`), img.toPNG());
    };
    // Gravação contínua: rec:<nome> começa a salvar quadros (1280 px) com o horário de cada um;
    // stop encerra e grava <nome>.ffconcat com a duração real de cada quadro (para o ffmpeg).
    let rec = null;
    const recLoop = async (r) => {
      while (rec === r) {
        const t = Date.now();
        const img = (await win.webContents.capturePage()).resize({ width: 1280, quality: 'best' });
        const file = `${r.name}-${String(r.frames.length).padStart(5, '0')}.png`;
        fs.writeFileSync(path.join(dir, r.name, file), img.toPNG());
        r.frames.push({ file, t });
        const wait = 66 - (Date.now() - t);
        if (wait > 0) await delay(wait);
      }
    };
    const stopRec = async () => {
      if (!rec) return;
      const r = rec;
      rec = null;
      await r.loop;
      const lines = ['ffconcat version 1.0'];
      r.frames.forEach((f, i) => {
        const next = r.frames[i + 1];
        lines.push(`file '${f.file}'`, `duration ${((next ? next.t - f.t : 66) / 1000).toFixed(3)}`);
      });
      if (r.frames.length) lines.push(`file '${r.frames[r.frames.length - 1].file}'`);
      fs.writeFileSync(path.join(dir, r.name, `${r.name}.ffconcat`), lines.join('\n'));
    };

    await snap();
    for (const step of steps) {
      if (step.startsWith('rec:')) {
        await stopRec();
        const name = step.slice(4);
        fs.mkdirSync(path.join(dir, name), { recursive: true });
        rec = { name, frames: [] };
        rec.loop = recLoop(rec);
      } else if (step.startsWith('vrec:')) {
        // Gravação de vídeo da própria janela (30 fps) com o MediaRecorder do Chromium.
        rec && (await stopRec());
        win.__vname = step.slice(5);
        const id = win.getMediaSourceId();
        await win.webContents.executeJavaScript(`(async () => {
          const s = await navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: '${id}', maxWidth: 1920, maxHeight: 1080, maxFrameRate: 30 } } });
          window.__chunks = [];
          window.__rec = new MediaRecorder(s, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 16000000 });
          window.__rec.ondataavailable = (e) => window.__chunks.push(e.data);
          window.__rec.start(250);
          return true;
        })()`);
      } else if (step === 'vstop') {
        const b64 = await win.webContents.executeJavaScript(`new Promise((res) => {
          window.__rec.onstop = async () => {
            const u = new Uint8Array(await new Blob(window.__chunks, { type: 'video/webm' }).arrayBuffer());
            let s = '';
            for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
            window.__rec.stream.getTracks().forEach((t) => t.stop());
            res(btoa(s));
          };
          window.__rec.stop();
        })`);
        fs.writeFileSync(path.join(dir, `${win.__vname}.webm`), Buffer.from(b64, 'base64'));
      } else if (step === 'stop') await stopRec();
      else if (step === 'snap') await snap();
      else if (step.startsWith('wait')) await delay(+step.slice(4) || 500);
      else if (step.startsWith('type:')) {
        for (const ch of step.slice(5)) {
          const keyCode = ch === ' ' ? 'Space' : ch;
          win.webContents.sendInputEvent({ type: 'keyDown', keyCode });
          win.webContents.sendInputEvent({ type: 'char', keyCode: ch });
          win.webContents.sendInputEvent({ type: 'keyUp', keyCode });
          await delay(30);
        }
      } else if (step.startsWith('click:')) {
        // click:<seletor CSS> — move o mouse até o centro do elemento e clica
        const r = await win.webContents.executeJavaScript(
          `(() => { const b = document.querySelector(${JSON.stringify(step.slice(6))}).getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; })()`
        );
        for (const [dx, dy] of [[-40, -20], [-10, -5], [0, 0]]) {
          win.webContents.sendInputEvent({ type: 'mouseMove', x: r.x + dx, y: r.y + dy });
          await delay(60);
        }
        win.webContents.sendInputEvent({ type: 'mouseDown', x: r.x, y: r.y, button: 'left', clickCount: 1 });
        win.webContents.sendInputEvent({ type: 'mouseUp', x: r.x, y: r.y, button: 'left', clickCount: 1 });
      } else if (step.startsWith('key:')) {
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: step.slice(4) });
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: step.slice(4) });
      } else if (step.startsWith('eval:')) await win.webContents.executeJavaScript(step.slice(5)).catch(() => {});
      else if (step.startsWith('main:')) {
        try {
          new Function('ctx', step.slice(5))(ctx);
        } catch (e) {
          fs.appendFileSync(path.join(dir, 'console.log'), `[main] ${e.stack}\n`);
        }
      }
      else {
        win.webContents.send('input', { button: step, repeat: false });
        await delay(450);
      }
    }
    await stopRec();
    await snap();
    app.quit();
  });
};
