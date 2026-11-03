// MIT. Account-scoped local progress; drafts stay in memory and never enter exports.
import {STORAGE_KEY,emptyProgress,sanitizeProgress,mergeProgress} from './progress.js';

function encode(value) {
  const state=sanitizeProgress(value);
  state.completed.sort();state.mistakes.sort();
  return JSON.stringify(state,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)
    ?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
}
export function createProgressSession(storage,ids) {
  let userId=null,epoch=0;
  const drafts=new Map();
  const key=()=>userId?`${STORAGE_KEY}:${userId}`:STORAGE_KEY;
  function read(storageKey=key()) {
    try {const raw=storage?.getItem(storageKey);return raw?sanitizeProgress(JSON.parse(raw),ids):emptyProgress();}
    catch {return emptyProgress();}
  }
  function write(value) {
    let state=sanitizeProgress(value,ids);
    try {
      if(!storage)throw new Error('Storage unavailable');
      const raw=storage.getItem(key());
      let latest=emptyProgress();
      try {if(raw)latest=sanitizeProgress(JSON.parse(raw),ids);}catch { /* Replace an invalid snapshot with valid progress. */ }
      state=mergeProgress(state,latest,ids);
      const encoded=encode(state);
      if(encoded!==raw)storage.setItem(key(),encoded);
      return {state,persisted:true};
    } catch {return {state,persisted:false};}
  }
  return {
    key,read,write,
    token:()=>({userId,epoch}),
    isCurrent:token=>Boolean(token)&&token.userId===userId&&token.epoch===epoch,
    switchTo(nextUserId) {
      nextUserId=nextUserId||null;
      if(nextUserId===userId)return false;
      userId=nextUserId;epoch++;drafts.clear();return true;
    },
    reconcile(event,value) {
      if(event.key!==key()||event.newValue===null)return null;
      try {return write(mergeProgress(value,sanitizeProgress(JSON.parse(event.newValue),ids),ids));}
      catch {return null;}
    },
    setDraft(id,value) {if(ids.includes(id))drafts.set(id,Array.isArray(value)?[...value]:String(value));},
    clearDraft(id) {drafts.delete(id);},
    draft(id) {const value=drafts.get(id);return Array.isArray(value)?[...value]:value;},
  };
}
