import type { Person, Patch, Project } from '../../types/project';
import { palettes } from '../../engines/renderer/avatarPalettes';
import { Field, FileButton, TextEdit } from '../../components/ui/controls';

export function Profile({
  project,
  person,
  patch,
  onPhoto,
}: {
  project: Project;
  person: Person;
  patch: Patch;
  onPhoto: (file: File, person: Person) => void;
}) {
  const me = person === 'me';
  const avatar = project.avatars[person];
  return (
    <div className="profile">
      <Field label={me ? 'Your display name' : 'Contact name'}>
        <TextEdit
          maxLength={40}
          value={me ? project.myName : project.contactName}
          onCommit={(value) =>
            patch(me ? { myName: value } : { contactName: value })
          }
        />
      </Field>
      {!me && (
        <Field label="Contact status">
          <TextEdit
            maxLength={40}
            value={project.contactStatus}
            onCommit={(contactStatus) => patch({ contactStatus })}
          />
        </Field>
      )}
      <div className="swatches">
        {palettes.map(([from, to], palette) => (
          <button
            type="button"
            className="swatch"
            key={from}
            style={{ background: `linear-gradient(135deg,${from},${to})` }}
            aria-label={
              (me ? 'Your' : 'Contact') +
              ' ' +
              ['sunset', 'ocean', 'sage', 'berry'][palette] +
              ' avatar'
            }
            aria-pressed={!avatar.asset && avatar.palette === palette}
            onClick={() =>
              patch({ avatars: { ...project.avatars, [person]: { palette } } })
            }
          />
        ))}
        <FileButton
          accept="image/*"
          label="Photo"
          onFile={(file) => onPhoto(file, person)}
        />
      </div>
    </div>
  );
}
