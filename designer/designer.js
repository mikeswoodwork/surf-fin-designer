import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
const $=id=>document.getElementById(id);
const presets={center:{height:120,base:110,tip:42,sweep:30,thickness:8,foilPos:38,cant:6,concavity:0},side:{height:125,base:112,tip:48,sweep:34,thickness:9,foilPos:40,cant:6,concavity:0}};
let importedOutline=null,importedAspect=1;
const params=new URLSearchParams(location.search);const initialFin=params.get("fin")==="side"?"side":"center";const initialSetup=params.get("setup")||"thruster";const initialBox=params.get("system")==="us-box"?"usbox":"futures";
let state={finType:initialFin,template:"upright",foilType:initialFin==="center"?"symmetric":"flat",setup:initialSetup,box:initialBox,...presets[initialFin]};
const definitions=[["height","Height",60,220,1],["base","Root chord",55,180,1],["tip","Tip chord",8,110,1],["sweep","Sweep / Rake",0,100,1],["thickness","Max. thickness",3,18,.5],["foilPos","Max. thickness position",20,80,1],["cant","Cant angle",-5,15,.5]];
const foilDefs=[["concavity","Innenkonkavität",0,3,.1]];
function buildControls(){ $("shape-controls").innerHTML=definitions.slice(0,4).map(field).join("");$("foil-controls").innerHTML=definitions.slice(4).map(field).join("")+foilDefs.map(field).join("");bindRanges(); }
function field([id,label,min,max,step]){return `<div class="range-field"><div><label for="${id}">${label}</label><output id="${id}-out"></output></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${state[id]??0}"></div>`;}
function bindRanges(){[...definitions,...foilDefs].forEach(([id])=>{const e=$(id);if(!e)return;e.addEventListener("input",()=>{state[id]=Number(e.value);update();});});}
function templateValues(){if(state.template==="upright"){state.sweep=22;state.tip=42;}if(state.template==="raked"){state.sweep=43;state.tip=36;}if(state.template==="keel"){state.height=90;state.base=155;state.tip=70;state.sweep=62;}syncInputs();}
function syncInputs(){[...definitions,...foilDefs].forEach(([id])=>{if($(id))$(id).value=state[id]??0;});}
$("finType").addEventListener("change",e=>{state.finType=e.target.value;Object.assign(state,presets[state.finType]);$("foilType").value=state.finType==="center"?"symmetric":"flat";state.foilType=$("foilType").value;state.template="upright";$("template").value="upright";syncInputs();update();});
$("template").addEventListener("change",e=>{state.template=e.target.value;if(state.template!=="custom"){importedOutline=null;importedAspect=1;$("outline-status").textContent="Standard-Outline aktiv";}templateValues();update();});
$("foilType").addEventListener("change",e=>{state.foilType=e.target.value;update();});
$("setup").addEventListener("change",e=>{state.setup=e.target.value;$("model-label").textContent=e.target.selectedOptions[0].text+" · "+(state.finType==="center"?"Centerfin":"Sidefin");update();});
$("box").addEventListener("change",e=>{state.box=e.target.value;});
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab,.tab-panel").forEach(n=>n.classList.remove("active"));b.classList.add("active");$("panel-"+b.dataset.tab).classList.add("active");}));
let scene,camera,renderer,controls,finMesh,grid,viewMode="3d";
function init3d(){const host=$("viewport");try{scene=new THREE.Scene();scene.background=new THREE.Color("#14232c");camera=new THREE.PerspectiveCamera(35,1,.1,3000);camera.position.set(220,170,260);renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.innerHTML="";host.appendChild(renderer.domElement);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;scene.add(new THREE.HemisphereLight(0xffffff,0x53616a,2));const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(120,180,150);scene.add(key);const fill=new THREE.DirectionalLight(0x8fb6c4,1.1);fill.position.set(-150,30,-100);scene.add(fill);grid=new THREE.GridHelper(260,26,0x52636a,0x30434c);grid.rotation.x=Math.PI/2;grid.position.y=-1;scene.add(grid);resize();if(window.ResizeObserver)new ResizeObserver(resize).observe(host);else window.addEventListener("resize",resize);animate();}catch(err){host.innerHTML='<div class="preview-error"><strong>3D-Vorschau konnte nicht gestartet werden.</strong><span>'+String(err.message||err)+'</span><small>Bitte Safari neu laden oder WebGL in den Geräteeinstellungen prüfen.</small></div>';console.error("FINLAB 3D init:",err);}}
function resize(){if(!renderer)return;const w=$("viewport").clientWidth,h=$("viewport").clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function animate(){requestAnimationFrame(animate);controls?.update();renderer?.render(scene,camera);}
function profile(x,totalThickness){const u=Math.max(0,Math.min(1,x));const peak=Math.max(.2,Math.min(.8,(state.foilPos||38)/100));let shape;shape=Math.pow(Math.max(0,u/peak),.5)*Math.pow(Math.max(0,(1-u)/(1-peak)),.7);const half=totalThickness*.5*shape;if(state.foilType==="symmetric")return {top:half,bottom:-half};if(state.foilType==="flat")return {top:totalThickness*shape,bottom:0};const conc=(state.concavity||0)*Math.sin(Math.PI*u);return {top:totalThickness*.9*shape,bottom:-conc};}
function makeFin(){if(finMesh){scene.remove(finMesh);finMesh.geometry.dispose();finMesh.material.dispose();}
 const H=state.height,B=state.base,T=state.tip,S=state.sweep,th=state.thickness,segments=48,chordSteps=36,verts=[],indices=[];
 // Two foil surfaces; z is span, x is chord, y is thickness.
 for(let side=0;side<2;side++){for(let i=0;i<=segments;i++){const v=i/segments,z=H*v,edges=outlineAt(v),leading=edges[0],chord=edges[1]-edges[0];for(let j=0;j<=chordSteps;j++){const u=j/chordSteps,x=leading+u*chord;const taper=Math.max(.08,1-.78*Math.pow(v,.9));const maxT=th*taper;const f=profile(u,maxT);const foilY=(side===0?f.top:f.bottom);const cantShift=state.finType==="side"?z*Math.tan((state.cant||0)*Math.PI/180):0;const y=foilY+cantShift;verts.push(x,y,z);}}}
 const row=chordSteps+1,layer=(segments+1)*row;
 for(let side=0;side<2;side++){const offset=side*layer;for(let i=0;i<segments;i++)for(let j=0;j<chordSteps;j++){const a=offset+i*row+j,b=a+row,c=b+1,d=a+1;if(side===0)indices.push(a,b,d,b,c,d);else indices.push(a,d,b,b,d,c);}}
 // close leading/trailing edges and root/tip perimeter
 for(let i=0;i<segments;i++)for(const j of [0,chordSteps]){const a=i*row+j,b=a+row,c=layer+a,d=layer+b;indices.push(a,c,b,b,c,d);}
 for(let j=0;j<chordSteps;j++){const a=j,b=j+1,c=layer+a,d=layer+b;indices.push(a,b,c,b,d,c);const e=segments*row+j,f=e+1,g=layer+e,h=layer+f;indices.push(e,g,f,f,g,h);}
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();const mat=new THREE.MeshStandardMaterial({color:0xc58d5b,roughness:.38,metalness:.08,side:THREE.DoubleSide});finMesh=new THREE.Mesh(geo,mat);finMesh.rotation.x=-Math.PI/2;geo.computeBoundingBox();const bounds=geo.boundingBox;finMesh.position.set(-(bounds.min.x+bounds.max.x)/2,0,-(bounds.min.z+bounds.max.z)/2);scene.add(finMesh);controls.target.set(0,0,0); }
function outline(){
 if(importedOutline)return importedOutline.map(([x,y])=>[x*state.height*importedAspect,y*state.height]);
 const pts=[];for(let i=0;i<=40;i++){let v=i/40;pts.push([state.sweep*Math.pow(v,1.12),state.height*v]);}for(let i=40;i>=0;i--){let v=i/40;pts.push([state.sweep*Math.pow(v,1.12)+state.base+(state.tip-state.base)*Math.pow(v,.82),state.height*v]);}return pts;
}
function outlineAt(v){
 if(!importedOutline){const lead=state.sweep*Math.pow(v,1.12),chord=state.base+(state.tip-state.base)*Math.pow(v,.82);return [lead,lead+chord];}
 const poly=outline(), y=(v>=1?state.height-1e-6:v*state.height), hits=[];
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y)){const t=(y-a[1])/(b[1]-a[1]);hits.push(a[0]+t*(b[0]-a[0]));}}
 hits.sort((a,b)=>a-b);return hits.length>=2?[hits[0],hits[hits.length-1]]:[0,state.base];
}
async function importOutline(file){
 const source=await file.text(),doc=new DOMParser().parseFromString(source,"image/svg+xml");
 if(doc.querySelector("parsererror"))throw new Error("Die SVG-Datei ist fehlerhaft.");
 const nodes=[...doc.querySelectorAll("path,polygon,polyline")];if(!nodes.length)throw new Error("Keine SVG-Kontur gefunden (path, polygon oder polyline).");
 let pts=[];
 for(const node of nodes){
  if(node.tagName.toLowerCase()==="path"){
   const len=node.getTotalLength(),n=Math.max(100,Math.min(600,Math.ceil(len/2)));
   for(let i=0;i<n;i++){const p=node.getPointAtLength(len*i/n);pts.push([p.x,p.y]);}
  }else{
   const raw=node.getAttribute("points")||"";pts.push(...raw.trim().split(/[\s,]+/).reduce((a,v,i,arr)=>{if(i%2===0&&arr[i+1]!==undefined)a.push([Number(v),Number(arr[i+1])]);return a;},[]));
  }
 }
 pts=pts.filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
 if(pts.length<12)throw new Error("Die Kontur enthält zu wenige Punkte.");
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 if(maxX-minX<1e-6||maxY-minY<1e-6)throw new Error("Die Kontur hat keine brauchbare Fläche.");
 let normalized=pts.map(([x,y])=>[(x-minX)/(maxX-minX),1-(y-minY)/(maxY-minY)]);
 const area=normalized.reduce((a,p,i)=>{const q=normalized[(i+1)%normalized.length];return a+p[0]*q[1]-q[0]*p[1];},0);
 if(Math.abs(area)<.01)throw new Error("Die importierte Kontur ist nicht geschlossen oder hat keine Fläche.");
 importedOutline=normalized;importedAspect=(maxX-minX)/(maxY-minY);state.template="custom";$("template").value="custom";update();
 $("outline-status").textContent=file.name+" · "+pts.length+" Stützpunkte · importiert";
}
function metrics(){const p=outline();let area=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];area+=a[0]*b[1]-b[0]*a[1];}area=Math.abs(area/2);$("read-area").textContent=Math.round(area)+" mm²";$("read-volume").textContent=Math.round(area*state.thickness*.52)+" mm³";}
function pathFor(points,width,height,pad=12){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),sx=(width-2*pad)/Math.max(1,maxX-minX),sy=(height-2*pad)/Math.max(1,maxY-minY),scale=Math.min(sx,sy),ox=(width-(maxX-minX)*scale)/2,oy=(height-(maxY-minY)*scale)/2;return points.map((p,i)=>(i?"L":"M")+(ox+(p[0]-minX)*scale).toFixed(2)+","+(height-oy-(p[1]-minY)*scale).toFixed(2)).join(" ")+" Z";}
function updateTechnicalViews(){const p=outline();$("side-view-path").setAttribute("d",pathFor(p,320,360,15));const top=[];for(let i=0;i<=60;i++){const u=i/60,f=profile(u,state.thickness);top.push([u*100,f.top]);}for(let i=60;i>=0;i--){const u=i/60,f=profile(u,state.thickness);top.push([u*100,f.bottom]);}$("top-view-path").setAttribute("d",pathFor(top,320,170,14));const front=[];for(let i=0;i<=48;i++){const v=i/48,z=state.height*v,t=state.thickness*Math.max(.08,1-.78*Math.pow(v,.9)),f=profile(.38,t);front.push([z,f.top]);}for(let i=48;i>=0;i--){const v=i/48,z=state.height*v,t=state.thickness*Math.max(.08,1-.78*Math.pow(v,.9)),f=profile(.38,t);front.push([z,f.bottom]);}$("front-view-path").setAttribute("d",pathFor(front,320,170,14));}
function updateFoil(){const pts=[];for(let i=0;i<=80;i++){let x=i/80,p=profile(x,state.thickness);pts.push([15+x*290,55-p.top*5]);}for(let i=80;i>=0;i--){let x=i/80,p=profile(x,state.thickness);pts.push([15+x*290,55-p.bottom*5]);} $("foil-path").setAttribute("d",pts.map((p,i)=>(i?"L":"M")+p[0]+","+p[1]).join(" ")+"Z");}
function update(){[...definitions,...foilDefs].forEach(([id,label])=>{if($(id+"-out"))$(id+"-out").textContent=(state[id]??0)+(id==="cant"?"°":id==="foilPos"?" %":id==="concavity"?" mm":" mm");});$("read-height").textContent=state.height+" mm";$("read-base").textContent=state.base+" mm";$("read-tip").textContent=state.tip+" mm";$("read-thick").textContent=state.thickness+" mm";$("model-label").textContent=$("setup").selectedOptions[0].text+" · "+(state.finType==="center"?"Centerfin":"Sidefin");makeFin();metrics();updateFoil();updateTechnicalViews();}
function setView(mode){viewMode=mode;document.querySelectorAll(".view-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===mode));if(mode==="3d"){camera.position.set(220,170,260);controls.enableRotate=true;}else if(mode==="side"){camera.position.set(0,0,420);controls.enableRotate=false;}else{camera.position.set(420,0,0);controls.enableRotate=false;}controls.target.set(0,0,0);controls.update();}
document.querySelectorAll(".view-btn").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
function download(name,blob){const a=document.createElement("a"),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportSTL(){finMesh.updateMatrixWorld(true);const g=finMesh.geometry;const pos=g.attributes.position,idx=g.index.array;let out="solid FINLAB\n";for(let i=0;i<idx.length;i+=3){const a=new THREE.Vector3().fromBufferAttribute(pos,idx[i]).applyMatrix4(finMesh.matrixWorld),b=new THREE.Vector3().fromBufferAttribute(pos,idx[i+1]).applyMatrix4(finMesh.matrixWorld),c=new THREE.Vector3().fromBufferAttribute(pos,idx[i+2]).applyMatrix4(finMesh.matrixWorld);const n=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).normalize();out+=`facet normal ${n.x} ${n.y} ${n.z}\nouter loop\nvertex ${a.x} ${a.y} ${a.z}\nvertex ${b.x} ${b.y} ${b.z}\nvertex ${c.x} ${c.y} ${c.z}\nendloop\nendfacet\n`;}out+="endsolid FINLAB";download("finlab-fin.stl",new Blob([out],{type:"model/stl"}));}
function exportSVG(){const p=outline(),xs=p.map(q=>q[0]),ys=p.map(q=>q[1]),minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX,h=Math.max(...ys)-minY;const d=p.map((q,i)=>(i?"L":"M")+(q[0]-minX).toFixed(3)+","+(h-(q[1]-minY)).toFixed(3)).join(" ")+" Z";const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(2)}mm" height="${h.toFixed(2)}mm" viewBox="0 0 ${w.toFixed(3)} ${h.toFixed(3)}"><path d="${d}" fill="none" stroke="black" stroke-width="0.5"/></svg>`;download("finlab-outline.svg",new Blob([svg],{type:"image/svg+xml"}));}
function exportDXF(){const p=outline();const rows=["0","SECTION","2","ENTITIES","0","LWPOLYLINE","8","FIN_OUTLINE","90",String(p.length),"70","1"];p.forEach(([x,y])=>rows.push("10",x.toFixed(3),"20",y.toFixed(3)));rows.push("0","ENDSEC","0","EOF");download("finlab-outline.dxf",new Blob([rows.join("\n")],{type:"application/dxf"}));}
$("outline-file").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{await importOutline(file);}catch(err){$("outline-status").textContent="Import fehlgeschlagen: "+err.message;}});
$("clear-outline").addEventListener("click",()=>{importedOutline=null;importedAspect=1;$("outline-file").value="";$("outline-status").textContent="Standard-Outline aktiv";update();});
$("export-stl").addEventListener("click",exportSTL);$("export-svg").addEventListener("click",exportSVG);$("export-dxf").addEventListener("click",exportDXF);$("export-json").addEventListener("click",()=>download("finlab-project.json",new Blob([JSON.stringify(state,null,2)],{type:"application/json"})));
$("reset").addEventListener("click",()=>{importedOutline=null;importedAspect=1;$("outline-file").value="";$("outline-status").textContent="Standard-Outline aktiv";Object.assign(state,{...presets[state.finType],template:"upright",foilType:state.finType==="center"?"symmetric":"flat"});$("template").value="upright";$("foilType").value=state.foilType;syncInputs();update();});
$("finType").value=state.finType;$("setup").value=state.setup;$("box").value=state.box;$("foilType").value=state.foilType;buildControls();init3d();update();
