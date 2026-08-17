(()=>{
  const $=q=>document.querySelector(q);
  const overlay=$('#demonTutorial');
  if(!overlay)return;

  const card=$('#tutorialCard');
  const spotlight=$('#tutorialSpotlight');
  const title=$('#tutorialTitle');
  const text=$('#tutorialText');
  const counter=$('#tutorialCounter');
  const back=$('#tutorialBack');
  const next=$('#tutorialNext');
  const brand=$('#tutorialBrandImage');

  const steps=[
    {
      title:'Benvenuto su Demon Leaks',
      text:'Questa breve guida ti mostra esattamente dove cercare una risorsa e come aprirla.',
      target:null,
      brand:true
    },
    {
      title:'Cerca qui quello che ti serve',
      text:'Premi la lente e scrivi il nome dello script, MLO, veicolo o pack che stai cercando.',
      target:'#modernSearch'
    },
    {
      title:'Filtra con le categorie',
      text:'Dal menu laterale puoi vedere tutte le sezioni e mostrare soltanto il tipo di risorsa che ti interessa.',
      target:'#sidebar'
    },
    {
      title:'Apri una risorsa',
      text:'Clicca una card: si apre la scheda completa con video YouTube a sinistra, dettagli e azioni a destra.',
      target:'#products'
    },
    {
      title:'Collega Discord',
      text:'Discord resta associato al tuo profilo e serve per preferiti, acquisti e qualsiasi download protetto.',
      target:'#discordAuthBtn'
    }
  ];

  let index=0;

  function position(){
    const step=steps[index];
    counter.textContent=`${index+1} / ${steps.length}`;
    title.textContent=step.title;
    text.textContent=step.text;
    back.style.visibility=index===0?'hidden':'visible';
    next.querySelector('span').textContent=index===steps.length-1?'Fine ✓':'Avanti →';
    brand.style.display=step.brand?'block':'none';

    if(!step.target){
      spotlight.classList.add('hidden');
      card.classList.add('tutorial-centered');
      card.style.left='';
      card.style.top='';
      return;
    }

    const target=$(step.target);
    if(!target){
      spotlight.classList.add('hidden');
      card.classList.add('tutorial-centered');
      return;
    }

    card.classList.remove('tutorial-centered');

    const r=target.getBoundingClientRect();
    const pad=10;
    const left=Math.max(10,r.left-pad);
    const top=Math.max(10,r.top-pad);
    const width=Math.min(innerWidth-left-10,r.width+pad*2);
    const height=Math.min(innerHeight-top-10,r.height+pad*2);

    spotlight.classList.remove('hidden');
    spotlight.style.left=`${left}px`;
    spotlight.style.top=`${top}px`;
    spotlight.style.width=`${width}px`;
    spotlight.style.height=`${height}px`;

    const cardW=Math.min(390,innerWidth-28);
    let cardLeft=Math.min(innerWidth-cardW-14,Math.max(14,r.left));
    let cardTop=r.bottom+20;

    if(cardTop+245>innerHeight){
      cardTop=Math.max(14,r.top-255);
    }

    card.style.left=`${cardLeft}px`;
    card.style.top=`${cardTop}px`;
  }

  function open(force=false){
    if(!force&&localStorage.getItem('demon_classic_tutorial_v1_done')==='1')return;
    index=0;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow='hidden';
    requestAnimationFrame(position);
  }

  function close(){
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden','true');
    document.documentElement.style.overflow='';
    localStorage.setItem('demon_classic_tutorial_v1_done','1');
  }

  next.addEventListener('click',()=>{
    if(index<steps.length-1){
      index++;
      position();
    }else{
      close();
    }
  });

  back.addEventListener('click',()=>{
    if(index>0){
      index--;
      position();
    }
  });

  $('#tutorialReplay')?.addEventListener('click',()=>open(true));
  addEventListener('resize',()=>{if(!overlay.classList.contains('hidden'))position()});

  // First entrance only. It can always be replayed from "Come funziona ?".
  setTimeout(()=>open(false),700);
})();