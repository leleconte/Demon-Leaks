import{
  cachedProfile,startDiscordLogin,listFavorites,toggleFavorite
}from'./discord-session.js?v=10.2';

const favorites=new Set();

function sync(){
  document.querySelectorAll('[data-favorite-id]').forEach(btn=>{
    const id=String(btn.dataset.favoriteId||'');
    const active=favorites.has(id);
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',String(active));
    const heart=btn.querySelector('[data-heart]');
    if(heart)heart.textContent=active?'♥':'♡';
  });
}

async function load(){
  favorites.clear();
  if(!cachedProfile()){sync();return}

  try{
    const rows=await listFavorites();
    rows.forEach(row=>favorites.add(String(row.product_id||row.id||'')));
  }catch(error){
    console.warn('[DEMON FAVORITES LOAD]',error);
  }

  sync();
}

document.addEventListener('click',event=>{
  const btn=event.target.closest('[data-favorite-id]');
  if(!btn)return;

  event.preventDefault();
  event.stopPropagation();

  const id=String(btn.dataset.favoriteId||'');
  if(!cachedProfile()){
    startDiscordLogin();
    return;
  }

  toggleFavorite(id).then(result=>{
    if(result.favorite===true)favorites.add(id);
    else favorites.delete(id);
    sync();
  }).catch(error=>{
    console.error('[DEMON FAVORITE]',error);
  });
});

new MutationObserver(sync).observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('demon:discord-state',()=>load());
load();
