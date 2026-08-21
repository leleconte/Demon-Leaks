import{
  loadFirebaseProduct
}from'./firebase-store.js?v=10.5';

import{
  cachedProfile,
  startDiscordLogin,
  avatarUrl,
  listFavorites,
  toggleFavorite,
  getSessionToken
}from'./discord-session.js?v=10.5';

const $=q=>document.querySelector(q);
const AUTH_BASE=String(
  (window.DEMON_FIREBASE||{}).DISCORD_AUTH_BASE_URL||''
).replace(/\/+$/,'');

let currentProduct=null;
let favoriteState=false;
let downloadBusy=false;

function unlockResourceUI(){
  document.documentElement.classList.remove(
    'demon-tour-open',
    'demon-navigation-locked'
  );

  document.body.classList.remove(
    'demon-tour-open',
    'demon-navigation-locked'
  );

  document.querySelectorAll('[inert]').forEach(el=>{
    el.removeAttribute('inert');
  });

  // Defensive cleanup for stale overlays from older cached builds.
  document.querySelectorAll(
    '.demon-preentry,.demon-tutorial'
  ).forEach(el=>{
    el.classList.add('hidden');
    el.setAttribute('aria-hidden','true');
  });
}

function esc(value){
  return String(value??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

function priceText(cents){
  const value=Number(cents||0);
  if(value<=0)return 'FREE';

  return new Intl.NumberFormat('it-IT',{
    style:'currency',
    currency:'EUR'
  }).format(value/100);
}

function youtubeId(url){
  if(!url)return '';

  try{
    const u=new URL(url);

    if(u.hostname.includes('youtu.be')){
      return u.pathname.split('/').filter(Boolean)[0]||'';
    }

    if(u.hostname.includes('youtube.com')){
      if(u.pathname.startsWith('/shorts/')){
        return u.pathname.split('/')[2]||'';
      }

      if(u.pathname.startsWith('/embed/')){
        return u.pathname.split('/')[2]||'';
      }

      return u.searchParams.get('v')||'';
    }
  }catch{}

  return '';
}

function cart(){
  try{
    const rows=JSON.parse(localStorage.getItem('demon_cart')||'[]');
    return Array.isArray(rows)?rows:[];
  }catch{
    return [];
  }
}

function renderCartCount(){
  const el=$('#resourceCartCount');
  if(el)el.textContent=cart().length;
}

function showToast(message){
  const el=$('#toast');
  if(!el)return;

  el.textContent=message;
  el.classList.add('show');

  clearTimeout(window.__demonResourceToast);
  window.__demonResourceToast=setTimeout(()=>{
    el.classList.remove('show');
  },2600);
}

function paintAccount(){
  const btn=$('#discordAuthBtn');
  if(!btn)return;

  const profile=cachedProfile();
  const avatar=btn.querySelector('.discord-auth-avatar');
  const label=btn.querySelector('.discord-auth-label');
  const state=btn.querySelector('.discord-auth-state');

  if(profile){
    btn.classList.add('logged-in');

    if(avatar){
      avatar.innerHTML=`<img src="${avatarUrl(profile,64)}" alt="">`;
    }

    if(label)label.textContent='Il tuo account';
    if(state){
      state.textContent=
        profile.global_name||
        profile.username||
        'Discord';
    }

    btn.onclick=()=>{
      location.href='./profile.html';
    };

    return;
  }

  btn.classList.remove('logged-in');

  if(avatar)avatar.textContent='◉';
  if(label)label.textContent='Discord';
  if(state)state.textContent='Accedi';

  btn.onclick=()=>{
    startDiscordLogin();
  };
}

function addCart(product){
  const rows=cart();
  const id=String(product.id||'');

  if(!rows.some(item=>String(item.id)===id)){
    rows.push({
      id,
      title:product.title||product.name||'Demon Resource',
      price_cents:Number(product.price_cents||0),
      image_url:product.image_url||''
    });

    localStorage.setItem('demon_cart',JSON.stringify(rows));

    const note=$('#resourceCartToast');
    if(note)note.textContent='✓ Aggiunto al carrello';
  }else{
    const note=$('#resourceCartToast');
    if(note)note.textContent='È già nel carrello';
  }

  renderCartCount();
}

function paintFavorite(){
  const btn=$('#resourceFavoriteBtn');
  if(!btn)return;

  btn.classList.toggle('active',favoriteState);
  btn.setAttribute('aria-pressed',String(favoriteState));

  const heart=btn.querySelector('[data-heart]');
  if(heart)heart.textContent=favoriteState?'♥':'♡';
}

async function loadFavoriteState(productId){
  if(!cachedProfile()){
    favoriteState=false;
    paintFavorite();
    return;
  }

  try{
    const result=await Promise.race([
      listFavorites(),
      new Promise(resolve=>setTimeout(()=>resolve([]),2200))
    ]);

    favoriteState=(Array.isArray(result)?result:[]).some(item=>
      String(item.product_id||item.id||'')===String(productId)
    );
  }catch{
    favoriteState=false;
  }

  paintFavorite();
}

async function onFavoriteClick(){
  if(!currentProduct)return;

  if(!cachedProfile()){
    startDiscordLogin();
    return;
  }

  const btn=$('#resourceFavoriteBtn');
  if(btn)btn.disabled=true;

  try{
    const result=await toggleFavorite(currentProduct.id);
    favoriteState=result.favorite===true;
    paintFavorite();

    showToast(
      favoriteState
        ? 'Aggiunto ai preferiti'
        : 'Rimosso dai preferiti'
    );
  }catch(error){
    console.error('[DEMON RESOURCE FAVORITE]',error);
    showToast(error.message||'Preferiti non disponibili.');
  }finally{
    if(btn)btn.disabled=false;
  }
}

async function workerPost(path,payload){
  const token=getSessionToken();

  const response=await fetch(`${AUTH_BASE}${path}`,{
    method:'POST',
    mode:'cors',
    headers:{
      'content-type':'application/json',
      'authorization':`Bearer ${token}`
    },
    body:JSON.stringify(payload||{})
  });

  let data={};
  try{data=await response.json()}catch{}

  if(response.status===401){
    throw new Error('Sessione Discord scaduta.');
  }

  if(response.status===423){
    throw new Error('Account bloccato dal sistema di sicurezza.');
  }

  if(!response.ok){
    throw new Error(
      data.message||
      `Download non disponibile (${response.status}).`
    );
  }

  return data;
}

async function onDownloadClick(){
  if(!currentProduct||downloadBusy)return;

  if(!cachedProfile()){
    startDiscordLogin();
    return;
  }

  downloadBusy=true;

  const btn=$('#resourceMainAction');
  if(btn)btn.disabled=true;

  try{
    showToast('Verifica download…');

    const result=await workerPost('/download/start',{
      product_id:String(currentProduct.id||'')
    });

    if(result.mode==='linkvertise'&&result.gate_url){
      location.href=result.gate_url;
      return;
    }

    if(result.mode==='direct'&&result.url){
      location.href=result.url;
      return;
    }

    throw new Error('Risposta download non valida.');
  }catch(error){
    console.error('[DEMON RESOURCE DOWNLOAD]',error);
    showToast(error.message||'Download non disponibile.');
  }finally{
    downloadBusy=false;
    if(btn)btn.disabled=false;
  }
}

function bindProductActions(product){
  const price=Number(product.price_cents||0);
  const main=$('#resourceMainAction');
  const favorite=$('#resourceFavoriteBtn');

  if(main){
    main.disabled=false;
    main.removeAttribute('data-demon-download');

    if(price<=0){
      main.querySelector('span').textContent='Scarica protetto';
      main.onclick=onDownloadClick;
    }else{
      main.querySelector('span').textContent='Aggiungi al carrello';
      main.onclick=()=>addCart(product);
    }
  }

  if(favorite){
    favorite.dataset.favoriteId=String(product.id||'');
    favorite.onclick=onFavoriteClick;
  }
}

function render(product){
  if(!product)return;

  currentProduct=product;

  const title=
    product.title||
    product.name||
    'Demon Resource';

  const category=
    product.category_name||
    product.category||
    'Scripts';

  const price=Number(product.price_cents||0);

  $('#resourceLoading')?.classList.add('hidden');
  $('#resourceApp')?.classList.remove('hidden');

  document.title=`${title} • Demon Leaks`;

  $('#resourceBreadcrumbCategory').textContent=category;
  $('#resourceBreadcrumbTitle').textContent=title;
  $('#resourceCategory').textContent=category;
  $('#resourceTitle').textContent=title;
  $('#resourceDescription').textContent=product.description||'';

  $('#resourceType').textContent=price<=0?'FREE':'PREMIUM';
  $('#resourceVersion').textContent=product.version||'—';
  $('#resourceAuthor').textContent=product.author||'Demon Leaks';
  $('#resourceUpdated').textContent=
    String(product.updated_at||product.created_at||'—').slice(0,10);

  $('#resourcePrice').textContent=priceText(price);
  $('#resourcePrice').classList.toggle('free',price<=0);

  const media=$('#resourceMedia');
  media.innerHTML='';

  const videos=[
    product.youtube_url,
    product.video_url,
    ...(Array.isArray(product.youtube_urls)?product.youtube_urls:[])
  ].filter(Boolean);

  const videoId=videos.map(youtubeId).find(Boolean);

  if(videoId){
    const frame=document.createElement('iframe');
    frame.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
    frame.title=title;
    frame.loading='lazy';
    frame.allow=
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen=true;
    media.appendChild(frame);
  }else{
    const image=document.createElement('img');
    image.src=product.image_url||'./assets/demon-banner.png';
    image.alt=title;
    image.decoding='async';
    image.onerror=()=>{
      image.src='./assets/demon-banner.png';
    };
    media.appendChild(image);
  }

  const gallery=[
    product.image_url,
    ...(Array.isArray(product.gallery_urls)?product.gallery_urls:[])
  ].filter(Boolean);

  const galleryRoot=$('#resourceGallery');
  galleryRoot.innerHTML='';
  galleryRoot.classList.toggle('hidden',!gallery.length);

  [...new Set(gallery)].slice(0,10).forEach(url=>{
    const button=document.createElement('button');
    button.type='button';

    const image=document.createElement('img');
    image.src=url;
    image.loading='lazy';
    image.decoding='async';

    button.appendChild(image);

    button.onclick=()=>{
      media.innerHTML='';

      const large=document.createElement('img');
      large.src=url;
      large.alt=title;
      large.decoding='async';

      media.appendChild(large);
    };

    galleryRoot.appendChild(button);
  });

  const tags=Array.isArray(product.tags)?product.tags:[];
  $('#resourceTagsPanel').classList.toggle('hidden',!tags.length);
  $('#resourceTags').innerHTML=tags.map(tag=>
    `<span class="resource-tag">${esc(tag)}</span>`
  ).join('');

  bindProductActions(product);
  loadFavoriteState(product.id);
}

async function init(){
  unlockResourceUI();
  renderCartCount();
  paintAccount();

  // Re-run cleanup on bfcache restore.
  addEventListener('pageshow',()=>{
    unlockResourceUI();
    paintAccount();
  });

  const id=new URLSearchParams(location.search).get('id');

  if(!id){
    $('#resourceLoading').textContent='Risorsa non specificata.';
    return;
  }

  let cached=null;

  try{
    cached=JSON.parse(
      sessionStorage.getItem(`demon_resource_cache_${id}`)||'null'
    );
  }catch{}

  if(cached){
    cached.id=cached.id||id;
    render(cached);
  }

  // Firebase refresh happens in the background and never controls navigation.
  try{
    const fresh=await Promise.race([
      loadFirebaseProduct(id),
      new Promise(resolve=>
        setTimeout(()=>resolve(null),3500)
      )
    ]);

    if(fresh){
      render(fresh);
    }else if(!cached){
      $('#resourceLoading').textContent=
        'La risorsa sta impiegando troppo a caricarsi. Torna allo store e riprova.';
    }
  }catch(error){
    console.error('[DEMON RESOURCE LOAD]',error);

    if(!cached){
      $('#resourceLoading').textContent=
        'Impossibile caricare la risorsa. Torna allo store e riprova.';
    }
  }
}

init().catch(error=>{
  console.error('[DEMON RESOURCE INIT]',error);

  // Even if resource initialization fails, navigation stays usable.
  unlockResourceUI();

  const loading=$('#resourceLoading');
  if(loading){
    loading.textContent=
      'Errore nel caricamento della risorsa. Puoi comunque tornare allo store.';
  }
});