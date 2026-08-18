(()=>{
  const $=q=>document.querySelector(q);
  const $$=q=>[...document.querySelectorAll(q)];

  const pre=$('#demonPreEntry');
  const tour=$('#demonTutorial');
  const card=$('#tutorialCard');
  const spot=$('#tutorialSpotlight');

  if(!pre||!tour)return;

  const PRE_KEY='demon_preentry_v103';
  const TOUR_KEY='demon_tour_v103';

  let tourIndex=0;
  let bgMode=localStorage.getItem('demon_bg_mode')||'animated';

  function setPageLock(on){
    document.documentElement.classList.toggle('demon-tour-open',on);
    document.body.classList.toggle('demon-tour-open',on);
  }

  function applyBg(){
    document.body.classList.toggle('demon-solid-mode',bgMode==='solid');
  }
  applyBg();

  $$('.pre-choice').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.bgMode===bgMode);
    btn.addEventListener('click',()=>{
      bgMode=btn.dataset.bgMode;
      $$('.pre-choice').forEach(x=>x.classList.toggle('active',x===btn));
      applyBg();
    });
  });

  const language=$('#preLanguage');
  if(language)language.value=localStorage.getItem('demon_lang')||'it';

  function openPre(force=false){
    if(!force && localStorage.getItem(PRE_KEY)==='1')return false;

    setPageLock(true);
    pre.classList.remove('hidden');
    pre.setAttribute('aria-hidden','false');

    $('#preStepOne')?.classList.remove('hidden');
    $('#preStepTwo')?.classList.add('hidden');

    if($('#preProgressFill'))$('#preProgressFill').style.width='50%';

    requestAnimationFrame(()=>$('#preNext')?.focus());
    return true;
  }

  function closePre(){
    pre.classList.add('hidden');
    pre.setAttribute('aria-hidden','true');
  }

  $('#preNext')?.addEventListener('click',()=>{
    localStorage.setItem('demon_lang',language?.value||'it');
    localStorage.setItem('demon_bg_mode',bgMode);

    const siteLanguage=$('#languageSelect');
    if(siteLanguage && language){
      siteLanguage.value=language.value;
      siteLanguage.dispatchEvent(new Event('change',{bubbles:true}));
    }

    $('#preStepOne')?.classList.add('hidden');
    $('#preStepTwo')?.classList.remove('hidden');

    if($('#preProgressFill'))$('#preProgressFill').style.width='100%';
    $('#preEnter')?.focus();
  });

  $('#preEnter')?.addEventListener('click',()=>{
    localStorage.setItem(PRE_KEY,'1');
    closePre();
    openTour(true);
  });

  const steps=[
    {
      title:'Benvenuto su Demon Leaks',
      text:'Ti mostro come usare il sito. Durante questa guida lo sfondo non è cliccabile: usa Avanti e Indietro.',
      target:null
    },
    {
      title:'Ricerca',
      text:'Qui puoi cercare velocemente script, MLO, veicoli e pack.',
      target:'#modernSearch'
    },
    {
      title:'Ordina e filtra',
      text:'Qui puoi ordinare le risorse per data, prezzo o nome.',
      target:'#sortSelect'
    },
    {
      title:'Categorie',
      text:'Da questa barra scegli la sezione dello store che vuoi visualizzare.',
      target:'#sidebar'
    },
    {
      title:'Panoramica store',
      text:'Questi riquadri mostrano i dati principali del catalogo.',
      target:'#stats'
    },
    {
      title:'Le risorse',
      text:'Clicca una risorsa per aprire la sua scheda completa con video, download, preferiti e carrello.',
      target:'#products'
    },
    {
      title:'Carrello',
      text:'Qui trovi le risorse Premium che vuoi acquistare.',
      target:'#cartBtn'
    },
    {
      title:'Il tuo account',
      text:'Dopo il login Discord questo pulsante mostra il tuo account e il tuo nome Discord.',
      target:'#discordAuthBtn'
    },
    {
      title:'Sei pronto',
      text:'La guida è terminata. Puoi riaprirla in qualsiasi momento dal pulsante “Guida sito” nell’header.',
      target:'#headerGuideBtn'
    }
  ];

  async function position(){
    const step=steps[tourIndex];

    $('#tutorialCounter').textContent=`${tourIndex+1} / ${steps.length}`;
    $('#tutorialTitle').textContent=step.title;
    $('#tutorialText').textContent=step.text;
    $('#tutorialBack').style.visibility=tourIndex?'visible':'hidden';
    $('#tutorialNext span').textContent=tourIndex===steps.length-1?'Fine ✓':'Avanti →';

    card.style.removeProperty('bottom');

    if(!step.target){
      spot.classList.add('hidden');
      card.classList.add('tutorial-centered');
      card.style.removeProperty('left');
      card.style.removeProperty('top');
      card.style.removeProperty('width');
      return;
    }

    const target=$(step.target);

    if(!target || getComputedStyle(target).display==='none'){
      spot.classList.add('hidden');
      card.classList.add('tutorial-centered');
      return;
    }

    target.scrollIntoView({
      behavior:'smooth',
      block:'center',
      inline:'nearest'
    });

    await new Promise(resolve=>setTimeout(resolve,360));

    const rect=target.getBoundingClientRect();
    const pad=9;

    card.classList.remove('tutorial-centered');
    spot.classList.remove('hidden');

    spot.style.left=`${Math.max(8,rect.left-pad)}px`;
    spot.style.top=`${Math.max(8,rect.top-pad)}px`;
    spot.style.width=`${Math.max(20,Math.min(innerWidth-16,rect.width+pad*2))}px`;
    spot.style.height=`${Math.max(20,Math.min(innerHeight-16,rect.height+pad*2))}px`;

    if(innerWidth<640){
      card.style.left='12px';
      card.style.width='calc(100vw - 24px)';

      if(rect.top+rect.height/2<innerHeight/2){
        card.style.top='auto';
        card.style.bottom='12px';
      }else{
        card.style.bottom='auto';
        card.style.top='76px';
      }

      return;
    }

    const cardWidth=Math.min(390,innerWidth-28);
    card.style.width=`${cardWidth}px`;
    card.style.left=`${Math.min(innerWidth-cardWidth-14,Math.max(14,rect.left))}px`;

    const below=rect.bottom+18;
    card.style.top=`${below+245<innerHeight ? below : Math.max(76,rect.top-255)}px`;
  }

  function openTour(force=false){
    if(!force && localStorage.getItem(TOUR_KEY)==='1'){
      setPageLock(false);
      return;
    }

    closePre();
    tourIndex=0;
    setPageLock(true);

    tour.classList.remove('hidden');
    tour.setAttribute('aria-hidden','false');

    position().then(()=>$('#tutorialNext')?.focus());
  }

  function closeTour(){
    localStorage.setItem(TOUR_KEY,'1');

    tour.classList.add('hidden');
    tour.setAttribute('aria-hidden','true');
    spot.classList.add('hidden');

    setPageLock(false);

    // Defensive cleanup: the old versions used inert. Remove any stale
    // attribute left by a cached/older script so the UI can never stay frozen.
    document.querySelectorAll('[inert]').forEach(el=>el.removeAttribute('inert'));
  }

  $('#tutorialNext')?.addEventListener('click',()=>{
    if(tourIndex<steps.length-1){
      tourIndex++;
      position();
    }else{
      closeTour();
    }
  });

  $('#tutorialBack')?.addEventListener('click',()=>{
    if(tourIndex>0){
      tourIndex--;
      position();
    }
  });

  function replayGuide(){
    localStorage.removeItem(TOUR_KEY);
    openTour(true);
  }

  $('#tutorialReplay')?.addEventListener('click',replayGuide);
  $('#headerGuideBtn')?.addEventListener('click',replayGuide);

  addEventListener('resize',()=>{
    if(!tour.classList.contains('hidden'))position();
  });

  addEventListener('pageshow',()=>{
    if(pre.classList.contains('hidden') && tour.classList.contains('hidden')){
      setPageLock(false);
      document.querySelectorAll('[inert]').forEach(el=>el.removeAttribute('inert'));
    }
  });

  // New V10.3 keys intentionally make the pre-entry/tour appear once again
  // after this update, useful for the requested onboarding.
  if(localStorage.getItem(PRE_KEY)!=='1'){
    setTimeout(()=>openPre(false),260);
  }else if(localStorage.getItem(TOUR_KEY)!=='1'){
    setTimeout(()=>openTour(false),430);
  }else{
    setPageLock(false);
  }
})();