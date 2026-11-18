/* Personal monobank preview. Token and responses stay in page memory. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const currencyCodes = {980:'UAH',840:'USD',978:'EUR',826:'GBP',985:'PLN'};
  const accountNames = {black:'Чорна картка',white:'Біла картка',platinum:'Platinum',iron:'Iron',fop:'ФОП',yellow:'Дитяча картка',eAid:'єПідтримка'};
  let token = '', accounts = [], controller, generation = 0;
  let statementAfter = 0, clientAfter = 0, cooldownTimer;
  function money(value, code) {
    const number = (value / 100).toLocaleString('uk-UA',{minimumFractionDigits:2,maximumFractionDigits:2});
    return number + ' ' + (currencyCodes[code] || 'код ' + code);
  }
  function status(message, error = false) {
    $('status').textContent = message;
    $('status').classList.toggle('error',error);
  }
  function clearStatement() {
    $('operations').replaceChildren();
    for (const id of ['income','outgoing','period']) $(id).textContent = '';
    $('statement-summary').hidden = true;
  }
  function selectedAccount() {
    return accounts.find(account => account.id === $('account').value);
  }
  function updateCooldown() {
    clearTimeout(cooldownTimer);
    const seconds = Math.max(0,Math.ceil((statementAfter - Date.now()) / 1000));
    $('statement').disabled = seconds > 0;
    $('statement').textContent = seconds ? 'Наступний запит через ' + seconds + ' с' : 'Показати операції за 30 днів';
    if (seconds && token) cooldownTimer = setTimeout(updateCooldown,1000);
  }
  function showAccount() {
    controller?.abort();
    generation++;
    clearStatement();
    const account = selectedAccount();
    if (!account) return;
    $('balance').textContent = money(account.balance,account.currencyCode);
    $('credit').textContent = account.creditLimit > 0
      ? 'Кредитний ліміт: ' + money(account.creditLimit,account.currencyCode) + '. Банківський залишок може включати кредитні кошти.' : '';
    status('');
    updateCooldown();
  }
  async function request(path, activeToken) {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    const timeout = setTimeout(() => current.abort(),20000);
    try {
      const response = await fetch('https://api.monobank.ua' + path,{
        method:'GET',headers:{'X-Token':activeToken},signal:current.signal,
        credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',redirect:'error'
      });
      if (!response.ok) {
        if (response.status === 429) throw Error('Забагато запитів. Зачекайте хвилину й спробуйте ще раз.');
        if (response.status === 401 || response.status === 403) {
          if (token) {
            token = ''; accounts = []; clearStatement();
            $('connected').hidden = true; $('connect-form').hidden = false;
          }
          throw Error('Банк не прийняв токен. Перевірте його або створіть новий.');
        }
        throw Error('monobank зараз не відповідає. Спробуйте пізніше.');
      }
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') throw Error('Запит перервано або банк відповідає надто довго. Спробуйте ще раз.');
      if (error instanceof TypeError) throw Error('Не вдалося з’єднатися з monobank. Перевірте інтернет. Браузер також міг заблокувати прямий запит.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  $('token').addEventListener('input',() => { $('connect').disabled = !$('token').value.trim(); });
  $('connect').disabled = true;
  $('connect-form').addEventListener('submit',async event => {
    event.preventDefault();
    const provided = $('token').value.trim();
    if (!provided) return;
    if (Date.now() < clientAfter) { status('Зачекайте хвилину між спробами підключення.',true); return; }
    const version = ++generation;
    $('token').value = '';
    $('connect').disabled = true;
    clientAfter = Date.now() + 60000;
    status('Підключаємося до monobank…');
    try {
      const client = await request('/personal/client-info',provided);
      if (version !== generation) return;
      const all = [...(Array.isArray(client.accounts)?client.accounts:[]),
        ...(Array.isArray(client.managedClients)?client.managedClients:[]).flatMap(client=>Array.isArray(client.accounts)?client.accounts:[])];
      accounts = [...new Map(all.filter(account => typeof account.id === 'string' && Number.isSafeInteger(account.balance) && Number.isInteger(account.currencyCode))
        .map(account => [account.id,account])).values()];
      if (!accounts.length) throw Error('Банк не повернув доступних рахунків.');
      token = provided;
      $('account').replaceChildren(...accounts.map(account => {
        const option = document.createElement('option');
        option.value = account.id;
        const card = account.maskedPan?.[0];
        option.textContent = (accountNames[account.type] || 'Рахунок') + (card?' · '+card:'') + ' · ' + (currencyCodes[account.currencyCode] || account.currencyCode);
        return option;
      }));
      $('connect-form').hidden = true;
      $('connected').hidden = false;
      $('checked').textContent = 'Оновлено ' + new Date().toLocaleString('uk-UA');
      showAccount();
      status('Підключено. Виберіть рахунок і перегляньте операції.');
    } catch (error) {
      if (version === generation) status(error.message,true);
    }
  });
  $('account').addEventListener('change',showAccount);
  $('statement').addEventListener('click',async () => {
    const account = selectedAccount();
    if (!token || !account || Date.now() < statementAfter) return;
    const version = ++generation;
    const to = Math.floor(Date.now()/1000), from = to - 30*86400;
    statementAfter = Date.now()+60000;
    updateCooldown();
    clearStatement();
    status('Завантажуємо операції…');
    try {
      const rows = await request('/personal/statement/'+encodeURIComponent(account.id)+'/'+from+'/'+to,token);
      if (version !== generation) return;
      if (!Array.isArray(rows)) throw Error('Банк повернув неочікувану відповідь. Спробуйте пізніше.');
      let income = 0, outgoing = 0;
      const entries = [...new Map(rows.filter(row=>typeof row.id==='string'&&Number.isSafeInteger(row.amount)&&Number.isFinite(row.time))
        .map(row=>[row.id,row])).values()].sort((a,b)=>b.time-a.time);
      const nodes = entries.map(row => {
        if (row.amount > 0) income += row.amount;
        else outgoing -= row.amount;
        const item = document.createElement('div');
        item.className = 'row';
        const description = document.createElement('span');
        description.textContent = row.description || 'Операція';
        const date = document.createElement('small');
        date.textContent = new Date(row.time*1000).toLocaleString('uk-UA') + (row.hold?' · В обробці':'');
        description.append(date);
        const value = document.createElement('b');
        value.textContent = (row.amount>0?'+':'') + money(row.amount,account.currencyCode);
        item.append(description,value);
        return item;
      });
      $('income').textContent = money(income,account.currencyCode);
      $('outgoing').textContent = money(outgoing,account.currencyCode);
      $('period').textContent = new Date(from*1000).toLocaleDateString('uk-UA') + ' — ' + new Date(to*1000).toLocaleDateString('uk-UA');
      $('statement-summary').hidden = false;
      $('operations').replaceChildren(...nodes);
      status(entries.length?'Операції завантажено.':'За цей період операцій немає.');
    } catch (error) { if (version === generation) status(error.message,true); }
  });
  function disconnect() {
    generation++;
    controller?.abort();
    token = '';
    accounts = [];
    clearTimeout(cooldownTimer);
    $('token').value = '';
    $('account').replaceChildren();
    $('balance').textContent = '';
    $('credit').textContent = '';
    $('checked').textContent = '';
    clearStatement();
    $('connected').hidden = true;
    $('connect-form').hidden = false;
    $('connect').disabled = true;
    status('Відключено.');
  }
  $('disconnect').addEventListener('click',disconnect);
  window.addEventListener('pagehide',disconnect);
})();
