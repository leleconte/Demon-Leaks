import{
  cachedProfile,startDiscordLogin,getAccount,logoutDiscord,avatarUrl
}from'./discord-session.js?v=10.2';

const $=q=>document.querySelector(q);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[c]));
const money=c=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(c||0)/100);

function purchaseCards(rows){
  if(!rows.length)return '<div class="no-purchases">Non hai ancora script associati al tuo account Discord.</div>';

  return rows.map(p=>`
    <article class="purchase-card">
      <img src="${esc(p.image_url||'./assets/demon-banner.png')}" alt="">
      <div class="purchase-body">
        <h3>${esc(p.title||p.name||'Demon Resource')}</h3>
        <p>${esc(p.category_name||'Scripts')} • ${Number(p.price_cents||0)>0?money(p.price_cents):'FREE'}</p>
        <div class="purchase-foot">
          <small>${esc(String(p.granted_at||'').slice(0,10)||'—')}</small>
          <button class="download-owned btn-sand" data-demon-download="${esc(p.product_id||p.id)}" type="button">
            <span>Scarica protetto ↗</span>
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

function favoriteCards(rows){
  if(!rows.length)return '<div class="no-purchases">Non hai ancora aggiunto risorse ai preferiti.</div>';

  return rows.map(p=>`
    <article class="purchase-card">
      <img src="${esc(p.image_url||'./assets/demon-banner.png')}" alt="">
      <div class="purchase-body">
        <h3>${esc(p.title||p.name||'Demon Resource')}</h3>
        <p>${esc(p.category_name||p.category||'Scripts')}</p>
        <div class="purchase-foot">
          <small>Preferito</small>
          <a class="download-owned btn-sand" href="./resource.html?id=${encodeURIComponent(p.product_id||p.id)}">
            <span>Apri ↗</span>
          </a>
        </div>
      </div>
    </article>
  `).join('');
}

function bindTabs(){
  document.querySelectorAll('[data-profile-tab]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('[data-profile-tab]').forEach(x=>x.classList.toggle('active',x===btn));
      const fav=btn.dataset.profileTab==='favorites';
      $('#favoritesGrid')?.classList.toggle('hidden',!fav);
      $('#purchasesGrid')?.classList.toggle('hidden',fav);
    });
  });
}

async function init(){
  bindTabs();

  $('#profileDiscordLogin')?.addEventListener('click',()=>startDiscordLogin());
  $('#profileLogout')?.addEventListener('click',async()=>{
    await logoutDiscord();
    location.href='./';
  });

  const profile=cachedProfile();

  $('#profileLoading')?.classList.add('hidden');

  if(!profile){
    $('#profileLogin')?.classList.remove('hidden');
    $('#profileApp')?.classList.add('hidden');
    return;
  }

  try{
    const data=await getAccount();

    if(data.blocked){
      $('#profileBlocked')?.classList.remove('hidden');
      $('#profileBlockedReason').textContent=data.blocked.reason||'Account bloccato.';
      $('#profileApp')?.classList.add('hidden');
      return;
    }

    const p={...profile,...(data.profile||{})};

    $('#profileLogin')?.classList.add('hidden');
    $('#profileBlocked')?.classList.add('hidden');
    $('#profileApp')?.classList.remove('hidden');

    $('#profileAvatar').src=avatarUrl(p,128);
    $('#profileName').textContent=p.global_name||p.username||'Discord User';
    $('#profileDiscordId').textContent=p.discord_id;

    const purchases=Array.isArray(data.purchases)?data.purchases:[];
    const favorites=Array.isArray(data.favorites)?data.favorites:[];

    $('#purchaseCount').textContent=purchases.length;
    $('#purchasesGrid').innerHTML=purchaseCards(purchases);
    if($('#favoritesGrid'))$('#favoritesGrid').innerHTML=favoriteCards(favorites);

  }catch(error){
    console.error('[DEMON PROFILE]',error);
    $('#profileApp')?.classList.add('hidden');
    $('#profileLogin')?.classList.remove('hidden');
  }
}
init();
