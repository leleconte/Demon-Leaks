import{
  startDiscordLogin,consumeDiscordCallback,cachedProfile,
  getAccount,logoutDiscord,avatarUrl
}from'./discord-session.js?v=10.4';

const $=q=>document.querySelector(q);
let profile=cachedProfile();

function publish(p){
  profile=p||null;
  window.DEMON_DISCORD_CONNECTED=!!p;
  window.DEMON_DISCORD_PROFILE=p||null;
  window.DEMON_REQUIRE_DISCORD=()=>startDiscordLogin();
  window.dispatchEvent(new CustomEvent('demon:discord-state',{detail:{connected:!!p,profile:p||null}}));
}

function paint(p){
  const btn=$('#discordAuthBtn');
  if(!btn)return;

  const avatar=btn.querySelector('.discord-auth-avatar');
  const label=btn.querySelector('.discord-auth-label');
  const state=btn.querySelector('.discord-auth-state');

  if(p){
    btn.classList.add('logged-in');
    avatar.innerHTML=`<img src="${avatarUrl(p,64)}" alt="">`;
    label.textContent='Il tuo account';
    state.textContent=p.global_name||p.username||'Discord';
    btn.title='Apri il tuo account Demon Leaks';
  }else{
    btn.classList.remove('logged-in');
    avatar.textContent='◉';
    label.textContent='Discord';
    state.textContent='Accedi';
    btn.title='Accedi con Discord';
  }
}

function showBlocked(data){
  const overlay=$('#discordBlockedOverlay');
  if(!overlay)return;

  if(!data){
    overlay.classList.add('hidden');
    return;
  }

  $('#blockedDiscordName').textContent=
    data.discord_tag||profile?.global_name||profile?.username||'Discord user';
  $('#blockedDiscordId').textContent=
    data.discord_id||profile?.discord_id||'—';
  $('#blockedReason').textContent=data.reason||'Account bloccato.';
  overlay.classList.remove('hidden');
}

async function refreshAccount(){
  if(!profile)return;

  try{
    const account=await getAccount();
    if(account.profile){
      profile={...profile,...account.profile};
      localStorage.setItem('demon_discord_profile_v102',JSON.stringify(profile));
      paint(profile);
      publish(profile);
    }
    showBlocked(account.blocked||null);
  }catch(error){
    if(error.code==='BLOCKED'){
      showBlocked(error.data?.blocked||{
        discord_id:profile.discord_id,
        reason:error.message
      });
      return;
    }

    if(/scaduta|DISCORD_REQUIRED/i.test(String(error.message||''))){
      profile=null;
      paint(null);
      publish(null);
    }

    console.warn('[DEMON ACCOUNT REFRESH]',error);
  }
}

async function init(){
  paint(profile);
  publish(profile);

  try{
    const callbackProfile=await consumeDiscordCallback();
    if(callbackProfile){
      profile=callbackProfile;
      paint(profile);
      publish(profile);
    }
  }catch(error){
    console.error('[DEMON DISCORD CALLBACK]',error);
  }

  if(profile)await refreshAccount();

  $('#discordAuthBtn')?.addEventListener('click',()=>{
    if(profile)location.href='./profile.html';
    else startDiscordLogin();
  });

  $('#blockedLogoutBtn')?.addEventListener('click',async()=>{
    await logoutDiscord();
    location.href='./';
  });
}

init().catch(error=>console.error('[DEMON DISCORD INIT]',error));
