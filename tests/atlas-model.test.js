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
  const fixture=structuredClone(data);fixture.nodes.find(n=>n.id==='FOG Japan-7').location=null;
  const n=M.create(fixture).byId['FOG Japan-7'];assert.equal(M.located(n),false);assert.equal(n.country,'');
  assert.equal(graph.byId['FOG Japan-7'].country,'France');
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

test('researched geography retains precision, evidence and unresolved cases',()=>{
  for(const n of data.nodes){
    if(n.location){
      const l=n.location;
      assert.ok(Number.isFinite(l.lat)&&Math.abs(l.lat)<=90,n.id);
      assert.ok(Number.isFinite(l.lon)&&Math.abs(l.lon)<=180,n.id);
      assert.ok(['city','regional','country'].includes(l.precision),n.id);
      if(l.status!=='provided_unverified'){
        assert.ok(l.sources.length>0,n.id);
        assert.ok(l.sources.every(s=>new URL(s).protocol==='https:'),n.id);
        assert.match(l.checked_at,/^\d{4}-\d{2}-\d{2}$/);
      }
    }else{
      assert.equal(n.geography_research.status,'unresolved',n.id);
      assert.ok(n.geography_research.sources.length>0,n.id);
    }
  }
  assert.equal(graph.byId['FOG Japan-13'].location.precision,'country');
  assert.ok(!graph.byId['FOG Japan-13'].location.sources.includes('https://soundcloud.com/sabi_records'));
  assert.equal(graph.byId.yingtuitive.city,'London');
  assert.ok(data.nodes.every(n=>M.located(graph.byId[n.id])));
  const wav=graph.network('FOG Japan-5');
  assert.ok(wav.nodeIds.has('FOG Japan-6')&&wav.nodeIds.has('FOG Japan-7'));
  assert.equal(graph.byId['FOG Japan-7'].city,'Paris');
  assert.equal(graph.byId.yingtuitive.geography_research.declared_bases.length,2);
});


test('Korea tracklist and cross-label releases stay distinct',()=>{
  const has=(artist,label)=>graph.edges.some(e=>e.source===artist&&e.target===label&&e.kind==='released_on');
  for(const n of data.nodes.filter(n=>n.appearances.includes('2375330147'))){
    assert.ok(has(n.id,'oslated'),n.name);
  }
  assert.ok(has('FOG Korea-2','oslated'));
  assert.match(graph.edges.find(e=>e.source==='FOG Korea-2'&&e.target==='oslated').evidence,/HNL027.*OSL008/);
  assert.ok(has('FOG Korea-4','oslated'));
  assert.match(graph.edges.find(e=>e.source==='FOG Korea-4'&&e.target==='oslated').evidence,/HNC003.*OSC010/);
  for(const n of data.nodes.filter(n=>n.appearances.includes('2374091774'))){
    assert.ok(graph.episodeIds(graph.byId[n.id]).includes('FOG_KOR'),n.name);
  }
  assert.ok(has('solarythm','melifera'));
  assert.ok(has('dagger','st'));
  assert.deepEqual(graph.episodeIds(graph.byId.solarythm),['FOG_KOR']);
  assert.deepEqual(graph.episodeIds(graph.byId.dagger),['FOG_KOR']);
});


test('FOG in Bologna connects every node without inventing tracklist appearances',()=>{
  const hub=graph.byId.FOG_BOLOGNA;
  assert.equal(hub.city,'Bologna');
  assert.equal(hub.country,'Italy');
  const network=graph.network(hub.id);
  assert.equal(network.edgeIds.size,graph.all.length-1);
  assert.equal(network.nodeIds.size,graph.all.length);
  for(const n of graph.all){
    assert.ok(graph.network(n.id).nodeIds.has(hub.id),n.id);
    assert.ok(M.located(n),n.id);
  }
  assert.deepEqual(graph.episodeIds(hub),[]);
  assert.deepEqual(graph.recordingIds(hub),[]);
});


test('France episode reveals its cross-label network without expanding the entire hub',()=>{
  const net=graph.network('FOG_FRA');
  for(const id of ['melifera','vallee','FOG France-1','st','oslated','solarythm','FOG_KOR','FOG_BOLOGNA'])assert.ok(net.nodeIds.has(id),id);
  for(const [source,target] of [['FOG France-1','st'],['FOG France-1','oslated'],['solarythm','melifera'],['FOG France-5','oslated']]){
    const edge=graph.edges.find(e=>e.source===source&&e.target===target&&e.kind==='released_on');
    assert.ok(net.edgeIds.has(edge.id),source+' -> '+target);
  }
  assert.ok(!net.nodeIds.has('dagger'));
  assert.ok(!net.nodeIds.has('yingtuitive'));
  assert.ok(!graph.network('solarythm').nodeIds.has('FOG France-1'));
  assert.deepEqual(graph.episodeIds(graph.byId.solarythm),['FOG_KOR']);
});


test('country and focus share one selection and country-origin routes',()=>{
  for(const [country,focus] of [['FOG_FRA','melifera'],['FOG_MEX','st'],['FOG_KOR','oslated']]){
    assert.equal(graph.selectionId(focus),country);
    const a=graph.visualNetwork(country),b=graph.visualNetwork(focus);
    assert.deepEqual(a,b);
    assert.ok(a.nodeIds.has(focus));
    for(const e of graph.visualEdges.filter(e=>a.edgeIds.has(e.id)))assert.ok(e.source===country||e.target===country);
  }
  const france=graph.visualNetwork('FOG_FRA');
  assert.ok(france.nodeIds.has('solarythm'));
  const biocym=graph.visualNetwork('FOG France-1');
  for(const id of ['FOG_FRA','FOG_KOR','FOG_MEX'])assert.ok(biocym.nodeIds.has(id));
  assert.equal(graph.visualNetwork('FOG_BOLOGNA').edgeIds.size,graph.all.length-1);
  assert.equal(new Set(graph.visualEdges.map(e=>[e.source,e.target].sort().join(':'))).size,graph.visualEdges.length);
  assert.ok(!graph.visualEdges.some(e=>e.source==='FOG France-1'&&e.target==='melifera'));
});
