import { useEffect } from 'react';
import type { usePlayback } from './usePlayback';

export function useShortcuts(
  locked: boolean,
  previewable: boolean,
  transport: ReturnType<typeof usePlayback>,
  undo: () => void,
  redo: () => void,
) {
  useEffect(() => {
    function shortcuts(event: KeyboardEvent) {
      if (
        locked ||
        (event.target instanceof HTMLElement &&
          (event.target.matches('input,select,textarea,button') ||
            event.target.isContentEditable))
      )
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (event.code === 'Space' && previewable) {
        event.preventDefault();
        if (transport.playing) transport.stop();
        else void transport.play();
      }
    }
    window.addEventListener('keydown', shortcuts);
    return () => window.removeEventListener('keydown', shortcuts);
  }, [locked, undo, redo, previewable, transport]);
}
