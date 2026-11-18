/* Personal bank preview. Token and raw statements stay in page memory. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), R = MonoReview;
  const codes = {980:'UAH',840:'USD',978:'EUR',826:'GBP',985:'PLN'};
  const names = {black:'Чорна картка',white:'Біла картка',platinum:'Platinum',iron:'Iron',fop:'ФОП',yellow:'Дитяча картка'};
  const kinds = {income:'Мій дохід',expense:'Покупка або витрата',transfer:'Переказ між рахунками',cash:'Зняття готівки',contribution:'Внесок на спільні витрати'};
  let token = '', accounts = [], statements = new Map(), controller, generation = 0;
  let statementAfter = 0, clientAfter = 0, cooldownTimer, demo = false;
  let state, storageKey, storageError = '', editAction;
  const emptyState = () => ({wallets:[],decisions:{},exchanges:[],cashExpenses:[],accountSettings:{}});
  function node(tag,text,className) {
    const result = document.createElement(tag);
    if (text !== undefined) result.textContent = text;
    if (className) result.className = className;
    return result;
  }
  function button(text,action,className) {
    const result = node('button',text,className);
    result.type = 'button';
    result.addEventListener('click',action);
    return result;
  }
  function money(value,code) {
    return (value/100).toLocaleString('uk-UA',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(codes[code]||'код '+code);
  }
  function amount(value,zero=false) {
    const text = String(value).trim().replace(/\s/g,'').replace(',','.');
    if (!/^\d+(\.\d{1,2})?$/.test(text)) throw Error('Введіть суму цифрами, до двох знаків після коми.');
    const minor = Math.round(Number(text)*100);
    if (!Number.isSafeInteger(minor)||minor<(zero?0:1)) throw Error('Вкажіть суму більше нуля.');
    return minor;
  }
  function status(message,error=false) {
    $('status').textContent = message;
    $('status').classList.toggle('error',error);
  }
  function accountName(account) {
    return account.label || (names[account.type]||'Рахунок')+
      (account.maskedPan?.[0]?' · '+account.maskedPan[0]:'')+
      (account.externalOwner?' · Інший власник':'')+' · '+(codes[account.currencyCode]||account.currencyCode);
  }
  function selectedAccount() { return accounts.find(account=>account.id===$('account').value); }
  function loadState(id) {
    storageKey = 'money-mono-review-v1:'+id;
    storageError = '';
    state = emptyState();
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        R.validateState(parsed);
        R.walletBalances(parsed);
        state = {...emptyState(),...parsed};
      }
    } catch (_) {
      storageError = 'Попередні позначки не вдалося відкрити. Збереження заблоковано, щоб їх не перезаписати.';
    }
  }
  function save(next) {
    if (storageError) throw Error(storageError);
    R.validateState(next);
    R.walletBalances(next);
    try { localStorage.setItem(storageKey,JSON.stringify(next)); }
    catch (_) { throw Error('Браузер не зберіг зміни. Перевірте вільне місце та доступ до сховища.'); }
    state = next;
  }
  function clone() { return JSON.parse(JSON.stringify(state)); }
  function settings(account) { return state.accountSettings[account.id]||{shared:false,share:5000}; }
  function clearStatement() {
    $('operations').replaceChildren();
    for (const id of ['income','outgoing','period','unreviewed']) $(id).textContent = '';
    $('statement-summary').hidden = true;
  }
  function updateCooldown() {
    clearTimeout(cooldownTimer);
    const seconds = demo?0:Math.max(0,Math.ceil((statementAfter-Date.now())/1000));
    $('statement').disabled = seconds>0;
    $('statement').textContent = seconds?'Наступний запит через '+seconds+' с':'Оновити операції за 30 днів';
    if (seconds&&token) cooldownTimer = setTimeout(updateCooldown,1000);
  }
  function showAccount() {
    controller?.abort();
    generation++;
    const account = selectedAccount();
    if (!account) return;
    $('balance').textContent = money(account.balance,account.currencyCode);
    $('credit').textContent = account.creditLimit>0?'Кредитний ліміт: '+money(account.creditLimit,account.currencyCode)+'. Банківський залишок може включати кредитні кошти.':'';
    $('shared-account').checked = settings(account).shared;
    $('share-field').hidden = !settings(account).shared;
    $('share').value = String(settings(account).share);
    renderStatement();
    renderWallets();
    updateCooldown();
    status(storageError||'',Boolean(storageError));
  }
  function updateSettings() {
    try {
      const account = selectedAccount(), next = clone();
      next.accountSettings[account.id] = {shared:$('shared-account').checked,share:Number($('share').value)};
      save(next);
      $('share-field').hidden = !$('shared-account').checked;
    } catch (error) { showAccount();status(error.message,true); }
  }
  async function request(path,activeToken) {
    controller?.abort();
    const requestVersion = generation;
    const current = new AbortController();
    controller = current;
    const timeout = setTimeout(()=>current.abort(),20000);
    try {
      const response = await fetch('https://api.monobank.ua'+path,{
        method:'GET',headers:{'X-Token':activeToken},signal:current.signal,
        credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',redirect:'error'
      });
      if (requestVersion!==generation) throw Error('Запит більше не актуальний.');
      if (!response.ok) {
        if (response.status===429) throw Error('Забагато запитів. Зачекайте хвилину й спробуйте ще раз.');
        if (response.status===401||response.status===403) {
          if (token) disconnect();
          status('Токен більше не діє. Підключіться знову.',true);
          throw Error('Банк не прийняв токен. Перевірте його або створіть новий.');
        }
        throw Error('monobank зараз не відповідає. Спробуйте пізніше.');
      }
      return await response.json();
    } catch (error) {
      if (error.name==='AbortError') throw Error('Запит перервано або банк відповідає надто довго. Спробуйте ще раз.');
      if (error instanceof TypeError) throw Error('Не вдалося з’єднатися з monobank. Перевірте інтернет. Браузер також міг заблокувати прямий запит.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  function activate(client,isDemo=false) {
    demo = isDemo;
    const personalOwner = client.clientId||'personal';
    const all = [...(client.accounts||[]).map(account=>({...account,ownerId:personalOwner})),
      ...(client.managedClients||[]).flatMap(client=>(client.accounts||[]).map(account=>({...account,ownerId:client.clientId,externalOwner:client.clientId!==personalOwner})))];
    accounts = [...new Map(all.filter(account=>typeof account.id==='string'&&Number.isSafeInteger(account.balance)&&Number.isInteger(account.currencyCode)).map(account=>[account.id,account])).values()];
    if (!accounts.length) throw Error('Банк не повернув доступних рахунків.');
    loadState(isDemo?'demo':client.clientId||'accounts:'+accounts.map(account=>account.id).sort().join(':'));
    $('account').replaceChildren(...accounts.map(account=>{
      const option = node('option',accountName(account));
      option.value = account.id;
      return option;
    }));
    $('connect-form').hidden = true;
    $('demo').hidden = true;
    $('connected').hidden = false;
    $('checked').textContent = demo?'Вигадані дані для перевірки':'Оновлено '+new Date().toLocaleString('uk-UA');
    showAccount();
    if (!storageError) status(demo?'Це приклад. Перейдіть на картку, підтвердьте переказ і зняття готівки.':'Підключено. Завантажте операції потрібних рахунків.');
  }
  $('token').addEventListener('input',()=>{ $('connect').disabled = !$('token').value.trim(); });
  $('connect').disabled = true;
  $('connect-form').addEventListener('submit',async event=>{
    event.preventDefault();
    const provided = $('token').value.trim();
    if (!provided) return;
    if (Date.now()<clientAfter) { status('Зачекайте хвилину між спробами підключення.',true);return; }
    const version = ++generation;
    $('token').value = '';
    $('connect').disabled = true;
    clientAfter = Date.now()+60000;
    status('Підключаємося до monobank…');
    try {
      const client = await request('/personal/client-info',provided);
      if (version!==generation) return;
      activate(client);
      token = provided;
    } catch (error) { if (version===generation) status(error.message,true); }
  });
  $('account').addEventListener('change',showAccount);
  $('shared-account').addEventListener('change',updateSettings);
  $('share').addEventListener('change',updateSettings);
  function validRows(rows) {
    if (!Array.isArray(rows)) throw Error('Банк повернув неочікувану відповідь.');
    return [...new Map(rows.filter(row=>typeof row.id==='string'&&Number.isSafeInteger(row.amount)&&Number.isFinite(row.time)).map(row=>[row.id,row])).values()].sort((a,b)=>b.time-a.time);
  }
  $('statement').addEventListener('click',async()=>{
    const account = selectedAccount();
    if (demo) { renderStatement();status('Показано всі операції прикладу.');return; }
    if (!token||!account||Date.now()<statementAfter) return;
    const version = ++generation, to = Math.floor(Date.now()/1000), from = to-30*86400;
    statementAfter = Date.now()+60000;
    updateCooldown();
    status('Завантажуємо операції…');
    try {
      const rows = await request('/personal/statement/'+encodeURIComponent(account.id)+'/'+from+'/'+to,token);
      if (version!==generation) return;
      statements.set(account.id,{rows:validRows(rows),from,to});
      renderStatement();
      status('Операції завантажено. Підтвердьте, що означає кожна операція.');
    } catch (error) { if (version===generation) status(error.message,true); }
  });
  function statementRows() { return new Map([...statements].map(([id,statement])=>[id,statement.rows])); }
  function renderStatement() {
    clearStatement();
    const account = selectedAccount(), statement = statements.get(account.id);
    if (!statement) {
      $('operations').append(node('p','Завантажте виписку цього рахунку.','note'));
      return;
    }
    const totals = R.summarize(account.id,statement.rows,state.decisions);
    $('income').textContent = money(totals.income,account.currencyCode);
    $('outgoing').textContent = money(totals.expense,account.currencyCode);
    $('unreviewed').textContent = 'Потребують уточнення: '+totals.unreviewed+'. В обробці: '+totals.held+'.';
    $('period').textContent = new Date(statement.from*1000).toLocaleDateString('uk-UA')+' — '+new Date(statement.to*1000).toLocaleDateString('uk-UA');
    $('statement-summary').hidden = false;
    if (!statement.rows.length) $('operations').append(node('p','За цей період операцій немає.','note'));
    for (const row of statement.rows) {
      const key = R.key(account.id,row.id), decision = state.decisions[key];
      const entry = node('div',undefined,'operation'), line = node('div',undefined,'row');
      const description = node('span',row.description||'Операція');
      description.append(node('small',new Date(row.time*1000).toLocaleString('uk-UA')+(row.hold?' · В обробці':'')));
      line.append(description,node('b',(row.amount>0?'+':'')+money(row.amount,account.currencyCode)));
      entry.append(line);
      if (decision) {
        if(decision.amount!==row.amount)entry.append(node('p','Банк уточнив суму. Перевірте позначку.','error'));
        entry.append(node('span',(kinds[decision.kind]||'Позначено')+(decision.scope==='shared'?' · Спільні':' · Особисті'),'tag'));
        entry.append(button('Змінити позначку',()=>openReview(account,row)));
        entry.append(button('Скасувати позначку',()=>removeDecision(key)));
      } else if (!row.hold) {
        const candidates = R.transferCandidates(account,row,accounts,statementRows(),state.decisions);
        if (candidates.length) entry.append(node('p','Схоже на переказ між рахунками. Підтвердьте пару.','suggestion'));
        else if (row.amount<0&&[6010,6011].includes(row.mcc)) entry.append(node('p','Схоже на зняття готівки. Виберіть гаманець.','suggestion'));
        entry.append(button(candidates.length?'Перевірити переказ':'Що це за операція?',()=>openReview(account,row)));
      }
      $('operations').append(entry);
    }
  }
  function field(id,label,type='text',value='') {
    const wrapper = node('div'), caption = node('label',label), input = node('input');
    caption.htmlFor = id;
    input.id = id;input.type = type;input.value = value;
    if (type==='text'&&/amount|sent|received/.test(id)) input.inputMode = 'decimal';
    wrapper.append(caption,input);
    $('dialog-fields').append(wrapper);
    return input;
  }
  function select(id,label,choices,value) {
    const wrapper = node('div'), caption = node('label',label), input = node('select');
    input.id = id;caption.htmlFor = id;
    for (const [code,title] of choices) { const option=node('option',title);option.value=code;input.append(option); }
    if (value!==undefined) input.value=value;
    wrapper.append(caption,input);$('dialog-fields').append(wrapper);
    return input;
  }
  function beginDialog(title,submit='Зберегти') {
    if ($('review-dialog').open) $('review-dialog').close();
    $('dialog-title').textContent = title;
    $('dialog-fields').replaceChildren();
    $('dialog-error').textContent = '';
    $('dialog-submit').textContent = submit;
  }
  function openReview(account,row) {
    beginDialog('Що це за операція?');
    const key = R.key(account.id,row.id), existing=state.decisions[key], candidates=R.transferCandidates(account,row,accounts,statementRows(),state.decisions);
    // A confirmed pair remains selectable when reopening it.
    if (existing?.pairKey) {
      const pair=state.decisions[existing.pairKey];
      if (pair&&!candidates.some(item=>R.key(item.accountId,item.rowId)===existing.pairKey)) candidates.push({accountId:pair.accountId,rowId:pair.rowId,amount:pair.amount,time:pair.time});
    }
    const choices = row.amount<0?[['expense',kinds.expense],['cash',kinds.cash]]:[['income',kinds.income],['contribution',kinds.contribution]];
    if (candidates.length) choices.unshift(['transfer',kinds.transfer]);
    choices.unshift(['','Виберіть призначення']);
    const kind = select('review-kind','Призначення',choices,existing?.kind||(candidates.length?'transfer':[6010,6011].includes(row.mcc)&&row.amount<0?'cash':''));
    const dynamic=node('div');dynamic.id='review-details';$('dialog-fields').append(dynamic);
    function details() {
      dynamic.replaceChildren();
      // Build into a temporary field host and move the resulting nodes under this choice.
      const before=[...$('dialog-fields').children];
      if (!kind.value)return;
      if (kind.value==='transfer') select('review-pair','Відповідна операція',candidates.map(item=>{
        const other=accounts.find(a=>a.id===item.accountId);
        return [R.key(item.accountId,item.rowId),accountName(other)+' · '+money(item.amount,other.currencyCode)+' · '+new Date(item.time*1000).toLocaleDateString('uk-UA')];
      }),existing?.pairKey);
      if (kind.value==='cash') {
        if (!state.wallets.length) $('dialog-fields').append(node('p','Створимо перший готівковий гаманець.','note'));
        else select('review-wallet','Куди поклали готівку?',state.wallets.map(wallet=>[wallet.id,wallet.name]),existing?.walletId);
        field('review-wallet-name',state.wallets.length?'Або назвіть новий гаманець':'Назва гаманця','text',state.wallets.length?'':'Гаманець');
        field('review-received','Скільки отримали готівкою, '+(codes[account.currencyCode]||account.currencyCode)+'?','text',String((existing?.received||-row.amount)/100));
        $('dialog-fields').append(node('p','Якщо банк списав більше, різницю запишемо як комісію.','note'));
      }
      if (kind.value==='expense'||kind.value==='transfer') {
        select('review-scope','Чиї це гроші?',[['personal','Мої особисті'],['shared','Спільні']],existing?.scope||(settings(account).shared?'shared':'personal'));
      }
      if (kind.value==='expense') select('review-share','Моя частка спільної витрати',[['5000','50%'],['2500','25%'],['7500','75%'],['10000','100%']],String(existing?.ownShareBasisPoints||settings(account).share));
      if (kind.value==='contribution') $('dialog-fields').append(node('p','Це внесок у спільний бюджет. Він не збільшує ваш особистий дохід.','note'));
      for (const child of [...$('dialog-fields').children]) if(!before.includes(child))dynamic.append(child);
    }
    kind.addEventListener('change',details);
    details();
    editAction=()=>{
      if (!kind.value)throw Error('Виберіть призначення операції.');
      const next=clone();
      removePair(next,key);
      const decision={kind:kind.value,accountId:account.id,rowId:row.id,amount:row.amount,currencyCode:account.currencyCode,time:row.time,
        scope:$('review-scope')?.value||'personal'};
      if (kind.value==='expense')decision.ownShareBasisPoints=Number($('review-share').value);
      if (kind.value==='contribution')decision.scope='shared';
      if (kind.value==='cash') {
        const name=$('review-wallet-name').value.trim();
        let walletId=$('review-wallet')?.value;
        if(name) {
          if(name.length>50)throw Error('Назва має бути до 50 символів.');
          const found=next.wallets.find(wallet=>wallet.name.toLocaleLowerCase('uk-UA')===name.toLocaleLowerCase('uk-UA'));
          walletId=found?.id||crypto.randomUUID();
          if(!found)next.wallets.push({id:walletId,name});
        }
        if(!walletId)throw Error('Виберіть або назвіть гаманець.');
        decision.walletId=walletId;
        decision.received=amount($('review-received').value);
        if(decision.received>-row.amount)throw Error('Отримана готівка не може перевищувати списання банку.');
      }
      if (kind.value==='transfer') {
        const candidate=candidates.find(item=>R.key(item.accountId,item.rowId)===$('review-pair').value);
        if(!candidate)throw Error('Виберіть відповідну операцію.');
        const pairKey=R.key(candidate.accountId,candidate.rowId);
        if(next.decisions[pairKey])throw Error('Цю операцію вже використано. Оновіть позначку.');
        decision.pairKey=pairKey;
        next.decisions[pairKey]={...decision,accountId:candidate.accountId,rowId:candidate.rowId,amount:candidate.amount,time:candidate.time,pairKey:key};
      }
      next.decisions[key]=decision;
      save(next);
    };
    $('review-dialog').showModal();
  }
  function removePair(next,key) {
    const existing=next.decisions[key];
    if(existing?.pairKey&&next.decisions[existing.pairKey]?.pairKey===key)delete next.decisions[existing.pairKey];
    delete next.decisions[key];
  }
  function removeDecision(key) {
    try {
      const next=clone();removePair(next,key);save(next);
      renderStatement();renderWallets();status('Позначку скасовано.');
    } catch (_) { status('Готівку з цієї операції вже використано. Спочатку скасуйте відповідні дії в історії готівки.',true); }
  }
  function renderWallets() {
    const balances=R.walletBalances(state);
    $('wallets').replaceChildren();
    if(!state.wallets.length)$('wallets').append(node('p','Додайте гаманець або підтвердьте зняття готівки.','note'));
    for(const wallet of state.wallets) {
      const row=node('div',undefined,'wallet-row'), amounts=Object.entries(balances[wallet.id]||{});
      const values=node('span');
      for(const [currency,value] of amounts) values.append(node('div',money(value,Number(currency))));
      if(!amounts.length)values.textContent='Поки порожньо';
      row.append(node('b',wallet.name),values);$('wallets').append(row);
    }
    $('cash-history').replaceChildren();
    const events=[...state.exchanges.map(entry=>({...entry,type:'exchange'})),...state.cashExpenses.map(entry=>({...entry,type:'expense'}))]
      .sort((a,b)=>b.time-a.time);
    for(const event of events) {
      const wallet=state.wallets.find(wallet=>wallet.id===event.walletId);
      const row=node('div',undefined,'ledger-item');
      row.append(node('p',wallet.name+' · '+(event.type==='exchange'?money(event.sent,event.fromCurrency)+' → '+money(event.received,event.toCurrency):'Витрата '+money(event.amount,event.currencyCode))));
      row.append(button('Скасувати',()=>{
        try {
          const next=clone(), list=event.type==='exchange'?'exchanges':'cashExpenses';
          next[list]=next[list].filter(item=>item.id!==event.id);save(next);
          renderWallets();status('Дію скасовано.');
        } catch (_) { status('Ці гроші вже використано пізніше. Спочатку скасуйте наступні дії.',true); }
      }));
      $('cash-history').append(row);
    }
    if(!events.length)$('cash-history').append(node('p','Обмінів і витрат поки немає.','note'));
  }
  $('add-wallet').addEventListener('click',()=>{
    beginDialog('Новий готівковий гаманець');
    field('wallet-name','Назва','text','Гаманець');
    editAction=()=>{
      const name=$('wallet-name').value.trim();
      if(!name||name.length>50)throw Error('Вкажіть назву до 50 символів.');
      const next=clone();
      if(next.wallets.some(wallet=>wallet.name.toLocaleLowerCase('uk-UA')===name.toLocaleLowerCase('uk-UA')))throw Error('Такий гаманець уже є.');
      next.wallets.push({id:crypto.randomUUID(),name});save(next);
    };
    $('review-dialog').showModal();
  });
  function cashForm(exchange) {
    if(!state.wallets.length){status('Спочатку додайте гаманець і підтвердьте отримання готівки.',true);return;}
    beginDialog(exchange?'Обмін готівки':'Витрата готівкою');
    const balances=R.walletBalances(state);
    const wallet=select('cash-wallet','Гаманець',state.wallets.map(wallet=>[wallet.id,wallet.name]));
    const currency=select('cash-from',exchange?'Віддаю':'Валюта',[]);
    const available=node('p','', 'note');$('dialog-fields').append(available);
    function update() {
      const values=Object.entries(balances[wallet.value]||{}).filter(([,value])=>value>0);
      currency.replaceChildren(...values.map(([code])=>{const option=node('option',codes[code]||code);option.value=code;return option;}));
      showAvailable();
    }
    function showAvailable(){available.textContent='У гаманці: '+money(balances[wallet.value]?.[currency.value]||0,Number(currency.value));}
    wallet.addEventListener('change',update);currency.addEventListener('change',showAvailable);update();
    field('cash-sent',exchange?'Скільки віддали?':'Скільки витратили?');
    if(exchange) {
      select('cash-to','Отримую',Object.entries(codes).map(([code,label])=>[code,label]),'840');
      field('cash-received','Скільки отримали?');
    }
    editAction=()=>{
      const next=clone(), common={id:crypto.randomUUID(),walletId:wallet.value,time:Math.floor(Date.now()/1000)};
      if(!currency.value)throw Error('У гаманці немає грошей для цієї операції.');
      if(exchange){
        const to=Number($('cash-to').value);
        if(to===Number(currency.value))throw Error('Виберіть іншу валюту для обміну.');
        next.exchanges.push({...common,fromCurrency:Number(currency.value),toCurrency:to,sent:amount($('cash-sent').value),received:amount($('cash-received').value)});
      } else next.cashExpenses.push({...common,currencyCode:Number(currency.value),amount:amount($('cash-sent').value)});
      save(next);
    };
    $('review-dialog').showModal();
  }
  $('exchange').addEventListener('click',()=>cashForm(true));
  $('cash-expense').addEventListener('click',()=>cashForm(false));
  $('close-dialog').addEventListener('click',()=>{$('review-dialog').close();editAction=null;});
  $('review-dialog').addEventListener('cancel',()=>{editAction=null;});
  $('review-form').addEventListener('submit',event=>{
    event.preventDefault();
    try {
      if(!editAction)return;
      editAction();editAction=null;$('review-dialog').close();
      renderStatement();renderWallets();status('Збережено в цьому браузері.');
    } catch(error){$('dialog-error').textContent=error.message;}
  });
  $('demo').addEventListener('click',()=>{
    generation++;controller?.abort();token='';
    const now=Math.floor(Date.now()/1000);
    const client={clientId:'demo',accounts:[
      {id:'demo-fop',type:'fop',label:'ФОП',balance:100000,currencyCode:980},
      {id:'demo-card',type:'black',label:'Картка для спільних витрат',balance:700000,currencyCode:980}
    ]};
    statements=new Map([
      ['demo-fop',{from:now-30*86400,to:now,rows:[{id:'fop-transfer',amount:-5000000,time:now-600,description:'Переказ на власну картку'}]}],
      ['demo-card',{from:now-30*86400,to:now,rows:[
        {id:'card-transfer',amount:5000000,time:now-595,description:'Надходження з ФОП'},
        {id:'atm',amount:-5000000,time:now-400,mcc:6011,description:'Зняття готівки'},
        {id:'groceries',amount:-100000,time:now-200,mcc:5411,description:'Продукти'}
      ]}]
    ]);
    activate(client,true);
  });
  function disconnect() {
    generation++;controller?.abort();token='';accounts=[];statements.clear();demo=false;state=null;storageKey=null;
    clearTimeout(cooldownTimer);editAction=null;
    if($('review-dialog').open)$('review-dialog').close();
    $('dialog-fields').replaceChildren();$('dialog-error').textContent='';
    $('token').value='';$('account').replaceChildren();
    for(const id of ['balance','credit','checked'])$(id).textContent='';
    $('wallets').replaceChildren();$('cash-history').replaceChildren();clearStatement();
    $('connected').hidden=true;$('connect-form').hidden=false;$('demo').hidden=false;$('connect').disabled=true;
    status('Відключено. Ваші позначки збережені в цьому браузері.');
  }
  $('disconnect').addEventListener('click',disconnect);
  window.addEventListener('pagehide',disconnect);
})();
