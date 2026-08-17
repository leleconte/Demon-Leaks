import{
  getDiscordFirebase,startDiscordLogin,consumeDiscordCallback,resumePendingDiscordCallback,
  discordClaims,ensureDiscordProfile,logoutDiscord,avatarUrl
}from'./discord-session.js?v=9';

const $=q=>document.querySelector(q);
let stopBlock=null;

function cachedProfile(){
  try{return JSON.parse(localStorage.getItem('demon_discord_ui_cache')||'null')}
  catch{return null}
}

function publish(connected,profile=null){
  window.DEMON_DISCORD_CONNECTED=!!connected;
  window.DEMON_DISCORD_PROFILE=profile||null;
  window.DEMON_REQUIRE_DISCORD=()=>startDiscordLogin();
  window.dispatchEvent(new CustomEvent('demon:discord-state',{detail:{connected:!!connected,profile}}));
}

function paint(profile,checking=false){
  const btn=$('#discordAuthBtn');
  if(!btn)return;

  const avatar=btn.querySelector('.discord-auth-avatar');
  const label=btn.querySelector('.discord-auth-label');
  const state=btn.querySelector('.discord-auth-state');

  if(profile){
    btn.classList.add('logged-in');
    avatar.innerHTML=`<img src="${avatarUrl(profile,64)}" alt="">`;
    label.textContent=profile.global_name||profile.username||'Profilo';
    state.textContent=checking?'Verifica…':'Connesso';
    btn.title='Apri il tuo profilo Demon Leaks';
  }else{
    btn.classList.remove('logged-in');
    avatar.textContent='◉';
    label.textContent='Discord';
    state.textContent=checking?'Verifica…':'Accedi';
    btn.title='Accedi con Discord';
  }
}

function showBlock(profile,data){
  const overlay=$('#discordBlockedOverlay');
  if(!overlay)return;
  if(!data){overlay.classList.add('hidden');return}

  $('#blockedDiscordName').textContent=profile?.global_name||profile?.username||data.discord_tag||'Discord user';
  $('#blockedDiscordId').textContent=profile?.discord_id||data.discord_id||'—';
  $('#blockedReason').textContent=data.reason||'Account bloccato.';
  overlay.classList.remove('hidden');
}

async function watchOwnBlock(profile){
  if(stopBlock){stopBlock();stopBlock=null}
  const {db,fs}=await getDiscordFirebase();
  stopBlock=fs.onSnapshot(
    fs.doc(db,'blockedUsers',profile.discord_id),
    snap=>showBlock(profile,snap.exists()?snap.data():null),
    error=>console.warn('[DEMON BLOCK WATCH]',error)
  );
}

async function init(){
  const cached=cachedProfile();
  if(cached){paint(cached,true);publish(true,cached)}
  else paint(null,true);

  try{await consumeDiscordCallback()}
  catch(error){console.error('[DEMON DISCORD CALLBACK]',error)}

  await resumePendingDiscordCallback().catch(()=>{});

  const {auth,authMod}=await getDiscordFirebase();

  authMod.onAuthStateChanged(auth,async user=>{
    if(stopBlock){stopBlock();stopBlock=null}

    if(!user){
      localStorage.removeItem('demon_discord_ui_cache');
      paint(null,false);
      publish(false,null);
      showBlock(null,null);
      return;
    }

    const profile=await discordClaims(user);

    if(!profile){
      // Never sign out automatically here. A temporary claims/profile
      // read problem must not erase a valid persistent Firebase session.
      paint(cachedProfile(),false);
      publish(!!cachedProfile(),cachedProfile());
      return;
    }

    paint(profile,false);
    publish(true,profile);
    localStorage.setItem('demon_discord_ui_cache',JSON.stringify(profile));

    ensureDiscordProfile(user).then(full=>{
      if(!full)return;
      paint(full,false);
      publish(true,full);
      localStorage.setItem('demon_discord_ui_cache',JSON.stringify(full));
    }).catch(()=>{});

    watchOwnBlock(profile).catch(()=>{});
  });

  $('#discordAuthBtn')?.addEventListener('click',async()=>{
    const profile=auth.currentUser?await discordClaims(auth.currentUser):null;
    if(profile)location.href='./profile.html';
    else startDiscordLogin();
  });

  $('#blockedLogoutBtn')?.addEventListener('click',async()=>{
    await logoutDiscord();
    location.href='./';
  });
}

init().catch(error=>{
  console.error('[DEMON DISCORD INIT]',error);
  paint(cachedProfile(),false);
});
