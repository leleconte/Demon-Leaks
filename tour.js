(()=>{const $=q=>document.querySelector(q);const overlay=$('#tourOverlay');if(!overlay)return;
const card=$('#tourCard'),spot=$('#tourSpotlight'),title=$('#tourTitle'),text=$('#tourText'),progress=$('#tourProgress'),next=$('#tourNext'),back=$('#tourBack');
const steps=[
 {title:'Benvenuto su Demon Leaks',text:'Ti mostro in pochi secondi dove cercare, come aprire una risorsa e perché Discord resta collegato al tuo profilo.'},
 {target:'#searchTarget',title:'Cerca qualsiasi risorsa',text:'Scrivi nome, categoria o parola chiave. Il catalogo si aggiorna mentre digiti.'},
 {target:'#categoriesTarget',title:'Usa le categorie',text:'Filtra rapidamente Scripts, MLO, Veicoli, Pack e tutte le sezioni che crei dalla Staff Zone.'},
 {target:'#products',title:'Apri la scheda completa',text:'Clicca una card per vedere descrizione, immagini, video YouTube, tag, prezzo e download.'},
 {target:'#discordAuthBtn',title:'Collega Discord una volta',text:'Discord identifica il tuo profilo: preferiti, acquisti, libreria e download protetti restano associati allo stesso Discord ID.'}
];let i=0;
function place(){const s=steps[i],target=s.target?$(s.target):null;progress.textContent=`${i+1} / ${steps.length}`;title.textContent=s.title;text.textContent=s.text;back.style.visibility=i?'visible':'hidden';next.textContent=i===steps.length-1?'Ho capito ✓':'Continua →';
if(!target){spot.classList.add('hidden');card.style.left='50%';card.style.top='50%';card.style.transform='translate(-50%,-50%)';return}
const r=target.getBoundingClientRect(),pad=8;spot.classList.remove('hidden');spot.style.left=`${Math.max(8,r.left-pad)}px`;spot.style.top=`${Math.max(8,r.top-pad)}px`;spot.style.width=`${Math.min(innerWidth-16,r.width+pad*2)}px`;spot.style.height=`${Math.min(innerHeight-16,r.height+pad*2)}px`;
const below=r.bottom+18,above=r.top-240;card.style.transform='none';card.style.left=`${Math.min(innerWidth-430,Math.max(15,r.left))}px`;card.style.top=`${below+230<innerHeight?below:Math.max(15,above)}px`;
}
function open(force=false){if(!force&&localStorage.getItem('demon_tour_v8_seen'))return;i=0;overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');document.documentElement.style.overflow='hidden';setTimeout(place,40)}
function close(){overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');document.documentElement.style.overflow='';localStorage.setItem('demon_tour_v8_seen','1')}
next.onclick=()=>{if(i<steps.length-1){i++;place()}else close()};back.onclick=()=>{if(i){i--;place()}};$('#tourSkip').onclick=close;$('#tourStart')?.addEventListener('click',()=>open(true));$('#heroTourBtn')?.addEventListener('click',()=>open(true));addEventListener('resize',()=>!overlay.classList.contains('hidden')&&place());setTimeout(()=>open(false),900);
})();