import {
  getDiscordFirebase,
  discordClaims,
  startDiscordLogin
} from './discord-session.js?v=8';

const $=q=>document.querySelector(q);
const fbCfg=window.DEMON_FIREBASE||{};
const AUTH_BASE=String(fbCfg.DISCORD_AUTH_BASE_URL||'').replace(/\/+$/,'');
const PUBLISHER_ID=Number(fbCfg.LINKVERTISE_PUBLISHER_ID||8419880);

function setCheck(id,text,state=''){
  const el=$(id);
  el.textContent=text;
  el.className=state;
}

function fail(message){
  $('#gateMessage').textContent=message;
  setCheck('#checkTicket','BLOCCATO','bad');
  $('#protectedDownloadLink').classList.add('disabled');
}

async function post(path,payload,idToken){
  const r=await fetch(`${AUTH_BASE}${path}`,{
    method:'POST',
    mode:'cors',
    headers:{
      'content-type':'application/json',
      'authorization':`Bearer ${idToken}`
    },
    body:JSON.stringify(payload)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.message||`HTTP ${r.status}`);
  return data;
}

async function init(){
  const ticket=new URLSearchParams(location.search).get('t')||'';
  if(!ticket){
    fail('Ticket download mancante.');
    return;
  }

  if(!/^https:\/\/.+/i.test(AUTH_BASE)||AUTH_BASE.includes('INSERISCI-WORKER')){
    fail('Backend Demon Leaks non configurato.');
    return;
  }

  const {auth}=await getDiscordFirebase();
  const user=auth.currentUser;

  if(!user){
    setCheck('#checkDiscord','NON CONNESSO','bad');
    $('#gateMessage').textContent='Per continuare devi accedere con Discord.';
    setTimeout(()=>startDiscordLogin(),700);
    return;
  }

  const claims=await discordClaims(user);
  if(!claims){
    setCheck('#checkDiscord','NON DISCORD','bad');
    $('#gateMessage').textContent='La sessione attuale non è un profilo Discord.';
    return;
  }

  setCheck('#checkDiscord',claims.global_name||claims.username||claims.discord_id,'ok');

  try{
    const token=await user.getIdToken(true);
    const result=await post('/download/arm',{ticket},token);

    setCheck('#checkTicket','VALIDO','ok');

    const link=$('#protectedDownloadLink');
    link.href=result.complete_url;
    link.classList.remove('disabled');

    // Se FullScript non è disponibile NON viene fornito alcun fallback diretto.
    if(typeof window.linkvertise!=='function'){
      setCheck('#checkLinkvertise','NON DISPONIBILE','bad');
      link.classList.add('disabled');
      $('#gateMessage').textContent='Linkvertise non è disponibile. Riprova senza ad blocker.';
      return;
    }

    // FullScript applicato soltanto al nostro endpoint di completamento.
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
