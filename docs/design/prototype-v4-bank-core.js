/* Pure snapshot import for v4. The caller owns persistence and the engine.
 * Imported amounts are absolute own-money checkpoints in integer minor units.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.V4Bank = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const owns = (object, property) => Object.prototype.hasOwnProperty.call(object, property);
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function validateDate(value) {
    assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'Вкажіть дату перевірки залишку.');
    const date = new Date(value + 'T12:00:00Z');
    assert(Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value, 'Некоректна дата перевірки залишку.');
  }

  function balancesSnapshot(balances, rates) {
    assert(record(balances), 'Потрібні залишки за валютами.');
    const snapshot = {};
    for (const code of Object.keys(balances).sort()) {
      const amount = balances[code];
      assert(/^[A-Z][A-Z0-9]{1,9}$/.test(code), 'Некоректний код валюти.');
      assert(owns(rates, code) && Number.isFinite(rates[code]) && rates[code] > 0, 'Для валюти ' + code + ' потрібен збережений курс.');
      assert(Number.isSafeInteger(amount) && amount >= 0, 'Залишки мають бути невід’ємними цілими сумами.');
      snapshot[code] = amount;
    }
    return snapshot;
  }

  function sameBalances(left, right) {
    if (!record(left) || !record(right)) return false;
    const codes = Object.keys(left);
    return codes.length === Object.keys(right).length && codes.every(code => owns(right, code) && left[code] === right[code]);
  }

  function newAccountName(accounts, label) {
    const used = new Set(accounts.map(account => String(account.name || '').toLocaleLowerCase('uk-UA')));
    let name = label, suffix = 2;
    while (used.has(name.toLocaleLowerCase('uk-UA'))) name = label + ' (' + suffix++ + ')';
    return name;
  }

  function newAccountId(accounts, sequence) {
    const used = new Set(accounts.map(account => account.id));
    let suffix = Number.isSafeInteger(sequence) ? sequence + 1 : 1;
    while (used.has('linked-' + suffix)) suffix += 1;
    return 'linked-' + suffix;
  }

  function syncSnapshot(engine, store, input) {
    assert(engine && typeof engine.project === 'function' && typeof engine.append === 'function', 'Потрібне фінансове ядро.');
    assert(record(store) && record(store.rates) && record(input), 'Некоректний знімок рахунку.');
    assert(typeof input.sourceId === 'string' && /^(bank|cash):[^:]+:.+$/.test(input.sourceId) && input.sourceId.length <= 2000, 'Некоректний ідентифікатор джерела.');
    assert(typeof input.sourceLabel === 'string' && input.sourceLabel.trim().length > 0 && input.sourceLabel.length <= 200, 'Вкажіть назву джерела.');
    assert(input.targetId === undefined || (typeof input.targetId === 'string' && input.targetId.length > 0), 'Некоректний рахунок призначення.');
    assert(input.shared === undefined || typeof input.shared === 'boolean', 'Некоректна ознака спільного рахунку.');
    assert(input.accountType === undefined || ['bank','biz','cash'].includes(input.accountType), 'Некоректний тип рахунку.');
    assert(input.snapshotId === undefined || (typeof input.snapshotId === 'string' && input.snapshotId.length > 0 && input.snapshotId.length <= 10000), 'Некоректний знімок джерела.');
    validateDate(input.checked);
    const balances = balancesSnapshot(input.balances, store.rates);
    const sourceTotal = input.bankTotal === undefined ? { ...balances } : balancesSnapshot(input.bankTotal, store.rates);
    const sourceShared = input.shared === true;
    const sourceLabel = input.sourceLabel.trim();
    const projected = engine.project(store);
    assert(projected && Array.isArray(projected.accounts), 'Некоректний стан рахунків.');

    const linked = projected.accounts.filter(account => account.bankSource === input.sourceId);
    assert(linked.length <= 1, 'Джерело вже прив’язане до кількох рахунків.');
    let target = linked[0];
    if (target) {
      assert(input.targetId === undefined || input.targetId === target.id, 'Це джерело вже прив’язане до іншого рахунку.');
    } else if (input.targetId !== undefined) {
      target = projected.accounts.find(account => account.id === input.targetId);
      assert(target, 'Рахунок призначення не знайдено.');
      assert(!target.bankSource || target.bankSource === input.sourceId, 'Рахунок уже пов’язаний з іншим джерелом.');
    }
    if (target) assert(!target.deleted && !target.archived, 'Пов’язаний рахунок видалено або архівовано.');
    if(target && input.snapshotId && target.sourceSnapshotId === input.snapshotId) {
      const previous = record(target.sourceBalances) ? target.sourceBalances : {};
      const changed = Object.keys(previous).some(code => target.balances[code] !== previous[code]);
      assert(!changed, 'Після цієї звірки залишок уже змінювали. Оновіть дані джерела перед повторною звіркою.');
    }


    // Every engine append receives this local clone. A failed leg returns no partial store.
    let next = JSON.parse(JSON.stringify(store));
    if (!target) {
      target = {
        id: newAccountId(projected.accounts, store.sequence),
        name: newAccountName(projected.accounts, sourceLabel),
        type: input.accountType || (input.sourceId.startsWith('cash:') ? 'cash' : 'bank'),
        color: input.sourceId.startsWith('cash:') ? 2 : 1,
        balances: { ...balances },
        checked: input.checked
      };
      next = engine.append(next, { type: 'account-create', accountData: target, date: input.checked });
    } else {
      const previousSource = record(target.sourceBalances) ? target.sourceBalances : {};
      const managedCodes = new Set([...Object.keys(previousSource), ...Object.keys(balances)]);
      for (const code of [...managedCodes].sort()) {
        const amount = owns(balances, code) ? balances[code] : 0;
        if (owns(target.balances, code) && target.balances[code] === amount) continue;
        next = engine.append(next, {
          type: 'balance', account: target.id, currency: code, amount,
          asExpense: false, date: input.checked, note: 'Оновлення з ' + sourceLabel
        });
      }
    }

    const metadataChanged = target.bankSource !== input.sourceId
      || !sameBalances(target.sourceBalances, balances)
      || target.sourceChecked !== input.checked
      || target.sourceShared !== sourceShared
      || !sameBalances(target.sourceTotal, sourceTotal)
      || (input.snapshotId !== undefined && target.sourceSnapshotId !== input.snapshotId);
    if (metadataChanged) {
      next = engine.append(next, {
        type: 'account-settings', account: target.id, date: input.checked,
        changes: {
          bankSource: input.sourceId,
          ...(input.snapshotId === undefined ? {} : { sourceSnapshotId: input.snapshotId }),
          sourceBalances: { ...balances },
          sourceChecked: input.checked,
          sourceShared,
          sourceTotal: { ...sourceTotal }
        }
      });
    }
    return next;
  }

  return { syncSnapshot };
});
