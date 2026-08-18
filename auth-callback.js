import{
  consumeDiscordCallback,cachedProfile
}from'./discord-session.js?v=10.3';

const $=q=>document.querySelector(q);

async function init(){
  try{
    $('#authTitle').textContent='Connessione Discord';
    $('#authText').textContent='Sto collegando il tuo account Demon Leaks…';

    const result=await consumeDiscordCallback();
    const profile=result||cachedProfile();

    if(!profile){
      throw new Error('La sessione Discord non è stata ricevuta dal Worker.');
    }

    $('#authTitle').textContent='Account collegato';
    $('#authText').textContent=`Benvenuto ${profile.global_name||profile.username||'Discord user'}.`;

    setTimeout(()=>location.replace('./'),500);

  }catch(error){
    console.error('[DEMON AUTH CALLBACK]',error);
    $('#authTitle').textContent='Accesso Discord non completato';
    $('#authText').textContent=error.message||'Errore di autenticazione.';
  }
}
init();
