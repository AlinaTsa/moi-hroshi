/* Pure review and cash-ledger functions. Amounts use integer minor units.
 * Equal timestamps replay in input order, with withdrawals before exchanges and expenses.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MonoReview = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const kinds = new Set(['income', 'expense', 'transfer', 'cash', 'contribution']);
  const owns = (object, property) => Object.prototype.hasOwnProperty.call(object, property);
  function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function id(value) { return typeof value === 'string' && value.length > 0 && value.length <= 1000; }
  function integer(value, minimum = 0) { return Number.isSafeInteger(value) && value >= minimum; }
  function currency(value) { return integer(value, 1) && value <= 999; }
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function key(accountId, rowId) {
    assert(id(accountId) && id(rowId), 'Потрібні ідентифікатори рахунку та операції.');
    return JSON.stringify([accountId, rowId]);
  }
  function decisionAt(decisions, accountId, rowId) {
    const entry = key(accountId, rowId);
    return record(decisions) && owns(decisions, entry) ? decisions[entry] : null;
  }
  function confirmed(decision) { return record(decision) && kinds.has(decision.kind) && decision.confirmed !== false; }
  function shareValid(decision) { return integer(decision.ownShareBasisPoints) && decision.ownShareBasisPoints <= 10000; }
  function scopeValid(decision) { return decision.scope === 'personal' || decision.scope === 'shared'; }
  function cashValid(decision) {
    return decision.scope === 'personal' && id(decision.walletId) && id(decision.accountId) && id(decision.rowId)
      && currency(decision.currencyCode) && Number.isSafeInteger(decision.amount) && decision.amount < 0
      && integer(decision.received, 1) && decision.received <= -decision.amount && integer(decision.time);
  }
  function transferCandidates(account, row, accounts, statements, decisions = {}) {
    assert(record(account) && id(account.id) && currency(account.currencyCode), 'Некоректний рахунок.');
    assert(record(row) && id(row.id) && Number.isSafeInteger(row.amount) && integer(row.time), 'Некоректна операція.');
    assert(Array.isArray(accounts) && statements && typeof statements.get === 'function', 'Потрібні рахунки та виписки.');
    if (row.hold || row.amount === 0 || confirmed(decisionAt(decisions, account.id, row.id))) return [];
    const candidates = [], seen = new Set();
    for (const other of accounts) {
      if (!record(other) || !id(other.id) || other.id === account.id || other.currencyCode !== account.currencyCode || other.ownerId !== account.ownerId) continue;
      const rows = statements.get(other.id);
      if (!Array.isArray(rows)) continue;
      for (const candidate of rows) {
        if (!record(candidate) || !id(candidate.id) || !integer(candidate.time) || !Number.isSafeInteger(candidate.amount) || candidate.hold) continue;
        if (candidate.amount !== -row.amount || Math.abs(candidate.time - row.time) > 3 * 86400) continue;
        const candidateKey = key(other.id, candidate.id);
        if (seen.has(candidateKey) || confirmed(decisionAt(decisions, other.id, candidate.id))) continue;
        seen.add(candidateKey);
        candidates.push({ accountId: other.id, rowId: candidate.id, amount: candidate.amount, time: candidate.time });
      }
    }
    return candidates.sort((a, b) => Math.abs(a.time - row.time) - Math.abs(b.time - row.time) || a.time - b.time || a.accountId.localeCompare(b.accountId) || a.rowId.localeCompare(b.rowId));
  }
  function addSafe(left, right) {
    const result = left + right;
    assert(Number.isSafeInteger(result), 'Сума перевищує підтримувану точність.');
    return result;
  }
  function ownExpense(amount, basisPoints) {
    // Split before multiplying so safe integer amounts stay exact near MAX_SAFE_INTEGER.
    return Math.floor(amount / 10000) * basisPoints + Math.floor((amount % 10000) * basisPoints / 10000);
  }
  function summarize(accountId, rows, decisions = {}) {
    assert(id(accountId) && Array.isArray(rows), 'Потрібен рахунок та його виписка.');
    const result = { income: 0, expense: 0, unreviewed: 0, held: 0 }, seen = new Set();
    for (const row of rows) {
      assert(record(row) && id(row.id) && Number.isSafeInteger(row.amount), 'Некоректна операція у виписці.');
      const rowKey = key(accountId, row.id);
      if (seen.has(rowKey)) continue;
      seen.add(rowKey);
      if (row.hold) { result.held += 1; continue; }
      const decision = decisionAt(decisions, accountId, row.id);
      if (!confirmed(decision) || (decision.amount !== undefined && decision.amount !== row.amount)) { result.unreviewed += 1; continue; }
      if (decision.kind === 'income' && row.amount > 0 && scopeValid(decision)) {
        if (decision.scope === 'personal') result.income = addSafe(result.income, row.amount);
      } else if (decision.kind === 'expense' && row.amount < 0 && scopeValid(decision)) {
        if (decision.scope === 'shared' && !shareValid(decision)) { result.unreviewed += 1; continue; }
        result.expense = addSafe(result.expense, decision.scope === 'personal' ? -row.amount : ownExpense(-row.amount, decision.ownShareBasisPoints));
      } else if (decision.kind === 'cash' && cashValid(decision) && decision.amount === row.amount) {
        result.expense = addSafe(result.expense, -row.amount - decision.received);
      } else if (decision.kind !== 'transfer' && !(decision.kind === 'contribution' && scopeValid(decision))) result.unreviewed += 1;
    }
    return result;
  }
  function validateShape(state) {
    assert(record(state) && Array.isArray(state.wallets) && record(state.decisions) && Array.isArray(state.exchanges) && Array.isArray(state.cashExpenses), 'Некоректний формат збереженого перегляду.');
    const walletIds = new Set();
    for (const wallet of state.wallets) {
      assert(record(wallet) && id(wallet.id) && typeof wallet.name === 'string' && wallet.name.trim().length > 0 && wallet.name.length <= 200, 'Некоректний готівковий гаманець.');
      assert(!walletIds.has(wallet.id), 'Ідентифікатори гаманців повторюються.');
      walletIds.add(wallet.id);
    }
    for (const [entry, decision] of Object.entries(state.decisions)) {
      let parsed;
      try { parsed = JSON.parse(entry); } catch (_) { throw new Error('Некоректний ключ рішення.'); }
      assert(Array.isArray(parsed) && parsed.length === 2 && id(parsed[0]) && id(parsed[1]) && key(parsed[0], parsed[1]) === entry, 'Некоректний ключ рішення.');
      assert(record(decision) && kinds.has(decision.kind) && decision.confirmed !== false, 'Некоректне рішення щодо операції.');
      if (decision.accountId !== undefined) assert(decision.accountId === parsed[0], 'Рішення належить іншому рахунку.');
      if (decision.rowId !== undefined) assert(decision.rowId === parsed[1], 'Рішення належить іншій операції.');
      if (decision.kind === 'income' || decision.kind === 'expense' || decision.kind === 'contribution') {
        assert(scopeValid(decision), 'Вкажіть особисту або спільну операцію.');
        if (decision.scope === 'shared' && decision.kind === 'expense') assert(shareValid(decision), 'Некоректна частка спільних витрат.');
      }
      if (decision.kind === 'cash') assert(cashValid(decision) && walletIds.has(decision.walletId), 'Некоректне зняття готівки.');
    }
    for (const [collection, type] of [[state.exchanges, 'exchange'], [state.cashExpenses, 'expense']]) {
      const actionIds = new Set();
      for (const action of collection) {
        assert(record(action) && id(action.id) && walletIds.has(action.walletId) && integer(action.time), 'Некоректний запис готівки.');
        assert(!actionIds.has(action.id), 'Ідентифікатори готівкових записів повторюються.'); actionIds.add(action.id);
        if (type === 'exchange') assert(currency(action.fromCurrency) && currency(action.toCurrency) && action.fromCurrency !== action.toCurrency && integer(action.sent, 1) && integer(action.received, 1), 'Некоректний обмін готівки.');
        else assert(currency(action.currencyCode) && integer(action.amount, 1), 'Некоректна витрата готівки.');
      }
    }
  }
  function walletBalances(state) {
    validateShape(state);
    const balances = {};
    for (const wallet of state.wallets) Object.defineProperty(balances, wallet.id, { value: {}, enumerable: true, writable: true });
    const actions = [];
    Object.values(state.decisions).filter(decision => decision.kind === 'cash').forEach(decision => actions.push({ time: decision.time, walletId: decision.walletId, changes: [[decision.currencyCode, decision.received]], order: actions.length }));
    state.exchanges.forEach(action => actions.push({ time: action.time, walletId: action.walletId, changes: [[action.fromCurrency, -action.sent], [action.toCurrency, action.received]], order: actions.length }));
    state.cashExpenses.forEach(action => actions.push({ time: action.time, walletId: action.walletId, changes: [[action.currencyCode, -action.amount]], order: actions.length }));
    actions.sort((a, b) => a.time - b.time || a.order - b.order);
    for (const action of actions) {
      const wallet = balances[action.walletId];
      for (const [code, delta] of action.changes) {
        const next = addSafe(wallet[code] || 0, delta);
        assert(next >= 0, 'У готівковому гаманці недостатньо коштів на дату операції.');
        wallet[code] = next;
      }
    }
    return balances;
  }
  function validateState(state) { walletBalances(state); return state; }
  return { key, transferCandidates, walletBalances, validateState, summarize };
});
