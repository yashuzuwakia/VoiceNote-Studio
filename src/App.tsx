import {useEffect,useMemo,useRef,useState} from 'react';
import {useDispatch,useSelector} from 'react-redux';
import {AudioLines, Check, ChevronDown, CircleAlert, Clapperboard, Download, Headphones, Mic, Monitor, Moon, Pause, Play, Redo2, RotateCcw, SlidersHorizontal, Square, Sun, Undo2, Volume2, Waves} from 'lucide-react';
import {Choice, ClipControls, Field, FileButton, Profile, Script, Section, TextEdit, Timeline} from './components';
import {audition, audioSupported, decodeAudio, microphoneSupported, waveform} from './engines/audio';
import {exportFormats, exportVideo, extension} from './engines/export';
import {startMic} from './engines/recording';
import {HEIGHT,WIDTH,renderFrame} from './engines/renderer';
import {formatTime,timeline} from './engines/timeline';
import {demo,presets,type Person,type Project} from './model';
import {loadProject,saveProject} from './persistence';
import {change,hydrate,redo,undo,type EditorState} from './store';
import {keepAsset,prepareAvatar,useMedia} from './useMedia';
import {usePlayback} from './usePlayback';

const emptyPeaks=Array<number>(34).fill(.2);
const message=(error:unknown)=>error instanceof Error?error.message:String(error);
type Tab='script'|'audio'|'style'|'scene';
type Appearance='dark'|'light';
const appearanceKey='voicenote-studio-appearance';

function readAppearance():Appearance {
  try { return localStorage.getItem(appearanceKey)==='light'?'light':'dark'; }
  catch { return 'dark'; }
}

export default function App() {
  const {present:project,past,future}=useSelector((state:EditorState)=>state);
  const dispatch=useDispatch();
  const [appearance,setAppearance]=useState(readAppearance);
  const [tab,setTab]=useState<Tab>('script');
  const [selected,select]=useState('');
  const [notice,setNotice]=useState<{message:string;error:boolean}>();
  const [storage,setStorage]=useState<'loading'|'saving'|'saved'|'offline'>('loading');
  const [hydrated,setHydrated]=useState(false);
  const [busy,setBusy]=useState<''|'audio'|'photo'|'mic'>('');
  const [mic,setMic]=useState<Awaited<ReturnType<typeof startMic>>>();
  const [micSeconds,setMicSeconds]=useState(0);
  const [exporting,setExporting]=useState<number>();
  const abort=useRef<AbortController>(undefined);
  const canvas=useRef<HTMLCanvasElement>(null);
  const imported=useRef(new Map<string,AudioBuffer>());
  const report=(error:unknown)=>setNotice({message:message(error),error:true});
  const patch=(values:Partial<Project>)=>dispatch(change(values));
  const score=useMemo(()=>timeline(project),[project]);
  const {buffer,audioError,artwork,artReady,artError}=useMedia(project,imported.current);
  const peaks=useMemo(()=>buffer?waveform(buffer,project.trimStart,project.trimEnd,34):emptyPeaks,[buffer,project.trimStart,project.trimEnd]);
  const transport=usePlayback(project,score,buffer,report);
  const formats=useMemo(exportFormats,[]);
  const locked=!hydrated||Boolean(busy)||Boolean(mic)||exporting!==undefined;
  const ready=Boolean(buffer&&artReady);
  const previewable=ready&&!locked;

  useEffect(()=>{
    document.documentElement.dataset.appearance=appearance;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',appearance==='light'?'#f5f3f9':'#111115');
    try { localStorage.setItem(appearanceKey,appearance); } catch { /* Keep the in-memory preference. */ }
  },[appearance]);

  useEffect(()=>{
    let current=true;
    loadProject().then(loaded=>{
      if(loaded&&current)dispatch(hydrate(loaded));
    }).catch(error=>{
      if(current)report(error);
    }).finally(()=>{if(current)setHydrated(true);});
    return()=>{current=false;};
  },[dispatch]);
  useEffect(()=>{
    if(!hydrated)return;
    let current=true;
    setStorage('saving');
    saveProject(project).then(()=>{if(current)setStorage('saved');},()=>{if(current)setStorage('offline');});
    return()=>{current=false;};
  },[project,hydrated]);

  useEffect(()=>{
    if(!mic)return;
    const start=Date.now();
    const timer=setInterval(()=>setMicSeconds((Date.now()-start)/1000),250);
    return()=>clearInterval(timer);
  },[mic]);

  useEffect(()=>{
    const element=canvas.current;
    if(!element)return;
    try{renderFrame(element,project,score,peaks,artwork,transport.time);}
    catch(error){report(error);}
  },[project,score,peaks,artwork,transport.time]);

  useEffect(()=>{
    function shortcuts(event:KeyboardEvent){
      if(locked||event.target instanceof HTMLElement && (event.target.matches('input,select,textarea,button')||event.target.isContentEditable))return;
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){
        event.preventDefault();
        if(event.shiftKey)dispatch(redo());else dispatch(undo());
      } else if(event.code==='Space'&&previewable){
        event.preventDefault();
        if(transport.playing)transport.stop();else void transport.play();
      }
    }
    window.addEventListener('keydown',shortcuts);
    return()=>window.removeEventListener('keydown',shortcuts);
  },[locked,dispatch,previewable,transport]);

  async function useAudio(blob:Blob,name:string){
    transport.stop();
    setBusy('audio');
    try{
      const decoded=await decodeAudio(blob);
      const {id,saved}=await keepAsset(blob);
      imported.current.clear();
      imported.current.set(id,decoded);
      patch({audio:{id,name,duration:decoded.duration},trimStart:0,trimEnd:decoded.duration});
      transport.seek(0);
      if(!saved)setNotice({message:'The audio is available in this session. Browser storage could not save the file.',error:true});
      else setNotice({message:'Audio added to the timeline.',error:false});
    }catch(error){report(error);}
    finally{setBusy('');}
  }
  async function record(){
    if(mic){mic.stop();return;}
    transport.stop();
    setBusy('mic');
    setMicSeconds(0);
    try{
      const recording=await startMic();
      setMic(recording);
      setBusy('');
      const blob=await recording.result;
      setMic(undefined);
      await useAudio(blob,'Microphone take');
    }catch(error){
      setMic(undefined);
      setBusy('');
      if(error instanceof DOMException&&error.name==='NotAllowedError')report('Microphone permission was denied. Allow access in your browser or upload audio.');
      else report(error);
    }
  }
  async function photo(file:File,person:Person){
    transport.stop();
    setBusy('photo');
    try{
      const blob=await prepareAvatar(file);
      const {id,saved}=await keepAsset(blob);
      patch({avatars:{...project.avatars,[person]:{...project.avatars[person],asset:id}}});
      if(!saved)setNotice({message:'The photo is available in this session. Browser storage could not save the file.',error:true});
    }catch(error){report(error);}
    finally{setBusy('');}
  }
  async function download(){
    if(!buffer||abort.current)return;
    transport.stop();
    const controller=new AbortController();
    abort.current=controller;
    setExporting(0);
    try{
      const video=await exportVideo(project,score,buffer,peaks,artwork,controller.signal,setExporting);
      const url=URL.createObjectURL(video.blob);
      const link=document.createElement('a');
      link.href=url;
      const name=project.title.trim().replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/^-+|-+$/g,'')||'voicenote-reel';
      link.download=name+'.'+video.extension;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      setNotice({message:video.extension.toUpperCase()+' video exported.',error:false});
    }catch(error){if(!controller.signal.aborted)report(error);}
    finally{abort.current=undefined;setExporting(undefined);}
  }
  const toggle=()=>transport.playing?transport.stop():void transport.play();
  const jump=(id:string)=>{select(id);setTab(id==='voice-note'?'audio':'script');};
  const platform=(value:Project['platform'])=>{
    const defaultStatus=project.contactStatus==='online'||project.contactStatus==='Active now';
    patch({platform:value,contactStatus:defaultStatus?(value==='whatsapp'?'online':'Active now'):project.contactStatus});
  };
  return <div className="studio">
    <header className="topbar">
      <div className="brand"><div className="brand-icon"><AudioLines size={24}/></div><h1>VoiceNote <span>Studio</span></h1></div>
      <div className="project-title"><TextEdit aria-label="Project name" disabled={!hydrated} maxLength={60} value={project.title} onCommit={title=>patch({title:title.trim()||'Untitled reel'})}/>
        <span className={'save-state '+storage}>{storage==='saved'?<Check size={13}/>:null}{{loading:'Opening project',saving:'Saving',saved:'Saved on this device',offline:'Local save unavailable'}[storage]}</span></div>
      <div className="header-actions">
        <button className="icon appearance-toggle" aria-label="Light workspace" aria-pressed={appearance==='light'}
          title={appearance==='light'?'Switch to dark workspace':'Switch to light workspace'}
          onClick={()=>setAppearance(current=>current==='light'?'dark':'light')}>
          {appearance==='light'?<Moon size={17}/>:<Sun size={17}/>}
        </button>
        <button className="icon" title="Undo" aria-label="Undo" disabled={locked||!past.length} onClick={()=>dispatch(undo())}><Undo2 size={17}/></button>
        <button className="icon" title="Redo" aria-label="Redo" disabled={locked||!future.length} onClick={()=>dispatch(redo())}><Redo2 size={17}/></button>
        <button className="primary" aria-label="Export video" title={formats.length?'Preferred format: '+extension(formats[0]).toUpperCase():'Video export is unsupported in this browser'} disabled={!previewable||!formats.length} onClick={()=>void download()}><Download size={16}/><span>Export video</span></button>
      </div>
    </header>
    <main className="workspace">
      <section className="preview panel" aria-label="Video preview">
        <div className="preview-head"><h2>Preview</h2><code>9:16</code></div>
        <div className="stage"><div className="video-frame">
          <canvas ref={canvas} width={WIDTH} height={HEIGHT} aria-label="Vertical chat video"/>
          {exporting!==undefined&&<div className="render-overlay"><strong>Exporting video</strong><progress max={1} value={exporting}/><code>{Math.round(exporting*100)}%</code><button onClick={()=>abort.current?.abort()}>Cancel export</button></div>}
        </div></div>
        <div className="transport">
          <code>{formatTime(transport.time)} <span>/</span> {formatTime(score.total)}</code>
          <div><button className="icon subtle" disabled={!previewable} title="Restart preview" aria-label="Restart preview" onClick={()=>void transport.play(0)}><RotateCcw size={17}/></button>
            <button className="play" title={transport.playing?'Pause preview':'Play preview'} aria-label={transport.playing?'Pause preview':'Play preview'} disabled={!previewable} onClick={toggle}>{transport.playing?<Pause size={17} fill="currentColor"/>:<Play size={17} fill="currentColor"/>}</button></div>
          <span className="format">{formats.length?'720p':'Export unavailable'}</span>
        </div>
      </section>
      <Timeline score={score} time={transport.time} seek={t=>{if(exporting===undefined&&!mic)transport.seek(t);}} selected={selected} select={jump} peaks={peaks}/>
      <aside className="editor panel" aria-label="Project settings">
        <nav className="tabs" aria-label="Editor panels">
          {([['script','Script',Clapperboard],['audio','Audio',Waves],['style','Style',Monitor],['scene','Scene',SlidersHorizontal]] as const).map(([id,label,Icon])=><button aria-pressed={tab===id} data-panel={id} key={id} onClick={()=>setTab(id)}><Icon size={16}/>{label}</button>)}
        </nav>
        <fieldset disabled={locked} className="panel-body">
          {tab==='script'&&<><Section title="Story preset">
            <div className="select-shell"><select aria-label="Story preset" value="" onChange={e=>{patch(presets[e.target.value as keyof typeof presets]);select('');transport.seek(0);}}>
              <option value="" disabled>Choose a story preset</option>{Object.keys(presets).map(key=><option key={key}>{key}</option>)}
            </select><ChevronDown size={14}/></div>
          </Section><Section title="Conversation"><Script project={project} patch={patch} select={select} selected={selected}/></Section></>}
          {tab==='audio'&&<><Section title="Voice note"><div className="button-row"><FileButton label="Upload audio" accept="audio/*,.wav,.mp3,.m4a" disabled={!audioSupported()} onFile={file=>void useAudio(file,file.name)}/>
            <button disabled={!microphoneSupported()} onClick={()=>void record()}><Mic size={15}/>Record mic</button></div>
            {!microphoneSupported()&&<p className="muted">Microphone recording requires localhost or HTTPS and a compatible browser.</p>}
            <button className="demo-button" onClick={()=>{patch({audio:demo,trimStart:0,trimEnd:demo.duration});transport.seek(0);}}><Headphones size={14}/> Use demo track</button></Section>
            <Section title="Trim audio"><ClipControls project={project} patch={patch} peaks={peaks}/></Section></>}
          {tab==='style'&&<><Section title="Chat template">
            <div className="segmented"><button aria-pressed={project.platform==='whatsapp'} onClick={()=>platform('whatsapp')}>WhatsApp</button><button aria-pressed={project.platform==='instagram'} onClick={()=>platform('instagram')}>Instagram DM</button></div>
            <Field label="Theme"><Choice value={project.theme} options={[[ 'dark','Dark'],['light','Light']]} onChange={theme=>patch({theme})}/></Field>
            <Field label="Frame"><Choice value={project.frameStyle} options={[[ 'floating','Floating phone'],['fullscreen','Edge-to-edge']]} onChange={frameStyle=>patch({frameStyle})}/></Field>
            <Field label="Backdrop"><Choice disabled={project.frameStyle==='fullscreen'} value={project.backdrop} options={[[ 'midnight','Midnight glow'],['sunset','Golden hour'],['emerald','Studio emerald'],['minimal','Matte charcoal']]} onChange={backdrop=>patch({backdrop})}/></Field>
          </Section><Section title="Contact profile"><Profile project={project} person="them" patch={patch} onPhoto={(file,person)=>void photo(file,person)}/></Section>
          <Section title="Your profile"><Profile project={project} person="me" patch={patch} onPhoto={(file,person)=>void photo(file,person)}/></Section></>}
          {tab==='scene'&&<>
          <Section title="Voice note and caption">
            <Field label="Voice note sender"><Choice value={project.voiceSender} options={[[ 'me','Me'],['them','Contact']]} onChange={voiceSender=>patch({voiceSender})}/></Field>
            <Field label="Caption"><TextEdit value={project.overlayCaption} maxLength={110} onCommit={overlayCaption=>patch({overlayCaption})} placeholder="Add a hook" disabled={project.frameStyle==='fullscreen'}/></Field>
            <label className="switch"><span>Heart reaction</span><input type="checkbox" checked={project.heartReaction} onChange={e=>patch({heartReaction:e.target.checked})}/></label>
          </Section>
          <Section title="Sound design">
            <label className="switch"><span>Message sounds</span><input type="checkbox" checked={project.msgSfxEnabled} onChange={e=>patch({msgSfxEnabled:e.target.checked})}/></label>
            <Field label="Message tone"><Choice disabled={!project.msgSfxEnabled} value={project.msgSfxStyle} options={[[ 'pop','Soft bubble pop'],['chime','Glass chime'],['whatsapp','Classic chat tone']]} onChange={msgSfxStyle=>patch({msgSfxStyle})}/></Field>
            <button disabled={!project.msgSfxEnabled||!audioSupported()} onClick={()=>audition(project.msgSfxStyle).catch(report)}><Volume2 size={15}/> Audition tone</button>
            <label className="switch"><span>Music while texting</span><input type="checkbox" checked={project.chatBgMusicEnabled} onChange={e=>patch({chatBgMusicEnabled:e.target.checked})}/></label>
            <Field label="Music style"><Choice disabled={!project.chatBgMusicEnabled} value={project.chatBgMusicStyle} options={[[ 'lofi','Lo-fi Rhodes'],['musicbox','Dreamy music box']]} onChange={chatBgMusicStyle=>patch({chatBgMusicStyle})}/></Field>
          </Section>
          </>}
        </fieldset>
        {mic&&<div className="record-bar" role="status"><span className="record-dot"/><code>{formatTime(micSeconds)}</code><button onClick={()=>mic.stop()}><Square size={14}/> Stop recording</button></div>}
        {busy&&<p className="panel-status" role="status">{{audio:'Decoding audio…',photo:'Preparing photo…',mic:'Waiting for microphone access…'}[busy]}</p>}
      </aside>
    </main>
    {(audioError||artError)&&<div className="media-warning" role="status"><CircleAlert size={15}/>{audioError||artError}</div>}
    {notice&&<div role={notice.error?'alert':'status'} className={'toast '+(notice.error?'error':'')}><span>{notice.message}</span><button className="icon subtle" onClick={()=>setNotice(undefined)} aria-label="Dismiss notification">×</button></div>}
  </div>;
}
