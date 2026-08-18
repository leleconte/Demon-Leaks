import{signInWithWorkerToken,discordClaims,ensureDiscordProfile,startDiscordLogin}from'./discord-session.js?v=10';
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
 $('#authText').textContent=error.message||'Errore di autenticazione.';
 $('#authRetry').classList.remove('hidden');
 $('#authRetry').onclick=()=>{try{startDiscordLogin()}catch(e){$('#authText').textContent=e.message}};
});