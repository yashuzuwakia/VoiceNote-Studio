export function createDemo(context: BaseAudioContext) {
  const sampleRate = context.sampleRate;
  const duration = 14;
  const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);

  // Warm acoustic-style chord progression + gentle vocal-like melody
  const chords = [
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 392.0], // Am7
    [174.61, 220.0, 261.63, 349.23], // Fmaj7
    [196.0, 246.94, 293.66, 392.0], // G6
  ];
  const melody = [523.25, 587.33, 659.25, 587.33, 493.88, 523.25, 440.0, 392.0];

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const chordIdx = Math.floor(t / 3.5) % chords.length;
    const chord = chords[chordIdx];
    const beatPos = t % 3.5;
    const env = Math.exp(-beatPos * 0.85) * 0.25;

    let sample = 0;
    for (const freq of chord) {
      sample += Math.sin(2 * Math.PI * freq * t) * env * 0.35;
    }

    const noteIdx = Math.floor(t / 1.75) % melody.length;
    const notePos = t % 1.75;
    const vibrato = 1 + Math.sin(2 * Math.PI * 5.2 * t) * 0.006;
    const melEnv =
      Math.sin(Math.min(1, notePos / 0.15) * (Math.PI / 2)) *
      Math.exp(-notePos * 1.1);
    sample +=
      Math.sin(2 * Math.PI * melody[noteIdx] * vibrato * t) * melEnv * 0.28;

    // Fade in/out edges
    const fadeIn = Math.min(1, t / 0.2);
    const fadeOut = Math.min(1, (duration - t) / 0.3);
    data[i] = Math.max(-0.95, Math.min(0.95, sample * fadeIn * fadeOut));
  }

  return buffer;
}
