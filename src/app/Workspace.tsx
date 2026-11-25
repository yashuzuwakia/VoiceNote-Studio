import { useCallback, useMemo, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { waveform } from '../engines/audio/graph';
import { timeline } from '../engines/timeline/schedule';
import { useProject } from '../features/projects/useProject';
import { useCapture } from '../features/audio/useCapture';
import { useExport } from '../features/export/useExport';
import { useMedia } from '../hooks/useMedia';
import { Toolbar } from '../components/layout/Toolbar';
import { Preview } from '../features/editor/Preview';
import { Settings, type Tab } from '../features/editor/Settings';
import { Timeline } from '../features/timeline/Timeline';
import { useAppearance } from '../hooks/useAppearance';
import { usePlayback } from '../features/editor/usePlayback';
import { useShortcuts } from '../features/editor/useShortcuts';

const emptyPeaks = Array<number>(34).fill(0.2);

export default function Workspace() {
  const [tab, setTab] = useState<Tab>('script');
  const [selected, select] = useState('');
  const [notice, setNotice] = useState<{ message: string; error: boolean }>();
  const notify = useCallback(
    (message: string, error = false) => setNotice({ message, error }),
    [],
  );
  const report = useCallback(
    (error: unknown) =>
      notify(error instanceof Error ? error.message : String(error), true),
    [notify],
  );
  const session = useProject(report);
  const { project, patch } = session;
  const appearance = useAppearance();
  const score = useMemo(() => timeline(project), [project]);
  const media = useMedia(project);
  const { buffer, audioError, artwork, artReady, artError } = media;
  const peaks = useMemo(
    () =>
      buffer
        ? waveform(buffer, project.trimStart, project.trimEnd, 34)
        : emptyPeaks,
    [buffer, project.trimStart, project.trimEnd],
  );
  const transport = usePlayback(project, score, buffer, report);
  const resetPlayback = () => transport.seek(0);
  const capture = useCapture({
    project,
    patch,
    stopPlayback: transport.stop,
    resetPlayback,
    report,
    notify,
  });
  const video = useExport(
    { project, score, buffer, peaks, artwork },
    transport.stop,
    report,
    notify,
  );
  const locked =
    !session.hydrated ||
    Boolean(capture.busy) ||
    Boolean(capture.mic) ||
    video.exporting !== undefined;
  const previewable = Boolean(buffer && artReady) && !locked;
  useShortcuts(locked, previewable, transport, session.undo, session.redo);

  function jump(id: string) {
    select(id);
    setTab(id === 'voice-note' ? 'audio' : 'script');
  }
  function seek(time: number) {
    if (video.exporting === undefined && !capture.mic) transport.seek(time);
  }

  return (
    <div className="studio">
      <Toolbar
        {...session}
        {...appearance}
        title={project.title}
        locked={locked}
        previewable={previewable}
        preferredFormat={video.preferredFormat}
        download={video.download}
      />
      <main className="workspace">
        <Preview
          project={project}
          score={score}
          peaks={peaks}
          artwork={artwork}
          transport={transport}
          previewable={previewable}
          supported={video.supported}
          exporting={video.exporting}
          cancel={video.cancel}
          report={report}
        />
        <Timeline
          score={score}
          time={transport.time}
          seek={seek}
          selected={selected}
          select={jump}
          peaks={peaks}
        />
        <Settings
          project={project}
          patch={patch}
          locked={locked}
          tab={tab}
          setTab={setTab}
          selected={selected}
          select={select}
          peaks={peaks}
          resetPlayback={resetPlayback}
          capture={capture}
          report={report}
        />
      </main>
      {(audioError || artError) && (
        <div className="media-warning" role="status">
          <CircleAlert size={15} />
          {audioError || artError}
        </div>
      )}
      {notice && (
        <div
          role={notice.error ? 'alert' : 'status'}
          className={'toast ' + (notice.error ? 'error' : '')}
        >
          <span>{notice.message}</span>
          <button
            className="icon subtle"
            onClick={() => setNotice(undefined)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
