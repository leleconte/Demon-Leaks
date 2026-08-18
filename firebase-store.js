const VERSION='12.17.1';
const fb=window.DEMON_FIREBASE||{};
const config=fb.CONFIG||{};
const CATALOG_CACHE_KEY='demon_catalog_cache_v10';
const CATALOG_CACHE_TS='demon_catalog_cache_v10_ts';
let contextPromise=null;

function configured(){
  return !!(fb.ENABLED&&config.apiKey&&config.projectId&&config.appId);
}

export function loadCachedCatalog(maxAgeMs=30*60*1000){
  try{
    const ts=Number(localStorage.getItem(CATALOG_CACHE_TS)||0);
    const data=JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY)||'[]');
    if(!Array.isArray(data))return [];
    if(ts&&Date.now()-ts>maxAgeMs)return data; // stale is still useful for instant paint
    return data;
  }catch{return []}
}

function saveCachedCatalog(rows){
  try{
    localStorage.setItem(CATALOG_CACHE_KEY,JSON.stringify(rows));
    localStorage.setItem(CATALOG_CACHE_TS,String(Date.now()));
  }catch{}
}

export async function getDemonFirebase(){
  if(!configured())return null;
  if(contextPromise)return contextPromise;
  contextPromise=(async()=>{
    const [appMod,fsMod]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore.js`)
    ]);
    let app;
    try{app=appMod.getApp('demon-public-store')}
    catch{app=appMod.initializeApp(config,'demon-public-store')}
    return {app,db:fsMod.getFirestore(app),fs:fsMod};
  })();
  return contextPromise;
}

export async function loadFirebaseCatalog(){
  const ctx=await getDemonFirebase();
  if(!ctx)return null;
  const {db,fs}=ctx;
  const snap=await fs.getDocs(fs.collection(db,'products'));
  const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
  rows.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  saveCachedCatalog(rows);
  return rows;
}

export async function loadFirebaseSettings(){
  const ctx=await getDemonFirebase();
  if(!ctx)return null;
  const {db,fs}=ctx;
  const snap=await fs.getDoc(fs.doc(db,'settings','global'));
  return snap.exists()?snap.data():{};
}

export async function loadFirebaseProduct(id){
  const cached=loadCachedCatalog().find(p=>String(p.id)===String(id));
  const ctx=await getDemonFirebase();
  if(!ctx)return cached||null;
  try{
    const {db,fs}=ctx;
    const snap=await fs.getDoc(fs.doc(db,'products',String(id)));
    if(snap.exists())return {id:snap.id,...snap.data()};
  }catch(error){console.warn('[DEMON PRODUCT REFRESH]',error)}
  return cached||null;
}
