import{loadFirebaseProduct}from'./firebase-store.js?v=9';

const $=q=>document.querySelector(q);

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function euro(cents){
  const n=Number(cents||0);
  if(n<=0)return 'GRATIS';
  return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n/100);
}

function youtubeId(url){
  if(!url)return '';
  try{
    const u=new URL(url);
    const host=u.hostname.toLowerCase();
    if(host==='youtu.be'||host.endsWith('.youtu.be'))return u.pathname.split('/').filter(Boolean)[0]||'';
    if(host.includes('youtube.com')){
      if(u.pathname.startsWith('/shorts/'))return u.pathname.split('/')[2]||'';
      if(u.pathname.startsWith('/embed/'))return u.pathname.split('/')[2]||'';
      return u.searchParams.get('v')||'';
    }
  }catch{}
  return '';
}

function getYoutubeUrls(product){
  const values=[];
  if(product.youtube_url)values.push(product.youtube_url);
  if(product.video_url)values.push(product.video_url);
  if(Array.isArray(product.youtube_urls))values.push(...product.youtube_urls);
  return [...new Set(values.map(String).map(v=>v.trim()).filter(Boolean))];
}

function getGallery(product){
  const values=[];
  if(product.image_url)values.push(product.image_url);
  if(Array.isArray(product.gallery_urls))values.push(...product.gallery_urls);
  return [...new Set(values.map(String).map(v=>v.trim()).filter(Boolean))];
}

function addPremiumToCart(product){
  const id=String(product.id);
  let cart=[];
  try{cart=JSON.parse(localStorage.getItem('demon_cart')||'[]')}catch{}
  if(!Array.isArray(cart))cart=[];

  if(!cart.some(x=>String(x.id)===id)){
    cart.push({
      id,
      title:product.title||product.name||'Demon Resource',
      price_cents:Number(product.price_cents||0),
      image_url:product.image_url||''
    });
    localStorage.setItem('demon_cart',JSON.stringify(cart));
    $('#resourceCartToast').textContent='✓ Aggiunto al carrello';
  }else{
    $('#resourceCartToast').textContent='È già nel carrello';
  }

  $('#resourceCartCount').textContent=cart.length;
}

function renderCartCount(){
  let cart=[];
  try{cart=JSON.parse(localStorage.getItem('demon_cart')||'[]')}catch{}
  $('#resourceCartCount').textContent=Array.isArray(cart)?cart.length:0;
}

async function init(){
  renderCartCount();

  $('#resourceCartBtn')?.addEventListener('click',()=>location.href='./#catalog');

  const id=new URLSearchParams(location.search).get('id');
  if(!id){
    $('#resourceLoading').textContent='Risorsa non specificata.';
    return;
  }

  const product=await loadFirebaseProduct(id);

  if(!product){
    $('#resourceLoading').textContent='Risorsa non trovata.';
    return;
  }

  document.title=`${product.title||product.name||'Risorsa'} • Demon Leaks`;

  $('#resourceLoading').classList.add('hidden');
  $('#resourceApp').classList.remove('hidden');

  const title=product.title||product.name||'Demon Resource';
  const category=product.category_name||product.category||'Scripts';
  const price=Number(product.price_cents||0);

  $('#resourceBreadcrumbCategory').textContent=category;
  $('#resourceBreadcrumbTitle').textContent=title;
  $('#resourceCategory').textContent=category;
  $('#resourceTitle').textContent=title;
  $('#resourceDescription').textContent=product.description||'';
  $('#resourceType').textContent=price<=0?'FREE':'PREMIUM';
  $('#resourceVersion').textContent=product.version||'—';
  $('#resourceAuthor').textContent=product.author||'Demon Leaks';
  $('#resourceUpdated').textContent=String(product.updated_at||product.created_at||'—').slice(0,10);
  $('#resourcePrice').textContent=euro(price);
  $('#resourcePrice').classList.toggle('free',price<=0);
  $('#resourceFavoriteBtn').dataset.favoriteId=product.id;

  // LEFT: YouTube is preferred exactly as requested.
  const media=$('#resourceMedia');
  const videos=getYoutubeUrls(product);
  const videoId=videos.map(youtubeId).find(Boolean);

  if(videoId){
    const iframe=document.createElement('iframe');
    iframe.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
    iframe.title=`Video ${title}`;
    iframe.loading='lazy';
    iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen=true;
    media.appendChild(iframe);
  }else{
    const img=document.createElement('img');
    img.src=product.image_url||'./assets/demon-banner.png';
    img.alt=title;
    img.onerror=()=>img.src='./assets/demon-banner.png';
    media.appendChild(img);
  }

  const gallery=getGallery(product);
  if(gallery.length){
    const root=$('#resourceGallery');
    root.classList.remove('hidden');

    gallery.slice(0,10).forEach(url=>{
      const btn=document.createElement('button');
      const img=document.createElement('img');
      img.src=url;
      img.alt='';
      img.loading='lazy';
      btn.appendChild(img);

      btn.addEventListener('click',()=>{
        // Clicking a screenshot temporarily switches the left panel to the image.
        media.innerHTML='';
        const large=document.createElement('img');
        large.src=url;
        large.alt=title;
        media.appendChild(large);
      });

      root.appendChild(btn);
    });
  }

  const tags=Array.isArray(product.tags)?product.tags:[];
  if(tags.length){
    $('#resourceTagsPanel').classList.remove('hidden');
    $('#resourceTags').innerHTML=tags.map(t=>`<span class="resource-tag">${escapeHtml(t)}</span>`).join('');
  }

  const main=$('#resourceMainAction');

  if(price<=0){
    main.querySelector('span').textContent='Scarica protetto';
    main.dataset.demonDownload=product.id;
  }else{
    main.querySelector('span').textContent='Aggiungi al carrello';
    main.addEventListener('click',()=>{
      if(window.DEMON_DISCORD_CONNECTED!==true){
        if(typeof window.DEMON_REQUIRE_DISCORD==='function')window.DEMON_REQUIRE_DISCORD();
        return;
      }
      addPremiumToCart(product);
    });
  }
}

init().catch(error=>{
  console.error('[DEMON RESOURCE]',error);
  $('#resourceLoading').textContent='Errore nel caricamento della risorsa.';
});
