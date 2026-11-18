/* Local monthly reminder. Runs at midnight while open and on the next visit. */
(() => {
  'use strict';
  const base='money-prototype-v4-monthly-reminder';
  const read=key=>{try{return localStorage.getItem(key);}catch(_){return null;}};
  const monthKey=date=>date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
  let timer, dialog;
  function write(key,value) {
    try {localStorage.setItem(key,value);return true;} catch(_){return false;}
  }
  function schedule(now,snooze) {
    clearTimeout(timer);
    const next=new Date(now.getFullYear(),now.getMonth()+1,1,0,0,0);
    const delay=snooze>now.getTime()?snooze-now.getTime():next.getTime()-now.getTime();
    timer=setTimeout(check,Math.min(Math.max(delay,1000),86400000));
  }
  function close() {if(dialog?.open)dialog.close();}
  function check() {
    const now=new Date(), current=monthKey(now);
    const snooze=Number(read(base+'-snooze')||0);
    schedule(now,snooze);
    if(!window.MonoReviewHost?.isReady()||document.hidden)return;
    const started=read(base+'-start');
    if(!started){write(base+'-start',current);return;}
    if(started>=current||read(base+'-ack')===current||snooze>now.getTime())return;
    if(dialog?.open)return;
    if(document.querySelector('dialog[open]')){clearTimeout(timer);timer=setTimeout(check,60000);return;}
    if(!dialog){
      dialog=document.createElement('dialog');
      dialog.className='monthly-reminder';
      dialog.setAttribute('aria-labelledby','monthly-reminder-title');
      const title=document.createElement('h2');title.id='monthly-reminder-title';
      const text=document.createElement('p');text.className='note';
      const open=document.createElement('button');open.type='button';open.className='primary';open.textContent='До рахунків';
      const later=document.createElement('button');later.type='button';later.className='second';later.textContent='Нагадати через годину';
      open.addEventListener('click',()=>{
        write(base+'-ack',monthKey(new Date()));close();window.MonoReviewHost.leave();
      });
      const postpone=()=>{
        const until=Date.now()+3600000;write(base+'-snooze',String(until));close();schedule(new Date(),until);
      };
      later.addEventListener('click',postpone);
      dialog.addEventListener('cancel',event=>{event.preventDefault();postpone();});
      dialog.append(title,text,open,later);document.body.append(dialog);
    }
    const previous=new Date(now.getFullYear(),now.getMonth()-1,1);
    const name=previous.toLocaleDateString('uk-UA',{month:'long',year:'numeric'});
    dialog.querySelector('h2').textContent='Час внести витрати за минулий місяць';
    dialog.querySelector('p').textContent='Вкажіть витрати за '+name+' у своїх рахунках або оновіть залишки.';
    dialog.showModal();
  }
  document.addEventListener('v4-ready',check);
  document.addEventListener('visibilitychange',check);
  window.addEventListener('focus',check);
  window.addEventListener('pagehide',()=>clearTimeout(timer));
  check();
})();
