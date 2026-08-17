const VERSION='12.17.1';
const fbCfg=window.DEMON_FIREBASE||{};
const config=fbCfg.CONFIG||{};
const AUTH_BASE=String(fbCfg.DISCORD_AUTH_BASE_URL||'').replace(/\/+$/,'');
const USER_APP_NAME='demon-public-user';
let ctxPromise=null;

function workerConfigured(){
  return /^https:\/\/.+/i.test(AUTH_BASE)&&!AUTH_BASE.includes('INSERISCI-WORKER');
}

export async function getDiscordFirebase(){
  if(ctxPromise)return ctxPromise;

  ctxPromise=(async()=>{
    const appMod=await import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-app.js`);
    const authMod=await import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-auth.js`);
    const fs=await import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore.js`);

    let app=appMod.getApps().find(a=>a.name===USER_APP_NAME);
    if(!app)app=appMod.initializeApp(config,USER_APP_NAME);

    let auth;
    try{
      auth=authMod.initializeAuth(app,{persistence:authMod.browserLocalPersistence});
    }catch{
      auth=authMod.getAuth(app);
      try{await authMod.setPersistence(auth,authMod.browserLocalPersistence)}catch{}
    }

    if(typeof auth.authStateReady==='function'){
      try{await auth.authStateReady()}catch{}
    }

    return {app,auth,db:fs.getFirestore(app),authMod,fs};
  })();

  return ctxPromise;
}

export function startDiscordLogin(){
  if(!workerConfigured())throw new Error('Discord OAuth non è ancora configurato.');
  location.href=`${AUTH_BASE}/auth/login`;
}

export async function consumeDiscordCallback(){
  const params=new URLSearchParams(location.hash.replace(/^#/,''));
  const token=params.get('firebase_token');
  const error=params.get('discord_error');

  if(error){
    history.replaceState(null,'',location.pathname+location.search);
    throw new Error(decodeURIComponent(error));
  }

  if(!token)return false;

  // Save the one-time token temporarily so a Safari reload during callback
  // does not make the OAuth result disappear before Firebase consumes it.
  sessionStorage.setItem('demon_pending_firebase_token',token);

  const {auth,authMod}=await getDiscordFirebase();
  await authMod.setPersistence(auth,authMod.browserLocalPersistence).catch(()=>{});

  const pending=sessionStorage.getItem('demon_pending_firebase_token')||token;
  const result=await authMod.signInWithCustomToken(auth,pending);

  // Ensure the persistent session has actually produced an ID token.
  await result.user.getIdToken(true);

  sessionStorage.removeItem('demon_pending_firebase_token');
  history.replaceState(null,'',location.pathname+location.search);

  const profile=await discordClaims(result.user).catch(()=>null);
  if(profile){
    localStorage.setItem('demon_discord_ui_cache',JSON.stringify(profile));
  }

  return true;
}

export async function resumePendingDiscordCallback(){
  const pending=sessionStorage.getItem('demon_pending_firebase_token');
  if(!pending)return false;

  const {auth,authMod}=await getDiscordFirebase();
  try{
    await authMod.setPersistence(auth,authMod.browserLocalPersistence);
    const result=await authMod.signInWithCustomToken(auth,pending);
    await result.user.getIdToken(true);
    sessionStorage.removeItem('demon_pending_firebase_token');
    return true;
  }catch(error){
    console.error('[DEMON PENDING TOKEN]',error);
    return false;
  }
}

export async function discordClaims(user){
  if(!user)return null;

  try{
    const result=await user.getIdTokenResult();
    const c=result.claims||{};
    if(c.provider==='discord'&&c.discord_id){
      return {
        discord_id:String(c.discord_id),
        username:String(c.discord_username||''),
        global_name:String(c.discord_global_name||''),
        avatar:String(c.discord_avatar||''),
        uid:user.uid
      };
    }
  }catch(error){
    console.warn('[DEMON CLAIMS]',error);
  }

  // UI-only recovery from the profile document. Protected Worker actions
  // still require the signed Discord claims in the Firebase ID token.
  if(/^discord_\d+$/.test(String(user.uid||''))){
    try{
      const {db,fs}=await getDiscordFirebase();
      const snap=await fs.getDoc(fs.doc(db,'users',user.uid));
      if(snap.exists()){
        const d=snap.data();
        const id=String(d.discord_id||user.uid.replace(/^discord_/,''));
        return {
          discord_id:id,
          username:String(d.username||''),
          global_name:String(d.global_name||''),
          avatar:'',
          avatar_url:String(d.avatar_url||''),
          uid:user.uid
        };
      }
    }catch{}
  }

  return null;
}

export function avatarUrl(profile,size=64){
  if(profile?.avatar_url)return profile.avatar_url;
  if(!profile?.discord_id||!profile?.avatar)return './assets/demon-logo.jpg';
  return `https://cdn.discordapp.com/avatars/${encodeURIComponent(profile.discord_id)}/${encodeURIComponent(profile.avatar)}.png?size=${size}`;
}

export async function ensureDiscordProfile(user){
  const profile=await discordClaims(user);
  if(!profile)return null;

  const {db,fs}=await getDiscordFirebase();
  const ref=fs.doc(db,'users',user.uid);
  let old={};

  try{
    const snap=await fs.getDoc(ref);
    old=snap.exists()?snap.data():{};
  }catch{}

  const row={
    discord_id:profile.discord_id,
    username:profile.username,
    global_name:profile.global_name,
    avatar_url:avatarUrl(profile,128),
    provider:'discord',
    created_at:old.created_at||new Date().toISOString(),
    last_login_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };

  // A Firestore write error must never destroy an already valid Auth session.
  try{await fs.setDoc(ref,row,{merge:true})}
  catch(error){console.warn('[DEMON PROFILE SAVE]',error)}

  return {...profile,...row};
}

export async function logoutDiscord(){
  const {auth,authMod}=await getDiscordFirebase();
  await authMod.signOut(auth);
  localStorage.removeItem('demon_discord_ui_cache');
  sessionStorage.removeItem('demon_pending_firebase_token');
}
