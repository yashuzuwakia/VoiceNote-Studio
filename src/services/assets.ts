import { audioContext, decodeAudio } from '../engines/audio/graph';
import { createDemo } from '../engines/audio/demo';
import { loadAsset, saveAsset } from './persistence';

const recent = new Map<string, Blob>();
let lastImport: { id: string; buffer: AudioBuffer } | undefined;
let demoBuffer: AudioBuffer | undefined;
export async function keepAsset(blob: Blob, decoded?: AudioBuffer) {
  const id = crypto.randomUUID();
  if (decoded) lastImport = { id, buffer: decoded };
  recent.set(id, blob);
  let saved = true;
  try {
    await saveAsset(id, blob);
  } catch {
    saved = false;
  }
  if (saved) recent.delete(id);
  return { id, saved };
}
export async function asset(id: string) {
  const blob = recent.get(id) ?? (await loadAsset(id));
  if (!blob)
    throw new Error(
      'A local media file is missing. Import it again to recover it.',
    );
  return blob;
}
export async function userAudio(id: string) {
  if (lastImport?.id === id) return lastImport.buffer;
  if (id === 'demo') return (demoBuffer ??= createDemo(audioContext()));
  return decodeAudio(await asset(id));
}
export async function prepareAvatar(file: File) {
  if (file.size > 15 * 1024 * 1024)
    throw new Error('Choose an image under 15 MB.');
  const image = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  try {
    const side = Math.min(image.width, image.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image processing is unavailable.');
    ctx.drawImage(
      image,
      (image.width - side) / 2,
      (image.height - side) / 2,
      side,
      side,
      0,
      0,
      256,
      256,
    );
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('Could not save the profile photo.')),
        'image/png',
      ),
    );
  } finally {
    image.close();
  }
}
