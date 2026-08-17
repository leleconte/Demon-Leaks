import{getDiscordFirebase,startDiscordLogin,discordClaims}from'./discord-session.js?v=8';
const favs=new Set();
async function ctx(){const c=await getDiscordFirebase();const u=c.auth.currentUser;if(!u)return null;const p=await discordClaims(u);return p?{...c,user:u,profile:p}:null}
function sync(){document.querySelectorAll('[data-favorite-id]').forEach(b=>{const on=favs.has(b.dataset.favoriteId);b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));b.title=on?'Rimuovi dai preferiti':'Aggiungi ai preferiti';const s=b.querySelector('[data-heart]');if(s)s.textContent=on?'♥':'♡'})}
async function load(){const c=await ctx();favs.clear();if(c){const s=await c.fs.getDocs(c.fs.collection(c.db,'users',c.user.uid,'favorites'));s.forEach(d=>favs.add(d.id))}sync();window.dispatchEvent(new CustomEvent('demon:favorites-ready',{detail:[...favs]}))}
async function toggle(id){const c=await ctx();if(!c){startDiscordLogin();return}const ref=c.fs.doc(c.db,'users',c.user.uid,'favorites',id);if(favs.has(id)){await c.fs.deleteDoc(ref);favs.delete(id)}else{await c.fs.setDoc(ref,{product_id:id,created_at:new Date().toISOString()});favs.add(id)}sync();window.dispatchEvent(new CustomEvent('demon:favorites-changed',{detail:[...favs]}))}
document.addEventListener('click',e=>{const b=e.target.closest('[data-favorite-id]');if(!b)return;e.preventDefault();e.stopPropagation();toggle(b.dataset.favoriteId).catch(console.error)});
new MutationObserver(sync).observe(document.documentElement,{subtree:true,childList:true});
getDiscordFirebase().then(({auth,authMod})=>authMod.onAuthStateChanged(auth,()=>load().catch(console.error))).catch(()=>{});
