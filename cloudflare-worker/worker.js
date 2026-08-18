/**
 * DEMON LEAKS V7 — FIX 1101
 * Discord OAuth2 + Firebase Custom Auth + Protected Downloads
 * Strict anti-bypass + Firestore block + Discord webhook
 *
 * IMPORTANT:
 * - no real file URL is ever returned by the public Firestore catalog
 * - /download/start requires a valid Firebase ID token carrying Discord claims
 * - FREE: start -> gate -> arm -> Linkvertise -> complete
 * - PREMIUM: start checks purchase entitlement -> one-time complete URL
 */

const DISCORD_API='https://discord.com/api/v10';
const FIREBASE_CUSTOM_TOKEN_AUD=
  'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const GOOGLE_TOKEN_URL='https://oauth2.googleapis.com/token';
const DATASTORE_SCOPE='https://www.googleapis.com/auth/datastore';

let googleAccessTokenCache={token:'',expiresAt:0};

export default {
  async fetch(request,env){
    const url=new URL(request.url);

    if(request.method==='OPTIONS'){
      return cors(new Response(null,{status:204}),env);
    }

    try{
      if(url.pathname==='/health'){
        let firebasePrivateKeyValid=false;
        let firebasePrivateKeyError='';

        try{
          const account=serviceAccountFromEnv(env);
          await importPrivateKey(account.privateKey);
          firebasePrivateKeyValid=true;
        }catch(error){
          firebasePrivateKeyError=String(error?.message||'Chiave non valida');
        }

        return corsJson({
          ok:true,
          service:'DEMON LEAKS V10.3',
          strict:true,
          protected_downloads:true,
          config:{
            site_url:!!env.SITE_URL,
            discord_redirect_uri:!!env.DISCORD_REDIRECT_URI,
            firebase_project_id:!!env.FIREBASE_PROJECT_ID,
            firebase_web_api_key:!!env.FIREBASE_WEB_API_KEY,
            discord_client_id:!!env.DISCORD_CLIENT_ID,
            discord_client_secret:!!env.DISCORD_CLIENT_SECRET,
            firebase_service_account_email:!!env.FIREBASE_SERVICE_ACCOUNT_EMAIL,
            firebase_private_key_present:!!env.FIREBASE_PRIVATE_KEY,
            firebase_private_key_valid:firebasePrivateKeyValid,
            firebase_private_key_error:firebasePrivateKeyValid?'':firebasePrivateKeyError,
            ticket_binding_secret:!!env.TICKET_BINDING_SECRET,
            security_webhook_url:!!env.SECURITY_WEBHOOK_URL
          }
        },200,env);
      }

      if(url.pathname==='/auth/login'){
        return await login(request,env,url);
      }

      if(url.pathname==='/auth/callback'){
        return await callback(request,env,url);
      }

      if(url.pathname==='/account/me' && request.method==='GET'){
        return await accountMe(request,env);
      }

      if(url.pathname==='/favorite/list' && request.method==='GET'){
        return await favoriteList(request,env);
      }

      if(url.pathname==='/favorite/toggle' && request.method==='POST'){
        return await favoriteToggle(request,env);
      }

      if(url.pathname==='/download/start' && request.method==='POST'){
        return await downloadStart(request,env,url);
      }

      if(url.pathname==='/download/arm' && request.method==='POST'){
        return await downloadArm(request,env,url);
      }

      if(url.pathname==='/download/complete' && request.method==='GET'){
        return await downloadComplete(request,env,url);
      }

      return new Response('DEMON LEAKS V7',{status:200});

    }catch(error){
      console.error('[DEMON V10.1]',error);

      if(url.pathname.startsWith('/auth/')){
        const msg=String(error?.message||'OAuth error').slice(0,300);
        return redirect(`${siteUrl(env)}/auth-callback.html#discord_error=${encodeURIComponent(msg)}`);
      }

      if(error?.httpStatus){
        return corsJson({
          ok:false,
          code:error.code||'REQUEST_DENIED',
          message:error.message||'Richiesta negata.',
          ...(error.blocked?{blocked:error.blocked}:{})
        },Number(error.httpStatus),env);
      }

      return corsJson({
        ok:false,
        code:'SERVER_ERROR',
        message:'Errore interno Demon Security.'
      },500,env);
    }
  }
};

/* ============================================================
   Discord OAuth
   ============================================================ */

async function login(request,env,url){
  requireEnv(env,'DISCORD_CLIENT_ID');

  const state=randomHex(32);
  const redirect_uri=redirectUri(env,url.origin);

  const params=new URLSearchParams({
    client_id:String(env.DISCORD_CLIENT_ID),
    response_type:'code',
    redirect_uri,
    scope:'identify',
    state,
    prompt:'consent'
  });

  const headers=new Headers();
  headers.set('Location',`https://discord.com/oauth2/authorize?${params.toString()}`);
  headers.append('Set-Cookie',cookie('__demon_oauth_state',state,600));

  return new Response(null,{status:302,headers});
}

async function callback(request,env,url){
  console.log('[DEMON OAuth] callback start');

  for(const k of [
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'FIREBASE_SERVICE_ACCOUNT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ]) requireEnv(env,k);

  const state=url.searchParams.get('state')||'';
  const code=url.searchParams.get('code')||'';
  const cookies=parseCookies(request.headers.get('Cookie')||'');
  const expected=cookies.__demon_oauth_state||'';

  if(!state||!expected||!timingSafeEqual(state,expected)){
    throw new Error('Stato OAuth Discord non valido.');
  }
  if(!code)throw new Error('Codice OAuth Discord mancante.');

  console.log('[DEMON OAuth] state OK, exchanging Discord code');

  const tokenResponse=await fetch(`${DISCORD_API}/oauth2/token`,{
    method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({
      client_id:String(env.DISCORD_CLIENT_ID),
      client_secret:String(env.DISCORD_CLIENT_SECRET),
      grant_type:'authorization_code',
      code,
      redirect_uri:redirectUri(env,url.origin)
    })
  });

  if(!tokenResponse.ok){
    throw new Error(`Discord token exchange HTTP ${tokenResponse.status}`);
  }

  const token=await tokenResponse.json();
  if(!token.access_token)throw new Error('Discord access token mancante.');

  const userResponse=await fetch(`${DISCORD_API}/users/@me`,{
    headers:{authorization:`Bearer ${token.access_token}`}
  });

  if(!userResponse.ok){
    throw new Error(`Discord users/@me HTTP ${userResponse.status}`);
  }

  const user=await userResponse.json();
  console.log('[DEMON OAuth] Discord user resolved', String(user.id||''));

  if(!/^\d+$/.test(String(user.id||''))){
    throw new Error('Discord ID non valido.');
  }

  console.log('[DEMON OAuth] creating Demon session');
  const demonSession=await createDemonSession(env,user);
  console.log('[DEMON OAuth] Demon session created');

  // Ensure/update the Firestore profile server-side.
  await upsertDiscordProfile(env,user).catch(error=>{
    console.error('[DEMON PROFILE UPSERT]',error);
  });

  const target=`${siteUrl(env)}/auth-callback.html#demon_session=${encodeURIComponent(demonSession)}&discord_login=1`;

  const headers=new Headers();
  headers.set('Location',target);
  headers.append('Set-Cookie',cookie('__demon_oauth_state','',0));
  return new Response(null,{status:302,headers});
}

/* ============================================================
   DEMON SESSION (Discord public account)
   ============================================================ */

function b64urlJson(value){
  return base64urlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

async function createDemonSession(env,user){
  requireEnv(env,'TICKET_BINDING_SECRET');

  const now=Math.floor(Date.now()/1000);
  const payload={
    typ:'demon_session',
    iat:now,
    exp:now+(60*60*24*30),
    discord_id:String(user.id),
    discord_username:String(user.username||''),
    discord_global_name:String(user.global_name||''),
    discord_avatar:String(user.avatar||'')
  };

  const header={alg:'HS256',typ:'JWT'};
  const unsigned=`${b64urlJson(header)}.${b64urlJson(payload)}`;
  const sig=await hmacBytes(env,unsigned);

  return `${unsigned}.${base64urlBytes(sig)}`;
}

async function hmacBytes(env,value){
  requireEnv(env,'TICKET_BINDING_SECRET');
  const key=await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(env.TICKET_BINDING_SECRET)),
    {name:'HMAC',hash:'SHA-256'},
    false,
    ['sign','verify']
  );

  const sig=await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(String(value||''))
  );

  return new Uint8Array(sig);
}

function b64urlToBytes(value){
  let s=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
  s+='='.repeat((4-s.length%4)%4);
  const bin=atob(s);
  return Uint8Array.from(bin,c=>c.charCodeAt(0));
}

async function verifyDemonSession(request,env){
  const raw=request.headers.get('authorization')||'';
  const match=raw.match(/^Bearer\s+(.+)$/i);

  if(!match){
    throw httpError(401,'AUTH_REQUIRED','Accesso Discord richiesto.');
  }

  const token=match[1];
  const parts=token.split('.');
  if(parts.length!==3){
    throw httpError(401,'BAD_SESSION','Sessione Discord non valida.');
  }

  let payload;
  try{
    const p=parts[1].replace(/-/g,'+').replace(/_/g,'/');
    const padded=p+'='.repeat((4-p.length%4)%4);
    payload=JSON.parse(atob(padded));
  }catch{
    throw httpError(401,'BAD_SESSION','Sessione Discord non valida.');
  }

  if(payload.typ!=='demon_session'){
    throw httpError(401,'BAD_SESSION_TYPE','Sessione Discord non valida.');
  }

  if(Number(payload.exp||0)<=Math.floor(Date.now()/1000)){
    throw httpError(401,'SESSION_EXPIRED','Sessione Discord scaduta.');
  }

  if(!/^\d+$/.test(String(payload.discord_id||''))){
    throw httpError(401,'BAD_DISCORD_ID','Discord ID non valido.');
  }

  const unsigned=`${parts[0]}.${parts[1]}`;
  const expected=await hmacBytes(env,unsigned);
  const received=b64urlToBytes(parts[2]);

  if(expected.length!==received.length){
    throw httpError(401,'BAD_SIGNATURE','Sessione Discord non valida.');
  }

  let diff=0;
  for(let i=0;i<expected.length;i++)diff|=expected[i]^received[i];
  if(diff!==0){
    throw httpError(401,'BAD_SIGNATURE','Sessione Discord non valida.');
  }

  return {
    uid:`discord_${payload.discord_id}`,
    discord_id:String(payload.discord_id),
    username:String(payload.discord_username||''),
    global_name:String(payload.discord_global_name||''),
    avatar:String(payload.discord_avatar||'')
  };
}

async function upsertDiscordProfile(env,user){
  const uid=`discord_${user.id}`;
  const existing=await fsGet(env,`users/${uid}`);
  const now=new Date().toISOString();

  await fsSet(env,`users/${uid}`,{
    discord_id:String(user.id),
    username:String(user.username||''),
    global_name:String(user.global_name||''),
    avatar_url:user.avatar
      ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(user.id)}/${encodeURIComponent(user.avatar)}.png?size=128`
      : '',
    provider:'discord',
    created_at:existing?.created_at||now,
    last_login_at:now,
    updated_at:now,
    purchases_count:Number(existing?.purchases_count||0)
  },true);
}

async function checkedSession(request,env){
  const profile=await verifyDemonSession(request,env);

  const blocked=await fsGet(env,`blockedUsers/${profile.discord_id}`);
  if(blocked){
    const error=httpError(423,'BLOCKED',blocked.reason||'Account bloccato.');
    error.blocked=blocked;
    throw error;
  }

  return profile;
}

async function accountMe(request,env){
  const profile=await verifyDemonSession(request,env);

  let blocked=null;
  let stored={};
  let purchaseDocs=[];
  let favoriteDocs=[];

  try{blocked=await fsGet(env,`blockedUsers/${profile.discord_id}`)}catch(error){
    console.error('[DEMON account blocked read]',error);
  }

  try{stored=await fsGet(env,`users/${profile.uid}`)||{}}catch(error){
    console.error('[DEMON account profile read]',error);
  }

  try{purchaseDocs=await fsListCollection(env,`users/${profile.uid}/purchases`)}catch(error){
    console.error('[DEMON account purchases list]',error);
  }

  try{favoriteDocs=await fsListCollection(env,`users/${profile.uid}/favorites`)}catch(error){
    console.error('[DEMON account favorites list]',error);
  }

  const purchases=[];
  for(const entitlement of purchaseDocs){
    const productId=String(entitlement.product_id||entitlement.id||'');
    if(!productId)continue;

    let product=null;
    try{product=await fsGet(env,`products/${productId}`)}catch(error){
      console.error('[DEMON purchase product]',productId,error);
    }

    purchases.push({
      id:productId,
      product_id:productId,
      ...product,
      ...entitlement
    });
  }

  const favorites=[];
  for(const fav of favoriteDocs){
    const productId=String(fav.product_id||fav.id||'');
    if(!productId)continue;

    let product=null;
    try{product=await fsGet(env,`products/${productId}`)}catch(error){
      console.error('[DEMON favorite product]',productId,error);
    }

    favorites.push({
      id:productId,
      product_id:productId,
      ...product,
      ...fav
    });
  }

  return corsJson({
    ok:true,
    profile:{
      ...profile,
      ...stored
    },
    blocked:blocked||null,
    purchases,
    favorites
  },200,env);
}

async function favoriteList(request,env){
  const profile=await checkedSession(request,env);
  const docs=await fsListCollection(env,`users/${profile.uid}/favorites`);
  return corsJson({ok:true,favorites:docs},200,env);
}

async function favoriteToggle(request,env){
  const profile=await checkedSession(request,env);

  let body={};
  try{body=await request.json()}catch{}
  const productId=cleanId(body.product_id);

  if(!productId){
    return corsJson({ok:false,message:'Product ID non valido.'},400,env);
  }

  const product=await fsGet(env,`products/${productId}`);
  if(!product){
    return corsJson({ok:false,message:'Risorsa non trovata.'},404,env);
  }

  const path=`users/${profile.uid}/favorites/${productId}`;
  const existing=await fsGet(env,path);

  if(existing){
    await fsDelete(env,path);
    return corsJson({ok:true,favorite:false,product_id:productId},200,env);
  }

  await fsSet(env,path,{
    product_id:productId,
    created_at:new Date().toISOString()
  });

  return corsJson({ok:true,favorite:true,product_id:productId},200,env);
}

/* ============================================================
   Download start
   ============================================================ */

async function downloadStart(request,env,url){
  const profile=await checkedSession(request,env);

  if(!siteOriginMatches(request,env)){
    await blockAndReport({
      request,env,profile,
      productId:'',
      productTitle:'',
      ticketId:'',
      reasons:['ORIGIN_NON_AUTORIZZATA'],
      phase:'download_start'
    });

    return corsJson({
      ok:false,
      code:'BLOCKED',
      message:'Richiesta download esterna al sito. Account bloccato.'
    },423,env);
  }

  // If already blocked, everything stops.
  const existingBlock=await fsGet(env,`blockedUsers/${profile.discord_id}`);
  if(existingBlock){
    return corsJson({
      ok:false,
      code:'BLOCKED',
      message:existingBlock.reason||'Account bloccato.'
    },423,env);
  }

  const earlySignals=detectAutomation(request);
  if(earlySignals.length){
    await blockAndReport({
      request,env,profile,
      productId:'',
      productTitle:'',
      ticketId:'',
      reasons:earlySignals,
      phase:'download_start'
    });

    return corsJson({
      ok:false,
      code:'BLOCKED',
      message:'Possibile bypass/automazione rilevata. Account bloccato.'
    },423,env);
  }

  let body={};
  try{body=await request.json()}catch{}
  const productId=cleanId(body.product_id);

  if(!productId){
    return corsJson({ok:false,code:'BAD_PRODUCT',message:'Product ID mancante.'},400,env);
  }

  const product=await fsGet(env,`products/${productId}`);

  if(!product){
    return corsJson({ok:false,code:'NOT_FOUND',message:'Script non trovato.'},404,env);
  }

  const price=Number(product.price_cents||0);
  const isFree=price<=0;

  if(!isFree){
    const entitlement=await fsGet(env,`users/${profile.uid}/purchases/${productId}`);

    if(!entitlement){
      return corsJson({
        ok:false,
        code:'NOT_OWNED',
        message:'Questo script non risulta acquistato dal tuo profilo Discord.'
      },403,env);
    }
  }

  // Refuse to create a ticket if file is not privately configured.
  const privateProduct=await fsGet(env,`privateProducts/${productId}`);
  if(!privateProduct?.access_url){
    return corsJson({
      ok:false,
      code:'FILE_NOT_CONFIGURED',
      message:'Link privato dello script non configurato.'
    },409,env);
  }

  const ticketId=randomHex(24);
  const now=Date.now();
  const ip=clientIp(request);
  const ua=request.headers.get('user-agent')||'';

  const ticket={
    ticket_id:ticketId,
    uid:profile.uid,
    discord_id:profile.discord_id,
    discord_username:profile.username,
    discord_global_name:profile.global_name,
    discord_avatar:profile.avatar,
    product_id:productId,
    product_title:String(product.title||product.name||productId),
    kind:isFree?'free':'premium',
    created_ms:now,
    armed_ms:0,
    used:false,
    blocked:false,
    ip_bind:await hmacHex(env,ip),
    ua_bind:await hmacHex(env,ua),
    created_at:new Date(now).toISOString(),
    expires_at:new Date(now+ticketTtlMs(env)).toISOString()
  };

  await fsSet(env,`downloadTickets/${ticketId}`,ticket);

  if(isFree){
    return corsJson({
      ok:true,
      mode:'linkvertise',
      gate_url:`${siteUrl(env)}/free-gate.html?t=${encodeURIComponent(ticketId)}`
    },200,env);
  }

  return corsJson({
    ok:true,
    mode:'direct',
    url:`${url.origin}/download/complete?ticket=${encodeURIComponent(ticketId)}`
  },200,env);
}

/* ============================================================
   FREE gate arm
   ============================================================ */

async function downloadArm(request,env,url){
  const profile=await checkedSession(request,env);

  if(!siteOriginMatches(request,env)){
    await blockAndReport({
      request,env,profile,
      productId:'',
      productTitle:'',
      ticketId:'',
      reasons:['ORIGIN_NON_AUTORIZZATA'],
      phase:'download_arm'
    });

    return corsJson({
      ok:false,
      code:'BLOCKED',
      message:'Richiesta gate esterna al sito. Account bloccato.'
    },423,env);
  }

  const currentBlock=await fsGet(env,`blockedUsers/${profile.discord_id}`);
  if(currentBlock){
    return corsJson({ok:false,code:'BLOCKED',message:currentBlock.reason||'Account bloccato.'},423,env);
  }

  let body={};
  try{body=await request.json()}catch{}
  const ticketId=cleanTicket(body.ticket);
  const ticket=ticketId?await fsGet(env,`downloadTickets/${ticketId}`):null;

  if(!ticket){
    return corsJson({ok:false,code:'BAD_TICKET',message:'Ticket non valido.'},400,env);
  }

  const reasons=[];

  if(ticket.used)reasons.push('TICKET_GIA_USATO');
  if(ticket.blocked)reasons.push('TICKET_GIA_BLOCCATO');
  if(ticket.kind!=='free')reasons.push('TIPO_TICKET_NON_FREE');
  if(ticket.uid!==profile.uid)reasons.push('DISCORD_UID_MISMATCH');
  if(ticket.discord_id!==profile.discord_id)reasons.push('DISCORD_ID_MISMATCH');
  if(Date.now()-Number(ticket.created_ms||0)>ticketTtlMs(env))reasons.push('TICKET_SCADUTO');

  const ip=clientIp(request);
  const ua=request.headers.get('user-agent')||'';

  if(ticket.ip_bind!==await hmacHex(env,ip))reasons.push('IP_MISMATCH');
  if(ticket.ua_bind!==await hmacHex(env,ua))reasons.push('USER_AGENT_MISMATCH');

  reasons.push(...detectAutomation(request));

  if(reasons.length){
    await fsSet(env,`downloadTickets/${ticketId}`,{
      blocked:true,
      blocked_at:new Date().toISOString(),
      block_reason:reasons.join(', ')
    },true);

    await blockAndReport({
      request,env,profile,
      productId:ticket.product_id,
      productTitle:ticket.product_title,
      ticketId,
      reasons:[...new Set(reasons)],
      phase:'download_arm'
    });

    return corsJson({
      ok:false,
      code:'BLOCKED',
      message:'Possibile bypass rilevato. Account bloccato.'
    },423,env);
  }

  const armed=Date.now();

  await fsSet(env,`downloadTickets/${ticketId}`,{
    armed_ms:armed,
    armed_at:new Date(armed).toISOString()
  },true);

  return corsJson({
    ok:true,
    complete_url:`${url.origin}/download/complete?ticket=${encodeURIComponent(ticketId)}`
  },200,env);
}

/* ============================================================
   Complete / strict anti-bypass
   ============================================================ */

async function downloadComplete(request,env,url){
  const ticketId=cleanTicket(url.searchParams.get('ticket'));
  if(!ticketId){
    return blockedHtml('Ticket download mancante.',403);
  }

  const ticket=await fsGet(env,`downloadTickets/${ticketId}`);

  // Unknown ticket: no Discord identity exists to block safely.
  if(!ticket){
    return blockedHtml('Ticket non valido o inesistente.',403);
  }

  const profile={
    uid:String(ticket.uid||''),
    discord_id:String(ticket.discord_id||''),
    username:String(ticket.discord_username||''),
    global_name:String(ticket.discord_global_name||''),
    avatar:String(ticket.discord_avatar||'')
  };

  const existingBlock=await fsGet(env,`blockedUsers/${profile.discord_id}`);
  if(existingBlock){
    return blockedHtml(existingBlock.reason||'Account bloccato.',423);
  }

  const reasons=[];
  const now=Date.now();
  const ip=clientIp(request);
  const ua=request.headers.get('user-agent')||'';
  const ref=request.headers.get('referer')||'';
  const secFetchSite=(request.headers.get('sec-fetch-site')||'').toLowerCase();
  const secFetchMode=(request.headers.get('sec-fetch-mode')||'').toLowerCase();

  if(ticket.used)reasons.push('TICKET_REUSE');
  if(ticket.blocked)reasons.push('TICKET_PRECEDENTEMENT_BLOCCATO');
  if(now-Number(ticket.created_ms||0)>ticketTtlMs(env))reasons.push('TICKET_SCADUTO');
  if(ticket.ip_bind!==await hmacHex(env,ip))reasons.push('IP_MISMATCH');
  if(ticket.ua_bind!==await hmacHex(env,ua))reasons.push('USER_AGENT_MISMATCH');

  reasons.push(...detectAutomation(request));

  // Only one query parameter is accepted.
  const queryKeys=[...url.searchParams.keys()];
  if(queryKeys.some(k=>k!=='ticket'))reasons.push('PARAMETRI_DOWNLOAD_ANOMALI');

  if(ticket.kind==='free'){
    if(!Number(ticket.armed_ms||0))reasons.push('GATE_NON_ARMATO');

    const minMs=minLinkvertiseMs(env);
    if(Number(ticket.armed_ms||0) && now-Number(ticket.armed_ms)<minMs){
      reasons.push('COMPLETAMENTO_TROPPO_RAPIDO');
    }

    // Strict mode requested by the owner:
    // missing/wrong Linkvertise referrer = suspicious => immediate block.
    if(!isLinkvertiseReferrer(ref)){
      reasons.push(ref?'REFERRER_NON_LINKVERTISE':'REFERRER_MANCANTE');
    }

    if(secFetchMode && secFetchMode!=='navigate'){
      reasons.push(`SEC_FETCH_MODE_${secFetchMode.toUpperCase()}`);
    }

    if(secFetchSite && !['cross-site','none'].includes(secFetchSite)){
      reasons.push(`SEC_FETCH_SITE_${secFetchSite.toUpperCase()}`);
    }
  }

  if(reasons.length){
    await fsSet(env,`downloadTickets/${ticketId}`,{
      blocked:true,
      blocked_at:new Date().toISOString(),
      block_reason:[...new Set(reasons)].join(', ')
    },true);

    await blockAndReport({
      request,env,profile,
      productId:ticket.product_id,
      productTitle:ticket.product_title,
      ticketId,
      reasons:[...new Set(reasons)],
      phase:'download_complete'
    });

    return blockedHtml(
      'Possibile bypass tool/accesso diretto rilevato. Il profilo Discord è stato bloccato.',
      423
    );
  }

  // Premium never needs Linkvertise, but still requires a valid entitlement.
  if(ticket.kind==='premium'){
    const entitlement=await fsGet(
      env,
      `users/${profile.uid}/purchases/${ticket.product_id}`
    );

    if(!entitlement){
      return blockedHtml('Acquisto non associato al profilo.',403);
    }
  }

  const privateProduct=await fsGet(env,`privateProducts/${ticket.product_id}`);
  const target=String(privateProduct?.access_url||'').trim();

  if(!/^https?:\/\//i.test(target)){
    return blockedHtml('Link privato non configurato.',500);
  }

  await fsSet(env,`downloadTickets/${ticketId}`,{
    used:true,
    used_at:new Date().toISOString()
  },true);

  return new Response(null,{
    status:302,
    headers:{
      Location:target,
      'Cache-Control':'no-store'
    }
  });
}

/* ============================================================
   Detection
   ============================================================ */

function detectAutomation(request){
  const reasons=[];
  const ua=(request.headers.get('user-agent')||'').toLowerCase();

  const patterns=[
    ['headlesschrome','HEADLESS_BROWSER'],
    ['phantomjs','PHANTOMJS'],
    ['selenium','SELENIUM'],
    ['puppeteer','PUPPETEER'],
    ['playwright','PLAYWRIGHT'],
    ['python-requests','PYTHON_REQUESTS'],
    ['python-urllib','PYTHON_URLLIB'],
    ['curl/','CURL_CLIENT'],
    ['wget/','WGET_CLIENT'],
    ['go-http-client','GO_HTTP_CLIENT'],
    ['httpclient','GENERIC_HTTPCLIENT'],
    ['scrapy','SCRAPY'],
    ['postmanruntime','POSTMAN'],
    ['insomnia/','INSOMNIA']
  ];

  for(const [needle,code] of patterns){
    if(ua.includes(needle))reasons.push(code);
  }

  if(!ua.trim())reasons.push('USER_AGENT_MANCANTE');

  return reasons;
}

function isLinkvertiseReferrer(ref){
  if(!ref)return false;

  try{
    const host=new URL(ref).hostname.toLowerCase();
    return host==='linkvertise.com'
      || host.endsWith('.linkvertise.com')
      || host==='linkvertise.download'
      || host.endsWith('.linkvertise.download');
  }catch{
    return false;
  }
}

/* ============================================================
   Firebase ID token verification
   ============================================================ */

async function verifyDiscordRequest(request,env){
  requireEnv(env,'FIREBASE_WEB_API_KEY');
  requireEnv(env,'FIREBASE_PROJECT_ID');

  const raw=request.headers.get('authorization')||'';
  const m=raw.match(/^Bearer\s+(.+)$/i);

  if(!m){
    throw httpError(401,'AUTH_REQUIRED','Accesso Discord richiesto.');
  }

  const idToken=m[1];

  // Firebase Authentication validates the supplied ID token.
  const response=await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
    {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({idToken})
    }
  );

  if(!response.ok){
    throw httpError(401,'BAD_FIREBASE_TOKEN','Sessione Discord/Firebase non valida.');
  }

  const data=await response.json();
  if(!Array.isArray(data.users)||!data.users.length){
    throw httpError(401,'BAD_FIREBASE_USER','Utente Firebase non valido.');
  }

  const claims=decodeJwtPayload(idToken);

  if(claims.aud!==String(env.FIREBASE_PROJECT_ID)){
    throw httpError(401,'BAD_AUDIENCE','Firebase audience non valida.');
  }

  if(claims.iss!==`https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`){
    throw httpError(401,'BAD_ISSUER','Firebase issuer non valido.');
  }

  if(claims.provider!=='discord'||!/^\d+$/.test(String(claims.discord_id||''))){
    throw httpError(401,'DISCORD_REQUIRED','Connessione Discord obbligatoria.');
  }

  const expectedUid=`discord_${claims.discord_id}`;

  if(String(claims.user_id||claims.sub||'')!==expectedUid){
    throw httpError(401,'UID_MISMATCH','Identità Discord non coerente.');
  }

  return {claims,user:data.users[0]};
}

function profileFromClaims(c){
  return {
    uid:String(c.user_id||c.sub||''),
    discord_id:String(c.discord_id||''),
    username:String(c.discord_username||''),
    global_name:String(c.discord_global_name||''),
    avatar:String(c.discord_avatar||'')
  };
}

/* ============================================================
   Blocking, Firestore log and Discord webhook
   ============================================================ */

async function blockAndReport({
  request,env,profile,productId,productTitle,ticketId,reasons,phase
}){
  if(!profile?.discord_id)return;

  const now=new Date().toISOString();
  const reason=`Possibile bypass: ${reasons.join(', ')}`;
  const ip=clientIp(request);
  const ua=request.headers.get('user-agent')||'';
  const referrer=request.headers.get('referer')||'';
  const acceptLanguage=request.headers.get('accept-language')||'';
  const cfRay=request.headers.get('cf-ray')||'';
  const country=request.cf?.country||'';
  const colo=request.cf?.colo||'';
  const requestUrl=new URL(request.url);

  const row={
    discord_id:profile.discord_id,
    discord_tag:profile.global_name||profile.username||'Discord user',
    discord_username:profile.username,
    discord_global_name:profile.global_name,
    discord_avatar:profile.avatar,
    firebase_uid:profile.uid,
    reason,
    reasons,
    resource:productTitle||productId||'',
    product_id:productId||'',
    target_file:'',
    ticket_id:ticketId||'',
    phase,
    risk_score:100,
    ip,
    user_agent:ua,
    referrer,
    accept_language:acceptLanguage,
    request_uri:`${requestUrl.pathname}${requestUrl.search}`,
    cf_ray:cfRay,
    country,
    colo,
    blocked_at:now,
    blocked_by:'DEMON_V7_STRICT_ANTIBYPASS'
  };

  await fsSet(env,`blockedUsers/${profile.discord_id}`,row,true);

  const logId=`${Date.now()}_${randomHex(8)}`;
  await fsSet(env,`securityLogs/${logId}`,{
    event:'possible_bypass_blocked',
    created_at:now,
    message:reason,
    ...row
  });

  await sendSecurityWebhook(env,row).catch(error=>{
    console.error('[DEMON WEBHOOK]',error);
  });
}

async function sendSecurityWebhook(env,row){
  if(!env.SECURITY_WEBHOOK_URL)return;

  const avatar=row.discord_avatar&&row.discord_id
    ? `https://cdn.discordapp.com/avatars/${row.discord_id}/${row.discord_avatar}.png?size=128`
    : undefined;

  const fields=[
    {name:'Discord',value:`${safe(row.discord_tag)}\nID: \`${safe(row.discord_id)}\``,inline:true},
    {name:'Firebase UID',value:`\`${safe(row.firebase_uid)}\``,inline:true},
    {name:'Risk',value:'**100 / 100 — BLOCCATO**',inline:true},
    {name:'Risorsa',value:`${safe(row.resource||'—')}\n\`${safe(row.product_id||'—')}\``,inline:false},
    {name:'Motivo',value:safe(row.reason).slice(0,1000),inline:false},
    {name:'IP / Cloudflare',value:`IP: \`${safe(row.ip||'—')}\`\nCountry: ${safe(row.country||'—')} • Colo: ${safe(row.colo||'—')}\nCF-Ray: \`${safe(row.cf_ray||'—')}\``,inline:false},
    {name:'Request',value:`Phase: \`${safe(row.phase)}\`\nURI: \`${safe(row.request_uri||'—')}\`\nReferrer: ${safe(row.referrer||'MANCANTE').slice(0,450)}`,inline:false},
    {name:'Browser',value:`UA: ${safe(row.user_agent||'MANCANTE').slice(0,650)}\nLanguage: ${safe(row.accept_language||'—').slice(0,200)}`,inline:false},
    {name:'Ticket',value:`\`${safe(row.ticket_id||'—')}\``,inline:false}
  ];

  const body={
    username:'Demon Security',
    embeds:[{
      title:'🚨 POSSIBILE BYPASS TOOL — ACCESSO BLOCCATO',
      description:'Il sistema V7 ha negato il download, bloccato il Discord ID e registrato l’evento.',
      color:15158332,
      timestamp:row.blocked_at,
      thumbnail:avatar?{url:avatar}:undefined,
      fields
    }]
  };

  const r=await fetch(String(env.SECURITY_WEBHOOK_URL),{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(body)
  });

  if(!r.ok){
    throw new Error(`Webhook HTTP ${r.status}`);
  }
}

/* ============================================================
   Firestore REST through service account
   ============================================================ */

async function googleAccessToken(env){
  const now=Date.now();

  if(
    googleAccessTokenCache.token &&
    googleAccessTokenCache.expiresAt-now>60_000
  ){
    return googleAccessTokenCache.token;
  }

  requireEnv(env,'FIREBASE_SERVICE_ACCOUNT_EMAIL');
  requireEnv(env,'FIREBASE_PRIVATE_KEY');

  const account=serviceAccountFromEnv(env);
  const iat=Math.floor(now/1000);
  const assertion=await signJwt(
    {
      alg:'RS256',
      typ:'JWT'
    },
    {
      iss:String(account.email),
      scope:DATASTORE_SCOPE,
      aud:GOOGLE_TOKEN_URL,
      iat,
      exp:iat+3600
    },
    account.privateKey
  );

  const r=await fetch(GOOGLE_TOKEN_URL,{
    method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({
      grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });

  if(!r.ok){
    throw new Error(`Google OAuth service account HTTP ${r.status}`);
  }

  const data=await r.json();
  googleAccessTokenCache={
    token:data.access_token,
    expiresAt:now+(Number(data.expires_in||3600)*1000)
  };

  return data.access_token;
}

function firestoreBase(env){
  requireEnv(env,'FIREBASE_PROJECT_ID');
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents`;
}

async function fsGet(env,path){
  const token=await googleAccessToken(env);
  const r=await fetch(`${firestoreBase(env)}/${path}`,{
    headers:{authorization:`Bearer ${token}`}
  });

  if(r.status===404)return null;
  if(!r.ok)throw new Error(`Firestore GET ${path} HTTP ${r.status}`);

  const doc=await r.json();
  return fromFields(doc.fields||{});
}

async function fsSet(env,path,data,merge=false){
  const token=await googleAccessToken(env);
  const url=new URL(`${firestoreBase(env)}/${path}`);

  if(merge){
    for(const key of Object.keys(data)){
      url.searchParams.append('updateMask.fieldPaths',key);
    }
  }

  const r=await fetch(url,{
    method:'PATCH',
    headers:{
      authorization:`Bearer ${token}`,
      'content-type':'application/json'
    },
    body:JSON.stringify({fields:toFields(data)})
  });

  if(!r.ok){
    const txt=await r.text().catch(()=>'');
    throw new Error(`Firestore PATCH ${path} HTTP ${r.status} ${txt.slice(0,250)}`);
  }

  const doc=await r.json();
  return fromFields(doc.fields||{});
}

async function fsListCollection(env,path){
  const token=await googleAccessToken(env);
  const url=new URL(`${firestoreBase(env)}/${path}`);
  url.searchParams.set('pageSize','100');

  const rows=[];
  let pageToken='';

  do{
    if(pageToken)url.searchParams.set('pageToken',pageToken);
    const r=await fetch(url,{
      headers:{authorization:`Bearer ${token}`}
    });

    if(!r.ok){
      if(r.status===404)return [];
      throw new Error(`Firestore LIST ${path} HTTP ${r.status}`);
    }

    const data=await r.json();
    for(const doc of data.documents||[]){
      const id=String(doc.name||'').split('/').pop();
      rows.push({id,...fromFields(doc.fields||{})});
    }

    pageToken=String(data.nextPageToken||'');
  }while(pageToken);

  return rows;
}

async function fsDelete(env,path){
  const token=await googleAccessToken(env);
  const r=await fetch(`${firestoreBase(env)}/${path}`,{
    method:'DELETE',
    headers:{authorization:`Bearer ${token}`}
  });

  if(!r.ok&&r.status!==404){
    throw new Error(`Firestore DELETE ${path} HTTP ${r.status}`);
  }

  return true;
}

/* ============================================================
   Firestore value conversion
   ============================================================ */

function toFields(obj){
  const out={};
  for(const [k,v] of Object.entries(obj)){
    out[k]=toValue(v);
  }
  return out;
}

function toValue(v){
  if(v===null||v===undefined)return {nullValue:null};
  if(typeof v==='string')return {stringValue:v};
  if(typeof v==='boolean')return {booleanValue:v};

  if(typeof v==='number'){
    return Number.isInteger(v)
      ? {integerValue:String(v)}
      : {doubleValue:v};
  }

  if(v instanceof Date)return {timestampValue:v.toISOString()};

  if(Array.isArray(v)){
    return {arrayValue:{values:v.map(toValue)}};
  }

  if(typeof v==='object'){
    return {mapValue:{fields:toFields(v)}};
  }

  return {stringValue:String(v)};
}

function fromFields(fields){
  const out={};
  for(const [k,v] of Object.entries(fields)){
    out[k]=fromValue(v);
  }
  return out;
}

function fromValue(v){
  if('stringValue'in v)return v.stringValue;
  if('integerValue'in v)return Number(v.integerValue);
  if('doubleValue'in v)return Number(v.doubleValue);
  if('booleanValue'in v)return !!v.booleanValue;
  if('timestampValue'in v)return v.timestampValue;
  if('nullValue'in v)return null;
  if('arrayValue'in v)return (v.arrayValue.values||[]).map(fromValue);
  if('mapValue'in v)return fromFields(v.mapValue.fields||{});
  return null;
}

/* ============================================================
   Firebase custom token
   ============================================================ */

function serviceAccountFromEnv(env){
  let email=String(env.FIREBASE_SERVICE_ACCOUNT_EMAIL||'').trim();
  let raw=String(env.FIREBASE_PRIVATE_KEY||'').trim();

  // Full Firebase service-account JSON accidentally pasted as the secret.
  if(raw.startsWith('{')){
    try{
      const obj=JSON.parse(raw);
      if(obj.client_email)email=String(obj.client_email).trim();
      if(obj.private_key)raw=String(obj.private_key);
    }catch{}
  }

  // A copied JSON field, for example:
  // "private_key": "-----BEGIN PRIVATE KEY-----\\n..."
  if(raw.includes('"private_key"')){
    try{
      const candidate=raw.startsWith('{')?raw:`{${raw}}`;
      const obj=JSON.parse(candidate);
      if(obj.private_key)raw=String(obj.private_key);
      if(obj.client_email)email=String(obj.client_email).trim();
    }catch{}
  }

  raw=String(raw||'').replace(/\\n/g,'\n').trim();

  const pem=raw.match(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/);
  if(pem)raw=pem[0];

  return {email,privateKey:raw};
}

async function createFirebaseCustomToken(env,user){
  const account=serviceAccountFromEnv(env);
  const email=account.email;
  const key=account.privateKey;
  const now=Math.floor(Date.now()/1000);
  const uid=`discord_${user.id}`;

  return signJwt(
    {alg:'RS256',typ:'JWT'},
    {
      iss:email,
      sub:email,
      aud:FIREBASE_CUSTOM_TOKEN_AUD,
      iat:now,
      exp:now+3600,
      uid,
      claims:{
        provider:'discord',
        discord_id:String(user.id),
        discord_username:String(user.username||''),
        discord_global_name:String(user.global_name||''),
        discord_avatar:String(user.avatar||'')
      }
    },
    key
  );
}

/* ============================================================
   Crypto
   ============================================================ */

async function signJwt(header,payload,pem){
  const unsigned=`${base64urlJson(header)}.${base64urlJson(payload)}`;
  const key=await importPrivateKey(pem);

  const signature=await crypto.subtle.sign(
    {name:'RSASSA-PKCS1-v1_5'},
    key,
    new TextEncoder().encode(unsigned)
  );

  return `${unsigned}.${base64urlBytes(new Uint8Array(signature))}`;
}

function normalizePrivateKey(value){
  let raw=String(value||'').trim();

  if(!raw){
    throw new Error('FIREBASE_PRIVATE_KEY è vuota.');
  }

  if(raw.startsWith('"')&&raw.endsWith('"')){
    try{raw=JSON.parse(raw)}catch{}
  }

  raw=String(raw).replace(/\\n/g,'\n').trim();

  const match=raw.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);

  if(!match){
    throw new Error('FIREBASE_PRIVATE_KEY non valida: incolla il campo private_key del JSON Firebase Service Account.');
  }

  let body=match[1]
    .replace(/\s+/g,'')
    .replace(/[^A-Za-z0-9+/=]/g,'');

  body=body.replace(/=+$/,'');
  body+='='.repeat((4-body.length%4)%4);

  if(body.length<100){
    throw new Error('FIREBASE_PRIVATE_KEY sembra troncata.');
  }

  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
}

async function importPrivateKey(pem){
  pem=normalizePrivateKey(pem);

  const body=pem
    .replace(/-----BEGIN PRIVATE KEY-----/g,'')
    .replace(/-----END PRIVATE KEY-----/g,'')
    .replace(/\s+/g,'');

  try{
    const binary=Uint8Array.from(atob(body),c=>c.charCodeAt(0));

    return await crypto.subtle.importKey(
      'pkcs8',
      binary.buffer,
      {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},
      false,
      ['sign']
    );
  }catch{
    throw new Error('FIREBASE_PRIVATE_KEY non valida o corrotta. Copia nuovamente private_key dal JSON Service Account Firebase.');
  }
}

async function hmacHex(env,value){
  requireEnv(env,'TICKET_BINDING_SECRET');
  const key=await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(env.TICKET_BINDING_SECRET)),
    {name:'HMAC',hash:'SHA-256'},
    false,
    ['sign']
  );

  const sig=await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(String(value||''))
  );

  return [...new Uint8Array(sig)]
    .map(x=>x.toString(16).padStart(2,'0'))
    .join('');
}

/* ============================================================
   HTTP / helpers
   ============================================================ */

function siteOriginMatches(request,env){
  const origin=request.headers.get('origin')||'';
  return origin===siteUrl(env);
}

function cors(response,env){
  const h=new Headers(response.headers);
  h.set('Access-Control-Allow-Origin',siteUrl(env));
  h.set('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  h.set('Access-Control-Allow-Headers','Authorization,Content-Type');
  h.set('Access-Control-Max-Age','86400');
  h.set('Vary','Origin');

  return new Response(response.body,{
    status:response.status,
    statusText:response.statusText,
    headers:h
  });
}

function corsJson(data,status,env){
  return cors(new Response(JSON.stringify(data),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store'
    }
  }),env);
}

function blockedHtml(message,status=423){
  const html=`<!doctype html>
  <html lang="it"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Demon Security</title>
  <style>
  body{margin:0;background:#050506;color:#eee;font-family:system-ui;display:grid;place-items:center;min-height:100vh;padding:25px}
  main{max-width:620px;background:#11090c;border:1px solid #63242e;padding:36px;border-radius:22px;text-align:center}
  h1{color:#ff3348}p{color:#aaa;line-height:1.6}a{color:#fff}
  </style></head><body><main>
  <div style="font-size:54px">⛔</div>
  <h1>ACCESSO BLOCCATO</h1>
  <p>${escapeHtml(message)}</p>
  <p><a href="https://demonleaks.xyz/">Torna a Demon Leaks</a></p>
  </main></body></html>`;

  return new Response(html,{
    status,
    headers:{
      'content-type':'text/html; charset=utf-8',
      'cache-control':'no-store'
    }
  });
}

function httpError(status,code,message){
  const e=new Error(message);
  e.httpStatus=status;
  e.code=code;
  return e;
}

function siteUrl(env){
  const value=String(env.SITE_URL||'https://demonleaks.xyz').replace(/\/+$/,'');
  if(!/^https:\/\//i.test(value))throw new Error('SITE_URL non valido.');
  return value;
}

function redirectUri(env,origin){
  return String(env.DISCORD_REDIRECT_URI||`${origin}/auth/callback`);
}

function ticketTtlMs(env){
  const minutes=Math.max(2,Math.min(60,Number(env.TICKET_TTL_MINUTES||15)));
  return minutes*60*1000;
}

function minLinkvertiseMs(env){
  const seconds=Math.max(3,Math.min(120,Number(env.LINKVERTISE_MIN_SECONDS||5)));
  return seconds*1000;
}

function cleanId(v){
  const s=String(v||'').trim();
  return /^[a-zA-Z0-9_-]{1,150}$/.test(s)?s:'';
}

function cleanTicket(v){
  const s=String(v||'').trim();
  return /^[a-f0-9]{48}$/.test(s)?s:'';
}

function clientIp(request){
  return String(
    request.headers.get('CF-Connecting-IP')
    ||request.headers.get('x-forwarded-for')
    ||''
  ).split(',')[0].trim();
}

function decodeJwtPayload(jwt){
  const parts=String(jwt||'').split('.');
  if(parts.length!==3)throw new Error('JWT non valido.');
  const str=parts[1].replace(/-/g,'+').replace(/_/g,'/');
  const padded=str+'='.repeat((4-str.length%4)%4);
  return JSON.parse(atob(padded));
}

function base64urlJson(value){
  return base64urlBytes(
    new TextEncoder().encode(JSON.stringify(value))
  );
}

function base64urlBytes(bytes){
  let binary='';
  for(let i=0;i<bytes.length;i+=0x8000){
    binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  }
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function randomHex(bytes){
  const a=new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map(v=>v.toString(16).padStart(2,'0')).join('');
}

function cookie(name,value,maxAge){
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function parseCookies(raw){
  const result={};
  raw.split(';').forEach(part=>{
    const i=part.indexOf('=');
    if(i<0)return;
    const k=part.slice(0,i).trim();
    const v=part.slice(i+1).trim();
    try{result[k]=decodeURIComponent(v)}catch{result[k]=v}
  });
  return result;
}

function timingSafeEqual(a,b){
  if(a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}

function requireEnv(env,name){
  if(!env[name])throw new Error(`${name} non configurato nel Worker.`);
}

function redirect(location){
  return new Response(null,{status:302,headers:{Location:location}});
}

function safe(value){
  return String(value??'').replace(/`/g,"'");
}

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
