const cfg=window.DEMON_FIREBASE||{};
const AUTH_BASE=String(cfg.DISCORD_AUTH_BASE_URL||'').replace(/\/+$/,'');
const STORAGE_KEY='demon_discord_session_v102';
const PROFILE_KEY='demon_discord_profile_v102';

function workerReady(){
  return /^https:\/\/.+/i.test(AUTH_BASE)&&!AUTH_BASE.includes('INSERISCI-WORKER');
}

function decodeBase64Url(segment){
  let s=String(segment||'').replace(/-/g,'+').replace(/_/g,'/');
  s+='='.repeat((4-s.length%4)%4);
  return atob(s);
}

function parseSession(token){
  try{
    const parts=String(token||'').split('.');
    if(parts.length!==3)return null;
    const payload=JSON.parse(decodeBase64Url(parts[1]));
    if(!payload.discord_id||!payload.exp)return null;
    if(Number(payload.exp)*1000<=Date.now())return null;
    return {
      discord_id:String(payload.discord_id),
      username:String(payload.discord_username||''),
      global_name:String(payload.discord_global_name||''),
      avatar:String(payload.discord_avatar||''),
      uid:`discord_${payload.discord_id}`,
      exp:Number(payload.exp)
    };
  }catch{return null}
}

export function getSessionToken(){
  return localStorage.getItem(STORAGE_KEY)||'';
}

export function setSessionToken(token){
  const profile=parseSession(token);
  if(!profile)throw new Error('Sessione Discord restituita dal Worker non valida.');
  localStorage.setItem(STORAGE_KEY,String(token));
  localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
  return profile;
}

export function clearSession(){
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export function cachedProfile(){
  const token=getSessionToken();
  const parsed=parseSession(token);
  if(parsed)return parsed;
  clearSession();
  return null;
}

export function startDiscordLogin(){
  if(!workerReady())throw new Error('Discord OAuth non è ancora configurato.');
  location.href=`${AUTH_BASE}/auth/login`;
}

export async function consumeDiscordCallback(){
  const params=new URLSearchParams(location.hash.replace(/^#/,''));
  const token=params.get('demon_session');
  const error=params.get('discord_error');

  if(error){
    history.replaceState(null,'',location.pathname+location.search);
    throw new Error(decodeURIComponent(error));
  }

  if(!token)return null;

  const profile=setSessionToken(token);
  history.replaceState(null,'',location.pathname+location.search);
  return profile;
}

export function avatarUrl(profile,size=64){
  if(profile?.avatar_url)return profile.avatar_url;
  if(!profile?.discord_id||!profile?.avatar)return './assets/demon-logo.jpg';
  return `https://cdn.discordapp.com/avatars/${encodeURIComponent(profile.discord_id)}/${encodeURIComponent(profile.avatar)}.png?size=${size}`;
}

async function api(path,{method='GET',body=null}={}){
  if(!workerReady())throw new Error('Backend Demon Leaks non configurato.');

  const token=getSessionToken();
  if(!token)throw new Error('DISCORD_REQUIRED');

  const response=await fetch(`${AUTH_BASE}${path}`,{
    method,
    mode:'cors',
    headers:{
      'authorization':`Bearer ${token}`,
      ...(body?{'content-type':'application/json'}:{})
    },
    ...(body?{body:JSON.stringify(body)}:{})
  });

  let data={};
  try{data=await response.json()}catch{}

  if(response.status===401){
    clearSession();
    throw new Error(data.message||'Sessione Discord scaduta.');
  }

  if(response.status===423){
    throw Object.assign(new Error(data.message||'Account bloccato.'),{code:'BLOCKED',data});
  }

  if(!response.ok){
    throw new Error(data.message||`Errore backend (${response.status}).`);
  }

  return data;
}

export async function getAccount(){
  return api('/account/me');
}

export async function toggleFavorite(productId){
  return api('/favorite/toggle',{
    method:'POST',
    body:{product_id:String(productId)}
  });
}

export async function listFavorites(){
  const data=await api('/favorite/list');
  return Array.isArray(data.favorites)?data.favorites:[];
}

export async function logoutDiscord(){
  clearSession();
}
