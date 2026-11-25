import { useEffect, useRef } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import {
  HEIGHT,
  WIDTH,
  renderFrame,
  type Artwork,
} from '../../engines/renderer/renderFrame';
import { formatTime, type Schedule } from '../../engines/timeline/schedule';
import type { Project } from '../../types/project';
import type { usePlayback } from './usePlayback';

type Props = {
  project: Project;
  score: Schedule;
  peaks: number[];
  artwork: Artwork;
  transport: ReturnType<typeof usePlayback>;
  previewable: boolean;
  supported: boolean;
  exporting?: number;
  cancel: () => void;
  report: (error: unknown) => void;
};

export function Preview({
  project,
  score,
  peaks,
  artwork,
  transport,
  previewable,
  supported,
  exporting,
  cancel,
  report,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { time } = transport;
  const toggle = () =>
    transport.playing ? transport.stop() : void transport.play();

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    try {
      renderFrame(element, project, score, peaks, artwork, time);
    } catch (error) {
      report(error);
    }
  }, [project, score, peaks, artwork, time, report]);

  return (
    <section className="preview panel" aria-label="Video preview">
      <div className="preview-head">
        <h2>Preview</h2>
        <code>9:16</code>
      </div>
      <div className="stage">
        <div className="video-frame">
          <canvas
            ref={canvas}
            width={WIDTH}
            height={HEIGHT}
            aria-label="Vertical chat video"
          />
          {exporting !== undefined && (
            <div className="render-overlay">
              <strong>Exporting video</strong>
              <progress max={1} value={exporting} />
              <code>{Math.round(exporting * 100)}%</code>
              <button onClick={cancel}>Cancel export</button>
            </div>
          )}
        </div>
      </div>
      <div className="transport">
        <code>
          {formatTime(transport.time)} <span>/</span> {formatTime(score.total)}
        </code>
        <div>
          <button
            className="icon subtle"
            disabled={!previewable}
            title="Restart preview"
            aria-label="Restart preview"
            onClick={() => void transport.play(0)}
          >
            <RotateCcw size={17} />
          </button>
          <button
            className="play"
            title={transport.playing ? 'Pause preview' : 'Play preview'}
            aria-label={transport.playing ? 'Pause preview' : 'Play preview'}
            disabled={!previewable}
            onClick={toggle}
          >
            {transport.playing ? (
              <Pause size={17} fill="currentColor" />
            ) : (
              <Play size={17} fill="currentColor" />
            )}
          </button>
        </div>
        <span className="format">
          {supported ? '720p' : 'Export unavailable'}
        </span>
      </div>
    </section>
  );
}
