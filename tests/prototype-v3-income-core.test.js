'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const E=require('../docs/design/prototype-v3-core.js');
const Schedule=require('../docs/design/prototype-v3-income-core.js');
function fixture(){
  const store=E.seed(true,'2026-01-31');
  store.base.accounts=[{id:'euro',name:'Test',type:'bank',balances:{EUR:0}}];
  store.base.salary=null;
  store.incomeSchedules=[{id:'salary',account:'euro',name:'Зарплата',amount:300000,sourceCurrency:'USD',currency:'EUR',
    firstDate:'2026-01-31',interval:'monthly',effectiveFrom:'2026-01-31',active:true}];
  return store;
}
test('monthly income keeps day 31 across February and converts once',()=>{
  const original=fixture(),before=JSON.stringify(original);
  const january=Schedule.applyDue(E,original,'2026-01-31');
  const march=Schedule.applyDue(E,january,'2026-03-31');
  assert.deepEqual(march.events.map(event=>event.scheduledFor),['2026-01-31','2026-02-28','2026-03-31']);
  assert.equal(march.events[0].amount,Math.round(300000*original.rates.USD/original.rates.EUR));
  assert.deepEqual(Schedule.applyDue(E,march,'2026-03-31'),march);
  assert.equal(JSON.stringify(original),before);
});
test('a changed rate applies only to new income',()=>{
  const january=Schedule.applyDue(E,fixture(),'2026-01-31'),old=JSON.stringify(january.events[0]);
  january.rates.EUR=50;
  const february=Schedule.applyDue(E,january,'2026-02-28');
  assert.equal(JSON.stringify(february.events[0]),old);
  assert.equal(february.events[1].amount,252000);
  assert.equal(february.events[1].sourceAmount,300000);
});
test('a pause and a new effective date skip missed occurrences',()=>{
  const january=Schedule.applyDue(E,fixture(),'2026-01-31');
  january.incomeSchedules[0].active=false;
  const paused=Schedule.applyDue(E,january,'2026-03-01');
  assert.equal(paused.events.length,1);
  paused.incomeSchedules[0]={...paused.incomeSchedules[0],active:true,effectiveFrom:'2026-03-01'};
  const march=Schedule.applyDue(E,paused,'2026-03-31');
  assert.deepEqual(march.events.map(event=>event.scheduledFor),['2026-01-31','2026-03-31']);
});
test('custom intervals reject letters, zero and values outside 1–3650',()=>{
  const store=fixture(),base=store.incomeSchedules[0];
  for(const days of ['14',0,3651,1.5]){
    assert.throws(()=>Schedule.validate({...base,interval:'custom',days},E,store));
  }
  Schedule.validate({...base,interval:'custom',days:3650},E,store);
});
