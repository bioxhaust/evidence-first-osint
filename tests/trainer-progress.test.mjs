import test from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY,emptyProgress,mergeProgress,recordAnswer,grade,streak,sanitizeProgress,unlocked,nextRequiredUnit,optionalUnit} from '../docs/assets/trainer/progress.js';
import {createProgressSession} from '../docs/assets/trainer/session-state.js';
import {units as courseUnits} from '../docs/assets/trainer/lessons.js';

test('a wrong answer does not award points; a corrected mistake stays in review until retrained',()=>{
 let s=recordAnswer(emptyProgress(),'profiles-1',false,{now:new Date('2026-11-03T10:00:00Z')});
 assert.equal(s.completed.length,0);assert.deepEqual(s.mistakes,['profiles-1']);
 s=recordAnswer(s,'profiles-1',true,{now:new Date('2026-11-03T10:01:00Z')});
 assert.equal(s.completed.length,1);assert.deepEqual(s.mistakes,['profiles-1']);
 s=recordAnswer(s,'profiles-1',true,{now:new Date('2026-11-03T10:02:00Z'),reviewMode:true});
 assert.equal(s.completed.length,1);assert.deepEqual(s.mistakes,[]);
});
test('merge preserves offline completions and resolves review by time without doubling attempts',()=>{
 const a=recordAnswer(emptyProgress(),'profiles-1',true,{now:new Date('2026-11-03T10:00:00Z')});
 let b=recordAnswer(emptyProgress(),'tools-1',true,{now:new Date('2026-11-03T11:00:00Z')});
 b=recordAnswer(b,'profiles-1',false,{now:new Date('2026-11-03T12:00:00Z')});
 const m=mergeProgress(a,b);assert.deepEqual(m.completed,['profiles-1','tools-1']);
 assert.equal(m.attempts['profiles-1'],1);assert.deepEqual(m.mistakes,['profiles-1']);
 assert.deepEqual(mergeProgress(m,m),m);assert.deepEqual(mergeProgress(a,b),mergeProgress(b,a));
});
test('grading requires the exact evidence set and rejects ambiguous numeric strings',()=>{
 assert.equal(grade({type:'multi',correct:['a','b']},['b','a']),true);
 assert.equal(grade({type:'multi',correct:['a','b']},['a','b','c']),false);
 assert.equal(grade({type:'number',correct:'5000000'},'5 000 000'),true);
 assert.equal(grade({type:'number',correct:'5000000'},'5,000,000'),true);
 assert.equal(grade({type:'number',correct:'5000000'},'5000000garbage'),false);
 assert.equal(grade({type:'number',correct:'5000000'},'5.000.000'),false);
});
test('imports filter unknown IDs and prototype keys instead of allowing arbitrary progress',()=>{
 const input=JSON.parse('{"version":1,"completed":["known-1","unknown-1"],"attempts":{"__proto__":1,"known-1":2}}');
 const result=sanitizeProgress(input,['known-1']);assert.deepEqual(result.completed,['known-1']);
 assert.deepEqual(Object.keys(result.attempts),['known-1']);assert.throws(()=>sanitizeProgress({version:99}));
});
test('unlock and streak reflect completed practice, including yesterday and missed days',()=>{
 const units=[{exercises:[{id:'a'}]},{exercises:[{id:'b'}]}];let s=emptyProgress();
 assert.equal(unlocked(units,s,1),false);s.completed=['a'];assert.equal(unlocked(units,s,1),true);
 s.activityDays=['2026-11-01','2026-11-02'];assert.equal(streak(s,new Date(2026,10,3,12)),2);
 assert.equal(streak(s,new Date(2026,10,4,12)),0);
});
test('optional Python never blocks AI or reporting and is skipped by Continue without awarding completion',()=>{
 const units=[{id:'foundation',exercises:[{id:'a'}]},{id:'python',exercises:[{id:'b'}]},{id:'ai',exercises:[{id:'c'}]},{id:'report',exercises:[{id:'d'}]}];
 const state=emptyProgress();state.completed=['a'];
 assert.equal(unlocked(units,state,2),true);
 assert.equal(unlocked(units,state,3),false);
 assert.equal(nextRequiredUnit(units,state),2);
 state.completed.push('c');assert.equal(unlocked(units,state,3),true);
 state.completed.push('d');assert.equal(nextRequiredUnit(units,state),-1);
 assert.deepEqual(state.completed,['a','c','d']);
 assert.equal(optionalUnit({id:'other',optional:true}),true);
 assert.equal(unlocked(units,state,units.length),false);
 const courseState=emptyProgress();courseState.completed=courseUnits.filter(unit=>!optionalUnit(unit)).flatMap(unit=>unit.exercises.map(ex=>ex.id));
 assert.equal(nextRequiredUnit(courseUnits,courseState),-1);
 assert.ok(courseUnits.every((_unit,index)=>unlocked(courseUnits,courseState,index)));
});
function memoryStorage(){
 const data=new Map();let writes=0;
 return {getItem:key=>data.get(key)||null,setItem:(key,value)=>{writes++;data.set(key,value);},get writes(){return writes;}};
}
const answered=id=>recordAnswer(emptyProgress(),id,true,{now:new Date('2026-11-03T10:00:00Z')});
test('a stale second tab merges the latest local snapshot before writing',()=>{
 const storage=memoryStorage(),ids=['a','b'];
 const tabA=createProgressSession(storage,ids),tabB=createProgressSession(storage,ids);
 const a=answered('a'),b=answered('b');
 tabA.write(a);const result=tabB.write(b);
 assert.equal(result.persisted,true);assert.deepEqual(result.state.completed,['a','b']);
 assert.deepEqual(tabA.read().completed,['a','b']);
});
test('storage events recover simultaneous tab writes and settle without a write loop',()=>{
 const storage=memoryStorage(),ids=['a','b'];
 const tabA=createProgressSession(storage,ids),tabB=createProgressSession(storage,ids);
 const a=answered('a'),b=answered('b');
 // Simulate B overwriting A between a separate read and write in another process.
 storage.setItem(STORAGE_KEY,JSON.stringify(b));
 const recovered=tabA.reconcile({key:STORAGE_KEY,newValue:JSON.stringify(b)},a);
 assert.deepEqual(recovered.state.completed,['a','b']);
 const writes=storage.writes;
 const received=tabB.reconcile({key:STORAGE_KEY,newValue:storage.getItem(STORAGE_KEY)},b);
 assert.deepEqual(received.state.completed,['a','b']);assert.equal(storage.writes,writes);
 tabA.reconcile({key:STORAGE_KEY,newValue:storage.getItem(STORAGE_KEY)},recovered.state);
 assert.equal(storage.writes,writes);
 assert.equal(tabA.reconcile({key:STORAGE_KEY,newValue:'invalid'},a),null);
});
test('account changes restore the correct namespace and invalidate late operations even for the same account',()=>{
 const storage=memoryStorage(),local=createProgressSession(storage,['guest','account-a','account-b']);
 local.write(answered('guest'));const guestToken=local.token();
 local.switchTo('a');local.write(answered('account-a'));const oldA=local.token();
 assert.equal(local.isCurrent(guestToken),false);
 local.switchTo('b');assert.deepEqual(local.read().completed,[]);local.write(answered('account-b'));
 assert.equal(local.reconcile({key:`${STORAGE_KEY}:a`,newValue:storage.getItem(`${STORAGE_KEY}:a`)},local.read()),null);
 local.switchTo(null);assert.deepEqual(local.read().completed,['guest']);
 local.switchTo('a');assert.deepEqual(local.read().completed,['account-a']);assert.equal(local.isCurrent(oldA),false);
 const verifiedA=local.token();assert.equal(local.switchTo('a'),false);assert.equal(local.isCurrent(verifiedA),true);
});
test('drafts survive progress merges, stay outside exports, and clear on account changes',()=>{
 const storage=memoryStorage(),local=createProgressSession(storage,['a','b']);
 const choice=['candidate'];local.setDraft('a',choice);choice.push('unrelated');
 local.setDraft('b','5 000 000');
 const merged=local.write(answered('a')).state;
 assert.deepEqual(local.draft('a'),['candidate']);assert.equal(local.draft('b'),'5 000 000');
 assert.deepEqual(Object.keys(merged).sort(),Object.keys(emptyProgress()).sort());
 assert.equal(storage.getItem(STORAGE_KEY).includes('candidate'),false);
 const copy=local.draft('a');copy.push('extra');assert.deepEqual(local.draft('a'),['candidate']);
 const persisted=storage.getItem(STORAGE_KEY);local.clearDraft('a');
 assert.equal(local.draft('a'),undefined);assert.equal(local.draft('b'),'5 000 000');
 assert.equal(storage.getItem(STORAGE_KEY),persisted,'a fresh attempt must not erase earned progress or unrelated drafts');
 local.switchTo('account');assert.equal(local.draft('a'),undefined);assert.equal(local.draft('b'),undefined);
});
test('a blocked storage write preserves in-memory practice and reports the failure',()=>{
 const local=createProgressSession({getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}},['a']);
 const result=local.write(answered('a'));
 assert.equal(result.persisted,false);assert.deepEqual(result.state.completed,['a']);
 assert.deepEqual(local.read(),emptyProgress());
});
