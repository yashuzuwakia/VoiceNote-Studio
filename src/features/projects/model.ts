import type { Message, Person, Project } from '../../types/project';

export const demo = { id: 'demo', name: 'Acoustic melody', duration: 14 };
function story(
  contactName: string,
  overlayCaption: string,
  rows: [Person, string, Message['placement']][],
): Pick<
  Project,
  'contactName' | 'overlayCaption' | 'messages' | 'voiceSender'
> {
  return {
    contactName,
    overlayCaption,
    voiceSender: 'me',
    messages: rows.map(([sender, text, placement], i) => ({
      id: String(i),
      sender,
      text,
      placement,
    })),
  };
}
export const presets = {
  'Crush cover': story(
    'Crush 💫',
    'pov: sending my crush a song instead of confessing 🙈',
    [
      ['them', 'you said you had something to tell me?', 'before'],
      ['me', 'ok listen to this before i overthink it 😭', 'before'],
      ['them', 'WAIT IS THAT YOUR VOICE?! 🥹❤️', 'after'],
    ],
  ),
  '2AM rough draft': story(
    'Late Night Studio 🌙',
    '2am vocal take i almost deleted...',
    [
      ['me', 'recorded this at 2am in my closet lol', 'before'],
      ['them', 'send it rn i wanna hear!!', 'before'],
      ['them', 'goosebumps literally everywhere 😭🎶', 'after'],
    ],
  ),
  'Should I post this?': story(
    'Bestie 🤍',
    'be honest... should i post this cover? 🎤',
    [
      ['me', 'be brutally honest should i post this?', 'before'],
      ['them', 'if you don’t post this i will 😭🔥', 'after'],
    ],
  ),
};
export const initialProject: Project = {
  ...story('Bestie 🤍', 'pov: you finally sent the voice note 🙈🎶', [
    ['them', 'wait did you finally record that cover?? 👀', 'before'],
    ['me', 'im literally so nervous don’t judge pls 🙈', 'before'],
    ['them', 'OMG CHILLS 😭😭 post this right now!!', 'after'],
  ]),
  title: 'Untitled reel',
  platform: 'whatsapp',
  theme: 'dark',
  frameStyle: 'floating',
  backdrop: 'midnight',
  contactStatus: 'online',
  myName: 'Me 🎤',
  avatars: { me: { palette: 2 }, them: { palette: 0 } },
  heartReaction: true,
  msgSfxEnabled: true,
  msgSfxStyle: 'pop',
  chatBgMusicEnabled: false,
  chatBgMusicStyle: 'lofi',
  audio: demo,
  trimStart: 0,
  trimEnd: demo.duration,
};
