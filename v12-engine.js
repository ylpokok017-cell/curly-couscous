(()=>{
'use strict';
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const seed01=(n,s=0)=>{const x=Math.sin(n*12.9898+s*78.233)*43758.5453;return x-Math.floor(x)};
const hex=h=>{h=(h||'#ffffff').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255]};
const Q=['#4285F4','#EA4335','#34A853'];

class GLRenderer{
  constructor(host,reduceMotion=false){
    this.host=host;this.reduceMotion=reduceMotion;this.canvas=document.createElement('canvas');this.canvas.className='scene-gl';this.canvas.setAttribute('aria-hidden','true');host.appendChild(this.canvas);this.gl=null;this.ok=false;this.vertices=[];this.particles=[];this.rings=[];this.lastNow=0;this.dpr=1;this._init();
  }
  _init(){
    try{
      const gl=this.canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:false,powerPreference:'high-performance'})||this.canvas.getContext('experimental-webgl');
      if(!gl)return;this.gl=gl;
      const vs=`
        attribute vec2 a_pos;attribute float a_size;attribute vec4 a_color;attribute float a_inner;
        uniform vec2 u_view;uniform float u_dpr;
        varying vec4 v_color;varying float v_inner;
        void main(){
          float sc=min(u_view.x/1000.0,u_view.y/700.0);
          vec2 off=(u_view-vec2(1000.0,700.0)*sc)*0.5;
          vec2 px=off+a_pos*sc;
          vec2 clip=vec2(px.x/u_view.x*2.0-1.0,1.0-px.y/u_view.y*2.0);
          gl_Position=vec4(clip,0.0,1.0);gl_PointSize=max(1.0,a_size*sc*u_dpr);
          v_color=a_color;v_inner=a_inner;
        }`;
      const fs=`
        precision mediump float;varying vec4 v_color;varying float v_inner;
        void main(){
          vec2 p=gl_PointCoord*2.0-1.0;float d=length(p);
          float outer=1.0-smoothstep(0.91,1.0,d);float a=outer;
          if(v_inner>0.01){float inner=smoothstep(v_inner-0.045,v_inner+0.045,d);a*=inner;}
          if(a<=0.001)discard;gl_FragColor=vec4(v_color.rgb,v_color.a*a);
        }`;
      const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'shader');return s};
      const pr=gl.createProgram();gl.attachShader(pr,compile(gl.VERTEX_SHADER,vs));gl.attachShader(pr,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr)||'program');
      this.program=pr;this.buf=gl.createBuffer();this.loc={pos:gl.getAttribLocation(pr,'a_pos'),size:gl.getAttribLocation(pr,'a_size'),color:gl.getAttribLocation(pr,'a_color'),inner:gl.getAttribLocation(pr,'a_inner'),view:gl.getUniformLocation(pr,'u_view'),dpr:gl.getUniformLocation(pr,'u_dpr')};
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);this.ok=true;
    }catch(e){console.warn('WebGL unavailable; SVG fallback active.',e);this.ok=false;}
  }
  reset(){this.particles=[];this.rings=[];this.vertices=[];this.lastNow=0;this.clear();}
  resize(){if(!this.ok)return;const r=this.host.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));this.cssW=r.width;this.cssH=r.height;this.dpr=dpr;if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}this.gl.viewport(0,0,w,h)}
  clear(){if(!this.ok)return;this.resize();const gl=this.gl;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT)}
  begin(now=performance.now()){
    if(!this.ok)return;this.resize();const dt=this.lastNow?clamp((now-this.lastNow)/1000,0,.05):0;this.lastNow=now;this.vertices=[];
    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-2.2*dt);p.vy=p.vy*Math.exp(-2.0*dt)+p.gravity*dt;}
    this.particles=this.particles.filter(p=>p.life>0);
    for(const r of this.rings){r.life-=dt;r.r+=r.speed*dt;}
    this.rings=this.rings.filter(r=>r.life>0);
    for(const p of this.particles){const u=p.life/p.maxLife;this.disc(p.x,p.y,p.size*(.55+.45*u),p.color,p.alpha*u*u)}
    for(const r of this.rings){const u=r.life/r.maxLife;this.ring(r.x,r.y,r.r,1-r.thickness/r.r,r.color,r.alpha*u)}
  }
  _push(x,y,size,color,alpha=1,inner=0){if(!this.ok||alpha<=.001||size<=.1)return;const c=Array.isArray(color)?color:hex(color);this.vertices.push(x,y,size,c[0],c[1],c[2],alpha,inner)}
  disc(x,y,r,color='#fff',alpha=1){this._push(x,y,r*2,color,alpha,0)}
  ring(x,y,r,innerFrac=.78,color='#fff',alpha=1){this._push(x,y,r*2,color,alpha,clamp(innerFrac,.05,.96))}
  velocityTrail(x,y,vx,vy,r,color='#c8ced5',alpha=1){if(this.reduceMotion)return;const speed=Math.hypot(vx,vy);const strength=clamp((speed-80)/1500)*alpha;if(strength<=.01)return;const n=4,len=clamp(speed*.032,7,68),mag=Math.max(1,speed),nx=vx/mag,ny=vy/mag;for(let i=n;i>=1;i--){const u=i/n;this.disc(x-nx*len*u,y-ny*len*u,r*(1-u*.18),color,strength*(.08+(1-u)*.10))}}
  ball(x,y,r,{base='#e9edf2',edge='#9ba3ab',accent='#ffffff',focus='#4285F4',focusAmount=0,vx=0,vy=0,shadow=true,metal=false}={}){
    const speed=Math.hypot(vx,vy);this.velocityTrail(x,y,vx,vy,r,focusAmount>.25?focus:edge,1-focusAmount*.45);
    const rim=focusAmount>.12?focus:edge;if(shadow)this.disc(x+3,y+6.5,r*1.13,'#3c4043',.17);
    this.disc(x,y,r,rim,lerp(.82,1,focusAmount));this.disc(x,y,r*.91,base,1);
    if(metal){this.disc(x-r*.16,y-r*.18,r*.68,'#ffffff',.16);this.disc(x+r*.13,y+r*.16,r*.56,'#7f8790',.10)}
    this.disc(x-r*.30,y-r*.31,r*.23,accent,.82);
    if(speed>1100&&!this.reduceMotion)this.disc(x,y,r*1.06,'#ffffff',clamp((speed-1100)/2800)*.08);
  }
  impact(x,y,color='#aeb5bd',power=1,nx=0,ny=-1){if(!this.ok||this.reduceMotion)return;power=clamp(power,.3,1.6);this.rings.push({x,y,r:18,thickness:3.2,speed:54+power*22,color,alpha:.38*power,life:.34,maxLife:.34});const tangentX=-ny,tangentY=nx,n=5+Math.round(power*4);for(let i=0;i<n;i++){const a=(i/(n-1)-.5)*1.65,jitter=(seed01(i+3,x+y)-.5)*.34,ca=Math.cos(a+jitter),sa=Math.sin(a+jitter),dx=nx*ca+tangentX*sa,dy=ny*ca+tangentY*sa,sp=(65+seed01(i+11,x)*135)*power;this.particles.push({x,y,vx:dx*sp,vy:dy*sp,size:2.2+seed01(i+17,y)*2.4,color,alpha:.44,gravity:42,life:.30+seed01(i+19,x+y)*.18,maxLife:.48})}}
  magneticField(x,y,color='#4285F4',strength=1){if(!this.ok||this.reduceMotion||strength<=.02)return;for(let i=0;i<3;i++)this.ring(x,y,44+i*16,.94,color,strength*(.08-i*.018))}
  flush(){if(!this.ok)return;const gl=this.gl;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);if(!this.vertices.length)return;const data=new Float32Array(this.vertices);gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buf);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);const stride=8*4;gl.enableVertexAttribArray(this.loc.pos);gl.vertexAttribPointer(this.loc.pos,2,gl.FLOAT,false,stride,0);gl.enableVertexAttribArray(this.loc.size);gl.vertexAttribPointer(this.loc.size,1,gl.FLOAT,false,stride,2*4);gl.enableVertexAttribArray(this.loc.color);gl.vertexAttribPointer(this.loc.color,4,gl.FLOAT,false,stride,3*4);gl.enableVertexAttribArray(this.loc.inner);gl.vertexAttribPointer(this.loc.inner,1,gl.FLOAT,false,stride,7*4);gl.uniform2f(this.loc.view,this.cssW||1,this.cssH||1);gl.uniform1f(this.loc.dpr,this.dpr||1);gl.drawArrays(gl.POINTS,0,data.length/8)}
}

function eventQueue(obj){obj.events=[];obj.emit=(kind,data={})=>obj.events.push({kind,...data});obj.drain=()=>obj.events.splice(0);return obj}
function stepTo(obj,target,fn,step=1/180){target=Math.max(0,target);if(target<obj.time-1e-6){obj.reset?.();return;}while(obj.time+step<=target+1e-9){fn(step,obj.time);obj.time+=step}}
function spring1D(x,v,target,k,c,dt){const a=k*(target-x)-c*v;v+=a*dt;x+=v*dt;return[x,v]}

function makeWheel(target,seed){
  const o=eventQueue({type:'wheel',target,seed,time:0});const turns=7+Math.floor(seed01(41,seed)*3),centers=[-30,90,210],final=(-90-centers[target])*Math.PI/180;const total=turns*TAU+final,T=2.72,k=2.45;o.omega0=total*k/(1-Math.exp(-k*T));o.angle=0;o.omega=o.omega0;o.pointer=0;o.pointerV=0;o.lastTick=0;o.capture=false;o.step=t=>{t=clamp(t,0,T);const angle=o.omega0/k*(1-Math.exp(-k*t));const omega=o.omega0*Math.exp(-k*t);const tick=Math.floor(Math.abs(angle)/(20*Math.PI/180));const crossings=Math.min(4,Math.max(0,tick-o.lastTick));for(let i=0;i<crossings;i++){o.pointerV-=3.0;o.emit('tick',{power:clamp(omega/o.omega0,.3,1)});}o.lastTick=tick;const dt=Math.max(0,t-o.time);if(dt>0){let remain=dt;while(remain>1e-6){const h=Math.min(1/120,remain),a=-92*o.pointer-15*o.pointerV;o.pointerV+=a*h;o.pointer+=o.pointerV*h;remain-=h}}o.time=t;o.angle=angle;o.omega=omega;if(t>T*.94&&!o.capture){o.capture=true;o.emit('capture',{power:1})}return o};o.duration=T;return o;
}

function makePlinko(target,seed){
  const rows=[];for(let rr=0;rr<8;rr++){const count=7+(rr%2),y=168+rr*50,xs=[];for(let c=0;c<count;c++)xs.push(350+c*(300/(count-1)));rows.push({y,xs})}const slots=[405,500,595],R=12,STEP=1/180;
  const outcome=(x0,vx0)=>{let x=x0,y=116,vx=vx0,vy=45;for(let n=0;n<Math.floor(2.9/STEP);n++){vy+=760*STEP;vx*=Math.exp(-.10*STEP);x+=vx*STEP;y+=vy*STEP;if(x<302){x=302+(302-x);vx=Math.abs(vx)*.58}if(x>698){x=698-(x-698);vx=-Math.abs(vx)*.58}for(const row of rows){if(Math.abs(y-row.y)>R+6)continue;for(const px of row.xs){const dx=x-px,dy=y-row.y,rr=R+5.5,d2=dx*dx+dy*dy;if(d2<rr*rr&&d2>1e-7){const d=Math.sqrt(d2),nx=dx/d,ny=dy/d;x=px+nx*rr;y=row.y+ny*rr;const vn=vx*nx+vy*ny;if(vn<0){vx-=(1+.38)*vn*nx;vy-=(1+.38)*vn*ny}}}}if(y>=535){let idx=0;if(Math.abs(x-500)<Math.abs(x-405))idx=1;if(Math.abs(x-595)<Math.abs(x-slots[idx]))idx=2;return{idx,time:n*STEP,x}}}return{idx:-1,time:2.9,x}};
  let best=null;for(let i=0;i<360;i++){const u=(seed01(i*2+1,seed)+i*.61803398875)%1,v=(seed01(i*2+2,seed+17)+i*.41421356237)%1,x0=440+u*120,vx=-430+v*860,res=outcome(x0,vx);if(res.idx!==target||res.time<1.25||res.time>2.82)continue;const score=Math.abs(res.x-slots[target])+Math.abs(res.time-2.15)*9+seed01(i+91,seed)*3;if(!best||score<best.score)best={x0,vx,score}}
  if(!best){for(let i=0;i<1000;i++){const x0=435+seed01(i*3+5,seed+31)*130,vx=-470+seed01(i*3+7,seed+53)*940,res=outcome(x0,vx);if(res.idx===target){best={x0,vx,score:0};break}}}best||=(target===0?{x0:470,vx:-360}:target===1?{x0:500,vx:90}:{x0:530,vx:360});
  const o=eventQueue({type:'plinko',target,seed,time:0,x:best.x0,y:116,vx:best.vx,vy:45,r:R,captured:false,hitCooldown:new Map(),slots,rows,launch:{x:best.x0,vx:best.vx}});
  o.reset=()=>{};o.step=t=>{stepTo(o,t,(dt,now)=>{if(o.captured){let a=spring1D(o.x,o.vx,o.slots[target],58,14,dt);o.x=a[0];o.vx=a[1];a=spring1D(o.y,o.vy,573,64,15,dt);o.y=a[0];o.vy=a[1];return}o.vy+=760*dt;o.vx*=Math.exp(-.10*dt);o.x+=o.vx*dt;o.y+=o.vy*dt;if(o.x<302){o.x=302+(302-o.x);o.vx=Math.abs(o.vx)*.58;o.emit('wall',{x:o.x,y:o.y,nx:1,ny:0,power:.55})}if(o.x>698){o.x=698-(o.x-698);o.vx=-Math.abs(o.vx)*.58;o.emit('wall',{x:o.x,y:o.y,nx:-1,ny:0,power:.55})}
    for(let ri=0;ri<rows.length;ri++){const row=rows[ri];if(Math.abs(o.y-row.y)>R+6)continue;for(let ci=0;ci<row.xs.length;ci++){const px=row.xs[ci],dx=o.x-px,dy=o.y-row.y,rr=R+5.5,d2=dx*dx+dy*dy;if(d2<rr*rr&&d2>1e-7){const d=Math.sqrt(d2),nx=dx/d,ny=dy/d;o.x=px+nx*rr;o.y=row.y+ny*rr;const vn=o.vx*nx+o.vy*ny;if(vn<0){const before=Math.hypot(o.vx,o.vy);o.vx-=(1+.38)*vn*nx;o.vy-=(1+.38)*vn*ny;const key=ri*16+ci,last=o.hitCooldown.get(key)||-9;if(now-last>.05){o.hitCooldown.set(key,now);o.emit('impact',{x:px,y:row.y,nx,ny,power:clamp(before/700,.42,1.25)})}}}}}
    if(o.y>=535){let idx=0;if(Math.abs(o.x-500)<Math.abs(o.x-405))idx=1;if(Math.abs(o.x-595)<Math.abs(o.x-o.slots[idx]))idx=2;if(idx===target){o.captured=true;o.emit('capture',{x:o.slots[target],y:573,nx:0,ny:-1,power:1})}}
  },STEP);return o};o.duration=2.9;return o;
}

function makeArena(target,seed){
  const goals=[[500,145],[292,512],[708,512]],bumpers=[[385,285,42],[615,285,42],[500,415,47],[305,370,31],[695,370,31]],speed=500,STEP=1/180;
  const outcome=angle=>{let x=500,y=535,vx=Math.cos(angle)*speed,vy=Math.sin(angle)*speed;for(let n=0;n<Math.floor(2.48/STEP);n++){const drag=Math.exp(-.035*STEP);vx*=drag;vy*=drag;x+=vx*STEP;y+=vy*STEP;if(x<248){x=248+(248-x);vx=Math.abs(vx)*.92}if(x>752){x=752-(x-752);vx=-Math.abs(vx)*.92}if(y<153){y=153+(153-y);vy=Math.abs(vy)*.92}if(y>557){y=557-(y-557);vy=-Math.abs(vy)*.92}for(const [bx,by,br] of bumpers){const dx=x-bx,dy=y-by,rr=23+br,d2=dx*dx+dy*dy;if(d2<rr*rr&&d2>1e-7){const d=Math.sqrt(d2),nx=dx/d,ny=dy/d;x=bx+nx*rr;y=by+ny*rr;const vn=vx*nx+vy*ny;if(vn<0){vx-=(1+.96)*vn*nx;vy-=(1+.96)*vn*ny}}}for(let i=0;i<goals.length;i++){const dx=x-goals[i][0],dy=y-goals[i][1];if(dx*dx+dy*dy<45*45)return{idx:i,time:n*STEP}}}return{idx:-1,time:2.48}};
  let best=null;const offset=seed01(73,seed);for(let i=0;i<600;i++){const angle=((offset+i*.61803398875)%1)*TAU,res=outcome(angle);if(res.idx!==target||res.time<.75||res.time>2.25)continue;const score=Math.abs(res.time-1.55)+seed01(i+41,seed)*.18;if(!best||score<best.score)best={angle,score,time:res.time}}if(!best){for(let i=0;i<1200;i++){const angle=((offset+i*.38196601125)%1)*TAU,res=outcome(angle);if(res.idx===target){best={angle,score:0,time:res.time};break}}}best||={angle:[.96,1.91,.68][target],score:0,time:1.5};
  const angle=best.angle,o=eventQueue({type:'arena',target,seed,time:0,x:500,y:535,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:23,captured:false,goals,bumpers,hitCooldown:new Map(),launchAngle:angle});
  o.step=t=>{stepTo(o,t,(dt,now)=>{if(o.captured){let a=spring1D(o.x,o.vx,goals[target][0],64,15,dt);o.x=a[0];o.vx=a[1];a=spring1D(o.y,o.vy,goals[target][1],64,15,dt);o.y=a[0];o.vy=a[1];return}const drag=Math.exp(-.035*dt);o.vx*=drag;o.vy*=drag;o.x+=o.vx*dt;o.y+=o.vy*dt;const minX=248,maxX=752,minY=153,maxY=557;if(o.x<minX){o.x=minX+(minX-o.x);o.vx=Math.abs(o.vx)*.92;o.emit('impact',{x:minX,y:o.y,nx:1,ny:0,power:.7})}if(o.x>maxX){o.x=maxX-(o.x-maxX);o.vx=-Math.abs(o.vx)*.92;o.emit('impact',{x:maxX,y:o.y,nx:-1,ny:0,power:.7})}if(o.y<minY){o.y=minY+(minY-o.y);o.vy=Math.abs(o.vy)*.92;o.emit('impact',{x:o.x,y:minY,nx:0,ny:1,power:.7})}if(o.y>maxY){o.y=maxY-(o.y-maxY);o.vy=-Math.abs(o.vy)*.92;o.emit('impact',{x:o.x,y:maxY,nx:0,ny:-1,power:.7})}
    for(let j=0;j<bumpers.length;j++){const [bx,by,br]=bumpers[j],dx=o.x-bx,dy=o.y-by,rr=o.r+br,d2=dx*dx+dy*dy;if(d2<rr*rr&&d2>1e-7){const d=Math.sqrt(d2),nx=dx/d,ny=dy/d;o.x=bx+nx*rr;o.y=by+ny*rr;const vn=o.vx*nx+o.vy*ny;if(vn<0){const before=Math.hypot(o.vx,o.vy);o.vx-=(1+.96)*vn*nx;o.vy-=(1+.96)*vn*ny;const last=o.hitCooldown.get(j)||-9;if(now-last>.075){o.hitCooldown.set(j,now);o.emit('impact',{x:bx+nx*br,y:by+ny*br,nx,ny,power:clamp(before/520,.55,1.35)})}}}}
    for(let i=0;i<goals.length;i++){const dx=o.x-goals[i][0],dy=o.y-goals[i][1];if(dx*dx+dy*dy<45*45){if(i===target){o.captured=true;o.emit('capture',{x:goals[i][0],y:goals[i][1],nx:-dx/45,ny:-dy/45,power:1.1})}else{const d=Math.max(1,Math.hypot(dx,dy)),nx=dx/d,ny=dy/d,vn=o.vx*nx+o.vy*ny;o.x=goals[i][0]+nx*49;o.y=goals[i][1]+ny*49;if(vn<0){o.vx-=1.7*vn*nx;o.vy-=1.7*vn*ny}}}}
  },STEP);return o};o.duration=2.48;return o;
}

function makeRail(target,seed){
  const xs=[330,500,670],dir=seed01(24,seed)>.5?1:-1;const o=eventQueue({type:'rail',target,seed,time:0,x:500,vx:dir*760,y:350,captured:false,xs,lastWall:-9});
  o.step=t=>{stepTo(o,t,(dt,now)=>{let a=-.22*o.vx;if(o.captured){a+=58*(xs[target]-o.x)-12*o.vx}else if(now>1.65){const ramp=clamp((now-1.65)/.45),dx=xs[target]-o.x;a+=ramp*(22*dx-5.8*o.vx)}o.vx+=a*dt;o.x+=o.vx*dt;if(o.x<260){o.x=260+(260-o.x);o.vx=Math.abs(o.vx)*.82;if(now-o.lastWall>.08){o.lastWall=now;o.emit('wall',{x:260,y:350,nx:1,ny:0,power:.8})}}else if(o.x>740){o.x=740-(o.x-740);o.vx=-Math.abs(o.vx)*.82;if(now-o.lastWall>.08){o.lastWall=now;o.emit('wall',{x:740,y:350,nx:-1,ny:0,power:.8})}}if(now>2.20&&!o.captured&&Math.abs(o.x-xs[target])<28&&Math.abs(o.vx)<115){o.captured=true;o.emit('capture',{x:xs[target],y:357,nx:0,ny:-1,power:1})}},1/240);o.y=350+clamp((o.time-1.8)/1.0)*7;return o};o.duration=2.82;return o;
}

function makeGate(target,seed){
  const o=eventQueue({type:'gate',target,seed,time:0,jaw:0,jawV:0,triggered:false,captured:false});const T=2.78,k=2.25,turns=5+Math.floor(seed01(31,seed)*2),final=Math.PI/2-target*TAU/3,total=turns*TAU+final;o.omega0=total*k/(1-Math.exp(-k*T));const rotorTurns=5+Math.floor(seed01(37,seed)*2),rotT=2.24,rotK=2.1,rotTotal=rotorTurns*TAU;o.rotOmega0=rotTotal*rotK/(1-Math.exp(-rotK*rotT));o.lastTick=0;o.step=t=>{t=clamp(t,0,T);const prev=o.time;o.time=t;o.angle=o.omega0/k*(1-Math.exp(-k*t));o.omega=o.omega0*Math.exp(-k*t);const rt=Math.min(t,rotT),rot=o.rotOmega0/rotK*(1-Math.exp(-rotK*rt));o.rotor=rot;const tick=Math.floor(rot/(Math.PI/2));if(tick>o.lastTick){o.lastTick=tick;o.emit('tick',{power:.5})}if(t>=rotT&&!o.triggered){o.triggered=true;o.jawV=2.1;o.emit('gate',{power:1})}let rem=Math.max(0,t-prev);while(rem>1e-6){const dt=Math.min(1/120,rem),targetJaw=o.triggered?1:0,a=48*(targetJaw-o.jaw)-12*o.jawV;o.jawV+=a*dt;o.jaw+=o.jawV*dt;rem-=dt}o.jaw=clamp(o.jaw,-.03,1.06);if(o.jaw>.88&&!o.captured){o.captured=true;o.emit('capture',{x:500,y:512,power:.95})}return o};o.duration=T;return o;
}

function bowlIntegral(omega0=22,k=500,c=24,drag=.75,T=2.8){let r=226,vr=0,om=omega0,theta=0,dt=1/360;for(let t=0;t<T;t+=dt){const h=Math.min(dt,T-t),a=r*om*om-k*(r-132)-c*vr;vr+=a*h;r+=vr*h;om+=(-drag*om-.0005*vr*om)*h;theta+=om*h}return theta}
function makeBowl(target,seed){
  const targetAngles=[-Math.PI/2,Math.PI/6,5*Math.PI/6],families=[18.4,20.3,22.2,24.1],base=families[Math.floor(seed01(43,seed)*families.length)%families.length],omega0=base+(seed01(45,seed)-.5)*.45,k=500,c=24,drag=.75,T=2.8;const delta=bowlIntegral(omega0,k,c,drag,T),variant=(seed01(44,seed)-.5)*.045;const o=eventQueue({type:'bowl',target,seed,time:0,r:226,vr:0,omega:omega0,theta:targetAngles[target]-delta+variant,x:500,y:124,lastRoll:0,captured:false,omega0});
  o.step=t=>{stepTo(o,t,(dt,now)=>{const a=o.r*o.omega*o.omega-k*(o.r-132)-c*o.vr;o.vr+=a*dt;o.r+=o.vr*dt;o.omega+=(-drag*o.omega-.0005*o.vr*o.omega)*dt;o.theta+=o.omega*dt;const tick=Math.floor(o.theta/.42);if(tick!==o.lastRoll){o.lastRoll=tick;o.emit('roll',{power:clamp(o.omega/omega0,.25,.8)})}},1/360);o.x=500+Math.cos(o.theta)*o.r;o.y=350+Math.sin(o.theta)*o.r;if(!o.captured&&o.time>T*.96){o.captured=true;o.emit('capture',{x:500+Math.cos(targetAngles[target])*137,y:350+Math.sin(targetAngles[target])*137,nx:-Math.cos(targetAngles[target]),ny:-Math.sin(targetAngles[target]),power:1})}return o};o.duration=T;return o;
}

function createPhysics(type,target,seed){if(type==='wheel')return makeWheel(target,seed);if(type==='plinko')return makePlinko(target,seed);if(type==='arena')return makeArena(target,seed);if(type==='rail')return makeRail(target,seed);if(type==='gate')return makeGate(target,seed);if(type==='bowl')return makeBowl(target,seed);return null}

window.V12={version:'12.0',Q,GLRenderer,createPhysics,clamp,lerp,seed01};
})();
