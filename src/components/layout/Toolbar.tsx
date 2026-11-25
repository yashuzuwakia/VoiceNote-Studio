import {
  AudioLines,
  Check,
  Download,
  Moon,
  Redo2,
  Sun,
  Undo2,
} from 'lucide-react';
import { TextEdit } from '../ui/controls';
import type { Patch } from '../../types/project';
import type { SaveStatus } from '../../features/projects/useProject';

type ToolbarProps = {
  title: string;
  patch: Patch;
  storage: SaveStatus;
  hydrated: boolean;
  locked: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  appearance: 'light' | 'dark';
  toggleAppearance: () => void;
  previewable: boolean;
  preferredFormat?: string;
  download: () => void;
};

export function Toolbar({
  title,
  patch,
  storage,
  hydrated,
  locked,
  canUndo,
  canRedo,
  undo,
  redo,
  appearance,
  toggleAppearance,
  previewable,
  preferredFormat,
  download,
}: ToolbarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">
          <AudioLines size={24} />
        </div>
        <h1>
          VoiceNote <span>Studio</span>
        </h1>
      </div>
      <div className="project-title">
        <TextEdit
          aria-label="Project name"
          disabled={!hydrated}
          maxLength={60}
          value={title}
          onCommit={(title) =>
            patch({ title: title.trim() || 'Untitled reel' })
          }
        />
        <span className={'save-state ' + storage}>
          {storage === 'saved' ? <Check size={13} /> : null}
          {
            {
              loading: 'Opening project',
              saving: 'Saving',
              saved: 'Saved on this device',
              offline: 'Local save unavailable',
            }[storage]
          }
        </span>
      </div>
      <div className="header-actions">
        <button
          className="icon appearance-toggle"
          aria-label="Light workspace"
          aria-pressed={appearance === 'light'}
          title={
            appearance === 'light'
              ? 'Switch to dark workspace'
              : 'Switch to light workspace'
          }
          onClick={toggleAppearance}
        >
          {appearance === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        <button
          className="icon"
          title="Undo"
          aria-label="Undo"
          disabled={locked || !canUndo}
          onClick={undo}
        >
          <Undo2 size={17} />
        </button>
        <button
          className="icon"
          title="Redo"
          aria-label="Redo"
          disabled={locked || !canRedo}
          onClick={redo}
        >
          <Redo2 size={17} />
        </button>
        <button
          className="primary"
          aria-label="Export video"
          title={
            preferredFormat
              ? 'Preferred format: ' + preferredFormat
              : 'Video export is unsupported in this browser'
          }
          disabled={!previewable || !preferredFormat}
          onClick={download}
        >
          <Download size={16} />
          <span>Export video</span>
        </button>
      </div>
    </header>
  );
}
