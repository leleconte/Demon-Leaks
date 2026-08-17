const VERSION='12.17.1';
const fbCfg=window.DEMON_FIREBASE||{};
const firebaseConfig=fbCfg.CONFIG||{};
const ADMIN_EMAIL=String(fbCfg.ADMIN_EMAIL||'demonleaks@gmail.com').toLowerCase();

const $=(q,r=document)=>r.querySelector(q);
const $$=(q,r=document)=>[...r.querySelectorAll(q)];
const slugify=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=c=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(c||0)/100);
const nowIso=()=>new Date().toISOString();
const normalizeHttpUrl=(value,{optional=false}={})=>{
  let v=String(value||'').trim();
  if(!v){
    if(optional)return '';
    throw new Error('Inserisci il link del file.');
  }

  // Se l'utente incolla www.swisstransfer.com/... oppure swisstransfer.com/...
  // aggiungiamo automaticamente https://.
  if(!/^https?:\/\//i.test(v)){
    if(/^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(v)){
      v='https://'+v;
    }else{
      throw new Error('Link non valido. Incolla un URL completo, ad esempio https://www.swisstransfer.com/...');
    }
  }

  let u;
  try{u=new URL(v);}catch{
    throw new Error('Il link inserito non è un URL valido.');
  }

  if(!['http:','https:'].includes(u.protocol)){
    throw new Error('Sono consentiti soltanto link http:// o https://.');
  }

  return u.href;
};

const parseEuro=(value)=>{
  const raw=String(value??'0').trim().replace(/\s/g,'').replace(',','.');
  if(raw==='')return 0;
  const n=Number(raw);
  if(!Number.isFinite(n)||n<0)throw new Error('Prezzo non valido. Usa 0, 10, 19,99 oppure 19.99.');
  if(n>100000)throw new Error('Prezzo troppo elevato.');
  return Math.round(n*100)/100;
};

function parseList(value){
  return [...new Set(String(value||'').split(/[\n,]+/).map(x=>x.trim()).filter(Boolean))];
}
function parseUrlLines(value){
  return parseList(value).map(v=>normalizeHttpUrl(v));
}
function friendlyError(error){
  const code=String(error?.code||'');
  const messages={
    'permission-denied':'Firestore ha rifiutato il salvataggio. Controlla di aver pubblicato firestore.rules e di essere entrato con demonleaks@gmail.com.',
    'failed-precondition':'Cloud Firestore non è ancora pronto oppure manca un indice richiesto.',
    'unavailable':'Firebase non è raggiungibile in questo momento. Controlla la connessione e riprova.',
    'unauthenticated':'La sessione staff non è più valida. Esci e accedi nuovamente.',
    'auth/invalid-credential':'Credenziali Firebase non valide.',
  };
  return messages[code] || String(error?.message||error||'Errore sconosciuto.');
}

function setProductMessage(text='',type=''){
  const el=$('#productFormMessage');
  if(!el)return;
  el.textContent=text;
  el.className='product-form-message';
  if(!text)el.classList.add('hidden');
  else if(type)el.classList.add(type);
}

function setProductSaving(saving){
  const btn=$('#productSaveBtn');
  if(!btn)return;
  btn.disabled=!!saving;
  const span=btn.querySelector('span');
  if(span)span.textContent=saving?'Salvataggio...':'Salva script';
}


let app,auth,db,authMod,fs;
let products=[];
let users=[];
let blocks=[];
let logs=[];
let settings={categories:['FiveM','Gamemode','Scripts','MLO','HUD','Veicoli','Armi','Vestiti','Pack'],storeName:'Demon Leaks',paypalMeHandle:'italiaroleplay2026',discordInviteUrl:''};

function configured(){
  return !!(fbCfg.ENABLED && firebaseConfig.apiKey && !String(firebaseConfig.apiKey).includes('INCOLLA_') && firebaseConfig.projectId && !String(firebaseConfig.projectId).includes('INCOLLA_') && firebaseConfig.appId && !String(firebaseConfig.appId).includes('INCOLLA_'));
}
function toast(msg){const el=$('#staffToast');el.textContent=msg;el.classList.add('show');clearTimeout(window.__staffToast);window.__staffToast=setTimeout(()=>el.classList.remove('show'),2600)}
function show(el){el?.classList.remove('hidden')} function hide(el){el?.classList.add('hidden')}
function openModal(id){show($('#modalBackdrop'));show($(id));}
function closeModals(){hide($('#modalBackdrop'));$$('.staff-modal').forEach(hide);}

async function initFirebase(){
  if(!configured()) return false;
  const appMod=await import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-app.js`);
  authMod=await import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-auth.js`);
  fs=await import(`https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore.js`);
  app=appMod.getApps().length?appMod.getApp():appMod.initializeApp(firebaseConfig);
  auth=authMod.getAuth(app);
  db=fs.getFirestore(app);
  await authMod.setPersistence(auth,authMod.browserSessionPersistence);
  return true;
}

function isAdminUser(user){return !!user && String(user.email||'').toLowerCase()===ADMIN_EMAIL;}

async function migrateSecurityV7(){
  // Esegue una sola migrazione: sposta eventuali vecchi download_url /
  // linkvertise_url in privateProducts e rimuove access_url dalle librerie utenti.
  const globalRef=fs.doc(db,'settings','global');
  const globalSnap=await fs.getDoc(globalRef);
  const globalData=globalSnap.exists()?globalSnap.data():{};

  if(globalData.security_v7_migrated===true)return false;

  const prodSnap=await fs.getDocs(fs.collection(db,'products'));
  const usersSnap=await fs.getDocs(fs.collection(db,'users'));

  // Prodotti legacy.
  for(const d of prodSnap.docs){
    const p=d.data();
    const legacyUrl=String(p.download_url||p.linkvertise_url||'').trim();

    if(legacyUrl){
      const privateRef=fs.doc(db,'privateProducts',d.id);
      const privateSnap=await fs.getDoc(privateRef);

      if(!privateSnap.exists() || !privateSnap.data().access_url){
        await fs.setDoc(privateRef,{
          access_url:legacyUrl,
          name:p.title||p.name||d.id,
          price_cents:Number(p.price_cents||0),
          created_at:p.created_at||nowIso(),
          updated_at:nowIso()
        },{merge:true});
      }
    }

    await fs.setDoc(d.ref,{
      protected_download:true,
      requires_discord:true,
      requires_linkvertise:Number(p.price_cents||0)<=0,
      download_url:fs.deleteField(),
      linkvertise_url:fs.deleteField(),
      updated_at:nowIso()
    },{merge:true});
  }

  // Librerie V6: elimina eventuali access_url copiati nei purchase document.
  for(const u of usersSnap.docs){
    const purchases=await fs.getDocs(fs.collection(db,'users',u.id,'purchases'));
    for(const p of purchases.docs){
      if(Object.prototype.hasOwnProperty.call(p.data(),'access_url')){
        await fs.setDoc(p.ref,{access_url:fs.deleteField()},{merge:true});
      }
    }
  }

  await fs.setDoc(globalRef,{
    security_v7_migrated:true,
    security_v7_migrated_at:nowIso()
  },{merge:true});

  await audit('security_v7_migration','Link pubblici legacy rimossi dal catalogo e dalle librerie.');
  return true;
}

async function loadAll(skipMigration=false){
  if(!skipMigration){
    try{
      const migrated=await migrateSecurityV7();
      if(migrated)return loadAll(true);
    }catch(error){
      console.error('[DEMON V7 MIGRATION]',error);
      toast('Migrazione sicurezza V7 non completata: '+friendlyError(error));
    }
  }

  const [prodSnap,userSnap,blockSnap,logSnap,settingsSnap]=await Promise.all([
    fs.getDocs(fs.collection(db,'products')),
    fs.getDocs(fs.collection(db,'users')),
    fs.getDocs(fs.collection(db,'blockedUsers')),
    fs.getDocs(fs.query(fs.collection(db,'securityLogs'),fs.orderBy('created_at','desc'),fs.limit(100))).catch(()=>null),
    fs.getDoc(fs.doc(db,'settings','global'))
  ]);
  products=prodSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  users=userSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.last_login_at||b.created_at||'').localeCompare(String(a.last_login_at||a.created_at||'')));
  blocks=blockSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.blocked_at||'').localeCompare(String(a.blocked_at||'')));
  logs=logSnap?logSnap.docs.map(d=>({id:d.id,...d.data()})):[];
  if(settingsSnap.exists()) settings={...settings,...settingsSnap.data()};
  if(!Array.isArray(settings.categories)) settings.categories=[];
  renderAll();
}

function renderAll(){
  renderMetrics();renderRecent();renderProducts();renderCategories();renderCustomers();renderBlocks();renderLogs();renderSettings();
  $('#customerBadge').textContent=users.length;
  $('#blockedBadge').textContent=blocks.length;
}
function renderMetrics(){
  const free=products.filter(p=>Number(p.price_cents||0)<=0).length;
  const premium=products.length-free;
  const rows=[['◆',products.length,'SCRIPT ONLINE'],['●',free,'RISORSE FREE'],['✦',premium,'PREMIUM'],['⊘',blocks.length,'UTENTI BLOCCATI']];
  $('#metricGrid').innerHTML=rows.map(x=>`<div class="metric"><div class="metric-icon">${x[0]}</div><div><b>${x[1]}</b><small>${x[2]}</small></div></div>`).join('');
}
function miniProduct(p){const price=Number(p.price_cents||0);return `<div class="mini-row"><div>${p.image_url?`<img class="mini-thumb" src="${esc(p.image_url)}" alt="">`:`<div class="mini-thumb"></div>`}</div><div><b>${esc(p.title||p.name||'Senza nome')}</b><small>${esc(p.category_name||p.category||'Scripts')} • ${esc(p.id)}</small></div><span class="pill ${price<=0?'free':''}">${price<=0?'FREE':money(price)}</span></div>`}
function miniBlock(b){return `<div class="mini-row"><div class="mini-thumb" style="display:grid;place-items:center">⊘</div><div><b>${esc(b.discord_tag||b.discord_id||b.id)}</b><small>${esc(b.reason||'Blocco staff')}</small></div><span class="pill">BLOCKED</span></div>`}
function renderRecent(){
  $('#recentProducts').innerHTML=products.length?products.slice(0,6).map(miniProduct).join(''):'<div class="empty-mini">Nessuno script pubblicato.</div>';
  $('#recentBlocks').innerHTML=blocks.length?blocks.slice(0,6).map(miniBlock).join(''):'<div class="empty-mini">Nessuna persona bloccata.</div>';
}
function renderProducts(){
  const q=String($('#productSearch')?.value||'').trim().toLowerCase();
  const list=products.filter(p=>`${p.id} ${p.title||p.name||''} ${p.category_name||p.category||''}`.toLowerCase().includes(q));
  const root=$('#productsTable');
  if(!list.length){root.innerHTML='<div class="empty-mini">Nessuno script trovato.</div>';return;}
  root.innerHTML=`<div class="table-head"><span>RISORSA</span><span>CATEGORIA</span><span>PREZZO</span><span>TIPO</span><span style="text-align:right">AZIONI</span></div>`+list.map(p=>{const price=Number(p.price_cents||0);return `<div class="table-row"><div class="product-cell">${p.image_url?`<img src="${esc(p.image_url)}" alt="">`:`<div class="product-placeholder">◆</div>`}<div><b>${esc(p.title||p.name||'Senza nome')}</b><small>${esc(p.id)}</small></div></div><span>${esc(p.category_name||p.category||'Scripts')}</span><span>${price<=0?'FREE':money(price)}</span><span><span class="pill ${price<=0?'free':''}">${price<=0?'FREE':'PREMIUM'}</span></span><div class="actions"><button class="icon-action" data-edit-product="${esc(p.id)}" title="Modifica">✎</button><button class="icon-action delete" data-delete-product="${esc(p.id)}" title="Rimuovi">×</button></div></div>`}).join('');
}
function renderCategories(){
  const cats=[...new Set((settings.categories||[]).map(x=>String(x).trim()).filter(Boolean))];
  $('#categoryGrid').innerHTML=cats.length?cats.map((c,i)=>`<article class="category-card"><i>◇</i><button data-delete-category="${esc(c)}" title="Rimuovi">×</button><h4>${esc(c)}</h4><small>${products.filter(p=>slugify(p.category_name||p.category||'')===slugify(c)).length} risorse</small></article>`).join(''):'<div class="empty-mini">Nessuna sezione configurata.</div>';
  $('#productCategory').innerHTML=cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
}
function renderCustomers(){
  const root=$('#customersTable');
  if(!root)return;

  const q=String($('#customerSearch')?.value||'').trim().toLowerCase();
  const list=users.filter(u=>`${u.discord_id||''} ${u.username||''} ${u.global_name||''}`.toLowerCase().includes(q));

  $('#purchaseProductId').innerHTML=products.map(p=>`<option value="${esc(p.id)}">${esc(p.title||p.name||p.id)} • ${Number(p.price_cents||0)>0?money(p.price_cents):'FREE'}</option>`).join('');

  if(!list.length){
    root.innerHTML='<div class="empty-mini">Nessun profilo Discord registrato. Gli utenti appariranno dopo il primo login Discord.</div>';
    return;
  }

  root.innerHTML=`<div class="table-head"><span>UTENTE</span><span>DISCORD ID</span><span>ULTIMO ACCESSO</span><span>ACQUISTI</span><span style="text-align:right">AZIONI</span></div>`+
  list.map(u=>`
    <div class="table-row">
      <div class="product-cell">
        <img class="customer-avatar" src="${esc(u.avatar_url||'./assets/demon-logo.jpg')}" alt="">
        <div><b>${esc(u.global_name||u.username||'Discord user')}</b><small>${esc(u.username||'')}</small></div>
      </div>
      <span><code>${esc(u.discord_id||u.id.replace(/^discord_/,''))}</code></span>
      <span>${esc(String(u.last_login_at||'—').replace('T',' ').slice(0,16))}</span>
      <span>${Number(u.purchases_count||0)}</span>
      <div class="actions">
        <button class="icon-action" data-grant-user="${esc(u.discord_id||u.id.replace(/^discord_/,''))}" title="Registra acquisto">＋</button>
        <button class="icon-action delete" data-block-user="${esc(u.discord_id||u.id.replace(/^discord_/,''))}" data-block-name="${esc(u.global_name||u.username||'')}" title="Blocca">⊘</button>
      </div>
    </div>`).join('');
}

function renderBlocks(){
  const q=String($('#blockSearch')?.value||'').trim().toLowerCase();
  const list=blocks.filter(b=>`${b.discord_id||b.id} ${b.discord_tag||''} ${b.reason||''} ${b.ip||''} ${b.resource||''}`.toLowerCase().includes(q));
  const root=$('#blockedTable');
  if(!list.length){root.innerHTML='<div class="empty-mini">Nessuna persona bloccata.</div>';return;}
  root.innerHTML=`<div class="table-head"><span>PERSONA</span><span>RISORSA</span><span>IP</span><span>STATO</span><span style="text-align:right">AZIONI</span></div>`+list.map(b=>`<div class="table-row"><div class="product-cell"><div class="product-placeholder">⊘</div><div><b>${esc(b.discord_tag||'Discord user')}</b><small>${esc(b.discord_id||b.id)}</small></div></div><span>${esc(b.resource||'—')}</span><span>${esc(b.ip||'—')}</span><span><span class="pill">BLOCKED</span></span><div class="actions"><button class="icon-action delete" data-unblock="${esc(b.id)}" title="Sblocca">✓</button></div></div>`).join('');
}
function renderLogs(){
  $('#securityLogs').innerHTML=logs.length?logs.map(l=>`<article class="security-log"><div><small>DATA</small><div>${esc((l.created_at||'').replace('T',' ').slice(0,19)||'—')}</div></div><div><small>EVENTO</small><div class="risk">${esc(l.event||'security')}</div></div><div><small>DETTAGLIO</small><div>${esc(l.reason||l.message||'—')}</div><small>${esc(l.discord_id||'')} ${esc(l.resource||'')}</small></div><div><small>IP</small><div>${esc(l.ip||'—')}</div></article>`).join(''):'<div class="empty-mini">Nessun log sicurezza presente.</div>';
}
function renderSettings(){
  $('#settingStoreName').value=settings.storeName||'Demon Leaks';
  $('#settingDiscordUrl').value=settings.discordInviteUrl||'';
  $('#settingPaypal').value=settings.paypalMeHandle||'italiaroleplay2026';
}

function setTab(name){
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  $$('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===`tab-${name}`));
  $('#pageTitle').textContent=({dashboard:'Dashboard',scripts:'Gestione Script',categories:'Sezioni',customers:'Utenti / Acquisti',blocked:'Persone bloccate',security:'Security Logs',settings:'Impostazioni'})[name]||'Staff Zone';
}

async function audit(event,message,data={}){
  try{await fs.addDoc(fs.collection(db,'securityLogs'),{event,message,...data,created_at:nowIso(),staff_email:auth.currentUser?.email||''});}catch{}
}

async function openProduct(id=''){
  $('#productForm').reset();
  $('#productId').value='';
  $('#productPrice').value='0';
  setProductMessage('');
  setProductSaving(false);
  renderCategories();

  if(id){
    const p=products.find(x=>x.id===id);
    if(!p)return;

    $('#productModalTitle').textContent='Modifica script';
    $('#productId').value=p.id;
    $('#productName').value=p.title||p.name||'';
    $('#productDescription').value=p.description||'';
    $('#productCategory').value=p.category_name||p.category||'Scripts';
    $('#productPrice').value=(Number(p.price_cents||0)/100).toFixed(2);
    $('#productImage').value=p.image_url||'';
    $('#productAuthor').value=p.author||'';
    $('#productVersion').value=p.version||'';
    $('#productTags').value=Array.isArray(p.tags)?p.tags.join(', '):'';
    $('#productYoutube').value=Array.isArray(p.youtube_urls)?p.youtube_urls.join('\n'):'';
    $('#productGallery').value=Array.isArray(p.gallery_urls)?p.gallery_urls.join('\n'):'';

    try{
      const priv=await fs.getDoc(fs.doc(db,'privateProducts',id));
      $('#productAccessUrl').value=priv.exists()?priv.data().access_url||'':'';
    }catch(error){
      console.error('[DEMON STAFF] Lettura privateProducts:',error);
      setProductMessage(friendlyError(error),'error');
    }
  }else{
    $('#productModalTitle').textContent='Nuovo script';
  }

  openModal('#productModal');
}

async function saveProduct(e){
  e.preventDefault();

  if(!auth?.currentUser || !isAdminUser(auth.currentUser)){
    setProductMessage('Sessione staff non valida. Esci e accedi nuovamente.','error');
    return;
  }

  setProductMessage('');
  setProductSaving(true);

  try{
    const existingId=$('#productId').value.trim();
    const name=$('#productName').value.trim();
    const description=$('#productDescription').value.trim();
    const category=$('#productCategory').value.trim()||'Scripts';

    if(!name)throw new Error('Inserisci il nome dello script.');
    if(name.length<2)throw new Error('Il nome dello script è troppo corto.');
    if(!description)throw new Error('Inserisci una descrizione.');

    const priceEuro=parseEuro($('#productPrice').value);
    const price_cents=Math.round(priceEuro*100);
    const access=normalizeHttpUrl($('#productAccessUrl').value);
    const image_url=normalizeHttpUrl($('#productImage').value,{optional:true});

    const id=existingId||`${slugify(name)}-${crypto.randomUUID().slice(0,6)}`;
    const old=products.find(p=>p.id===id);

    // IMPORTANTE V7:
    // nessun URL reale viene scritto nel documento pubblico products.
        const author=$('#productAuthor')?.value.trim()||'Demon Leaks';
    const version=$('#productVersion')?.value.trim()||'';
    const tags=parseList($('#productTags')?.value);
    const youtube_urls=parseUrlLines($('#productYoutube')?.value);
    const gallery_urls=parseUrlLines($('#productGallery')?.value);

const publicProduct={
      title:name,
      name,
      description,
      category,
      category_name:category,
      category_slug:slugify(category),
      price_cents,
      image_url,
      author,
      version,
      tags,
      youtube_urls,
      gallery_urls,
      badge:price_cents<=0?'FREE':'PREMIUM',
      protected_download:true,
      requires_discord:true,
      requires_linkvertise:price_cents<=0,
      created_at:old?.created_at||nowIso(),
      updated_at:nowIso(),
      download_url:fs.deleteField(),
      linkvertise_url:fs.deleteField()
    };

    const privateProduct={
      access_url:access,
      name,
      price_cents,
      updated_at:nowIso(),
      created_at:old?.created_at||nowIso()
    };

    const batch=fs.writeBatch(db);
    batch.set(fs.doc(db,'products',id),publicProduct,{merge:true});
    batch.set(fs.doc(db,'privateProducts',id),privateProduct,{merge:true});
    await batch.commit();

    audit(
      existingId?'product_updated':'product_created',
      `${name} • ${price_cents<=0?'FREE + LINKVERTISE':'PREMIUM'}`,
      {product_id:id}
    ).catch(()=>{});

    setProductMessage('Script salvato. Il link reale è protetto lato privato.','success');
    await loadAll();

    setTimeout(()=>{
      closeModals();
      toast('✅ Script pubblicato in modalità protetta V7.');
    },450);

  }catch(error){
    console.error('[DEMON STAFF][SAVE PRODUCT]',error);
    const message=friendlyError(error);
    setProductMessage(message,'error');
    toast('❌ '+message);
  }finally{
    setProductSaving(false);
  }
}

async function deleteProduct(id){
  const p=products.find(x=>x.id===id);
  if(!p)return;
  if(!confirm(`Rimuovere definitivamente "${p.title||p.name}"?`))return;

  try{
    const batch=fs.writeBatch(db);
    batch.delete(fs.doc(db,'products',id));
    batch.delete(fs.doc(db,'privateProducts',id));
    await batch.commit();

    audit('product_deleted',p.title||p.name,{product_id:id}).catch(()=>{});
    toast('Script rimosso.');
    await loadAll();
  }catch(error){
    console.error('[DEMON STAFF][DELETE PRODUCT]',error);
    toast('❌ '+friendlyError(error));
  }
}

async function addCategory(e){e.preventDefault();const name=$('#categoryName').value.trim();if(!name)return;const cats=[...new Set([...(settings.categories||[]),name])];await fs.setDoc(fs.doc(db,'settings','global'),{...settings,categories:cats},{merge:true});settings.categories=cats;await audit('category_created',name);closeModals();$('#categoryForm').reset();toast('Sezione creata.');renderCategories();}
async function deleteCategory(name){if(!confirm(`Rimuovere la sezione "${name}"? Gli script non verranno eliminati.`))return;const cats=(settings.categories||[]).filter(c=>c!==name);await fs.setDoc(fs.doc(db,'settings','global'),{categories:cats},{merge:true});settings.categories=cats;await audit('category_deleted',name);renderCategories();toast('Sezione rimossa.');}
function openPurchase(discordId=''){
  $('#purchaseForm').reset();
  $('#purchaseDiscordId').value=String(discordId||'').replace(/\D/g,'');
  $('#purchaseFormMessage').textContent='';
  $('#purchaseFormMessage').className='product-form-message hidden';
  $('#purchaseProductId').innerHTML=products.map(p=>`<option value="${esc(p.id)}">${esc(p.title||p.name||p.id)} • ${Number(p.price_cents||0)>0?money(p.price_cents):'FREE'}</option>`).join('');
  openModal('#purchaseModal');
}

async function grantPurchase(e){
  e.preventDefault();

  const msg=$('#purchaseFormMessage');
  const discordId=$('#purchaseDiscordId').value.replace(/\D/g,'');
  const productId=$('#purchaseProductId').value;
  const fail=text=>{msg.textContent=text;msg.className='product-form-message error';};

  if(!discordId)return fail('Discord ID non valido.');
  if(!productId)return fail('Seleziona uno script.');

  const product=products.find(p=>p.id===productId);
  if(!product)return fail('Script non trovato.');

  try{
    // Verifica che esista comunque il file privato.
    const privateSnap=await fs.getDoc(fs.doc(db,'privateProducts',productId));
    if(!privateSnap.exists() || !privateSnap.data().access_url){
      throw new Error('Questo script non ha un link privato configurato.');
    }

    const uid=`discord_${discordId}`;
    const userRef=fs.doc(db,'users',uid);
    const purchaseRef=fs.doc(db,'users',uid,'purchases',productId);
    const existingPurchase=await fs.getDoc(purchaseRef);
    const userSnap=await fs.getDoc(userRef);

    const oldCount=Number(userSnap.exists()?userSnap.data()?.purchases_count||0:0);

    const batch=fs.writeBatch(db);

    batch.set(userRef,{
      discord_id:discordId,
      created_at:userSnap.exists()?(userSnap.data().created_at||nowIso()):nowIso(),
      updated_at:nowIso(),
      purchases_count:existingPurchase.exists()?oldCount:oldCount+1
    },{merge:true});

    // Solo entitlement. Il link reale NON è copiato nella libreria.
    batch.set(purchaseRef,{
      product_id:productId,
      title:product.title||product.name||productId,
      category_name:product.category_name||product.category||'Scripts',
      image_url:product.image_url||'',
      price_cents:Number(product.price_cents||0),
      note:$('#purchaseNote').value.trim(),
      granted_at:nowIso(),
      granted_by:auth.currentUser?.email||'',
      access_url:fs.deleteField()
    },{merge:true});

    await batch.commit();

    audit('purchase_granted',product.title||product.name,{
      discord_id:discordId,
      product_id:productId
    }).catch(()=>{});

    msg.textContent='Acquisto associato. Il file resta protetto dal Worker.';
    msg.className='product-form-message success';

    setTimeout(async()=>{
      closeModals();
      toast('✅ Script assegnato al profilo Discord.');
      await loadAll();
    },400);

  }catch(error){
    console.error('[DEMON STAFF][GRANT PURCHASE]',error);
    fail(friendlyError(error));
  }
}

async function blockUser(e){
  e.preventDefault();const discord_id=$('#blockDiscordId').value.replace(/\D/g,'');if(!discord_id){toast('Discord ID non valido.');return;}
  const row={discord_id,discord_tag:$('#blockDiscordTag').value.trim(),reason:$('#blockReason').value.trim(),resource:$('#blockResource').value.trim(),ip:$('#blockIp').value.trim(),target_file:$('#blockFile').value.trim(),blocked_at:nowIso(),blocked_by:auth.currentUser?.email||''};
  await fs.setDoc(fs.doc(db,'blockedUsers',discord_id),row,{merge:true});await audit('user_blocked',row.reason,{discord_id,resource:row.resource,ip:row.ip});closeModals();$('#blockForm').reset();toast('Persona bloccata.');await loadAll();
}
async function unblockUser(id){const b=blocks.find(x=>x.id===id);if(!b)return;if(!confirm(`Sbloccare ${b.discord_tag||b.discord_id||id}?`))return;await fs.deleteDoc(fs.doc(db,'blockedUsers',id));await audit('user_unblocked',b.discord_tag||id,{discord_id:b.discord_id||id});toast('Persona sbloccata.');await loadAll();}
async function saveSettings(e){e.preventDefault();settings={...settings,storeName:$('#settingStoreName').value.trim()||'Demon Leaks',discordInviteUrl:$('#settingDiscordUrl').value.trim(),paypalMeHandle:$('#settingPaypal').value.trim()||'italiaroleplay2026'};await fs.setDoc(fs.doc(db,'settings','global'),settings,{merge:true});await audit('settings_updated','Impostazioni store aggiornate');toast('Impostazioni salvate.');}

function bind(){
  ['#productAccessUrl','#productImage'].forEach(sel=>{
    $(sel)?.addEventListener('blur',e=>{
      const raw=e.target.value.trim();
      if(!raw)return;
      try{e.target.value=normalizeHttpUrl(raw);}catch{}
    });
  });


  $('#showPassword').addEventListener('click',()=>{const p=$('#staffPassword');p.type=p.type==='password'?'text':'password';});
  $('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const btn=$('#loginBtn');const err=$('#loginError');err.textContent='';btn.disabled=true;try{const email=$('#staffEmail').value.trim();const password=$('#staffPassword').value;const result=await authMod.signInWithEmailAndPassword(auth,email,password);if(!isAdminUser(result.user)){await authMod.signOut(auth);throw new Error('Account non autorizzato.');}}catch(error){err.textContent=error?.code==='auth/invalid-credential'?'Credenziali non valide.':(error.message||'Accesso non riuscito.');}finally{btn.disabled=false;}});
  $('#logoutBtn').addEventListener('click',()=>authMod.signOut(auth));
  $('#staffNav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)setTab(b.dataset.tab);});
  document.addEventListener('click',e=>{
    const g=e.target.closest('[data-goto]');if(g)setTab(g.dataset.goto);
    const n=e.target.closest('[data-action="new-product"]');if(n)openProduct();
    const gp=e.target.closest('[data-action="grant-purchase"]');if(gp)openPurchase();
    const gu=e.target.closest('[data-grant-user]');if(gu)openPurchase(gu.dataset.grantUser);
    const nb=e.target.closest('[data-action="new-block"]');if(nb)openModal('#blockModal');
    const bu=e.target.closest('[data-block-user]');if(bu){openModal('#blockModal');$('#blockDiscordId').value=bu.dataset.blockUser||'';$('#blockDiscordTag').value=bu.dataset.blockName||'';}
    const ep=e.target.closest('[data-edit-product]');if(ep)openProduct(ep.dataset.editProduct);
    const dp=e.target.closest('[data-delete-product]');if(dp)deleteProduct(dp.dataset.deleteProduct);
    const ub=e.target.closest('[data-unblock]');if(ub)unblockUser(ub.dataset.unblock);
    const dc=e.target.closest('[data-delete-category]');if(dc)deleteCategory(dc.dataset.deleteCategory);
    if(e.target.closest('.modal-close')||e.target.closest('.modal-cancel'))closeModals();
  });
  $('#modalBackdrop').addEventListener('click',closeModals);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModals()});
  $('#productForm').addEventListener('submit',saveProduct);$('#purchaseForm').addEventListener('submit',grantPurchase);$('#blockForm').addEventListener('submit',blockUser);$('#categoryForm').addEventListener('submit',addCategory);$('#addCategoryBtn').addEventListener('click',()=>openModal('#categoryModal'));$('#storeSettingsForm').addEventListener('submit',saveSettings);$('#productSearch').addEventListener('input',renderProducts);$('#customerSearch').addEventListener('input',renderCustomers);$('#blockSearch').addEventListener('input',renderBlocks);$('#refreshLogs').addEventListener('click',loadAll);
}

async function init(){
  bind();
  if(!configured()){show($('#setupGate'));return;}
  try{await initFirebase();}catch(error){console.error(error);show($('#setupGate'));$('.setup-card p').textContent='Firebase non è raggiungibile o la configurazione non è valida.';return;}
  authMod.onAuthStateChanged(auth,async user=>{
    if(!user){hide($('#staffApp'));hide($('#setupGate'));show($('#loginGate'));$('#staffPassword').value='';return;}
    if(!isAdminUser(user)){await authMod.signOut(auth);return;}
    hide($('#loginGate'));hide($('#setupGate'));show($('#staffApp'));$('#accountEmail').textContent=user.email||'Staff';
    try{await loadAll();}catch(error){console.error(error);toast('Errore Firestore: controlla le Security Rules.');}
  });
}
init();
