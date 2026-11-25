import { Plus, Trash2 } from 'lucide-react';
import type { Message, Patch, Project } from '../../types/project';
import { Choice, TextEdit } from '../../components/ui/controls';

export function Conversation({
  project,
  patch,
  select,
  selected,
}: {
  project: Project;
  patch: Patch;
  select: (id: string) => void;
  selected: string;
}) {
  const { messages } = project;
  const update = (id: string, delta: Partial<Message>) =>
    patch({
      messages: messages.map((m) => (m.id === id ? { ...m, ...delta } : m)),
    });
  const add = (placement: Message['placement']) => {
    const id = crypto.randomUUID();
    patch({
      messages: [
        ...messages,
        {
          id,
          placement,
          sender: messages.length % 2 ? 'me' : 'them',
          text:
            placement === 'before'
              ? 'wait listen to this 👀'
              : 'omg your voice!! 😭❤️',
        },
      ],
    });
    select(id);
  };
  return (
    <>
      {(['before', 'after'] as const).map((placement) => (
        <div className="script-group" key={placement}>
          <div className="lane-title">
            <span>
              {placement === 'before'
                ? 'Before voice note'
                : 'After voice note'}
            </span>
            <button
              className="icon subtle"
              title={'Add ' + placement + ' message'}
              aria-label={'Add ' + placement + ' message'}
              disabled={messages.length >= 50}
              onClick={() => add(placement)}
            >
              <Plus size={16} />
            </button>
          </div>
          {messages
            .filter((m) => m.placement === placement)
            .map((m, index) => (
              <article
                key={m.id}
                className={'message ' + (selected === m.id ? 'selected' : '')}
                onFocus={() => select(m.id)}
              >
                <div className="message-tools">
                  <button
                    className={'sender ' + m.sender}
                    aria-label={'Switch sender for message ' + (index + 1)}
                    onClick={() =>
                      update(m.id, {
                        sender: m.sender === 'me' ? 'them' : 'me',
                      })
                    }
                  >
                    {m.sender === 'me' ? 'Me' : 'Them'}
                  </button>
                  <Choice
                    value={m.placement}
                    options={[
                      ['before', 'Before audio'],
                      ['after', 'After audio'],
                    ]}
                    onChange={(placement) => update(m.id, { placement })}
                  />
                  <button
                    className="icon subtle delete"
                    aria-label={
                      'Delete ' + placement + ' message ' + (index + 1)
                    }
                    onClick={() =>
                      patch({
                        messages: messages.filter((other) => other.id !== m.id),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <TextEdit
                  aria-label={placement + ' message ' + (index + 1)}
                  maxLength={240}
                  value={m.text}
                  onCommit={(text) => update(m.id, { text })}
                />
              </article>
            ))}
        </div>
      ))}
    </>
  );
}
