# Source file responsibilities

Start with [Architecture](architecture.md) for the overall design and [README](../README.md) for setup.

## App and shared controls

| File | Owns |
| --- | --- |
| [app/main.tsx](../src/app/main.tsx) | Mounts React, provides the Redux store, and loads the workspace styles. |
| [app/Workspace.tsx](../src/app/Workspace.tsx) | Connects project state, loaded media, playback, and export to the interface. Owns selection, active tab, and notifications. |
| [app/styles/base.css](../src/app/styles/base.css) | Defines the editor layout, component styles, and mobile breakpoints. |
| [app/styles/light.css](../src/app/styles/light.css) | Defines the light workspace surfaces and control colors. |
| [app/styles/palette.css](../src/app/styles/palette.css) | Defines the accent colors for tabs, playback, and timeline tracks in both themes. |
| [components/layout/Toolbar.tsx](../src/components/layout/Toolbar.tsx) | Renders project naming, save status, appearance, history, and export controls. |
| [components/ui/controls.tsx](../src/components/ui/controls.tsx) | Provides sections, fields, select menus, file inputs, waveform bars, and text inputs that commit on blur or Enter. |

## Editor features

| File | Owns |
| --- | --- |
| [features/editor/Settings.tsx](../src/features/editor/Settings.tsx) | Hosts the editing tabs, scene and sound controls, and capture status. |
| [features/editor/ScriptPanel.tsx](../src/features/editor/ScriptPanel.tsx) | Applies a story preset and displays the conversation editor. |
| [features/editor/Conversation.tsx](../src/features/editor/Conversation.tsx) | Creates, edits, moves, and removes messages through project patches. |
| [features/editor/Preview.tsx](../src/features/editor/Preview.tsx) | Draws frames to the preview canvas and displays transport and export progress. |
| [features/editor/usePlayback.ts](../src/features/editor/usePlayback.ts) | Starts, stops, and seeks preview audio, and supplies the current playhead time. |
| [features/editor/useShortcuts.ts](../src/features/editor/useShortcuts.ts) | Handles playback, undo, and redo keyboard shortcuts outside editing controls. |
| [features/timeline/Timeline.tsx](../src/features/timeline/Timeline.tsx) | Renders scheduled clips, the playhead, and waveform. Sends seek and selection events to the workspace. |
| [features/audio/AudioPanel.tsx](../src/features/audio/AudioPanel.tsx) | Presents upload, record, and demo audio actions. |
| [features/audio/ClipControls.tsx](../src/features/audio/ClipControls.tsx) | Shows the clip waveform and commits trim changes as project edits. |
| [features/audio/useCapture.ts](../src/features/audio/useCapture.ts) | Runs audio imports, microphone capture, and profile photo imports, then commits their asset IDs. |
| [features/templates/TemplatePanel.tsx](../src/features/templates/TemplatePanel.tsx) | Edits the chat platform, theme, frame, and backdrop. |
| [features/templates/Profile.tsx](../src/features/templates/Profile.tsx) | Edits names, contact status, avatar palettes, and profile photos. |
| [features/export/useExport.ts](../src/features/export/useExport.ts) | Starts export from a project snapshot, exposes progress and cancellation, and downloads the encoded file. |
| [features/projects/model.ts](../src/features/projects/model.ts) | Defines the starter project, demo track metadata, and story presets. |
| [features/projects/store.ts](../src/features/projects/store.ts) | Applies project patches, hydrates saved state, and manages bounded undo and redo history. |
| [features/projects/useProject.ts](../src/features/projects/useProject.ts) | Connects React to project actions, initial loading, and autosave status. |

## Engines, browser services, and types

| File | Owns |
| --- | --- |
| [engines/timeline/schedule.ts](../src/engines/timeline/schedule.ts) | Converts message order and trim bounds into timestamps, clamps trim points, and formats time labels. |
| [engines/renderer/renderFrame.ts](../src/engines/renderer/renderFrame.ts) | Draws one timed chat frame for both preview and export. |
| [engines/renderer/avatarPalettes.ts](../src/engines/renderer/avatarPalettes.ts) | Shares avatar gradient colors between the profile picker and the renderer. |
| [engines/audio/graph.ts](../src/engines/audio/graph.ts) | Decodes audio, extracts waveform peaks, and schedules voice, message sounds, and music against the audio clock. |
| [engines/audio/demo.ts](../src/engines/audio/demo.ts) | Synthesizes the demo melody. |
| [engines/audio/recording.ts](../src/engines/audio/recording.ts) | Opens the microphone stream, records it, and releases the device. |
| [engines/encoder/exportVideo.ts](../src/engines/encoder/exportVideo.ts) | Selects a supported codec, captures canvas and mixed audio, and returns an MP4 or WebM blob. |
| [services/persistence.ts](../src/services/persistence.ts) | Runs IndexedDB transactions for project metadata and media blobs. |
| [services/assets.ts](../src/services/assets.ts) | Resolves media IDs, caches the latest decoded audio import, and prepares avatar images. |
| [hooks/useMedia.ts](../src/hooks/useMedia.ts) | Loads active audio and avatar assets and releases image bitmaps when they are replaced. |
| [hooks/useAppearance.ts](../src/hooks/useAppearance.ts) | Reads and saves the workspace theme preference. |
| [types/project.ts](../src/types/project.ts) | Defines the serializable project, messages, avatar references, and edit patches. |
| [tests/editor.test.ts](../tests/editor.test.ts) | Checks schedule timing, trim bounds, history, waveform peaks, and export file extensions. |

## Where to make a change

- **Change when messages appear.** Edit the timeline engine and update its tests. Preview playback and export both read its timestamps.
- **Change a chat bubble or avatar drawing.** Edit the canvas renderer. Inspect a frame in preview and export to check the result.
- **Add a saved project setting.** Update the shared project type, supply a default for new and already-saved projects, and wire the setting into the relevant feature.
- **Change recording or encoding behavior.** Make the change in the corresponding engine. Keep permission, progress, and error presentation in the feature hook or panel.
- **Change the workspace layout or colors.** Start in the app styles. The video canvas has its own renderer and chat theme.
