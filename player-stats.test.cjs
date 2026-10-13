const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parse,summary}=require('./player-stats.js');
test('both days count towards record, best day only towards weekly ranking',()=>{
 const data=parse([[1,'Ana',2,1,65,3,0,125,125,'Dia 2']],[[1,'01/10',6,'Bia','04/10',6,'Ana']]);
 assert.deepEqual(summary(data.get('Ana')),{wins:5,losses:1,rate:5/6*100,tournaments:2,titles:1});
 assert.equal(data.get('Ana')[0].counted,false);assert.equal(data.get('Ana')[1].counted,true);
});
test('missing and partial results are not zero-loss records',()=>{
 const events=parse([[1,'Ana',0,3,0,'','','',0,'Dia 1'],[2,'Ana',4,'','','','','','','']],[]).get('Ana');
 assert.equal(summary(events).wins,0);assert.equal(summary(events).losses,3);
 assert.equal(summary(events).tournaments,1);assert.equal(events[1].complete,false);
 assert.equal(events[0].valid,false);
});
test('ties, zero games and invalid tournaments remain distinguishable',()=>{
 const events=parse([[1,'Ana',0,0,0,0,0,0,0,'Empate']],[[1,'',5,'','',6,'']]).get('Ana');
 assert.equal(summary(events).rate,null);assert.equal(events[0].valid,false);
 assert.equal(events[1].valid,true);assert.equal(events[1].tied,true);
 assert.equal(events[0].championPending,true);
});
