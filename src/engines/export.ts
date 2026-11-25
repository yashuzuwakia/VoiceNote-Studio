import type {Project} from '../model';
import {audioSupported, readyAudio, scheduleAudio} from './audio';
import {HEIGHT,WIDTH,renderFrame,type Artwork} from './renderer';
import type {Schedule} from './timeline';

const types=['video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
export function exportFormats(){
  if (!audioSupported() || !window.MediaRecorder || !window.MediaStream || !HTMLCanvasElement.prototype.captureStream) return [];
  return types.filter(type=>MediaRecorder.isTypeSupported(type));
}
export function extension(mime:string) {
  const container=mime.split(';')[0].toLowerCase();
  if (container==='video/mp4') return 'mp4';
  if (container==='video/webm') return 'webm';
  throw new Error('The browser returned an unrecognized video format.');
}
export async function exportVideo(project:Project, score:Schedule, buffer:AudioBuffer, peaks:number[], artwork:Artwork, signal:AbortSignal, progress:(ratio:number)=>void) {
  const formats=exportFormats();
  if (!formats.length) throw new Error('This browser cannot export canvas video with audio. Try current Chrome or Edge.');
  const audio=await readyAudio();
  signal.throwIfAborted();
  if (document.hidden) throw new Error('Keep this tab visible during video export.');
  const canvas=document.createElement('canvas');
  canvas.width=WIDTH;canvas.height=HEIGHT;
  renderFrame(canvas,project,score,peaks,artwork,0);
  const video=canvas.captureStream(30);
  let destination:MediaStreamAudioDestinationNode|undefined;
  let recorder:MediaRecorder|undefined;
  let stopAudio:(()=>void)|undefined;
  let frame=0;
  let stopTimeout:number|undefined;
  let interrupt=()=>{};
  try {
    destination=audio.createMediaStreamDestination();
    const stream=new MediaStream([...video.getVideoTracks(),...destination.stream.getAudioTracks()]);
    for (const mimeType of formats) {
      try {
        const candidate=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:5_000_000});
        candidate.start(250);
        recorder=candidate;
        break;
      } catch { /* A reported codec can still fail to initialize. */ }
    }
    if (!recorder) throw new Error('The browser could not start a supported video encoder.');
    const encoder=recorder;
    const chunks:Blob[]=[];
    const blob=await new Promise<Blob>((resolve,reject)=>{
      interrupt=()=>reject(signal.reason ?? new Error('The tab was hidden. Keep it visible and export again.'));
      const anchor=audio.currentTime+.07;
      encoder.ondataavailable=event=>{if (event.data.size) chunks.push(event.data);};
      encoder.onerror=()=>reject(new Error('The video encoder stopped unexpectedly.'));
      encoder.onstop=()=>{
        if (!chunks.length) reject(new Error('The encoder returned an empty video.'));
        else resolve(new Blob(chunks,{type:chunks[0].type||encoder.mimeType}));
      };
      signal.addEventListener('abort',interrupt,{once:true});
      document.addEventListener('visibilitychange',onVisibility);
      stopAudio=scheduleAudio(audio,destination!,project,score,buffer,0,anchor);
      const tick=()=>{
        try {
          if (audio.state!=='running') throw new Error('The audio device interrupted the export.');
          const t=Math.max(0,Math.min(score.total,audio.currentTime-anchor));
          renderFrame(canvas,project,score,peaks,artwork,t);
          progress(t/score.total);
          if (t<score.total) frame=requestAnimationFrame(tick);
          else {
            stopTimeout=window.setTimeout(()=>reject(new Error('The video encoder did not finish in time.')),10000);
            frame=requestAnimationFrame(()=>{
              if (encoder.state!=='inactive') encoder.stop();
            });
          }
        } catch(error){reject(error);}
      };
      frame=requestAnimationFrame(tick);
    });
    return {blob,extension:extension(blob.type)};
  } finally {
    signal.removeEventListener('abort',interrupt);
    document.removeEventListener('visibilitychange',onVisibility);
    cancelAnimationFrame(frame);
    window.clearTimeout(stopTimeout);
    stopAudio?.();
    if (recorder && recorder.state!=='inactive') recorder.stop();
    for (const track of [...video.getTracks(),...(destination?.stream.getTracks()??[])]) track.stop();
  }
  function onVisibility() {if (document.hidden) interrupt();}
}
