import fs from 'fs';
import * as topo from 'topojson-client';
import * as d3 from 'd3-geo';
import {PNG} from 'pngjs';
import jpeg from 'jpeg-js';
const w = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const all = topo.feature(w, w.objects.countries);
const W=1000,H=820;
const proj = d3.geoConicConformal().parallels([37,43]).rotate([3.5,0]);
proj.fitExtent([[10,10],[W-10,H-10]], {type:'MultiPoint',coordinates:[[-9.6,35.6],[4.6,35.6],[-9.6,44.1],[4.6,44.1],[-3,44.2],[-3,35.5]]});
const spain = all.features.find(f=>f.id==='724');
const can = spain.geometry.coordinates.filter(p=>p[0][0][0]<=-12);
const cp = d3.geoMercator().fitExtent([[12,12],[318,138]],{type:'MultiPolygon',coordinates:can});
fs.mkdirSync('tiles',{recursive:true});
const lon2x=(lon,z)=>(lon+180)/360*2**z;
const lat2y=(lat,z)=>{const r=lat*Math.PI/180;return (1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*2**z};
async function grid(z,lon0,lon1,lat0,lat1){
  const x0=Math.floor(lon2x(lon0,z)),x1=Math.floor(lon2x(lon1,z)),y0=Math.floor(lat2y(lat1,z)),y1=Math.floor(lat2y(lat0,z));
  const tiles={};
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
    const f=`tiles/${z}_${x}_${y}.png`;
    if(!fs.existsSync(f)){ const r=await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`); if(!r.ok) throw new Error(r.status+f); fs.writeFileSync(f,Buffer.from(await r.arrayBuffer())) }
    tiles[x+'_'+y]=PNG.sync.read(fs.readFileSync(f));
  }
  return (lon,lat)=>{ const fx=lon2x(lon,z)*256, fy=lat2y(lat,z)*256;
    const s=(px,py)=>{ const t=tiles[Math.floor(px/256)+'_'+Math.floor(py/256)]; if(!t) return 0; const i=((py%256)*256+(px%256))*4; return t.data[i]*256+t.data[i+1]+t.data[i+2]/256-32768 };
    const ix=Math.floor(fx-.5), iy=Math.floor(fy-.5), ax=fx-.5-ix, ay=fy-.5-iy;
    return s(ix,iy)*(1-ax)*(1-ay)+s(ix+1,iy)*ax*(1-ay)+s(ix,iy+1)*(1-ax)*ay+s(ix+1,iy+1)*ax*ay };
}
// colour ramp (m): soft school-atlas tints
const ramp=[[0,[170,203,142]],[200,[196,216,152]],[400,[232,228,170]],[700,[236,212,150]],[1000,[222,182,122]],[1600,[192,140,92]],[2500,[150,104,78]],[3000,[128,100,92]],[3400,[225,222,220]]];
function col(e){ if(e<=ramp[0][0]) return ramp[0][1]; for(let i=1;i<ramp.length;i++){ if(e<=ramp[i][0]){ const [a,ca]=ramp[i-1],[b,cb]=ramp[i]; const k=(e-a)/(b-a); return ca.map((v,j)=>v+(cb[j]-v)*k) } } return ramp.at(-1)[1] }
function render(sampler, inv, OW, OH, S, mPerUnit, out){
  const w=OW*S,h=OH*S, E=new Float32Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){ const ll=inv([(x+.5)/S,(y+.5)/S]); E[y*w+x]= ll? sampler(ll[0],ll[1]) : 0 }
  const cell=mPerUnit/S, zf=2.2, buf=Buffer.alloc(w*h*4);
  const az=315*Math.PI/180, alt=45*Math.PI/180;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const g=(xx,yy)=>E[Math.min(h-1,Math.max(0,yy))*w+Math.min(w-1,Math.max(0,xx))];
    const dzdx=((g(x+1,y-1)+2*g(x+1,y)+g(x+1,y+1))-(g(x-1,y-1)+2*g(x-1,y)+g(x-1,y+1)))/(8*cell)*zf;
    const dzdy=((g(x-1,y+1)+2*g(x,y+1)+g(x+1,y+1))-(g(x-1,y-1)+2*g(x,y-1)+g(x+1,y-1)))/(8*cell)*zf;
    const slope=Math.atan(Math.hypot(dzdx,dzdy)), aspect=Math.atan2(dzdy,-dzdx);
    let hs=Math.cos(Math.PI/2-alt)*Math.cos(slope)+Math.sin(Math.PI/2-alt)*Math.sin(slope)*Math.cos(az-Math.PI/2-aspect);
    hs=Math.max(0,hs); const shade=0.55+0.6*hs; // ~1 on flat
    const e=Math.max(0,E[y*w+x]); const c=col(e);
    const i=(y*w+x)*4; for(let j=0;j<3;j++) buf[i+j]=Math.max(0,Math.min(255,c[j]*shade)); buf[i+3]=255;
  }
  const jp=jpeg.encode({data:buf,width:w,height:h},78); fs.writeFileSync(out,jp.data);
  return jp.data.length;
}
// metres per map unit (approx): distance of 1 unit around centre
const mpu=(p)=>{ const a=p.invert([500,400]), b=p.invert([501,400]); return d3.geoDistance(a,b)*6371000 };
const sMain=await grid(7,-10,4.6,35.4,44.3);
console.log('main',render(sMain,p=>proj.invert(p),W,H,1.6,mpu(proj),'relief.jpg'));
const sCan=await grid(9,-18.3,-13.3,27.5,29.5);
const cmpu=(()=>{const a=cp.invert([150,75]),b=cp.invert([151,75]);return d3.geoDistance(a,b)*6371000})();
console.log('can',render(sCan,p=>cp.invert(p),330,150,2,cmpu,'relief-can.jpg'));
