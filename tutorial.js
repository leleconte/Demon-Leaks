(()=>{
 const $=q=>document.querySelector(q),$$=q=>[...document.querySelectorAll(q)];
 const pre=$('#demonPreEntry'),tour=$('#demonTutorial'),card=$('#tutorialCard'),spot=$('#tutorialSpotlight');
 if(!pre||!tour)return;
 let tourIndex=0,bgMode=localStorage.getItem('demon_bg_mode')||'animated';
 const pageNodes=()=>[...document.body.children].filter(el=>![pre,tour].includes(el)&&el.tagName!=='SCRIPT');
 function blockPage(on){pageNodes().forEach(el=>{try{el.inert=on}catch{}});document.body.classList.toggle('demon-navigation-locked',on)}
 function applyBg(){document.body.classList.toggle('demon-solid-mode',bgMode==='solid')}
 applyBg();
 $$('.pre-choice').forEach(b=>{b.classList.toggle('active',b.dataset.bgMode===bgMode);b.onclick=()=>{bgMode=b.dataset.bgMode;$$('.pre-choice').forEach(x=>x.classList.toggle('active',x===b));applyBg()}});
 const lang=$('#preLanguage');lang.value=localStorage.getItem('demon_lang')||'it';
 function openPre(){blockPage(true);pre.classList.remove('hidden');pre.setAttribute('aria-hidden','false');$('#preStepOne').classList.remove('hidden');$('#preStepTwo').classList.add('hidden');$('#preProgressFill').style.width='50%';setTimeout(()=>$('#preNext').focus(),50)}
 $('#preNext').onclick=()=>{localStorage.setItem('demon_lang',lang.value);localStorage.setItem('demon_bg_mode',bgMode);const siteLang=$('#languageSelect');if(siteLang){siteLang.value=lang.value;siteLang.dispatchEvent(new Event('change',{bubbles:true}))}$('#preStepOne').classList.add('hidden');$('#preStepTwo').classList.remove('hidden');$('#preProgressFill').style.width='100%';$('#preEnter').focus()};
 $('#preEnter').onclick=()=>{localStorage.setItem('demon_preentry_v10','1');pre.classList.add('hidden');pre.setAttribute('aria-hidden','true');openTour(true)};
 const steps=[
  {title:'Benvenuto su Demon Leaks',text:'Questo tour ti mostra ricerca, filtri, categorie, risorse, carrello e account. Durante il tour la navigazione resta bloccata.',target:null},
  {title:'Ricerca',text:'Questa è la barra di ricerca. Cerca il nome di uno script, MLO, veicolo o pack.',target:'#modernSearch'},
  {title:'Ordina e filtra',text:'Da qui ordini le risorse per data, prezzo o nome.',target:'#sortSelect'},
  {title:'Categorie',text:'Qui trovi tutte le sezioni dello store. Il tour scorre automaticamente fino al punto che sta spiegando.',target:'#sidebar'},
  {title:'Panoramica store',text:'Questi contatori mostrano risorse totali, FREE, download e Premium.',target:'#stats'},
  {title:'Le risorse',text:'Cliccando una card apri la pagina completa: video YouTube a sinistra e azioni a destra.',target:'#products'},
  {title:'Carrello',text:'I Premium possono essere aggiunti qui. Il checkout richiede il profilo Discord collegato.',target:'#cartBtn'},
  {title:'Il tuo account',text:'Accedi con Discord una volta. Dopo il login questo pulsante diventa “Il tuo account” e mostra il tuo nome Discord.',target:'#discordAuthBtn'},
  {title:'Sei pronto',text:'Ora puoi navigare. Preferiti, acquisti e download restano legati al tuo account Discord.',target:null}
 ];
 function stopUserNav(e){if(!tour.classList.contains('hidden')){const allowed=e.target.closest?.('#tutorialCard');if(!allowed){e.preventDefault();e.stopPropagation()}}}
 ['wheel','touchmove','pointerdown','click'].forEach(name=>document.addEventListener(name,stopUserNav,{capture:true,passive:false}));
 document.addEventListener('keydown',e=>{if(tour.classList.contains('hidden'))return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation()}if(e.key==='Tab'){const f=$$('#tutorialCard button:not([disabled])');if(!f.length)return;const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}},true);
 async function position(){const s=steps[tourIndex];$('#tutorialCounter').textContent=`${tourIndex+1} / ${steps.length}`;$('#tutorialTitle').textContent=s.title;$('#tutorialText').textContent=s.text;$('#tutorialBack').style.visibility=tourIndex?'visible':'hidden';$('#tutorialNext span').textContent=tourIndex===steps.length-1?'Fine ✓':'Avanti →';
  if(!s.target){spot.classList.add('hidden');card.classList.add('tutorial-centered');card.style.left='';card.style.top='';return}
  const target=$(s.target);if(!target||getComputedStyle(target).display==='none'){spot.classList.add('hidden');card.classList.add('tutorial-centered');return}
  target.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});await new Promise(r=>setTimeout(r,380));const rect=target.getBoundingClientRect(),pad=9;card.classList.remove('tutorial-centered');spot.classList.remove('hidden');spot.style.left=`${Math.max(8,rect.left-pad)}px`;spot.style.top=`${Math.max(8,rect.top-pad)}px`;spot.style.width=`${Math.min(innerWidth-16,rect.width+pad*2)}px`;spot.style.height=`${Math.min(innerHeight-16,rect.height+pad*2)}px`;
  if(innerWidth<640){card.style.left='12px';card.style.width='calc(100vw - 24px)';if(rect.top+rect.height/2<innerHeight/2){card.style.top='auto';card.style.bottom='12px'}else{card.style.bottom='auto';card.style.top='82px'}}else{card.style.bottom='auto';const cw=Math.min(390,innerWidth-28);card.style.width=`${cw}px`;card.style.left=`${Math.min(innerWidth-cw-14,Math.max(14,rect.left))}px`;const below=rect.bottom+18;card.style.top=`${below+245<innerHeight?below:Math.max(82,rect.top-255)}px`}
 }
 function openTour(force=false){if(!force&&localStorage.getItem('demon_tour_v10')==='1'){blockPage(false);return}tourIndex=0;blockPage(true);tour.classList.remove('hidden');tour.setAttribute('aria-hidden','false');position().then(()=>$('#tutorialNext').focus())}
 function closeTour(){localStorage.setItem('demon_tour_v10','1');tour.classList.add('hidden');tour.setAttribute('aria-hidden','true');spot.classList.add('hidden');blockPage(false)}
 $('#tutorialNext').onclick=()=>{if(tourIndex<steps.length-1){tourIndex++;position()}else closeTour()};$('#tutorialBack').onclick=()=>{if(tourIndex){tourIndex--;position()}};$('#tutorialReplay')?.addEventListener('click',()=>openTour(true));addEventListener('resize',()=>{if(!tour.classList.contains('hidden'))position()});
 addEventListener('pageshow',()=>{if(pre.classList.contains('hidden')&&tour.classList.contains('hidden'))blockPage(false)});
 if(localStorage.getItem('demon_preentry_v10')!=='1')setTimeout(openPre,250);else if(localStorage.getItem('demon_tour_v10')!=='1')setTimeout(()=>openTour(true),450);else blockPage(false);
})();