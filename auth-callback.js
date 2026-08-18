import{signInWithWorkerToken,discordClaims,ensureDiscordProfile,startDiscordLogin}from'./discord-session.js?v=10.1';
const $=q=>document.querySelector(q);
async function run(){
 const h=new URLSearchParams(location.hash.replace(/^#/,''));
 const error=h.get('discord_error'),token=h.get('firebase_token');
 if(error)throw new Error(decodeURIComponent(error));
 if(!token)throw new Error('Discord non ha restituito una sessione valida.');
 const user=await signInWithWorkerToken(token);
 const profile=await discordClaims(user,true);
 if(!profile)throw new Error('Firebase è connesso, ma i dati Discord non sono presenti nel token.');
 localStorage.setItem('demon_discord_ui_cache',JSON.stringify(profile));
 await ensureDiscordProfile(user).catch(()=>null);
 $('#authTitle').textContent='Account collegato ✓';
 $('#authText').textContent=`Benvenuto ${profile.global_name||profile.username||'Discord user'}. Apertura del tuo store…`;
 history.replaceState(null,'',location.pathname);
 setTimeout(()=>location.replace('./?discord=connected'),500);
}
run().catch(error=>{
 console.error('[DEMON AUTH CALLBACK]',error);
 $('#authTitle').textContent='Accesso Discord non completato';
 const raw=String(error?.message||'Errore di autenticazione.');
 const friendly=/atob|base64|PRIVATE_KEY|token Firebase/i.test(raw)
   ? 'La chiave privata Firebase configurata nel Worker non è valida. Sostituisci FIREBASE_PRIVATE_KEY con il valore private_key del JSON Service Account Firebase e riprova.'
   : raw;
 $('#authText').textContent=friendly;
 $('#authRetry').classList.remove('hidden');
 $('#authRetry').onclick=()=>{try{startDiscordLogin()}catch(e){$('#authText').textContent=e.message}};
});