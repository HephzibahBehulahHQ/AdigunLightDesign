export interface HistoryEntry {id:string;label:string;timestamp:string;}
export interface HistoryProject {history?:HistoryEntry[];}
export interface HistoryState<T extends HistoryProject> {project:T;undoStack:readonly T[];redoStack:readonly T[];}
export const MAX_UNDO_STEPS=100;
const clone = <T>(value:T):T => structuredClone(value);

export function commitTransaction<T extends HistoryProject>(state:HistoryState<T>, label:string, mutate:(project:T)=>void, timestamp = new Date().toISOString()):HistoryState<T> {
  const before=clone(state.project), project=clone(state.project);
  mutate(project);
  project.history=[...(project.history ?? []), { id:crypto.randomUUID(), label, timestamp }].slice(-100);
  return { project, undoStack:[...state.undoStack,before].slice(-MAX_UNDO_STEPS), redoStack:[] };
}

export function undoTransaction<T extends HistoryProject>(state:HistoryState<T>):HistoryState<T> {
  if (!state.undoStack.length) return state;
  return { project:clone(state.undoStack.at(-1)!), undoStack:state.undoStack.slice(0,-1), redoStack:[...state.redoStack,clone(state.project)].slice(-MAX_UNDO_STEPS) };
}

export function redoTransaction<T extends HistoryProject>(state:HistoryState<T>):HistoryState<T> {
  if (!state.redoStack.length) return state;
  return { project:clone(state.redoStack.at(-1)!), undoStack:[...state.undoStack,clone(state.project)].slice(-MAX_UNDO_STEPS), redoStack:state.redoStack.slice(0,-1) };
}
