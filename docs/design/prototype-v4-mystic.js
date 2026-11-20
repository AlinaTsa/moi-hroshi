/* Presentation only: decorate existing v3 elements without changing their actions or data. */
(() => {
  'use strict';
  const view=document.getElementById('view');
  if(!view)return;
  const glyphs={funds:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v5c0 4 14 4 14 0V6M5 11v5c0 4 14 4 14 0v-5"/>',goal:'<circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4"/><path d="m11 13 9-9M16 4h4v4"/>'};
  function fundIcon(name){
    const span=document.createElement('span');span.className='mystic-fund-icon';span.setAttribute('aria-hidden','true');
    span.innerHTML='<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+glyphs[name]+'</svg>';
    return span;
  }
  function decorate(){
    observer.disconnect();
    view.classList.remove('mystic-home','mystic-accounts','mystic-goals');
    const hero=view.querySelector(':scope > div > .hero-row')?.parentElement;
    if(hero){
      view.classList.add('mystic-home');hero.classList.add('mystic-hero');
      if(!hero.querySelector('.mystic-mio')){
        const mio=document.createElement('img');mio.src='prototype-v4-mio.png';mio.alt='';mio.setAttribute('aria-hidden','true');mio.className='mystic-mio';mio.draggable=false;hero.append(mio);
      }
      const following=hero.nextElementSibling;
      if(following?.classList.contains('card')&&following.querySelector('.big-a')){
        following.classList.add('mystic-funds');
        const cells=following.querySelectorAll(':scope > .two > div');
        cells.forEach((cell,index)=>{if(!cell.querySelector('.mystic-fund-icon'))cell.prepend(fundIcon(index?'goal':'funds'));});
      }
      for(const card of view.querySelectorAll(':scope > .card'))if(card.querySelector('.pl-a'))card.classList.add('mystic-allocation');
    }
    const title=view.querySelector(':scope > .hdr h1')?.textContent;
    if(title==='Рахунки'){
      view.classList.add('mystic-accounts');view.querySelector(':scope > .card')?.classList.add('mystic-account-summary');
    }
    if(title==='Цілі'){
      view.classList.add('mystic-goals');view.querySelector(':scope > .card')?.classList.add('mystic-goal-summary');
    }
    observer.observe(view,{childList:true});
  }
  const observer=new MutationObserver(decorate);
  decorate();
})();
