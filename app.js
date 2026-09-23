(async()=>{
'use strict';
const $=s=>document.querySelector(s),canvas=$('#map'),ctx=canvas.getContext('2d'),earth=$('#earth'),detail=$('#detail'),M=window.FogAtlas;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data;try{const r=await fetch('atlas-data.json');if(!r.ok)throw Error();data=await r.json()}catch{detail.textContent='The atlas could not be loaded. Reload to try again.';$('#loading').textContent='ATLAS UNAVAILABLE';return}
const G=M.create(data),N=G.nodes,E=G.edges,B=G.byId,located=M.located;
let W=0,H=0,dpr=1,yaw=20*Math.PI/180,pitch=25*Math.PI/180,zoom=1,selected=null,hovered=null,query='',filter='all',hits=[],scheduled=false;
const MAX_ZOOM=18,MIN_ZOOM=.7,labelElements=new Map(),arcCache=new Map();
const geo=()=>({cx:W*.51,cy:H*.49,R:Math.min(W*.47,H*.475)*zoom});
const camera=()=>({yaw,pitch});
const project=(n,alt=1)=>M.project(n,camera(),geo(),alt);
const stage=ep=>M.stage(ep,camera(),geo(),W,H);
const relatedEpisodes=n=>G.episodeIds(n).map(id=>B[id]);
const match=n=>(filter==='all'||filter===n.type)&&(!query||[n.name,n.city,n.country,...(n.aliases||[]),...relatedEpisodes(n).map(e=>e.name+' '+e.country)].join(' ').toLowerCase().includes(query));
function requestDraw(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;draw()})}
let gl,program,texture,textureReady=false;
try{
gl=earth.getContext('webgl',{alpha:false,antialias:true});if(!gl)throw Error('WebGL');
const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
gl.attachShader(program,compile(gl.FRAGMENT_SHADER,`precision highp float;
uniform vec2 resolution;uniform vec2 center;uniform float radius;uniform float yaw;uniform float pitch;uniform sampler2D earthMap;
void main(){vec2 p=(gl_FragCoord.xy-center)/radius;float rr=dot(p,p);vec3 bg=vec3(.0078,.0157,.0235);if(rr>1.){float glow=exp(-(sqrt(rr)-1.)*43.)*.16;gl_FragColor=vec4(bg+vec3(.18,.40,.59)*glow,1.);return;}
float z=sqrt(1.-rr);float yy=p.y*cos(pitch)+z*sin(pitch);float zz=-p.y*sin(pitch)+z*cos(pitch);float xx=p.x*cos(yaw)-zz*sin(yaw);float zw=p.x*sin(yaw)+zz*cos(yaw);vec2 uv=vec2(.5+atan(xx,zw)/6.2831853,.5-asin(clamp(yy,-1.,1.))/3.14159265);vec3 t=texture2D(earthMap,uv).rgb;
// Preserve the original night palette, with a restrained lift to surface detail.
float light=max(0.,t.r-t.b*.72);
vec3 surface=pow(t,vec3(.90))*vec3(.48,.65,.76);
vec3 col=surface+vec3(1.5,.92,.27)*pow(light,.72)*2.45;
col*=.64+.36*pow(z,.35);
float rim=pow(1.-z,5.);col+=vec3(.07,.15,.22)*rim*.7;
gl_FragColor=vec4(col,1.);}`));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader link');gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const img=new Image();img.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);textureReady=true;$('#loading').hidden=true;requestDraw()};img.onerror=()=>{$('#loading').textContent='Texture unavailable · the list and search remain accessible'};img.src='assets/earth-night.jpg';
}catch{$('#loading').textContent='3D globe unavailable in this browser. Explore the network using the list.'}
function drawEarth(){if(!gl||!textureReady)return;const {cx,cy,R}=geo();gl.viewport(0,0,earth.width,earth.height);gl.useProgram(program);gl.uniform2f(gl.getUniformLocation(program,'resolution'),earth.width,earth.height);gl.uniform2f(gl.getUniformLocation(program,'center'),cx*dpr,(H-cy)*dpr);gl.uniform1f(gl.getUniformLocation(program,'radius'),R*dpr);gl.uniform1f(gl.getUniformLocation(program,'yaw'),yaw);gl.uniform1f(gl.getUniformLocation(program,'pitch'),pitch);gl.drawArrays(gl.TRIANGLES,0,6)}
function activeNetwork(){
  const nodeIds=new Set(),edgeIds=new Set();
  for(const id of new Set([selected,hovered].filter(Boolean))){const network=G.visualNetwork(id);network.nodeIds.forEach(n=>nodeIds.add(n));network.edgeIds.forEach(e=>edgeIds.add(e));}
  return {nodeIds,edgeIds};
}
function drawArc(e){
  const a=B[e.source],b=B[e.target];if(!located(a)||!located(b))return false;
  if(!arcCache.has(e.id))arcCache.set(e.id,M.arc(a,b));
  ctx.beginPath();let pen=false;
  const points=arcCache.get(e.id),start=project(a),end=project(b),dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy);
  // A slight screen-space bow keeps routes legible even when viewed end-on.
  const bow=Math.min(70,length*.16);
  if(start.v>.015&&end.v>.015){
    // Projected flight-map curves keep both ends anchored without curling at the horizon.
    ctx.moveTo(start.x,start.y);
    ctx.quadraticCurveTo((start.x+end.x)/2-(length?dy/length:0)*bow*2,(start.y+end.y)/2+(length?dx/length:0)*bow*2,end.x,end.y);
  }else{
    points.forEach(n=>{const p=project(n);if(p.v<=.015){pen=false;return}
      if(pen)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);pen=true;});
  }
  // A flight-map route, with a soft bloom and a fine luminous core.
  const rgb='255,197,104';
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  ctx.shadowColor=`rgba(${rgb},.8)`;ctx.shadowBlur=15;
  ctx.strokeStyle=`rgba(${rgb},.10)`;ctx.lineWidth=7;ctx.stroke();
  ctx.shadowBlur=7;ctx.strokeStyle=`rgba(${rgb},.30)`;ctx.lineWidth=3;ctx.stroke();
  ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,229,178,.94)';ctx.lineWidth=1;ctx.stroke();
  ctx.restore();return true;
}
function visibleNodes(active,stages){
  return G.all.filter(n=>{
    if(!located(n))return false;
    if(n.type==='hub')return true;
    if(n.type==='episode')return stages[n.id]!=='detail';
    if(active.nodeIds.has(n.id))return true;
    const role=G.role(n);
    if(role==='producer'&&n.appearances.length&&zoom>=3&&project(n).v>.85)return true;
    return G.episodes.some(ep=>{
      if(stages[ep.id]==='episodes')return false;
      if([...ep.focusIds,...ep.guestIds].includes(n.id))return true;
      return stages[ep.id]==='detail'&&role==='producer'&&n.appearances.length&&n.country===ep.country;
    });
  }).map(n=>({n,p:project(n)})).filter(({p})=>p.v>.025&&p.x>8&&p.x<W-8&&p.y>45&&p.y<H-65);
}
function marker(n,p,active){
  const role=G.role(n),emphasis=n.id===selected||n.id===hovered,dim=active.nodeIds.size&&!active.nodeIds.has(n.id);
  const style={episode:{r:5,color:'#ffd17e',alpha:1,glow:16},focus:{r:4.8,color:'#ffd17e',alpha:1,glow:16},guest:{r:3.8,color:'#dae9f3',alpha:.72,glow:9},producer:{r:2.7,color:'#b9cbd8',alpha:.46,glow:4}}[role];
  ctx.globalAlpha=dim?.24:emphasis?1:active.nodeIds.has(n.id)?Math.max(.8,style.alpha):style.alpha;ctx.fillStyle=style.color;ctx.shadowColor=style.color;ctx.shadowBlur=emphasis?20:style.glow;
  ctx.beginPath();ctx.arc(p.x,p.y,style.r+(emphasis?1.3:0),0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  if(role==='episode'||emphasis){ctx.strokeStyle=style.color;ctx.lineWidth=.8;ctx.beginPath();ctx.arc(p.x,p.y,style.r+5,0,Math.PI*2);ctx.stroke()}
  ctx.globalAlpha=1;hits.push({n,x:p.x,y:p.y});
}
function placeLabels(visible,active){
  const used=new Set(),boxes=[];
  const sorted=[...visible].sort((a,b)=>(b.n.id===selected)-(a.n.id===selected)||(b.n.type==='hub')-(a.n.type==='hub')||(b.n.type==='episode')-(a.n.type==='episode'));
  for(const {n,p} of sorted){
    const role=G.role(n),inScene=G.episodes.some(ep=>stage(ep)!=='episodes'&&[...ep.focusIds,...ep.guestIds].includes(n.id)),wanted=n.type==='hub'||role==='episode'||((role==='focus'||role==='guest')&&(inScene||active.nodeIds.has(n.id)))||(role==='producer'&&(active.nodeIds.has(n.id)||(zoom>=3&&p.v>.85)||G.episodes.some(ep=>stage(ep)==='detail'&&n.country===ep.country)))||n.id===selected||n.id===hovered;
    if(!wanted)continue;
    let el=labelElements.get(n.id);
    if(!el){el=document.createElement('button');el.className='map-label '+role;el.dataset.node=n.id;el.setAttribute('aria-label',`Open ${n.name}${n.type==='episode'?' · '+n.country:''}`);el.innerHTML=`<span>${esc(n.name)}</span><small>${esc(n.type==='episode'?n.country:role==='guest'?'GUEST MIX':n.location?.precision==='country'?n.country:n.city)}</small>`;$('#map-labels').append(el);labelElements.set(n.id,el)}
    el.hidden=false;el.classList.toggle('selected',n.id===selected);el.classList.toggle('lit',active.nodeIds.has(n.id));el.classList.toggle('dimmed',active.nodeIds.size>0&&!active.nodeIds.has(n.id));
    const w=el.offsetWidth,h=el.offsetHeight,offsets=[[15,-h/2],[-w-15,-h/2],[15,20],[-w-15,20],[15,-h-20],[-w-15,-h-20],[15,h+18],[-w-15,h+18],[15,-2*h-18],[-w-15,-2*h-18],[15,2*h+30],[-w-15,2*h+30]];
    let box;
    for(const [dx,dy] of offsets){const q={x:p.x+dx,y:p.y+dy,w,h};if(q.x<8||q.x+w>W-8||q.y<48||q.y+h>H-70)continue;if(boxes.some(b=>q.x<b.x+b.w+5&&q.x+w+5>b.x&&q.y<b.y+b.h+3&&q.y+h+3>b.y))continue;box=q;break}
    if(!box){if(n.type!=='episode'&&n.type!=='hub'&&n.id!==selected){el.hidden=true;continue}box={x:Math.max(8,Math.min(W-w-8,p.x+15)),y:Math.max(48,Math.min(H-h-70,p.y-h/2)),w,h}}
    boxes.push(box);el.style.transform=`translate(${Math.round(box.x)}px,${Math.round(box.y)}px)`;used.add(n.id);
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(box.x>p.x?box.x:box.x+box.w,box.y+box.h/2);ctx.strokeStyle='rgba(164,184,204,.32)';ctx.lineWidth=.6;ctx.stroke();
  }
  for(const [id,el] of labelElements)if(!used.has(id))el.hidden=true;
}
function draw(){
  if(!W||!H)return;drawEarth();ctx.clearRect(0,0,W,H);hits=[];
  const active=activeNetwork(),stages=Object.fromEntries(G.episodes.map(e=>[e.id,stage(e)]));
  let arcCount=0;for(const e of G.visualEdges)if(active.edgeIds.has(e.id)&&drawArc(e))arcCount++;
  const visible=visibleNodes(active,stages);visible.forEach(({n,p})=>marker(n,p,active));placeLabels(visible,active);
  const nearby=G.episodes.filter(e=>stages[e.id]!=='episodes').sort((a,b)=>project(b).v-project(a).v)[0];
  $('#map-level').textContent=nearby?`${nearby.name} / ${stages[nearby.id]==='detail'?'PEOPLE & PLACES':'LOCAL SCENE'}`:'FOG / EPISODES';
  $('#episode-return').hidden=!nearby||stages[nearby.id]!=='detail';if(nearby){$('#episode-return').dataset.node=nearby.id;$('#episode-return').textContent=`${nearby.name} · EPISODE ↗`}
  $('#coordinates').textContent=`LAT ${(pitch*180/Math.PI).toFixed(1)}°   LON ${(((-yaw*180/Math.PI+180)%360+360)%360-180).toFixed(1)}°`;
  $('#zoom-value').textContent=zoom.toFixed(1)+'×';
  // Readable state on the rendered surface also supports regression checks.
  canvas.dataset.visibleProducers=visible.filter(({n})=>G.role(n)==='producer').map(({n})=>n.id).join('|');canvas.dataset.selected=selected||'';canvas.dataset.hovered=hovered||'';canvas.dataset.arcCount=String(arcCount);canvas.dataset.level=nearby?stages[nearby.id]:'episodes';
}
function size(){const r=canvas.getBoundingClientRect();W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);earth.width=canvas.width;earth.height=canvas.height;ctx.setTransform(dpr,0,0,dpr,0,0);requestDraw()}new ResizeObserver(size).observe(canvas);
function row(n,subtitle){const role=G.role(n);return `<button class="network-row" data-node="${esc(n.id)}"><i class="${role==='episode'?'ring':role==='focus'?'gold':'white'}"></i><span>${esc(n.name)}<small>${esc(subtitle||locationLabel(n))}</small></span><span class="arrow">↗</span></button>`}
let currentRecording=null,playerTimer=null;
function soundCloudURL(r,autoplay=false){
  const url=new URL(r.url);if(url.protocol!=='https:'||url.hostname!=='soundcloud.com')throw Error('Invalid recording URL');
  return 'https://w.soundcloud.com/player/?url='+encodeURIComponent('https://api.soundcloud.com/tracks/soundcloud:tracks:'+r.id)+'&color=%23ffc568&auto_play='+autoplay+'&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false';
}
function player(r){
  return `<div class="recording"><div class="eyebrow">${r.role==='guest'?'GUEST MIX':'FOG SELECTION'}</div><h3>${esc(r.title)}</h3><button class="play-recording" data-play="${esc(r.id)}" aria-label="Play ${esc(r.title)}"><span aria-hidden="true">▶</span><span>LISTEN IN PAGE<small>SoundCloud · full recording</small></span></button></div>`;
}
function playRecording(id){
  const r=G.recordings[id];if(!r)return;
  const dock=$('#listening-player');dock.hidden=false;dock.classList.remove('minimized');document.body.classList.add('listening');$('#minimize-player').textContent='−';$('#minimize-player').setAttribute('aria-expanded','true');
  $('#playing-title').textContent=r.title;$('#player-source').href=r.url;
  if(currentRecording!==id){currentRecording=id;clearTimeout(playerTimer);$('#player-status').hidden=false;$('#player-status').textContent='Loading SoundCloud…';const frame=document.createElement('iframe');frame.id='soundcloud-frame';frame.title='SoundCloud player: '+r.title;frame.height='166';frame.allow='autoplay';frame.onload=()=>{clearTimeout(playerTimer);$('#player-status').hidden=true};frame.src=soundCloudURL(r,true);$('#soundcloud-host').replaceChildren(frame);playerTimer=setTimeout(()=>{$('#player-status').textContent='SoundCloud is taking longer to load. Try another browser, or open the recording below.'},15000);}
}
$('#minimize-player').onclick=()=>{const min=$('#listening-player').classList.toggle('minimized');$('#minimize-player').textContent=min?'+':'−';$('#minimize-player').setAttribute('aria-expanded',String(!min))};
$('#close-player').onclick=()=>{clearTimeout(playerTimer);$('#soundcloud-host').replaceChildren();$('#listening-player').hidden=true;document.body.classList.remove('listening');currentRecording=null};
function players(ids){return [...new Set(ids)].map(id=>G.recordings[id]).filter(Boolean).map(player).join('')}
function overview(){
  detail.innerHTML=`<div class="eyebrow">FOG / RADIO ATLAS</div><h2 class="panel-title">Follow the music.<br>Across borders.</h2><p class="intro">Start with an episode. Zoom into its country to meet the labels, guests and producers behind the music.</p><div class="stats"><div><strong>${G.episodes.length}</strong><span>COUNTRIES</span></div><div><strong>${data.recordings.length}</strong><span>RECORDINGS</span></div></div><section class="section"><h2>CHOOSE AN EPISODE</h2>${G.episodes.map(e=>row(e,e.country+' · '+e.focusIds.map(id=>B[id].name).join(' / '))).join('')}</section><p class="note">Hover to trace connections. Click to keep them lit. Zoom closer to reveal the local scene.</p><button class="network-row" id="pending"><span>Explore all producers<small>Across every FOG tracklist</small></span><span class="arrow">→</span></button>`;
  $('#pending').onclick=()=>{filter='artist';$('#type').value=filter;query='';$('#search').value='';openSearch();results()};
}
function locationLabel(n){return n.location?.display_label||n.city+(n.country&&n.city!==n.country?' · '+n.country:'')}
function choose(n,focus=true){
  n=B[G.selectionId(n.id)];
  selected=n.id;hovered=null;
  if(located(n)){yaw=-n.lon*Math.PI/180;pitch=n.lat*Math.PI/180;}
  else if(n.type!=='episode'){const ep=relatedEpisodes(n)[0];if(ep){yaw=-ep.lon*Math.PI/180;pitch=ep.lat*Math.PI/180;}}
  const close='<button class="back" id="close-detail" aria-label="Close details">×</button>';
  if(n.type==='hub'){
    detail.innerHTML=`${close}<div class="eyebrow">FOG / BOLOGNA</div><h2 class="panel-title">FOG</h2><div class="location">Bologna · Italy</div><p class="intro">A radio and research project by Gilles Barberis. From Bologna, FOG connects every episode, artist, label, collective and festival in this atlas.</p><section class="section"><h2>EXPLORE THE EPISODES</h2>${G.episodes.map(ep=>row(ep,ep.country)).join('')}</section><section class="section"><h2>LISTEN</h2>${players(data.recordings.map(r=>r.id))}</section>`;
  }else if(n.type==='episode'){
    const members=N.filter(p=>p.appearances.some(id=>n.recordingIds.includes(id))),pending=members.filter(p=>!located(p));
    detail.innerHTML=`${close}<div class="eyebrow">FOG / COUNTRY EPISODE</div><h2 class="panel-title">${esc(n.name)}</h2><p class="episode-country">${esc(n.country)}</p><p class="intro">${esc(n.focusIds.map(id=>B[id].name).join(' / '))}</p><button class="scene-button" data-scene="${esc(n.id)}">EXPLORE THE LOCAL SCENE +</button><section class="section"><h2>LISTEN / TWO RECORDINGS</h2>${players(n.recordingIds)}</section><section class="section"><h2>FOCUS & GUEST</h2>${[...new Set([...n.focusIds,...n.guestIds])].map(id=>row(B[id],n.guestIds.includes(id)?'Guest mix'+(n.focusIds.includes(id)?' / episode focus':''):'Episode focus')).join('')}</section><section class="section"><h2>PRODUCERS IN THESE RECORDINGS <span class="muted">/ ${members.length}</span></h2><p class="note">Connections follow the tracklists, wherever each artist is based.${pending.length?' '+pending.length+' locations are still being researched.':''}</p>${members.map(p=>row(p,located(p)?locationLabel(p):'Location to verify')).join('')}</section>`;
  }else{
    const eps=relatedEpisodes(n),relationships=E.filter(e=>e.kind!=='appears_in'&&e.kind!=='episode_focus'&&e.kind!=='guest_mix'&&(e.source===n.id||e.target===n.id));
    detail.innerHTML=`${close}<div class="eyebrow">${G.role(n)==='guest'?'GUEST / PRODUCER':n.type.toUpperCase()}</div><h2 class="panel-title">${esc(n.name)}</h2><div class="location">${esc(located(n)?locationLabel(n):'Location to verify')}</div><section class="section"><h2>HEARD IN FOG</h2>${eps.map(ep=>row(ep,ep.country)).join('')||'<p class="note">Episode links are being researched.</p>'}${players(G.recordingIds(n))}</section><section class="section"><h2>CONNECTED SCENES</h2>${relationships.map(e=>row(B[e.source===n.id?e.target:e.source],e.kind.replaceAll('_',' '))).join('')||'<p class="note">More connections will be added as the archive is researched.</p>'}</section>`;
  }
  $('#close-detail').onclick=()=>{selected=null;hovered=null;overview();requestDraw()};$('#panel').scrollTop=0;closeSearch();requestDraw();
  if(focus&&innerWidth<=760)$('#panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
}
function scene(ep){yaw=-ep.lon*Math.PI/180;pitch=ep.lat*Math.PI/180;zoom=Math.min(MAX_ZOOM,.54*Math.min(W,H)/(ep.angularSpan*Math.PI/180*Math.min(W*.47,H*.475)));hovered=null;requestDraw();if(innerWidth<=760)$('#atlas').scrollIntoView({behavior:'smooth'})}
function delegatedClick(e){const play=e.target.closest('[data-play]');if(play){playRecording(play.dataset.play);return}const b=e.target.closest('[data-node]');if(b&&B[b.dataset.node])choose(B[b.dataset.node]);const s=e.target.closest('[data-scene]');if(s)scene(B[s.dataset.scene])}
detail.addEventListener('click',delegatedClick);$('#episode-return').addEventListener('click',delegatedClick);
const layer=$('#map-labels');layer.addEventListener('click',delegatedClick);
layer.addEventListener('pointerover',e=>{const b=e.target.closest('[data-node]');if(b){hovered=b.dataset.node;requestDraw()}});
layer.addEventListener('pointerout',e=>{const b=e.target.closest('[data-node]');if(b&&!b.contains(e.relatedTarget)){hovered=null;requestDraw()}});
layer.addEventListener('focusin',e=>{const b=e.target.closest('[data-node]');if(b){hovered=b.dataset.node;requestDraw()}});
layer.addEventListener('focusout',()=>{hovered=null;requestDraw()});
function results(){const rows=G.all.filter(match);$('#count').textContent=`${rows.length} ${rows.length===1?'result':'results'}`;$('#results').innerHTML=rows.map(n=>`<button class="result" data-node="${esc(n.id)}">${esc(n.name)}<small>${esc(n.type==='episode'?n.country+' · two recordings':located(n)?locationLabel(n):relatedEpisodes(n).map(e=>e.name).join(' / ')+' · location to verify')}</small></button>`).join('')||'<p class="note">No results. Try another name.</p>'}
$('#results').addEventListener('click',delegatedClick);
function openSearch(){$('#explorer').hidden=false;$('#explore').setAttribute('aria-expanded','true');$('#search').focus()}
function closeSearch(){$('#explorer').hidden=true;$('#explore').setAttribute('aria-expanded','false')}
$('#explore').onclick=()=>$('#explorer').hidden?openSearch():closeSearch();$('#close-search').onclick=()=>{closeSearch();$('#explore').focus()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#explorer').hidden){closeSearch();$('#explore').focus()}});
$('#search').oninput=e=>{query=e.target.value.trim().toLowerCase();results()};$('#type').onchange=e=>{filter=e.target.value;results()};
function reset(){yaw=20*Math.PI/180;pitch=25*Math.PI/180;zoom=1;selected=null;hovered=null;query='';filter='all';$('#search').value='';$('#type').value='all';overview();results();requestDraw()}
function setZoom(value){zoom=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,value));hovered=null;requestDraw()}
$('#reset').onclick=reset;$('#west').onclick=()=>{yaw+=.35;hovered=null;requestDraw()};$('#east').onclick=()=>{yaw-=.35;hovered=null;requestDraw()};$('#plus').onclick=()=>setZoom(zoom*1.3);$('#minus').onclick=()=>setZoom(zoom/1.3);
const pointers=new Map();let origin,last,moved=false,pinch=0;
function hitAt(x,y){return hits.filter(o=>Math.hypot(o.x-x,o.y-y)<14).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0]}
canvas.onpointerdown=e=>{hovered=null;pointers.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture(e.pointerId);origin=last=[e.clientX,e.clientY];moved=pointers.size>1;if(pointers.size>1){const[a,b]=[...pointers.values()];pinch=Math.hypot(a[0]-b[0],a[1]-b[1])}requestDraw()};
canvas.onpointerleave=()=>{hovered=null;requestDraw()};
canvas.onpointermove=e=>{
  if(!pointers.has(e.pointerId)){const r=canvas.getBoundingClientRect(),hit=hitAt(e.clientX-r.left,e.clientY-r.top),next=hit?.n.id||null;if(next!==hovered){hovered=next;requestDraw()}canvas.style.cursor=hit?'pointer':'grab';return}
  pointers.set(e.pointerId,[e.clientX,e.clientY]);
  if(pointers.size>1){moved=true;const[a,b]=[...pointers.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch>0)setZoom(zoom*d/pinch);pinch=d}
  else{if(Math.hypot(e.clientX-origin[0],e.clientY-origin[1])>5)moved=true;const sensitivity=.004/Math.sqrt(zoom);yaw+=(e.clientX-last[0])*sensitivity;pitch=Math.max(-1.5,Math.min(1.5,pitch+(e.clientY-last[1])*sensitivity))}
  hovered=null;last=[e.clientX,e.clientY];requestDraw();
};
canvas.onpointerup=e=>{if(!moved&&pointers.size===1){const r=canvas.getBoundingClientRect(),hit=hitAt(e.clientX-r.left,e.clientY-r.top);if(hit)choose(hit.n)}pointers.delete(e.pointerId);moved=true;pinch=0;if(pointers.size)origin=last=[...pointers.values()][0];requestDraw()};
canvas.onpointercancel=e=>{pointers.delete(e.pointerId);moved=true;pinch=0;hovered=null;requestDraw()};
canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*Math.exp(-e.deltaY*.0015))},{passive:false});
$('#total').textContent=String(G.episodes.length);overview();results();size();
})();
