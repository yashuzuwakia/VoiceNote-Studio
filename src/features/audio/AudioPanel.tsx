import { Headphones, Mic } from 'lucide-react';
import { audioSupported, microphoneSupported } from '../../engines/audio/graph';
import { demo } from '../projects/model';
import type { Patch, Project } from '../../types/project';
import { FileButton, Section } from '../../components/ui/controls';
import { ClipControls } from './ClipControls';

type Props = {
  project: Project;
  patch: Patch;
  peaks: number[];
  importAudio: (file: File, name: string) => Promise<void>;
  record: () => Promise<void>;
  resetPlayback: () => void;
};

export function AudioPanel({
  project,
  patch,
  peaks,
  importAudio,
  record,
  resetPlayback,
}: Props) {
  return (
    <>
      <Section title="Voice note">
        <div className="button-row">
          <FileButton
            label="Upload audio"
            accept="audio/*,.wav,.mp3,.m4a"
            disabled={!audioSupported()}
            onFile={(file) => void importAudio(file, file.name)}
          />
          <button
            disabled={!microphoneSupported()}
            onClick={() => void record()}
          >
            <Mic size={15} />
            Record mic
          </button>
        </div>
        {!microphoneSupported() && (
          <p className="muted">
            Microphone recording requires localhost or HTTPS and a compatible
            browser.
          </p>
        )}
        <button
          className="demo-button"
          onClick={() => {
            patch({ audio: demo, trimStart: 0, trimEnd: demo.duration });
            resetPlayback();
          }}
        >
          <Headphones size={14} /> Use demo track
        </button>
      </Section>
      <Section title="Trim audio">
        <ClipControls project={project} patch={patch} peaks={peaks} />
      </Section>
    </>
  );
}
