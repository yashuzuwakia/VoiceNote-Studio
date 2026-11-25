import { useEffect, useState } from 'react';
import { decodeAudio } from '../../engines/audio/graph';
import { startMic } from '../../engines/audio/recording';
import type { Patch, Person, Project } from '../../types/project';
import { keepAsset, prepareAvatar } from '../../services/assets';

type CaptureOptions = {
  project: Project;
  patch: Patch;
  stopPlayback: () => void;
  resetPlayback: () => void;
  report: (error: unknown) => void;
  notify: (message: string, error?: boolean) => void;
};

export function useCapture({
  project,
  patch,
  stopPlayback,
  resetPlayback,
  report,
  notify,
}: CaptureOptions) {
  const [busy, setBusy] = useState<'' | 'audio' | 'photo' | 'mic'>('');
  const [mic, setMic] = useState<Awaited<ReturnType<typeof startMic>>>();
  const [micSeconds, setMicSeconds] = useState(0);

  useEffect(() => {
    if (!mic) return;
    const start = Date.now();
    const timer = setInterval(
      () => setMicSeconds((Date.now() - start) / 1000),
      250,
    );
    return () => clearInterval(timer);
  }, [mic]);

  async function importAudio(blob: Blob, name: string) {
    stopPlayback();
    setBusy('audio');
    try {
      const decoded = await decodeAudio(blob);
      const { id, saved } = await keepAsset(blob, decoded);
      patch({
        audio: { id, name, duration: decoded.duration },
        trimStart: 0,
        trimEnd: decoded.duration,
      });
      resetPlayback();
      if (!saved)
        notify(
          'The audio is available in this session. Browser storage could not save the file.',
          true,
        );
      else notify('Audio added to the timeline.');
    } catch (error) {
      report(error);
    } finally {
      setBusy('');
    }
  }
  async function record() {
    if (mic) {
      mic.stop();
      return;
    }
    stopPlayback();
    setBusy('mic');
    setMicSeconds(0);
    try {
      const recording = await startMic();
      setMic(recording);
      setBusy('');
      const blob = await recording.result;
      setMic(undefined);
      await importAudio(blob, 'Microphone take');
    } catch (error) {
      setMic(undefined);
      setBusy('');
      if (error instanceof DOMException && error.name === 'NotAllowedError')
        report(
          'Microphone permission was denied. Allow access in your browser or upload audio.',
        );
      else report(error);
    }
  }
  async function photo(file: File, person: Person) {
    stopPlayback();
    setBusy('photo');
    try {
      const blob = await prepareAvatar(file);
      const { id, saved } = await keepAsset(blob);
      patch({
        avatars: {
          ...project.avatars,
          [person]: { ...project.avatars[person], asset: id },
        },
      });
      if (!saved)
        notify(
          'The photo is available in this session. Browser storage could not save the file.',
          true,
        );
    } catch (error) {
      report(error);
    } finally {
      setBusy('');
    }
  }

  return { busy, mic, micSeconds, importAudio, record, photo };
}
