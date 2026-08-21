import{
  cachedProfile,startDiscordLogin,getAccount,logoutDiscord,avatarUrl
}from'./discord-session.js?v=10.4';

const $=q=>document.querySelector(q);

const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  "'":'&#39;',
  '"':'&quot;'
}[c]));

const money=cents=>{
  const n=Number(cents||0);
  if(n<=0)return 'FREE';
  return new Intl.NumberFormat('it-IT',{
    style:'currency',
    currency:'EUR'
  }).format(n/100);
};

let localProfile=cachedProfile();

function showLogin(){
  $('#profileLoading')?.classList.add('hidden');
  $('#profileLogin')?.classList.remove('hidden');
  $('#profileBlocked')?.classList.add('hidden');
  $('#profileApp')?.classList.add('hidden');
}

function paintIdentity(profile){
  $('#profileLoading')?.classList.add('hidden');
  $('#profileLogin')?.classList.add('hidden');
  $('#profileBlocked')?.classList.add('hidden');
  $('#profileApp')?.classList.remove('hidden');

  $('#profileAvatar').src=avatarUrl(profile,128);
  $('#profileName').textContent=
    profile.global_name||profile.username||'Discord User';
  $('#profileDiscordId').textContent=profile.discord_id||'—';
}

function showBackendNotice(message){
  $('#profileBackendNotice')?.classList.remove('hidden');
  $('#profileBackendNoticeText').textContent=
    message||'La libreria non è stata caricata.';
}

function hideBackendNotice(){
  $('#profileBackendNotice')?.classList.add('hidden');
}

function purchaseCards(rows){
  if(!rows.length){
    return `
      <div class="no-purchases">
        Non risultano ancora script acquistati per questo Discord ID.
      </div>
    `;
  }

  return rows.map(item=>{
    const id=String(item.product_id||item.id||'');
    return `
      <article class="purchase-card">
        <img
          src="${esc(item.image_url||'./assets/demon-banner.png')}"
          alt=""
          loading="lazy"
          onerror="this.src='./assets/demon-banner.png'"
        >
        <div class="purchase-body">
          <div class="hero-kicker">ACQUISTATO</div>
          <h3>${esc(item.title||item.name||id||'Demon Resource')}</h3>
          <p>
            ${esc(item.category_name||item.category||'Scripts')}
            • ${money(item.price_cents)}
          </p>

          <div class="purchase-foot">
            <small>${esc(String(item.granted_at||item.created_at||'').slice(0,10)||'—')}</small>

            <div class="profile-card-actions">
              <a class="download-owned" href="./resource.html?id=${encodeURIComponent(id)}">
                Apri
              </a>
              <button
                class="download-owned btn-sand"
                data-demon-download="${esc(id)}"
                type="button"
              >
                <span>Scarica ↗</span>
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function favoriteCards(rows){
  if(!rows.length){
    return `
      <div class="no-purchases">
        Non hai ancora aggiunto nessuna risorsa ai preferiti.
      </div>
    `;
  }

  return rows.map(item=>{
    const id=String(item.product_id||item.id||'');
    return `
      <article class="purchase-card">
        <img
          src="${esc(item.image_url||'./assets/demon-banner.png')}"
          alt=""
          loading="lazy"
          onerror="this.src='./assets/demon-banner.png'"
        >
        <div class="purchase-body">
          <div class="hero-kicker">PREFERITO</div>
          <h3>${esc(item.title||item.name||id||'Demon Resource')}</h3>
          <p>${esc(item.category_name||item.category||'Scripts')}</p>

          <div class="purchase-foot">
            <small>♥ Nei preferiti</small>
            <a
              class="download-owned btn-sand"
              href="./resource.html?id=${encodeURIComponent(id)}"
            >
              <span>Apri ↗</span>
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function bindTabs(){
  document.querySelectorAll('[data-profile-tab]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('[data-profile-tab]').forEach(tab=>{
        tab.classList.toggle('active',tab===btn);
      });

      const favorites=btn.dataset.profileTab==='favorites';

      $('#purchasesGrid')?.classList.toggle('hidden',favorites);
      $('#favoritesGrid')?.classList.toggle('hidden',!favorites);
    });
  });
}

async function loadRemoteAccount(){
  if(!localProfile)return;

  hideBackendNotice();

  try{
    const data=await getAccount();

    if(data.blocked){
      $('#profileApp')?.classList.add('hidden');
      $('#profileBlocked')?.classList.remove('hidden');
      $('#profileBlockedReason').textContent=
        data.blocked.reason||'Account bloccato.';
      return;
    }

    const profile={
      ...localProfile,
      ...(data.profile||{})
    };

    localProfile=profile;
    paintIdentity(profile);

    const purchases=Array.isArray(data.purchases)?data.purchases:[];
    const favorites=Array.isArray(data.favorites)?data.favorites:[];

    $('#purchaseCount').textContent=purchases.length;
    $('#favoriteCount').textContent=favorites.length;

    $('#purchasesGrid').innerHTML=purchaseCards(purchases);
    $('#favoritesGrid').innerHTML=favoriteCards(favorites);

  }catch(error){
    console.error('[DEMON PROFILE ACCOUNT]',error);

    // CRITICAL FIX:
    // The Discord session remains valid. Never replace the account page with
    // "Connect Discord" just because the library API had a temporary problem.
    paintIdentity(localProfile);

    $('#purchasesGrid').innerHTML=`
      <div class="no-purchases">
        Impossibile caricare gli script in questo momento.
      </div>
    `;

    $('#favoritesGrid').innerHTML=`
      <div class="no-purchases">
        Impossibile caricare i preferiti in questo momento.
      </div>
    `;

    showBackendNotice(
      error?.message||
      'Account collegato, ma la libreria non è raggiungibile in questo momento.'
    );
  }
}

async function init(){
  bindTabs();

  $('#profileDiscordLogin')?.addEventListener('click',()=>startDiscordLogin());

  $('#profileLogout')?.addEventListener('click',async()=>{
    await logoutDiscord();
    location.replace('./');
  });

  $('#profileRetry')?.addEventListener('click',()=>loadRemoteAccount());

  // If the signed Demon session exists, show the user's Discord data
  // immediately BEFORE any API/Firestore request.
  if(!localProfile){
    showLogin();
    return;
  }

  paintIdentity(localProfile);

  $('#purchaseCount').textContent='…';
  $('#favoriteCount').textContent='…';

  await loadRemoteAccount();
}

init().catch(error=>{
  console.error('[DEMON PROFILE INIT]',error);

  if(localProfile){
    paintIdentity(localProfile);
    showBackendNotice(error?.message||'Errore durante il caricamento della libreria.');
  }else{
    showLogin();
  }
});