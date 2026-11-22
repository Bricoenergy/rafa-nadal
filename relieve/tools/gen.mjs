import fs from 'fs';
import * as topo from 'topojson-client';
import * as d3 from 'd3-geo';
const w = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const all = topo.feature(w, w.objects.countries);
const W=1000,H=820;
const proj = d3.geoConicConformal().parallels([37,43]).rotate([3.5,0]);
const ext = {type:'MultiPoint',coordinates:[[-9.6,35.6],[4.6,35.6],[-9.6,44.1],[4.6,44.1],[-3,44.2],[-3,35.5]]};
proj.fitExtent([[10,10],[W-10,H-10]], ext).clipExtent([[0,0],[W,H]]);
const path = d3.geoPath(proj);
const r = n=>Math.round(n*10)/10;
const simp = s => s.replace(/(\d+\.\d+)/g, m=>String(r(+m)));
const ids = {spain:'724',portugal:'620',france:'250',andorra:'020',morocco:'504',algeria:'012'};
const out = {W,H,land:{}};
for (const [k,id] of Object.entries(ids)) {
  const f = all.features.find(f=>f.id===id);
  if (k==='spain') {
    // split: peninsula+baleares vs canarias
    const polys = f.geometry.coordinates;
    const main = polys.filter(p=>p[0][0][0]>-12);
    const can = polys.filter(p=>p[0][0][0]<=-12);
    out.land.spain = simp(path({type:'MultiPolygon',coordinates:main})||'');
    out.canPolys = can;
  } else out.land[k] = simp(path(f)||'');
}
// canarias inset
const CW=330,CH=150;
const cp = d3.geoMercator().fitExtent([[12,12],[CW-12,CH-12]],{type:'MultiPolygon',coordinates:out.canPolys});
const cpath = d3.geoPath(cp);
out.canarias = {W:CW,H:CH,path:simp(cpath({type:'MultiPolygon',coordinates:out.canPolys}))};
delete out.canPolys;
const P = ([x,y])=>{const p=proj([x,y]);return [r(p[0]),r(p[1])]};
const CP = ([x,y])=>{const p=cp([x,y]);return [r(p[0]),r(p[1])]};
const src = JSON.parse(fs.readFileSync('features.json'));
out.features = src.features.map(f=>({...f, pts: f.pts ? f.pts.map(f.inset?CP:P) : undefined, at: f.at ? (f.inset?CP:P)(f.at) : undefined, lab: f.lab ? (f.inset?CP:P)(f.lab):undefined}));
out.rivers = src.rivers.map(f=>({...f, pts:f.pts.map(P), lab:P(f.lab)}));
out.seas = src.seas.map(s=>({...s, at:P(s.at)}));
fs.writeFileSync('mapdata.json', JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out.land).map(([k,v])=>[k,v.length])), out.canarias.path.length, JSON.stringify(out).length);
