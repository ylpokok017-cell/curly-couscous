(()=>{
const blockMultiTouch=e=>{if((e.touches&&e.touches.length>=2)||(e.scale&&e.scale!==1))e.preventDefault()};
['gesturestart','gesturechange','gestureend'].forEach(type=>document.addEventListener(type,e=>e.preventDefault(),{passive:false}));
document.addEventListener('touchstart',blockMultiTouch,{passive:false});
document.addEventListener('touchmove',blockMultiTouch,{passive:false});
function fitViewport(){const h=window.visualViewport?.height||window.innerHeight;document.documentElement.style.setProperty('--app-height',`${Math.round(h)}px`)}
fitViewport();addEventListener('resize',fitViewport,{passive:true});addEventListener('orientationchange',()=>setTimeout(fitViewport,120),{passive:true});
if(window.visualViewport){window.visualViewport.addEventListener('resize',fitViewport,{passive:true});window.visualViewport.addEventListener('scroll',fitViewport,{passive:true})}

const questionSets={
 P3:[{id:'Q1',src:'assets/P3_Q1.jpeg'},{id:'Q2',src:'assets/P3_Q2.jpeg'},{id:'Q3',src:'assets/P3_Q3.jpeg'}],
 P4:[{id:'Q1',src:'assets/P4_Q1.jpeg'},{id:'Q2',src:'assets/P4_Q2.jpeg'},{id:'Q3',src:'assets/P4_Q3.jpeg'}],
 P5:[{id:'Q1',src:'assets/P5_Q1.jpeg'},{id:'Q2',src:'assets/P5_Q2.jpeg'},{id:'Q3',src:'assets/P5_Q3.jpeg'}],
 P6:[{id:'Q1',src:'assets/P6_Q1.jpeg'},{id:'Q2',src:'assets/P6_Q2.jpeg'},{id:'Q3',src:'assets/P6_Q3.jpeg'}]
};
const scenes=[{id:'wheel'},{id:'plinko'},{id:'arena'},{id:'rail'},{id:'gate'},{id:'bowl'}];
const packBtn=document.getElementById('packBtn'),soundBtn=document.getElementById('soundBtn'),drawBtn=document.getElementById('drawBtn'),sceneEl=document.getElementById('scene'),packPicker=document.getElementById('packPicker'),packOptions=[...document.querySelectorAll('.pack-option')],revealBridge=document.getElementById('revealBridge'),result=document.getElementById('result'),resultPackBtn=document.getElementById('resultPackBtn'),winner=document.getElementById('winner'),resultImg=document.getElementById('resultImg'),questionFrame=document.getElementById('questionFrame'),nextBtn=document.getElementById('nextBtn'),toast=document.getElementById('toast');
const STATE={PACK:'PACK_SELECT',READY:'READY',FOCUSING:'FOCUSING',ANIMATING:'ANIMATING',REVEALING:'REVEALING',QUESTION:'QUESTION'};
let appState=STATE.PACK,activePack=null,questions=questionSets.P3,recentQuestions=[],recentScenes=[],busy=false,soundOn=true,audioCtx=null;
const reduceMotion=matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
const Q_COLORS=['#4285F4','#EA4335','#34A853'],Q_TINTS=['#E8F0FE','#FCE8E6','#E6F4EA'],INK='#202124',MUTED='#5F6368';
const rnd=max=>{if(crypto?.getRandomValues){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%max}return Math.floor(Math.random()*max)};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const phase=(p,a,b)=>clamp((p-a)/(b-a));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const easeOutCubic=t=>1-Math.pow(1-clamp(t),3);
const easeInOutQuint=t=>{t=clamp(t);return t<.5?16*t*t*t*t*t:1-Math.pow(-2*t+2,5)/2};
const easeOutBack=t=>{t=clamp(t);const c1=1.35,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)};
function setState(next){appState=next;busy=[STATE.FOCUSING,STATE.ANIMATING,STATE.REVEALING].includes(next);document.body.dataset.state=next;drawBtn.disabled=busy||!activePack;packBtn.disabled=busy}
function qIndex(q){return Math.max(0,questions.findIndex(x=>x.id===q.id))}
function qColor(q){return Q_COLORS[qIndex(q)]}
function toastMsg(m){toast.textContent=m;toast.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toast.classList.remove('show'),1100)}
function beep(freq=500,d=.05,type='sine',gain=.022){if(!soundOn)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioCtx||=new AC();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+d);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d)}catch{}}
function resultTone(){[[523,.07],[659,.08],[784,.12]].forEach(([f,d],i)=>setTimeout(()=>beep(f,d,'sine',.021),i*78))}
function soundSvg(on){return on?'<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3zm13.5 3c0-1.4-.8-2.6-2-3.2v6.4c1.2-.6 2-1.8 2-3.2zm-2-7v2.1c2.1.8 3.5 2.7 3.5 4.9s-1.4 4.1-3.5 4.9V19c3.2-.9 5.5-3.6 5.5-7s-2.3-6.1-5.5-7z"/></svg>':'<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16.5 12c0-.7-.2-1.4-.5-2l1.5-1.5c.7 1 1 2.2 1 3.5 0 1.1-.2 2.1-.7 3l-1.6-1.6c.2-.4.3-.9.3-1.4zM3 9v6h4l5 4v-4.2L6.2 9H3zm9-4-3.1 2.5L12 10.6V5zm8.3 15.7L3.3 3.7 4.7 2.3l17 17-1.4 1.4z"/></svg>'}
function updateSound(){soundBtn.innerHTML=soundSvg(soundOn);soundBtn.setAttribute('aria-label',soundOn?'關閉音效':'開啟音效')}
Object.values(questionSets).flat().forEach(q=>{const im=new Image();im.src=q.src});

function showPackPicker(){if(busy)return;packOptions.forEach(b=>b.classList.toggle('is-selected',b.dataset.pack===activePack));packPicker.classList.add('show');packPicker.setAttribute('aria-hidden','false');setState(STATE.PACK)}
function hidePackPicker(){packPicker.classList.remove('show');packPicker.setAttribute('aria-hidden','true');if(activePack)setState(STATE.READY)}
function selectPack(pack){if(!questionSets[pack]||busy)return;activePack=pack;questions=questionSets[pack];recentQuestions=[];recentScenes=[];packBtn.textContent=pack;resultPackBtn.textContent=pack;hidePackPicker();setState(STATE.READY)}
function packFromUrl(){const parts=location.pathname.split('/').filter(Boolean),last=(parts.at(-1)||'').toUpperCase();if(questionSets[last])return last;const params=new URLSearchParams(location.search),q=(params.get('pack')||params.get('p')||'').toUpperCase();if(questionSets[q])return q;const h=location.hash.replace(/^#/,'').toUpperCase();return questionSets[h]?h:null}
function chooseQuestion(){const blocked=new Set(recentQuestions.slice(0,2));const pool=[0,1,2].filter(i=>!blocked.has(i));const pick=pool[rnd(pool.length)];recentQuestions=[pick,...recentQuestions].slice(0,2);return pick}
function chooseScene(){const blocked=new Set(recentScenes.slice(0,3));const pool=scenes.filter(s=>!blocked.has(s.id));const pick=pool[rnd(pool.length)];recentScenes=[pick.id,...recentScenes].slice(0,3);return pick}

/* ---------- SVG motion system ---------- */
const NS='http://www.w3.org/2000/svg';
function S(tag,attrs={},parent){const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))if(v!==undefined&&v!==null)el.setAttribute(k,String(v));if(parent)parent.appendChild(el);return el}
function SA(el,attrs){for(const [k,v] of Object.entries(attrs))if(v!==undefined&&v!==null)el.setAttribute(k,String(v));return el}
function T(el,x=0,y=0,rot=0,sx=1,sy=sx){el.setAttribute('transform',`translate(${x} ${y}) rotate(${rot}) scale(${sx} ${sy})`)}
function txt(parent,text,x,y,size=28,attrs={}){const e=S('text',{x,y,'text-anchor':'middle','dominant-baseline':'middle','font-size':size,'font-weight':attrs.weight||650,fill:attrs.fill||INK,'font-family':'Roboto, Arial, PingFang TC, sans-serif',...attrs},parent);e.textContent=text;return e}
function sector(cx,cy,r,a0,a1){const rad=d=>d*Math.PI/180,x0=cx+r*Math.cos(rad(a0)),y0=cy+r*Math.sin(rad(a0)),x1=cx+r*Math.cos(rad(a1)),y1=cy+r*Math.sin(rad(a1));return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`}
function seed01(n,s=0){const x=Math.sin(n*12.9898+s*78.233)*43758.5453;return x-Math.floor(x)}
function addDefs(svg){
 const d=S('defs',{},svg);
 const sh=S('filter',{id:'shadow',x:'-40%',y:'-40%',width:'180%',height:'200%'},d);S('feDropShadow',{dx:0,dy:12,stdDeviation:16,'flood-color':'#3c4043','flood-opacity':.12},sh);
 const soft=S('filter',{id:'softShadow',x:'-50%',y:'-50%',width:'200%',height:'220%'},d);S('feDropShadow',{dx:0,dy:8,stdDeviation:11,'flood-color':'#3c4043','flood-opacity':.10},soft);
 const glass=S('linearGradient',{id:'glass',x1:0,y1:0,x2:0,y2:1},d);S('stop',{offset:0,'stop-color':'#fff','stop-opacity':.96},glass);S('stop',{offset:.56,'stop-color':'#f7faff','stop-opacity':.76},glass);S('stop',{offset:1,'stop-color':'#e9eef5','stop-opacity':.90},glass);
 const metal=S('linearGradient',{id:'metal',x1:0,y1:0,x2:0,y2:1},d);S('stop',{offset:0,'stop-color':'#fff'},metal);S('stop',{offset:.52,'stop-color':'#e8ebef'},metal);S('stop',{offset:1,'stop-color':'#cdd2d8'},metal);
 const ceramic=S('radialGradient',{id:'ceramic',cx:.32,cy:.25,r:.78},d);S('stop',{offset:0,'stop-color':'#ffffff'},ceramic);S('stop',{offset:.46,'stop-color':'#f5f7fa'},ceramic);S('stop',{offset:1,'stop-color':'#cfd5dc'},ceramic);
 const pearl=S('radialGradient',{id:'pearl',cx:.30,cy:.24,r:.82},d);S('stop',{offset:0,'stop-color':'#ffffff'},pearl);S('stop',{offset:.38,'stop-color':'#f8fafc'},pearl);S('stop',{offset:.72,'stop-color':'#e5e9ee'},pearl);S('stop',{offset:1,'stop-color':'#bcc3cb'},pearl);
 const graphite=S('linearGradient',{id:'graphite',x1:0,y1:0,x2:0,y2:1},d);S('stop',{offset:0,'stop-color':'#70757a'},graphite);S('stop',{offset:.48,'stop-color':'#3c4043'},graphite);S('stop',{offset:1,'stop-color':'#202124'},graphite);
 const titanium=S('linearGradient',{id:'titanium',x1:0,y1:0,x2:0,y2:1},d);S('stop',{offset:0,'stop-color':'#ffffff'},titanium);S('stop',{offset:.50,'stop-color':'#e7ebef'},titanium);S('stop',{offset:1,'stop-color':'#aeb6bf'},titanium);
 const wood=S('linearGradient',{id:'wood',x1:0,y1:0,x2:1,y2:0},d);S('stop',{offset:0,'stop-color':'#bd8745'},wood);S('stop',{offset:.42,'stop-color':'#edc783'},wood);S('stop',{offset:.72,'stop-color':'#d6a65e'},wood);S('stop',{offset:1,'stop-color':'#ad7839'},wood);
}
function addBackdrop(svg){
 const d=S('defs',{},svg);const rg=S('radialGradient',{id:'stageGlow',cx:.5,cy:.42,r:.62},d);S('stop',{offset:0,'stop-color':'#fff'},rg);S('stop',{offset:.58,'stop-color':'#f8fafd'},rg);S('stop',{offset:1,'stop-color':'#f2f5f9'},rg);
 S('rect',{x:0,y:0,width:1000,height:700,fill:'url(#stageGlow)'},svg);S('ellipse',{cx:500,cy:612,rx:310,ry:34,fill:'#3c4043',opacity:.045},svg)
}
function addHalo(parent,x,y,r=76,color='#cbd2d9'){const g=S('g',{opacity:0},parent);S('circle',{cx:x,cy:y,r:r*1.35,fill:'#fff',opacity:.94},g);S('circle',{cx:x,cy:y,r,fill:'none',stroke:color,'stroke-width':6,'stroke-opacity':.9},g);return g}
function setFocus(elements,target,a){elements.forEach((el,i)=>{const hit=i===target;SA(el,{opacity:hit?1:lerp(1,.30,a)});const base=hit?lerp(1,1.06,easeOutBack(a)):lerp(1,.94,a);el.dataset.focusScale=base})}
function setGroupTransform(el,x,y,rot=0,baseScale=1){const fs=Number(el.dataset.focusScale||1);T(el,x,y,rot,baseScale*fs)}
function wheelTravel(p){p=clamp(p);const a=.13,b=.60,total=a/2+(b-a)+(1-b)/3;let area;if(p<=a)area=p*p/(2*a);else if(p<=b)area=a/2+(p-a);else{const u=(p-b)/(1-b);area=a/2+(b-a)+(1-b)*(u-u*u+u*u*u/3)}return area/total}

/* Wheel — the selector is visible, the three candidates are always visible. */
function buildWheel(svg,state){
 const root=S('g',{},svg),frame=S('g',{filter:'url(#shadow)'},root);S('circle',{cx:500,cy:352,r:244,fill:'#fff',stroke:'#e1e5ea','stroke-width':18},frame);S('circle',{cx:500,cy:352,r:218,fill:'#fff'},frame);
 state.sectors=[];state.labels=[];state.wheel=S('g',{},root);
 for(let i=0;i<3;i++){const a0=-90+i*120,a1=a0+120,seg=S('path',{d:sector(500,352,204,a0,a1),fill:Q_COLORS[i],stroke:'#fff','stroke-width':6},state.wheel);state.sectors.push(seg);const mid=(a0+a1)/2*Math.PI/180;const label=txt(state.wheel,`Q${i+1}`,500+Math.cos(mid)*116,352+Math.sin(mid)*116,32,{fill:'#fff',weight:720});state.labels.push(label)}
 S('circle',{cx:500,cy:352,r:62,fill:'#fff',stroke:'#e1e5ea','stroke-width':3,filter:'url(#softShadow)'},root);S('circle',{cx:500,cy:352,r:32,fill:'url(#titanium)',stroke:'#9aa0a6','stroke-width':2},root);S('circle',{cx:490,cy:342,r:8,fill:'#fff',opacity:.72},root);state.pointer=S('path',{d:'M500 76 L470 143 Q500 131 530 143 Z',fill:'url(#graphite)',stroke:'#202124','stroke-width':2,filter:'url(#softShadow)'},root);state.halo=addHalo(root,500,135,45,Q_COLORS[state.target]);state.revealPoint={x:500,y:136}
}
function updateWheel(p,t,q,state){
 const target=qIndex(q),turns=7+Math.floor(seed01(41,state.seed)*2),centers=[-30,90,210],final=-90-centers[target],travel=wheelTravel(phase(p,.02,.91)),settle=phase(p,.80,.96),wob=settle>0&&settle<1?Math.sin(settle*Math.PI*4)*(1-settle)*3.2:0,angle=turns*360*travel+final*travel+wob,focus=smooth(phase(p,.92,1));
 state.wheel.setAttribute('transform',`rotate(${angle} 500 352)`);state.labels.forEach(el=>{const x=el.getAttribute('x'),y=el.getAttribute('y');el.setAttribute('transform',`rotate(${-angle} ${x} ${y})`)});state.sectors.forEach((s,i)=>SA(s,{opacity:i===target?1:lerp(1,.40,focus)}));SA(state.halo,{opacity:focus});SA(state.pointer,{transform:`translate(0 ${-Math.sin(focus*Math.PI)*5})`,stroke:focus>.25?Q_COLORS[target]:'#202124','stroke-width':lerp(2,4,focus)})
}

/* Plinko — the three destinations stay visible; only the ball is random. */
function plinkoPath(target,seed){const slots=[405,500,595],pts=[{x:500,y:116}],unit=42;let x=500;for(let r=1;r<=8;r++){const remaining=8-r,desired=slots[target];let step=seed01(r*7.7,seed)>.5?1:-1;if(remaining<=3&&Math.abs(desired-x)>unit*.45)step=desired>x?1:-1;x=clamp(x+step*unit,335,665);pts.push({x,y:116+r*50})}pts.push({x:slots[target],y:573});return pts}
function buildPlinko(svg,state){
 const root=S('g',{},svg);S('rect',{x:270,y:56,width:460,height:574,rx:38,fill:'url(#glass)',stroke:'#d5d9de','stroke-width':3,filter:'url(#shadow)'},root);S('path',{d:'M300 90 Q500 30 700 90',fill:'none',stroke:'#fff','stroke-opacity':.7,'stroke-width':10,'stroke-linecap':'round'},root);
 for(let r=0;r<8;r++){const count=7+(r%2),y=168+r*50;for(let c=0;c<count;c++){const x=350+c*(300/(count-1));S('circle',{cx:x,cy:y,r:5.5,fill:'#b0b6bd',stroke:'#fff','stroke-width':1.5},root)}}
 const slots=[405,500,595];state.slotGroups=[];for(let i=0;i<3;i++){const g=S('g',{},root);S('rect',{x:slots[i]-47,y:540,width:94,height:67,rx:16,fill:Q_TINTS[i],stroke:Q_COLORS[i],'stroke-opacity':.55,'stroke-width':2},g);txt(g,`Q${i+1}`,slots[i],573,21,{fill:Q_COLORS[i],weight:760});state.slotGroups.push(g)}state.ball=S('g',{filter:'url(#softShadow)'},root);state.ballCore=S('circle',{cx:0,cy:0,r:19,fill:'url(#ceramic)',stroke:'#b7bec6','stroke-width':2.5},state.ball);S('circle',{cx:-6,cy:-7,r:5.5,fill:'#fff',opacity:.88},state.ball);state.halo=addHalo(root,slots[state.target],573,45,Q_COLORS[state.target]);state.path=plinkoPath(state.target,state.seed);state.revealPoint={x:slots[state.target],y:573}
}
function updatePlinko(p,t,q,state){const target=qIndex(q),move=easeInOutQuint(phase(p,.02,.93)),seg=move*(state.path.length-1),i=Math.min(state.path.length-2,Math.floor(seg)),u=seg-i,a=state.path[i],b=state.path[i+1],x=lerp(a.x,b.x,u),y=lerp(a.y,b.y,u)-Math.sin(u*Math.PI)*14*(1-move*.25),focus=smooth(phase(p,.92,1)),sc=lerp(1,1.18,easeOutBack(focus));T(state.ball,x,y,0,sc);state.slotGroups.forEach((el,j)=>SA(el,{opacity:j===target?1:lerp(1,.42,focus)}));SA(state.halo,{opacity:focus});SA(state.ballCore,{stroke:focus>.12?Q_COLORS[target]:'#b7bec6','stroke-width':lerp(2.5,5,focus)})}

/* Physical selector helpers — candidates stay visible, the selector does the choosing. */
function candidatePuck(parent,index,r=42){
 const g=S('g',{filter:'url(#softShadow)'},parent);S('circle',{cx:0,cy:0,r,fill:'#fff',stroke:Q_COLORS[index],'stroke-width':3},g);S('circle',{cx:0,cy:0,r:r-10,fill:Q_TINTS[index]},g);txt(g,`Q${index+1}`,0,1,Math.round(r*.48),{fill:Q_COLORS[index],weight:760});S('circle',{cx:-r*.28,cy:-r*.30,r:r*.13,fill:'#fff',opacity:.78},g);return g
}
function candidatePad(parent,index,x,y,w=154,h=86){const g=S('g',{},parent);S('rect',{x:x-w/2,y:y-h/2,width:w,height:h,rx:26,fill:'#fff',stroke:'#d9dde3','stroke-width':2,filter:'url(#softShadow)'},g);S('rect',{x:x-w/2+10,y:y-h/2+10,width:6,height:h-20,rx:3,fill:Q_COLORS[index]},g);txt(g,`Q${index+1}`,x,y+1,28,{fill:Q_COLORS[index],weight:760});return g}

/* Kinetic Arena — one neutral ceramic puck receives a single launch impulse, then ricochets through a frictionless-looking air table until one of three fixed goal pockets captures it. The outcome is encoded only in the initial launch path; there is no mid-flight steering or object replacement. */
function buildArena(svg,state){
 const root=S('g',{},svg),table=S('g',{filter:'url(#shadow)'},root);
 S('path',{d:'M265 116 Q500 70 735 116 L828 352 Q790 582 590 625 Q500 646 410 625 Q210 582 172 352 Z',fill:'#fff',stroke:'#d8dde3','stroke-width':4},table);
 S('path',{d:'M291 145 Q500 105 709 145 L792 350 Q757 548 582 588 Q500 608 418 588 Q243 548 208 350 Z',fill:'#f7f9fc',stroke:'#eef1f4','stroke-width':3},table);
 // Three fixed candidate goals. They are visible from the first frame and never move.
 state.goalPos=[[500,145],[292,512],[708,512]];state.goals=[];
 state.goalPos.forEach((pos,i)=>{const g=S('g',{},root);S('circle',{cx:pos[0],cy:pos[1],r:58,fill:Q_TINTS[i],stroke:Q_COLORS[i],'stroke-width':3,filter:'url(#softShadow)'},g);S('circle',{cx:pos[0],cy:pos[1],r:38,fill:'#fff',opacity:.82},g);txt(g,`Q${i+1}`,pos[0],pos[1]+1,23,{fill:Q_COLORS[i],weight:760});state.goals.push(g)});
 // Neutral bumpers: the puck's course is visibly changed by these collisions.
 state.bumpers=[[385,285,42],[615,285,42],[500,415,47],[305,370,31],[695,370,31]];state.bumpers.forEach(([x,y,r])=>{const g=S('g',{filter:'url(#softShadow)'},root);S('circle',{cx:x,cy:y,r,fill:'#fff',stroke:'#cfd5dc','stroke-width':4},g);S('circle',{cx:x,cy:y,r:r-11,fill:'#eef2f6',stroke:'#fff','stroke-width':2},g);S('circle',{cx:x-r*.24,cy:y-r*.26,r:r*.13,fill:'#fff',opacity:.9},g)});
 // Spring launcher communicates the one-time initial impulse.
 state.launcher=S('g',{},root);S('rect',{x:470,y:555,width:60,height:82,rx:25,fill:'#eef2f6',stroke:'#d4d9df','stroke-width':3},state.launcher);state.spring=S('path',{d:'M500 625 l-16 -12 32 -14 -32 -14 32 -14 -16 -12',fill:'none',stroke:'#9aa0a6','stroke-width':6,'stroke-linejoin':'round','stroke-linecap':'round'},state.launcher);state.plunger=S('rect',{x:480,y:530,width:40,height:28,rx:14,fill:'url(#titanium)',stroke:'#9ca3aa','stroke-width':2},state.launcher);
 state.puck=S('g',{filter:'url(#shadow)'},root);state.puckCore=S('circle',{cx:0,cy:0,r:23,fill:'url(#ceramic)',stroke:'#9da4ac','stroke-width':2.6},state.puck);S('ellipse',{cx:-7,cy:-8,rx:7,ry:4.5,fill:'#fff',opacity:.92},state.puck);state.puckLabel=txt(state.puck,'',0,1,16,{fill:Q_COLORS[state.target],weight:800,opacity:0});
 state.halo=addHalo(root,state.goalPos[state.target][0],state.goalPos[state.target][1],62,Q_COLORS[state.target]);
 // Each path is a sequence of visibly plausible wall/bumper collision points ending at a fixed goal. Nothing jumps between paths mid-flight.
 const paths=[
  [[500,535],[500,485],[355,405],[438,322],[562,322],[500,145]],
  [[500,535],[548,472],[646,405],[744,255],[650,235],[438,245],[268,330],[292,512]],
  [[500,535],[452,472],[354,405],[256,255],[350,235],[562,245],[732,330],[708,512]]
 ];
 state.path=paths[state.target].map(([x,y])=>({x,y}));state.revealPoint={x:state.goalPos[state.target][0],y:state.goalPos[state.target][1]};
}
function updateArena(p,t,q,state){
 const target=qIndex(q),launch=smooth(phase(p,.00,.10)),move=wheelTravel(phase(p,.08,.93)),focus=smooth(phase(p,.91,1));
 // Compress then release the spring once; after launch the selector follows a continuous ricochet path.
 const compression=p<.08?smooth(phase(p,.00,.08)):1-smooth(phase(p,.08,.14));SA(state.spring,{transform:`translate(0 ${compression*16}) scale(1 ${1-compression*.18})`});SA(state.plunger,{y:530+compression*18});
 const seg=move*(state.path.length-1),i=Math.min(state.path.length-2,Math.floor(seg)),u=seg-i,a=state.path[i],b=state.path[i+1];
 // Tiny normal-direction lift on each segment gives impact energy without breaking continuity.
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len,arc=Math.sin(u*Math.PI)*10*(1-move*.55);let x=lerp(a.x,b.x,u)+nx*arc,y=lerp(a.y,b.y,u)+ny*arc;
 // The final path segment itself enters the pocket; no late steering is applied.
 const [gx,gy]=state.goalPos[target];
 T(state.puck,x,y,0,lerp(1,1.12,easeOutBack(focus)));SA(state.puckCore,{stroke:focus>.12?Q_COLORS[target]:'#9da4ac','stroke-width':lerp(2.6,5,focus)});state.puckLabel.textContent=`Q${target+1}`;SA(state.puckLabel,{opacity:focus,fill:Q_COLORS[target]});state.goals.forEach((el,j)=>SA(el,{opacity:j===target?1:lerp(1,.40,focus)}));state.halo.setAttribute('transform',`translate(${gx-state.goalPos[state.target][0]} ${gy-state.goalPos[state.target][1]})`);SA(state.halo,{opacity:focus});state.revealPoint={x:gx,y:gy};
}

/* Magnetic Rail — a single selector puck ricochets on a rail and is captured by one of three visible detents. */
function buildRail(svg,state){
 const root=S('g',{},svg),y=350;S('rect',{x:230,y:y-24,width:540,height:48,rx:24,fill:'#eef2f6',stroke:'#d8dde3','stroke-width':3,filter:'url(#softShadow)'},root);S('line',{x1:258,y1:y,x2:742,y2:y,stroke:'#c6ccd3','stroke-width':5,'stroke-linecap':'round'},root);S('rect',{x:218,y:y-54,width:18,height:108,rx:9,fill:'#9aa0a6'},root);S('rect',{x:764,y:y-54,width:18,height:108,rx:9,fill:'#9aa0a6'},root);
 const xs=[330,500,670];state.detents=[];state.pads=[];xs.forEach((x,i)=>{S('path',{d:`M${x-34} ${y+24} Q${x} ${y+66} ${x+34} ${y+24}`,fill:'none',stroke:'#d4d9df','stroke-width':7,'stroke-linecap':'round'},root);state.detents.push(S('circle',{cx:x,cy:y,r:29,fill:'#fff',stroke:'#d7dce2','stroke-width':3},root));state.pads.push(candidatePad(root,i,x,515,150,82))});state.puck=S('g',{filter:'url(#shadow)'},root);S('circle',{cx:0,cy:4,r:32,fill:'#aeb4bb',opacity:.34},state.puck);state.puckCore=S('circle',{cx:0,cy:0,r:31,fill:'url(#titanium)',stroke:'#8f969e','stroke-width':2.5},state.puck);S('circle',{cx:0,cy:0,r:18,fill:'url(#ceramic)',stroke:'#d5dae0','stroke-width':1.5},state.puck);S('ellipse',{cx:-8,cy:-9,rx:7,ry:4,fill:'#fff',opacity:.80},state.puck);state.halo=addHalo(root,500,350,48,Q_COLORS[state.target]);state.revealPoint={x:500,y:350};
}
function updateRail(p,t,q,state){
 const target=qIndex(q),xs=[330,500,670],minX=260,maxX=740,targetNorm=(xs[target]-minX)/(maxX-minX),travel=wheelTravel(phase(p,.02,.90)),cycles=4+Math.floor(seed01(23,state.seed)*2),z=(cycles*2+targetNorm)*travel,tri=1-Math.abs((z%2)-1),x=lerp(minX,maxX,tri),capture=smooth(phase(p,.84,.96)),focus=smooth(phase(p,.92,1)),snapX=lerp(x,xs[target],capture),bob=-Math.sin(capture*Math.PI)*8;
 T(state.puck,snapX,350+bob,0,lerp(1,1.08,focus));state.detents.forEach((el,i)=>SA(el,{stroke:i===target&&capture>.45?Q_COLORS[target]:'#d7dce2','stroke-width':i===target&&capture>.45?5:3}));SA(state.puckCore,{stroke:focus>.15?Q_COLORS[target]:'#8f969e','stroke-width':lerp(2.5,5,focus)});state.pads.forEach((el,i)=>SA(el,{opacity:i===target?1:lerp(1,.38,focus)}));state.halo.setAttribute('transform',`translate(${xs[target]-500} 0)`);SA(state.halo,{opacity:focus});state.revealPoint={x:xs[target],y:350};
}

/* Timing Gate — candidates circulate continuously; an independent trigger rotor fires the fixed gate when its marker reaches the sensor. */
function buildGate(svg,state){
 const root=S('g',{},svg);S('ellipse',{cx:500,cy:342,rx:285,ry:170,fill:'none',stroke:'#dfe4ea','stroke-width':28},root);S('ellipse',{cx:500,cy:342,rx:285,ry:170,fill:'none',stroke:'#fff','stroke-width':20},root);state.cands=[candidatePuck(root,0,40),candidatePuck(root,1,40),candidatePuck(root,2,40)];
 state.timer=S('g',{filter:'url(#softShadow)'},root);S('circle',{cx:500,cy:342,r:76,fill:'#fff',stroke:'#d8dde3','stroke-width':3},state.timer);S('circle',{cx:500,cy:342,r:62,fill:'#fafbfc',stroke:'#eceff2','stroke-width':2},state.timer);state.timerArm=S('line',{x1:500,y1:342,x2:500,y2:286,stroke:'#3c4043','stroke-width':7,'stroke-linecap':'round'},state.timer);S('circle',{cx:500,cy:342,r:13,fill:'url(#graphite)',stroke:'#fff','stroke-width':2},state.timer);S('path',{d:'M492 253 L500 239 L508 253 Z',fill:'#5f6368'},root);
 state.gate=S('g',{filter:'url(#softShadow)'},root);state.gateL=S('path',{d:'M420 512 H473',stroke:'#5f6368','stroke-width':15,'stroke-linecap':'round'},state.gate);state.gateR=S('path',{d:'M527 512 H580',stroke:'#5f6368','stroke-width':15,'stroke-linecap':'round'},state.gate);state.gateFrame=S('rect',{x:452,y:484,width:96,height:64,rx:30,fill:'none',stroke:'#d8dde3','stroke-width':3},state.gate);state.halo=addHalo(root,500,512,58,Q_COLORS[state.target]);state.revealPoint={x:500,y:512};
}
function updateGate(p,t,q,state){
 const target=qIndex(q),travel=wheelTravel(phase(p,.02,.90)),turns=5+Math.floor(seed01(31,state.seed)*2),targetOffset=Math.PI/2-target*Math.PI*2/3,base=(turns*Math.PI*2+targetOffset)*travel,triggerTravel=wheelTravel(phase(p,.04,.88)),triggerTurns=4+Math.floor(seed01(37,state.seed)*2),triggerAngle=triggerTurns*360*triggerTravel,close=easeOutCubic(phase(p,.86,.96)),focus=smooth(phase(p,.92,1));
 state.timerArm.setAttribute('transform',`rotate(${triggerAngle} 500 342)`);state.cands.forEach((el,i)=>{const a=base+i*Math.PI*2/3,x=500+Math.cos(a)*285,y=342+Math.sin(a)*170,front=.9+.1*((Math.sin(a)+1)/2),sc=front*(i===target?lerp(1,1.07,focus):1);SA(el,{opacity:i===target?1:lerp(1,.38,focus)});T(el,x,y,0,sc)});SA(state.gateL,{d:`M${lerp(420,454,close)} 512 H473`,stroke:focus>.15?Q_COLORS[target]:'#5f6368'});SA(state.gateR,{d:`M527 512 H${lerp(580,546,close)}`,stroke:focus>.15?Q_COLORS[target]:'#5f6368'});SA(state.gateFrame,{stroke:focus>.15?Q_COLORS[target]:'#d8dde3','stroke-width':lerp(3,5,focus)});SA(state.halo,{opacity:focus});
}

/* Roulette Bowl — one independent ball loses energy continuously and spirals into one of three fixed pockets. */
function buildBowl(svg,state){
 const root=S('g',{},svg),bowl=S('g',{filter:'url(#shadow)'},root);S('circle',{cx:500,cy:350,r:255,fill:'#fff',stroke:'#dce1e6','stroke-width':4},bowl);S('circle',{cx:500,cy:350,r:220,fill:'#f6f8fb',stroke:'#e8ecf0','stroke-width':2},bowl);S('circle',{cx:500,cy:350,r:152,fill:'#fff',stroke:'#e4e8ed','stroke-width':18},bowl);
 const pocketAngles=[-90,30,150].map(d=>d*Math.PI/180);state.pocketPos=pocketAngles.map(a=>[500+Math.cos(a)*137,350+Math.sin(a)*137]);state.pockets=[];state.pocketPos.forEach((pos,i)=>{const g=S('g',{},root);S('circle',{cx:pos[0],cy:pos[1],r:49,fill:Q_TINTS[i],stroke:Q_COLORS[i],'stroke-width':3},g);S('circle',{cx:pos[0],cy:pos[1],r:32,fill:'#fff',opacity:.76},g);txt(g,`Q${i+1}`,pos[0],pos[1]+1,22,{fill:Q_COLORS[i],weight:760});state.pockets.push(g)});state.ball=S('g',{filter:'url(#softShadow)'},root);state.ballCore=S('circle',{cx:0,cy:0,r:19,fill:'url(#pearl)',stroke:'#aeb6bf','stroke-width':2.3},state.ball);S('ellipse',{cx:-6,cy:-7,rx:5.5,ry:3.7,fill:'#fff',opacity:.9},state.ball);state.halo=addHalo(root,500,213,54,Q_COLORS[state.target]);state.revealPoint={x:500,y:213};
}
function updateBowl(p,t,q,state){
 const target=qIndex(q),pocketAngles=[-Math.PI/2,Math.PI/6,5*Math.PI/6],travel=wheelTravel(phase(p,.02,.91)),turns=5+Math.floor(seed01(43,state.seed)*2),start=-Math.PI/2-.45,final=pocketAngles[target],theta=start+(turns*Math.PI*2+(final-start))*travel,rad=lerp(232,142,smooth(phase(p,.12,.91))),settle=smooth(phase(p,.89,.97)),focus=smooth(phase(p,.92,1));let x=500+Math.cos(theta)*rad,y=350+Math.sin(theta)*rad;if(settle){const [tx,ty]=state.pocketPos[target],u=settle;x=lerp(x,tx,u);y=lerp(y,ty,u)-Math.sin(u*Math.PI)*8*(1-u)}T(state.ball,x,y,0,lerp(1,1.14,easeOutBack(focus)));SA(state.ballCore,{stroke:focus>.12?Q_COLORS[target]:'#aeb6bf','stroke-width':lerp(2.3,5,focus)});state.pockets.forEach((el,i)=>SA(el,{opacity:i===target?1:lerp(1,.38,focus)}));const [hx,hy]=state.pocketPos[target];state.halo.setAttribute('transform',`translate(${hx-500} ${hy-213})`);SA(state.halo,{opacity:focus});state.revealPoint={x:hx,y:hy};
}

const builders={wheel:buildWheel,plinko:buildPlinko,arena:buildArena,rail:buildRail,gate:buildGate,bowl:buildBowl},updaters={wheel:updateWheel,plinko:updatePlinko,arena:updateArena,rail:updateRail,gate:updateGate,bowl:updateBowl};
const engine={svg:null,scene:null,q:null,state:{},raf:0,started:0,duration:1,running:false,resolve:null,runId:0,
 mount(scene,q){this.stop();this.scene=scene;this.q=q;this.state={seed:Math.random()*1000,target:qIndex(q),revealPoint:{x:500,y:350}};sceneEl.dataset.scene=scene.id;sceneEl.innerHTML='';this.svg=S('svg',{class:'scene-svg',viewBox:'0 0 1000 700','preserveAspectRatio':'xMidYMid meet','aria-label':'抽籤動畫'},sceneEl);addDefs(this.svg);addBackdrop(this.svg);builders[scene.id](this.svg,this.state);updaters[scene.id](0,0,q,this.state)},
 play(duration){this.duration=duration;this.started=performance.now();this.running=true;const id=++this.runId;return new Promise(res=>{this.resolve=res;this.loop(this.started,id)})},
 loop(now,id){if(!this.running||id!==this.runId)return;const elapsed=now-this.started,p=clamp(elapsed/this.duration),t=elapsed/1000;updaters[this.scene.id](p,t,this.q,this.state);if(p<1)this.raf=requestAnimationFrame(n=>this.loop(n,id));else{this.running=false;const r=this.resolve;this.resolve=null;if(r)r()}},
 stop(){cancelAnimationFrame(this.raf);this.raf=0;this.running=false;this.runId++;if(this.resolve){this.resolve();this.resolve=null}}
};
function soundEvents(id,duration){const map={wheel:[[.08,360],[.24,410],[.50,470],[.72,535],[.88,640],[.97,820]],plinko:[[.08,390],[.22,420],[.36,455],[.50,490],[.64,530],[.78,585],[.96,840]],arena:[[.06,330],[.18,390],[.31,450],[.46,500],[.61,555],[.76,620],[.96,850]],rail:[[.08,350],[.24,410],[.40,470],[.56,525],[.74,630],[.96,850]],gate:[[.10,355],[.28,415],[.46,475],[.64,535],[.84,660],[.97,860]],bowl:[[.08,365],[.24,415],[.40,470],[.58,530],[.78,645],[.97,850]]};return (map[id]||[]).map(([p,f])=>setTimeout(()=>beep(f,.045,'triangle',.017),duration*p))}
function svgPointToViewport(point){const r=sceneEl.getBoundingClientRect(),scale=Math.min(r.width/1000,r.height/700),ox=(r.width-1000*scale)/2,oy=(r.height-700*scale)/2;return{x:r.left+ox+point.x*scale,y:r.top+oy+point.y*scale}}
async function openQuestion(q,point){resultImg.src=q.src;try{if(resultImg.decode)await resultImg.decode()}catch{}const ratio=(resultImg.naturalWidth||1)/(resultImg.naturalHeight||1);questionFrame.dataset.fit=ratio>4?'ultrawide':ratio<.9?'portrait':'standard';winner.textContent=q.id;winner.style.color=qColor(q);resultPackBtn.textContent=activePack;const vp=svgPointToViewport(point||{x:500,y:350});revealBridge.style.setProperty('--bridge-x',`${vp.x}px`);revealBridge.style.setProperty('--bridge-y',`${vp.y}px`);revealBridge.style.setProperty('--bridge-color',qColor(q));revealBridge.classList.remove('run');void revealBridge.offsetWidth;revealBridge.classList.add('run');await sleep(reduceMotion?10:330);result.classList.add('show');result.setAttribute('aria-hidden','false');setState(STATE.QUESTION);setTimeout(()=>revealBridge.classList.remove('run'),260);resultTone()}
function closeQuestion(){result.classList.remove('show');result.setAttribute('aria-hidden','true');setState(STATE.READY)}
async function draw(){if(!activePack){showPackPicker();return}if(busy||![STATE.READY,STATE.QUESTION].includes(appState))return;result.classList.remove('show');result.setAttribute('aria-hidden','true');const scene=chooseScene(),q=questions[chooseQuestion()],durations={wheel:3400,plinko:3200,arena:3600,rail:3450,gate:3550,bowl:3500},duration=reduceMotion?620:durations[scene.id];try{engine.mount(scene,q);setState(STATE.FOCUSING);await sleep(reduceMotion?10:260);setState(STATE.ANIMATING);const timers=soundEvents(scene.id,duration);await engine.play(duration);timers.forEach(clearTimeout);setState(STATE.REVEALING);await sleep(reduceMotion?10:260);await openQuestion(q,engine.state.revealPoint)}catch(e){console.error(e);engine.stop();setState(STATE.READY);toastMsg('請再試一次')}}

packBtn.onclick=showPackPicker;resultPackBtn.onclick=()=>{closeQuestion();showPackPicker()};packOptions.forEach(b=>b.onclick=()=>selectPack(b.dataset.pack));soundBtn.onclick=()=>{soundOn=!soundOn;updateSound()};drawBtn.onclick=draw;nextBtn.onclick=async()=>{closeQuestion();await sleep(50);draw()};
document.addEventListener('keydown',e=>{if(packPicker.classList.contains('show'))return;if(e.key===' '||e.key==='Enter'){e.preventDefault();result.classList.contains('show')?nextBtn.click():draw()}if(e.key==='Escape'&&result.classList.contains('show'))closeQuestion()});
updateSound();setState(STATE.PACK);const urlPack=packFromUrl();if(urlPack)selectPack(urlPack);else showPackPicker();
})();
