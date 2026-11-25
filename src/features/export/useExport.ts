import { useEffect, useMemo, useRef, useState } from 'react';
import {
  exportFormats,
  exportVideo,
  extension,
} from '../../engines/encoder/exportVideo';

import type { Artwork } from '../../engines/renderer/renderFrame';
import type { Schedule } from '../../engines/timeline/schedule';
import type { Project } from '../../types/project';

type ExportScene = {
  project: Project;
  score: Schedule;
  buffer?: AudioBuffer;
  peaks: number[];
  artwork: Artwork;
};

export function useExport(
  scene: ExportScene,
  stopPlayback: () => void,
  report: (error: unknown) => void,
  notify: (message: string) => void,
) {
  const [exporting, setExporting] = useState<number>();
  const abort = useRef<AbortController>(undefined);
  const formats = useMemo(exportFormats, []);
  const { project, score, buffer, peaks, artwork } = scene;

  useEffect(() => () => abort.current?.abort(), []);

  async function download() {
    if (!buffer || abort.current) return;
    stopPlayback();
    const controller = new AbortController();
    abort.current = controller;
    setExporting(0);
    try {
      const video = await exportVideo(
        project,
        score,
        buffer,
        peaks,
        artwork,
        controller.signal,
        setExporting,
      );
      const url = URL.createObjectURL(video.blob);
      const link = document.createElement('a');
      link.href = url;
      const name =
        project.title
          .trim()
          .replace(/[^\p{L}\p{N}_-]+/gu, '-')
          .replace(/^-+|-+$/g, '') || 'voicenote-reel';
      link.download = name + '.' + video.extension;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      notify(video.extension.toUpperCase() + ' video exported.');
    } catch (error) {
      if (!controller.signal.aborted) report(error);
    } finally {
      abort.current = undefined;
      setExporting(undefined);
    }
  }

  return {
    exporting,
    download,
    cancel: () => abort.current?.abort(),
    supported: formats.length > 0,
    preferredFormat: formats[0]
      ? extension(formats[0]).toUpperCase()
      : undefined,
  };
}
