import { useEffect, useState } from 'react';
import type { Artwork } from '../engines/renderer/renderFrame';
import type { Project } from '../types/project';
import { asset, userAudio } from '../services/assets';

const emptyArtwork: Artwork = {};

export function useMedia(project: Project) {
  const id = project.audio.id,
    me = project.avatars.me.asset,
    them = project.avatars.them.asset;
  const [audio, setAudio] = useState<{
    id: string;
    buffer?: AudioBuffer;
    error?: string;
  }>();
  const [images, setImages] = useState<{
    me?: string;
    them?: string;
    artwork: Artwork;
    error?: string;
  }>();
  useEffect(() => {
    let active = true;
    userAudio(id).then(
      (buffer) => {
        if (active) setAudio({ id, buffer });
      },
      (error) => {
        if (active) setAudio({ id, error: error.message });
      },
    );
    return () => {
      active = false;
    };
  }, [id]);
  useEffect(() => {
    let active = true;
    const artwork: Artwork = {};
    const bitmaps: ImageBitmap[] = [];
    void Promise.allSettled(
      (
        [
          [me, 'me'],
          [them, 'them'],
        ] as const
      ).map(async ([assetId, person]) => {
        if (!assetId) return;
        const bitmap = await createImageBitmap(await asset(assetId));
        if (!active) {
          bitmap.close();
          return;
        }
        bitmaps.push(bitmap);
        artwork[person] = bitmap;
      }),
    ).then((results) => {
      if (active)
        setImages({
          me,
          them,
          artwork,
          error: results.some((r) => r.status === 'rejected')
            ? 'A profile photo could not be loaded. Its preset color will be used.'
            : undefined,
        });
    });
    return () => {
      active = false;
      bitmaps.forEach((bitmap) => bitmap.close());
    };
  }, [me, them]);
  const artReady = Boolean(images && images.me === me && images.them === them);
  return {
    buffer: audio?.id === id ? audio.buffer : undefined,
    audioError: audio?.id === id ? audio.error : undefined,
    artwork: artReady ? images!.artwork : emptyArtwork,
    artReady,
    artError: artReady ? images?.error : undefined,
  };
}
