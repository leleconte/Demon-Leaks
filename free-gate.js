import{
  cachedProfile,startDiscordLogin,getSessionToken
}from'./discord-session.js?v=10.3';

const $=q=>document.querySelector(q);
const fbCfg=window.DEMON_FIREBASE||{};
const AUTH_BASE=String(fbCfg.DISCORD_AUTH_BASE_URL||'').replace(/\/+$/,'');
const PUBLISHER_ID=Number(fbCfg.LINKVERTISE_PUBLISHER_ID||8419880);

function setCheck(id,text,state=''){
  const el=$(id);
  if(!el)return;
  el.textContent=text;
  el.className=state;
}

function fail(message){
  $('#gateMessage').textContent=message;
  setCheck('#checkTicket','BLOCCATO','bad');
  $('#protectedDownloadLink').classList.add('disabled');
}

async function post(path,payload){
  const r=await fetch(`${AUTH_BASE}${path}`,{
    method:'POST',
    mode:'cors',
    headers:{
      'content-type':'application/json',
      'authorization':`Bearer ${getSessionToken()}`
    },
    body:JSON.stringify(payload)
  });

  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.message||`HTTP ${r.status}`);
  return data;
}

async function init(){
  const ticket=new URLSearchParams(location.search).get('t')||'';
  if(!ticket){fail('Ticket download mancante.');return}

  const profile=cachedProfile();
  if(!profile){
    setCheck('#checkDiscord','NON CONNESSO','bad');
    $('#gateMessage').textContent='Per continuare devi accedere con Discord.';
    setTimeout(()=>startDiscordLogin(),700);
    return;
  }

  setCheck('#checkDiscord',profile.global_name||profile.username||profile.discord_id,'ok');

  try{
    const result=await post('/download/arm',{ticket});
    setCheck('#checkTicket','VALIDO','ok');

    const link=$('#protectedDownloadLink');
    link.href=result.complete_url;
    link.classList.remove('disabled');

    if(typeof window.linkvertise!=='function'){
      setCheck('#checkLinkvertise','NON DISPONIBILE','bad');
      link.classList.add('disabled');
      $('#gateMessage').textContent='Linkvertise non è disponibile. Riprova senza ad blocker.';
      return;
    }

    window.linkvertise(PUBLISHER_ID,{
      whitelist:['download/complete'],
      blacklist:['paypal.me','discord.com','discord.gg']
    });

    setCheck('#checkLinkvertise','PRONTO','ok');
    $('#gateMessage').textContent='Verifica completata. Continua tramite Linkvertise.';

  }catch(error){
    console.error('[DEMON FREE GATE]',error);
    fail(error.message||'Download bloccato.');
  }
}
init();
