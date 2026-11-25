import {describe,expect,it} from 'vitest';
import {initialProject,presets} from './model';
import {timeline,trim} from './engines/timeline';
import {extension} from './engines/export';
import {waveform} from './engines/audio';
import {change,hydrate,makeStore,redo,undo} from './store';

describe('timeline',()=>{
  it('schedules intro, trimmed voice, and reactions in order',()=>{
    const score=timeline({...initialProject,trimStart:2,trimEnd:5});
    expect(score.items.map(item=>item.type)).toEqual(['text','text','voice','text']);
    expect(score.voice.playStart).toBeCloseTo(3.9);
    expect(score.voice.duration).toBe(3);
    expect(score.voice.playEnd).toBeCloseTo(6.9);
    expect(score.items.at(-1)?.appearAt).toBeCloseTo(7.55);
    expect(score.total).toBeCloseTo(9.95);
  });
  it('preserves placement when the editor list interleaves messages',()=>{
    const [a,b,c]=initialProject.messages;
    expect(timeline({...initialProject,messages:[c,a,b]}).items.map(x=>x.id)).toEqual([a.id,b.id,'voice-note',c.id]);
  });
  it('honors source bounds and very short recordings',()=>{
    expect(trim(initialProject,'trimStart',50)).toEqual({trimStart:13.5});
    expect(trim(initialProject,'trimEnd',-1)).toEqual({trimEnd:.5});
    expect(trim(initialProject,'trimEnd',Infinity)).toEqual({});
    const project={...initialProject,audio:{id:'short',name:'Short',duration:.18},trimEnd:.18};
    expect(trim(project,'trimStart',.17)).toEqual({trimStart:0});
    expect(timeline(project).voice.duration).toBe(.18);
  });
});
describe('history',()=>{
  it('undoes and redoes an entire preset and discards a branched redo',()=>{
    const store=makeStore();
    store.dispatch(change(presets['Crush cover']));
    expect(store.getState().present.messages[0].text).toContain('tell me');
    store.dispatch(undo());
    expect(store.getState().present).toEqual(initialProject);
    store.dispatch(redo());
    expect(store.getState().present.contactName).toContain('Crush');
    store.dispatch(undo());
    store.dispatch(change({theme:'light'}));
    store.dispatch(redo());
    expect(store.getState().present.theme).toBe('light');
    expect(store.getState().future).toHaveLength(0);
  });
  it('hydrates saved metadata and starts a new history',()=>{
    const store=makeStore();
    store.dispatch(change({title:'Transient'}));
    store.dispatch(hydrate({...initialProject,title:'Saved'}));
    store.dispatch(undo());
    expect(store.getState().present.title).toBe('Saved');
  });
  it('bounds undo history and ignores unchanged edits',()=>{
    const store=makeStore();
    for(let index=0;index<65;index++)store.dispatch(change({title:'Reel '+index}));
    store.dispatch(change({title:'Reel 64'}));
    expect(store.getState().past).toHaveLength(60);
    store.dispatch(undo());
    expect(store.getState().present.title).toBe('Reel 63');
  });
});
describe('media primitives',()=>{
  it('uses the actual recorder container to choose the file extension',()=>{
    expect(extension('video/mp4;codecs=avc1')).toBe('mp4');
    expect(extension('video/webm;codecs=vp9,opus')).toBe('webm');
    expect(()=>extension('audio/webm')).toThrow('unrecognized');
  });
  it('builds peaks from both channels inside the trimmed window',()=>{
    const channels=[Float32Array.of(1,0,0,0),Float32Array.of(0,0,.4,0)];
    const buffer={sampleRate:4,numberOfChannels:2,getChannelData:(channel:number)=>channels[channel]} as AudioBuffer;
    expect(waveform(buffer,.25,.75,2)).toEqual([.12,1]);
  });
});
