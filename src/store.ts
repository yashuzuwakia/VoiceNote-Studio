import {configureStore, createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {initialProject, type Project} from './model';
type History = {past:Project[]; present:Project; future:Project[]};
const initialState:History = {past:[],present:initialProject,future:[]};
const editor = createSlice({
  name:'editor', initialState,
  reducers:{
    hydrate: (_state, action:PayloadAction<Project>)=>({past:[],present:action.payload,future:[]}),
    change(state, action:PayloadAction<Partial<Project>>) {
      const patch=action.payload;
      if (Object.entries(patch).every(([key,value])=>state.present[key as keyof Project]===value)) return;
      state.past.push(state.present);
      if (state.past.length>60) state.past.shift();
      Object.assign(state,{present:{...state.present,...patch},future:[]});
    },
    undo(state) {
      const previous=state.past.pop();
      if (!previous) return;
      state.future.push(state.present);
      state.present=previous;
    },
    redo(state) {
      const next=state.future.pop();
      if (!next) return;
      state.past.push(state.present);
      state.present=next;
    }
  }
});
export const {hydrate,change,undo,redo}=editor.actions;
export const makeStore=()=>configureStore({reducer:editor.reducer});
export const store=makeStore();
export type EditorState=ReturnType<typeof store.getState>;
