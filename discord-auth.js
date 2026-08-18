import{getDiscordFirebase,startDiscordLogin,discordClaims,ensureDiscordProfile,logoutDiscord,avatarUrl}from'./discord-session.js?v=10';
const $=q=>document.querySelector(q);let stopBlock=null;
function cached(){try{return JSON.parse(localStorage.getItem('demon_discord_ui_cache')||'null')}catch{return null}}
function publish(ok,p=null){window.DEMON_DISCORD_CONNECTED=!!ok;window.DEMON_DISCORD_PROFILE=p;window.DEMON_REQUIRE_DISCORD=()=>startDiscordLogin();window.dispatchEvent(new CustomEvent('demon:discord-state',{detail:{connected:!!ok,profile:p}}))}
function paint(p,checking=false){const b=$('#discordAuthBtn');if(!b)return;const av=b.querySelector('.discord-auth-avatar'),lab=b.querySelector('.discord-auth-label'),st=b.querySelector('.discord-auth-state');if(p){b.classList.add('logged-in','account-mode');av.innerHTML=`<img src="${avatarUrl(p,64)}" alt="">`;lab.textContent='Il tuo account';st.textContent=checking?'Verifica…':(p.global_name||p.username||'Discord');b.title='Apri il tuo account, preferiti e download';}else{b.classList.remove('logged-in','account-mode');av.textContent='◉';lab.textContent='Discord';st.textContent=checking?'Verifica…':'Accedi';b.title='Accedi con Discord'}}
function showBlock(p,d){const o=$('#discordBlockedOverlay');if(!o)return;if(!d){o.classList.add('hidden');return}$('#blockedDiscordName').textContent=p?.global_name||p?.username||d.discord_tag||'Discord user';$('#blockedDiscordId').textContent=p?.discord_id||d.discord_id||'—';$('#blockedReason').textContent=d.reason||'Account bloccato';o.classList.remove('hidden')}
async function watchBlock(p){if(stopBlock)stopBlock();const {db,fs}=await getDiscordFirebase();stopBlock=fs.onSnapshot(fs.doc(db,'blockedUsers',p.discord_id),s=>showBlock(p,s.exists()?s.data():null),e=>console.warn('[DEMON BLOCK]',e))}
async function init(){
 const c=cached();if(c){paint(c,true);publish(true,c)}else paint(null,true);
 const {auth,authMod}=await getDiscordFirebase();
 if(typeof auth.authStateReady==='function')await auth.authStateReady().catch(()=>{});
 const settle=async user=>{
  if(stopBlock){stopBlock();stopBlock=null}
  if(!user){localStorage.removeItem('demon_discord_ui_cache');paint(null,false);publish(false,null);showBlock(null,null);return}
  const p=await discordClaims(user,true);
  if(!p){const cc=cached();paint(cc,false);publish(!!cc,cc);return}
  localStorage.setItem('demon_discord_ui_cache',JSON.stringify(p));paint(p,false);publish(true,p);watchBlock(p).catch(()=>{});
  ensureDiscordProfile(user).then(full=>{if(full){localStorage.setItem('demon_discord_ui_cache',JSON.stringify(full));paint(full,false);publish(true,full)}}).catch(()=>{});
 };
 await settle(auth.currentUser);
 authMod.onAuthStateChanged(auth,user=>settle(user).catch(console.error));
 $('#discordAuthBtn')?.addEventListener('click',async()=>{const p=auth.currentUser?await discordClaims(auth.currentUser):null;if(p)location.href='./profile.html';else startDiscordLogin()});
 $('#blockedLogoutBtn')?.addEventListener('click',async()=>{await logoutDiscord();location.href='./'});
}
init().catch(e=>{console.error('[DEMON DISCORD INIT]',e);paint(cached(),false)});