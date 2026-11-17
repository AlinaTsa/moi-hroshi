/* Prototype v3: synthetic data only. Independent of money-mini-v1.
 * Money: integer minor units. Rates: UAH per currency unit, for valuation only.
 * Journal replay preserves absolute balance checkpoints; later edits cannot silently
 * create negative account balances. Monthly totals replace unitemized expenses.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MoneyV3 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clone = x => JSON.parse(JSON.stringify(x));
  const live = g => g.status !== 'done' && g.status !== 'archived';
  // Keep the original demo rates. Additional currencies use an offline UAH valuation snapshot.
  // Source (CC0): https://github.com/fawazahmed0/exchange-api, 2025-11-17.
  const demoRates = {
    UAH: 1, USD: 42, EUR: 48.5, GBP: 56, PLN: 11.5, CHF: 52, CZK: 1.95, SEK: 4.4, NOK: 4.1, DKK: 6.5, JPY: 0.28, CAD: 30, AUD: 27, USDT: 42,
    AED: 11.43925, AFN: 0.6336148, ALL: 0.5052785, AMD: 0.1102596, ANG: 23.32593,
    AOA: 0.04560016, ARS: 0.02981428, AWG: 23.46964, AZN: 24.71215, BAM: 24.93154,
    BBD: 21.00533, BDT: 0.3438227, BGN: 24.93154, BHD: 111.7305, BIF: 0.01424476,
    BMD: 42.01066, BND: 32.3091, BOB: 6.078006, BRL: 7.929738, BSD: 42.01066,
    BTN: 0.4736762, BWP: 3.034732, BYN: 12.31975, BZD: 20.86916, CDF: 0.01922738,
    CLP: 0.04530394, CNY: 5.912262, COP: 0.01118563, CRC: 0.08384622, CUC: 42.01066,
    CUP: 1.75118, CVE: 0.4422042, DJF: 0.2359485, DOP: 0.6529197, DZD: 0.3231332,
    EGP: 0.8927242, ERN: 2.800711, ETB: 0.272038, FJD: 18.44047, FKP: 55.27378,
    GEL: 15.54648, GHS: 3.826142, GIP: 55.27378, GMD: 0.5733653, GNF: 0.004837206,
    GTQ: 5.482809, GYD: 0.2008936, HKD: 5.404528, HNL: 1.597065, HRK: 6.471811,
    HTG: 0.3205871, HUF: 0.1268316, IDR: 0.002515399, ILS: 13.02428, INR: 0.4736762,
    IQD: 0.03206837, IRR: 0.0009995275, ISK: 0.3307984, JMD: 0.2616525, JOD: 59.2534,
    KES: 0.324966, KGS: 0.4802833, KHR: 0.0104785, KMF: 0.09911597, KPW: 0.04667811,
    KRW: 0.02881098, KWD: 136.8969, KYD: 50.53532, KZT: 0.08014945, LAK: 0.001937817,
    LBP: 0.0004683834, LKR: 0.1372116, LRD: 0.2313749, LSL: 2.456138, LYD: 7.702032,
    MAD: 4.539555, MDL: 2.485947, MGA: 0.009387483, MKD: 0.7931289, MMK: 0.02000903,
    MNT: 0.01175108, MOP: 5.247114, MRU: 1.053483, MUR: 0.9201363, MVR: 2.719641,
    MWK: 0.02425182, MXN: 2.293241, MYR: 10.15346, MZN: 0.6573987, NAD: 2.456138,
    NGN: 0.02916036, NIO: 1.141941, NPR: 0.2959089, NZD: 23.79544, OMR: 109.1192,
    PAB: 42.01066, PEN: 12.47576, PGK: 9.945104, PHP: 0.7105427, PKR: 0.1486756,
    PYG: 0.005960931, QAR: 11.54139, RON: 9.598403, RSD: 0.4168278, RUB: 0.5189997,
    RWF: 0.02892521, SAR: 11.20284, SBD: 5.096587, SCR: 2.979465, SDG: 0.0700307,
    SGD: 32.3091, SHP: 55.27378, SLE: 1.852327, SLL: 0.001852327, SOS: 0.07321587,
    SRD: 1.089092, SSP: 0.009197284, STN: 1.973549, SVC: 4.801218, SYP: 0.003798986,
    SZL: 2.456138, THB: 1.293359, TJS: 4.550276, TMT: 11.97922, TND: 14.33715,
    TOP: 17.45491, TRY: 0.992231, TTD: 6.197605, TWD: 1.351803, TZS: 0.01725435,
    UGX: 0.01176009, UYU: 1.056344, UZS: 0.003490719, VES: 0.1780855, VND: 0.001594799,
    VUV: 0.3441463, WST: 14.95171, XAF: 0.07433698, XCD: 15.51369, XCG: 23.32593,
    XDR: 57.15743, XOF: 0.07433698, XPF: 0.4086244, YER: 0.1761451, ZAR: 2.456138,
    ZMW: 1.858925, ZWG: 1.596278, ZWL: 0.0006388372,
  };
  function seed(noGoals, now) {
    const date = now || '2026-11-13';
    return { schemaVersion: 1, date, currency: 'USD', look: 'a', calm: false,
      rates: { ...demoRates },
      base: {
        accounts: [
          { id: 'wise', name: 'Wise', type: 'bank', color: 1, balances: { USD: 1200000, EUR: 80000 }, checked: date },
          { id: 'cash', name: 'Готівка', type: 'cash', color: 2, balances: { USD: 500000 }, checked: date },
          { id: 'mono', name: 'Monobank', type: 'bank', color: 3, balances: { UAH: 42000 }, checked: date },
          { id: 'deposit', name: 'Депозит', type: 'dep', color: 4, balances: { USD: 300000 }, checked: date }
        ],
        goals: noGoals ? [] : [
          { id: 'home', name: 'Квартира', icon: 'home', currency: 'USD', target: 26000000, monthly: 100000, holdings: { USD: 500000 }, auto: true, protected: false, status: 'active' },
          { id: 'laptop', name: 'Ноутбук', icon: 'laptop', currency: 'USD', target: 50000, monthly: 16667, holdings: { USD: 20000 }, auto: true, protected: false, status: 'active' }
        ],
        salary: { account: 'wise', currency: 'USD', amount: 300000, day: 5, auto: true },
        cats: [],
      }, events: [], sequence: 0 };
  }
  function value(balances, rates) { return Object.entries(balances).reduce((sum, [c, n]) => sum + n * rates[c], 0); }
  function total(p, rates) { return p.accounts.reduce((s, a) => s + (a.deleted ? 0 : value(a.balances, rates)), 0); }
  function pool(p, rates) { return p.goals.filter(live).reduce((s, g) => s + value(g.holdings, rates), 0); }
  function free(p, rates) { return total(p, rates) - pool(p, rates); }
  function saved(g, rates) { return value(g.holdings, rates) / rates[g.currency]; }
  function eta(g, rates) { const left = Math.max(0, g.target - saved(g, rates)); return left < .5 ? 0 : g.monthly > 0 && g.status !== 'paused' ? Math.ceil(left / g.monthly) : null; }
  function checkAmount(n, zero) { if (!Number.isSafeInteger(n) || n < (zero ? 0 : 1)) throw new Error('Введіть коректну суму, не більше двох знаків після коми.'); }
  function account(p, id) { const a = p.accounts.find(x => x.id === id); if (!a) throw new Error('Рахунок не знайдено.'); if (a.deleted) throw new Error('Рахунок уже видалено. Нові операції недоступні.'); return a; }
  function goal(p, id) { const g = p.goals.find(x => x.id === id); if (!g) throw new Error('Ціль не знайдено.'); return g; }
  function change(a, c, delta) { const next = (a.balances[c] || 0) + delta; if (next < 0) throw new Error('На цьому рахунку недостатньо грошей. Перевірте суму або наступні операції.'); a.balances[c] = next; }
  function reserveFree(p, c) {
    return Math.max(0, p.accounts.reduce((s, a) => s + (a.deleted ? 0 : (a.balances[c] || 0)), 0) - p.goals.filter(live).reduce((s, g) => s + (g.holdings[c] || 0), 0));
  }
  function contribute(p, rates, g, c, amount, cap) {
    checkAmount(amount, true);
    const need = Math.max(0, (g.target - saved(g, rates)) * rates[g.currency] / rates[c]);
    const n = Math.min(amount, Math.max(0, Math.floor(need + .000001)));
    const available = Math.min(reserveFree(p, c), Math.max(0, Math.floor(free(p, rates) / rates[c] + .000001)));
    if (n > available && !cap) throw new Error('Недостатньо вільних грошей у цій валюті. Зменште внесок або змініть валюту.');
    const actual = cap ? Math.min(n, available) : n;
    g.holdings[c] = (g.holdings[c] || 0) + actual;
    return actual;
  }
  function releaseProportional(p, rates, shortage, record) {
    const eligible = p.goals.filter(g => live(g) && !g.protected && value(g.holdings, rates) > 0);
    const reserve = eligible.reduce((s, g) => s + value(g.holdings, rates), 0);
    if (shortage <= .001 || reserve <= .001) return;
    const ratio = Math.min(1, shortage / reserve);
    eligible.forEach(g => {
      const changes = {};
      Object.keys(g.holdings).forEach(c => { const n = Math.min(g.holdings[c], Math.floor(g.holdings[c] * ratio)); g.holdings[c] -= n; if (n) changes[c] = n; });
      if (Object.keys(changes).length) record.push({ goal: g.id, amounts: changes });
    });
    // Any rounding remainder goes deterministically to the largest remaining bucket.
    let remaining = shortage - record.reduce((s, r) => s + value(r.amounts, rates), 0);
    const buckets = eligible.flatMap(g => Object.keys(g.holdings).map(c => ({ g, c })));
    buckets.sort((a, b) => b.g.holdings[b.c] * rates[b.c] - a.g.holdings[a.c] * rates[a.c] || a.g.id.localeCompare(b.g.id));
    for (const { g, c } of buckets) {
      if (remaining < rates[c] - .001) continue;
      const n = Math.min(g.holdings[c], Math.floor((remaining + .001) / rates[c]));
      if (!n) continue;
      g.holdings[c] -= n; let r = record.find(x => x.goal === g.id);
      if (!r) { r = { goal: g.id, amounts: {} }; record.push(r); }
      r.amounts[c] = (r.amounts[c] || 0) + n; remaining -= n * rates[c];
    }
  }
  function cover(p, rates, record) { releaseProportional(p, rates, Math.max(0, -free(p, rates)), record); }
  function project(store) {
    const p = clone(store.base); p.history = [];
    const displayRates = store.rates;
    const activeEvents = store.events.filter(e => !e.void);
    const totals = new Map();
    for (const e of activeEvents.filter(e => e.type === 'month-total')) totals.set(e.account + '|' + e.currency + '|' + e.month, e);
    const detailTotals = {};
    activeEvents.filter(e => (e.type === 'expense' && !e.standalone) || e.type === 'purchase' || (e.type === 'balance' && e.asExpense && e.expenseAmount > 0)).forEach(e => {
      const k = e.account + '|' + e.currency + '|' + e.date.slice(0, 7);
      detailTotals[k] = (detailTotals[k] || 0) + (e.type === 'balance' ? e.expenseAmount : e.amount);
    });
    for (const [k, e] of totals) if (e.amount < (detailTotals[k] || 0)) throw new Error('Підсумок місяця менший за вже записані покупки. Спершу виправте їх або збільште підсумок.');
    const doneMonths = new Set();
    for (const raw of store.events) {
      const e = clone(raw), r = { ...e, cover: [], delta: 0 }, rates = e.rates || displayRates;
      if (e.void) { p.history.push(r); continue; }
      if (e.type === 'expense' || e.type === 'income' || e.type === 'month-total' || e.type === 'balance') {
        const a = account(p, e.account); checkAmount(e.amount, e.type !== 'expense');
        if (e.type === 'income') { change(a, e.currency, e.amount); r.delta = e.amount; }
        if (e.type === 'expense') { change(a, e.currency, -e.amount); r.delta = -e.amount; cover(p, rates, r.cover); }
        if (e.type === 'balance') {
          r.delta = e.amount - (a.balances[e.currency] || 0);
          a.balances[e.currency] = e.amount; a.checked = e.date;
          r.estimatedExpense = e.asExpense && r.delta < 0 ? -r.delta : 0;
          if (r.estimatedExpense) cover(p, rates, r.cover);
        }
        if (e.type === 'month-total') {
          const k = e.account + '|' + e.currency + '|' + e.month;
          if (totals.get(k).id === e.id) {
            r.detail = detailTotals[k] || 0; r.effective = e.amount - r.detail;
            change(a, e.currency, -r.effective); r.delta = -r.effective; cover(p, rates, r.cover);
          } else r.superseded = true;
        }
      } else if (e.type === 'transfer') {
        checkAmount(e.amount); checkAmount(e.received); checkAmount(e.fee || 0, true);
        if (e.account === e.to && e.currency === e.toCurrency) throw new Error('Оберіть інший рахунок або іншу валюту.');
        change(account(p, e.account), e.currency, -e.amount - (e.fee || 0));
        change(account(p, e.to), e.toCurrency, e.received); r.delta = -e.amount - (e.fee || 0);
        cover(p, rates, r.cover);
      } else if (e.type === 'goal-create') {
        if (p.goals.some(g => g.id === e.goal.id)) throw new Error('Ціль уже існує.');
        checkAmount(e.goal.target); checkAmount(e.goal.monthly, true); p.goals.push(clone(e.goal));
      } else if (e.type === 'goal-settings') { Object.assign(goal(p, e.goalId), e.changes); }
      else if (e.type === 'contribute') {
        const g = goal(p, e.goalId); if (!live(g)) throw new Error('Ціль уже завершена.');
        r.actual = contribute(p, rates, g, e.currency, e.amount, false);
        if (r.actual > 0 && !p.cats.includes('persist')) p.cats.push('persist');
      } else if (e.type === 'goal-release') {
        const g = goal(p, e.goalId); g.holdings = {}; g.status = 'archived';
      } else if (e.type === 'purchase') {
        const g = goal(p, e.goalId), a = account(p, e.account); checkAmount(e.amount);
        if (!live(g)) throw new Error('Ціль уже завершена. Повторна покупка недоступна.');
        const priorSaved = value(g.holdings, rates); const available = free(p, rates) + priorSaved;
        if (e.amount * rates[e.currency] > available + .001) throw new Error('Для покупки не вистачає накопичень цієї цілі та вільних грошей.');
        change(a, e.currency, -e.amount); g.holdings = {}; g.status = 'done'; r.delta = -e.amount;
        if (!p.cats.includes('first')) p.cats.push('first');
      } else if (e.type === 'account-remove') {
        const a = account(p, e.account);
        if (e.mode !== 'transfer' && e.mode !== 'remove') throw new Error('Оберіть спосіб видалення рахунку.');
        r.removedAmounts = clone(a.balances); r.removedName = a.name;
        if (e.mode === 'transfer') {
          if (e.to === e.account) throw new Error('Оберіть інший рахунок для переказу.');
          const destination = account(p, e.to);
          if (destination.archived) throw new Error('Рахунок отримання має бути активним.');
          Object.entries(a.balances).forEach(([currency, amount]) => change(destination, currency, amount));
          r.destinationName = destination.name;
        } else r.removedValue = value(a.balances, rates);
        Object.keys(a.balances).forEach(c => { a.balances[c] = 0; });
        a.deleted = true; a.archived = true; a.deletedAt = e.date;
        if (p.salary && p.salary.account === a.id) {
          p.salary = e.mode === 'transfer' ? { ...p.salary, account: e.to } : { ...p.salary, auto: false };
          r.salaryRedirected = e.mode === 'transfer'; r.salaryDisabled = e.mode === 'remove';
        }
      } else if (e.type === 'account-create') { p.accounts.push(clone(e.accountData)); }
      else if (e.type === 'account-settings') {
        const a = account(p, e.account);
        if (e.changes.archived && value(a.balances, rates) !== 0) throw new Error('Архівувати можна рахунок із нульовими залишками. Спершу переказуйте гроші.');
        if (e.changes.name !== undefined && e.changes.name !== a.name) r.previousName = a.name;
        Object.assign(a, e.changes);
      } else if (e.type === 'salary-settings') { account(p, e.salary.account); p.salary = clone(e.salary); }
      else if (e.type === 'month') {
        if (doneMonths.has(e.month)) { r.superseded = true; p.history.push(r); continue; }
        doneMonths.add(e.month);
        const s = p.salary; r.contributions = [];
        if (s && s.auto) { change(account(p, s.account), s.currency, s.amount); r.salary = clone(s); }
        const active = p.goals.filter(g => g.status === 'active' && g.auto && g.monthly > 0);
        // Same monthly run: distribute limited free funds proportionally to requests.
        const requests = active.map(g => ({ g, amount: Math.min(g.monthly, Math.max(0, Math.floor(g.target - saved(g, rates)))) }));
        const demand = requests.reduce((n, x) => n + x.amount * rates[x.g.currency], 0);
        const ratio = demand ? Math.min(1, Math.max(0, free(p, rates)) / demand) : 0;
        for (const x of requests) {
          const n = contribute(p, rates, x.g, x.g.currency, Math.floor(x.amount * ratio), true);
          if (n) r.contributions.push({ goal: x.g.id, currency: x.g.currency, amount: n });
        }
      }
      p.history.push(r);
    }
    p.months = [...doneMonths];
    return p;
  }
  function append(store, payload) {
    const next = clone(store), date = payload.date || store.date;
    if (payload.type === 'balance' && !payload.explicitEdit) { const p = project(store), a = account(p,payload.account); if (payload.currency in a.balances && a.balances[payload.currency] === payload.amount) return next; }
    if (payload.type === 'month-total') {
      const prior = next.events.filter(e => !e.void && e.type === 'month-total' && e.account === payload.account && e.currency === payload.currency && e.month === payload.month).at(-1);
      if (prior) {
        if (prior.amount === payload.amount) return next;
        const index = next.events.findIndex(e => e.id === prior.id);
        if (next.events.slice(index + 1).some(e => !e.void && e.type === 'balance' && e.account === payload.account && e.currency === payload.currency)) throw new Error('Після цього підсумку вже звіряли фактичний залишок. Оновіть його через «Залишилось»; історичний підсумок зараз захищений від повторного списання.');
        return edit(store, prior.id, { amount: payload.amount });
      }
    }
    const enriched = { ...clone(payload), rates: clone(store.rates) };
    if (payload.type === 'balance' && payload.asExpense) {
      const p = project(store), a = account(p, payload.account);
      enriched.expenseAmount = Math.max(0, (a.balances[payload.currency] || 0) - payload.amount);
      // A negative checkpoint includes its expenditure in any later monthly total.
      const month = date.slice(0, 7);
      enriched.month = month;
    }
    next.sequence += 1;
    next.events.push({ ...enriched, id: 'e' + next.sequence, date });
    project(next); return next;
  }
  function edit(store, id, changes) {
    const next = clone(store), e = next.events.find(x => x.id === id);
    if (!e) throw new Error('Операцію не знайдено.');
    const ix = next.events.indexOf(e);
    if (e.account && next.events.slice(ix + 1).some(x => !x.void && x.type === 'balance' && x.account === e.account && x.currency === e.currency)) throw new Error('Після цієї операції вже звіряли фактичний залишок. Для цього демо змініть останню звірку, щоб не переписувати залежну історію.');
    const before = {}, after = {};
    for (const key of ['amount', 'note']) {
      if (changes[key] === undefined || changes[key] === e[key]) continue;
      before[key] = e[key] ?? '';
      after[key] = changes[key];
    }
    if (Object.keys(after).length) {
      (e.revisions ??= []).push({ date: store.date, before, after });
    }
    Object.assign(e, clone(changes));
    if (e.type === 'balance' && changes.amount !== undefined && e.asExpense) {
      const prefix = clone(next); prefix.events = prefix.events.slice(0, ix);
      const a = account(project(prefix), e.account); e.expenseAmount = Math.max(0, (a.balances[e.currency] || 0) - e.amount);
    }
    project(next); return next;
  }
  function nextMonth(date) { const [y, m] = date.split('-').map(Number); return (m === 12 ? y + 1 : y) + '-' + String(m === 12 ? 1 : m + 1).padStart(2, '0') + '-05'; }
  return { seed, clone, project, append, edit, value, total, pool, free, saved, eta, reserveFree, nextMonth, live };
});
