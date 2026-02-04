
import { AmbientSoundType } from '../types';

let audioCtx: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let masterGain: GainNode | null = null;
let fadeGain: GainNode | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    fadeGain = audioCtx.createGain();
    fadeGain.gain.setValueAtTime(0, audioCtx.currentTime);
    
    fadeGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);
  }
  return { ctx: audioCtx, master: masterGain!, fader: fadeGain! };
};

const createNoiseBuffer = (ctx: AudioContext, type: AmbientSoundType) => {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'rain') {
    // Pink noise approximation
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }
  } else if (type === 'cafe') {
    // Brown noise for low hubbub
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      const out = (lastOut + (0.02 * white)) / 1.02;
      output[i] = out * 3.5; // Gain compensation
      lastOut = out;
    }
  }

  return buffer;
};

export const playNotification = () => {
  const { ctx } = initAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.5);
};

export const startAmbientSound = (type: AmbientSoundType, volume: number) => {
  const { ctx, master, fader } = initAudio();
  
  if (activeSource) {
    stopAmbientSound();
  }

  master.gain.setTargetAtTime(volume * 0.5, ctx.currentTime, 0.1);
  
  const buffer = createNoiseBuffer(ctx, type);
  activeSource = ctx.createBufferSource();
  activeSource.buffer = buffer;
  activeSource.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  
  if (type === 'rain') {
    filter.frequency.setValueAtTime(800, ctx.currentTime);
  } else if (type === 'cafe') {
    filter.frequency.setValueAtTime(400, ctx.currentTime);
  } else {
    filter.frequency.setValueAtTime(20000, ctx.currentTime);
  }

  activeSource.connect(filter);
  filter.connect(fader);
  
  activeSource.start();
  fader.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 1.5); // Smooth fade in
};

export const updateAmbientVolume = (volume: number) => {
  if (!audioCtx || !masterGain) return;
  masterGain.gain.setTargetAtTime(volume * 0.5, audioCtx.currentTime, 0.1);
};

export const stopAmbientSound = () => {
  if (!activeSource || !audioCtx || !fadeGain) return;
  
  const ctx = audioCtx;
  const source = activeSource;
  const fader = fadeGain;

  fader.gain.cancelScheduledValues(ctx.currentTime);
  fader.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0); // Smooth fade out
  
  setTimeout(() => {
    try {
      source.stop();
    } catch (e) {}
    if (activeSource === source) activeSource = null;
  }, 1100);
};
