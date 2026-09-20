/* Pure geography and graph rules, shared by the renderer and regression tests. */
(function(root){
'use strict';
const radians=d=>d*Math.PI/180;
const located=n=>Number.isFinite(n.lat)&&Number.isFinite(n.lon);
function create(data){
  const episodes=data.episodes.map(e=>({...e,type:'episode',city:e.country}));
  const nodes=[...data.nodes,...(data.hub?[data.hub]:[])].map(n=>({...n,...(n.location?{lat:n.location.lat,lon:n.location.lon,city:n.location.city,country:n.location.country}:{city:'Location to verify',country:''})}));
  const all=[...episodes,...nodes],byId=Object.fromEntries(all.map(n=>[n.id,n]));
  const recordings=Object.fromEntries(data.recordings.map(r=>[r.id,r]));
  const edges=data.relations.map(e=>({...e,id:`relation:${e.source}:${e.target}:${e.kind}`}));
  if(data.hub)for(const n of all)if(n.id!==data.hub.id)edges.push({id:`hub:${n.id}`,source:n.id,target:data.hub.id,kind:'part_of_fog'});
  for(const ep of episodes){
    for(const n of nodes){
      const recordings=n.appearances.filter(id=>ep.recordingIds.includes(id));
      if(recordings.length)edges.push({id:`appearance:${n.id}:${ep.id}`,source:n.id,target:ep.id,kind:'appears_in',recordingIds:recordings});
    }
    for(const id of new Set([...ep.focusIds,...ep.guestIds]))edges.push({id:`focus:${ep.id}:${id}`,source:ep.id,target:id,kind:ep.focusIds.includes(id)?'episode_focus':'guest_mix'});
  }
  function episodeIds(n){
    if(n.type==='episode')return [n.id];
    return episodes.filter(e=>[...e.focusIds,...e.guestIds].includes(n.id)||n.appearances.some(r=>e.recordingIds.includes(r))).map(e=>e.id);
  }
  function recordingIds(n){
    if(n.type==='episode')return n.recordingIds;
    const ids=new Set(n.appearances);
    for(const ep of episodes)if(ep.focusIds.includes(n.id)&&n.type!=='artist')for(const id of ep.recordingIds)ids.add(id);
    return [...ids];
  }
  function network(id){
    const node=byId[id],nodeIds=new Set(),edgeIds=new Set();
    if(!node)return {nodeIds,edgeIds};
    nodeIds.add(id);
    const add=edge=>{edgeIds.add(edge.id);nodeIds.add(edge.source);nodeIds.add(edge.target)};
    for(const edge of edges)if(edge.source===id||edge.target===id)add(edge);
    if(node.type==='episode'){
      // Expand this episode's people and focus organisations, never the global hub.
      const seeds=new Set([...nodeIds].filter(key=>byId[key].type!=='hub'&&byId[key].type!=='episode'));
      for(const edge of edges)if(seeds.has(edge.source)||seeds.has(edge.target))add(edge);
      // Show which episodes feature artists reached through a focus organisation.
      const artists=new Set([...nodeIds].filter(key=>byId[key].type==='artist'));
      for(const edge of edges)if(edge.kind==='appears_in'&&artists.has(edge.source))add(edge);
    }
    return {nodeIds,edgeIds};
  }
  const focusCountry=new Map();
  for(const ep of episodes)for(const id of ep.focusIds)if(byId[id].type!=='artist')focusCountry.set(id,ep.id);
  const selectionId=id=>focusCountry.get(id)||id;
  const visualMap=new Map();
  function route(source,target){
    if(source===target)return;
    const key=[source,target].sort().join(':');
    if(!visualMap.has(key))visualMap.set(key,{id:'route:'+key,source,target,kind:'country_connection'});
  }
  for(const edge of edges){
    if(edge.kind==='part_of_fog'){route(edge.source,edge.target);continue}
    const source=selectionId(edge.source),target=selectionId(edge.target);
    if(byId[source].type==='episode'&&byId[target].type==='artist')route(source,target);
    else if(byId[target].type==='episode'&&byId[source].type==='artist')route(target,source);
  }
  const visualEdges=[...visualMap.values()];
  function visualNetwork(id){
    id=selectionId(id);
    const nodeIds=new Set([id]),edgeIds=new Set();
    for(const edge of visualEdges)if(edge.source===id||edge.target===id){
      edgeIds.add(edge.id);nodeIds.add(edge.source);nodeIds.add(edge.target);
    }
    for(const ep of episodes)if(nodeIds.has(ep.id))for(const focus of ep.focusIds)nodeIds.add(focus);
    return {nodeIds,edgeIds};
  }
  function role(n){
    if(n.type==='episode')return 'episode';
    if(episodes.some(e=>e.focusIds.includes(n.id)))return 'focus';
    if(episodes.some(e=>e.guestIds.includes(n.id)))return 'guest';
    return n.type==='artist'?'producer':'focus';
  }
  return {episodes,nodes,all,byId,edges,recordings,episodeIds,recordingIds,network,role,selectionId,visualEdges,visualNetwork};
}
function project(n,camera,geometry,alt=1){
  const a=radians(n.lat),b=radians(n.lon),X=Math.cos(a)*Math.sin(b),Y=Math.sin(a),Z=Math.cos(a)*Math.cos(b);
  const xx=X*Math.cos(camera.yaw)+Z*Math.sin(camera.yaw),zz=-X*Math.sin(camera.yaw)+Z*Math.cos(camera.yaw);
  const yy=Y*Math.cos(camera.pitch)-zz*Math.sin(camera.pitch),v=Y*Math.sin(camera.pitch)+zz*Math.cos(camera.pitch);
  return {x:geometry.cx+xx*geometry.R*alt,y:geometry.cy-yy*geometry.R*alt,v};
}
function stage(ep,camera,geometry,width,height){
  const p=project(ep,camera,geometry);
  // Detail depends on the country's apparent size AND its position near the centre.
  const coverage=radians(ep.angularSpan)*geometry.R/Math.min(width,height);
  if(p.v>.94&&Math.hypot(p.x-geometry.cx,p.y-geometry.cy)<Math.min(width,height)*.28&&coverage>=.50)return 'detail';
  if(p.v>.75&&coverage>=.24)return 'scene';
  return 'episodes';
}
function arc(a,b,steps=64){
  const vector=n=>{const lat=radians(n.lat),lon=radians(n.lon);return [Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)]};
  const A=vector(a),B=vector(b),dot=Math.max(-1,Math.min(1,A.reduce((s,v,i)=>s+v*B[i],0))),angle=Math.acos(dot);
  if(angle<.00001)return [];
  let tangent=B.map((v,i)=>v-dot*A[i]),length=Math.hypot(...tangent);
  if(length<.00001){const helper=Math.abs(A[1])<.9?[0,1,0]:[1,0,0],d=A.reduce((s,v,i)=>s+v*helper[i],0);tangent=helper.map((v,i)=>v-d*A[i]);length=Math.hypot(...tangent)}
  tangent=tangent.map(v=>v/length);
  return Array.from({length:steps+1},(_,i)=>{const t=i/steps,V=A.map((v,j)=>v*Math.cos(angle*t)+tangent[j]*Math.sin(angle*t));return {lat:Math.asin(Math.max(-1,Math.min(1,V[1])))*180/Math.PI,lon:Math.atan2(V[0],V[2])*180/Math.PI,alt:1+.12*Math.sin(Math.PI*t)}});
}
const api={create,located,project,stage,arc};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FogAtlas=api;
})(typeof window!=='undefined'?window:globalThis);
