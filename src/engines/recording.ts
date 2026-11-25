import {MAX_AUDIO_SECONDS,microphoneSupported} from './audio';
export async function startMic() {
  if (!microphoneSupported()) throw new Error('Microphone recording requires a supported browser on localhost or HTTPS.');
  const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  const release=()=>stream.getTracks().forEach(track=>track.stop());
  try {
    const recorder=new MediaRecorder(stream);
    const chunks:Blob[]=[];
    let timer:ReturnType<typeof setTimeout>;
    const stop=()=>{if (recorder.state!=='inactive') recorder.stop();};
    const result=new Promise<Blob>((resolve,reject)=>{
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder.onstop=()=>{
        clearTimeout(timer);
        release();
        if (chunks.length) resolve(new Blob(chunks,{type:recorder.mimeType||chunks[0].type}));
        else reject(new Error('No sound was captured. Try recording again.'));
      };
      recorder.onerror=()=>{
        clearTimeout(timer);
        release();
        reject(new Error('Recording stopped unexpectedly. Check your microphone and try again.'));
      };
    });
    recorder.start(250);
    timer=setTimeout(stop,(MAX_AUDIO_SECONDS-1)*1000);
    return {stop,result};
  } catch (error) {
    release();
    throw error;
  }
}
