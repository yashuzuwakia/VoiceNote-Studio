import { useId, useState } from 'react';
import { AudioLines } from 'lucide-react';
import type { Patch, Project } from '../../types/project';
import { trim } from '../../engines/timeline/schedule';
import { Wave } from '../../components/ui/controls';

function TrimControl({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<number>();
  const id = useId();
  function commit() {
    if (draft !== undefined) {
      onCommit(draft);
      setDraft(undefined);
    }
  }
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} <output>{(draft ?? value).toFixed(2)}s</output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={draft ?? value}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={commit}
        onPointerCancel={() => setDraft(undefined)}
        onKeyUp={commit}
        onBlur={commit}
      />
    </div>
  );
}
export function ClipControls({
  project,
  patch,
  peaks,
}: {
  project: Project;
  patch: Patch;
  peaks: number[];
}) {
  const min = Math.min(0.5, project.audio.duration);
  return (
    <>
      <div className="clip-info">
        <AudioLines size={17} />
        <span>{project.audio.name}</span>
        <code>{(project.trimEnd - project.trimStart).toFixed(2)}s</code>
      </div>
      <div className="clip-wave">
        <Wave peaks={peaks} />
      </div>
      <TrimControl
        label="Trim in"
        value={project.trimStart}
        min={0}
        max={Math.max(0, project.trimEnd - min)}
        onCommit={(v) => patch(trim(project, 'trimStart', v))}
      />
      <TrimControl
        label="Trim out"
        value={project.trimEnd}
        min={project.trimStart + min}
        max={project.audio.duration}
        onCommit={(v) => patch(trim(project, 'trimEnd', v))}
      />
      <button
        onClick={() => patch({ trimStart: 0, trimEnd: project.audio.duration })}
      >
        Reset trim
      </button>
    </>
  );
}
