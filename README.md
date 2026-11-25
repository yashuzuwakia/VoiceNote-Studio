# VoiceNote Studio

Create 9:16 chat videos around a voice note. Edit the conversation, import or record audio, trim the take, and download a 720 × 1280 video with synchronized sound. The starter project includes a synthesized melody and a sample conversation.

## Run locally

Use Node.js 22 and npm. From this directory, run:

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. Chrome or Edge is recommended for recording and export. Use localhost or HTTPS for microphone permission.

```sh
npm test
npm run build
npm run preview
```

## Edit a reel

1. Choose a story preset or edit the messages in **Script**. Place messages before or after the voice note and switch their sender.
2. In **Audio**, upload a track, record a microphone take, or use the demo. Adjust **Trim in** and **Trim out**, then jump to the clip in the timeline.
3. In **Style**, choose the chat template, light or dark theme, framing, backdrop, and avatars. The **Scene** tab controls the voice-note sender, floating-frame caption, heart reaction, and sound effects.
4. Click the timeline ruler to seek or click a clip to jump to it. Use the preview controls to play, pause, or restart. Text edits commit on Enter or when you leave the field. Escape discards a text edit.
5. With the preview tab visible, choose **Export video**. The browser records the canvas and mixed audio in real time, with MP4 preferred where available and a correctly named WebM fallback. The export can be canceled.

Use the sun or moon button in the header to change the workspace appearance. The editor remembers your choice in this browser. Use **Style** to set the chat theme for the video.

Space toggles playback when focus is outside a control. Ctrl/Cmd+Z undoes a project edit and Ctrl/Cmd+Shift+Z redoes it. The header buttons work from anywhere in the editor.

## Architecture

- **React and TypeScript** own the editing workspace. Components send project edits to Redux Toolkit and pass playback position and media separately.
- **Redux Toolkit** holds serializable settings, conversation data, media IDs, trim bounds, and 60 in-session history snapshots. A preset or audio replacement is a single undo step. Binary media and browser objects live outside Redux.
- **Timeline engine** (`src/engines/timeline.ts`) compiles story order and trim bounds into one schedule. Preview, timeline tracks, audio, and export consume that schedule.
- **Canvas renderer** (`src/engines/renderer.ts`) ports the prototype's chat visuals. It draws a 720 × 1280 frame for an explicit time. Both preview and export call the same renderer.
- **Audio engine** (`src/engines/audio.ts`) decodes clips, extracts waveform peaks, and schedules voice, synthesized message sounds, and optional music against the Web Audio clock. Preview and export derive their frame time from that clock. The microphone recorder owns its stream and releases the tracks when it finishes.
- **Export engine** (`src/engines/export.ts`) combines an isolated 30 fps canvas stream and a Web Audio mix in the browser's MediaRecorder. It picks an available container and cleans up streams after completion, cancellation, or failure.
- **IndexedDB** stores the active project and media blobs in separate object stores. Reloading restores project content and assets. Blobs are kept so undo can revisit earlier imports in the same session.

## Scope and limitations

- The template drawings retain the original prototype's floating and edge-to-edge chat styles. They are rendered mock conversations for video creation.
- The timeline supports scrubbing and clip navigation. Message timing follows the prototype's automatic before/after cadence. Freeform clip placement, multiple audio tracks, and independent timing per message are outside this version.
- Audio uploads are limited to 60 MB and five minutes. The browser's available decoders determine which file formats work. Recording requires permission and a working input device.
- Native video codec support varies by browser and operating system. Export takes approximately the video duration and requires a visible tab. WebM playback or import support varies across destination apps.
- The editor saves one active project per browser origin. Undo history resets on reload. Clearing site data removes saved files. Old imported assets accumulate in local storage until site data is cleared.
- AI integration and cloud storage are deferred. Processing runs locally and requires no account or API key.

## Test coverage

Vitest covers schedule boundaries, short clips and trim clamping, history branching and hydration, waveform extraction, and correct container extensions. For a hardware smoke test, grant microphone access, record a short take, trim it, play from the middle, export it, then confirm the file has moving frames and audible voice in a local media player. Reload the same origin and check that the clip and edits survive.
