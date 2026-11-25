# Architecture

See the [source file reference](module-reference.md) for individual responsibilities and common change paths.

| Directory | Responsibility |
| --- | --- |
| `src/app/` | Vite entry point, Redux provider, workspace composition, and global theme styles. |
| `src/components/ui/` | Shared inputs, buttons, sections, and waveform presentation. |
| `src/components/layout/` | The studio toolbar and its global controls. |
| `src/features/editor/` | Conversation editing, preview rendering, playback, settings tabs, and keyboard shortcuts. |
| `src/features/timeline/` | Interactive timeline tracks, clip selection, and seeking. |
| `src/features/audio/` | Upload, microphone recording, and trim controls. |
| `src/features/templates/` | Chat style and profile editing. |
| `src/features/projects/` | Project schema, Redux history, and the autosave lifecycle. |
| `src/features/export/` | Export progress, cancellation, and download. |
| `src/engines/` | Canvas renderer, Web Audio, timeline scheduling, and MediaRecorder encoding. The engines have no React or Redux dependency. |
| `src/hooks/` | Workspace appearance and loading media referenced by the active project. |
| `src/services/` | IndexedDB access and asset preparation and caching. |
| `src/types/` | Shared serializable project types used by features and engines. |
| `tests/` | Vitest tests for schedule, waveform, history, and export primitives. |

The workspace compiles the current project and trim bounds into a timeline schedule. The timeline display, audio scheduling, preview renderer, and export engine consume the same schedule. Preview and export both draw 720 × 1280 frames through the same renderer and derive frame time from the Web Audio clock. The exporter combines the 30 fps canvas stream and audio mix through the browser's MediaRecorder.

Redux holds settings, messages, asset IDs, and up to 60 undo snapshots. A preset or an audio replacement is one undo step. IndexedDB keeps the active project and its blobs in separate object stores. Decoded buffers, image bitmaps, and active streams remain in the media layer. Reloading restores the saved project and assets and starts a fresh undo history.
