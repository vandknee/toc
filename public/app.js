const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let missions,completed,m,states,start,selected,report,index=0,timer,serial=0;
function nav(){
 $('progress').textContent=completed+' of 5 missions complete';
 $('missions').innerHTML=missions.map(x=>`<button class="${m?.id===x.id?'active':''}" ${x.id>completed+1?'disabled':''} data-id="${x.id}"><small>CASE 0${x.id} · ${x.id<=completed?'Closed':x.id>completed+1?'Locked':'Open'}</small><b>${x.name}</b></button>`).join('');
 $('missions').querySelectorAll('button').forEach(b=>b.onclick=()=>openMission(+b.dataset.id));
}
const guides = [
  {
    "goal": "Find the valid letter-number pairs and use them to read the hidden message.",
    "steps": [
      "Keep the message as it is. Hyphens separate the pairs.",
      "In Alphabet, list each letter and digit used by the valid pairs once.",
      "In Token Regex, join the valid pairs with |, meaning “or”. Then choose Check My Answer."
    ],
    "look": "Look for four accepted pairs and a recovered word. In Mealy Output, watch each pair become a letter.",
    "hint": "Alphabet → XKAM7294. Token regex → X7|K2|A9|M4. The four outputs spell HELP."
  },
  {
    "goal": "Fix the damaged pair to read the whole message.",
    "steps": [
      "Choose Check My Answer before editing anything.",
      "Find the rejected pair in What Did We Find? Reverse its two symbols in Intercepted Message.",
      "Check again. Keep Alphabet and Token Regex as they are."
    ],
    "look": "All four parts should pass and a word should appear.",
    "hint": "Change the final 9A to A9. Enter M4-K2-K2-A9 in Intercepted message to recover PEEL."
  },
  {
    "goal": "Build a DFA that accepts every string of 0s and 1s ending in 1.",
    "steps": [
      "Keep all three text fields as they are. Use the DFA builder below them.",
      "Add a state. Select each state and choose where it goes on 0 and on 1. Mark the state where the input should pass.",
      "Choose Check My Answer to compare your machine with the rule."
    ],
    "look": "Both machines should accept exactly the same inputs. Use DFA Token Trace to follow the sample message.",
    "hint": "Keep q0 as start. Add q1 and mark only q1 accepting. Select each state in turn and set its 0 dropdown to q0 and its 1 dropdown to q1."
  },
  {
    "goal": "Find where the given DFA disagrees with the rule, then make it accept exactly the strings ending in 01.",
    "steps": [
      "Keep the three text fields as they are. Choose Check My Answer before editing the machine.",
      "Find the shortest input showing the disagreement.",
      "Use the DFA builder to keep track of the ending 01. Check again after editing the states and arrows."
    ],
    "look": "At first, the results show a counterexample. After the fix, both machines should agree.",
    "hint": "Add q2. Toggle q1 off and q2 on so only q2 accepts. From every state send 0 to q1. On 1, send q0 to q0, q1 to q2, and q2 to q0."
  },
  {
    "goal": "Set the three cipher wheels using the logbook and find the hidden instruction.",
    "steps": [
      "Keep the three text fields as they are.",
      "Enter the logbook positions 2, 1, 9 in wheel order. Choose Check My Answer.",
      "Choose Mealy Output, then Play or Next."
    ],
    "look": "Watch the wheels move and produce a new bit. Look for the recovered word in the results.",
    "hint": "Wheel 1 → 2, Wheel 2 → 1, Wheel 3 → 9. The recovered word is OPEN."
  }
];
function showGuide(id){
 const guide=guides[id-1];
 $('goal').textContent=guide.goal;
 $('look-for').textContent=guide.look;
 $('guide').replaceChildren(...[...guide.steps,'When your answer is ready, choose Complete Mission.'].map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 $('solution').open=false;$('hint').textContent=guide.hint;
 $('messageHelp').textContent="This is the message we found. You don't need to change it.";
 $('alphaHelp').textContent="Enter each letter and number once. Don't include the dashes.";
 $('regexHelp').textContent='Example: X7|K2 means the machine can match X7 or K2.';
}
function openMission(id){
 pause();serial++;m=missions[id-1];report=null;index=0;start=selected=0;nav();showGuide(id);
 $('case').textContent='Case file / 0'+id+' · '+m.topic;$('name').textContent=m.name;
 $('message').value=m.message;$('alphabet').value=id===1?'':id===2?'XKAM7294':'01';$('regex').value=m.initial;$('regex').readOnly=m.mode==='builder';
 $('extra').innerHTML='';$('status').textContent='';$('view').value='build';$('results').textContent='Choose Check My Answer to see your results.';draw();
 if(m.mode==='wheel')$('extra').innerHTML='<div class="cols">'+m.wheels.map((_,i)=>`<label>Wheel ${i+1} starting position<input id="w${i}" type="number" min="0" max="99" value="0"><small>Replace 0 with the position from the logbook.</small></label>`).join('')+'</div>';
 if(m.mode==='builder'){
   states=id===3?[{final:false,edges:{}}]:[{final:false,edges:{0:0,1:1}},{final:true,edges:{0:0,1:1}}];
   states.forEach((s,i)=>Object.assign(s,{x:80+i*135,y:100}));
   $('extra').innerHTML='<h3>DFA builder</h3><p>Choose Add State, or drag the button onto the diagram to place a state. Drag a circle to move it. Select a circle to choose where its arrows go.</p><div id="editor" class="canvas"></div><div class="actions"><button type="button" id="add" draggable="true">Add State</button><button type="button" id="accept">Mark or Unmark as Accepting</button><button type="button" id="initial">Make Start State</button></div><div class="actions" id="trans"></div>';
   $('add').onclick=()=>{if(states.length<32){selected=states.length;states.push({final:false,edges:{},x:75+selected%4*115,y:90+Math.floor(selected/4)*125});editor();}};
   $('add').ondragstart=e=>e.dataTransfer.setData('text/plain','new-state');
   $('editor').ondragover=e=>e.preventDefault();
   $('editor').ondrop=e=>{e.preventDefault();if(e.dataTransfer.getData('text/plain')!=='new-state'||states.length>=32)return;
     const rect=$('editor').firstChild.getBoundingClientRect();selected=states.length;
     states.push({final:false,edges:{},x:Math.max(40,e.clientX-rect.left),y:Math.max(64,e.clientY-rect.top)});editor();};
   $('accept').onclick=()=>{states[selected].final=!states[selected].final;editor();};$('initial').onclick=()=>{start=selected;editor();};editor();
 }
}
function svgGraph(nodes,edges,finals,hot,first,width,height,active=-1){
 const pts=new Map(nodes.map(n=>[String(n.id),n]));
 const groups=new Map();edges.forEach(([a,b,c],i)=>{const key=a+':'+b;if(!groups.has(key))groups.set(key,{a,b,labels:[],on:false});const g=groups.get(key);g.labels.push(c);g.on||=i===active;});
 let markup='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" role="img" aria-label="Automaton state diagram">';
 for(const g of groups.values()){
   const a=pts.get(String(g.a)),b=pts.get(String(g.b));if(!a||!b)continue;
   let d,lx,ly,ex,ey,cx,cy;
   if(a===b){ex=a.x+12;ey=a.y-16;cx=a.x+40;cy=a.y-65;d=`M ${a.x-12} ${a.y-16} C ${a.x-40} ${cy}, ${cx} ${cy}, ${ex} ${ey}`;lx=a.x;ly=a.y-54;}
   else{let dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;cx=(a.x+b.x)/2+dy/len*32;cy=(a.y+b.y)/2-dx/len*32;
    let end=Math.hypot(b.x-cx,b.y-cy)||1;ex=b.x-(b.x-cx)*23/end;ey=b.y-(b.y-cy)*23/end;
    d=`M ${a.x} ${a.y} Q ${cx} ${cy} ${ex} ${ey}`;lx=(a.x+b.x+2*cx)/4;ly=(a.y+b.y+2*cy)/4-4;}
   const angle=Math.atan2(ey-cy,ex-cx)*180/Math.PI;
   markup+=`<path class="${g.on?'selected':''}" d="${d}"/><polygon class="${g.on?'selected':''}" transform="translate(${ex} ${ey}) rotate(${angle})" points="0,0 -8,-4 -8,4"/><text class="transition-label ${g.on?'selected':''}" x="${lx}" y="${ly}" text-anchor="middle">${esc(g.labels.join(','))}</text>`;
 }
 for(const n of nodes){const isFinal=finals.includes(String(n.id));markup+=`<g data-q="${n.id}"><circle cx="${n.x}" cy="${n.y}" r="21" class="${String(n.id)===String(hot)?'hot':''}"/>${isFinal?`<circle style="fill:none" cx="${n.x}" cy="${n.y}" r="16"/>`:''}<text class="state-label" x="${n.x}" y="${n.y}" dominant-baseline="central" text-anchor="middle" ${n.label?.length>4?'textLength="35" lengthAdjust="spacingAndGlyphs"':''}>${esc(n.label ?? 'q'+n.id)}</text>${String(first)===String(n.id)?`<text x="${n.x}" y="${n.y+39}" text-anchor="middle">start</text>`:''}</g>`;}
 return markup+'</svg>';
}
function editor(){
 const edges=states.flatMap((s,i)=>Object.entries(s.edges).map(([c,to])=>[i,to,c]));
 const w=Math.max(540,...states.map(s=>s.x+60)),h=Math.max(230,...states.map(s=>s.y+60));
 $('editor').innerHTML=svgGraph(states.map((s,id)=>({...s,id})),edges,states.flatMap((s,i)=>s.final?[String(i)]:[]),selected,start,w,h);
 const svg=$('editor').firstChild;
 svg.onpointerdown=e=>{const g=e.target.closest('[data-q]');if(!g)return;selected=+g.dataset.q;let x=e.clientX,y=e.clientY;svg.setPointerCapture(e.pointerId);
 svg.onpointermove=ev=>{const s=states[selected],dx=ev.clientX-x,dy=ev.clientY-y;const nx=Math.max(34,Math.min(w-34,s.x+dx)),ny=Math.max(63,Math.min(h-45,s.y+dy));g.setAttribute('transform',`translate(${nx-s.x},${ny-s.y})`);};
 svg.onpointerup=ev=>{const s=states[selected];s.x=Math.max(34,Math.min(w-34,s.x+ev.clientX-x));s.y=Math.max(63,Math.min(h-45,s.y+ev.clientY-y));editor();};};
 $('trans').innerHTML=[0,1].map(c=>`<label>q${selected} on ${c} → <select data-symbol="${c}"><option value="">Rejecting state</option>${states.map((_,i)=>`<option ${states[selected].edges[c]===i?'selected':''} value="${i}">q${i}</option>`).join('')}</select></label>`).join('');
 $('trans').querySelectorAll('select').forEach(s=>s.onchange=()=>{if(s.value==='')delete states[selected].edges[s.dataset.symbol];else states[selected].edges[s.dataset.symbol]=+s.value;editor();});
}
function frames(){if(!report)return [];let v=$('view').value;return v==='decode'?(report.wheel||report.mealy||[]):report[v]||[];}
const viewHelp={
  "build": "Thompson Construction builds an NFA from your Regex, one piece at a time.",
  "de": "Subset Construction groups NFA states to build a DFA.",
  "trace": "DFA Token Trace follows the arrows as the DFA checks each part of the message.",
  "decode": "Mealy Output shows what the machine gives back as it reads the message."
};
function draw(){
 $('view-help').textContent=viewHelp[$('view').value];
 const f=frames(),v=$('view').value,row=f[index];if(!row){$('diagram').innerHTML='';$('step').textContent=report?'There are no steps to show in this view for this answer.':'Choose Check My Answer to see the steps.';return;}
 let edges,finals,hot,first,ids,caption;
 if(v==='build'){edges=report.ne.slice(0,+row[3]);ids=[...new Set(edges.flatMap(e=>e.slice(0,2)))];hot=row[2];first=row[1];finals=[row[2]];caption=row[0]+' · fragment q'+first+' → q'+hot;}
 else if(v==='decode'){const wheel=!!report.wheel;first=f[0][0];const [a,b,c,d,e]=row.map(value=>value.trimEnd());const end=wheel?e:c;ids=[...new Set([a,end])];edges=[[a,end,b+' / '+d]];hot=end;finals=[];caption=wheel?`Positions (${a}) · input ${b} XOR key ${c} = output ${d} · next (${e})`:`State S reads ${b}, emits ${d}, returns to S.`;}
 else if(v==='trace'&&m.mode==='builder'){const snap=report.user;edges=snap.states.flatMap((s,i)=>Object.entries(s.edges).map(([c,t])=>[String(i),String(t),c]));ids=snap.states.map((_,i)=>String(i));finals=snap.states.flatMap((s,i)=>s.final?[String(i)]:[]);first=snap.start;hot=row[4];caption='Token '+(+row[0]+1)+' · q'+row[2]+' reads '+row[3]+' → '+(hot==='-1'?'sink':'q'+hot);}
 else {edges=v==='de'?report.de.slice(0,index+1):(report.de||[]);ids=v==='de'?[...new Set(['0',...edges.flatMap(e=>e.slice(0,2))])]:report.state.map(s=>s[0]);first='0';finals=report.state.filter(s=>s[2]==='1').map(s=>s[0]);hot=v==='de'?row[1]:row[4];caption=v==='de'?`q${row[0]} on ${row[2]} · move {${row[3]}} · ε-closure {${row[4]}} = q${hot}`:`Token ${+row[0]+1}, symbol ${+row[1]+1} · q${row[2]} reads ${row[3]} → ${hot==='-1'?'rejecting sink':'q'+hot}`;}
 if(hot==='-1'&&!ids.includes(hot)){ids.push(hot);edges=[...edges,[row[2],hot,row[3]]];}
 const width=Math.max(160,$('diagram').clientWidth || 0);
 const columns=Math.min(6,Math.max(1,Math.floor(width/122)));
 const spacing=width/Math.min(columns,Math.max(1,ids.length));
 const nodes=ids.map((id,i)=>({id,x:spacing*(i%columns+.5),y:86+Math.floor(i/columns)*125}));
 const active=v==='decode'||v==='de'?edges.length-1:v==='trace'?edges.findIndex(([a,b,symbol])=>a===row[2]&&b===hot&&symbol===row[3]):-1;
 if(v==='decode'){
   const [from,input,keyOrTo,output,next]=row.map(value=>value.trimEnd());
   for(const node of nodes)node.label=report.wheel?node.id:'S';
   const to=report.wheel?next:keyOrTo;
 }
 $('diagram').innerHTML=svgGraph(nodes,edges,finals,hot,first,width,Math.max(140,Math.ceil(ids.length/columns)*125+15),active);
 let explanation;
 if(v==='build')explanation='We added a piece of the pattern from q'+first+' to q'+hot+'.';
 else if(v==='de')explanation='When group q'+row[0]+' reads '+row[2]+', it goes to group q'+hot+'.';
 else if(v==='trace')explanation='For part '+(+row[0]+1)+', q'+row[2]+' reads '+row[3]+' and '+(hot.trim()==='-1'?'moves to a state where the input is rejected.':'moves to q'+hot.trim()+'.');
 else if(report.wheel)explanation='The machine uses key bit '+row[2]+' to turn '+row[1]+' into '+row[3]+'. Then the wheels move.';
 else explanation='The machine reads '+row[1]+' and gives back the letter '+row[3].trim()+'. It stays in state S.';
 $('step').textContent='Step '+(index+1)+' of '+f.length+'. '+explanation;
}
new ResizeObserver(draw).observe($('view').closest('section'));
function pause(){clearInterval(timer);}
$('view').onchange=()=>{pause();index=0;draw();};$('next').onclick=()=>{pause();index=Math.min(index+1,Math.max(0,frames().length-1));draw();};$('reset').onclick=()=>{pause();index=0;draw();};$('pause').onclick=pause;
$('play').onclick=()=>{pause();if(index>=frames().length-1)index=0;draw();timer=setInterval(()=>{if(index>=frames().length-1)return pause();index++;draw();},650);};
function missionResults(result,message){
 const [same,example,candidate,reference,count]=result.compare[0];
 const accepted=[],rejected=[];
 for(const [,token,passes,end] of result.token){
   const state=end.trim();
   const item='<li><code>'+esc(token||'ε (empty input)')+'</code> · '+(state==='-1'?'ended in the rejecting state':'ended at q'+esc(state))+'</li>';
   (passes==='1'?accepted:rejected).push(item);
 }
 const agreement=same==='1'?'Both machines accept exactly the same inputs.':'The two machines disagree on <code>'+esc(example||'ε (empty input)')+'</code>. This is the shortest input that shows they behave differently. Your machine '+(candidate==='1'?'accepts':'rejects')+' it. The expected machine '+(reference==='1'?'accepts':'rejects')+' it.';
 const list=items=>items.length?'<ul>'+items.join('')+'</ul>':'<p>None.</p>';
 return '<h3>Did the message pass the checks?</h3><p>'+(rejected.length?'Some parts were rejected.':'Every part passed the pattern check.')+'</p>'
   +'<div class="result-cards"><div class="result-card"><h3>Which parts were accepted?</h3>'+list(accepted)+'</div><div class="result-card"><h3>Which parts were rejected?</h3>'+list(rejected)+'</div></div>'
   +'<h3>What message did we recover?</h3><p class="output-value">'+esc(result.result[0][1]||'—')+'</p><p>Intercepted message <code>'+esc(message||'ε (empty input)')+'</code></p>'
   +'<h3>Do the two machines agree?</h3><p>'+agreement+'</p><p>The comparison found '+esc(count.trim())+' pairs of states.</p>';
}
async function run(submit){
 const stamp=++serial;pause();
 const body={id:m.id,regex:$('regex').value,message:$('message').value,alphabet:$('alphabet').value,states,start,submit,offsets:m.mode==='wheel'?[0,1,2].map(i=>+$('w'+i).value):undefined};
 try{const resp=await fetch('/api/analyze',{method:'POST',body:JSON.stringify(body)});const data=await resp.json();if(stamp!==serial)return;if(data.error)throw Error(data.error);
 report=data.r;report.user=structuredClone(body);completed=data.completed;nav();index=0;draw();
 const cmp=report.compare[0];
 $('results').innerHTML=missionResults(report,body.message);
 $('status').textContent=data.solved?(submit?'Mission complete. '+(m.id<5?'The next mission is available.':'All investigations complete.'):'Your answer is ready. Choose Complete Mission to finish.'):!data.alphabetOK?'Check the alphabet against the mission rules.':cmp[0]!=='1'?'The machines disagree. Look below for the shortest input that shows why.':'Look below for rejected parts and check the mission instructions.';
 }catch(e){if(stamp===serial){report=null;draw();$('results').textContent='No result for this input.';$('status').textContent=e.message;}}
}
$('inputs').onsubmit=e=>{e.preventDefault();run(false);};$('finish').onclick=()=>run(true);
fetch('/api/missions').then(r=>r.json()).then(d=>{missions=d.missions;completed=d.completed;openMission(Math.min(completed+1,5));}).catch(()=>{$('status').textContent='Unable to reach the local server.';});

if($('secret-form')){
/* The letter demo and the investigations use separate machines. */
function letterFrames(message, direction) {
 const frames=[];
 let state=0;
 for(const input of message){
   const step=state;
   const code=input.codePointAt(0);
   const base=code>=65&&code<=90?65:code>=97&&code<=122?97:null;
   const shift=base===null?0:step+1;
   const output=shift?String.fromCharCode(base+(code-base+direction*shift+26)%26):input;
   if(shift)state=(state+1)%3;
   frames.push({input,output,step,state,shift});
 }
 return frames;
}

const secretNodes=[
 {id:0,x:175,y:36},
 {id:1,x:258,y:112},
 {id:2,x:92,y:112}
];
const secretEdges=[[0,1,'1'],[1,2,'2'],[2,0,'3']];
const secretStates=document.querySelectorAll('[data-secret-state]');
let secretTimer, secretOriginal='', secretEncoded='';
function showSecretState(step, active=-1, copied=false){
 const edges=copied?[...secretEdges,[step,step,'copy']]:secretEdges;
 // Leave room above the first state for the copy loop.
 const nodes=secretNodes.map(node=>({...node,y:node.y+30}));
 $('secret-diagram').innerHTML=svgGraph(nodes,edges,[],step,-1,350,181,copied?3:active)
   .replace('<svg ','<svg viewBox="0 0 350 181" ');
 for(const row of secretStates){
   const current=Number(row.dataset.secretState)===step;
   row.classList.toggle('active',current);
   if(current)row.setAttribute('aria-current','step');
   else row.removeAttribute('aria-current');
 }
}
function stopSecret(){
 clearTimeout(secretTimer);
 $('make-secret').disabled=false;
 $('reveal-secret').disabled=false;
}
function clearSecret(){
 stopSecret();
 secretOriginal=secretEncoded='';
 $('secret-input').value='';
 for(const id of ['original-value','secret-value','revealed-value'])$(id).textContent='—';
 $('secret-live').textContent='Type a message to see the first letter change.';
 $('secret-next').textContent='';
 $('secret-match').textContent='';
 $('secret-history').replaceChildren();
 $('secret-history-empty').hidden=false;
 $('reveal-action').hidden=true;
 showSecretState(0);
}
function characterName(character){
 if(character===' ')return 'a space';
 if(character==='\n')return 'a line break';
 if(character==='\t')return 'a tab';
 return '“'+character+'”';
}
function playSecret(message, direction){
 stopSecret();
 const making=direction===1;
 const frames=letterFrames(message,direction);
 const target=$(making?'secret-value':'revealed-value');
 let index=0, result='';
 const outputNode=document.createTextNode('');
 target.replaceChildren(outputNode);
 $('make-secret').disabled=true;
 $('reveal-secret').disabled=true;
 $('secret-match').textContent='';
 $('secret-history').replaceChildren();
 $('secret-history-empty').hidden=true;
 function advance(){
   const {input,output,step,state,shift}=frames[index];
   result+=output;
   outputNode.appendData(output);
   showSecretState(step,shift?step:-1,!shift);
   const distance=shift===1?'1 place':shift+' places';
   const change=shift
     ? characterName(input)+' becomes '+characterName(output)+'. We move '+distance+(making?' forward.':' backward.')
     : 'We copy '+characterName(input)+'. The step stays the same.';
   $('secret-live').textContent=change;
   const entry=document.createElement('li');
   entry.textContent='Step '+(step+1)+' (q'+step+'). '+change+' Next state: q'+state+'.';
   $('secret-history').append(entry);
   index++;
   if(index<frames.length){
     $('secret-next').textContent="Next up: "+characterName(frames[index].input)+'.';
     secretTimer=setTimeout(advance,650);
     return;
   }
   stopSecret();
   $('secret-next').textContent=making?'Your secret message is ready.':'Your message is revealed.';
   if(making){
     secretEncoded=result;
     $('reveal-action').hidden=false;
   }else{
     $('secret-match').textContent=result===secretOriginal?'It matches your original message!':'The messages are different.';
   }
 }
 advance();
}
$('secret-form').onsubmit=event=>{
 event.preventDefault();
 const message=$('secret-input').value;
 if(!message)return;
 secretOriginal=message;
 $('original-value').textContent=message;
 $('revealed-value').textContent='—';
 $('reveal-action').hidden=true;
 playSecret(message,1);
};
$('reveal-secret').onclick=()=>playSecret(secretEncoded,-1);
$('secret-reset').onclick=()=>{
 clearSecret();
 $('secret-input').focus();
};
showSecretState(0);
}
