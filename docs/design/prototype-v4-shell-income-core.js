/* Pure recurring-income calendar. Persistence belongs to the caller.
 * Monthly dates always use the original firstDate day, including after short months.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.IncomeSchedule = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DAY = 86400000;
  const intervals = new Set(['daily', 'weekly', 'monthly', 'custom']);
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const owns = (object, property) => Object.prototype.hasOwnProperty.call(object, property);

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function dateValue(value) {
    assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'Вкажіть дату у форматі РРРР-ММ-ДД.');
    const date = new Date(value + 'T12:00:00Z');
    assert(Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value, 'Некоректна дата регулярного доходу.');
    return date;
  }

  function dateText(date) {
    const result = date.toISOString().slice(0, 10);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(result), 'Наступна дата виходить за підтримуваний календар.');
    return result;
  }

  function validateCalendar(schedule) {
    assert(record(schedule) && intervals.has(schedule.interval), 'Оберіть періодичність доходу.');
    dateValue(schedule.firstDate);
    if (schedule.effectiveFrom !== undefined) dateValue(schedule.effectiveFrom);
    if (schedule.interval === 'custom' || schedule.days !== undefined) {
      assert(Number.isSafeInteger(schedule.days) && schedule.days >= 1 && schedule.days <= 3650, 'Кількість днів має бути цілим числом від 1 до 3650.');
    }
  }

  function validate(schedule, engine, store) {
    validateCalendar(schedule);
    assert(typeof schedule.id === 'string' && schedule.id.length > 0 && schedule.id.length <= 1000, 'Некоректний ідентифікатор розкладу.');
    assert(typeof schedule.account === 'string' && schedule.account.length > 0, 'Оберіть рахунок для зарахування.');
    assert(typeof schedule.name === 'string' && schedule.name.trim().length > 0 && schedule.name.length <= 200, 'Вкажіть назву доходу.');
    assert(Number.isSafeInteger(schedule.amount) && schedule.amount > 0, 'Сума доходу має бути додатною та в межах підтримуваної точності.');
    assert(typeof schedule.active === 'boolean', 'Некоректний стан розкладу.');
    assert(engine && typeof engine.project === 'function' && record(store) && record(store.rates), 'Потрібен стан фінансового застосунку.');
    for (const currency of [schedule.sourceCurrency, schedule.currency]) {
      assert(typeof currency === 'string' && /^[A-Z][A-Z0-9]{1,9}$/.test(currency), 'Оберіть валюту доходу та валюту зарахування.');
      assert(owns(store.rates, currency) && Number.isFinite(store.rates[currency]) && store.rates[currency] > 0, 'Для валюти ' + currency + ' потрібен збережений курс.');
    }
    const account = engine.project(store).accounts.find(item => item.id === schedule.account);
    assert(account && !account.deleted && !account.archived, 'Рахунок для регулярного доходу має бути активним.');
    const converted = Math.round(schedule.amount * store.rates[schedule.sourceCurrency] / store.rates[schedule.currency]);
    assert(Number.isSafeInteger(converted) && converted > 0, 'Сума після конвертації має бути додатною та в межах підтримуваної точності.');
    return schedule;
  }

  function monthlyOccurrence(anchor, offset) {
    const date = new Date(anchor.getTime());
    date.setUTCDate(1);
    date.setUTCMonth(anchor.getUTCMonth() + offset);
    const last = new Date(date.getTime());
    last.setUTCMonth(last.getUTCMonth() + 1);
    last.setUTCDate(0);
    date.setUTCDate(Math.min(anchor.getUTCDate(), last.getUTCDate()));
    return dateText(date);
  }

  function nextDate(schedule, afterDate) {
    validateCalendar(schedule);
    const anchor = dateValue(schedule.firstDate), after = dateValue(afterDate);
    if (afterDate < schedule.firstDate) return schedule.firstDate;
    if (schedule.interval === 'monthly') {
      let offset = (after.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + after.getUTCMonth() - anchor.getUTCMonth();
      let candidate = monthlyOccurrence(anchor, offset);
      if (candidate <= afterDate) candidate = monthlyOccurrence(anchor, ++offset);
      return candidate;
    }
    const days = schedule.interval === 'daily' ? 1 : schedule.interval === 'weekly' ? 7 : schedule.days;
    const step = days * DAY;
    const count = Math.floor((after.getTime() - anchor.getTime()) / step) + 1;
    return dateText(new Date(anchor.getTime() + count * step));
  }

  function occurrenceKey(scheduleId, scheduledFor) {
    return JSON.stringify([scheduleId, scheduledFor]);
  }

  function applyDue(engine, store, cutoff) {
    dateValue(cutoff);
    assert(engine && typeof engine.project === 'function' && typeof engine.append === 'function', 'Потрібне фінансове ядро.');
    assert(record(store) && Array.isArray(store.events), 'Некоректний стан фінансового застосунку.');
    assert(store.incomeSchedules === undefined || Array.isArray(store.incomeSchedules), 'Некоректний список регулярних доходів.');
    const schedules = store.incomeSchedules || [];
    const processed = new Set(), latest = new Map(), scheduleIds = new Set();
    // A voided occurrence stays processed. Cancellation must not trigger a new income.
    for (const event of store.events) {
      if (event.type !== 'income' || typeof event.scheduleId !== 'string' || !event.scheduledFor) continue;
      dateValue(event.scheduledFor);
      processed.add(occurrenceKey(event.scheduleId, event.scheduledFor));
      if (!latest.has(event.scheduleId) || event.scheduledFor > latest.get(event.scheduleId)) latest.set(event.scheduleId, event.scheduledFor);
    }
    const projected = engine.project(store), pending = [];
    for (const [index, schedule] of schedules.entries()) {
      assert(record(schedule) && typeof schedule.id === 'string' && schedule.id.length > 0 && typeof schedule.active === 'boolean', 'Некоректний розклад доходу.');
      assert(!scheduleIds.has(schedule.id), 'Ідентифікатори розкладів доходу повторюються.');
      scheduleIds.add(schedule.id);
      if (!schedule.active) continue;
      const account = projected.accounts.find(item => item.id === schedule.account);
      if (account && (account.deleted || account.archived)) continue;
      validate(schedule, engine, store);
      let due = schedule.firstDate;
      const lastProcessed = latest.get(schedule.id);
      if (lastProcessed && lastProcessed >= due) due = nextDate(schedule, lastProcessed);
      if (schedule.effectiveFrom && due < schedule.effectiveFrom) {
        const previous = new Date(dateValue(schedule.effectiveFrom).getTime() - DAY);
        due = nextDate(schedule, dateText(previous));
      }
      while (due <= cutoff) {
        if (!processed.has(occurrenceKey(schedule.id, due))) {
          assert(pending.length < 1000, 'Накопичилось понад 1000 зарахувань. Зменште період або перенесіть початок застосування розкладу.');
          pending.push({ schedule, due, index });
        }
        if (due === cutoff) break;
        due = nextDate(schedule, due);
      }
    }
    pending.sort((a, b) => a.due.localeCompare(b.due) || a.index - b.index);
    let next = JSON.parse(JSON.stringify(store));
    for (const { schedule, due } of pending) {
      const amount = Math.round(schedule.amount * store.rates[schedule.sourceCurrency] / store.rates[schedule.currency]);
      const account = engine.project(next).accounts.find(item => item.id === schedule.account);
      assert(Number.isSafeInteger((account.balances[schedule.currency] || 0) + amount), 'Залишок після зарахування перевищує підтримувану точність.');
      next = engine.append(next, {
        type: 'income', account: schedule.account, date: due,
        scheduleId: schedule.id, scheduledFor: due,
        amount, currency: schedule.currency,
        sourceAmount: schedule.amount, sourceCurrency: schedule.sourceCurrency,
        autoConverted: schedule.sourceCurrency !== schedule.currency,
        note: schedule.name.trim()
      });
    }
    return next;
  }

  return { validate, nextDate, applyDue };
});

