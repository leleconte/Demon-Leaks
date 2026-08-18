import{loadFirebaseProduct}from'./firebase-store.js?v=10.1';
const $=q=>document.querySelector(q);let renderedId='';
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function euro(c){const n=Number(c||0);return n<=0?'GRATIS':new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n/100)}
function youtubeId(url){try{const u=new URL(url);if(u.hostname.includes('youtu.be'))return u.pathname.split('/').filter(Boolean)[0]||'';if(u.hostname.includes('youtube.com')){if(u.pathname.startsWith('/shorts/'))return u.pathname.split('/')[2]||'';if(u.pathname.startsWith('/embed/'))return u.pathname.split('/')[2]||'';return u.searchParams.get('v')||''}}catch{}return ''}
function cart(){try{const c=JSON.parse(localStorage.getItem('demon_cart')||'[]');return Array.isArray(c)?c:[]}catch{return []}}
function renderCartCount(){const e=$('#resourceCartCount');if(e)e.textContent=cart().length}
function addCart(p){const rows=cart(),id=String(p.id);if(!rows.some(x=>String(x.id)===id)){rows.push({id,title:p.title||p.name||'Demon Resource',price_cents:Number(p.price_cents||0),image_url:p.image_url||''});localStorage.setItem('demon_cart',JSON.stringify(rows));$('#resourceCartToast').textContent='✓ Aggiunto al carrello'}else $('#resourceCartToast').textContent='È già nel carrello';renderCartCount()}
function render(product){if(!product)return;renderedId=String(product.id||renderedId);$('#resourceLoading').classList.add('hidden');$('#resourceApp').classList.remove('hidden');const title=product.title||product.name||'Demon Resource',cat=product.category_name||product.category||'Scripts',price=Number(product.price_cents||0);document.title=`${title} • Demon Leaks`;$('#resourceBreadcrumbCategory').textContent=cat;$('#resourceBreadcrumbTitle').textContent=title;$('#resourceCategory').textContent=cat;$('#resourceTitle').textContent=title;$('#resourceDescription').textContent=product.description||'';$('#resourceType').textContent=price<=0?'FREE':'PREMIUM';$('#resourceVersion').textContent=product.version||'—';$('#resourceAuthor').textContent=product.author||'Demon Leaks';$('#resourceUpdated').textContent=String(product.updated_at||product.created_at||'—').slice(0,10);$('#resourcePrice').textContent=euro(price);$('#resourcePrice').classList.toggle('free',price<=0);$('#resourceFavoriteBtn').dataset.favoriteId=product.id;
 const media=$('#resourceMedia');media.innerHTML='';const vids=[product.youtube_url,product.video_url,...(Array.isArray(product.youtube_urls)?product.youtube_urls:[])].filter(Boolean),vid=vids.map(youtubeId).find(Boolean);if(vid){const f=document.createElement('iframe');f.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(vid)}`;f.title=title;f.loading='lazy';f.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';f.allowFullscreen=true;media.appendChild(f)}else{const i=document.createElement('img');i.src=product.image_url||'./assets/demon-banner.png';i.alt=title;i.decoding='async';i.onerror=()=>i.src='./assets/demon-banner.png';media.appendChild(i)}
 const gallery=[product.image_url,...(Array.isArray(product.gallery_urls)?product.gallery_urls:[])].filter(Boolean);const gr=$('#resourceGallery');gr.innerHTML='';gr.classList.toggle('hidden',!gallery.length);[...new Set(gallery)].slice(0,10).forEach(url=>{const b=document.createElement('button'),i=document.createElement('img');i.src=url;i.loading='lazy';i.decoding='async';b.appendChild(i);b.onclick=()=>{media.innerHTML='';const big=document.createElement('img');big.src=url;big.decoding='async';media.appendChild(big)};gr.appendChild(b)});
 const tags=Array.isArray(product.tags)?product.tags:[];$('#resourceTagsPanel').classList.toggle('hidden',!tags.length);$('#resourceTags').innerHTML=tags.map(t=>`<span class="resource-tag">${esc(t)}</span>`).join('');const main=$('#resourceMainAction');main.replaceWith(main.cloneNode(true));const m=$('#resourceMainAction');m.removeAttribute('data-demon-download');if(price<=0){m.querySelector('span').textContent='Scarica protetto';m.dataset.demonDownload=product.id}else{m.querySelector('span').textContent='Aggiungi al carrello';m.onclick=()=>{if(window.DEMON_DISCORD_CONNECTED!==true){window.DEMON_REQUIRE_DISCORD?.();return}addCart(product)}}}
async function init(){
  renderCartCount();

  $('#resourceCartBtn')?.addEventListener('click',()=>location.href='./#catalog');

  $('#resourceBack')?.addEventListener('click',event=>{
    try{
      const ref=document.referrer?new URL(document.referrer):null;
      if(ref && ref.origin===location.origin && history.length>1){
        event.preventDefault();
        history.back();
      }
    }catch{}
  });

  const id=new URLSearchParams(location.search).get('id');
  if(!id){
    $('#resourceLoading').textContent='Risorsa non specificata.';
    return;
  }

  let cached=null;
  try{
    cached=JSON.parse(sessionStorage.getItem(`demon_resource_cache_${id}`)||'null');
  }catch{}

  if(cached){
    cached.id=cached.id||id;
    render(cached);
  }

  try{
    const fresh=await Promise.race([
      loadFirebaseProduct(id),
      new Promise(resolve=>setTimeout(()=>resolve(null),4500))
    ]);

    if(fresh){
      render(fresh);
    }else if(!cached){
      $('#resourceLoading').textContent='La risorsa sta impiegando troppo a caricarsi. Torna allo store e riprova.';
    }
  }catch(error){
    console.error('[DEMON RESOURCE]',error);
    if(!cached){
      $('#resourceLoading').textContent='Impossibile caricare la risorsa. Torna allo store e riprova.';
    }
  }
}
init();