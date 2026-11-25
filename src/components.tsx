import {useEffect,useId,useRef,useState,type ReactNode,type InputHTMLAttributes} from 'react';
import {AudioLines, MessageCircle, Mic, Plus, Trash2, Upload} from 'lucide-react';
import {palettes, type Message,type Person,type Project} from './model';
import {formatTime,trim,type Schedule} from './engines/timeline';

export type Patch = (patch:Partial<Project>)=>void;
export function Section({title,action,children}:{title:string;action?:ReactNode;children:ReactNode}){
  return <section className="section"><div className="section-title"><h2>{title}</h2>{action}</div>{children}</section>;
}
export function Field({label,children}:{label:string;children:ReactNode}){
  return <label className="field"><span>{label}</span>{children}</label>;
}
export function TextEdit({value,onCommit,...props}:Omit<InputHTMLAttributes<HTMLInputElement>,'value'|'onChange'> & {value:string;onCommit:(value:string)=>void}) {
  const [draft,setDraft]=useState(value);
  const cancelled=useRef(false);
  useEffect(()=>setDraft(value),[value]);
  return <input {...props} value={draft} onChange={e=>setDraft(e.target.value)}
    onBlur={()=>{if(!cancelled.current && draft!==value)onCommit(draft);cancelled.current=false;}}
    onKeyDown={e=>{
      if(e.key==='Enter')e.currentTarget.blur();
      if(e.key==='Escape'){cancelled.current=true;setDraft(value);e.currentTarget.blur();}
    }}/>;
}
export function Choice<T extends string>({value,options,onChange,disabled}:{value:T;options:readonly (readonly [T,string])[];onChange:(value:T)=>void;disabled?:boolean}){
  return <select disabled={disabled} value={value} onChange={e=>onChange(e.target.value as T)}>
    {options.map(([key,label])=><option key={key} value={key}>{label}</option>)}
  </select>;
}
export function FileButton({label,accept,onFile,disabled}:{label:string;accept:string;onFile:(file:File)=>void;disabled?:boolean}){
  const input=useRef<HTMLInputElement>(null);
  return <><button type="button" disabled={disabled} onClick={()=>input.current?.click()}><Upload size={14}/>{label}</button>
    <input hidden ref={input} type="file" accept={accept} onChange={e=>{
      const file=e.target.files?.[0];e.target.value='';if(file)onFile(file);
    }}/></>;
}
export function Wave({peaks}:{peaks:number[]}){
  return <span className="wave" aria-hidden="true">{peaks.map((height,index)=><i key={index} style={{height:(height*100)+'%'}}/>)}</span>;
}
export function Script({project,patch,select,selected}:{project:Project;patch:Patch;select:(id:string)=>void;selected:string}){
  const {messages}=project;
  const update=(id:string,delta:Partial<Message>)=>patch({messages:messages.map(m=>m.id===id?{...m,...delta}:m)});
  const add=(placement:Message['placement'])=>{
    const id=crypto.randomUUID();
    patch({messages:[...messages,{id,placement,sender:messages.length%2?'me':'them',text:placement==='before'?'wait listen to this 👀':'omg your voice!! 😭❤️'}]});
    select(id);
  };
  return <>{(['before','after'] as const).map(placement=><div className="script-group" key={placement}>
    <div className="lane-title"><span>{placement==='before'?'Before voice note':'After voice note'}</span>
      <button className="icon subtle" title={'Add '+placement+' message'} aria-label={'Add '+placement+' message'} disabled={messages.length>=50} onClick={()=>add(placement)}><Plus size={16}/></button></div>
    {messages.filter(m=>m.placement===placement).map((m,index)=><article key={m.id} className={'message '+(selected===m.id?'selected':'')} onFocus={()=>select(m.id)}>
      <div className="message-tools"><button className={'sender '+m.sender} aria-label={'Switch sender for message '+(index+1)} onClick={()=>update(m.id,{sender:m.sender==='me'?'them':'me'})}>{m.sender==='me'?'Me':'Them'}</button>
        <Choice value={m.placement} options={[[ 'before','Before audio'],['after','After audio']]} onChange={placement=>update(m.id,{placement})}/>
        <button className="icon subtle delete" aria-label={'Delete '+placement+' message '+(index+1)} onClick={()=>patch({messages:messages.filter(other=>other.id!==m.id)})}><Trash2 size={14}/></button></div>
      <TextEdit aria-label={placement+' message '+(index+1)} maxLength={240} value={m.text} onCommit={text=>update(m.id,{text})}/>
    </article>)}
  </div>)}</>;
}
export function Profile({project,person,patch,onPhoto}:{project:Project;person:Person;patch:Patch;onPhoto:(file:File,person:Person)=>void}){
  const me=person==='me';
  const avatar=project.avatars[person];
  return <div className="profile"><Field label={me?'Your display name':'Contact name'}><TextEdit maxLength={40} value={me?project.myName:project.contactName} onCommit={value=>patch(me?{myName:value}:{contactName:value})}/></Field>
    {!me&&<Field label="Contact status"><TextEdit maxLength={40} value={project.contactStatus} onCommit={contactStatus=>patch({contactStatus})}/></Field>}
    <div className="swatches">{palettes.map(([from,to],palette)=><button type="button" className="swatch" key={from} style={{background:`linear-gradient(135deg,${from},${to})`}}
      aria-label={(me?'Your':'Contact')+' '+['sunset','ocean','sage','berry'][palette]+' avatar'} aria-pressed={!avatar.asset&&avatar.palette===palette}
      onClick={()=>patch({avatars:{...project.avatars,[person]:{palette}}})}/>)}
      <FileButton accept="image/*" label="Photo" onFile={file=>onPhoto(file,person)}/>
    </div></div>;
}
function TrimControl({label,value,min,max,onCommit}:{label:string;value:number;min:number;max:number;onCommit:(value:number)=>void}){
  const [draft,setDraft]=useState<number>();
  const id=useId();
  function commit(){if(draft!==undefined){onCommit(draft);setDraft(undefined);}}
  return <div className="field"><label htmlFor={id}>{label} <output>{(draft??value).toFixed(2)}s</output></label>
    <input id={id} type="range" min={min} max={max} step={.01} value={draft??value} onChange={e=>setDraft(Number(e.target.value))}
      onPointerUp={commit} onPointerCancel={()=>setDraft(undefined)} onKeyUp={commit} onBlur={commit}/></div>;
}
export function ClipControls({project,patch,peaks}:{project:Project;patch:Patch;peaks:number[]}){
  const min=Math.min(.5,project.audio.duration);
  return <><div className="clip-info"><AudioLines size={17}/><span>{project.audio.name}</span><code>{(project.trimEnd-project.trimStart).toFixed(2)}s</code></div>
    <div className="clip-wave"><Wave peaks={peaks}/></div>
    <TrimControl label="Trim in" value={project.trimStart} min={0} max={Math.max(0,project.trimEnd-min)} onCommit={v=>patch(trim(project,'trimStart',v))}/>
    <TrimControl label="Trim out" value={project.trimEnd} min={project.trimStart+min} max={project.audio.duration} onCommit={v=>patch(trim(project,'trimEnd',v))}/>
    <button onClick={()=>patch({trimStart:0,trimEnd:project.audio.duration})}>Reset trim</button></>;
}
export function Timeline({score,time,seek,selected,select,peaks}:{score:Schedule;time:number;seek:(t:number)=>void;selected:string;select:(id:string)=>void;peaks:number[]}){
  const pct=(t:number)=>100*t/score.total+'%';
  const tickSize=score.total<32?2:score.total<80?5:30;
  const ticks=Array.from({length:Math.ceil(score.total/tickSize)},(_,i)=>i*tickSize).filter(t=>t===0||t/score.total<.96);
  return <section className="timeline" aria-label="Timeline">
    <div className="timeline-head"><h2>Timeline</h2><code>{formatTime(time)} <span>/</span> {formatTime(score.total)}</code></div>
    <div className="timeline-grid">
      <div className="track-labels"><span/><span><MessageCircle size={15}/><span>Chat</span></span><span><Mic size={15}/><span>Audio</span></span></div>
      <div className="tracks">
        <div className="ruler">{ticks.map(t=><span key={t} style={{left:pct(t)}}>{formatTime(t)}</span>)}</div>
        <input className="seek" type="range" aria-label="Timeline playhead" min={0} max={score.total} step={.01} value={time} onChange={e=>seek(Number(e.target.value))}/>
        <div className="track messages-track">{score.items.filter(item=>item.type==='text').map(item=><button key={item.id} className={'timeline-message '+(selected===item.id?'active':'')} title={item.text}
          style={{left:pct(item.appearAt),width:pct(Math.min(1.12,score.total-item.appearAt))}} onClick={()=>{select(item.id);seek(item.appearAt+.21);}}><MessageCircle size={12}/><span>{item.text}</span></button>)}</div>
        <div className="track"><button className={'timeline-voice '+(selected==='voice-note'?'active':'')} aria-label="Jump to start of voice note" title="Voice note" style={{left:pct(score.voice.playStart),width:pct(score.voice.duration)}} onClick={()=>{select('voice-note');seek(score.voice.playStart);}}><Wave peaks={peaks}/></button></div>
        <div className="playhead" style={{left:pct(time)}}/>
      </div>
    </div>
  </section>;
}
