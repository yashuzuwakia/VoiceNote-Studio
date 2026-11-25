import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadProject, saveProject } from '../../services/persistence';
import { change, hydrate, redo, undo, type EditorState } from './store';
import type { Patch } from '../../types/project';

export type SaveStatus = 'loading' | 'saving' | 'saved' | 'offline';

export function useProject(report: (error: unknown) => void) {
  const {
    present: project,
    past,
    future,
  } = useSelector((state: EditorState) => state);
  const dispatch = useDispatch();
  const [storage, setStorage] = useState<SaveStatus>('loading');
  const [hydrated, setHydrated] = useState(false);
  const patch: Patch = useCallback(
    (values) => dispatch(change(values)),
    [dispatch],
  );
  const undoEdit = useCallback(() => dispatch(undo()), [dispatch]);
  const redoEdit = useCallback(() => dispatch(redo()), [dispatch]);

  useEffect(() => {
    let current = true;
    loadProject()
      .then((loaded) => {
        if (loaded && current) dispatch(hydrate(loaded));
      })
      .catch((error) => {
        if (current) report(error);
      })
      .finally(() => {
        if (current) setHydrated(true);
      });
    return () => {
      current = false;
    };
  }, [dispatch, report]);
  useEffect(() => {
    if (!hydrated) return;
    let current = true;
    setStorage('saving');
    saveProject(project).then(
      () => {
        if (current) setStorage('saved');
      },
      () => {
        if (current) setStorage('offline');
      },
    );
    return () => {
      current = false;
    };
  }, [project, hydrated]);

  return {
    project,
    patch,
    storage,
    hydrated,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo: undoEdit,
    redo: redoEdit,
  };
}
