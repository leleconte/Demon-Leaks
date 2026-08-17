import{getDiscordFirebase,startDiscordLogin,consumeDiscordCallback,discordClaims,ensureDiscordProfile,logoutDiscord,avatarUrl}from'./discord-session.js?v=8';
const $=q=>document.querySelector(q);let stopBlock=null;
function cache(){try{return JSON.parse(localStorage.getItem('demon_discord_ui_cache')||'null')}catch{return null}}
function globals(ok,p=null){window.DEMON_DISCORD_CONNECTED=!!ok;window.DEMON_DISCORD_PROFILE=p;window.DEMON_REQUIRE_DISCORD=()=>startDiscordLogin()}
function paint(p,checking=false){
 const b=$('#discordAuthBtn');if(!b)return;const av=b.querySelector('.discord-auth-avatar'),lab=b.querySelector('.discord-auth-label'),st=b.querySelector('.discord-auth-state');
 if(p){b.classList.add('logged-in');av.innerHTML=`<img src="${avatarUrl(p,64)}" alt="">`;lab.textContent=p.global_name||p.username||'Profilo';st.textContent=checking?'Verifica…':'Connesso'}
 else{b.classList.remove('logged-in');av.textContent='◉';lab.textContent='Discord';st.textContent=checking?'Verifica…':'Accedi'}
}
function blockOverlay(p,d){const o=$('#discordBlockedOverlay');if(!o)return;if(d){$('#blockedDiscordName').textContent=p?.global_name||p?.username||d.discord_tag||'Discord user';$('#blockedDiscordId').textContent=p?.discord_id||d.discord_id||'—';$('#blockedReason').textContent=d.reason||'Account bloccato';o.classList.remove('hidden')}else o.classList.add('hidden')}
async function watchBlock(p){if(stopBlock)stopBlock();const {db,fs}=await getDiscordFirebase();stopBlock=fs.onSnapshot(fs.doc(db,'blockedUsers',p.discord_id),s=>blockOverlay(p,s.exists()?s.data():null))}
async function init(){
 const c=cache();if(c){paint(c,true);globals(true,c)}else paint(null,true);
 try{await consumeDiscordCallback()}catch(e){console.error('[DEMON CALLBACK]',e)}
 const {auth,authMod}=await getDiscordFirebase();
 authMod.onAuthStateChanged(auth,async u=>{
  if(!u){if(stopBlock)stopBlock();localStorage.removeItem('demon_discord_ui_cache');paint(null,false);globals(false,null);return}
  const p=await discordClaims(u);if(!p){paint(null,false);globals(false,null);return}
  paint(p,false);globals(true,p);localStorage.setItem('demon_discord_ui_cache',JSON.stringify(p));
  ensureDiscordProfile(u).then(full=>{if(full){paint(full,false);globals(true,full);localStorage.setItem('demon_discord_ui_cache',JSON.stringify(full))}}).catch(()=>{});
  watchBlock(p).catch(()=>{});
 });
 $('#discordAuthBtn')?.addEventListener('click',async()=>{const p=auth.currentUser?await discordClaims(auth.currentUser):null;p?location.href='./profile.html':startDiscordLogin()});
 $('#sidebarDiscordBtn')?.addEventListener('click',()=>startDiscordLogin());
 $('#blockedLogoutBtn')?.addEventListener('click',async()=>{await logoutDiscord();location.href='./'});
}
init().catch(e=>{console.error('[DEMON DISCORD INIT]',e);paint(null,false);globals(false,null)});
