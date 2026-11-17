/* Local interactive design experiment. No access to the production storage key. */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
(function () {
  'use strict';
  const E = MoneyV3, KEY = 'money-prototype-v3';
  const $ = id => document.getElementById(id);
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
  let store = E.seed(false, today()), p, storageWarning = '';
  try { const raw = localStorage.getItem(KEY); if (raw) { const parsed=JSON.parse(raw); if (parsed.schemaVersion === 1 && parsed.base && Array.isArray(parsed.events)) { E.project(parsed); store=parsed; } } } catch (_) { storageWarning='Збереження недоступне або демо пошкоджено. Можна продовжити в цій вкладці.'; }
  let route = 'home', params = {}, toast = '', period = 12, overlay = null;
  let lastTab = 'home';
  let toastTimer;
  const accountForms = ['income','quick','transfer','edit-balance','account-new'];
  const VIEW_KEY = KEY+'-view';
  let openSwipeId = null, swipe = null, suppressSwipeClickUntil = 0, deleteAccountId = null;
  const symbols = {USDT:'USDT',USD:'$',EUR:'€',UAH:'₴',GBP:'£',PLN:'zł',JPY:'¥',CHF:'CHF',CZK:'Kč',SEK:'kr',NOK:'kr',DKK:'kr',CAD:'CA$',AUD:'A$'};
  function currencyMark(code) {
    if(!code)return '';
    if(!Object.hasOwn(symbols,code)){
      const parts=new Intl.NumberFormat('uk-UA',{style:'currency',currency:code,currencyDisplay:'narrowSymbol'}).formatToParts(0);
      symbols[code]=parts.find(part=>part.type==='currency')?.value||code;
    }
    return symbols[code];
  }
  const currencyNames = new Intl.DisplayNames(['uk'], {type:'currency'});
  const englishCurrencyNames = new Intl.DisplayNames(['en'], {type:'currency'});
  const currencyName = code => ({USD:'долар США',USDT:'Tether'}[code]||currencyNames.of(code));
  const currencyLabel = code => {
    const name = currencyName(code);
    return name[0].toLocaleUpperCase('uk-UA')+name.slice(1)+' ('+code+')';
  };
  function matchesCurrency(code, query) {
    const english = code==='USDT'?'Tether':englishCurrencyNames.of(code);
    const words = (currencyName(code)+' '+english+' '+code).toLocaleLowerCase('uk-UA').split(/[^\p{L}\p{N}]+/u);
    return query.trim().toLocaleLowerCase('uk-UA').split(/\s+/).every(term=>words.some(word=>word.startsWith(term)));
  }
  store.rates = {...E.seed().rates,...store.rates};
  const names = {cash:'Готівка',bank:'Банківський рахунок',dep:'Депозит',savings:'Ощадний рахунок',biz:'Бізнес / ФОП',investment:'Інвестиційний рахунок',crypto:'Криптовалюта',other:'Інше'};
  const types = Object.keys(names);
  const currencies = Object.keys(store.rates);
  const money = (n,c) => (n/100).toLocaleString('uk-UA',{maximumFractionDigits:2}) + ' ' + currencyMark(c);
  const shown = (n,currency=store.currency) => money(Math.round(n/store.rates[currency]),currency);
  const val = id => {
    const field = $(id);
    return field?.value || '';
  };
  const amount = value => { const text=String(value).trim().replace(/\s/g,'').replace(',','.'); if (!/^\d+(\.\d{0,2})?$/.test(text)) throw new Error('Введіть суму цифрами, наприклад 1500 або 1500,50.'); const n=Math.round(Number(text)*100); if (!Number.isSafeInteger(n) || n > 1e13) throw new Error('Сума завелика для прототипу.'); return n; };
  const dateLabel = d => new Date(d+'T12:00:00').toLocaleDateString('uk-UA',{day:'numeric',month:'short',year:'numeric'});
  const monthLabel = d => new Date(d.slice(0,7)+'-01T12:00:00').toLocaleDateString('uk-UA',{month:'long',year:'numeric'});
  const aBy = id => p.accounts.find(a=>a.id===id);
  const gBy = id => p.goals.find(g=>g.id===id);
  const options = (list, current, label) => list.map(x=>'<option value="'+esc(typeof x==='string'?x:x.id)+'" '+((typeof x==='string'?x:x.id)===current?'selected':'')+'>'+esc(label?label(x):x)+'</option>').join('');
  const field = (id,label,value,kind='text',extra='') => '<div class="fld"><label for="'+id+'">'+label+'</label><input class="inp" id="'+id+'" name="'+id+'" type="'+kind+'" value="'+esc(value)+'" '+extra+'></div>';
  const select = (id,label,html) => '<div class="fld"><label for="'+id+'">'+label+'</label><select class="inp" id="'+id+'" name="'+id+'">'+html+'</select></div>';
  const toggle = (id,label,on,sub='') => '<label class="toggle-label" for="'+id+'"><span>'+label+(sub?'<small>'+sub+'</small>':'')+'</span><input class="switch" type="checkbox" id="'+id+'" name="'+id+'" '+(on?'checked':'')+'></label>';
  const button = (label,action,id='',cls='second',extra='') => '<button type="button" class="'+cls+'" data-action="'+action+'" data-id="'+esc(id)+'" '+extra+'>'+label+'</button>';
  const row = (title, sub, right, action, id) => (action?'<button type="button" class="row" data-action="'+action+'" data-id="'+esc(id)+'">':'<div class="row">')+'<span class="l"><span>'+title+(sub?'<small>'+sub+'</small>':'')+'</span></span><span class="r">'+right+'</span>'+(action?'</button>':'</div>');
  const form = (action,html,submit='Зберегти') => '<form class="form" data-form="'+action+'">'+html+'<div class="error" id="form-error" role="alert"></div><button class="primary" type="submit">'+submit+'</button></form>';
  function persist(next) { E.project(next); store=next; try { localStorage.setItem(KEY,JSON.stringify(store)); storageWarning=''; } catch (_) { storageWarning='Не вдалося зберегти демо. Зміни доступні лише до закриття вкладки.'; } }
  function commit(event,msg) { persist(E.append(store,event)); toast=msg||'Збережено'; }
  function go(next, data={}, notice='') { route=next; params=data; toast=notice; overlay=null; if (['home','accounts','goals','forecast','more'].includes(next)) lastTab=next; render(); $('view').scrollTop=0; }
  function header(title, back) { return '<div class="head">'+(back?button(ic('left'),'go',back,'back','aria-label="Назад"'):'')+'<h1 tabindex="-1">'+title+'</h1></div>'; }
  function curCtl(codes=currencies, selected=store.currency, action='set-currency', label='Валюта підсумку') {
    if(!codes.length)return '';
    return '<details class="curctl"><summary class="cur-btn" aria-label="'+label+'">'+esc(selected?currencyMark(selected):'Усі')+ic('chev',16)+'</summary><div class="menu" role="menu">'+
      codes.map(c=>'<button type="button" role="menuitemradio" aria-checked="'+(selected===c)+'" data-action="'+action+'" data-id="'+esc(c)+'"><span>'+esc(c?currencyLabel(c):'Усі валюти')+'</span><span style="color:var(--muted)">'+esc(currencyMark(c))+'</span></button>').join('')+'</div></details>';
  }
  function usedCurrencies() {
    return [...new Set(p.accounts.filter(a=>!a.archived&&!a.deleted).flatMap(a=>Object.keys(a.balances)))];
  }
  function sizeClass(text,base) { return base+(String(text).length>11?' sm':''); }
  function allocation() {
    const groups=[['cash','Готівка','--p1'],['bank','Банки','--p2'],['biz','ФОП','--p3'],['dep','Депозити','--p4'],['savings','Ощадні рахунки','--g2'],['investment','Інвестиції','--g3'],['crypto','Крипта','--p5'],['other','Інше','--g4']];
    return groups.map(([type,name,color])=>({type,name,color,amount:p.accounts.filter(a=>!a.archived&&a.type===type).reduce((n,a)=>n+E.value(a.balances,store.rates),0)})).filter(g=>g.amount>0);
  }
  function allocationCard() { const total=E.total(p,store.rates), groups=allocation(); return '<div class="card"><div class="bar">'+groups.map(g=>'<span style="width:'+(total?g.amount/total*100:0)+'%;background:var('+g.color+')"></span>').join('')+'</div><div class="two" style="gap:10px 12px">'+groups.map(g=>'<div><div class="pl-n"><i style="background:var('+g.color+')"></i>'+g.name+'</div><div class="'+sizeClass(shown(g.amount),'pl-a')+'">'+shown(g.amount)+'</div></div>').join('')+'</div></div>'; }
  function fundsCard() { const total=E.total(p,store.rates), saved=E.pool(p,store.rates), free=total-saved, displayedFree=total===0?0:free, ratio=total?Math.max(0,Math.min(100,free/total*100)):0; return '<div class="card"><div class="bar"><span style="width:'+ratio+'%;background:var(--accent)"></span><span style="width:'+(100-ratio)+'%;background:var(--g3)"></span></div><div class="two"><div><div class="pl-n"><i style="background:var(--accent)"></i>Вільні гроші</div><div class="'+sizeClass(shown(displayedFree),'big-a')+(displayedFree<0?' negative':'')+'">'+shown(displayedFree)+'</div></div><div><div class="pl-n"><i style="background:var(--g3)"></i>Відкладено на цілі</div><div class="'+sizeClass(shown(saved),'big-a')+'">'+shown(saved)+'</div></div></div></div>'+(free<-.1?'<div class="warn">Нестача забезпечення цілей: '+shown(-free)+'. Перевірте захист або поверніть частину накопичень у вільні.</div>':''); }
  function summary() {
    const total=E.total(p,store.rates), text=shown(total); let change=0;
    p.history.filter(e=>!e.void&&!e.superseded&&e.date.slice(0,7)===store.date.slice(0,7)).forEach(e=>{if(e.type==='month'&&e.salary)change+=e.salary.amount*store.rates[e.salary.currency];else if(e.type==='transfer')change+=e.received*store.rates[e.toCurrency]-(e.amount+(e.fee||0))*store.rates[e.currency];else if(e.currency)change+=(e.delta||0)*store.rates[e.currency];});
    const line=Math.abs(change)>.1?'<div class="delta"'+(change<0?' style="color:var(--muted)"':'')+'>'+ic(change>=0?'up':'out',15)+(change>=0?'+':'−')+shown(Math.abs(change))+' за місяць</div>':'<div class="sub">За останніми записаними залишками</div>';
    return '<div><div class="hero-row"><span class="lbl">Загальний капітал</span>'+curCtl()+'</div><div class="total'+(text.length>13?' xs':text.length>10?' sm':'')+'">'+text+'</div>'+line+'</div>'+(p.goals.some(E.live)?fundsCard():'');
  }
  function accountCard(a, currency) {
    return '<div class="swipe-account" data-swipe-id="'+a.id+'"><button type="button" class="swipe-trash" data-action="delete-account-dialog" data-id="'+a.id+'" tabindex="-1" aria-hidden="true" aria-label="Видалити рахунок '+esc(a.name)+'"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg></button><button type="button" class="acc swipe-body" data-action="account" data-id="'+a.id+'"><span class="acc-top"><span class="acc-ico" style="background:var(--g'+a.color+')">'+ic(a.type in IC?a.type:'bank',24)+'</span><span class="acc-n"><b>'+esc(a.name)+'</b><small>'+names[a.type]+'</small></span><span class="acc-t">'+shown(E.value(a.balances,store.rates),currency)+'</span></span><span class="chips">'+Object.entries(a.balances).map(([c,n])=>'<span class="cc">'+money(n,c)+'</span>').join('')+'</span></button></div>';
  }
  function goalPalette(g) { const n={home:1,laptop:1,shoes:2,plane:3,shield:4,car:2}[g.icon]||1; return {ink:'var(--g'+n+')',tint:'var(--t'+n+')'}; }
  function goalCard(g,small) {
    const color=goalPalette(g);
    if (!E.live(g)) { const purchase=p.history.find(e=>!e.void&&e.type==='purchase'&&e.goalId===g.id); return '<button type="button" class="goal" data-action="goal" data-id="'+g.id+'"><span class="g-top"><span class="g-ico" style="background:'+color.tint+';color:'+color.ink+'">'+ic(g.icon,26)+'</span><span class="g-name"><b>'+esc(g.name)+'</b><small>'+(purchase?'Куплено за '+money(purchase.amount,purchase.currency):'Кошти повернуто у вільні')+'</small></span><span class="badge">Завершено</span></span></button>'; }
    const saved=E.saved(g,store.rates), percent=Math.min(100,Math.floor(saved/g.target*100)), plan=g.monthly?money(g.monthly,g.currency)+' щомісяця':'Внески вручну';
    return '<button type="button" class="goal'+(g.status==='paused'?' off':'')+'" data-action="goal" data-id="'+g.id+'"><span class="g-top"><span class="g-ico" style="background:'+color.tint+';color:'+color.ink+'">'+ic(g.icon,26)+'</span><span class="g-name"><b>'+esc(g.name)+(g.status==='paused'?' <span class="badge">на паузі</span>':'')+'</b><small>'+money(Math.round(saved),g.currency)+' з '+money(g.target,g.currency)+'</small></span><span class="g-pct" style="color:'+color.ink+'">'+percent+'%</span></span><span class="trk"><div class="bg"></div><div style="width:'+percent+'%;background:'+color.ink+'"></div></span><span class="g-bot"><span>'+(g.protected?'🔒 ':'')+(small?plan:'ще '+money(Math.max(0,Math.round(g.target-saved)),g.currency)+' · '+plan)+'</span><span class="when"><span style="color:'+color.ink+';display:flex">'+ic('cal',15)+'</span>'+etaText(g)+'</span></span></button>';
  }
  function etaText(g) { const months=E.eta(g,store.rates); if (!E.live(g)) return 'Завершено'; if (months===0) return 'Суму зібрано'; if (months===null) return g.status==='paused'?'На паузі':'Без прогнозу'; const d=new Date(store.date+'T12:00:00'); d.setDate(1); d.setMonth(d.getMonth()+months); return d.toLocaleDateString('uk-UA',{month:'short',year:'numeric'}); }
  function home() {
    const goals=p.goals.filter(E.live), active=goals.filter(g=>g.status==='active');
    return summary()+allocationCard()+(goals.length?'<div class="sec"><h2>Мої цілі</h2><span>'+active.length+' активні</span></div>'+goals.slice(0,2).map(g=>goalCard(g,true)).join('')+(goals.length>2?button('Усі цілі ('+goals.length+')','go','goals','second','style="min-height:46px"'):''):'');
  }
  function accounts() {
    const accounts=p.accounts.filter(a=>!a.archived&&!a.deleted);
    const codes=[...new Set(accounts.flatMap(a=>Object.keys(a.balances)))];
    const currency=codes.includes(store.currency)?store.currency:codes[0]||store.currency;
    return '<div class="hdr"><h1>Рахунки</h1>'+curCtl(codes,currency)+'</div><div class="card"><div class="pl-n">Усього на рахунках</div><div class="total sm" style="font-size:34px;margin-top:2px">'+shown(E.total(p,store.rates),currency)+'</div><div class="sub">'+accounts.length+' рахунків · '+codes.length+' валют</div></div>'+accounts.map(account=>accountCard(account,currency)).join('')+button('Додати рахунок','go','account-new','ghost')+(p.accounts.some(a=>a.archived&&!a.deleted)?'<div class="sec"><h2>Архів</h2></div><div class="list">'+p.accounts.filter(a=>a.archived&&!a.deleted).map(a=>row(esc(a.name),'Історія збережена','Відновити','restore-account',a.id)).join('')+'</div>':'')+(codes.length?'<p class="note">Валюта угорі змінює лише загальні суми. Баланси в кожній валюті лишаються як є, щоб було видно, що і в чому лежить.</p>':'');
  }
  const eventNames={expense:'Витрата',income:'Дохід','month-total':'Витрати за місяць',balance:'Оновлення залишку',transfer:'Переказ',contribute:'Внесок у ціль',purchase:'Покупка цілі',month:'Зарплата та внески','goal-create':'Нова ціль','goal-settings':'Налаштування цілі','goal-release':'Кошти звільнено','account-create':'Новий рахунок','salary-settings':'Розклад зарплати','account-settings':'Рахунок','account-remove':'Видалення рахунку'};
  const entryAccount = e => e.account || (e.type==='account-create'?e.accountData?.id:null);
  const initialAmounts = e => Object.entries(e.accountData?.balances||{});
  function historyRows(list,forGoal,accountId,historyCurrency='') { return list.length?'<div class="list history-list">'+list.slice().reverse().map(e=>{
    let title=esc(e.note||eventNames[e.type])+(e.void?' · скасовано':''), sub=dateLabel(e.date)+(e.month?' · '+monthLabel(e.month):''), right=e.currency&&e.amount!==undefined?money(e.type==='balance'?e.amount:(e.type==='income'?e.amount:-e.amount),e.currency):ic('right',18);
    if(e.type==='income'&&e.amount>0)right='+'+right;
    if(e.type==='expense'&&e.amount>0)right='−'+money(e.amount,e.currency);
    if(e.type==='account-create'){
      const balances=initialAmounts(e).filter(([c])=>!historyCurrency||c===historyCurrency);
      title=balances.length?'Початкові залишки':'Рахунок створено';
      if(!accountId)sub+=' · '+esc(e.accountData?.name||'');
      right=balances.map(([c,n])=>'<span class="initial-history-amount">'+money(n,c)+'</span>').join('');
    }
    if(e.type==='transfer'){
      const incoming=accountId===e.to;
      const other=aBy(incoming?e.account:e.to);
      if(e.account===e.to){
        title='Обмін валют';
        right='<span class="initial-history-amount">'+money(e.amount,e.currency)+'</span><span>→ '+money(e.received,e.toCurrency)+'</span>';
      } else {
        sub+=' · '+(incoming?'Звідки: ':'Куди: ')+esc(other?.name||'');
        right=incoming?money(e.received,e.toCurrency):money(e.amount,e.currency);
      }
    }
    if(e.type==='account-remove'){title=e.mode==='transfer'?'Переказ і видалення рахунку':'Рахунок видалено з обліку';sub+=' · '+esc(e.removedName||aBy(e.account)?.name||'');right=Object.entries(e.removedAmounts||{}).filter(([,n])=>n>0).map(([c,n])=>money(n,c)).join(' · ')||'0';}
    if(e.type==='balance'&&!e.void&&!e.asExpense){
      title='Залишок відредаговано';
      sub+=' · '+money(e.amount-e.delta,e.currency)+' → '+money(e.amount,e.currency);
      if(e.note)sub+=' · '+esc(e.note);
    }
    if(e.previousName!==undefined){
      title='Назву змінено';
      sub+=' · '+esc(e.previousName)+' → '+esc(e.changes.name);
    }
    if(e.revisions?.length) sub+=' · виправлено ('+e.revisions.length+')';
    if(e.type==='balance'&&e.estimatedExpense){title='Витрати за залишком';right='−'+money(e.estimatedExpense,e.currency);sub+=' · залишилось '+money(e.amount,e.currency);}
    if(forGoal){const share=e.cover?.find(r=>r.goal===forGoal);if(share){right=Object.entries(share.amounts).map(([c,n])=>'−'+money(n,c)).join(' + ');sub+=' · частина загальних витрат';}const c=e.contributions?.find(r=>r.goal===forGoal);if(c)right='+'+money(c.amount,c.currency);}
    return row(title,sub,right,['income','account-create'].includes(e.type)?null:'event',e.id);
  }).join('')+'</div>':'<div class="card"><p class="note">Операцій ще немає.</p></div>'; }
  function accountScreen() {
    const a=aBy(params.id); if(!a) return accounts(); if(a.deleted) return header(esc(a.name),'accounts')+'<div class="info">Рахунок видалено з обліку. Його історія збережена.</div>'+historyRows(p.history.filter(e=>entryAccount(e)===a.id||e.to===a.id),null,a.id); const selected=params.currency||'', filter=params.filter||'all';
    const all=p.history.filter(e=>entryAccount(e)===a.id||e.to===a.id||(e.type==='month'&&e.salary&&e.salary.account===a.id));
    const entryCurrencies = e => e.type==='transfer' ? (e.account===e.to?[e.currency,e.toCurrency]:[e.account===a.id?e.currency:e.toCurrency])
      : [e.currency,e.salary?.currency,...Object.keys(e.removedAmounts||{}),...initialAmounts(e).map(([c])=>c)].filter(Boolean);
    const historyCurrencies = [...new Set([...Object.keys(a.balances),...all.flatMap(entryCurrencies)])];
    const historyCurrency = params.historyCurrency || '';
    const accountCodes=Object.keys(a.balances);
    const summaryCodes=[...new Set([...accountCodes,...usedCurrencies(),store.currency,'UAH'])];
    const savedCurrency=store.accountSummaryCurrencies?.[a.id];
    const summaryCurrency=summaryCodes.includes(savedCurrency)?savedCurrency:
      accountCodes.includes(store.currency)?store.currency:accountCodes[0]||store.currency;
    const list=all.filter(e=>!historyCurrency||entryCurrencies(e).includes(historyCurrency)).filter(e=>filter==='all'||(filter==='income'&&(e.type==='income'||e.salary))||(filter==='expense'&&(['expense','month-total','purchase'].includes(e.type)||e.estimatedExpense))||(filter==='transfer'&&e.type==='transfer'));
    return '<div class="head">'+button(ic('left'),'go','accounts','back','aria-label="Назад"')+'<h1>'+esc(a.name)+'</h1>'+button(ic('dots'),'account-menu',a.id,'iconbtn','aria-label="Дії з рахунком"')+'</div><div><div class="sub" style="margin:0">'+names[a.type]+'</div><div class="account-total"><div class="total sm" style="font-size:36px">'+shown(E.value(a.balances,store.rates),summaryCurrency)+'</div>'+curCtl(summaryCodes,summaryCurrency,'account-summary-currency')+'</div></div><div class="bal" role="group" aria-label="Баланси за валютами">'+Object.entries(a.balances).map(([c,n])=>'<button type="button" data-action="account-currency" data-id="'+c+'" aria-pressed="'+(selected===c)+'"><small>'+c+'</small><b>'+money(n,c)+'</b></button>').join('')+'</div><div class="qa" style="grid-template-columns:repeat(4,minmax(0,1fr))">'+button(ic('plus')+'Додати','income',a.id,'','data-currency="'+selected+'"')+button(ic('subm')+'Зняти','quick',a.id,'','data-currency="'+selected+'"')+button(ic('swap')+'Переказати','transfer',a.id,'','data-currency="'+selected+'"')+button(ic('pencil')+'Редагувати','edit-balance',a.id,'','data-currency="'+selected+'"')+'</div><div class="sec"><h2>Історія операцій</h2>'+curCtl(['',...historyCurrencies],historyCurrency,'history-currency','Валюта операцій')+'</div>'+'<div class="scroll-x" role="group" aria-label="Фільтр операцій">'+[['all','Усі'],['income','Додано'],['expense','Знято'],['transfer','Перекази']].map(([id,n])=>button(n,'account-filter',id,'pill','aria-pressed="'+(filter===id)+'"')).join('')+'</div>'+historyRows(list,null,a.id,historyCurrency)+'<p class="note">'+(a.checked?'Залишок звірено '+dateLabel(a.checked)+'. ':'')+'Історія лише для перегляду.</p>';
  }
  function accountMenu() {
    const a=aBy(params.id);
    const schedules=p.history.filter(e=>e.type==='income'&&e.account===a.id&&e.repeat&&!e.void&&!store.stoppedIncome?.includes(e.id));
    const repeating=schedules.length?'<div class="sec"><h2>Регулярні надходження</h2></div><div class="list">'+
      schedules.map(e=>row(esc(e.note)+' · '+money(e.amount,e.currency),
        e.repeat.interval==='custom'?'Інтервал: '+e.repeat.days+' дн.':incomeRepeats[e.repeat.interval],'Вимкнути','stop-income-repeat',e.id)).join('')+'</div>':'';
    return header(esc(a.name),'account')+'<div class="list">'+row('Перейменувати','',ic('right',18),'rename-account',a.id)+
      row('<span class="danger">Видалити рахунок</span>','Переказати гроші або прибрати суму з обліку',ic('right',18),'delete-account-dialog',a.id)+'</div>'+repeating;
  }
  function quickScreen() { return movementScreen('quick'); }
  function quickPayload() {
    const currency = val('q-currency');
    if (!currency) throw new Error('Виберіть валюту.');
    return {account:params.id,currency,type:'expense',standalone:true,amount:movementAmount('q'),note:val('q-note').trim()};
  }
  function previewQuick() {
    const preview = $('quick-preview');
    const currency = val('q-currency');
    if (!preview) return;
    const value = spendingInput('q',currency);
    if (!currency || !value) { preview.innerHTML=''; return; }
    preview.innerHTML = '<div class="pv"><div class="r2"><span>Залишиться на рахунку</span><b>'+
      money(aBy(params.id).balances[currency]-value,currency)+'</b></div><div class="r2"><span>Спишеться</span><b>'+
      money(value,currency)+'</b></div></div>';
  }
  function coverText(records) { return records.map(r=>'<div class="r2"><span>Із цілі «'+esc(gBy(r.goal)?.name||r.goal)+'»</span><b>'+Object.entries(r.amounts).map(([c,n])=>money(n,c)).join(' + ')+'</b></div>').join(''); }
  function currencyPicker(id, codes, selected, label='Валюта', searchable=false, existing=[]) {
    const quickChoices=searchable?existing:codes;
    return movementPicker(id,codes,selected,label,'Виберіть валюту',currencyLabel,searchable,existing)+
      (quickChoices.length?'<div class="quick-currencies" role="group" aria-label="Швидкий вибір: '+label+'">'+
        quickChoices.map(code=>button(esc(code),'pick-movement-currency',code,'pill',
          'data-field="'+id+'" data-quick-currency aria-pressed="'+(code===selected)+'"')).join('')+'</div>':'');
  }
  function movementPicker(id, codes, selected, label, placeholder, itemLabel, searchable=false, existing=[]) {
    const title = selected ? itemLabel(selected) : placeholder;
    const renderItems = list => list.map(code => button(esc(itemLabel(code)),'pick-movement-currency',code,'currency-item',
      'data-field="'+id+'" aria-pressed="'+(code===selected)+'"')).join('');
    const group = (list, name) => list.length ?
      '<div class="currency-group" role="group" aria-label="'+name+'"><div class="currency-group-title" aria-hidden="true">'+name+'</div>'+renderItems(list)+'</div>' : '';
    const onAccount = new Set(existing);
    const items = onAccount.size ?
      group(codes.filter(code=>onAccount.has(code)),'На цьому рахунку')+
      group(codes.filter(code=>!onAccount.has(code)),'Інші валюти') : renderItems(codes);
    return '<div class="fld"><span class="currency-caption" id="'+id+'-label">'+label+'</span>'+
      '<input type="hidden" id="'+id+'" value="'+esc(selected||'')+'">'+
      '<details class="movement-picker"><summary class="inp" id="'+id+'-control" aria-labelledby="'+id+'-label '+id+'-control">'+
      '<span>'+esc(title)+'</span>'+ic('chev',16)+'</summary><div class="picker-panel">'+
      (searchable?'<input type="search" class="inp currency-search" placeholder="Назва або код, наприклад EUR" aria-label="Пошук валют">':'')+
      '<div class="currency-options">'+items+(searchable?'<p class="note currency-no-results" hidden>Валют не знайдено.</p>':'')+'</div></div></details></div>';
  }
  function editBalanceScreen() {
    const account = aBy(params.id), currency = params.currency || '';
    if (!Object.keys(account.balances).length) return header('Редагувати залишок','account')+
      '<p class="info">На рахунку ще немає валют. Додайте перший залишок.</p>'+
      button('Додати гроші','income',params.id,'primary');
    return header('Редагувати залишок','account')+form('edit-balance',
      currencyPicker('edit-currency',Object.keys(account.balances),currency)+
      '<p class="note current-balance" id="edit-current" aria-live="polite">'+(currency?'На рахунку: '+money(account.balances[currency],currency):'')+'</p>'+
      field('edit-amount','Новий залишок','','text','inputmode="decimal" placeholder="Скільки залишилося?"')+
      commentField('edit-note','Наприклад, звірила залишок із банком'));
  }
  function commentField(id,placeholder,suggestions=[]) {
    return '<div class="fld"><label for="'+id+'">Коментар (необов’язково)</label>'+
      '<textarea class="inp movement-comment" id="'+id+'" maxlength="50" rows="3" placeholder="'+esc(placeholder)+'" aria-describedby="'+id+'-count"></textarea>'+
      '<small class="comment-count" id="'+id+'-count">0 / 50</small>'+
      (suggestions.length?'<div class="quick-comments" role="group" aria-label="Швидкий коментар">'+
        suggestions.map(note=>button(esc(note),'quick-comment',id,'pill','data-note="'+esc(note)+'"')).join('')+'</div>':'')+'</div>';
  }
  function incomeScreen() { return movementScreen('income'); }
  function movementScreen(type) {
    const adding = type==='income', prefix = adding?'i':'q';
    const existing = Object.keys(aBy(params.id).balances);
    const codes = adding?currencies:existing;
    if (!codes.length) return header('Зняти гроші','account')+
      '<p class="info">На рахунку ще немає залишків. Спочатку додайте гроші.</p>'+
      button('Додати гроші','income',params.id,'primary');
    return header(adding?'Додати гроші':'Зняти гроші','account')+form(type,
      currencyPicker(prefix+'-currency',codes,params.currency,'Валюта',adding,adding?existing:[])+
      '<p class="field-hint" id="'+prefix+'-currency-control-error"></p>'+
      (adding?'':'<p class="note current-balance" id="q-current" aria-live="polite"></p>')+
      field(prefix+'-amount','Сума','','text','inputmode="numeric" enterkeyhint="done" data-integer')+
      '<p class="field-hint" id="'+prefix+'-amount-error" aria-live="polite"></p>'+
      (adding?'':'<div id="quick-preview"></div>')+
      commentField(prefix+'-note',adding?'Наприклад, подарунок на день народження':'Наприклад, покупки в магазині',
        adding?['Зарплата','Оренда','Подарунок','Підробіток']:['Продукти','Транспорт','Кафе'])+
      (adding?incomeRepeatFields():''));
  }
  const incomeRepeats={none:'Не повторювати',daily:'Щодня',weekly:'Щотижня',monthly:'Щомісяця',custom:'Свій інтервал'};
  function incomeRepeatFields() {
    return movementPicker('i-repeat',Object.keys(incomeRepeats),'none','Повторення','Не повторювати',id=>incomeRepeats[id])+
      '<div id="i-repeat-custom" hidden>'+field('i-repeat-days','Повторювати кожні … днів','','text','inputmode="numeric" placeholder="Наприклад, 14" maxlength="4"')+'</div>';
  }
  function incomeRepeat() {
    const interval=val('i-repeat');
    if(!interval||interval==='none')return null;
    const days=Number(val('i-repeat-days'));
    if(interval==='custom'&&(!/^[0-9]+$/.test(val('i-repeat-days'))||days<1||days>3650))
      throw new Error('Вкажіть інтервал від 1 до 3650 днів.');
    return interval==='custom'?{interval,days}:{interval};
  }
  function repeatDate(origin,index,repeat) {
    const date=new Date(origin+'T00:00:00Z');
    if(repeat.interval==='monthly'){
      const day=date.getUTCDate();
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth()+index);
      const end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
      date.setUTCDate(Math.min(day,end));
    } else {
      const days=repeat.interval==='daily'?1:repeat.interval==='weekly'?7:repeat.days;
      date.setUTCDate(date.getUTCDate()+index*days);
    }
    return date.toISOString().slice(0,10);
  }
  function applyDueIncome() {
    const cutoff=today()>store.date?today():store.date;
    const active=new Set(E.project(store).accounts.filter(a=>!a.archived&&!a.deleted).map(a=>a.id));
    const lastIndex=new Map();
    for(const event of store.events){
      if(event.repeatOf)lastIndex.set(event.repeatOf,Math.max(lastIndex.get(event.repeatOf)||0,event.repeatIndex));
    }
    const due=[];
    for(const event of store.events){
      if(event.type!=='income'||event.void||!event.repeat||!active.has(event.account)||store.stoppedIncome?.includes(event.id))continue;
      for(let index=(lastIndex.get(event.id)||0)+1;;index++){
        const date=repeatDate(event.date,index,event.repeat);
        if(date>cutoff)break;
        due.push({type:'income',date,account:event.account,currency:event.currency,amount:event.amount,note:event.note,repeatOf:event.id,repeatIndex:index});
      }
    }
    if(!due.length)return;
    const next=due.sort((a,b)=>a.date.localeCompare(b.date)).reduce((current,event)=>E.append(current,event),store);
    persist(next);
  }
  function movementAmount(prefix) {
    if (!val(prefix+'-amount').trim()) throw new Error('Введіть суму.');
    const value = amount(val(prefix+'-amount'));
    if (!value) throw new Error('Введіть суму більше нуля.');
    return value;
  }
  function validateMovement(prefix) {
    const currency = $(prefix+'-currency-control'), input = $(prefix+'-amount');
    let amountError = '';
    try { movementAmount(prefix); } catch (error) { amountError=error.message; }
    const errors = [[currency,val(prefix+'-currency')?'':'Виберіть валюту.'],[input,amountError]];
    for (const [control,message] of errors) {
      $(control.id+'-error').textContent=message;
      control.setAttribute('aria-invalid',String(Boolean(message)));
      control.setAttribute('aria-describedby',control.id+'-error');
    }
    const first = errors.find(([,message]) => message);
    if (first) first[0].focus();
    return !first;
  }
  function transferScreen() {
    const source = aBy(params.id);
    if (!Object.keys(source.balances).length) return header('Переказати гроші','account')+
      '<p class="info">На рахунку ще немає залишків. Спочатку додайте гроші.</p>'+
      button('Додати гроші','income',source.id,'primary');
    const destinations = p.accounts.filter(account => !account.archived&&!account.deleted);
    const receivingCurrencies=[...new Set([...usedCurrencies(),store.currency,'UAH'])];
    return header('Переказати гроші','account')+form('transfer',
      '<section class="card transfer-block"><h2>Звідки</h2><strong class="transfer-source">'+esc(source.name)+'</strong>'+
      currencyPicker('x-currency',Object.keys(source.balances),params.currency,'Валюта відправлення')+
      '<p class="note current-balance" id="x-current" aria-live="polite"></p>'+
      field('x-amount','Надіслала','','text','inputmode="decimal"')+
      '<p class="field-hint" id="x-amount-error" aria-live="polite"></p></section>'+
      '<section class="card transfer-block"><h2>Куди</h2>'+
      movementPicker('x-to',destinations.map(account=>account.id),'','Рахунок отримання','Виберіть рахунок',id=>aBy(id).name+(id===source.id?' (цей рахунок)':''))+
      currencyPicker('x-to-currency',receivingCurrencies,params.currency,'Валюта отримання')+
      field('x-received','Отримала','','text','inputmode="decimal"')+
      '<p class="note" id="transfer-rate" aria-live="polite"></p><p class="field-hint" id="transfer-destination-error" aria-live="polite"></p></section>'+
      field('x-fee','Комісія у валюті відправлення (необов’язково)','','text','inputmode="decimal" placeholder="0"')+
      '<p class="field-hint" id="x-fee-error" aria-live="polite"></p>',
      'Зберегти переказ');
  }
  function conversionText(from,to,sent,received) {
    if (from===to || !sent || !received) return '';
    const rate = (received/sent).toLocaleString('uk-UA',{maximumSignificantDigits:8});
    return '1 '+from+' = '+rate+' '+to;
  }
  function transferDetails(entry) {
    const rate = conversionText(entry.currency,entry.toCurrency,entry.amount,entry.received);
    return header(entry.account===entry.to?'Обмін валют':'Переказ','account')+'<p class="note">'+dateLabel(entry.date)+'</p><div class="pv">'+
      '<div class="r2"><span>Звідки</span><b>'+esc(aBy(entry.account)?.name||'')+'</b></div>'+
      '<div class="r2"><span>Надіслано</span><b>'+money(entry.amount,entry.currency)+'</b></div>'+
      '<div class="r2"><span>Куди</span><b>'+esc(aBy(entry.to)?.name||'')+'</b></div>'+
      '<div class="r2"><span>Отримано</span><b>'+money(entry.received,entry.toCurrency)+'</b></div>'+
      (rate?'<div class="r2"><span>Конвертація</span><b>'+esc(rate)+'</b></div>':'')+
      '<div class="r2"><span>Комісія</span><b>'+money(entry.fee||0,entry.currency)+'</b></div></div>'+
      (entry.void?'<p class="note">Операцію скасовано.</p>':'');
  }
  function catShelf() { return p.cats.length?'<button type="button" class="shelf" data-action="go" data-id="cats" aria-label="Колекція котиків"><span class="minis">'+p.cats.slice(-4).map(id=>'<span class="mini">'+catSvg(id,'24 12 112 112')+'</span>').join('')+'</span><span style="flex:1;min-width:0"><b>Мої коти</b><small>'+p.cats.length+' друзів оселилось</small></span>'+ic('right',18,'var(--muted)')+'</button>':''; }
  function goals() {
    const goals=p.goals.filter(E.live), finished=p.goals.filter(g=>!E.live(g)), active=goals.filter(g=>g.status==='active'), monthly=active.reduce((n,g)=>n+g.monthly*store.rates[g.currency],0);
    return '<div class="hdr"><h1>Цілі</h1>'+curCtl()+'</div>'+catShelf()+'<div class="card"><div class="two"><div><div class="pl-n"><i style="background:var(--g3)"></i>Відкладено</div><div class="'+sizeClass(shown(E.pool(p,store.rates)),'big-a')+'">'+shown(E.pool(p,store.rates))+'</div></div><div><div class="pl-n"><i style="background:var(--accent)"></i>Вільні гроші</div><div class="'+sizeClass(shown(E.free(p,store.rates)),'big-a')+'">'+shown(E.free(p,store.rates))+'</div></div><div><div class="pl-n">Активних цілей</div><div class="big-a">'+active.length+'</div></div><div><div class="pl-n">Планово на місяць</div><div class="'+sizeClass(shown(monthly),'big-a')+'">'+shown(monthly)+'</div></div></div></div>'+goals.map(g=>goalCard(g,false)).join('')+button('Нова ціль','go','goal-new','ghost')+(finished.length?'<div class="sec"><h2>Завершені</h2></div><div class="list">'+finished.map(g=>row(esc(g.name),g.status==='done'?'Покупку записано':'Кошти повернуто у вільні',ic('right',18),'goal',g.id)).join('')+'</div>':'')+'<p class="note">Валюта угорі змінює лише підсумки. Кожна ціль лишається у своїй валюті.</p>';
  }
  function goalScreen() {
    const g=gBy(params.id);if(!g)return goals();const color=goalPalette(g), saved=E.saved(g,store.rates), percent=Math.min(100,Math.floor(saved/g.target*100));
    const history=p.history.filter(e=>e.goalId===g.id||e.goal?.id===g.id||e.cover?.some(r=>r.goal===g.id)||e.contributions?.some(r=>r.goal===g.id));
    return header(esc(g.name),'goals')+(E.live(g)?'<div class="card"><div class="g-top"><span class="g-ico" style="background:'+color.tint+';color:'+color.ink+'">'+ic(g.icon,26)+'</span><span class="g-name"><b style="font-size:24px;font-weight:600">'+money(Math.round(saved),g.currency)+'</b><small>з '+money(g.target,g.currency)+'</small></span><span class="g-pct" style="color:'+color.ink+'">'+percent+'%</span></div><span class="trk"><div class="bg"></div><div style="width:'+percent+'%;background:'+color.ink+'"></div></span></div><div class="pv"><div class="r2"><span>Залишилось</span><b>'+money(Math.max(0,Math.round(g.target-saved)),g.currency)+'</b></div><div class="r2"><span>Відкладаю</span><b>'+(g.monthly?money(g.monthly,g.currency)+' щомісяця':'Вручну')+'</b></div><div class="r2"><span>Орієнтовна дата</span><b>'+etaText(g)+'</b></div>'+Object.entries(g.holdings).filter(([c,n])=>c!==g.currency&&n>0).map(([c,n])=>'<div class="r2"><span>Фактично відкладено</span><b>'+money(n,c)+'</b></div>').join('')+'</div><div class="opt">'+toggle('goal-auto','Відкладати автоматично',g.auto,'Рахунки й капітал не змінюються')+'</div><div class="opt">'+toggle('goal-protected','Не використовувати на інші витрати',g.protected,'Захищає накопичення цієї цілі')+'</div><div class="two">'+button('Внесок','contribute',g.id)+button('Редагувати','edit-goal',g.id)+button(g.status==='paused'?'Відновити':'Пауза','pause-goal',g.id)+button('Зняти всі накопичення','release-goal',g.id)+'</div>'+button('Купити / завершити','purchase',g.id,'primary'):goalCard(g)+'<div class="info">'+(g.status==='done'?'Покупку записано. Невитрачений залишок вільний.':'Ціль закрито, гроші залишилися на рахунках.')+'</div>')+'<div class="sec"><h2>Історія</h2><span>'+history.length+'</span></div>'+historyRows(history,g.id)+'<p class="note">Прогноз за поточним курсом та внеском. Зміна курсу не обмінює ваші гроші.</p>';
  }
  function goalForm() {
    const g=params.id?gBy(params.id):null;
    return header(g?'Редагувати ціль':'Нова ціль',g?'goal':'goals')+form('goal-save',field('g-name','Назва',g?.name||'','text','required maxlength="60"')+select('g-icon','Значок',options(['home','laptop','plane','car','shield','shoes'],g?.icon||'home',x=>({home:'Дім',laptop:'Ноутбук',plane:'Подорож',car:'Авто',shield:'Резерв',shoes:'Покупка'}[x])))+select('g-currency','Валюта ціни',options(currencies,g?.currency||store.currency))+field('g-target','Потрібна сума',g?g.target/100:'','text','inputmode="decimal" required')+field('g-monthly','Плановий внесок на місяць',g?g.monthly/100:0,'text','inputmode="decimal"')+toggle('g-auto','Відкладати автоматично',g?g.auto:true,'Можна вимкнути та вносити вручну')+'<div class="info" id="goal-preview">Введіть суму й внесок — покажемо орієнтовний строк.</div>');
  }
  function contributeScreen() {const g=gBy(params.id);return header('Внести в ціль','goal')+'<p class="note">'+esc(g.name)+' · вільно '+shown(E.free(p,store.rates))+'</p>'+form('contribute',select('c-currency','Валюта ваших грошей',options(currencies,g.currency))+field('c-amount','Внести','','text','inputmode="decimal" required')+'<div class="info">Гроші залишаються на рахунках. Внесок лише позначає їх як відкладені. Більше потрібної суми не резервуємо.</div>');}
  function purchaseScreen() { const g=gBy(params.id), acc=p.accounts.filter(a=>!a.archived);return header('Купити: '+esc(g.name),'goal')+form('purchase',field('b-price','Фактично сплачена сума',g.target/100,'text','inputmode="decimal" required')+select('b-currency','Валюта платежу',options(currencies,g.currency))+select('b-account','Рахунок оплати',options(acc,acc.find(a=>Object.keys(a.balances).includes(g.currency))?.id||acc[0].id,a=>a.name))+'<div class="pv" id="purchase-preview"></div><div class="info">Запишемо одну витрату та завершимо ціль. Невикористані накопичення стануть вільними. Якщо ціна більша за накопичене, решта береться з вільних.</div>','Записати покупку');}
  function editHistory(event) {
    if (!event.revisions?.length) return '';
    return '<div class="sec"><h2>Історія виправлень</h2></div><div class="card">'+
      event.revisions.map(revision => '<p class="note">'+dateLabel(revision.date)+
        (revision.before.amount !== undefined ? ' · '+money(revision.before.amount,event.currency)+' → '+money(revision.after.amount,event.currency) : '')+
        (revision.before.note !== undefined ? ' · Опис: '+esc(revision.before.note||'—')+' → '+esc(revision.after.note||'—') : '')+
        '</p>').join('')+'</div>';
  }
  function eventScreen() {
    const e=p.history.find(x=>x.id===params.id);if(!e)return header('Історія','more');
    if(e.type==='transfer')return transferDetails(e);
    if(e.type==='balance'&&!e.asExpense&&!e.void){
      return header('Залишок відредаговано','account')+
        '<p class="note">'+dateLabel(e.date)+' · '+esc(aBy(e.account)?.name||'')+'</p>'+
        '<div class="pv"><div class="r2"><span>Було</span><b>'+money(e.amount-e.delta,e.currency)+'</b></div>'+
        '<div class="r2"><span>Стало</span><b>'+money(e.amount,e.currency)+'</b></div></div>'+
        (e.note?'<div class="card"><div class="pl-n">Коментар</div><p class="note">'+esc(e.note)+'</p></div>':'');
    }
    return header(esc(e.note||eventNames[e.type]),e.account?'account':'more')+'<p class="note">'+dateLabel(e.date)+(e.account?' · '+esc(aBy(e.account)?.name||''):'')+'</p><div class="pv">'+(e.currency&&e.amount!==undefined?'<div class="r2"><span>'+ (e.type==='balance'?'Фактичний залишок':e.type==='month-total'?'Усього за місяць':'Сума')+'</span><b>'+money(e.amount,e.currency)+'</b></div>':'')+(e.estimatedExpense?'<div class="r2"><span>Витрати за залишком</span><b>−'+money(e.estimatedExpense,e.currency)+'</b></div>':'')+(e.effective!==undefined?'<div class="r2"><span>Окремі покупки вже враховано</span><b>'+money(e.detail,e.currency)+'</b></div><div class="r2"><span>Додано до витрат</span><b>'+money(e.effective,e.currency)+'</b></div>':'')+coverText(e.cover||[])+(e.salary?'<div class="r2"><span>Зарплата</span><b>'+money(e.salary.amount,e.salary.currency)+'</b></div>':'')+(e.contributions||[]).map(c=>'<div class="r2"><span>'+esc(gBy(c.goal)?.name||c.goal)+'</span><b>'+money(c.amount,c.currency)+'</b></div>').join('')+'</div>'+(e.type==='account-remove'?'<div class="info">'+(e.mode==='transfer'?'Усі валютні залишки перенесено на «'+esc(e.destinationName||aBy(e.to)?.name||'')+'». Загальна сума не змінилась.':'Залишки прибрано із загальної суми. Це не витрата, накопичення цілей не змінено.')+(e.salaryRedirected?'<br>Майбутню зарплату спрямовано на рахунок отримання.':e.salaryDisabled?'<br>Автоматичну зарплату для видаленого рахунку вимкнено.':'')+'</div>':'')+(e.void?'<div class="warn">Операцію скасовано. Ефекти перераховано.</div>':'')+(e.superseded?'<div class="info">Пізніший запис замінив цей підсумок. Повторного списання немає.</div>':'')+editHistory(e);
  }
  function forecast() {
    const monthly=p.salary?.auto?p.salary.amount*store.rates[p.salary.currency]:0, planValue=(store.expensePlan||0)*store.rates[store.expensePlanCurrency||store.currency], exp=Math.round(planValue/store.rates[store.currency]), current=E.total(p,store.rates), target=current+period*(monthly-planValue);
    const W=354,H=170,L=8,R=8,T=14,B=22, values=Array.from({length:period+1},(_,m)=>current+m*(monthly-planValue)), lo=Math.min(...values),hi=Math.max(...values),padding=(hi-lo)*.1||100, min=lo-padding,max=hi+padding;
    const X=m=>L+m/period*(W-L-R),Y=n=>T+(1-(n-min)/(max-min))*(H-T-B),path=values.map((n,m)=>(m?'L':'M')+X(m).toFixed(1)+' '+Y(n).toFixed(1)).join(' ');
    const svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Прогноз капіталу на '+period+' місяців: '+esc(shown(target))+'"><line x1="'+X(0)+'" x2="'+X(0)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--line)"/><path d="'+path+'" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-dasharray="5 5" stroke-linecap="round"/><circle cx="'+X(0)+'" cy="'+Y(current)+'" r="4" fill="var(--ink)"/><text x="'+X(0)+'" y="'+(H-6)+'" font-size="10" fill="var(--muted)" text-anchor="start">зараз</text><text x="'+(W-R)+'" y="'+(H-6)+'" font-size="10" fill="var(--muted)" text-anchor="end">+'+period+' міс.</text></svg>';
    return header('Прогноз')+'<div class="seg">'+[1,3,6,12].map(n=>button(n+' міс.','period',n,'','aria-pressed="'+(period===n)+'"')).join('')+'</div><div class="chart">'+svg+'<div class="legend"><span><i style="border-color:var(--ink)"></i>зараз</span><span><i style="border-color:var(--accent);border-top-style:dashed"></i>прогноз</span></div></div><div class="pv"><div class="r2"><span>Зараз (факт)</span><b>'+shown(current)+'</b></div><div class="r2"><span>Через '+period+' міс. (прогноз)</span><b>'+shown(target)+'</b></div><div class="r2"><span>Плановий дохід на місяць</span><b>'+shown(monthly)+'</b></div></div>'+form('expense-plan',field('f-plan','Планові витрати на місяць, '+store.currency,exp/100,'text','inputmode="decimal"'),'Оновити прогноз')+'<p class="note">Оцінка за незмінних курсів та плану. Внески в цілі капітал не зменшують. Це оцінка, а не гарантія.</p>';
  }
  function salaryScreen() { const s=p.salary||{account:p.accounts[0].id,currency:'USD',amount:0,day:5,auto:false};return header('Зарплата','more')+form('salary',select('s-account','Куди надходить',options(p.accounts.filter(a=>!a.archived),s.account,a=>a.name))+select('s-currency','Валюта',options(currencies,s.currency))+field('s-amount','Сума на місяць',s.amount/100,'text','inputmode="decimal" required')+field('s-day','Число місяця',s.day,'number','min="1" max="28" required')+toggle('s-auto','Зараховувати автоматично',s.auto,'Для прототипу — один раз за кожен демо-місяць')+'<p class="note">Зміни діють на наступні нарахування. Демо не перевіряє фактичне надходження в банку.</p>');}
  let nextBalanceRow = 1;
  function initialBalanceRow(index) {
    return '<section class="card initial-balance" data-balance-row="'+index+'">'+
      currencyPicker('a-currency-'+index,currencies,'','Валюта',true)+
      button('×','remove-initial-balance',index,'iconbtn remove-balance','aria-label="Прибрати валюту"')+
      field('a-amount-'+index,'Початковий залишок','','text','inputmode="decimal" placeholder="0"')+'</section>';
  }
  function accountForm() {
    nextBalanceRow=1;
    return header('Новий рахунок','accounts')+form('account-create',
      movementPicker('a-type',types,'cash','Тип рахунку','Виберіть тип',type=>names[type])+
      field('a-name','Назва рахунку (необов’язково)','','text','maxlength="60" placeholder="Наприклад, Гаманець"')+
      '<div class="sec"><h2>Початкові залишки</h2></div>'+
      '<div class="initial-balances" id="initial-balances">'+initialBalanceRow(0)+'</div>'+
      button('＋ Додати валюту','add-initial-balance','','second'));
  }
  function initialBalances() {
    const balances = {};
    const rows = $('initial-balances').querySelectorAll('[data-balance-row]');
    for (const [position,row] of Array.from(rows).entries()) {
      const index = row.dataset.balanceRow;
      const currency = val('a-currency-'+index);
      const value = val('a-amount-'+index).trim();
      if (!currency && !value) continue;
      if (!currencies.includes(currency)) throw new Error('Виберіть валюту для суми в рядку '+(position+1)+'.');
      if (Object.hasOwn(balances,currency)) throw new Error('Валюта '+currency+' вже є. Вкажіть її залишок одним рядком.');
      balances[currency] = amount(value||'0');
    }
    return balances;
  }
  function refreshInitialBalanceOptions() {
    const rows = Array.from($('initial-balances').querySelectorAll('[data-balance-row]'));
    const selected = new Set(rows.map(row=>val('a-currency-'+row.dataset.balanceRow)));
    for (const row of rows) {
      const current = val('a-currency-'+row.dataset.balanceRow);
      row.querySelector('.remove-balance').setAttribute('aria-label',current?'Прибрати рядок '+current:'Прибрати рядок валюти');
      for (const option of row.querySelectorAll('.currency-item')) {
        option.disabled=selected.has(option.dataset.id)&&option.dataset.id!==current;
      }
    }
  }
  function validateAccountName(name, ownId) {
    const key = text => text.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('uk-UA');
    if (p.accounts.some(account => !account.deleted && account.id !== ownId && key(account.name) === key(name))) {
      throw new Error('Рахунок із такою назвою вже є. Вкажіть іншу назву.');
    }
  }
  function groupAmount(input) {
    const raw = input.value;
    const clean = text => text.replace(/\s/g,'');
    const plain = clean(raw);
    const pattern = input.hasAttribute('data-integer') ? /^\d*$/ : /^(?:\d+(?:[,.]\d{0,2})?)?$/;
    if (!pattern.test(plain)) {
      input.value = input.dataset.lastValidAmount || '';
      return;
    }
    const formatted = plain.replace(/^\d+/, digits => digits.replace(/\B(?=(\d{3})+(?!\d))/g,' '));
    input.dataset.lastValidAmount = formatted;
    if (formatted === raw) return;
    const position = input.selectionStart;
    const digitsBeforeCaret = position === null ? plain.length : clean(raw.slice(0,position)).length;
    input.value = formatted;
    if (position === null) return;
    let end = 0, count = 0;
    while (end < formatted.length && count < digitsBeforeCaret) {
      if (formatted[end] !== ' ') count++;
      end++;
    }
    input.setSelectionRange(end,end);
  }
  function refreshMoneyFields() {
    const fixed = {'f-plan':store.currency};
    const selects = {'q-amount':'q-currency','edit-amount':'edit-currency','a-amount':'a-currency','i-amount':'i-currency','x-amount':'x-currency','x-fee':'x-currency','x-received':'x-to-currency','g-target':'g-currency','g-monthly':'g-currency','c-amount':'c-currency','b-price':'b-currency','s-amount':'s-currency'};
    for (const input of $('view').querySelectorAll('input[inputmode="decimal"], input[data-integer]')) {
      const currency = fixed[input.id] || val(selects[input.id] || input.id.replace(/^a-amount-(?=\d+$)/,'a-currency-'));
      let suffix = input.nextElementSibling;
      if (!suffix?.classList.contains('money-suffix')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'money-input';
        input.before(wrapper);
        wrapper.append(input);
        suffix = document.createElement('span');
        suffix.className = 'money-suffix';
        suffix.setAttribute('aria-hidden','true');
        wrapper.append(suffix);
      }
      suffix.textContent = currencyMark(currency);
      groupAmount(input);
    }
  }
  function more() {
    const looks=[['a','А · Синій',['#1F4DB8','#4C74D2','#7FA0E3']],['b','Б · Ніч',['#7FB2FF','#5E8FD6','#335185']],['c','В · Графіт',['#2B2B2B','#8A8885','#1F6F5E']]];
    return header('Ще')+'<div class="sec"><h2>Основна валюта</h2></div><div class="chips">'+[...new Set(['UAH','USD','EUR','GBP',store.currency])].map(c=>button(({USD:'Долар',EUR:'Євро',UAH:'Гривня',GBP:'Фунт'}[c]||currencyName(c))+' '+currencyMark(c),'set-currency',c,'pill','aria-pressed="'+(store.currency===c)+'"')).join('')+'</div><p class="note">Вона підставляється за замовчуванням у нові цілі та використовується для підсумків.</p><div class="list">'+row('Дохід і витрати','Зарплата та щомісячний план',ic('right',18),'go','salary')+row('Курси валют','',ic('right',18),'go','rates')+row('Історія операцій','',ic('right',18),'go','history')+row('Колекція котів','',ic('right',18),'go','cats')+'</div><div class="sec"><h2>Вигляд</h2></div><div class="looks">'+looks.map(([id,n,colors])=>button('<span>'+n+'</span><span class="sws">'+colors.map(c=>'<i style="background:'+c+'"></i>').join('')+'</span>','look',id,'look','aria-pressed="'+(store.look===id)+'"')).join('')+'</div><div class="sec"><h2>Анімації</h2></div><div class="opt">'+toggle('calm-mode','Без руху',store.calm,'Показує зміни без анімації')+'</div><div class="sec"><h2>Спробувати місяць</h2><span>'+dateLabel(store.date)+'</span></div>'+button('Нарахувати цей місяць','process-month','','second')+button('Перейти до наступного місяця','next-month')+'<p class="note">Зарплата та внески виконуються один раз на демо-місяць.</p><div class="sec"><h2>Демо-сценарії</h2></div><div class="demo-grid">'+button('Почати заново','reset','standard','second compact')+button('Без цілей','reset','no-goals','second compact')+button('Нестача коштів','reset','shortage','second compact')+button('Ноутбук за $500','reset','laptop','second compact')+'</div><p class="note">Прототип v3: цифри вигадані, зміни зберігаються лише у власному демо-сховищі. Справжній застосунок не змінюється.</p><a class="note" href="prototype-v2.html">Відкрити попередній прототип v2 ↗</a>';
  }
  function editableRateCodes() {
    return [...new Set(['USD','EUR','GBP',store.currency,...usedCurrencies()])].filter(code=>code!=='UAH');
  }
  function ratesScreen() { return header('Курси валют','more')+form('rates', '<div class="info">1 одиниця валюти = стільки гривень. Курси в демо збережені локально.</div>'+editableRateCodes().map(c=>field('rate-'+c,c+' → UAH',store.rates[c],'number','min="0.000001" step="any" required')).join('')); }
  function cats() {return header('Ваші коти','goals')+(p.cats.length?'<div class="cat-grid">'+p.cats.map(id=>'<div class="cat-card cat-unlock">'+catSvg(id)+'<b>'+esc(CATS[id].n)+'</b><p>'+esc(id==='first'?'За першу завершену покупку цілі.':'За перший внесок у ціль.')+'</p></div>').join('')+'</div>':'<div class="card empty">'+ic('cat',44)+'<h2>Тут оселяться ваші друзі</h2><p class="help">Вони з’являтимуться, поки ви користуєтеся цілями. Облік грошей працює й без колекції.</p></div>');}
  function render() {
    openSwipeId=null; swipe=null;
    if(store.events.some(event=>event.repeat&&!event.void))applyDueIncome();
    p=E.project(store); document.body.dataset.look=store.look; document.body.classList.toggle('calm',store.calm);
    const screens={home,accounts,account:accountScreen,'account-menu':accountMenu,quick:quickScreen,'edit-balance':editBalanceScreen,income:incomeScreen,transfer:transferScreen,goals,goal:goalScreen,'goal-new':goalForm,contribute:contributeScreen,purchase:purchaseScreen,event:eventScreen,forecast,more,salary:salaryScreen,'account-new':accountForm,rates:ratesScreen,cats,history:()=>header('Історія операцій','more')+historyRows(p.history)};
    if(!Object.hasOwn(screens,route)) route='home';
    try { sessionStorage.setItem(VIEW_KEY,JSON.stringify({route,params,lastTab})); } catch (_) {}
    $('view').classList.toggle('account-form-view',accountForms.includes(route));
    let html=screens[route]();
    if(overlay)html+=overlay;
    $('view').innerHTML=(storageWarning?'<div class="warn">'+esc(storageWarning)+'</div>':'')+html;
    $('tabs').innerHTML=[['home','Головна','tabHome'],['accounts','Рахунки','tabAcc'],['goals','Цілі','tabGoal'],['forecast','Прогноз','tabFc'],['more','Ще','tabMore']].map(([id,n,icon])=>'<button type="button" class="tab" data-action="go" data-id="'+id+'" '+(lastTab===id?'aria-current="page"':'')+'>'+ic(icon)+'<span>'+n+'</span></button>').join('');
    if(toast){showToast(toast);toast='';}
    refreshMoneyFields();
    if(route==='account-new')refreshInitialBalanceOptions();
    if(route==='quick')previewQuick();
    if(route==='income')updateIncomeSave();
    if(route==='edit-balance')updateEditSave();
    if(route==='transfer'&&$('x-amount'))updateTransferPreview();
    if(route==='goal-new')previewGoal();
    if(route==='purchase')previewPurchase();
  }
  function setSwipeOpen(id) {
    openSwipeId=id;
    document.querySelectorAll('.swipe-account').forEach(card=>{const on=card.dataset.swipeId===id;card.classList.toggle('open',on);card.classList.remove('dragging');card.querySelector('.swipe-body').style.transform='';const trash=card.querySelector('.swipe-trash');trash.tabIndex=on?0:-1;trash.setAttribute('aria-hidden',on?'false':'true');});
  }
  function closeDeleteDialog() { const dialog=$('account-delete-dialog');if(dialog&&dialog.open)dialog.close();deleteAccountId=null;$('ov').innerHTML=''; }
  function showDeleteDialog(id, choosingDestination = false) {
    const account = aBy(id);
    if (!account || account.deleted) throw new Error('Рахунок уже видалено.');
    if ($('account-delete-dialog')?.open) closeDeleteDialog();
    setSwipeOpen(null);
    deleteAccountId = id;
    const others = p.accounts.filter(a => !a.archived && !a.deleted && a.id !== id);
    const balances = Object.entries(account.balances).filter(([,n]) => n > 0).map(([c,n]) => money(n,c)).join(' · ') || '0';
    const title = choosingDestination ? 'Куди переказати кошти?' : 'Видалити «' + esc(account.name) + '»?';
    const actions = choosingDestination
      ? (others.length
        ? '<p class="info">Спочатку переказуємо залишок, потім видаляємо рахунок.</p>'+
          form('delete-transfer',select('delete-target','Рахунок отримання',options(others,others[0].id,a=>a.name)),'Переказати й видалити')
        : '<p class="note">Немає іншого рахунку для переказу.</p>'+
          button('Додати рахунок','delete-account-add-target',id,'primary')) +
        button('Назад','delete-account-dialog',id,'second')
      : '<div class="delete-actions">'+
        button('Переказати на інший рахунок','delete-account-choose',id,'primary')+
        button('Видалити рахунок','delete-account-remove',id,'second danger')+'</div>';
    $('ov').innerHTML = '<dialog id="account-delete-dialog" class="account-delete-dialog" aria-labelledby="account-delete-title">' +
      '<div class="sheet-drag"><div class="sheet-handle" aria-hidden="true"></div><h2 id="account-delete-title" tabindex="-1" autofocus>'+title+'</h2></div>' +
      button('×','delete-account-cancel','','sheet-close','aria-label="Закрити"') +
      '<p class="note">На рахунку: '+balances+'</p>'+actions+'<div class="error" id="delete-error" role="alert"></div></dialog>';
    const dialog = $('account-delete-dialog');
    const handle = dialog.querySelector('.sheet-drag');
    let drag;
    handle.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      drag = { id:event.pointerId, x:event.clientX, y:event.clientY };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      dialog.style.transform = 'translateY('+Math.max(0,event.clientY-drag.y)+'px)';
    });
    handle.addEventListener('pointerup', event => {
      if (drag?.id !== event.pointerId) return;
      const distance = event.clientY-drag.y;
      if (distance > 65 && distance > Math.abs(event.clientX-drag.x)) closeDeleteDialog();
      drag = null;
      dialog.style.transform = '';
    });
    handle.addEventListener('pointercancel', () => { drag = null; dialog.style.transform = ''; });
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeDeleteDialog(); });
    dialog.showModal();
  }
  let backSwipe;
  $('view').addEventListener('pointerdown',ev=>{
    if(!accountForms.includes(route)||ev.pointerType!=='touch'||!ev.isPrimary||
      ev.target.closest('input, textarea, select, button, .movement-picker[open]'))return;
    backSwipe={id:ev.pointerId,route,x:ev.clientX,y:ev.clientY};
  });
  document.addEventListener('pointercancel',ev=>{
    if(backSwipe?.id===ev.pointerId)backSwipe=null;
  });
  document.addEventListener('pointerup',ev=>{
    if(backSwipe?.id!==ev.pointerId)return;
    const start=backSwipe;
    backSwipe=null;
    const dx=ev.clientX-start.x, dy=Math.abs(ev.clientY-start.y);
    if(start.route===route&&dx>=70&&dx>dy*1.5) $('view').querySelector('.back')?.click();
  });
  // A horizontal drag reveals one trash button; normal vertical scroll is untouched.
  document.addEventListener('pointerdown',ev=>{
    const body=ev.target.closest('.swipe-body');if(!body)return;if(ev.pointerType==='mouse'&&ev.button!==0)return;
    const card=body.closest('.swipe-account');swipe={card,body,id:card.dataset.swipeId,startX:ev.clientX,startY:ev.clientY,base:openSwipeId===card.dataset.swipeId?-80:0,horizontal:false,pointer:ev.pointerId};
  });
  document.addEventListener('pointermove',ev=>{
    if(!swipe||ev.pointerId!==swipe.pointer)return;const dx=ev.clientX-swipe.startX,dy=ev.clientY-swipe.startY;
    if(!swipe.horizontal){if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){swipe=null;return;}if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.25)return;const current=swipe;setSwipeOpen(current.id===openSwipeId?openSwipeId:null);swipe=current;swipe.horizontal=true;try{swipe.body.setPointerCapture(ev.pointerId);}catch(_){}}
    if(ev.cancelable)ev.preventDefault();
    const offset=Math.max(-80,Math.min(0,swipe.base+dx));
    swipe.card.classList.toggle('dragging',offset<0);
    swipe.body.style.transform='translateX('+offset+'px)';
  },{passive:false});
  document.addEventListener('pointerup',ev=>{if(!swipe||ev.pointerId!==swipe.pointer)return;const current=swipe;swipe=null;if(!current.horizontal)return;const dx=ev.clientX-current.startX;setSwipeOpen(current.base+dx < -35?current.id:null);suppressSwipeClickUntil=Date.now()+350;});
  document.addEventListener('pointercancel',()=>{if(swipe){swipe=null;setSwipeOpen(openSwipeId);}});
  function previewPurchase(){try{const g=gBy(params.id), n=amount(val('b-price')), c=val('b-currency'), a=aBy(val('b-account')), v=n*store.rates[c], reserve=E.value(g.holdings,store.rates), useFree=Math.max(0,v-reserve);$('purchase-preview').innerHTML='<div class="r2"><span>Спишеться з рахунку</span><b>'+money(n,c)+'</b></div><div class="r2"><span>На цьому балансі</span><b>'+money(a.balances[c]||0,c)+'</b></div><div class="r2"><span>Із вільних коштів</span><b>'+shown(useFree)+'</b></div><div class="r2"><span>Залишок цілі стане вільним</span><b>'+shown(Math.max(0,reserve-v))+'</b></div>';}catch(_){}}
  function previewGoal() {try {const target=amount(val('g-target')), m=amount(val('g-monthly')), g=params.id?gBy(params.id):null, cur=val('g-currency'), saved=g?E.value(g.holdings,store.rates)/store.rates[cur]:0;const months=m?Math.max(0,Math.ceil((target-saved)/m)):null; $('goal-preview').textContent=months===null?'Без регулярного внеску: відкладайте вручну, коли зручно.':months===0?'Потрібну суму вже зібрано.':'Орієнтовно '+months+' міс. за внеску '+money(m,cur)+' щомісяця.';}catch(_){}}
  function fail(e) { const target=$('account-delete-dialog')?$('delete-error'):$('form-error'); if(target)target.textContent=e.message;else {toast=e.message;render();} }
  function processMonth(month) { if(p.months.includes(month)) {toast='Цей місяць уже нарахований. Повторного зарахування немає.'; return;}commit({type:'month',month,date:month+'-'+String(p.salary?.day||5).padStart(2,'0')},'Зарплату та внески за '+monthLabel(month)+' враховано.');}
  document.addEventListener('click',function(ev){const b=ev.target.closest('[data-action]');if(!b)return;const act=b.dataset.action,id=b.dataset.id;try{
    if(Date.now()<suppressSwipeClickUntil&&act==='account'){ev.preventDefault();return;}
    if(act==='delete-account-dialog'){showDeleteDialog(id);return;}
    if(act==='delete-account-choose'){showDeleteDialog(id,true);return;}
    if(act==='delete-account-add-target'){closeDeleteDialog();return go('account-new',{deleteSource:id});}
    if(act==='delete-account-cancel'){closeDeleteDialog();return;}
    if(act==='delete-account-remove'){commit({type:'account-remove',account:deleteAccountId,mode:'remove'},'Рахунок видалено. Його залишок більше не входить у загальну суму.');closeDeleteDialog();return goWithToast('accounts');}
    if(act==='account'&&openSwipeId===id){setSwipeOpen(null);return;}
    if(act==='go'&&id==='accounts'&&route==='account-new'&&params.deleteSource&&b.classList.contains('back')){
      const source=params.deleteSource;
      go('accounts');
      return showDeleteDialog(source,true);
    }
    if(act==='go') { if(id==='account'&&!params.account&&!params.id)return go('accounts');if(id==='account'){const e=p.history.find(e=>e.id===params.id);return go('account',{id:params.account||e?.account||params.id,currency:params.currency});} if(id==='goal')return go('goal',{id:params.id});return go(id); }
    if(act==='add-initial-balance'){
      const list=$('initial-balances');
      if(list.children.length>=currencies.length)throw new Error('Усі валюти вже додано.');
      const index=nextBalanceRow++;
      list.insertAdjacentHTML('beforeend',initialBalanceRow(index));
      refreshInitialBalanceOptions();
      refreshMoneyFields();
      $('a-currency-'+index+'-control').focus();
      return;
    }
    if(act==='remove-initial-balance'){
      b.closest('[data-balance-row]').remove();
      refreshInitialBalanceOptions();
      return;
    }
    if(act==='quick-comment'){
      const input=$(id), note=b.dataset.note, current=input.value.trim();
      if(current===note||current.split(' · ').includes(note))return;
      const value=current?current+' · '+note:note;
      if(value.length<=input.maxLength){
        input.value=value;
        input.dispatchEvent(new Event('input',{bubbles:true}));
      }
      return;
    }
    if(act==='stop-income-repeat'){
      persist({...store,stoppedIncome:[...new Set([...(store.stoppedIncome||[]),id])]});
      toast='Повторення вимкнено.';
      return render();
    }
    if(act==='pick-movement-currency'){
      const fieldId=b.dataset.field;
      if(fieldId==='a-type'){
        const examples={cash:'Гаманець',bank:'Монобанк',dep:'Депозит на рік',savings:'Резерв',biz:'Рахунок ФОП',investment:'Брокерський рахунок',crypto:'Binance',other:'Мій рахунок'};
        $('a-name').placeholder='Наприклад, '+examples[id];
      }
      const control=setPickerValue(fieldId,id,b.hasAttribute('data-quick-currency')?currencyLabel(id):b.textContent);
      control.parentElement.open=false;
      control.removeAttribute('aria-invalid');
      const hint=$(control.id+'-error');
      if(hint)hint.textContent='';
      if(fieldId==='x-to-currency')$('x-to-currency').dataset.manual='true';
      if(fieldId==='x-currency'&&!$('x-to-currency').dataset.manual)
        setPickerValue('x-to-currency',id,currencyLabel(id));
      if(fieldId==='edit-currency'){
        const balance=aBy(params.id).balances[id];
        $('edit-current').textContent='На рахунку: '+money(balance,id);
      }
      refreshMoneyFields();
      if(fieldId.startsWith('a-currency-'))refreshInitialBalanceOptions();
      if(fieldId==='q-currency')previewQuick();
      if(fieldId==='i-repeat')$('i-repeat-custom').hidden=id!=='custom';
      if(fieldId==='i-currency'||fieldId==='i-repeat')updateIncomeSave();
      if(fieldId==='edit-currency')updateEditSave();
      if(route==='transfer')updateTransferPreview();
      control.focus();
      return;
    }
    if(act==='history-currency'){params.historyCurrency=id;return render();}
    if(act==='account-summary-currency'){
      persist({...store,accountSummaryCurrencies:{...store.accountSummaryCurrencies,[params.id]:id}});
      return render();
    }
    if(act==='set-currency'){persist({...store,currency:id});return render();}
    if(act==='account')return go('account',{id});
    if(act==='account-menu')return go('account-menu',{id});
    if(act==='account-currency'){params.currency=params.currency===id?'':id;return render();}
    if(act==='account-filter'){params.filter=id;return render();}
    if(act==='quick'||act==='transfer'){
      const currency=b.dataset.currency;
      if(!Object.values(aBy(id).balances).some(balance=>balance>0)){
        toast='Спочатку додайте гроші.';
        return goWithToast('income',{id,currency});
      }
      return go(act,{id,currency});
    }
    if(act==='goal')return go('goal',{id});
    if(act==='income')return go(act,{id,currency:b.dataset.currency});
    if(act==='edit-balance')return go('edit-balance',{id,currency:b.dataset.currency});
    if(act==='edit-goal')return go('goal-new',{id});
    if(act==='contribute'||act==='purchase')return go(act,{id});
    if(act==='event')return go('event',{id,account:route==='account'?params.id:null});
    if(act==='pause-goal'){const g=gBy(id);commit({type:'goal-settings',goalId:id,changes:{status:g.status==='paused'?'active':'paused'}},g.status==='paused'?'Внески відновлено.':'Внески на паузі. Накопичення збережено.');}
    else if(act==='release-goal'){commit({type:'goal-release',goalId:id},'Ціль закрито. Гроші залишились на рахунках і стали вільними.');return goWithToast('goals');}
    else if(act==='archive-account'){commit({type:'account-settings',account:id,changes:{archived:true}},'Рахунок в архіві.');return goWithToast('accounts');}
    else if(act==='restore-account'){commit({type:'account-settings',account:id,changes:{archived:false}},'Рахунок відновлено.');}
    else if(act==='rename-account'){const a=aBy(id);overlay=form('rename',field('rename-name','Назва рахунку',a.name,'text','required maxlength="60"'),'Перейменувати');}
    else if(act==='look'){persist({...store,look:id});}
    else if(act==='period'){period=Number(id);}
    else if(act==='process-month'){processMonth(store.date.slice(0,7));}
    else if(act==='next-month'){persist({...store,date:E.nextMonth(store.date)});applyDueIncome();p=E.project(store);processMonth(store.date.slice(0,7));}
    else if(act==='reset'){let n=E.seed(id==='no-goals',today());if(id==='shortage'){n.base.accounts=[{id:'wise',name:'Демо · картка',type:'bank',color:1,balances:{USD:1000000},checked:n.date}];n.base.goals=[{id:'home',name:'Квартира',icon:'home',currency:'USD',target:26000000,monthly:100000,holdings:{USD:900000},auto:true,protected:false,status:'active'},{id:'laptop',name:'Ноутбук',icon:'laptop',currency:'USD',target:200000,monthly:10000,holdings:{USD:100000},auto:true,protected:false,status:'active'}];}if(id==='laptop'){n.base.goals=[{id:'laptop',name:'Ноутбук',icon:'laptop',currency:'USD',target:50000,monthly:16667,holdings:{USD:50000},auto:true,protected:false,status:'active'}];}persist(n);overlay=null;route='home';params={};lastTab='home';toast='Демо готове. Усі суми вигадані.';}
    else return;
    render();
  }catch(e){fail(e);}});
  function showToast(message) {
    const notice=$('app-toast');
    clearTimeout(toastTimer);
    notice.textContent=message;
    toastTimer=setTimeout(() => { notice.textContent=''; },4000);
  }
  function goWithToast(next, data={}) { go(next,data,toast); }
  document.addEventListener('submit',function(ev){const f=ev.target.closest('[data-form]');if(!f)return;ev.preventDefault();try{const type=f.dataset.form;
    if(type==='delete-transfer'){commit({type:'account-remove',account:deleteAccountId,mode:'transfer',to:val('delete-target')},'Усі кошти переказано. Рахунок видалено.');closeDeleteDialog();return goWithToast('accounts');}
    if(type==='quick'){if(!validateMovement('q')||!spendingInput('q',val('q-currency')))return;const payload=quickPayload();commit(payload,'Гроші оновлено.');return goWithToast('account',{id:params.id,currency:params.currency});}
    if(type==='edit-balance'){
      const id=params.id, currency=val('edit-currency');
      if(!currency)throw new Error('Виберіть валюту.');
      if(!val('edit-amount').trim())throw new Error('Введіть новий залишок.');
      commit({type:'balance',account:id,currency,amount:amount(val('edit-amount')),asExpense:false,
        explicitEdit:true,note:val('edit-note').trim()},'Залишок збережено.');
      return goWithToast('account',{id,currency:params.currency});
    }
    if(type==='income'){
      if(!validateMovement('i'))return;
      const repeat=incomeRepeat();
      const date=store.date>today()?store.date:today();
      commit({type:'income',account:params.id,currency:val('i-currency'),amount:movementAmount('i'),
        note:val('i-note').trim()||'Дохід',...(repeat?{repeat,date}:{})},'Дохід записано.');
      return goWithToast('account',{id:params.id,currency:params.currency});
    }
    if(type==='transfer'){
      const currency=val('x-currency'), toCurrency=val('x-to-currency'), to=val('x-to');
      if(!currency)throw new Error('Виберіть валюту відправлення.');
      if(!val('x-amount').trim())throw new Error('Введіть, скільки надіслали.');
      if(!spendingInput('x',currency))return;
      if(!to)throw new Error('Виберіть рахунок отримання.');
      if(!toCurrency)throw new Error('Виберіть валюту отримання.');
      if(!val('x-received').trim())throw new Error('Введіть, скільки отримали.');
      commit({type:'transfer',account:params.id,to,currency,toCurrency,amount:amount(val('x-amount')),
        received:amount(val('x-received')),fee:amount(val('x-fee').trim()||'0'),note:to===params.id?'Обмін валют':'Переказ між своїми рахунками'},
        to===params.id?'Обмін валют записано.':'Переказ записано на обох рахунках.');
      return goWithToast('account',{id:params.id,currency:params.currency});
    }
    if(type==='goal-save'){const changes={name:val('g-name').trim(),icon:val('g-icon'),currency:val('g-currency'),target:amount(val('g-target')),monthly:amount(val('g-monthly')),auto:$('g-auto').checked};if(!changes.name||!changes.target)throw new Error('Вкажіть назву й додатну суму цілі.');const id=params.id||'g'+(store.sequence+1);if(params.id)commit({type:'goal-settings',goalId:id,changes},'Ціль оновлено.');else commit({type:'goal-create',goal:{id,...changes,holdings:{},protected:false,status:'active'}},'Ціль створено. Гроші поки не зарезервовані.');return goWithToast('goal',{id});}
    if(type==='contribute'){commit({type:'contribute',goalId:params.id,currency:val('c-currency'),amount:amount(val('c-amount'))},'Внесок збережено. Рахунки не змінились.');return goWithToast('goal',{id:params.id});}
    if(type==='purchase'){commit({type:'purchase',goalId:params.id,account:val('b-account'),currency:val('b-currency'),amount:amount(val('b-price')),note:'Покупка: '+gBy(params.id).name},'Покупку записано. Решта накопичень вільна.');return goWithToast('goal',{id:params.id});}
    if(type==='salary'){const n=amount(val('s-amount'));if(!n)throw new Error('Вкажіть додатну суму зарплати.');commit({type:'salary-settings',salary:{account:val('s-account'),currency:val('s-currency'),amount:n,day:Number(val('s-day')),auto:$('s-auto').checked}},'План зарплати збережено.');return goWithToast('more');}
    if(type==='expense-plan'){persist({...store,expensePlan:amount(val('f-plan')),expensePlanCurrency:store.currency});toast='Прогноз оновлено. Фактичні гроші не змінились.';return render();}
    if(type==='account-create'){
      const accountType=val('a-type');
      const name=val('a-name').trim().replace(/\s+/g,' ')||names[accountType];
      validateAccountName(name);
      const balances=initialBalances();
      const id='a'+(store.sequence+1);
      commit({type:'account-create',accountData:{id,name,type:accountType,color:(store.sequence%4)+1,balances,checked:store.date}},
        'Рахунок додано');
      const source=params.deleteSource;
      if(source&&aBy(source)&&!aBy(source).deleted){
        goWithToast('accounts');
        return showDeleteDialog(source,true);
      }
      return goWithToast('account',{id});
    }
    if(type==='rates'){const rates={...store.rates};for(const c of editableRateCodes()){const r=Number(val('rate-'+c));if(!Number.isFinite(r)||r<=0||r>1e8)throw new Error('Курс має бути додатним числом.');rates[c]=r;}persist({...store,rates});toast='Курси оновлено. Оригінальні суми не змінились.';return render();}
    if(type==='rename'){const name=val('rename-name').trim();if(!name)throw new Error('Вкажіть назву.');validateAccountName(name,params.id);commit({type:'account-settings',account:params.id,changes:{name}},'Назву змінено.');overlay=null;return render();}
  }catch(e){fail(e);}});
  function setPickerValue(id,value,label) {
    const control=$(id+'-control');
    $(id).value=value;
    control.querySelector('span').textContent=label;
    for(const item of $('view').querySelectorAll('[data-field="'+id+'"]'))
      item.setAttribute('aria-pressed',String(item.dataset.id===value));
    return control;
  }
  function showAmountError(id,message) {
    const input=$(id);
    $(id+'-error').textContent=message;
    input.setAttribute('aria-invalid',String(Boolean(message)));
    input.setAttribute('aria-describedby',id+'-error');
  }
  function spendingInput(prefix,currency) {
    const input=$(prefix+'-amount'), raw=input.value.trim();
    const balance=currency?aBy(params.id).balances[currency]:0;
    $(prefix+'-current').textContent=currency?'На рахунку: '+money(balance,currency):'';
    let spent=0, fee=0, message='', feeError='';
    if(raw){
      try {
        spent=amount(raw);
        if(!spent)message='Введіть суму більше нуля.';
      } catch(error) { message=error.message; }
    }
    if(prefix==='x'){
      try { fee=amount(val('x-fee').trim()||'0'); } catch(error) { feeError=error.message; }
      showAmountError('x-fee',feeError);
    }
    if(!message&&currency&&(raw||fee)&&spent+fee>balance){
      message='Не вистачає '+money(spent+fee-balance,currency)+(fee&&spent<=balance?' з урахуванням комісії.':'.');
    }
    showAmountError(input.id,message);
    input.form.querySelector('[type="submit"]').disabled=Boolean(!currency||!spent||message||feeError);
    return message||feeError?0:spent;
  }
  function validAmount(id, allowZero=false) {
    try { return amount(val(id))>0||allowZero; } catch (_) { return false; }
  }
  function updateIncomeSave() {
    let validRepeat=true;
    try { incomeRepeat(); } catch (_) { validRepeat=false; }
    $('i-amount').form.querySelector('[type="submit"]').disabled=!val('i-currency')||!validAmount('i-amount')||!validRepeat;
  }
  function updateEditSave() {
    const input=$('edit-amount');
    if(input)input.form.querySelector('[type="submit"]').disabled=!val('edit-currency')||!validAmount(input.id,true);
  }
  function updateTransferPreview() {
    const from=val('x-currency'), to=val('x-to-currency');
    const spent=spendingInput('x',from), received=$('x-received');
    const same=Boolean(from&&from===to);
    if(same) {
      received.value=val('x-amount');
      received.dataset.lastValidAmount=received.value;
    } else if(received.readOnly) {
      received.value='';
      received.dataset.lastValidAmount='';
    }
    received.readOnly=same;
    const preview=$('transfer-rate');
    const destination=val('x-to');
    const sameDestination=same&&destination===params.id;
    $('transfer-destination-error').textContent=sameDestination?'Виберіть іншу валюту для обміну на цьому рахунку.':'';
    received.form.querySelector('[type="submit"]').disabled=!from||!to||!destination||sameDestination||!spent||!validAmount(received.id);
    preview.textContent='';
    if(!from||!to||same||!spent||!received.value.trim())return;
    try {
      const rate=conversionText(from,to,spent,amount(received.value));
      if(rate)preview.textContent='Конвертація: '+rate;
    } catch (_) {}
  }
  function clearMovementError(control) {
    const hint = $(control.id+'-error');
    if (!hint || !control.value.trim()) return;
    hint.textContent = '';
    control.removeAttribute('aria-invalid');
  }
  function fitOpenPickers() {
    const bounds=$('view').getBoundingClientRect();
    const viewport=window.visualViewport;
    const top=Math.max(bounds.top,viewport?.offsetTop||0);
    const bottom=Math.min(bounds.bottom,viewport?viewport.offsetTop+viewport.height:window.innerHeight);
    for(const picker of document.querySelectorAll('.movement-picker[open], .curctl[open]')){
      const control=picker.querySelector('summary').getBoundingClientRect();
      const search=picker.querySelector('.currency-search');
      const overhead=search?search.offsetHeight+18:12;
      const above=control.top-top;
      const below=bottom-control.bottom;
      const opensUp=below<240+overhead&&above>below;
      picker.classList.toggle('picker-up',opensUp);
      picker.style.setProperty('--picker-options-height',Math.max(36,Math.min(230,(opensUp?above:below)-overhead))+'px');
    }
  }
  document.addEventListener('toggle',ev=>{
    if(ev.target.matches?.('.movement-picker[open], .curctl[open]'))fitOpenPickers();
  },true);
  $('view').addEventListener('scroll',fitOpenPickers,{passive:true});
  window.visualViewport?.addEventListener('resize',fitOpenPickers);
  window.visualViewport?.addEventListener('scroll',fitOpenPickers);
  document.addEventListener('click',ev=>{
    for(const picker of document.querySelectorAll('.curctl[open], .movement-picker[open]')){
      if(!picker.contains(ev.target))picker.open=false;
    }
  },true);
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Enter'&&ev.target.id==='q-amount'&&!ev.isComposing){
      ev.preventDefault();
      ev.target.blur();
      return;
    }
    const picker=ev.target.closest('.movement-picker[open], .curctl[open]');
    if(ev.key==='Escape'&&picker){
      ev.preventDefault();
      picker.open=false;
      picker.querySelector('summary').focus();
    }
  });
  document.addEventListener('input',function(ev){
    if(ev.target.matches('.currency-search')){
      const picker = ev.target.closest('.movement-picker');
      let shown = 0;
      for (const choice of picker.querySelectorAll('.currency-item')) {
        choice.hidden = !matchesCurrency(choice.dataset.id,ev.target.value);
        if (!choice.hidden) shown++;
      }
      for (const group of picker.querySelectorAll('.currency-group')) {
        group.hidden = !group.querySelector('.currency-item:not([hidden])');
      }
      picker.querySelector('.currency-options').scrollTop=0;
      picker.querySelector('.currency-no-results').hidden = shown>0;
      return;
    }
    if(ev.target.matches('.money-input input'))groupAmount(ev.target);
    clearMovementError(ev.target);
    const counter = $(ev.target.id+'-count');
    if(counter) counter.textContent=ev.target.value.length+' / 50';
    if(['i-amount','i-repeat-days'].includes(ev.target.id))updateIncomeSave();
    if(ev.target.id==='edit-amount')updateEditSave();
    if(route==='quick'&&ev.target.id==='q-amount')previewQuick();if(route==='goal-new')previewGoal();if(route==='purchase')previewPurchase();if(route==='transfer'&&['x-amount','x-received','x-fee'].includes(ev.target.id))updateTransferPreview();});
  document.addEventListener('change',function(ev){const id=ev.target.id;try{
    clearMovementError(ev.target);
    if(id.endsWith('currency'))refreshMoneyFields();
    if(id==='q-currency')previewQuick();
    if(id==='x-currency'||id==='x-to-currency')updateTransferPreview();
    if(id==='show-currency'){persist({...store,currency:ev.target.value});return render();}
    if(id==='goal-protected'||id==='goal-auto'){commit({type:'goal-settings',goalId:params.id,changes:{[id==='goal-protected'?'protected':'auto']:ev.target.checked}},'Налаштування збережено.');return render();}
    if(id==='calm-mode'){persist({...store,calm:ev.target.checked});return render();}
    if(route==='goal-new')previewGoal();
    if(route==='purchase')previewPurchase();
  }catch(e){fail(e);}});
  try {
    const saved=JSON.parse(sessionStorage.getItem(VIEW_KEY));
    if(saved&&typeof saved.route==='string'&&saved.params&&typeof saved.params==='object'){
      const projected=E.project(store);
      const id=saved.params.id;
      const account=projected.accounts.find(a=>a.id===id);
      const goal=projected.goals.find(g=>g.id===id);
      const accountRoute=['account','account-menu','quick','income','transfer','edit-balance'].includes(saved.route);
      const goalRoute=['goal','contribute','purchase','goal-new'].includes(saved.route);
      const validAccount=!accountRoute||(account&&(saved.route==='account'||!account.deleted));
      const validGoal=!goalRoute||goal||(saved.route==='goal-new'&&!id);
      if(validAccount&&validGoal){
        route=saved.route;
        params=saved.params;
        if(params.deleteSource&&!projected.accounts.some(a=>a.id===params.deleteSource&&!a.deleted))delete params.deleteSource;
        if(['home','accounts','goals','forecast','more'].includes(saved.lastTab))lastTab=saved.lastTab;
      }
    }
  } catch (_) {}
  render();
})();
