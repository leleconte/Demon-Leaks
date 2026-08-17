const VERSION = '12.17.1';

const fb = window.DEMON_FIREBASE || {};
const config = fb.CONFIG || {};

function configured(){
  return !!(
    fb.ENABLED &&
    config.apiKey && !String(config.apiKey).includes('INCOLLA_') &&
    config.projectId && !String(config.projectId).includes('INCOLLA_') &&
    config.appId && !String(config.appId).includes('INCOLLA_')
  );
}

export async function getDemonFirebase(){
  if(!configured()) return null;

  const appMod = await import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-app.js`);
  const fsMod = await import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore.js`);

  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(config);
  const db = fsMod.getFirestore(app);
  return { app, db, fs: fsMod };
}

export async function loadFirebaseCatalog(){
  const ctx = await getDemonFirebase();
  if(!ctx) return null;
  const {db,fs} = ctx;
  const snap = await fs.getDocs(fs.collection(db,'products'));
  const products = snap.docs.map(d=>({id:d.id,...d.data()}));
  products.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  return products;
}

export async function loadFirebaseSettings(){
  const ctx = await getDemonFirebase();
  if(!ctx) return null;
  const {db,fs} = ctx;
  const snap = await fs.getDoc(fs.doc(db,'settings','global'));
  return snap.exists() ? snap.data() : {};
}

export async function loadFirebaseProduct(id){
  const ctx=await getDemonFirebase();if(!ctx)return null;
  const {db,fs}=ctx;const snap=await fs.getDoc(fs.doc(db,'products',String(id)));
  return snap.exists()?{id:snap.id,...snap.data()}:null;
}
