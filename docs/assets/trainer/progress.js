// MIT — pure progress/assessment logic. No network and no target data.
export const STORAGE_KEY = 'evidence-first-trainer-v1';
export function emptyProgress() {
  return {version:1,completed:[],attempts:{},mistakes:[],activityDays:[],review:{},completedAt:{}};
}
const validId = id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(id);
const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date;
const validTime = time => typeof time === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(time) && Number.isFinite(Date.parse(time));
const record = value => value && typeof value === 'object' && !Array.isArray(value);
export function sanitizeProgress(value, allowedIds) {
  if (!record(value) || value.version !== 1) throw new Error('Неподдерживаемый файл прогресса.');
  const allowed = allowedIds ? new Set(allowedIds) : null;
  const accept = id => validId(id) && (!allowed || allowed.has(id));
  const out = emptyProgress();
  out.completed = [...new Set((Array.isArray(value.completed)?value.completed:[]).filter(accept))];
  if (record(value.attempts)) for (const [id,n] of Object.entries(value.attempts)) {
    if (accept(id) && Number.isSafeInteger(n) && n>=0 && n<=100000) out.attempts[id]=n;
  }
  out.activityDays = [...new Set((Array.isArray(value.activityDays)?value.activityDays:[]).filter(validDate))].sort();
  if (record(value.review)) for (const [id,item] of Object.entries(value.review)) {
    if (accept(id) && record(item) && validTime(item.at) && typeof item.needed==='boolean') out.review[id]={at:new Date(item.at).toISOString(),needed:item.needed};
  }
  if (record(value.completedAt)) for (const [id,time] of Object.entries(value.completedAt)) {
    if (accept(id) && out.completed.includes(id) && validTime(time)) out.completedAt[id]=new Date(time).toISOString();
  }
  out.mistakes=Object.keys(out.review).filter(id=>out.review[id].needed);
  return out;
}
export function mergeProgress(a,b,allowedIds) {
  a=sanitizeProgress(a,allowedIds); b=sanitizeProgress(b,allowedIds);
  const out=emptyProgress();
  out.completed=[...new Set([...a.completed,...b.completed])].sort();
  for (const id of new Set([...Object.keys(a.attempts),...Object.keys(b.attempts)])) out.attempts[id]=Math.max(a.attempts[id]||0,b.attempts[id]||0);
  out.activityDays=[...new Set([...a.activityDays,...b.activityDays])].sort();
  for (const id of new Set([...Object.keys(a.review),...Object.keys(b.review)])) {
    const x=a.review[id],y=b.review[id];
    out.review[id]=!x?y:!y?x:Date.parse(x.at)>Date.parse(y.at)?x:Date.parse(y.at)>Date.parse(x.at)?y:{at:x.at,needed:x.needed||y.needed};
  }
  for (const id of out.completed) {
    const times=[a.completedAt[id],b.completedAt[id]].filter(Boolean).sort();
    if(times.length)out.completedAt[id]=times[0];
  }
  out.mistakes=Object.keys(out.review).filter(id=>out.review[id].needed);
  return out;
}
export function localDay(date=new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function recordAnswer(state,id,correct,{now=new Date(),reviewMode=false}={}) {
  const out=sanitizeProgress(state);
  if(!validId(id))throw new Error('Unknown exercise ID');
  out.attempts[id]=Math.min(100000,(out.attempts[id]||0)+1);
  const at=now.toISOString();
  if(correct) {
    if(!out.completed.includes(id)){out.completed.push(id);out.completedAt[id]=at;}
    out.activityDays=[...new Set([...out.activityDays,localDay(now)])].sort();
    const needed=!reviewMode && !!out.review[id]?.needed;
    out.review[id]={at,needed};
  } else out.review[id]={at,needed:true};
  out.mistakes=Object.keys(out.review).filter(key=>out.review[key].needed);
  return out;
}
export function normalizeNumber(input) {
  const text=String(input).trim().replace(/[\u00a0\u202f]/g,' ');
  if(!/^(?:\d+|\d{1,3}(?:[ ,]\d{3})+)$/.test(text))return null;
  return text.replace(/[ ,]/g,'').replace(/^0+(?=\d)/,'');
}
export function grade(exercise,answer) {
  if(exercise.type==='number')return normalizeNumber(answer)===String(exercise.correct);
  const input=Array.isArray(answer)?[...new Set(answer)].sort():[];
  const expected=[...exercise.correct].sort();
  return input.length===expected.length && input.every((id,i)=>id===expected[i]);
}
export function unitComplete(unit,state){return unit.exercises.every(e=>state.completed.includes(e.id));}
export function optionalUnit(unit){return unit.optional===true||unit.id==='python';}
export function unlocked(units,state,index){return index>=0&&index<units.length&&units.slice(0,index).every(u=>optionalUnit(u)||unitComplete(u,state));}
export function nextRequiredUnit(units,state,after=-1){return units.findIndex((unit,index)=>index>after&&!optionalUnit(unit)&&!unitComplete(unit,state));}
export function streak(state,now=new Date()) {
  const days=new Set(state.activityDays);const cursor=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
  if(!days.has(localDay(cursor)))cursor.setDate(cursor.getDate()-1);
  let total=0;while(days.has(localDay(cursor))){total++;cursor.setDate(cursor.getDate()-1);}
  return total;
}
