import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_SNAPSHOT_DELAY_MS = 4200;
const DEFAULT_STEP_SEPARATOR = ',';
const DEFAULT_WAIT_MS = 500;
const INPUT_STEP_DELAY_MS = 450;
const TYPE_KEY_DELAY_MS = 30;
const MOUSE_MOVE_DELAY_MS = 60;
const FRAME_INTERVAL_MS = 66;
const FRAME_WIDTH = 1280;
const FRAME_INDEX_LENGTH = 5;
const MOUSE_APPROACH_OFFSETS = [
  [-40, -20],
  [-10, -5],
  [0, 0],
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseSteps = (environment) =>
  (environment.EMU_INPUTS || '')
    .split(environment.EMU_SEP || DEFAULT_STEP_SEPARATOR)
    .map((step) => step.trim())
    .filter(Boolean);

const buildFfconcat = (frames) => {
  const frameLines = frames.flatMap((frame, index) => {
    const nextFrame = frames[index + 1];
    const durationMs = nextFrame ? nextFrame.capturedAt - frame.capturedAt : FRAME_INTERVAL_MS;
    return [`file '${frame.file}'`, `duration ${(durationMs / 1000).toFixed(3)}`];
  });
  const lastFrameLines = frames.length ? [`file '${frames.at(-1).file}'`] : [];
  return ['ffconcat version 1.0', ...frameLines, ...lastFrameLines].join('\n');
};

const VIDEO_START_SCRIPT = (sourceId) => `(async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: '${sourceId}', maxWidth: 1920, maxHeight: 1080, maxFrameRate: 30 } } });
  window.__chunks = [];
  window.__rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 16000000 });
  window.__rec.ondataavailable = (event) => window.__chunks.push(event.data);
  window.__rec.start(250);
  return true;
})()`;

const VIDEO_STOP_SCRIPT = `new Promise((resolve) => {
  window.__rec.onstop = async () => {
    const bytes = new Uint8Array(await new Blob(window.__chunks, { type: 'video/webm' }).arrayBuffer());
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(index, index + 0x8000));
    window.__rec.stream.getTracks().forEach((track) => track.stop());
    resolve(btoa(binary));
  };
  window.__rec.stop();
})`;

const buildElementCenterScript = (selector) =>
  `(() => { const box = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) }; })()`;

const createSnapshotSession = ({ window, outputDir, context }) => {
  const contents = window.webContents;
  let snapshotCount = 0;
  let recording = null;
  let videoName = null;

  const appendLog = (line) => fs.appendFileSync(path.join(outputDir, 'console.log'), `${line}\n`);

  const saveSnapshot = async () => {
    const image = await contents.capturePage();
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, `snap-${snapshotCount}.png`), image.toPNG());
    snapshotCount += 1;
  };

  const recordFrames = async (session) => {
    while (recording === session) {
      const capturedAt = Date.now();
      const image = (await contents.capturePage()).resize({ width: FRAME_WIDTH, quality: 'best' });
      const frameIndex = String(session.frames.length).padStart(FRAME_INDEX_LENGTH, '0');
      const file = `${session.name}-${frameIndex}.png`;
      fs.writeFileSync(path.join(outputDir, session.name, file), image.toPNG());
      session.frames.push({ file, capturedAt });
      const waitMs = FRAME_INTERVAL_MS - (Date.now() - capturedAt);
      if (waitMs > 0) await delay(waitMs);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    const session = recording;
    recording = null;
    await session.loop;
    fs.writeFileSync(
      path.join(outputDir, session.name, `${session.name}.ffconcat`),
      buildFfconcat(session.frames),
    );
  };

  const startRecording = async (name) => {
    await stopRecording();
    fs.mkdirSync(path.join(outputDir, name), { recursive: true });
    const session = { name, frames: [] };
    recording = session;
    session.loop = recordFrames(session);
  };

  const startVideo = async (name) => {
    await stopRecording();
    videoName = name;
    await contents.executeJavaScript(VIDEO_START_SCRIPT(window.getMediaSourceId()));
  };

  const stopVideo = async () => {
    const base64 = await contents.executeJavaScript(VIDEO_STOP_SCRIPT);
    fs.writeFileSync(path.join(outputDir, `${videoName}.webm`), Buffer.from(base64, 'base64'));
  };

  const typeText = async (text) => {
    for (const character of text) {
      const keyCode = character === ' ' ? 'Space' : character;
      contents.sendInputEvent({ type: 'keyDown', keyCode });
      contents.sendInputEvent({ type: 'char', keyCode: character });
      contents.sendInputEvent({ type: 'keyUp', keyCode });
      await delay(TYPE_KEY_DELAY_MS);
    }
  };

  const clickElement = async (selector) => {
    const center = await contents.executeJavaScript(buildElementCenterScript(selector));
    for (const [offsetX, offsetY] of MOUSE_APPROACH_OFFSETS) {
      contents.sendInputEvent({ type: 'mouseMove', x: center.x + offsetX, y: center.y + offsetY });
      await delay(MOUSE_MOVE_DELAY_MS);
    }
    const mouseEvent = { x: center.x, y: center.y, button: 'left', clickCount: 1 };
    contents.sendInputEvent({ type: 'mouseDown', ...mouseEvent });
    contents.sendInputEvent({ type: 'mouseUp', ...mouseEvent });
  };

  const pressKey = (keyCode) => {
    contents.sendInputEvent({ type: 'keyDown', keyCode });
    contents.sendInputEvent({ type: 'keyUp', keyCode });
  };

  const evaluateInRenderer = async (script) => {
    try {
      await contents.executeJavaScript(script);
    } catch (error) {
      appendLog(`[eval] ${error.message}`);
    }
  };

  const evaluateInMain = (script) => {
    try {
      new Function('ctx', script)(context);
    } catch (error) {
      appendLog(`[main] ${error.stack}`);
    }
  };

  const sendControllerInput = async (button) => {
    contents.send('input', { button, repeat: false });
    await delay(INPUT_STEP_DELAY_MS);
  };

  const PREFIXED_STEPS = [
    ['rec:', startRecording],
    ['vrec:', startVideo],
    ['wait', (value) => delay(Number(value) || DEFAULT_WAIT_MS)],
    ['type:', typeText],
    ['click:', clickElement],
    ['key:', pressKey],
    ['eval:', evaluateInRenderer],
    ['main:', evaluateInMain],
  ];

  const EXACT_STEPS = { vstop: stopVideo, stop: stopRecording, snap: saveSnapshot };

  const runStep = async (step) => {
    if (EXACT_STEPS[step]) return EXACT_STEPS[step]();
    const prefixedStep = PREFIXED_STEPS.find(([prefix]) => step.startsWith(prefix));
    if (prefixedStep) return prefixedStep[1](step.slice(prefixedStep[0].length));
    return sendControllerInput(step);
  };

  return { appendLog, saveSnapshot, stopRecording, runStep };
};

export const startDevSnapshot = (window, app, context = {}, environment = process.env) => {
  const outputDir = environment.EMU_SNAPSHOT;
  const steps = parseSteps(environment);
  fs.mkdirSync(outputDir, { recursive: true });
  const session = createSnapshotSession({ window, outputDir, context });
  window.webContents.on('console-message', (event) => {
    session.appendLog(`[${event.level}] ${event.message} (${event.sourceId}:${event.lineNumber})`);
  });
  window.webContents.once('did-finish-load', async () => {
    await delay(Number(environment.EMU_SNAP_DELAY) || DEFAULT_SNAPSHOT_DELAY_MS);
    await session.saveSnapshot();
    for (const step of steps) await session.runStep(step);
    await session.stopRecording();
    await session.saveSnapshot();
    app.quit();
  });
};
