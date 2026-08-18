const VERSION='12.17.1';
const fbCfg=window.DEMON_FIREBASE||{};
const config=fbCfg.CONFIG||{};
const AUTH_BASE=String(fbCfg.DISCORD_AUTH_BASE_URL||'').replace(/\/+$/,'');
const USER_APP_NAME='demon-public-user';
let ctxPromise=null;

function workerConfigured(){return /^https:\/\/.+/i.test(AUTH_BASE)&&!AUTH_BASE.includes('INSERISCI-WORKER')}

function decodeBase64UrlJson(segment){
  const value=String(segment||'').replace(/-/g,'+').replace(/_/g,'/');
  const padded=value+'='.repeat((4-value.length%4)%4);
  return JSON.parse(atob(padded));
}

function validateCustomTokenShape(token){
  const parts=String(token||'').split('.');
  if(parts.length!==3){
    throw new Error('Il Worker ha restituito un token Firebase non valido.');
  }
  try{
    decodeBase64UrlJson(parts[0]);
    decodeBase64UrlJson(parts[1]);
  }catch{
    throw new Error('Il Worker ha restituito un token Firebase corrotto. Controlla FIREBASE_PRIVATE_KEY in Cloudflare.');
  }
}

export async function getDiscordFirebase(){
  if(ctxPromise)return ctxPromise;
  ctxPromise=(async()=>{
    const [appMod,authMod,fs]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore.js`)
    ]);
    let app;
    try{app=appMod.getApp(USER_APP_NAME)}catch{app=appMod.initializeApp(config,USER_APP_NAME)}
    let auth;
    try{
      auth=authMod.initializeAuth(app,{persistence:authMod.browserLocalPersistence});
    }catch{
      auth=authMod.getAuth(app);
      try{await authMod.setPersistence(auth,authMod.browserLocalPersistence)}catch{}
    }
    if(typeof auth.authStateReady==='function')await auth.authStateReady().catch(()=>{});
    return {app,auth,db:fs.getFirestore(app),authMod,fs};
  })();
  return ctxPromise;
}

export function startDiscordLogin(){
  if(!workerConfigured())throw new Error('Discord OAuth non configurato.');
  location.href=`${AUTH_BASE}/auth/login`;
}

export async function signInWithWorkerToken(token){
  if(!token)throw new Error('Token Firebase mancante.');
  validateCustomTokenShape(token);
  const {auth,authMod}=await getDiscordFirebase();
  await authMod.setPersistence(auth,authMod.browserLocalPersistence).catch(()=>{});
  const result=await authMod.signInWithCustomToken(auth,token);
  await result.user.getIdToken(true);
  return result.user;
}

export async function discordClaims(user,forceRefresh=false){
  if(!user)return null;
  try{
    const result=await user.getIdTokenResult(forceRefresh);
    const c=result.claims||{};
    if(c.provider==='discord'&&c.discord_id){
      return {discord_id:String(c.discord_id),username:String(c.discord_username||''),global_name:String(c.discord_global_name||''),avatar:String(c.discord_avatar||''),uid:user.uid};
    }
  }catch(error){console.warn('[DEMON DISCORD CLAIMS]',error)}
  if(/^discord_\d+$/.test(String(user.uid||''))){
    try{
      const {db,fs}=await getDiscordFirebase();
      const snap=await fs.getDoc(fs.doc(db,'users',user.uid));
      if(snap.exists()){
        const d=snap.data(),id=String(d.discord_id||user.uid.replace(/^discord_/,''));
        return {discord_id:id,username:String(d.username||''),global_name:String(d.global_name||''),avatar:'',avatar_url:String(d.avatar_url||''),uid:user.uid};
      }
    }catch{}
  }
  return null;
}

export function avatarUrl(p,size=64){
  if(p?.avatar_url)return p.avatar_url;
  if(!p?.discord_id||!p?.avatar)return './assets/demon-logo.jpg';
  return `https://cdn.discordapp.com/avatars/${encodeURIComponent(p.discord_id)}/${encodeURIComponent(p.avatar)}.png?size=${size}`;
}

export async function ensureDiscordProfile(user){
  const p=await discordClaims(user,true).catch(()=>null);
  if(!p)return null;
  const {db,fs}=await getDiscordFirebase();
  const ref=fs.doc(db,'users',user.uid);let old={};
  try{const s=await fs.getDoc(ref);old=s.exists()?s.data():{}}catch{}
  const row={discord_id:p.discord_id,username:p.username,global_name:p.global_name,avatar_url:avatarUrl(p,128),provider:'discord',created_at:old.created_at||new Date().toISOString(),last_login_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  try{await fs.setDoc(ref,row,{merge:true})}catch(e){console.warn('[DEMON PROFILE SAVE]',e)}
  return {...p,...row};
}

export async function logoutDiscord(){
  const {auth,authMod}=await getDiscordFirebase();
  await authMod.signOut(auth);
  localStorage.removeItem('demon_discord_ui_cache');
}
