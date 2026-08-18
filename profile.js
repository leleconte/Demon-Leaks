import {
  getDiscordFirebase,
  startDiscordLogin,
  consumeDiscordCallback,
  discordClaims,
  ensureDiscordProfile,
  logoutDiscord,
  avatarUrl
} from './discord-session.js?v=10';

const $=q=>document.querySelector(q);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=c=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(c||0)/100);
let stopBlock=null;

async function renderPurchases(user){
  const {db,fs}=await getDiscordFirebase();
  const snap=await fs.getDocs(fs.collection(db,'users',user.uid,'purchases'));
  const rows=snap.docs.map(d=>({id:d.id,...d.data()}))
    .sort((a,b)=>String(b.granted_at||'').localeCompare(String(a.granted_at||'')));

  $('#purchaseCount').textContent=rows.length;

  $('#purchasesGrid').innerHTML=rows.length?rows.map(p=>`
    <article class="purchase-card">
      <img src="${esc(p.image_url||'./assets/demon-banner.png')}" alt="">
      <div class="purchase-body">
        <h3>${esc(p.title||p.name||'Script Demon Leaks')}</h3>
        <p>${esc(p.category_name||'Scripts')} • ${Number(p.price_cents||0)>0?money(p.price_cents):'FREE'}</p>
        <div class="purchase-foot">
          <small>Assegnato ${esc(String(p.granted_at||'').slice(0,10)||'—')}</small>
          <button class="download-owned btn-sand"
            data-demon-download="${esc(p.product_id||p.id)}"
            type="button">
            <span>Scarica protetto ↗</span>
          </button>
        </div>
      </div>
    </article>
  `).join(''):'<div class="no-purchases">Non hai ancora script associati a questo account Discord.</div>';
}

async function watchBlock(profile){
  if(stopBlock){stopBlock();stopBlock=null;}
  const {db,fs}=await getDiscordFirebase();
  stopBlock=fs.onSnapshot(
    fs.doc(db,'blockedUsers',profile.discord_id),
    snap=>{
      if(snap.exists()){
        const b=snap.data();
        $('#profileBlocked').classList.remove('hidden');
        $('#profileBlockedReason').textContent=b.reason||'Account bloccato.';
        $('#profileApp').classList.add('hidden');
      }else{
        $('#profileBlocked').classList.add('hidden');
        $('#profileApp').classList.remove('hidden');
      }
    }
  );
}

async function renderFavorites(user){
  const {db,fs}=await getDiscordFirebase();
  const favSnap=await fs.getDocs(fs.collection(db,'users',user.uid,'favorites'));
  const ids=favSnap.docs.map(d=>d.id),rows=[];
  for(const id of ids){
    try{const s=await fs.getDoc(fs.doc(db,'products',id));if(s.exists())rows.push({id:s.id,...s.data()})}catch{}
  }
  $('#favoritesGrid').innerHTML=rows.length?rows.map(p=>`
    <article class="purchase-card">
      <img src="${esc(p.image_url||'./assets/demon-banner.png')}" alt="">
      <div class="purchase-body"><h3>${esc(p.title||p.name||'Demon Resource')}</h3><p>${esc(p.category_name||p.category||'Scripts')}</p>
      <div class="purchase-foot"><small>Preferito</small><a class="download-owned btn-sand" href="./resource.html?id=${encodeURIComponent(p.id)}"><span>Apri ↗</span></a></div></div>
    </article>`).join(''):'<div class="no-purchases">Non hai ancora aggiunto risorse ai preferiti.</div>';
}
function bindProfileTabs(){
  document.querySelectorAll('[data-profile-tab]').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('[data-profile-tab]').forEach(x=>x.classList.toggle('active',x===b));
    const f=b.dataset.profileTab==='favorites';
    $('#favoritesGrid').classList.toggle('hidden',!f);
    $('#purchasesGrid').classList.toggle('hidden',f);
  }));
}

async function init(){
  bindProfileTabs();
  $('#profileDiscordLogin')?.addEventListener('click',()=>{
    try{startDiscordLogin()}catch(e){alert(e.message)}
  });

  $('#profileLogout')?.addEventListener('click',async()=>{
    await logoutDiscord();
    location.href='./';
  });

  try{await consumeDiscordCallback()}catch(e){console.error(e)}

  const {auth,authMod}=await getDiscordFirebase();

  authMod.onAuthStateChanged(auth,async user=>{
    $('#profileLoading').classList.add('hidden');

    if(stopBlock){stopBlock();stopBlock=null;}

    if(!user){
      $('#profileLogin').classList.remove('hidden');
      $('#profileApp').classList.add('hidden');
      return;
    }

    const claims=await discordClaims(user);
    if(!claims){
      $('#profileLogin').classList.remove('hidden');
      $('#profileApp').classList.add('hidden');
      return;
    }

    const profile=await ensureDiscordProfile(user);

    $('#profileLogin').classList.add('hidden');
    $('#profileApp').classList.remove('hidden');
    $('#profileAvatar').src=avatarUrl(profile,128);
    $('#profileName').textContent=profile.global_name||profile.username||'Discord User';
    $('#profileDiscordId').textContent=profile.discord_id;

    await watchBlock(profile);

    try{
      await renderPurchases(user);await renderFavorites(user);
    }catch(error){
      console.error('[DEMON PROFILE PURCHASES]',error);
      $('#purchasesGrid').innerHTML='<div class="no-purchases">Impossibile caricare la libreria.</div>';
    }
  });
}

init().catch(error=>{
  console.error('[DEMON PROFILE]',error);
  $('#profileLoading').textContent=error.message||'Errore profilo.';
});
