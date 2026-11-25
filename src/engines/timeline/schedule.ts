import type { Message, Person, Project } from '../../types/project';
export type TextItem = Message & { type: 'text'; appearAt: number };
export type VoiceItem = {
  type: 'voice';
  id: 'voice-note';
  sender: Person;
  appearAt: number;
  playStart: number;
  playEnd: number;
  duration: number;
};
export function timeline(project: Project) {
  const items: (TextItem | VoiceItem)[] = [];
  let cursor = 0.55;
  for (const m of project.messages.filter((m) => m.placement === 'before')) {
    items.push({ ...m, type: 'text', appearAt: cursor });
    cursor += 1.25;
  }
  const voiceAppearAt = cursor;
  const voicePlayStart = cursor + 0.85;
  const duration = project.trimEnd - project.trimStart;
  const voicePlayEnd = voicePlayStart + duration;
  const voice: VoiceItem = {
    type: 'voice',
    id: 'voice-note',
    sender: project.voiceSender,
    appearAt: cursor,
    playStart: voicePlayStart,
    playEnd: voicePlayEnd,
    duration,
  };
  items.push(voice);
  cursor = voicePlayEnd + 0.65;
  for (const m of project.messages.filter((m) => m.placement === 'after')) {
    items.push({ ...m, type: 'text', appearAt: cursor });
    cursor += 1.3;
  }
  return {
    items,
    voice,
    voiceAppearAt,
    voicePlayStart,
    voicePlayEnd,
    total: Math.max(4, cursor + 1.1),
  };
}
export type Schedule = ReturnType<typeof timeline>;
export function trim(
  project: Project,
  edge: 'trimStart' | 'trimEnd',
  value: number,
): Partial<Project> {
  if (!Number.isFinite(value)) return {};
  const minimum = Math.min(0.5, project.audio.duration);
  return edge === 'trimStart'
    ? { trimStart: Math.max(0, Math.min(value, project.trimEnd - minimum)) }
    : {
        trimEnd: Math.min(
          project.audio.duration,
          Math.max(value, project.trimStart + minimum),
        ),
      };
}
export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
