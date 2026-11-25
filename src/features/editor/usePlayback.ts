import { useCallback, useEffect, useRef, useState } from 'react';
import { readyAudio, scheduleAudio } from '../../engines/audio/graph';
import type { Project } from '../../types/project';
import type { Schedule } from '../../engines/timeline/schedule';
export function usePlayback(
  project: Project,
  score: Schedule,
  buffer: AudioBuffer | undefined,
  onError: (error: unknown) => void,
) {
  const clock = useRef(0),
    raf = useRef(0),
    epoch = useRef(0);
  const session = useRef<{ read: () => number; stop: () => void } | undefined>(
    undefined,
  );
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const update = useCallback((value: number) => {
    clock.current = value;
    setTime(value);
  }, []);
  const stop = useCallback(() => {
    epoch.current++;
    cancelAnimationFrame(raf.current);
    if (session.current) {
      update(session.current.read());
      session.current.stop();
      session.current = undefined;
    }
    setPlaying(false);
  }, [update]);
  useEffect(() => {
    stop();
    update(Math.min(clock.current, score.total));
    return stop;
  }, [project, score, buffer, stop, update]);
  const play = async (from = clock.current) => {
    stop();
    if (!buffer) return;
    if (from >= score.total - 0.01) from = 0;
    const request = epoch.current;
    update(from);
    try {
      const audio = await readyAudio();
      if (request !== epoch.current) return;
      const anchor = audio.currentTime + 0.04;
      const cleanup = scheduleAudio(
        audio,
        audio.destination,
        project,
        score,
        buffer,
        from,
        anchor,
      );
      const read = () =>
        Math.min(score.total, from + Math.max(0, audio.currentTime - anchor));
      session.current = { read, stop: cleanup };
      setPlaying(true);
      const tick = () => {
        const t = read();
        update(t);
        if (t >= score.total) {
          stop();
          return;
        }
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    } catch (error) {
      onError(error);
    }
  };
  const seek = (at: number) => {
    const target = Math.max(0, Math.min(score.total, at));
    if (session.current && target < score.total) void play(target);
    else {
      stop();
      update(target);
    }
  };
  return { time: Math.min(time, score.total), playing, play, stop, seek };
}
