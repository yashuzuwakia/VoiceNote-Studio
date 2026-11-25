import {
  Clapperboard,
  Monitor,
  SlidersHorizontal,
  Square,
  Volume2,
  Waves,
} from 'lucide-react';
import { Choice, Field, Section, TextEdit } from '../../components/ui/controls';
import { audition, audioSupported } from '../../engines/audio/graph';
import { formatTime } from '../../engines/timeline/schedule';
import type { Patch, Project } from '../../types/project';
import { AudioPanel } from '../audio/AudioPanel';
import { TemplatePanel } from '../templates/TemplatePanel';
import { ScriptPanel } from './ScriptPanel';
import type { useCapture } from '../audio/useCapture';

export type Tab = 'script' | 'audio' | 'style' | 'scene';
type Props = {
  project: Project;
  patch: Patch;
  locked: boolean;
  tab: Tab;
  setTab: (tab: Tab) => void;
  selected: string;
  select: (id: string) => void;
  peaks: number[];
  resetPlayback: () => void;
  capture: ReturnType<typeof useCapture>;
  report: (error: unknown) => void;
};

export function Settings({
  project,
  patch,
  locked,
  tab,
  setTab,
  selected,
  select,
  peaks,
  resetPlayback,
  capture,
  report,
}: Props) {
  const { mic, micSeconds, busy, importAudio, photo, record } = capture;

  return (
    <aside className="editor panel" aria-label="Project settings">
      <nav className="tabs" aria-label="Editor panels">
        {(
          [
            ['script', 'Script', Clapperboard],
            ['audio', 'Audio', Waves],
            ['style', 'Style', Monitor],
            ['scene', 'Scene', SlidersHorizontal],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            aria-pressed={tab === id}
            data-panel={id}
            key={id}
            onClick={() => setTab(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
      <fieldset disabled={locked} className="panel-body">
        {tab === 'script' && (
          <ScriptPanel
            project={project}
            patch={patch}
            selected={selected}
            select={select}
            resetPlayback={resetPlayback}
          />
        )}
        {tab === 'audio' && (
          <AudioPanel
            project={project}
            patch={patch}
            peaks={peaks}
            resetPlayback={resetPlayback}
            importAudio={importAudio}
            record={record}
          />
        )}
        {tab === 'style' && (
          <TemplatePanel project={project} patch={patch} photo={photo} />
        )}
        {tab === 'scene' && (
          <>
            <Section title="Voice note and caption">
              <Field label="Voice note sender">
                <Choice
                  value={project.voiceSender}
                  options={[
                    ['me', 'Me'],
                    ['them', 'Contact'],
                  ]}
                  onChange={(voiceSender) => patch({ voiceSender })}
                />
              </Field>
              <Field label="Caption">
                <TextEdit
                  value={project.overlayCaption}
                  maxLength={110}
                  onCommit={(overlayCaption) => patch({ overlayCaption })}
                  placeholder="Add a hook"
                  disabled={project.frameStyle === 'fullscreen'}
                />
              </Field>
              <label className="switch">
                <span>Heart reaction</span>
                <input
                  type="checkbox"
                  checked={project.heartReaction}
                  onChange={(e) => patch({ heartReaction: e.target.checked })}
                />
              </label>
            </Section>
            <Section title="Sound design">
              <label className="switch">
                <span>Message sounds</span>
                <input
                  type="checkbox"
                  checked={project.msgSfxEnabled}
                  onChange={(e) => patch({ msgSfxEnabled: e.target.checked })}
                />
              </label>
              <Field label="Message tone">
                <Choice
                  disabled={!project.msgSfxEnabled}
                  value={project.msgSfxStyle}
                  options={[
                    ['pop', 'Soft bubble pop'],
                    ['chime', 'Glass chime'],
                    ['whatsapp', 'Classic chat tone'],
                  ]}
                  onChange={(msgSfxStyle) => patch({ msgSfxStyle })}
                />
              </Field>
              <button
                disabled={!project.msgSfxEnabled || !audioSupported()}
                onClick={() => audition(project.msgSfxStyle).catch(report)}
              >
                <Volume2 size={15} /> Audition tone
              </button>
              <label className="switch">
                <span>Music while texting</span>
                <input
                  type="checkbox"
                  checked={project.chatBgMusicEnabled}
                  onChange={(e) =>
                    patch({ chatBgMusicEnabled: e.target.checked })
                  }
                />
              </label>
              <Field label="Music style">
                <Choice
                  disabled={!project.chatBgMusicEnabled}
                  value={project.chatBgMusicStyle}
                  options={[
                    ['lofi', 'Lo-fi Rhodes'],
                    ['musicbox', 'Dreamy music box'],
                  ]}
                  onChange={(chatBgMusicStyle) => patch({ chatBgMusicStyle })}
                />
              </Field>
            </Section>
          </>
        )}
      </fieldset>
      {mic && (
        <div className="record-bar" role="status">
          <span className="record-dot" />
          <code>{formatTime(micSeconds)}</code>
          <button onClick={() => mic.stop()}>
            <Square size={14} /> Stop recording
          </button>
        </div>
      )}
      {busy && (
        <p className="panel-status" role="status">
          {
            {
              audio: 'Decoding audio…',
              photo: 'Preparing photo…',
              mic: 'Waiting for microphone access…',
            }[busy]
          }
        </p>
      )}
    </aside>
  );
}
