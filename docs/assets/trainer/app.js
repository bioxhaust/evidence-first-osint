// MIT — browser UI. Exercise content is original CC BY 4.0.
import {units} from './lessons.js';
import {STORAGE_KEY,sanitizeProgress,mergeProgress,recordAnswer,grade,unitComplete,optionalUnit,nextRequiredUnit,unlocked,streak} from './progress.js';
import {cloudConfig} from './config.js';
import {createCloud} from './cloud.js';
import {createProgressSession} from './session-state.js';

const root=document.getElementById('osint-trainer');
if(root)start();
function start(){
  const all=units.flatMap(unit=>unit.exercises.map(exercise=>({unit,exercise})));
  const ids=all.map(item=>item.exercise.id);
  const cloud=createCloud(cloudConfig);
  let storage;try{storage=window.localStorage;}catch{storage=null;}
  const localProgress=createProgressSession(storage,ids);
  let state=localProgress.read(),session=null,screen='path',active=null,feedback=null,busy=false,syncing=false,syncQueued=false;
  let sessionVerified=false,syncJob=null,signingOut=false;
  let notice='',syncStatus='',authMode='signin',storageProblem=false;
  function el(tag,attrs={},...children){
    const node=document.createElement(tag);
    for(const [key,value]of Object.entries(attrs)){
      if(key==='class')node.className=value;
      else if(key.startsWith('on'))node.addEventListener(key.slice(2),value);
      else if(key==='text')node.textContent=value;
      else if(value!==false&&value!=null)node.setAttribute(key,value===true?'':String(value));
    }
    for(const child of children.flat(Infinity))if(child!=null)node.append(typeof child==='string'?document.createTextNode(child):child);
    return node;
  }
  function button(text,fn,className='ef-button',extra={}){return el('button',{type:'button',class:className,onclick:fn,...extra},text);}
  function link(text,href,className='ef-text-link'){return el('a',{href,class:className},text);}
  function persistLocal(){const result=localProgress.write(state);state=result.state;storageProblem=!result.persisted;}
  function save(){persistLocal();if(session)scheduleSync();}
  function applySession(next,verified){
    const changed=(session?.user.id||null)!==(next?.user.id||null);
    if(changed){
      persistLocal();localProgress.switchTo(next?.user.id);state=localProgress.read();
      active=null;feedback=null;if(screen==='exercise')screen='path';
      sessionVerified=false;syncStatus='';syncJob=null;syncing=false;syncQueued=false;
    }
    session=next;if(verified!==undefined)sessionVerified=verified;
    return changed;
  }
  function captureDraft(){
    const form=root.querySelector('.ef-answer-form');
    if(!form||!localProgress.isCurrent(form.efScope))return;
    const values=new FormData(form);
    // Disabled controls disappear from FormData after a correct answer.
    if(!form.querySelector('input:disabled'))localProgress.setDraft(form.dataset.exerciseId,form.dataset.exerciseType==='number'?String(values.get('number')||''):values.getAll('answer'));
  }
  function focusMain(){root.querySelector('[data-ef-focus]')?.focus({preventScroll:true});}
  function go(next){screen=next;feedback=null;notice='';render();focusMain();}
  function render(){
    captureDraft();
    const focused=root.contains(document.activeElement)?document.activeElement:null;
    const focusId=focused?.id,focusName=focused?.name,focusValue=focused?.value;
    const selection=focused&&typeof focused.selectionStart==='number'?[focused.selectionStart,focused.selectionEnd]:null;
    root.replaceChildren();root.className='ef-app';
    const done=units.filter(unit=>unitComplete(unit,state)).length;
    root.append(el('header',{class:'ef-app-header'},
      link('EVIDENCE / FIRST','../','ef-wordmark'),
      el('div',{class:'ef-stats'},el('span',{},el('strong',{},String(state.completed.length*10)),' XP'),el('span',{},'Дней подряд: ',el('strong',{},String(streak(state))))),
      button(session?'Аккаунт':cloud.configured?'Войти':'Профиль',()=>go('account'),'ef-button ef-button-small')));
    if(notice)root.append(el('div',{class:'ef-notice',role:'status'},notice));
    if(session&&screen!=='account'&&syncStatus)root.append(el('p',{id:'ef-sync-status',class:'ef-small',role:'status'},syncStatus));
    if(storageProblem)root.append(el('p',{class:'ef-alert',role:'alert'},'Браузер запретил сохранение. Прогресс действует до закрытия страницы; скачайте копию в профиле.'));
    if(screen==='path')renderPath(done);
    else if(screen==='exercise')renderExercise();
    else if(screen==='review')renderReview();
    else renderAccount();
    root.append(el('nav',{class:'ef-bottom-nav','aria-label':'Разделы тренажёра'},
      button('Путь',()=>go('path'),'ef-nav-button',{'aria-current':screen==='path'?'page':null}),
      button(`Повторить${state.mistakes.length?' · '+state.mistakes.length:''}`,()=>go('review'),'ef-nav-button',{'aria-current':screen==='review'?'page':null}),
      button('Профиль',()=>go('account'),'ef-nav-button',{'aria-current':screen==='account'?'page':null})));
    const replacement=focusId?document.getElementById(focusId):focusName?[...root.querySelectorAll('input')].find(input=>input.name===focusName&&input.value===focusValue):null;
    if(replacement&&root.contains(replacement)){replacement.focus({preventScroll:true});if(selection&&replacement.setSelectionRange)replacement.setSelectionRange(...selection);}
  }
  function renderPath(done){
    const next=nextRequiredUnit(units,state);
    const core=units.filter(unit=>!optionalUnit(unit)),coreDone=core.filter(unit=>unitComplete(unit,state)).length;
    const optionalNext=units.findIndex(unit=>optionalUnit(unit)&&!unitComplete(unit,state));
    const startIndex=next>=0?next:optionalNext>=0?optionalNext:0;
    root.append(el('section',{class:'ef-path-hero'},
      el('div',{},el('p',{class:'ef-kicker'},'ПРАКТИКА С ПЕРВОГО ШАГА'),
        el('h1',{tabindex:'-1','data-ef-focus':true},done?'Закрепим находки.':'Сначала найди. Затем проверь себя.'),
        el('p',{class:'ef-lead'},'Открой исходные страницы, найди нужный профиль и сохрани доказательство. Здесь можно закрепить решения короткими заданиями и повторить ошибки.'),
        link('Открыть лабораторию расследований','../investigator/','ef-button ef-primary'),
        button(next<0?(optionalNext>=0?'Основной путь пройден · к Python':'Повторить задания'):done?'Продолжить тренажёр':'Перейти к проверочным заданиям',()=>beginUnit(startIndex),'ef-button'),
        el('p',{class:'ef-small'},'Первое дело — браузер и заметки. Тренажёр — 60 заданий; XP не заменяют самостоятельное расследование.')),
      el('aside',{class:'ef-mission'},el('span',{class:'ef-mission-label'},'САМОСТОЯТЕЛЬНОЕ ДЕЛО'),el('strong',{},'Какой профиль нужен?'),el('p',{},'Три кандидата, исходная страница и изменившийся username. Открой источники и обоснуй выбор.'),link('Все три расследования и инструменты','../practice/fieldwork/'),el('p',{class:'ef-small'},'Персонажи вымышлены. У каждого дела есть подсказки и отдельный разбор.'))));
    const progress=el('progress',{max:units.length,value:done,'aria-label':`Пройдено ${done} из ${units.length} тренировок`});
    root.append(el('section',{class:'ef-path-summary'},el('strong',{},`Ваш путь: ${done} / ${units.length}`),progress,el('span',{class:'ef-small'},`Основной путь: ${coreDone} / ${core.length}. Python — по желанию. XP отражают выполненные задания, а не профессиональную квалификацию.`)));
    const layout=el('div',{class:'ef-path-layout'}),path=el('div',{class:'ef-path'});
    let section='';
    units.forEach((unit,index)=>{
      if(unit.section!==section){section=unit.section;path.append(el('h2',{class:'ef-section-title'},section));}
      const complete=unitComplete(unit,state),available=unlocked(units,state,index);
      const achieved=unit.exercises.filter(e=>state.completed.includes(e.id)).length;
      const label=complete?'Пройдено':available?'Доступно':'После предыдущей тренировки';
      path.append(el('article',{class:`ef-unit ${complete?'is-complete':available?'is-current':'is-locked'}`},
        el('div',{class:'ef-unit-number','aria-hidden':'true'},complete?'✓':String(index+1).padStart(2,'0')),
        el('div',{class:'ef-unit-info'},el('h3',{},unit.title),el('p',{},`${unit.minutes} мин · ${achieved}/${unit.exercises.length} заданий${optionalUnit(unit)?' · по желанию':''}`),el('span',{class:'ef-small'},label)),
        available?button(complete?'Ещё раз':'Открыть',()=>beginUnit(index),'ef-button ef-button-small'):el('span',{class:'ef-lock','aria-label':'Закрыто'},'Позже')));
    });
    const side=el('aside',{class:'ef-path-aside'},el('h2',{},'Учимся руками'),el('p',{},'Запустите Sherlock и Maigret, извлеките метаданные ExifTool и кадры FFmpeg. В лабораторной сохраните собственный вывод и проверьте ошибки инструмента.'),link('Инструменты и пошаговые запуски','../resources/toolkit/'),el('hr'),el('h3',{},'Три самостоятельных дела'),el('p',{},'Найдите профиль, проверьте биографию, разберитесь в авторстве проекта. С каждым делом порядок проверки всё больше выбираете вы.'),link('Открыть практический маршрут','../practice/fieldwork/'),el('hr'),el('h3',{},'Не потеряйте прогресс'),el('p',{},session?(sessionVerified?'Вход подтверждён. Синхронизируем только результаты учебных заданий.':'Показана локальная копия аккаунта. Вход ещё не подтверждён; можно продолжать практику в этом браузере.'):'Без входа прогресс хранится в этом браузере. В профиле можно скачать резервную копию.'),button(session?'Проверить синхронизацию':'Вход и синхронизация',()=>go('account'),'ef-button ef-button-small'));
    layout.append(path,side);root.append(layout);
    root.append(el('p',{class:'ef-footnote'},'Подробные материалы доступны без блокировок: ',link('карта курса','../lessons/'),'. Ограничение шагов относится только к последовательности тренажёра.'));
  }
  function beginUnit(index){
    const unit=units[index];const first=unit.exercises.findIndex(ex=>!state.completed.includes(ex.id));
    // Opening completed work starts a new attempt; unfinished work keeps its draft.
    for(const exercise of unit.exercises)if(state.completed.includes(exercise.id))localProgress.clearDraft(exercise.id);
    active={queue:unit.exercises.map(exercise=>({unit,exercise})),position:first<0?0:first,reviewMode:false,index};feedback=null;screen='exercise';render();focusMain();
  }
  function renderExercise(){
    if(!active){go('path');return;}
    const {unit,exercise}=active.queue[active.position];
    root.append(el('div',{class:'ef-exercise-top'},button('← К пути',()=>go(active.reviewMode?'review':'path'),'ef-text-button'),el('span',{},`${active.reviewMode?'Повторение':unit.title} · ${active.position+1}/${active.queue.length}`)));
    if(optionalUnit(unit)&&!active.reviewMode)root.append(el('p',{class:'ef-small'},'Python — дополнительная практика. ',button('Продолжить основной путь без Python',()=>{
      const next=nextRequiredUnit(units,state,active.index);
      if(next>=0)beginUnit(next);else{go('path');notice='Основной путь пройден. К Python можно вернуться позже; пропуск не начисляет XP.';render();}
    },'ef-text-button')));
    root.append(el('progress',{class:'ef-exercise-progress',value:active.position,max:active.queue.length,'aria-label':'Прогресс текущей тренировки'}));
    const card=el('section',{class:'ef-exercise-card'});
    card.append(el('p',{class:'ef-kicker'},active.reviewMode?'ЗАКРЕПЛЯЕМ МЕТОД':'ВАША ЗАДАЧА'),el('h1',{tabindex:'-1','data-ef-focus':true},exercise.title),el('p',{class:'ef-prompt'},exercise.prompt));
    const briefing=el('details',{class:'ef-briefing'},el('summary',{},'Коротко о методе'),...unit.briefing.map(p=>el('p',{},p)));
    card.append(briefing);
    const evidence=el('div',{class:'ef-evidence','aria-label':'Данные для решения'});
    for(const item of exercise.evidence)evidence.append(el('div',{class:'ef-evidence-item'},el('strong',{},item.label),el('p',{},item.text)));
    card.append(evidence);
    const form=el('form',{class:'ef-answer-form','data-exercise-id':exercise.id,'data-exercise-type':exercise.type});form.efScope=localProgress.token();
    const fieldset=el('fieldset',{},el('legend',{},exercise.type==='multi'?'Выберите все подходящие ответы':exercise.type==='number'?'Введите число':'Выберите один ответ'));
    if(exercise.type==='number'){
      fieldset.append(el('label',{for:'ef-number',class:'ef-input-label'},'Ответ числом'),el('input',{id:'ef-number',name:'number',type:'text',inputmode:'numeric',autocomplete:'off',required:true,'aria-describedby':'ef-number-help',disabled:!!feedback?.correct}),el('p',{id:'ef-number-help',class:'ef-small'},'Целое число. Пробелы между тысячами допустимы.'));
    }else{
      exercise.options.forEach(option=>fieldset.append(el('label',{class:'ef-option'},el('input',{type:exercise.type==='multi'?'checkbox':'radio',name:'answer',value:option.id,disabled:!!feedback?.correct}),el('span',{},option.text))));
    }
    form.append(fieldset);
    const draft=localProgress.draft(exercise.id);
    if(exercise.type==='number')form.elements.number.value=typeof draft==='string'?draft:'';
    else for(const input of form.querySelectorAll('input[name="answer"]'))input.checked=Array.isArray(draft)&&draft.includes(input.value);
    form.addEventListener('input',captureDraft);form.addEventListener('change',captureDraft);
    const status=el('div',{class:'ef-feedback-region','aria-live':'polite','aria-atomic':'true'});
    if(feedback){status.append(el('div',{class:`ef-feedback ${feedback.correct?'is-right':'is-wrong'}`},el('strong',{},feedback.correct?'Верно. Вывод опирается на данные.':'Есть ошибка. Проверьте доказательства.'),el('p',{},exercise.explanation)));
      if(!feedback.correct)status.append(el('p',{class:'ef-small'},'Задание добавлено в повторение. Ошибка не отнимает прогресс; попробуйте ещё раз.'));
    }
    form.append(status);
    const submit=el('button',{type:'submit',class:'ef-button ef-primary'},feedback?.correct?'Дальше':'Проверить ответ');
    form.append(el('div',{class:'ef-answer-actions'},submit,el('details',{class:'ef-hint'},el('summary',{},'Подсказка'),el('p',{},exercise.hint))));
    form.addEventListener('submit',event=>{
      event.preventDefault();
      if(feedback?.correct){nextExercise();return;}
      const data=new FormData(form);const answer=exercise.type==='number'?String(data.get('number')||''):data.getAll('answer');
      if((Array.isArray(answer)&&!answer.length)||(!Array.isArray(answer)&&!answer.trim())){
        status.replaceChildren(el('p',{class:'ef-alert',role:'alert'},'Сначала выберите или введите ответ.'));return;
      }
      const correct=grade(exercise,answer);
      localProgress.setDraft(exercise.id,answer);
      state=recordAnswer(state,exercise.id,correct,{reviewMode:active.reviewMode});save();feedback={correct,answer};render();
      const result=root.querySelector('.ef-feedback');result.tabIndex=-1;result.focus({preventScroll:false});
    });
    card.append(form);
    card.append(el('div',{class:'ef-practice-links'},link('Разобрать метод',unit.lesson),link('Выполнить лабораторную',unit.lab),link('Открыть исходные данные',exercise.source)));
    root.append(card);
  }
  function nextExercise(){
    if(active.position+1<active.queue.length){active.position++;feedback=null;render();focusMain();return;}
    const previous=active;active=null;screen='path';feedback=null;
    notice=previous.reviewMode?'Повторение завершено. Ошибки, которые вы исправили, убраны из очереди.':`Тренировка «${previous.queue[0].unit.title}» пройдена. Откройте лабораторную, чтобы применить метод к файлам и инструментам.`;
    render();focusMain();
  }
  function renderReview(){
    root.append(el('section',{class:'ef-simple-page'},el('p',{class:'ef-kicker'},'ОШИБКИ — ЧАСТЬ ОБУЧЕНИЯ'),el('h1',{tabindex:'-1','data-ef-focus':true},'Закрепим слабые места'),el('p',{},'Здесь появляются задания, в которых был неверный ответ. Исправление в первом уроке сохраняет их для ещё одной попытки. Правильный ответ в повторении убирает задание из очереди.')));
    const pending=all.filter(({exercise})=>state.mistakes.includes(exercise.id));
    if(!pending.length){root.append(el('div',{class:'ef-completion'},el('strong',{},'Очередь ошибок пуста'),el('p',{},'Можно повторить любую пройденную тренировку. Повторные ответы не начисляют XP заново.'),button('Вернуться к пути',()=>go('path'),'ef-button ef-primary')));return;}
    root.append(button(`Заданий для повторения: ${pending.length}`,()=>{for(const {exercise}of pending)localProgress.clearDraft(exercise.id);active={queue:pending,position:0,reviewMode:true};screen='exercise';feedback=null;render();focusMain();},'ef-button ef-primary'));
    const list=el('ul',{class:'ef-review-list'});pending.forEach(({unit,exercise})=>list.append(el('li',{},el('strong',{},exercise.title),el('span',{},unit.title))));root.append(list);
  }
  function renderAccount(){
    root.append(el('section',{class:'ef-simple-page'},el('p',{class:'ef-kicker'},'ВАШЕ ОБУЧЕНИЕ'),el('h1',{tabindex:'-1','data-ef-focus':true},'Профиль и прогресс')));
    const account=el('section',{class:'ef-account-card'});
    if(session){
      account.append(el('h2',{},session.user.email||'Аккаунт'),el('p',{},sessionVerified?'Вход подтверждён.':'Локальная копия аккаунта. Вход пока не подтверждён; результаты сохраняются в этом браузере.'),el('p',{id:'ef-sync-status',role:'status'},syncStatus||'Можно проверить соединение и синхронизировать прогресс.'),button('Синхронизировать',()=>syncProgress(),'ef-button ef-primary',{disabled:syncing}),button('Выйти',async()=>{
        signingOut=true;
        const pending=cloud.signOut(),guestToken=localProgress.token();
        try{await pending;if(localProgress.isCurrent(guestToken))notice='Вы вышли. Показан гостевой прогресс этого браузера.';}
        catch(error){if(localProgress.isCurrent(guestToken))notice=!cloud.session()?`Вы вышли на этом устройстве. Показан гостевой прогресс; завершение сессии на сервере не подтверждено. ${error.message||''}`:error.message;}
        finally{signingOut=false;if(localProgress.isCurrent(guestToken)){if(!cloud.session())applySession(null);render();}}
      },'ef-button'),el('p',{class:'ef-small'},'В облако отправляются только ID заданий, попытки и даты практики. Данные исследуемых людей и ваши пароли не записываются в прогресс.'));
    }else if(!cloud.configured){
      account.append(el('h2',{},'Вход и синхронизация'),el('p',{},'Сервис аккаунтов ещё не подключён владельцем курса. Сейчас работает гостевая практика; вход и перенос прогресса между устройствами станут доступны после настройки.'),el('p',{class:'ef-small'},'Гостевой прогресс сохраняется в этом браузере. До подключения аккаунтов используйте резервную копию ниже.'));
    }else{
      account.append(el('h2',{},'Войти и продолжить'));
      if(cloudConfig.authMethods?.includes('github')){
        account.append(button('Войти через GitHub',async()=>{try{save();const url=await cloud.signInWithGitHub();window.location.assign(url);}catch(error){notice=error.message;render();}},'ef-button ef-primary'),el('p',{class:'ef-small'},'GitHub подтверждает ваш вход. Репозитории и данные ваших исследований тренажёру не нужны. В аккаунте хранится только учебный прогресс.'));
      }
      if(cloudConfig.authMethods?.includes('email')){
      const form=el('form',{class:'ef-auth-form'});
      form.append(el('label',{for:'ef-email'},'Email'),el('input',{id:'ef-email',name:'email',type:'email',autocomplete:'email',required:true}),el('label',{for:'ef-password'},'Пароль'),el('input',{id:'ef-password',name:'password',type:'password',autocomplete:authMode==='signup'?'new-password':'current-password',minlength:12,required:true}),el('p',{class:'ef-small'},'Минимум 12 символов. Пароль отправляется напрямую сервису Supabase Auth; сайт его не сохраняет.'),el('button',{type:'submit',class:'ef-button ef-primary',disabled:busy},busy?'Подключаем…':authMode==='signup'?'Создать аккаунт':'Войти'));
      form.addEventListener('submit',async event=>{
        event.preventDefault();if(busy)return;const values=new FormData(form);busy=true;const send=form.querySelector('button[type="submit"]');send.disabled=true;send.textContent='Подключаем…';
        const guest=mergeProgress(state,localProgress.read(STORAGE_KEY),ids);
        try{
          if(authMode==='signup'){
            const result=await cloud.signUp(String(values.get('email')),String(values.get('password')));
            if(result.requiresEmailConfirmation){notice='Откройте письмо подтверждения. Затем вернитесь и войдите с паролем.';authMode='signin';}
            else await adoptSession(guest);
          }else{await cloud.signIn(String(values.get('email')),String(values.get('password')));await adoptSession(guest);}
        }catch(error){notice=error.message||'Не удалось войти. Проверьте соединение и попробуйте ещё раз.';}
        finally{busy=false;form.reset();render();focusMain();}
      });
      account.append(form,button(authMode==='signup'?'Уже есть аккаунт':'Создать новый аккаунт',()=>{authMode=authMode==='signup'?'signin':'signup';notice='';render();},'ef-text-button'));
      }
    }
    root.append(account);
    const backup=el('section',{class:'ef-account-card'},el('h2',{},'Резервная копия'),el('p',{},'Скачайте небольшой JSON с результатами тренировки. Импорт объединяет выполненные задания с текущим прогрессом.'),button('Скачать прогресс',exportProgress,'ef-button'));
    const upload=el('input',{id:'ef-import',type:'file',accept:'.json,application/json'});
    upload.addEventListener('change',async()=>{const file=upload.files?.[0];if(!file)return;
      const token=localProgress.token();
      try{if(file.size>131072)throw new Error('Файл слишком большой: максимум 128 КБ.');const imported=sanitizeProgress(JSON.parse(await file.text()),ids);if(!localProgress.isCurrent(token))return;state=mergeProgress(state,imported,ids);save();notice='Прогресс из файла объединён.';}catch(error){if(!localProgress.isCurrent(token))return;notice=error.message||'Не удалось прочитать файл.';}render();});
    backup.append(el('label',{for:'ef-import',class:'ef-input-label'},'Импортировать сохранённый прогресс'),upload,el('p',{class:'ef-small'},'Не загружайте сюда отчёты о людях, фотографии или файлы инструментов — только экспорт этого тренажёра.'));
    root.append(backup,el('p',{class:'ef-footnote'},'Дни практики считаются по часам устройства. Синхронизация сохраняет выполненные задания; очередь повторения использует время последнего ответа. Это учебный прогресс, не экзамен и не сертификат.'));
  }
  function exportProgress(){const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=el('a',{href:url,download:'evidence-first-progress.json'});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function adoptSession(guest){
    const token=localProgress.token();
    const current=await cloud.getSession();
    if(!localProgress.isCurrent(token))return;
    if(!current)throw new Error('Сессия не получена. Подтвердите email и войдите ещё раз.');
    applySession(current,true);state=mergeProgress(state,guest,ids);persistLocal();
    notice='Вход выполнен. Гостевая практика объединена с аккаунтом.';
    await syncProgress();
  }
  function scheduleSync(){
    if(syncing){syncQueued=true;return;}
    const token=localProgress.token();
    queueMicrotask(()=>{if(localProgress.isCurrent(token))void syncProgress();});
  }
  async function syncProgress(){
    if(!session||!cloud.configured)return;if(syncing){syncQueued=true;return;}
    const job={token:localProgress.token(),userId:session.user.id};syncJob=job;syncing=true;syncStatus='Синхронизируем…';render();
    const current=()=>syncJob===job&&localProgress.isCurrent(job.token)&&session?.user.id===job.userId;
    try{
      for(let attempt=0;attempt<2;attempt++){
        const remote=await cloud.pull();if(!current())return;
        sessionVerified=true;if(remote)state=mergeProgress(state,remote,ids);persistLocal();render();
        try{const saved=await cloud.push(state);if(!current())return;if(saved)state=mergeProgress(state,saved,ids);break;}
        catch(error){if(!current())return;if(error.code!=='CONFLICT'||attempt===1)throw error;}
      }
      persistLocal();
      syncStatus='Сохранено в аккаунте. Можно продолжить на другом устройстве.';
    }catch(error){if(current())syncStatus=`${storageProblem?'Прогресс пока доступен только на странице.':'Локальный прогресс сохранён.'} Синхронизация не завершена: ${error.message||'нет соединения'}`;}
    finally{if(current()){
      syncing=false;syncJob=null;render();
      if(syncQueued){syncQueued=false;scheduleSync();}
    }}
  }
  window.addEventListener('online',()=>scheduleSync());
  window.addEventListener('storage',event=>{
    if(event.storageArea&&event.storageArea!==storage)return;
    const result=localProgress.reconcile(event,state);if(!result)return;
    state=result.state;storageProblem=!result.persisted;render();if(session)scheduleSync();
  });
  cloud.onAuthChanged(next=>{
    const hadSession=Boolean(session);
    if(applySession(next)){
      if(!next&&hadSession)notice=signingOut?'Вы вышли. Показан гостевой прогресс этого браузера.':'Сессия завершена. Показан гостевой прогресс; личная практика сохранена отдельно в этом браузере.';
      render();
    }
  });
  const initializationToken=localProgress.token();
  const oauthReturn=new URLSearchParams(window.location.search).has('code');
  render();
  void cloud.initialize().then(async existing=>{
    if(!oauthReturn&&!localProgress.isCurrent(initializationToken))return;
    if(existing){
      if(cloud.session()?.user.id!==existing.user.id)return;
      applySession(existing,true);
      if(oauthReturn){state=mergeProgress(state,localProgress.read(STORAGE_KEY),ids);persistLocal();notice='Вход выполнен. Гостевая практика объединена с аккаунтом.';}
      await syncProgress();
    }
    else if(cloud.confirmationReturned){screen='account';notice='Если email подтверждён, войдите с паролем, чтобы загрузить прогресс.';render();}
  }).catch(error=>{
    if(error.code==='SESSION_CHANGED')return;
    if(!localProgress.isCurrent(initializationToken))return;
    const cached=cloud.session();
    if(cached){applySession(cached,false);syncStatus=`Не удалось подтвердить вход. Локальная копия доступна. ${error.message||''}`;}
    else{notice=error.message||'Не удалось завершить вход. Попробуйте ещё раз.';screen='account';}
    render();
  });
}
