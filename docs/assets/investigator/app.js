// MIT. Local-only learning workspace; never sends notes or answers to a server.
import {cases} from './cases.js';
import {STORAGE_KEY,emptyState,sanitizeState,canOpen,grade,caseProgress} from './state.js';

const root=document.getElementById('osint-investigator');
if(root)start();

function start(){
  let state=emptyState(cases),storage,message='',selected=cases[0].id,activeSource=null;
  let readerText='',readerError='',loading=false,request=null,generation=0;
  try{
    storage=window.localStorage;
    const saved=storage.getItem(STORAGE_KEY);
    if(saved){
      if(saved.length>200000)throw new Error('Saved state too large');
      state=sanitizeState(JSON.parse(saved),cases);
    }
  }catch{message='Не удалось прочитать сохранение. Можно работать в этой вкладке и скачать записи.';}
  const fromUrl=new URL(location.href).searchParams.get('case');
  if(cases.some(item=>item.id===fromUrl))selected=fromUrl;

  function el(tag,attrs={},...children){
    const node=document.createElement(tag);
    for(const [key,value]of Object.entries(attrs)){
      if(key.startsWith('on'))node.addEventListener(key.slice(2),value);
      else if(key==='class')node.className=value;
      else if(key==='value')node.value=value;
      else if(value!==false&&value!=null)node.setAttribute(key,String(value));
    }
    for(const item of children.flat(Infinity))if(item!=null)node.append(typeof item==='string'?document.createTextNode(item):item);
    return node;
  }
  const link=(label,url,style='iw-link')=>el('a',{href:url,class:style},label);
  const button=(label,action,style='iw-button',attrs={})=>el('button',{type:'button',class:style,onclick:action,...attrs},label);
  const current=()=>cases.find(item=>item.id===selected);
  function persist(){
    try{
      if(!storage)throw new Error('Storage unavailable');
      storage.setItem(STORAGE_KEY,JSON.stringify(state));
    }catch{
      message='Браузер не сохранил изменения. Они остаются в этой вкладке; скачайте записи перед закрытием.';
      const notice=root.querySelector('.iw-notice');
      if(notice){notice.textContent=message;notice.hidden=false;}
    }
  }
  function focus(selector){root.querySelector(selector)?.focus();}
  function switchCase(id){
    request?.abort();generation++;selected=id;activeSource=null;readerText='';readerError='';loading=false;
    const url=new URL(location.href);url.searchParams.set('case',id);history.replaceState(null,'',url);
    render();focus('.iw-case-title');
  }
  async function openSource(id){
    const data=current(),saved=state.cases[data.id],source=data.evidence.find(e=>e.id===id);
    if(!source||!canOpen(data,saved,id))return;
    request?.abort();request=new AbortController();const controller=request,ticket=++generation;
    activeSource=id;readerText='';readerError='';loading=true;render();focus('.iw-reader-title');
    try{
      const url=new URL(source.url,location.href);
      if(url.origin!==location.origin)throw new Error('Источник должен находиться в учебном корпусе.');
      const response=await fetch(url,{signal:controller.signal,credentials:'omit'});
      if(!response.ok)throw new Error(`Источник не загрузился (HTTP ${response.status}).`);
      const document=new DOMParser().parseFromString(await response.text(),'text/html');
      const article=document.querySelector('article.md-content__inner')||document.querySelector('article');
      if(!article)throw new Error('В ответе не найдена учебная страница.');
      article.querySelectorAll('script,style,.headerlink').forEach(node=>node.remove());
      const text=article.textContent.trim();
      if(!text.includes('SYNTHETIC'))throw new Error('В источнике отсутствует метка учебного материала.');
      if(ticket!==generation||selected!==data.id)return;
      readerText=text.replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n');
      if(!saved.opened.includes(id)){saved.opened.push(id);persist();}
    }catch(error){
      if(controller.signal.aborted||ticket!==generation)return;
      readerError=error.message||'Не удалось открыть источник. Попробуйте ещё раз.';
    }finally{
      if(ticket===generation){loading=false;render();focus('.iw-reader-title');}
    }
  }
  function exportNotes(){
    const report={format:'evidence-first-investigator-v1',exported_at:new Date().toISOString(),synthetic:true,
      scope:'Учебные источники; свободный текст не оценивался автоматически.',
      cases:cases.map(data=>({id:data.id,title:data.title,progress:caseProgress(data,state.cases[data.id]),
        notes:state.cases[data.id].notes,
        evidence:data.evidence.filter(e=>state.cases[data.id].opened.includes(e.id)).map(e=>({id:e.id,title:e.title,url:new URL(e.url,location.href).href})),
        answers:data.questions.map(q=>({question:q.prompt,...state.cases[data.id].answers[q.id],assessment:grade(data,state.cases[data.id],q.id)}))}))};
    const blob=new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=el('a',{href:url,download:'osint-investigations.json'});
    a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function render(){
    const data=current(),saved=state.cases[data.id],progress=caseProgress(data,saved);
    root.replaceChildren();root.className='iw-app';
    root.append(el('header',{class:'iw-header'},
      el('div',{},el('p',{class:'iw-eyebrow'},'EVIDENCE FIRST / ПРАКТИКА'),el('h1',{},'Лаборатория расследований')),
      button('Скачать записи',exportNotes,'iw-button iw-export')));
    root.append(el('p',{class:'iw-notice',role:'status',hidden:!message},message));
    root.append(el('p',{class:'iw-intro'},'Открой источник → проверь версию → укажи решающие доказательства. Все персонажи и документы вымышлены. Заметки сохраняются в этом браузере и не отправляются на сервер.'));
    const choices=el('nav',{class:'iw-case-picker','aria-label':'Учебные дела'});
    cases.forEach((item,index)=>{
      const p=caseProgress(item,state.cases[item.id]);
      choices.append(button('',()=>switchCase(item.id),'iw-case-choice',{'aria-current':item.id===selected?'page':null}),);
      const card=choices.lastElementChild;
      card.append(el('span',{class:'iw-case-number'},`ДЕЛО 0${index+1}`),el('strong',{},item.title),el('span',{class:'iw-small'},p.complete?'Разобрано':`${p.correct}/${p.total} выводов · ${item.minutes} мин`));
    });
    root.append(choices);
    root.append(el('section',{class:'iw-brief'},
      el('div',{},el('p',{class:'iw-eyebrow'},data.kicker),el('h2',{class:'iw-case-title',tabindex:'-1'},data.title),el('p',{},data.summary),el('p',{class:'iw-objective'},data.objective),
        button('Открыть стартовый источник',()=>openSource(data.evidence.find(source=>source.requires.length===0).id),'iw-button iw-primary')),
      el('aside',{class:'iw-outcome'},el('span',{class:'iw-eyebrow'},'НАВЫК ПОСЛЕ ДЕЛА'),el('strong',{},data.skill),el('p',{class:'iw-small'},'Открывайте документы и отмечайте основания. Правильный вариант без нужных источников ещё не завершает проверку.'),link('Полное задание',data.lab))));
    root.append(el('div',{class:'iw-progress'},el('strong',{},`Открыто источников: ${progress.opened}/${data.evidence.length}`),
      el('progress',{max:progress.total,value:progress.correct,'aria-label':`Обосновано ${progress.correct} из ${progress.total} выводов`}),el('span',{},`Выводы: ${progress.correct}/${progress.total}`)));
    const workspace=el('div',{class:'iw-workspace'}),board=el('section',{class:'iw-board','aria-label':'Источники для проверки'},el('h3',{},'1. Выбери следующую проверку'),el('p',{class:'iw-small'},'Некоторые источники появятся после чтения связанных документов. Открытие карточки не подтверждает написанное в ней.'));
    for(const source of data.evidence){
      const available=canOpen(data,saved,source.id),opened=saved.opened.includes(source.id);
      const item=button('',()=>openSource(source.id),`iw-source${activeSource===source.id?' is-selected':''}`,{disabled:!available,'aria-pressed':activeSource===source.id});
      item.append(el('span',{class:'iw-source-meta'},source.id+' · '+source.type),el('strong',{},source.title),
        el('span',{class:'iw-small'},opened?'Открыт · перечитать':available?'Открыть источник':`Сначала: ${source.requires.filter(id=>!saved.opened.includes(id)).join(', ')}`));
      board.append(item);
    }
    const reader=el('section',{class:'iw-reader','aria-busy':loading,'aria-label':'Просмотр источника'});
    const source=data.evidence.find(e=>e.id===activeSource);
    reader.append(el('h3',{class:'iw-reader-title',tabindex:'-1'},source?`${source.id} · ${source.title}`:'Открой первый источник слева'));
    if(source){
      reader.append(link('Открыть полную страницу источника',source.url));
      if(loading)reader.append(el('p',{role:'status'},'Загружаем учебный документ…'));
      else if(readerError)reader.append(el('p',{class:'iw-error',role:'alert'},readerError),button('Повторить загрузку',()=>openSource(source.id)));
      else reader.append(el('p',{class:'iw-small'},source.summary),el('pre',{class:'iw-source-text'},readerText));
    }else reader.append(el('p',{},'Здесь будет текст исходного документа, включая ID и дату. Скопируй важную цитату в рабочие заметки, затем проверь, поддерживает ли она твою версию.'));
    workspace.append(board,reader);root.append(workspace);
    const notes=el('textarea',{id:'iw-notes',maxlength:'6000',rows:'5',value:saved.notes,
      placeholder:'Источник → точная цитата → что подтверждает → что ещё проверить',
      oninput:event=>{saved.notes=event.target.value;persist();}});
    root.append(el('section',{class:'iw-notebook'},el('label',{for:'iw-notes'},'Рабочие заметки'),notes,
      el('p',{class:'iw-small'},'До 6000 символов на дело. Свободный текст не оценивается автоматически. Записи хранятся только в этом браузере; скачайте копию для сохранности.')));
    const conclusions=el('section',{class:'iw-conclusions','aria-label':'Проверка выводов'},el('h3',{},'2. Обоснуй выводы'),
      el('p',{},'Для каждого вывода выбери ответ и решающие источники. Отмечай только нужный набор: выбор всех документов не заменяет обоснование.'));
    data.questions.forEach((q,index)=>conclusions.append(questionCard(data,saved,q,index)));
    root.append(conclusions);
    if(progress.complete)root.append(el('section',{class:'iw-complete'},el('h3',{},'Все контрольные выводы обоснованы'),
      el('p',{},'Ты сопоставил ответы с решающими источниками. Теперь сравни свой ход проверки с полным разбором и сохрани записи. Это результат учебного дела, не оценка профессиональной квалификации.'),
      link('Открыть полный разбор',data.solution,'iw-button iw-primary'),button('Скачать свои записи',exportNotes)));
    root.append(el('footer',{class:'iw-footer'},link('Реальные запуски инструментов','../resources/toolkit/'),link('Практический маршрут','../practice/fieldwork/'),link('60 заданий на повторение','../trainer/'),
      el('p',{class:'iw-small'},'Этот экран работает с учебными документами. Он не запускает Sherlock, Maigret или другие программы. Их собственные команды и результаты вы получите в лабораторных.')));
  }
  function questionCard(data,saved,q,index){
    const answer=saved.answers[q.id],result=grade(data,saved,q.id);
    const card=el('form',{class:'iw-question',onsubmit:event=>{
      event.preventDefault();answer.submitted=true;persist();render();focus(`#feedback-${q.id}`);
    }});
    card.append(el('h4',{},`${index+1}. ${q.prompt}`));
    const options=el('fieldset',{},el('legend',{},'Твой вывод'));
    for(const option of q.options){
      options.append(el('label',{class:'iw-option'},el('input',{type:'radio',name:q.id,value:option.id,checked:answer.choice===option.id,
        onchange:()=>{answer.choice=option.id;answer.submitted=false;persist();render();focus(`#choice-${q.id}-${option.id}`);},id:`choice-${q.id}-${option.id}`}),option.text));
    }
    card.append(options);
    const cites=el('fieldset',{class:'iw-citations'},el('legend',{},'Решающие источники'));
    const opened=data.evidence.filter(e=>saved.opened.includes(e.id));
    if(!opened.length)cites.append(el('p',{class:'iw-small'},'Сначала открой хотя бы один источник. Сюда попадут прочитанные карточки.'));
    for(const source of opened){
      const id=`cite-${q.id}-${source.id}`;
      cites.append(el('label',{},el('input',{id,type:'checkbox',checked:answer.cited.includes(source.id),onchange:event=>{
        answer.cited=event.target.checked?[...new Set([...answer.cited,source.id])]:answer.cited.filter(value=>value!==source.id);
        answer.submitted=false;persist();render();focus(`#${id}`);
      }}),el('span',{},`${source.id} · ${source.title}`)));
    }
    card.append(cites,el('button',{type:'submit',class:'iw-button iw-primary',disabled:!answer.choice||!answer.cited.length},'Проверить основания'),
      el('details',{class:'iw-hint'},el('summary',{},'Подсказка'),el('p',{},q.hint)));
    if(answer.submitted){
      const feedback=el('div',{id:`feedback-${q.id}`,class:`iw-feedback ${result.correct?'is-correct':'is-retry'}`,tabindex:'-1',role:'status'},
        el('strong',{},result.correct?'Вывод подтверждён выбранными источниками':!result.choiceCorrect?'Вернись к источникам и пересмотри вывод':'Вывод подходит; проверь набор оснований'));
      feedback.append(el('p',{},result.correct?q.explanation:!result.choiceCorrect?'Содержание корпуса не поддерживает выбранную формулировку. Проверь, не сделан ли вывод шире, чем позволяет документ.':'В выбранном наборе не хватает решающего источника или есть лишний. Сопоставь вопрос с происхождением, датой и ID каждой карточки.'));
      card.append(feedback);
    }
    return card;
  }
  render();
}
