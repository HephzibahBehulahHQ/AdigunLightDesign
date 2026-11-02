const clone = (value) => structuredClone(value);

export function commitTransaction(state, label, mutate, timestamp = new Date().toISOString()) {
  const before=clone(state.project), project=clone(state.project);
  mutate(project);
  project.history=[...(project.history ?? []), { id:crypto.randomUUID(), label, timestamp }].slice(-100);
  return { project, undoStack:[...state.undoStack,before], redoStack:[] };
}

export function undoTransaction(state) {
  if (!state.undoStack.length) return state;
  return { project:clone(state.undoStack.at(-1)), undoStack:state.undoStack.slice(0,-1), redoStack:[...state.redoStack,clone(state.project)] };
}

export function redoTransaction(state) {
  if (!state.redoStack.length) return state;
  return { project:clone(state.redoStack.at(-1)), undoStack:[...state.undoStack,clone(state.project)], redoStack:state.redoStack.slice(0,-1) };
}
