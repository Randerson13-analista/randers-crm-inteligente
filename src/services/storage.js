const KEY = 'randerscrm_ui_cache_v1';
const emptyState = {
  revendedores: [],
  imports: [],
  users: [],
  agenda: [],
  history: [],
  goals: {},
  campaigns: [],
  audit: [],
};
export function loadState(){
  try {
    const stored = JSON.parse(localStorage.getItem(KEY)) || {};
    return { ...emptyState, ...stored, users: [] };
  } catch {
    return { ...emptyState };
  }
}
export function saveState(state){
  const cache = {
    activeHint: state.activeHint || 'Dashboard',
  };
  localStorage.setItem(KEY, JSON.stringify(cache));
}
