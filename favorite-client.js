import{
  getDiscordFirebase,startDiscordLogin,discordClaims
}from'./discord-session.js?v=9';

const favorites=new Set();

function syncButtons(){
  document.querySelectorAll('[data-favorite-id]').forEach(btn=>{
    const active=favorites.has(String(btn.dataset.favoriteId||''));
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',String(active));
    const heart=btn.querySelector('[data-heart]');
    if(heart)heart.textContent=active?'♥':'♡';
  });
}

async function context(){
  const ctx=await getDiscordFirebase();
  const user=ctx.auth.currentUser;
  if(!user)return null;
  const profile=await discordClaims(user);
  return profile?{...ctx,user,profile}:null;
}

async function load(){
  favorites.clear();
  const ctx=await context();
  if(ctx){
    const snap=await ctx.fs.getDocs(ctx.fs.collection(ctx.db,'users',ctx.user.uid,'favorites'));
    snap.forEach(d=>favorites.add(d.id));
  }
  syncButtons();
}

async function toggle(productId){
  const ctx=await context();
  if(!ctx){
    startDiscordLogin();
    return;
  }

  const ref=ctx.fs.doc(ctx.db,'users',ctx.user.uid,'favorites',String(productId));

  if(favorites.has(String(productId))){
    await ctx.fs.deleteDoc(ref);
    favorites.delete(String(productId));
  }else{
    await ctx.fs.setDoc(ref,{
      product_id:String(productId),
      created_at:new Date().toISOString()
    });
    favorites.add(String(productId));
  }

  syncButtons();
  window.dispatchEvent(new CustomEvent('demon:favorites-changed',{detail:[...favorites]}));
}

document.addEventListener('click',event=>{
  const btn=event.target.closest('[data-favorite-id]');
  if(!btn)return;
  event.preventDefault();
  event.stopPropagation();
  toggle(btn.dataset.favoriteId).catch(console.error);
});

new MutationObserver(syncButtons).observe(document.documentElement,{subtree:true,childList:true});

getDiscordFirebase()
  .then(({auth,authMod})=>authMod.onAuthStateChanged(auth,()=>load().catch(console.error)))
  .catch(()=>{});
