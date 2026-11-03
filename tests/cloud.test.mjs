// MIT. Tests use synthetic responses only; no network or real credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createCloud, validateProgressState} from '../docs/assets/trainer/cloud.js';
const userId='11111111-1111-4111-8111-111111111111';
const now=Date.parse('2026-11-03T00:00:00Z');
const config={supabaseUrl:'https://synthetic-project.supabase.co',supabasePublishableKey:'sb_publishable_SYNTHETIC_TEST_ONLY',authMethods:['github','email']};
const token=(id=userId)=>`${btoa('{}')}.${btoa(JSON.stringify({sub:id,role:'authenticated'}))}.synthetic`;
const auth=()=>({access_token:token(),refresh_token:'synthetic-refresh-token',expires_at:now/1000+3600,user:{id:userId,email:'learner@example.com'}});
const state=()=>({version:1,completed:['m01-q01'],attempts:{'m01-q01':1},mistakes:[],activityDays:['2026-11-03'],review:{'m01-q01':{at:'2026-11-03T00:00:00.000Z',needed:false}},completedAt:{'m01-q01':'2026-11-03T00:00:00.000Z'}});
function storage(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key),data};}
const response=(data,status=200)=>new Response(data===null?'':JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
function client(responses=[],extra={}){
 const calls=[];const store=extra.storage||storage();
 const cloud=createCloud(config,{storage:store,now:()=>now,autoRefresh:false,crypto:webcrypto,
  fetchImpl:async(url,options)=>{calls.push({url,options});const next=responses.shift();if(next instanceof Error)throw next;if(typeof next==='function')return next(url,options);assert.ok(next,'Unexpected request');return next;},...extra});
 return {cloud,calls,store};
}
const login=cloud=>cloud.signIn('learner@example.com','synthetic-test-password');

test('blank and secret-key configs never send requests',async()=>{
 let called=false;
 for(const candidate of [{supabaseUrl:'',supabasePublishableKey:''},{...config,supabasePublishableKey:'sb_secret_SYNTHETIC_TEST_ONLY'},{...config,supabasePublishableKey:`${btoa('{}')}.${btoa('{"role":"service_role"}')}.synthetic`}]){
  const c=createCloud(candidate,{fetchImpl:()=>{called=true;},autoRefresh:false});
  assert.equal(c.configured,false);await assert.rejects(()=>c.pull(),{code:'NOT_CONFIGURED'});
 }assert.equal(called,false);
});

test('state validator excludes free text, invalid dates, counters and oversized payloads',()=>{
 assert.deepEqual(validateProgressState(state()),state());
 for(const bad of [{...state(),notes:'unapproved data'},{...state(),activityDays:['2026-02-30']},{...state(),attempts:{'m01-q01':-1}},{...state(),completed:['x'.repeat(131073)]}])assert.throws(()=>validateProgressState(bad),{code:'STATE'});
});

test('login exposes no tokens, preserves local progress, and requires pull before write',async()=>{
 const {cloud,calls,store}=client([response(auth())]);store.setItem('local-progress','keep');
 const session=await login(cloud);assert.equal(session.user.id,userId);assert.equal(session.access_token,undefined);
 assert.equal(store.getItem('local-progress'),'keep');assert.equal(calls[0].options.credentials,'omit');
 assert.equal(calls[0].options.headers.Authorization,undefined);
 await assert.rejects(()=>cloud.push(state()),{code:'PULL_REQUIRED'});
 assert.equal(calls.length,1);
});

test('pull and compare-and-swap push send the remembered revision',async()=>{
 const {cloud,calls}=client([response(auth()),response([{state:state(),revision:3}]),response({state:state(),revision:4})]);
 await login(cloud);assert.deepEqual(await cloud.pull(),state());assert.deepEqual(await cloud.push(state()),state());
 assert.equal(JSON.parse(calls[2].options.body).p_expected_revision,3);
 assert.equal(calls[2].options.headers.Authorization,`Bearer ${token()}`);
});

test('conflicting device write remains visible and can be retried after pull',async()=>{
 const {cloud}=client([response(auth()),response([]),response({code:'40001'},409),response([{state:state(),revision:2}]),response({state:state(),revision:3})]);
 await login(cloud);assert.equal(await cloud.pull(),null);await assert.rejects(()=>cloud.push(state()),{code:'CONFLICT'});
 await cloud.pull();assert.deepEqual(await cloud.push(state()),state());
});

test('parallel pulls share one refresh-token exchange',async()=>{
 const expired={...auth(),expires_at:now/1000+30};let refreshes=0;
 const {cloud}=client([response(expired),async()=>{refreshes++;await new Promise(resolve=>setTimeout(resolve,2));return response(auth());},response([]),response([])]);
 await login(cloud);await Promise.all([cloud.pull(),cloud.pull()]);assert.equal(refreshes,1);
});

test('logout clears local credentials even when remote revocation fails',async()=>{
 const {cloud,store}=client([response(auth()),new Error('synthetic offline')]);store.setItem('local-progress','keep');
 await login(cloud);await assert.rejects(()=>cloud.signOut(),{code:'NETWORK'});
 assert.equal(cloud.session(),null);assert.equal(store.getItem('local-progress'),'keep');
 assert.equal([...store.data.keys()].filter(key=>key.startsWith('evidence-first-auth:')).length,0);
});

test('late pull response cannot install a revision after signout',async()=>{
 let release;const wait=new Promise(resolve=>{release=resolve;});
 const {cloud}=client([response(auth()),()=>wait,response(null)]);
 await login(cloud);const pending=cloud.pull();await new Promise(resolve=>setTimeout(resolve,0));await cloud.signOut();
 release(response([{state:state(),revision:1}]));await assert.rejects(()=>pending,{code:'SESSION_CHANGED'});assert.equal(cloud.session(),null);
});

test('email signup requires confirmation when server returns no session',async()=>{
 const {cloud}=client([response({id:userId})]);
 assert.deepEqual(await cloud.signUp('learner@example.com','synthetic-test-password'),{requiresEmailConfirmation:true,session:null});
 assert.equal(cloud.session(),null);
});

test('restored session is verified before progress is read',async()=>{
 const store=storage();const first=client([response(auth())],{storage:store});await login(first.cloud);
 const second=client([response(auth().user),response([])],{storage:store});
 assert.equal(await second.cloud.pull(),null);
 assert.equal(second.calls[0].url.endsWith('/auth/v1/user'),true);
 assert.equal(second.calls[1].url.includes('/rest/v1/trainer_progress'),true);
});

test('invalid restored session is removed without deleting exercise data',async()=>{
 const store=storage();store.setItem('local-progress','keep');
 const first=client([response(auth())],{storage:store});await login(first.cloud);
 const second=client([response({message:'invalid token'},401)],{storage:store});
 await assert.rejects(()=>second.cloud.getSession(),{code:'AUTH'});
 assert.equal(second.cloud.session(),null);assert.equal(store.getItem('local-progress'),'keep');
});

const location={origin:'https://bioxhaust.github.io',pathname:'/evidence-first-osint/trainer/',search:'',hash:''};
test('GitHub PKCE uses SHA-256, persists verifier only in sessionStorage, then exchanges callback',async()=>{
 let cleaned='';const store=storage();
 const first=client([],{storage:store,location});
 const url=new URL(await first.cloud.signInWithGitHub());
 assert.equal(url.searchParams.get('provider'),'github');assert.equal(url.searchParams.get('code_challenge_method'),'s256');
 const key=[...store.data.keys()].find(key=>key.endsWith(':pkce'));const flow=JSON.parse(store.getItem(key));
 const expected=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(flow.verifier))).toString('base64url');
 assert.equal(url.searchParams.get('code_challenge'),expected);assert.equal(url.href.includes(flow.verifier),false);
 const second=client([response(auth())],{storage:store,location:{...location,search:`?code=${userId}`},history:{replaceState:(_a,_b,url)=>{cleaned=url;}}});
 assert.equal((await second.cloud.initialize()).user.id,userId);assert.equal(store.getItem(key),null);
 assert.equal(cleaned,location.pathname);assert.equal(JSON.parse(second.calls[0].options.body).code_verifier,flow.verifier);
});

test('unsolicited OAuth code or implicit tokens cannot establish a session',async()=>{
 let cleaned='';
 const unsolicited=client([],{location:{...location,search:`?code=${userId}`},history:{replaceState:(_a,_b,url)=>{cleaned=url;}}});
 await assert.rejects(()=>unsolicited.cloud.initialize(),{code:'OAUTH_STATE'});assert.equal(unsolicited.calls.length,0);assert.equal(cleaned,location.pathname);
 const implicit=client([],{location:{...location,hash:'#access_token=untrusted&refresh_token=untrusted'},history:{replaceState:()=>{}}});
 assert.equal(await implicit.cloud.initialize(),null);assert.equal(implicit.cloud.confirmationReturned,true);assert.equal(implicit.cloud.session(),null);
});

test('failed PKCE exchange clears one-use verifier and leaves local progress intact',async()=>{
 const store=storage();store.setItem('local-progress','keep');
 const initial=client([],{storage:store,location});await initial.cloud.signInWithGitHub();
 const final=client([response({error:'invalid_grant'},400)],{storage:store,location:{...location,search:`?code=${userId}`},history:{replaceState:()=>{}}});
 await assert.rejects(()=>final.cloud.initialize(),{code:'AUTH'});assert.equal(final.cloud.session(),null);assert.equal(store.getItem('local-progress'),'keep');
 assert.equal([...store.data.keys()].filter(key=>key.endsWith(':pkce')).length,0);
});
