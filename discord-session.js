const VERSION='12.17.1';
const fbCfg=window.DEMON_FIREBASE||{};
const config=fbCfg.CONFIG||{};
const AUTH_BASE=String(fbCfg.DISCORD_AUTH_BASE_URL||'').replace(/\/+$/,'');
const USER_APP_NAME='demon-public-user-v8';
let ctxPromise=null;
function workerConfigured(){return /^https:\/\/.+/i.test(AUTH_BASE)&&!AUTH_BASE.includes('INSERISCI-WORKER')}
export async function getDiscordFirebase(){
 if(ctxPromise)return ctxPromise;
 ctxPromise=(async()=>{
  const appMod=await import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-app.js`);
  const authMod=await import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-auth.js`);
  const fs=await import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore.js`);
  let app=appMod.getApps().find(a=>a.name===USER_APP_NAME);
  if(!app)app=appMod.initializeApp(config,USER_APP_NAME);
  let auth;
  try{auth=authMod.initializeAuth(app,{persistence:[authMod.indexedDBLocalPersistence,authMod.browserLocalPersistence,authMod.browserSessionPersistence]})}
  catch{auth=authMod.getAuth(app)}
  if(typeof auth.authStateReady==='function')await auth.authStateReady();
  const db=fs.getFirestore(app);
  return {app,auth,db,authMod,fs};
 })();return ctxPromise;
}
export function startDiscordLogin(){if(!workerConfigured())throw new Error('Discord OAuth non configurato.');location.href=`${AUTH_BASE}/auth/login`}
export async function consumeDiscordCallback(){
 const h=new URLSearchParams(location.hash.replace(/^#/,''));
 const token=h.get('firebase_token'),error=h.get('discord_error');
 if(error){history.replaceState(null,'',location.pathname+location.search);throw new Error(decodeURIComponent(error))}
 if(!token)return false;
 const {auth,authMod}=await getDiscordFirebase();
 const result=await authMod.signInWithCustomToken(auth,token);
 await result.user.getIdToken(true);
 const p=await discordClaims(result.user).catch(()=>null);
 if(p)localStorage.setItem('demon_discord_ui_cache',JSON.stringify(p));
 history.replaceState(null,'',location.pathname+location.search);return true;
}
export async function discordClaims(user){
 if(!user)return null;
 try{const result=await user.getIdTokenResult();const c=result.claims||{};if(c.provider==='discord'&&c.discord_id)return {discord_id:String(c.discord_id),username:String(c.discord_username||''),global_name:String(c.discord_global_name||''),avatar:String(c.discord_avatar||''),uid:user.uid,claims_verified:true}}catch{}
 try{const {db,fs}=await getDiscordFirebase();const s=await fs.getDoc(fs.doc(db,'users',user.uid));if(s.exists()){const d=s.data(),id=String(d.discord_id||'');if(id&&user.uid===`discord_${id}`)return {discord_id:id,username:String(d.username||''),global_name:String(d.global_name||''),avatar:'',avatar_url:String(d.avatar_url||''),uid:user.uid,claims_verified:false}}}catch{}
 return null;
}
export function avatarUrl(p,size=64){if(p?.avatar_url)return p.avatar_url;if(!p?.discord_id||!p?.avatar)return './assets/demon-mark.svg';return `https://cdn.discordapp.com/avatars/${encodeURIComponent(p.discord_id)}/${encodeURIComponent(p.avatar)}.png?size=${size}`}
export async function ensureDiscordProfile(user){
 const p=await discordClaims(user);if(!p)return null;
 const {db,fs}=await getDiscordFirebase();const ref=fs.doc(db,'users',user.uid);let old={};try{const s=await fs.getDoc(ref);old=s.exists()?s.data():{}}catch{}
 const row={discord_id:p.discord_id,username:p.username,global_name:p.global_name,avatar_url:avatarUrl(p,128),provider:'discord',created_at:old.created_at||new Date().toISOString(),last_login_at:new Date().toISOString(),updated_at:new Date().toISOString()};
 try{await fs.setDoc(ref,row,{merge:true})}catch(e){console.warn('[DEMON PROFILE WRITE]',e)}
 return {...p,...row};
}
export async function logoutDiscord(){const {auth,authMod}=await getDiscordFirebase();await authMod.signOut(auth);localStorage.removeItem('demon_discord_ui_cache')}
