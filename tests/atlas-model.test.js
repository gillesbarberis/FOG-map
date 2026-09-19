const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const M=require('../atlas-model.js');
const data=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../atlas-data.json'),'utf8'));
const graph=M.create(data);
test('all references resolve, and every country has two different recordings',()=>{
  assert.equal(new Set(graph.all.map(n=>n.id)).size,graph.all.length);
  for(const ep of graph.episodes){assert.equal(new Set(ep.recordingIds).size,2);ep.recordingIds.forEach(id=>assert.ok(graph.recordings[id]));[...ep.focusIds,...ep.guestIds].forEach(id=>assert.ok(graph.byId[id]));}
  graph.edges.forEach(e=>{assert.ok(graph.byId[e.source]);assert.ok(graph.byId[e.target]);});
  graph.nodes.forEach(n=>n.appearances.forEach(id=>assert.ok(graph.recordings[id])));
});
test('episode country never supplies missing producer coordinates',()=>{
  const n=graph.byId['FOG Japan-7'];assert.equal(n.name,'Voiski');assert.equal(M.located(n),false);assert.equal(n.country,'');
  assert.equal(graph.byId['FOG Mexico-0'].country,'Portugal');
});
test('a producer can connect to several episodes without changing their location',()=>{
  const n=graph.byId['FOG Mexico-0'];assert.deepEqual(graph.episodeIds(n).sort(),['FOG_KOR','FOG_MEX']);
  const network=graph.network(n.id);assert.ok(network.nodeIds.has('FOG_KOR'));assert.ok(network.nodeIds.has('FOG_MEX'));assert.ok(network.nodeIds.has('st'));
});
test('Japan main and guest players are assigned from the actual tracklist',()=>{
  assert.deepEqual(graph.recordingIds(graph.byId['FOG Japan-13']),['2395019760']);
  assert.deepEqual(graph.recordingIds(graph.byId['FOG Japan-12']).sort(),['2361046511','2395019760']);
});
test('a France-based artist from the Korea tracklist remains in France',()=>{
  const n=graph.byId['FOG Korea-7'];assert.equal(n.city,'Paris');assert.deepEqual(graph.episodeIds(n),['FOG_KOR']);
});
test('semantic detail requires country scale and centering',()=>{
  const ep=graph.byId.FOG_FRA,c={yaw:-ep.lon*Math.PI/180,pitch:ep.lat*Math.PI/180};
  assert.equal(M.stage(ep,c,{cx:500,cy:400,R:380},1000,800),'episodes');
  assert.equal(M.stage(ep,c,{cx:500,cy:400,R:1140},1000,800),'scene');
  assert.equal(M.stage(ep,c,{cx:500,cy:400,R:2280},1000,800),'detail');
  assert.equal(M.stage(ep,{yaw:c.yaw+Math.PI,pitch:c.pitch},{cx:500,cy:400,R:2280},1000,800),'episodes');
});
test('arcs remain finite and connect exact endpoints, including antipodes',()=>{
  for(const b of [{lat:0,lon:180},{lat:48.8566,lon:2.3522}]){const points=M.arc({lat:0,lon:0},b);assert.equal(points.length,65);assert.ok(points.every(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)));assert.ok(Math.abs(points.at(-1).lat-b.lat)<.0001);}
  assert.deepEqual(M.arc({lat:0,lon:0},{lat:0,lon:0}),[]);
});
