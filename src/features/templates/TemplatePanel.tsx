import { Choice, Field, Section } from '../../components/ui/controls';
import type { Patch, Person, Project } from '../../types/project';
import { Profile } from './Profile';

type Props = {
  project: Project;
  patch: Patch;
  photo: (file: File, person: Person) => Promise<void>;
};

export function TemplatePanel({ project, patch, photo }: Props) {
  const platform = (value: Project['platform']) => {
    const defaultStatus =
      project.contactStatus === 'online' ||
      project.contactStatus === 'Active now';
    patch({
      platform: value,
      contactStatus: defaultStatus
        ? value === 'whatsapp'
          ? 'online'
          : 'Active now'
        : project.contactStatus,
    });
  };

  return (
    <>
      <Section title="Chat template">
        <div className="segmented">
          <button
            aria-pressed={project.platform === 'whatsapp'}
            onClick={() => platform('whatsapp')}
          >
            WhatsApp
          </button>
          <button
            aria-pressed={project.platform === 'instagram'}
            onClick={() => platform('instagram')}
          >
            Instagram DM
          </button>
        </div>
        <Field label="Theme">
          <Choice
            value={project.theme}
            options={[
              ['dark', 'Dark'],
              ['light', 'Light'],
            ]}
            onChange={(theme) => patch({ theme })}
          />
        </Field>
        <Field label="Frame">
          <Choice
            value={project.frameStyle}
            options={[
              ['floating', 'Floating phone'],
              ['fullscreen', 'Edge-to-edge'],
            ]}
            onChange={(frameStyle) => patch({ frameStyle })}
          />
        </Field>
        <Field label="Backdrop">
          <Choice
            disabled={project.frameStyle === 'fullscreen'}
            value={project.backdrop}
            options={[
              ['midnight', 'Midnight glow'],
              ['sunset', 'Golden hour'],
              ['emerald', 'Studio emerald'],
              ['minimal', 'Matte charcoal'],
            ]}
            onChange={(backdrop) => patch({ backdrop })}
          />
        </Field>
      </Section>
      <Section title="Contact profile">
        <Profile
          project={project}
          person="them"
          patch={patch}
          onPhoto={(file, person) => void photo(file, person)}
        />
      </Section>
      <Section title="Your profile">
        <Profile
          project={project}
          person="me"
          patch={patch}
          onPhoto={(file, person) => void photo(file, person)}
        />
      </Section>
    </>
  );
}
