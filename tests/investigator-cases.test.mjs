import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,statSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {cases} from '../docs/assets/investigator/cases.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const docs=path.join(root,'docs');

function sourceFile(href){
  const url=new URL(href,'https://course.invalid/investigator/');
  assert.equal(url.origin,'https://course.invalid','All case URLs must stay on the course');
  const rel=decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g,'');
  const resolved=path.resolve(docs,rel);
  assert.ok(resolved.startsWith(docs+path.sep),'Case URLs must stay inside docs');
  const candidates=[resolved,`${resolved}.md`,path.join(resolved,'index.md'),path.join(resolved,'README.md')];
  const found=candidates.find(candidate=>existsSync(candidate)&&statSync(candidate).isFile());
  assert.ok(found,`Missing course source for ${href}`);
  return found;
}

test('three complete cases have distinct identifiers and existing source pages',()=>{
  assert.equal(cases.length,3);
  assert.equal(new Set(cases.map(item=>item.id)).size,cases.length);
  const globalQuestions=new Set();
  for(const item of cases){
    assert.match(item.id,/^[a-z][a-z-]+$/);
    for(const field of ['title','kicker','summary','objective','skill']) assert.ok(item[field]?.trim(),`${item.id}: ${field}`);
    assert.ok(Number.isFinite(item.minutes)&&item.minutes>0);
    assert.ok(item.evidence.length>=6&&item.evidence.length<=9);
    assert.ok(item.questions.length>=3);
    sourceFile(item.lab);sourceFile(item.solution);
    const ids=item.evidence.map(e=>e.id);
    assert.equal(new Set(ids).size,ids.length,`${item.id}: duplicate evidence ID`);
    for(const evidence of item.evidence){
      for(const field of ['title','type','summary']) assert.ok(evidence[field]?.trim());
      const content=readFileSync(sourceFile(evidence.url),'utf8');
      assert.ok(content.includes(evidence.id),`${evidence.id}: source label mismatch`);
      assert.ok(content.includes('SYNTHETIC'),`${evidence.id}: missing synthetic label`);
    }
    for(const question of item.questions){
      assert.ok(!globalQuestions.has(question.id),`Duplicate question ID ${question.id}`);
      globalQuestions.add(question.id);
      assert.ok(question.prompt?.trim()&&question.explanation?.trim()&&question.hint?.trim());
      assert.ok(question.options.length>=3);
      assert.equal(new Set(question.options.map(o=>o.id)).size,question.options.length);
      assert.ok(question.options.some(o=>o.id===question.correct));
      const accepted=question.acceptableEvidenceSets||[question.requiredEvidence];
      assert.ok(accepted.some(set=>[...set].sort().join('|')===[...question.requiredEvidence].sort().join('|')));
      for(const set of accepted){
        assert.ok(set.length>=1&&set.length<=3,`${question.id}: minimal evidence set`);
        assert.equal(new Set(set).size,set.length);
        assert.ok(set.every(id=>ids.includes(id)),`${question.id}: unknown required evidence`);
      }
    }
  }
});

test('every evidence dependency exists and every case can be fully explored',()=>{
  for(const item of cases){
    const ids=new Set(item.evidence.map(e=>e.id));
    for(const evidence of item.evidence){
      assert.ok(Array.isArray(evidence.requires));
      assert.ok(evidence.requires.every(id=>ids.has(id)&&id!==evidence.id));
      assert.equal(new Set(evidence.requires).size,evidence.requires.length);
    }
    const reached=new Set();
    let expanded=true;
    while(expanded){
      expanded=false;
      for(const evidence of item.evidence){
        if(!reached.has(evidence.id)&&evidence.requires.every(id=>reached.has(id))){reached.add(evidence.id);expanded=true;}
      }
    }
    assert.equal(reached.size,ids.size,`${item.id}: dependency cycle or missing entry point`);
  }
});

test('key distinctions use the relevant original evidence and allow the tenure alternative',()=>{
  const questions=Object.fromEntries(cases.flatMap(item=>item.questions).map(question=>[question.id,question]));
  assert.deepEqual(questions['profile-link'].requiredEvidence,['P-01','P-03']);
  assert.deepEqual(questions['profile-rename'].requiredEvidence,['P-03','P-05','P-06']);
  assert.deepEqual(questions['biography-tenure'].acceptableEvidenceSets,[['B-01','B-05','B-07'],['B-01','B-05','B-06']]);
  assert.deepEqual(questions['authorship-change-time'].requiredEvidence,['A-02','A-03']);
  assert.deepEqual(questions['authorship-allegation'].requiredEvidence,['A-08','A-09']);
});
