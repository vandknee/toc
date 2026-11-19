const assert=require('node:assert/strict');
const {build,analyze}=require('./server');
const missions=require('./data/missions.json');
const state=(final,zero,one)=>({final,edges:{0:zero,1:one}});
async function main(){
 build();
 for(const m of missions){
   const b={regex:m.rule,message:m.message,alphabet:m.id<=2?'XKAM7294':'01',start:0};
   if(m.id===1){
     const wrong=await analyze(m,{...b,regex:'X7'});assert.equal(wrong.solved,false);
     assert.equal(wrong.r.compare[0][1].length,2);
   }
   if(m.id===2){const damaged=await analyze(m,b);assert.equal(damaged.r.token.at(-1)[2],'0');b.message='M4-K2-K2-A9';}
   if(m.id===3)b.states=[state(false,0,1),state(true,0,1)];
   if(m.id===4){
     b.states=[state(false,0,1),state(true,0,1)];const faulty=await analyze(m,b);
     assert.equal(faulty.r.compare[0][1],'1');
     b.states=[state(false,1,0),state(false,1,2),state(true,1,0)];
   }
   if(m.id===5)b.offsets=[2,1,9];
   const result=await analyze(m,b);assert.ok(result.solved,m.name);console.log(m.name,'passed',result.r.result[0][1]||'');
 }
 const empty=await analyze(missions[0],{regex:'(~|a)*',message:'',alphabet:'a'});
 assert.equal(empty.r.token[0][2],'1');assert.equal(empty.r.compare[0][1],'');
 await assert.rejects(analyze(missions[0],{regex:'(a',message:'a'}),/closing/);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
