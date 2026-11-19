const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync,execFile} = require('node:child_process');
process.chdir(__dirname);
const missions = require('./data/missions.json');
const bin = path.resolve(process.platform==='win32'?'engine/toc.exe':'engine/toc');
function build(){
  if(!fs.existsSync(bin)||fs.statSync(bin).mtimeMs<fs.statSync('engine/main.cpp').mtimeMs)
    execFileSync(process.env.CXX||'g++',['-std=c++17','-O2','engine/main.cpp','-o',bin],{stdio:'inherit'});
}
const progressFile=process.env.CIPHERSTATE_PROGRESS||'data/progress.json';
function progress(){return fs.existsSync(progressFile)?JSON.parse(fs.readFileSync(progressFile)):0;}
function check(condition,message){if(!condition)throw Error(message);}
async function analyze(m,b){
  check(typeof b.regex==='string' && /^[A-Za-z0-9()|*~]{1,100}$/.test(b.regex),'Use letters, digits, (), |, *, or ~ for epsilon.');
  check(typeof b.message==='string' && /^[ -~]{0,200}$/.test(b.message),'Use up to 200 printable characters.');
  const offsets=b.offsets||[0,0,0];
  check(Array.isArray(offsets)&&offsets.length===3&&offsets.every(x=>Number.isInteger(x)&&x>=0&&x<=99),'Wheel positions must be integers from 0 to 99.');
  const input=[m.mode,b.regex,m.rule,b.message,Object.entries(m.mapping).map(x=>x.join('=')).join(','),m.wheels.join(','),offsets.join(',')];
  if(m.mode==='builder'){
    const states=b.states;
    check(Array.isArray(states)&&states.length>0&&states.length<=32,'Use 1–32 states.');
    check(Number.isInteger(b.start)&&states[b.start],'Choose a starting state.');input.push(states.length,b.start);
    for(const s of states){
      const row=[s.final?1:0];
      for(const [symbol,to] of Object.entries(s.edges)){
        check(/^[01]$/.test(symbol)&&Number.isInteger(to)&&states[to],'Invalid binary transition.');row.push(symbol,to);
      }input.push(row.join(' '));
    }
  }
  const output=await new Promise((resolve,reject)=>{
    const child=execFile(bin,[],{timeout:3000,maxBuffer:2e6},(err,stdout,stderr)=>err?reject(Error(stderr||'Computation limit reached.')):resolve(stdout));
    child.stdin.on('error',()=>{});child.stdin.end(input.join('\n')+'\n');
  });
  const r={};for(const line of output.trimEnd().split('\n')){const [tag,...fields]=line.split('\t');(r[tag]??=[]).push(fields);}
  const expectedAlphabet=[...new Set(m.rule.match(/[A-Za-z0-9]/g))].sort().join('');
  const alphabetOK=[...new Set(String(b.alphabet||'').replace(/[ ,]/g,''))].sort().join('')===expectedAlphabet;
  const correctInput=m.mode==='repair' ? r.result[0][1]===m.answer : b.message===m.message;
  const solved=alphabetOK&&correctInput&&r.compare[0][0]==='1'&&r.result[0][0]==='1'&&(!m.answer||r.result[0][1]===m.answer);
  return {r,alphabetOK,solved};
}
function serve(){
  const server=http.createServer(async(req,res)=>{
    const json=(v,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(v));};
    try{
      if(req.url==='/api/missions')return json({missions:missions.map(({rule,answer,...info})=>info),completed:progress()});
      if(req.url==='/api/analyze'&&req.method==='POST'){
        let body='';for await(const part of req){body+=part;check(body.length<20000,'Request too large');}
        const b=JSON.parse(body),m=missions[b.id-1];check(m&&m.id<=progress()+1,'Complete the previous mission first.');
        const result=await analyze(m,b);
        if(result.solved&&b.submit&&m.id===progress()+1){fs.writeFileSync(progressFile+'.tmp',JSON.stringify(m.id));fs.renameSync(progressFile+'.tmp',progressFile);}
        return json({...result,completed:progress()});
      }
      const file={'/':'index.html','/app.js':'app.js','/style.css':'style.css'}[req.url];
      if(!file)return json({error:'Page unavailable'},404);
      res.setHeader('Content-Type',{'index.html':'text/html','app.js':'text/javascript','style.css':'text/css'}[file]);res.end(fs.readFileSync('public/'+file));
    }catch(e){json({error:e.message},400);}
  });server.listen(process.env.PORT||3000,'127.0.0.1',()=>console.log('CipherState at http://localhost:'+server.address().port));
}
if(require.main===module){build();serve();}module.exports={build,analyze};
