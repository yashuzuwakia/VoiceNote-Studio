import { ChevronDown } from 'lucide-react';
import { presets } from '../projects/model';
import type { Patch, Project } from '../../types/project';
import { Section } from '../../components/ui/controls';
import { Conversation } from './Conversation';

type Props = {
  project: Project;
  patch: Patch;
  select: (id: string) => void;
  selected: string;
  resetPlayback: () => void;
};

export function ScriptPanel({
  project,
  patch,
  select,
  selected,
  resetPlayback,
}: Props) {
  return (
    <>
      <Section title="Story preset">
        <div className="select-shell">
          <select
            aria-label="Story preset"
            value=""
            onChange={(e) => {
              patch(presets[e.target.value as keyof typeof presets]);
              select('');
              resetPlayback();
            }}
          >
            <option value="" disabled>
              Choose a story preset
            </option>
            {Object.keys(presets).map((key) => (
              <option key={key}>{key}</option>
            ))}
          </select>
          <ChevronDown size={14} />
        </div>
      </Section>
      <Section title="Conversation">
        <Conversation
          project={project}
          patch={patch}
          select={select}
          selected={selected}
        />
      </Section>
    </>
  );
}
