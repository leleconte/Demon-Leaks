import {
  getDiscordFirebase,
  discordClaims,
  startDiscordLogin
} from './discord-session.js?v=10.1';

const fbCfg=window.DEMON_FIREBASE||{};
const AUTH_BASE=String(fbCfg.DISCORD_AUTH_BASE_URL||'').replace(/\/+$/,'');
let busy=false;

function toast(message){
  const el=document.querySelector('#toast')||document.querySelector('#profileToast');
  if(!el){alert(message);return;}
  el.textContent=message;
  el.classList.add('show');
  clearTimeout(window.__demonDownloadToast);
  window.__demonDownloadToast=setTimeout(()=>el.classList.remove('show'),2800);
}

function workerReady(){
  return /^https:\/\/.+/i.test(AUTH_BASE) && !AUTH_BASE.includes('INSERISCI-WORKER');
}

async function requireDiscordUser(){
  const {auth}=await getDiscordFirebase();
  const user=auth.currentUser;

  if(!user){
    toast('Devi accedere con Discord prima di scaricare.');
    setTimeout(()=>startDiscordLogin(),450);
    return null;
  }

  const profile=await discordClaims(user);
  if(!profile){
    toast('Questa sessione non è collegata a Discord.');
    setTimeout(()=>startDiscordLogin(),450);
    return null;
  }

  return {user,profile};
}

async function workerPost(path,payload,idToken){
  const response=await fetch(`${AUTH_BASE}${path}`,{
    method:'POST',
    mode:'cors',
    headers:{
      'content-type':'application/json',
      'authorization':`Bearer ${idToken}`
    },
    body:JSON.stringify(payload||{})
  });

  let data={};
  try{data=await response.json()}catch{}

  if(!response.ok){
    if(response.status===423 || data.code==='BLOCKED'){
      toast('Account bloccato dal sistema di sicurezza.');
      setTimeout(()=>location.reload(),650);
      throw new Error(data.message||'Account bloccato.');
    }

    if(response.status===401){
      toast('Sessione Discord scaduta. Accedi nuovamente.');
      throw new Error(data.message||'Sessione Discord non valida.');
    }

    throw new Error(data.message||`Download non disponibile (${response.status}).`);
  }

  return data;
}

export async function startProtectedDownload(productId){
  if(busy)return;
  busy=true;

  try{
    if(!workerReady()){
      throw new Error('Backend download non ancora configurato.');
    }

    const ctx=await requireDiscordUser();
    if(!ctx)return;

    const idToken=await ctx.user.getIdToken(true);
    toast('Verifica sicurezza in corso…');

    const result=await workerPost(
      '/download/start',
      {product_id:String(productId||'')},
      idToken
    );

    if(result.mode==='linkvertise' && result.gate_url){
      location.href=result.gate_url;
      return;
    }

    if(result.mode==='direct' && result.url){
      location.href=result.url;
      return;
    }

    throw new Error('Risposta download non valida.');

  }catch(error){
    console.error('[DEMON PROTECTED DOWNLOAD]',error);
    toast(error.message||'Impossibile avviare il download.');
  }finally{
    busy=false;
  }
}

// Intercetta tutti i download dello store e del profilo.
document.addEventListener('click',event=>{
  const btn=event.target.closest('[data-demon-download]');
  if(!btn)return;
  event.preventDefault();
  startProtectedDownload(btn.dataset.demonDownload);
});
