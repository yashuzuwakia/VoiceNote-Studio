import {useEffect,useState} from 'react';
import {audioContext,decodeAudio} from './engines/audio';
import {createDemo} from './engines/demo';
import type {Artwork} from './engines/renderer';
import {loadAsset,saveAsset} from './persistence';
import type {Person,Project} from './model';

const recent = new Map<string,Blob>();
let demoBuffer:AudioBuffer|undefined;
export async function keepAsset(blob:Blob) {
  const id=crypto.randomUUID();
  recent.set(id,blob);
  let saved=true;
  try { await saveAsset(id,blob); } catch { saved=false; }
  if (saved) recent.delete(id);
  return {id,saved};
}
async function asset(id:string){
  const blob=recent.get(id)??await loadAsset(id);
  if (!blob) throw new Error('A local media file is missing. Import it again to recover it.');
  return blob;
}
async function userAudio(id:string) {
  if(id==='demo') return demoBuffer??=createDemo(audioContext());
  return decodeAudio(await asset(id));
}
export async function prepareAvatar(file:File) {
  if (file.size>15*1024*1024) throw new Error('Choose an image under 15 MB.');
  const image=await createImageBitmap(file);
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=256;
  try {
    const side=Math.min(image.width,image.height);
    const ctx=canvas.getContext('2d');
    if (!ctx) throw new Error('Image processing is unavailable.');
    ctx.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,256,256);
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not save the profile photo.')),'image/png'));
  } finally {image.close();}
}
export function useMedia(project:Project, imported:Map<string,AudioBuffer>) {
  const id=project.audio.id, me=project.avatars.me.asset, them=project.avatars.them.asset;
  const [audio,setAudio]=useState<{id:string;buffer?:AudioBuffer;error?:string}>();
  const [images,setImages]=useState<{me?:string;them?:string;artwork:Artwork;error?:string}>();
  useEffect(()=>{
    let active=true;
    const loaded=imported.get(id);
    (loaded?Promise.resolve(loaded):userAudio(id)).then(
      buffer=>{if(active)setAudio({id,buffer});},
      error=>{if(active)setAudio({id,error:error.message});}
    );
    return ()=>{active=false;};
  },[id,imported]);
  useEffect(()=>{
    let active=true;
    const artwork:Artwork={};
    const bitmaps:ImageBitmap[]=[];
    void Promise.allSettled(([[me,'me'],[them,'them']] as const).map(async ([assetId,person])=>{
      if (!assetId) return;
      const bitmap=await createImageBitmap(await asset(assetId));
      if (!active) {bitmap.close();return;}
      bitmaps.push(bitmap);
      artwork[person as Person]=bitmap;
    })).then(results=>{
      if(active)setImages({me,them,artwork,error:results.some(r=>r.status==='rejected')?'A profile photo could not be loaded. Its preset color will be used.':undefined});
    });
    return ()=>{active=false;bitmaps.forEach(bitmap=>bitmap.close());};
  },[me,them]);
  const artReady=Boolean(images && images.me===me && images.them===them);
  return {buffer:audio?.id===id?audio.buffer:undefined, audioError:audio?.id===id?audio.error:undefined,
    artwork:artReady?images!.artwork:{}, artReady, artError:artReady?images?.error:undefined};
}
