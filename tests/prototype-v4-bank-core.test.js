'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const E = require('../docs/design/prototype-v4-core.js');
const Bank = require('../docs/design/prototype-v4-bank-core.js');

function fixture() {
  const store = E.seed(true,'2026-11-19');
  store.base.accounts = [{id:'manual',name:'Картка',type:'bank',balances:{UAH:10000,USD:20000}}];
  store.base.goals = [{id:'goal',name:'Резерв',currency:'USD',target:100000,monthly:1000,holdings:{USD:5000},status:'active'}];
  store.base.salary = null;
  return store;
}
const snapshot = {
  sourceId:'bank:synthetic-client:card',sourceLabel:'Monobank',targetId:'manual',
  balances:{UAH:50000},bankTotal:{UAH:100000},shared:true,checked:'2026-11-19'
};
test('snapshot maps an existing account without duplicating money or changing goals',() => {
  const original = fixture(), raw = JSON.stringify(original);
  const next = Bank.syncSnapshot(E,original,snapshot);
  const projected = E.project(next);
  assert.equal(projected.accounts.length,1);
  assert.deepEqual(projected.accounts[0].balances,{UAH:50000,USD:20000});
  assert.deepEqual(projected.goals,E.project(original).goals);
  assert.equal(JSON.stringify(original),raw);
  assert.deepEqual(Bank.syncSnapshot(E,next,snapshot),next);
});
test('a source cannot be linked twice and a failed snapshot leaves input intact',() => {
  const initial = Bank.syncSnapshot(E,fixture(),snapshot);
  const raw = JSON.stringify(initial);
  assert.throws(() => Bank.syncSnapshot(E,initial,{...snapshot,targetId:'different'}));
  assert.throws(() => Bank.syncSnapshot(E,initial,{...snapshot,balances:{UAH:-1}}));
  assert.equal(JSON.stringify(initial),raw);
});
test('cash snapshots update an absolute balance once and preserve original source history',() => {
  const initial = fixture();
  const cash = {sourceId:'cash:synthetic-client:wallet',sourceLabel:'Гаманець',accountType:'cash',
    balances:{UAH:0,USD:120000},checked:'2026-11-19'};
  const next = Bank.syncSnapshot(E,initial,cash);
  const account = E.project(next).accounts.find(account=>account.bankSource===cash.sourceId);
  assert.equal(account.type,'cash');
  assert.deepEqual(account.balances,cash.balances);
  assert.deepEqual(Bank.syncSnapshot(E,next,cash),next);
  const updated = Bank.syncSnapshot(E,next,{...cash,balances:{USD:110000}});
  assert.deepEqual(E.project(updated).accounts.find(item=>item.id===account.id).balances,{UAH:0,USD:110000});
});

test('an already used bank snapshot cannot restore money spent locally',() => {
  const marked = {...snapshot,snapshotId:'bank:fetch-one'};
  let state = Bank.syncSnapshot(E,fixture(),marked);
  state = E.append(state,{type:'expense',account:'manual',currency:'UAH',amount:10000,standalone:true});
  const raw = JSON.stringify(state);
  assert.throws(() => Bank.syncSnapshot(E,state,marked),/Оновіть дані/);
  assert.equal(JSON.stringify(state),raw);
  const fresh = Bank.syncSnapshot(E,state,{...marked,snapshotId:'bank:fetch-two',balances:{UAH:40000}});
  assert.equal(E.project(fresh).accounts[0].balances.UAH,40000);
});
