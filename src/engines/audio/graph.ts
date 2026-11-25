import type { Person, Project } from '../../types/project';
import type { Schedule } from '../timeline/schedule';

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
export function audioSupported() {
  return Boolean(
    window.AudioContext || (window as AudioWindow).webkitAudioContext,
  );
}
let context: AudioContext | undefined;
export function audioContext() {
  const Audio =
    window.AudioContext || (window as AudioWindow).webkitAudioContext;
  if (!Audio) throw new Error('Web Audio is unavailable in this browser.');
  return (context ??= new Audio());
}
export async function readyAudio() {
  const audio = audioContext();
  if (audio.state !== 'running') await audio.resume();
  return audio;
}
export const microphoneSupported = () =>
  Boolean(
    window.isSecureContext &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof window.MediaRecorder === 'function',
  );
export const MAX_AUDIO_SECONDS = 300;
export const MAX_AUDIO_BYTES = 60 * 1024 * 1024;
export async function decodeAudio(blob: Blob) {
  if (blob.size === 0 || blob.size > MAX_AUDIO_BYTES)
    throw new Error('Choose a non-empty audio file under 60 MB.');
  const audio = audioContext();
  let buffer: AudioBuffer;
  try {
    buffer = await audio.decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw new Error(
      'This browser could not decode the audio. Try a WAV, MP3, or another supported format.',
    );
  }
  if (buffer.duration > MAX_AUDIO_SECONDS)
    throw new Error('Choose an audio track up to five minutes long.');
  return buffer;
}
export function waveform(
  buffer: AudioBuffer,
  start: number,
  end: number,
  bins: number,
) {
  const first = Math.floor(start * buffer.sampleRate);
  const length = Math.ceil((end - start) * buffer.sampleRate);
  const peaks = Array<number>(bins).fill(0);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < bins; i++) {
      const from = first + Math.floor((i * length) / bins);
      const to = Math.min(
        data.length,
        first + Math.ceil(((i + 1) * length) / bins),
      );
      const stride = Math.max(1, Math.floor((to - from) / 350));
      for (let p = from; p < to; p += stride)
        peaks[i] = Math.max(peaks[i], Math.abs(data[p]));
    }
  }
  const max = Math.max(0.01, ...peaks);
  return peaks.map((value) => Math.max(0.12, Math.min(1, value / max)));
}
function tone(
  audio: AudioContext,
  destination: AudioNode,
  when: number,
  freq: number,
  duration: number,
  volume: number,
  type: OscillatorType,
  sweep = 1,
  stepped = false,
) {
  const oscillator = audio.createOscillator(),
    gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, when);
  if (stepped) oscillator.frequency.setValueAtTime(freq * sweep, when + 0.055);
  else
    oscillator.frequency.exponentialRampToValueAtTime(
      freq * sweep,
      when + duration * 0.85,
    );
  gain.gain.setValueAtTime(volume, when);
  gain.gain.exponentialRampToValueAtTime(0.0008, when + duration);
  oscillator.connect(gain).connect(destination);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
  oscillator.start(when);
  oscillator.stop(when + duration);
  return oscillator;
}
function messageTone(
  audio: AudioContext,
  to: AudioNode,
  time: number,
  style: Project['msgSfxStyle'],
  sender: Person,
) {
  const me = sender === 'me';
  if (style === 'chime')
    return tone(
      audio,
      to,
      time,
      me ? 784 : 659.25,
      0.18,
      0.12,
      'triangle',
      1.25,
    );
  if (style === 'whatsapp')
    return tone(
      audio,
      to,
      time,
      me ? 660 : 520,
      0.13,
      0.12,
      'sine',
      1.25,
      true,
    );
  return tone(audio, to, time, me ? 540 : 420, 0.09, 0.14, 'sine', 1.45);
}
export async function audition(style: Project['msgSfxStyle']) {
  const audio = await readyAudio();
  messageTone(audio, audio.destination, audio.currentTime, style, 'me');
}
export function scheduleAudio(
  audio: AudioContext,
  destination: AudioNode,
  project: Project,
  score: Schedule,
  buffer: AudioBuffer,
  from: number,
  anchor: number,
) {
  const bus = audio.createGain();
  bus.connect(destination);
  const sources: AudioScheduledSourceNode[] = [];
  const voice = score.voice;
  const start = Math.max(voice.playStart, from);
  if (start < voice.playEnd) {
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(bus);
    source.start(
      anchor + start - from,
      project.trimStart + start - voice.playStart,
      voice.playEnd - start,
    );
    sources.push(source);
  }
  if (project.msgSfxEnabled) {
    for (const item of score.items) {
      if (item.appearAt >= from)
        sources.push(
          messageTone(
            audio,
            bus,
            anchor + item.appearAt - from,
            project.msgSfxStyle,
            item.sender,
          ),
        );
    }
  }
  if (project.chatBgMusicEnabled) {
    const box = project.chatBgMusicStyle === 'musicbox';
    const notes = box
      ? [523.25, 659.25, 783.99, 987.77, 783.99, 659.25]
      : [261.63, 329.63, 392, 493.88, 440, 392];
    let note = 0;
    for (let step = 0; step * 0.6 < score.total; step++) {
      const t = step * 0.6;
      if (t >= voice.playStart && t < voice.playEnd) continue;
      const freq = notes[note++ % notes.length];
      const boundary = t < voice.playStart ? voice.playStart : score.total;
      const length = Math.min(0.55, boundary - t);
      if (t >= from && length > 0.01)
        sources.push(
          tone(
            audio,
            bus,
            anchor + t - from,
            freq,
            length,
            0.035,
            box ? 'sine' : 'triangle',
          ),
        );
    }
  }
  return () => {
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        /* Already finished. */
      }
      source.disconnect();
    }
    bus.disconnect();
  };
}
