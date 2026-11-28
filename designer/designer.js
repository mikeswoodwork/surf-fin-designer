import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const launchParams=new URLSearchParams(location.search);if(launchParams.get("entry")!=="1"){location.replace("../");}else{launchParams.delete("entry");history.replaceState(null,"",location.pathname+(launchParams.toString()?"?"+launchParams.toString():""));}
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
const $=id=>document.getElementById(id);
const presets={center:{height:120,base:110,tip:42,sweep:30,thickness:8,foilPos:38,cant:6,concavity:0},side:{height:125,base:112,tip:48,sweep:34,thickness:9,foilPos:40,cant:6,concavity:0}};
let importedOutline=null,importedAspect=1,outlinePoints=null,selectedPoint=null,dragPoint=null,sourceTipWidth=0;
const params=new URLSearchParams(location.search);const initialFin=params.get("fin")==="center"?"center":"side";const allowedSetups=["thruster","single","twin","quad"];const initialSetup=allowedSetups.includes(params.get("setup"))?params.get("setup"):"thruster";const systemParam=params.get("system");const initialBox=systemParam==="us-box"||systemParam==="usbox"?"usbox":systemParam==="fcs1"?"fcs1":"futures";const templateAliases={keel:"fin25",hpsb:"fin37",upright:"fin37"};const requestedTemplate=params.get("template");const initialTemplate=templateAliases[requestedTemplate]||(["fin37","fin25","fin7","fin15","custom"].includes(requestedTemplate)?requestedTemplate:(initialSetup==="single"?"fin7":initialSetup==="twin"?"fin25":"fin37"));
let state={finType:initialFin,template:initialTemplate,foilType:initialFin==="center"?"symmetric":"flat",setup:initialSetup,box:initialBox,...presets[initialFin]};
const DESIGN_STORAGE_KEY="finlab-design-v2";
function cloneData(value){return value==null?value:JSON.parse(JSON.stringify(value));}
function designKey(setup=state.setup,finType=state.finType){return setup==="thruster"?"thruster:shared":setup+":"+finType;}
function saveDesign(){try{const all=JSON.parse(localStorage.getItem(DESIGN_STORAGE_KEY)||"{}");all[designKey()]={state:cloneData(state),outlinePoints:cloneData(outlinePoints),foilSpline:cloneData(foilSpline),frontSpline:cloneData(frontSpline),importedOutline:cloneData(importedOutline),importedAspect};all._activeSetup=state.setup;localStorage.setItem(DESIGN_STORAGE_KEY,JSON.stringify(all));}catch(err){console.warn("FINLAB: automatische Speicherung nicht möglich",err);}}
function restoreDesign(setup,finType){try{const all=JSON.parse(localStorage.getItem(DESIGN_STORAGE_KEY)||"{}"),saved=all[designKey(setup,finType)];if(!saved)return false;state={...state,...saved.state,setup,finType};outlinePoints=cloneData(saved.outlinePoints)||null;foilSpline=cloneData(saved.foilSpline)||foilSpline;frontSpline=cloneData(saved.frontSpline)??null;importedOutline=cloneData(saved.importedOutline)||null;importedAspect=Number(saved.importedAspect)||1;return true;}catch(err){console.warn("FINLAB: gespeicherter Entwurf konnte nicht geladen werden",err);return false;}}
function prepareSetupEntry(setup){try{const all=JSON.parse(localStorage.getItem(DESIGN_STORAGE_KEY)||"{}");if(all._activeSetup&&all._activeSetup!==setup)localStorage.removeItem(DESIGN_STORAGE_KEY);}catch(err){console.warn("FINLAB: Setup-Speicher konnte nicht geprüft werden",err);}}
function setFinTypeVisibility(){
 const finWrap=$("fin-type-field"),templateSelect=$("template"),templateFixed=$("template-fixed");
 const isSingle=state.setup==="single";
 if(finWrap)finWrap.hidden=state.setup!=="thruster";
 if(templateSelect)templateSelect.hidden=!isSingle;
 if(templateFixed){
  templateFixed.hidden=isSingle;
  templateFixed.textContent=state.setup==="thruster"?"Fin 37 · Thruster":state.setup==="quad"?"Fin 37 · Quad":"Fin 25 · Keel";
 }
}
function enforceSetupRules(){
 if(state.setup==="thruster"){if(!["side","center"].includes(state.finType))state.finType="side";state.template="fin37";state.foilType=state.finType==="center"?"symmetric":"flat";}
 else if(state.setup==="quad"){state.finType="side";state.template="fin37";state.foilType="flat";}
 else if(state.setup==="twin"){state.finType="side";state.template="fin25";state.foilType="flat";}
 else {state.finType="center";if(!["fin7","fin15"].includes(state.template))state.template="fin7";state.foilType="symmetric";}
 setFinTypeVisibility();
}
function startFreshSetup(setup){state.setup=setup;state.finType=setup==="thruster"||setup==="single"?"center":"side";state.template=setup==="single"?"fin7":setup==="twin"?"fin25":"fin37";state.foilType=state.setup==="single"||state.finType==="center"?"symmetric":"flat";Object.assign(state,presets[state.finType]);outlinePoints=null;frontSpline=null;importedOutline=null;importedAspect=1;selectedPoint=null;dragPoint=null;frontSelection=null;frontDrag=null;foilSelection=null;foilDrag=null;state.basePosition=50;state.baseLateral=0;setFinTypeVisibility();$("finType").value=state.finType;$("foilType").value=state.foilType;$("template").value=state.template;$("base-position").value=50;$("base-position-value").value=50;$("base-lateral").value=0;$("base-lateral-value").value=0;$("base-position-out").textContent="50%";$("base-lateral-out").textContent="0.0 mm";$("base-position-controls").hidden=true;$("base-position-toggle").textContent="Position anpassen";$("outline-file").value="";$("outline-status").textContent="Standard-Outline aktiv";templateValues();try{localStorage.removeItem(DESIGN_STORAGE_KEY);}catch(err){console.warn("FINLAB: Setup-Entwurf konnte nicht zurückgesetzt werden",err);}saveDesign();}
function restoreControlsFromState(){$("finType").value=state.finType;$("setup").value=state.setup;$("box").value=state.box;$("foilType").value=state.foilType;$("template").value=state.template;$("base-position").value=state.basePosition??50;if($("base-position-value"))$("base-position-value").value=state.basePosition??50;$("base-lateral").value=state.baseLateral??0;if($("base-lateral-value"))$("base-lateral-value").value=state.baseLateral??0;$("base-position-out").textContent=(state.basePosition??50)+"%";$("base-lateral-out").textContent=(state.baseLateral??0).toFixed(1)+" mm";setFinTypeVisibility();syncInputs();}
const definitions=[["height","Height",60,300,1],["base","Root chord",55,240,1],["tip","Tip chord",0,110,1],["sweep","Sweep / Rake",0,100,1],["thickness","Max. thickness",3,18,.5],["cant","Cant angle",-5,15,.5]];
const foilDefs=[["concavity","Innenkonkavität",0,3,.1]];
function buildControls(){ $("shape-controls").innerHTML=definitions.slice(0,4).map(field).join("");$("foil-controls").innerHTML=definitions.slice(4).map(field).join("")+foilDefs.map(field).join("");bindRanges(); }
function field([id,label,min,max,step]){return `<div class="range-field"><div><label for="${id}">${label}</label><output id="${id}-out"></output></div><div class="range-input-row"><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${state[id]??0}"><input class="value-input" type="number" id="${id}-value" min="${min}" max="${max}" step="${step}" value="${state[id]??0}" aria-label="${label} als Zahlenwert"></div></div>`;}
let controlFrame=0;
function applyControlValue(id,value){
 const def=[...definitions,...foilDefs].find(d=>d[0]===id);if(!def)return;
 const [,label,min,max]=def;let next=Number(value);if(!Number.isFinite(next))return;next=Math.max(min,Math.min(max,next));
 const old=Number(state[id]??0);if(next===old)return;
 if(id==="height"){const scale=next/old;if(outlinePoints){if(outlinePoints.segments)outlinePoints.segments.forEach(seg=>seg.forEach(p=>p[1]*=scale));for(const edge of ["lead","trail"])outlinePoints[edge]?.forEach(p=>{p[1]*=scale;if(Number.isFinite(p.m))p.m/=scale;});outlinePoints.height=next;}if(frontSpline)frontSpline.forEach(seg=>seg.forEach(p=>p[1]*=scale));}
 if(id==="thickness"&&frontSpline){const scale=next/old;frontSpline.forEach(seg=>seg.forEach(p=>p[0]*=scale));}
 state[id]=next;if($(id))$(id).value=String(next);if($(id+"-value")&&document.activeElement!==$(id+"-value"))$(id+"-value").value=String(next);
 if($(id+"-out"))$(id+"-out").textContent=next+(id==="cant"?"°":" mm");
 if(!controlFrame)controlFrame=requestAnimationFrame(()=>{controlFrame=0;update({interactive:true});});
}
function bindRanges(){[...definitions,...foilDefs].forEach(([id])=>{const range=$(id),number=$(id+"-value");if(!range)return;range.addEventListener("input",()=>applyControlValue(id,range.value));range.addEventListener("change",()=>update());if(number){number.addEventListener("input",()=>{if(number.value!=="")applyControlValue(id,number.value);});number.addEventListener("change",()=>{const v=Number(number.value);if(Number.isFinite(v))applyControlValue(id,v);number.value=String(state[id]);update();});}});}
function templateValues(){frontSpline=null;const values={fin37:{height:114.3,base:110.8251,tip:0,sweep:0},fin25:{height:126.9996,base:191.9363,tip:0,sweep:0},fin7:{height:254,base:183.8071,tip:0,sweep:0},fin15:{height:254,base:180.8438,tip:0,sweep:0}};const v=values[state.template];if(v)Object.assign(state,v);syncInputs();}
function syncInputs(){[...definitions,...foilDefs].forEach(([id])=>{if($(id))$(id).value=state[id]??0;if($(id+"-value"))$(id+"-value").value=state[id]??0;});}
$("finType").addEventListener("change",e=>{
 if(state.setup!=="thruster")return;
 const next=e.target.value;if(next===state.finType)return;
 saveDesign();
 const restored=restoreDesign(state.setup,next);
 state.finType=next;state.foilType=next==="center"?"symmetric":"flat";
 if(!restored)state.template="fin37";
 restoreControlsFromState();enforceSetupRules();update();
});
$("template").addEventListener("change",e=>{if(state.setup!=="single"||!["fin7","fin15"].includes(e.target.value)){enforceSetupRules();restoreControlsFromState();return;}state.template=e.target.value;importedOutline=null;importedAspect=1;outlinePoints=null;$("outline-status").textContent="Blending-Curves-inspirierte Startkontur";templateValues();update();});
$("foilType").addEventListener("change",e=>{state.foilType=e.target.value;update();});
$("setup").addEventListener("change",e=>{if(e.target.value===state.setup)return;saveDesign();startFreshSetup(e.target.value);enforceSetupRules();restoreControlsFromState();$("model-label").textContent=e.target.selectedOptions[0].text+" · "+(state.finType==="center"?"Centerfin":"Sidefin");update();});
$("box").addEventListener("change",e=>{state.box=e.target.value;updateFinBase();saveDesign();});
function applyBasePosition(v){state.basePosition=Math.max(0,Math.min(100,Number(v)));$("base-position").value=state.basePosition;$("base-position-value").value=state.basePosition;$("base-position-out").textContent=state.basePosition+"%";updateFinBase();}
$("base-position").addEventListener("input",e=>applyBasePosition(e.target.value));$("base-position").addEventListener("change",()=>update());$("base-position-value").addEventListener("input",e=>{if(e.target.value!=="")applyBasePosition(e.target.value);});$("base-position-value").addEventListener("change",()=>update());
function applyBaseLateral(v){state.baseLateral=Math.max(-5,Math.min(5,Number(v)));$("base-lateral").value=state.baseLateral;$("base-lateral-value").value=state.baseLateral;$("base-lateral-out").textContent=(state.baseLateral>0?"+":"")+state.baseLateral.toFixed(1)+" mm";updateFinBase();}
$("base-lateral").addEventListener("input",e=>applyBaseLateral(e.target.value));$("base-lateral").addEventListener("change",()=>update());$("base-lateral-value").addEventListener("input",e=>{if(e.target.value!=="")applyBaseLateral(e.target.value);});$("base-lateral-value").addEventListener("change",()=>update());
$("base-position-toggle").addEventListener("click",()=>{$("base-position-controls").hidden=!$("base-position-controls").hidden;$("base-position-toggle").textContent=$("base-position-controls").hidden?"Position anpassen":"Position schließen";});
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab,.tab-panel").forEach(n=>n.classList.remove("active"));b.classList.add("active");$("panel-"+b.dataset.tab).classList.add("active");}));
let scene,camera,renderer,controls,finMesh,finBaseGroup,grid,viewMode="3d";
state.basePosition=50;
state.baseLateral=0;
function init3d(){const host=$("viewport");try{scene=new THREE.Scene();scene.background=new THREE.Color("#14232c");camera=new THREE.PerspectiveCamera(35,1,.1,3000);camera.position.set(220,170,260);renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.innerHTML="";host.appendChild(renderer.domElement);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;scene.add(new THREE.HemisphereLight(0xffffff,0x53616a,2));const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(120,180,150);scene.add(key);const fill=new THREE.DirectionalLight(0x8fb6c4,1.1);fill.position.set(-150,30,-100);scene.add(fill);grid=new THREE.GridHelper(260,26,0x52636a,0x30434c);grid.rotation.x=Math.PI/2;grid.position.y=-1;scene.add(grid);resize();if(window.ResizeObserver)new ResizeObserver(resize).observe(host);else window.addEventListener("resize",resize);animate();}catch(err){host.innerHTML='<div class="preview-error"><strong>3D-Vorschau konnte nicht gestartet werden.</strong><span>'+String(err.message||err)+'</span><small>Bitte Safari neu laden oder WebGL in den Geräteeinstellungen prüfen.</small></div>';console.error("FINLAB 3D init:",err);}}
function resize(){if(!renderer)return;const w=$("viewport").clientWidth,h=$("viewport").clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function animate(){requestAnimationFrame(animate);controls?.update();renderer?.render(scene,camera);}
// Editable normalized foil: chordwise x=0..1, normalized half-thickness y=0..1.
let foilSpline=[
 [[0,0],[.10,.34],[.22,.86],[.38,1]],
 [[.38,1],[.58,1],[.84,.28],[1,0]]
];
// Editable front-view thickness envelope. x is half-thickness in mm, y is span in mm.
let frontSpline=null,frontSelection=null,frontDrag=null,foilSelection=null,foilDrag=null;
function defaultFrontSpline(){const h=state.height,t=state.thickness;return [[[t,0],[t*.98,h*.28],[t*.72,h*.78],[0,h]]];}
function getFrontSpline(){if(!frontSpline)frontSpline=defaultFrontSpline();return frontSpline;}
function splineExtent(segs,axis){
 let min=Infinity,max=-Infinity;
 for(const seg of segs)for(let i=0;i<=80;i++){const v=bezierValue(seg,i/80)[axis];min=Math.min(min,v);max=Math.max(max,v);}
 return {min,max,span:max-min};
}
function enforceFoilMonotonicity(){
 for(let i=0;i<foilSpline.length;i++){
  const seg=foilSpline[i],start=i===0?0:foilSpline[i-1][3][0],end=i===foilSpline.length-1?1:Math.max(start+.01,seg[3][0]);
  seg[0][0]=start;seg[3][0]=end;
  seg[1][0]=Math.max(start,Math.min(end,seg[1][0]));
  seg[2][0]=Math.max(seg[1][0],Math.min(end,seg[2][0]));
  if(i<foilSpline.length-1)foilSpline[i+1][0][0]=end;
 }
}
function syncProfileParameters(kind){
 const foilMax=Math.max(.001,splineExtent(foilSpline,1).max);
 if(kind==="front"){
  const front=getFrontSpline(),ex=splineExtent(front,0),ey=splineExtent(front,1);
  state.height=Math.max(1,ey.max);
  state.thickness=Math.max(.1,ex.max*foilMax);
 }else{
  const front=getFrontSpline(),ex=splineExtent(front,0);
  state.thickness=Math.max(.1,ex.max*foilMax);
 }
 syncInputs();
 [...definitions,...foilDefs].forEach(([id])=>{if($(id+"-out"))$(id+"-out").textContent=Number(state[id]??0)+(id==="cant"?"°":" mm");});
}
function bezierValue(seg,t){const u=1-t;return [u*u*u*seg[0][0]+3*u*u*t*seg[1][0]+3*u*t*t*seg[2][0]+t*t*t*seg[3][0],u*u*u*seg[0][1]+3*u*u*t*seg[1][1]+3*u*t*t*seg[2][1]+t*t*t*seg[3][1]];}
function splineValue(segs,t,axis=0,extent=1){const target=Math.max(0,Math.min(extent,t*extent));let i=segs.findIndex(seg=>target>=Math.min(seg[0][axis],seg[3][axis])-1e-7&&target<=Math.max(seg[0][axis],seg[3][axis])+1e-7);if(i<0)i=target<segs[0][0][axis]?0:segs.length-1;const seg=segs[i],ascending=seg[3][axis]>=seg[0][axis];let lo=0,hi=1;for(let k=0;k<42;k++){const mid=(lo+hi)/2,value=bezierValue(seg,mid)[axis];if((value<target)===ascending)lo=mid;else hi=mid;}return bezierValue(seg,(lo+hi)/2);}
function profile(x,totalThickness){const u=Math.max(0,Math.min(1,x)),q=splineValue(foilSpline,u,0,1),half=totalThickness*.5*q[1];if(state.foilType==="symmetric")return {top:half,bottom:-half};if(state.foilType==="flat")return {top:totalThickness*q[1],bottom:0};return {top:totalThickness*.9*q[1],bottom:-(state.concavity||0)*Math.sin(Math.PI*u)};}
function frontThicknessAt(v){const p=splineValue(getFrontSpline(),v,1,state.height);return Math.max(0,p[0]);}

function disposeMeshTree(root){root.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());else obj.material.dispose();}});}
function makeFin(interactive=false){if(finMesh){scene.remove(finMesh);disposeMeshTree(finMesh);}
 const H=state.height,B=state.base,T=state.tip,S=state.sweep,th=state.thickness,segments=interactive?80:1000,chordSteps=interactive?10:36,verts=[],indices=[];
 // Two foil surfaces; z is span, x is chord, y is thickness.
 for(let side=0;side<2;side++){for(let i=0;i<=segments;i++){const v=i/segments,z=H*v,edges=outlineAt(v),leading=edges[0],chord=edges[1]-edges[0];for(let j=0;j<=chordSteps;j++){const u=j/chordSteps,x=leading+u*chord;const taper=Math.pow(Math.max(0,1-v),.85);const maxT=frontThicknessAt(v);const f=profile(u,maxT);const foilY=(side===0?f.top:f.bottom);const cantShift=state.finType==="side"?z*Math.tan((state.cant||0)*Math.PI/180):0;const y=foilY+cantShift;verts.push(x,y,z);}}}
 const row=chordSteps+1,layer=(segments+1)*row;
 for(let side=0;side<2;side++){const offset=side*layer;for(let i=0;i<segments;i++)for(let j=0;j<chordSteps;j++){const a=offset+i*row+j,b=a+row,c=b+1,d=a+1;if(side===0)indices.push(a,b,d,b,c,d);else indices.push(a,d,b,b,d,c);}}
 // close leading/trailing edges and root/tip perimeter
 for(let i=0;i<segments;i++)for(const j of [0,chordSteps]){const a=i*row+j,b=a+row,c=layer+a,d=layer+b;indices.push(a,c,b,b,c,d);}
 for(let j=0;j<chordSteps;j++){const a=j,b=j+1,c=layer+a,d=layer+b;indices.push(a,b,c,b,d,c);const e=segments*row+j,f=e+1,g=layer+e,h=layer+f;indices.push(e,g,f,f,g,h);}
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();const mat=new THREE.MeshStandardMaterial({color:0xc58d5b,roughness:.38,metalness:.08,side:THREE.DoubleSide});finMesh=new THREE.Mesh(geo,mat);finMesh.rotation.x=-Math.PI/2;geo.computeBoundingBox();const bounds=geo.boundingBox;// Local z is the fin span; after rotation it becomes world y.
 finMesh.position.set(-(bounds.min.x+bounds.max.x)/2,-(bounds.min.z+bounds.max.z)/2,0);scene.add(finMesh);updateFinBase();controls.target.set(0,0,0); }

// Fin-base construction profiles. All dimensions are mm and remain independent
// from the fin outline. Reference dimensions are taken only from the supplied drawings.
function roundedRectShape(length,width,radius){
 const s=new THREE.Shape(),r=Math.max(.2,Math.min(radius,length/2,width/2));
 s.moveTo(r,0);s.lineTo(length-r,0);s.quadraticCurveTo(length,0,length,r);
 s.lineTo(length,width-r);s.quadraticCurveTo(length,width,length-r,width);
 s.lineTo(r,width);s.quadraticCurveTo(0,width,0,width-r);
 s.lineTo(0,r);s.quadraticCurveTo(0,0,r,0);return s;
}
function makeFootprintMesh(shape,thickness,xOffset,depthOffset=0,zOffset=0,bevel=.15){
 // x = chord, y = insertion depth, extrusion z = foil thickness.
 // Map to fin-local coordinates (x, thickness, span): (x,y,z)->(x,z,-y).
 const g=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:bevel>0,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:Math.min(.15,bevel),curveSegments:20});
 g.rotateX(-Math.PI/2);g.translate(0,-thickness/2,1.2);
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x9cabb0,roughness:.3,metalness:.1}));
 m.position.set(xOffset,0,zOffset);return m;
}
function makeFuturesFootprint(){
 // Generic full-length single Futures-style tongue. The envelope is a working
 // model, not a manufacturer tolerance drawing or a verified locking profile.
 const L=113.5,D=17.7,r=2.2,s=new THREE.Shape();
 s.moveTo(r,0);s.lineTo(L-5,0);s.quadraticCurveTo(L,0,L,D/2);
 s.quadraticCurveTo(L,D,L-5,D);s.lineTo(r,D);
 s.quadraticCurveTo(0,D,r,D-r);s.lineTo(r,r);
 s.quadraticCurveTo(0,0,r,0);s.closePath();
 return s;
}
function makeFuturesBase(xOffset){
 // One full-length single tab; the rear relief is part of the same solid.
 return makeFootprintMesh(makeFuturesFootprint(),7.7,xOffset,0,0,.12);
}
function makeFcsTab(xOffset,depthCenter){
 const L=19,D=10.8,s=roundedRectShape(L,D,1.8);
 return makeFootprintMesh(s,7.7,xOffset,depthCenter-D/2,0,.12);
}
function makeUsBoxBase(xOffset){
 // Bahne US surf box: dimensions transcribed from the user's 1:1 drawing.
 // 175 mm is the complete box length, not the removable fin tongue.
 // Section A-A defines 96.5 mm engagement span, 16.4 mm section depth,
 // 60 degree lead-in ramp and a 35 mm rear end zone. Top view gives 9.2 mm
 // width; the 9 mm dimension is the front end land. 24 mm is the complete
 // box envelope height. Screw and retaining pin are intentionally omitted.
 const L=96.5,W=9.2,D=16.4,lead=9.0,rear=35.0;
 const s=new THREE.Shape(),rampRun=D/Math.tan(Math.PI/3),rearStart=L-rear;
 // Male insert profile derived as the complementary engagement tongue.
 // Keep the 60° entry ramp and 35 mm terminal seating section distinct.
 s.moveTo(0,0);
 s.lineTo(lead,0);
 s.lineTo(lead+rampRun,D);
 s.lineTo(rearStart,D);
 s.lineTo(rearStart,D-2.4);
 s.lineTo(L-5,D-2.4);
 s.lineTo(L,D-5.0);
 s.lineTo(L,0);
 s.closePath();
 return makeFootprintMesh(s,W,xOffset,0,0,0);
}
function updateFinBase(){
 if(!scene||!finMesh)return;
 if(finBaseGroup){
  finMesh.remove(finBaseGroup);
  finBaseGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
 }
 // Critical: bases are children of the fin mesh. They inherit its exact
 // transform instead of reconstructing a parallel transform independently.
 finBaseGroup=new THREE.Group();
 const position=Math.max(0,Math.min(100,state.basePosition??50))/100;
 const root=outlineAt(0),rootStart=Math.min(...root),rootEnd=Math.max(...root);
 // finBaseGroup is a child of finMesh: coordinates are already in the
 // fin mesh local frame. Do not subtract the swept mesh bounding-box centre.
 const rootLength=rootEnd-rootStart;
 const rp=profile(.5,frontThicknessAt(0));
 // The fin surfaces are defined in the fin-local +Y direction.
 // The base is centred on the local foil mid-plane (not mirrored below it).
 finBaseGroup.position.set(0,(rp.top+rp.bottom)/2+Number(state.baseLateral||0),0);
 if(state.box==="futures"){
  const L=113.5,center=rootStart+rootLength*position;
  finBaseGroup.add(makeFuturesBase(center-L/2));
 }else if(state.box==="fcs1"){
  const tabL=19,spacing=34,center=rootStart+rootLength*position;
  finBaseGroup.add(makeFcsTab(center-spacing/2-tabL/2,0));
  finBaseGroup.add(makeFcsTab(center+spacing/2-tabL/2,0));
 }else if(state.box==="usbox"){
  const L=96.5;
  const center=rootStart+rootLength*position;
  finBaseGroup.add(makeUsBoxBase(center-L/2));
 }else{finMesh.add(finBaseGroup);return;}
 const datum=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.2,12),new THREE.MeshBasicMaterial({color:0xffa45b}));
 datum.position.set((rootStart+rootEnd)/2,1.5,0);datum.userData.referenceOnly=true;finBaseGroup.add(datum);
 finMesh.add(finBaseGroup);
}
// Exact cubic Bezier segments extracted from the supplied Blending Curves PDFs.
// Coordinates are millimetres in a local frame: root chord on y=0, span on +y.
const sourceSplines={
 fin37:{height:114.3,base:110.8251,segments:[
 [[110.8251,0],[110.8251,0],[104.5019,16.063],[104.5019,35.2421]],
 [[104.5019,35.2421],[104.5019,68.6343],[132.8363,88.8802],[143.8321,96.6442]],
 [[143.8321,96.6442],[145.7526,98.1124],[148.632,100.0125],[147.3846,103.7579]],
 [[147.3846,103.7579],[145.524,108.5455],[139.7522,114.3],[125.7,114.3]],
 [[125.7,114.3],[104.9757,114.3],[51.8146,98.9062],[0,0]]
 ]},
 fin25:{height:126.9996,base:191.9363,segments:[
 [[191.9363,0],[191.9363,0],[85.1036,126.9996],[-25.6148,126.9996]],
 [[-25.6148,126.9996],[-55.0001,126.9997],[-70.0745,115.7858],[-70.0747,109.8425]],
 [[-70.0747,109.8425],[-70.0746,95.6299],[-5.2327,81.2764],[0,0]]
 ]},
 fin15:{height:254,base:180.8438,segments:[
 [[180.8438,0],[147.3031,58.7026],[65.9698,254],[-38.5918,254]],
 [[-38.5918,254],[-58.4913,254],[-88.1094,246.0459],[-88.1094,228.7651]],
 [[-88.1094,228.7651],[-88.1094,219.2556],[0.6784,147.773],[11.1799,76.5161]],
 [[11.1799,76.5161],[17.7938,31.6445],[0,0],[0,0]]
 ]},
 fin7:{height:254,base:183.8071,segments:[
 [[183.8071,0],[79.8315,229.713],[-35.3473,254],[-73.0197,254]],
 [[-73.0197,254],[-86.8909,254],[-99.2815,251.4081],[-99.2815,239.0645]],
 [[-99.2815,239.0645],[-99.2815,237.7405],[-98.9213,236.3978],[-98.1653,235.5173]],
 [[-98.1653,235.5173],[-85.3225,220.4639],[32.9068,172.6868],[0,0]]
 ]}
};
function defaultOutline(){
 const s=sourceSplines[state.template]||sourceSplines.fin37;
 const tipHits=bezierHitsAt(s.segments,s.height-1e-5),tip=tipHits.length>1?tipHits[tipHits.length-1]-tipHits[0]:0;return {segments:s.segments.map(seg=>seg.map(p=>[...p])),height:s.height,base:s.base,tip,sweep:0,lead:[],trail:[]};
}
function bezierPoint(seg,t){
 const u=1-t,a=seg[0],b=seg[1],c=seg[2],d=seg[3];
 return [u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],
         u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]];
}
function bezierHitsAt(segs,y){
 const hits=[];for(const seg of segs){let t0=0,p0=bezierPoint(seg,0);for(let k=1;k<=240;k++){const t1=k/240,p1=bezierPoint(seg,t1),d0=p0[1]-y,d1=p1[1]-y;if(Math.abs(d0)<1e-9)hits.push(p0[0]);if(d0*d1<0){let lo=t0,hi=t1,sign=d0<0;for(let j=0;j<42;j++){const mid=(lo+hi)/2,ym=bezierPoint(seg,mid)[1];if((ym<y)===sign)lo=mid;else hi=mid;}hits.push(bezierPoint(seg,(lo+hi)/2)[0]);}p0=p1;t0=t1;}if(Math.abs(p0[1]-y)<1e-9)hits.push(p0[0]);}
 return hits.sort((a,b)=>a-b).filter((v,i,arr)=>i===0||Math.abs(v-arr[i-1])>1e-5);
}
function rawSplineIntersections(y){return bezierHitsAt(getOutlinePoints().segments||[],y);}
function splineIntersections(y){const shape=getOutlinePoints();return bezierHitsAt(shape.segments||[],y*shape.height/state.height);}
function getOutlinePoints(){if(!outlinePoints)outlinePoints=defaultOutline();return outlinePoints;}
function outlineAt(v){
 const p=getOutlinePoints(),t=Math.max(0,Math.min(1,v)),y=t*state.height;
 if(p.lead?.length&&p.trail?.length){
  const sample=edge=>{const target=y;let i=edge.findIndex(q=>q[1]>=target);if(i===0)return edge[0][0];if(i<0)return edge[edge.length-1][0];const a=edge[i-1],b=edge[i],d=b[1]-a[1];return d?a[0]+(b[0]-a[0])*(target-a[1])/d:a[0];};
  const rootWidth=Math.max(1e-6,p.base||(p.trail[0][0]-p.lead[0][0])),scale=state.base/rootWidth,offset=state.sweep*t,rootX=p.lead[0][0];return [(sample(p.lead)-rootX)*scale+rootX+offset,(sample(p.trail)-rootX)*scale+rootX+offset];
 }
 const hits=splineIntersections(y);if(hits.length===0)return [0,0];
 const s=sourceSplines[state.template]||sourceSplines.fin37,scale=state.base/(p.base||s.base);
 if(hits.length===1){const x=hits[0]*scale+(state.sweep-(p.sweep||0)*scale)*t;return [x,x];}
 const left=hits[0]*scale,right=hits[hits.length-1]*scale;
 const tipCorrection=(state.tip-sourceTipWidth)*t*.5,shift=(state.sweep-(p.sweep||0)*scale)*t;
 return [left+shift-tipCorrection,right+shift+tipCorrection];
}
function sweepOffset(y,s){return state.sweep*(y/s.height);}
function pointSlope(points,k){return 0;}
function edgeX(points,y){return 0;}
function outline(){const p=[],n=2500;for(let i=0;i<=n;i++){const v=i/n;p.push([outlineAt(v)[0],state.height*v]);}for(let i=n;i>=0;i--){const v=i/n;p.push([outlineAt(v)[1],state.height*v]);}return p;}
function outlineSideSign(p){const hits=rawSplineIntersections(p[1]);if(hits.length<2)return p[0]>=0?1:-1;return p[0]>=(hits[0]+hits[hits.length-1])/2?1:-1;}
function outlineDisplayPoint(p,sign=outlineSideSign(p)){const shape=getOutlinePoints(),src=sourceSplines[state.template]||sourceSplines.fin37,sc=state.base/(shape.base||src.base),ys=state.height/(shape.height||src.height),t=p[1]/(shape.height||src.height),tip=(state.tip-sourceTipWidth)*t*.5,shift=(state.sweep-(shape.sweep||0)*sc)*t;return [p[0]*sc+shift+sign*tip,p[1]*ys];}
function outlineViewMap(){
 const segs=getOutlinePoints().segments,pts=[];segs.forEach(seg=>{for(let i=0;i<=80;i++){const p=bezierPoint(seg,i/80);pts.push(outlineDisplayPoint(p));}});
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(0,...ys),maxY=Math.max(state.height,...ys);
 const scale=Math.min(290/Math.max(1,maxX-minX),330/Math.max(1,maxY-minY)),ox=(320-(maxX-minX)*scale)/2,oy=(360-(maxY-minY)*scale)/2;
 const toScreen=([x,y])=>[ox+(x-minX)*scale,360-oy-(y-minY)*scale];
 return {scale,minX,minY,ox,oy,toSvg:(p,si,cp)=>toScreen(outlineDisplayPoint(p)),toModel:([x,y],si,cp)=>{const shown=[(x-ox)/scale+minX,(360-y-oy)/scale+minY],shape=getOutlinePoints(),src=sourceSplines[state.template]||sourceSplines.fin37,raw=shape.segments[si][cp],sign=outlineSideSign(raw),sc=state.base/(shape.base||src.base),t=shown[1]/state.height,tip=(state.tip-sourceTipWidth)*t*.5,shift=(state.sweep-(shape.sweep||0)*sc)*t;return [(shown[0]-shift-sign*tip)/sc,shown[1]*(shape.height||src.height)/state.height];}};
}
function bezierOutlinePath(map){
 const segs=getOutlinePoints().segments;if(!segs?.length)return "";
 const fmt=p=>p[0].toFixed(2)+","+p[1].toFixed(2),first=map.toSvg(segs[0][0],0,0);let d="M"+fmt(first);
 for(let si=0;si<segs.length;si++){const seg=segs[si],q=seg.slice(1).map((p,i)=>map.toSvg(p,si,i+1));d+=" C"+q.map(fmt).join(" ");}
 return d+" Z";
}
function bezierAnchor(segIndex,cpIndex){
 const seg=getOutlinePoints().segments[segIndex];
 return cpIndex===1?seg[0]:seg[3];
}
function syncBezierJoin(segIndex,cpIndex,point){
 const segs=getOutlinePoints().segments,seg=segs[segIndex],old=seg[cpIndex],dx=point[0]-old[0],dy=point[1]-old[1];
 seg[cpIndex]=point;
 if(cpIndex===0){
  seg[1]=[seg[1][0]+dx,seg[1][1]+dy];
  if(segIndex>0){segs[segIndex-1][3]=point;segs[segIndex-1][2]=[segs[segIndex-1][2][0]+dx,segs[segIndex-1][2][1]+dy];}
 }
 if(cpIndex===3){
  seg[2]=[seg[2][0]+dx,seg[2][1]+dy];
  if(segIndex<segs.length-1){segs[segIndex+1][0]=point;segs[segIndex+1][1]=[segs[segIndex+1][1][0]+dx,segs[segIndex+1][1][1]+dy];}
 }
}
function drawOutlineHandles(refreshFields=true){
 const group=$("outline-handles"),tg=$("tangent-handles");if(!group||!tg)return;
 const segs=getOutlinePoints().segments,map=outlineViewMap(),els=[],lines=[],anchorHits=[],tangentHits=[];
 if(!Array.isArray(segs)){group.replaceChildren();tg.replaceChildren();selectedPoint=null;updateTangentFields();return;}
 segs.forEach((seg,si)=>{
  [[0,1],[3,2]].forEach(([anchorIndex,handleIndex])=>{
   const a=map.toSvg(seg[anchorIndex],si,anchorIndex),h=map.toSvg(seg[handleIndex],si,handleIndex);
   lines.push('<line class="tangent-line" x1="'+a[0]+'" y1="'+a[1]+'" x2="'+h[0]+'" y2="'+h[1]+'"/>');
  });
  seg.forEach((p,pi)=>{
   // A shared join is drawn once, using the preceding segment's end.
   if(pi===0&&si>0)return;
   const [x,y]=map.toSvg(p,si,pi),active=selectedPoint?.seg===si&&selectedPoint?.cp===pi;
   const anchor=pi===0||pi===3;
   const hit='<circle class="handle-hit" data-seg="'+si+'" data-cp="'+pi+'" cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="14" tabindex="0" role="button" aria-label="'+(anchor?"Ankerpunkt":"Tangentenpunkt")+(si+1)+'"/>';(anchor?anchorHits:tangentHits).push(hit);
   els.push('<circle class="'+(anchor?'outline-handle':'tangent-handle')+(active?' selected':'')+'" data-seg="'+si+'" data-cp="'+pi+'" cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="'+(anchor?(active?7:5):(active?6:4))+'" tabindex="0" role="button" aria-label="'+(anchor?"Ankerpunkt":"Tangentenpunkt")+' '+(si+1)+'"/>');
  });
 });
 group.innerHTML=anchorHits.join("")+els.filter(s=>s.includes('outline-handle')).join("");
 tg.innerHTML=lines.join("")+tangentHits.join("")+els.filter(s=>s.includes('tangent-handle')).join("");
 if(refreshFields)updateTangentFields();
}
function updateTangentFields(){
 const segs=getOutlinePoints().segments,sel=selectedPoint,wrap=$("tangent-controls");
 if(!wrap)return;
 if(!sel||sel.cp===0||sel.cp===3){wrap.innerHTML='<small>Wähle einen Bézier-Griffpunkt (kleiner Kreis), um seine Tangentenlänge und seinen Winkel numerisch einzustellen.</small>';return;}
 const seg=segs[sel.seg],anchor=bezierAnchor(sel.seg,sel.cp),p=seg[sel.cp],dx=p[0]-anchor[0],dy=p[1]-anchor[1];
 const len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
 wrap.innerHTML='<div class="tangent-fields"><label>Länge <input id="tangent-length" type="number" min="0" step="0.1" value="'+len.toFixed(2)+'"> mm</label><label>Winkel <input id="tangent-angle" type="number" step="0.1" value="'+angle.toFixed(1)+'"> °</label></div>';
 $("tangent-length").addEventListener("input",()=>applyTangentFields(true));
 $("tangent-angle").addEventListener("input",()=>applyTangentFields(true));
 $("tangent-length").addEventListener("change",applyTangentFields);
 $("tangent-angle").addEventListener("change",applyTangentFields);
}
function applyTangentFields(interactive=false){
 if(!selectedPoint||selectedPoint.cp===0||selectedPoint.cp===3)return;
 const seg=getOutlinePoints().segments[selectedPoint.seg],anchor=bezierAnchor(selectedPoint.seg,selectedPoint.cp);
 const length=Math.max(0,Number($("tangent-length").value)||0),angle=(Number($("tangent-angle").value)||0)*Math.PI/180;
 seg[selectedPoint.cp]=[anchor[0]+length*Math.cos(angle),anchor[1]+length*Math.sin(angle)];
 if(interactive)update({interactive:true});else update();
}
let activeEditorPoint=null;
function selectEditorPoint(kind,seg,cp,svgId=null){
 const point={seg:Number(seg),cp:Number(cp)};
 activeEditorPoint={kind,seg:point.seg,cp:point.cp,svgId};
 selectedPoint=kind==="outline"?point:null;
 frontSelection=kind==="front"?point:null;
 foilSelection=kind==="foil"?point:null;
 syncEditorSelection();
 updateTangentFields();
}
function syncEditorSelection(){
 document.querySelectorAll("#outline-handles .outline-handle,#tangent-handles .tangent-handle,#front-handles .outline-handle,#front-tangents .tangent-handle,#foil-handles .outline-handle,#foil-tangents .tangent-handle,#top-foil-handles .outline-handle,#top-foil-tangents .tangent-handle").forEach(el=>{
  const kind=el.dataset.kind||"outline",selection=kind==="outline"?selectedPoint:kind==="front"?frontSelection:foilSelection;
  el.classList.toggle("selected",!!selection&&Number(el.dataset.seg)===selection.seg&&Number(el.dataset.cp)===selection.cp);
 });
}
let profileFrame=0,profilePending=null;
function focusProfileHandle(kind,seg,cp,svgId){requestAnimationFrame(()=>{const group=svgId==="top-view"?"top-foil-handles":kind==="front"?"front-handles":"foil-handles",handle=document.querySelector("#"+group+' .handle-hit[data-seg="'+seg+'"][data-cp="'+cp+'"]');if(handle){try{handle.focus({preventScroll:true});}catch(_){handle.focus();}}if(document.activeElement!==handle){const svg=$(svgId);if(svg){if(!svg.hasAttribute("tabindex"))svg.setAttribute("tabindex","0");try{svg.focus({preventScroll:true});}catch(_){svg.focus();}}}});}
function bindProfileEditors(){
 document.querySelectorAll("#front-view,#foil-svg,#top-view").forEach(svg=>{
  svg.addEventListener("pointerdown",e=>{const h=e.target.closest(".handle-hit[data-kind]");if(!h)return;e.preventDefault();const kind=h.dataset.kind,selection={seg:Number(h.dataset.seg),cp:Number(h.dataset.cp)};selectEditorPoint(kind,selection.seg,selection.cp,svg.id);const drag={...selection,pointerId:e.pointerId,moved:false};if(kind==="front"){frontDrag=drag;}else{foilDrag=drag;}svg.setPointerCapture(e.pointerId);focusProfileHandle(kind,selection.seg,selection.cp,svg.id);});
  svg.addEventListener("pointermove",e=>{const kind=svg.id==="front-view"?"front":"foil",drag=kind==="front"?frontDrag:foilDrag;if(!drag||drag.pointerId!==e.pointerId)return;profilePending={svg,kind,pointerId:e.pointerId,x:e.clientX,y:e.clientY};if(profileFrame)return;profileFrame=requestAnimationFrame(()=>{profileFrame=0;const job=profilePending;if(!job)return;const {svg,kind,pointerId,x,y}=job,drag=kind==="front"?frontDrag:foilDrag;if(!drag||drag.pointerId!==pointerId)return;const pt=svg.createSVGPoint();pt.x=x;pt.y=y;const local=pt.matrixTransform(svg.getScreenCTM().inverse()),map=kind==="front"?frontMap():(svg.id==="top-view"?topFoilMap():foilMap()),p=map.toModel([local.x,local.y]),segs=kind==="front"?getFrontSpline():foilSpline,seg=segs[drag.seg],cp=drag.cp;drag.moved=true;if(kind==="front"){p[0]=Math.max(0,Math.min(state.thickness*1.5,p[0]));p[1]=Math.max(0,Math.min(state.height*1.2,p[1]));}else{p[0]=Math.max(0,Math.min(1,p[0]));p[1]=Math.max(0,Math.min(1.25,p[1]));}const dx=p[0]-seg[cp][0],dy=p[1]-seg[cp][1];seg[cp]=p;if(cp===0){seg[1]=[seg[1][0]+dx,seg[1][1]+dy];if(drag.seg>0){segs[drag.seg-1][3]=p;segs[drag.seg-1][2]=[segs[drag.seg-1][2][0]+dx,segs[drag.seg-1][2][1]+dy];}}if(cp===3){seg[2]=[seg[2][0]+dx,seg[2][1]+dy];if(drag.seg<segs.length-1){segs[drag.seg+1][0]=p;segs[drag.seg+1][1]=[segs[drag.seg+1][1][0]+dx,segs[drag.seg+1][1][1]+dy];}}if(kind==="front")syncProfileParameters("front");else{enforceFoilMonotonicity();syncProfileParameters("foil");}updateTechnicalViews(true);updateFoil();});});
  const choose=e=>{const h=e.target.closest?.(".handle-hit[data-kind][data-seg][data-cp]");if(!h)return;const kind=h.dataset.kind,seg=Number(h.dataset.seg),cp=Number(h.dataset.cp);selectEditorPoint(kind,seg,cp,svg.id);focusProfileHandle(kind,seg,cp,svg.id);};
  svg.addEventListener("click",choose);
  const end=e=>{if(frontDrag?.pointerId===e.pointerId){const moved=frontDrag.moved;frontDrag=null;if(moved)update();}if(foilDrag?.pointerId===e.pointerId){const moved=foilDrag.moved;foilDrag=null;if(moved)update();}};svg.addEventListener("pointerup",end);svg.addEventListener("pointercancel",end);
 });
}

function syncOutlineParametersAfterEdit(){
 const shape=getOutlinePoints(),segs=shape.segments;if(!segs?.length)return;const src=sourceSplines[state.template]||sourceSplines.fin37,oldScale=state.base/(shape.base||src.base),oldHeightScale=state.height/(shape.height||src.height),rawBase=Math.max(.1,Math.abs(segs[0][0][0]-segs[segs.length-1][3][0])),rawHeight=Math.max(1,splineExtent(segs,1).max),tipHits=bezierHitsAt(segs,rawHeight-1e-5),rawTip=tipHits.length>1?tipHits[tipHits.length-1]-tipHits[0]:0,midHits=bezierHitsAt(segs,rawHeight*.5),srcMid=bezierHitsAt(src.segments,src.height*.5),rawSweep=midHits.length>1&&srcMid.length>1?(midHits[0]+midHits[midHits.length-1])/2-(srcMid[0]+srcMid[srcMid.length-1])/2*(shape.base||src.base)/src.base:(shape.sweep||0);
 const sweepDelta=rawSweep-(shape.sweep||0),tipDelta=rawTip-(shape.tip??rawTip),oldStateHeight=state.height;shape.base=rawBase;state.base=rawBase*oldScale;shape.height=rawHeight;state.height=rawHeight*oldHeightScale;if(frontSpline){const hScale=state.height/oldStateHeight;frontSpline.forEach(seg=>seg.forEach(p=>p[1]*=hScale));}shape.sweep=rawSweep;state.sweep+=sweepDelta*oldScale;shape.tip=rawTip;state.tip+=tipDelta*oldScale;sourceTipWidth=rawTip*oldScale;syncInputs();[...definitions,...foilDefs].forEach(([id])=>{if($(id+"-out"))$(id+"-out").textContent=Number(state[id]??0)+(id==="cant"?"°":" mm");});
}
function nudgeOutlinePoint(segIndex,cp,dx,dy){
 const segs=getOutlinePoints().segments,seg=segs[segIndex];if(!seg)return;
 const p=[seg[cp][0]+dx,seg[cp][1]+dy];
 if(cp===0||cp===3){p[1]=Math.max(0,Math.min(state.height,p[1]));syncBezierJoin(segIndex,cp,p);}else seg[cp]=p;
 selectEditorPoint("outline",segIndex,cp);syncOutlineParametersAfterEdit();update({interactive:true});saveDesign();requestAnimationFrame(()=>{const h=document.querySelector("#outline-handles .handle-hit[data-seg=\""+segIndex+"\" ][data-cp=\""+cp+"\"]");h?.focus({preventScroll:true});});
}
function bindPointKeyboard(){
 const focusRange=e=>{const range=e.target?.closest?.('input[type="range"]');if(range)requestAnimationFrame(()=>range.focus({preventScroll:true}));};
 document.addEventListener("pointerup",focusRange,true);
 document.addEventListener("touchend",focusRange,{capture:true,passive:true});
 document.addEventListener("focusin",e=>{const h=e.target?.closest?.(".handle-hit[data-seg][data-cp]:not([data-kind])");if(h)selectEditorPoint("outline",h.dataset.seg,h.dataset.cp);});
 document.addEventListener("keydown",e=>{
  if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;
  const tag=e.target?.tagName?.toLowerCase();
  if(tag==="input"&&e.target.type==="range"){
   const range=e.target,id=range.id,step=Number(range.step)||1,mult=e.shiftKey?10:e.altKey?.1:1,dir=(e.key==="ArrowRight"||e.key==="ArrowUp")?1:-1;
   if(["height","base","tip","sweep","thickness","cant","concavity"].includes(id)){e.preventDefault();applyControlValue(id,Number(range.value)+dir*step*mult);return;}
   if(id==="base-position"){e.preventDefault();applyBasePosition(Number(range.value)+dir*step*mult);update();return;}
   if(id==="base-lateral"){e.preventDefault();applyBaseLateral(Number(range.value)+dir*step*mult);update();return;}
  }
  if(["input","textarea","select"].includes(tag)||e.target?.isContentEditable)return;
  const focused=e.target?.matches?.(".handle-hit[data-kind][data-seg][data-cp]")?e.target:null;
  const active=focused?{kind:focused.dataset.kind,seg:Number(focused.dataset.seg),cp:Number(focused.dataset.cp),svgId:focused.closest("svg")?.id}:activeEditorPoint;
  if(active&&["front","foil"].includes(active.kind)){
   const isTangent=active.cp===1||active.cp===2,svgId=active.svgId||focused?.closest("svg")?.id,topView=svgId==="top-view",frontView=active.kind==="front",baseStep=topView?(isTangent?5/3:0.25):frontView&&isTangent?5/3:(isTangent?5:0.5),step=e.altKey?baseStep*.2:e.shiftKey?baseStep*4:baseStep,dx=e.key==="ArrowLeft"?-step:e.key==="ArrowRight"?step:0,dy=e.key==="ArrowDown"?-step:e.key==="ArrowUp"?step:0;
   e.preventDefault();e.stopPropagation();
   const kind=active.kind,si=active.seg,cp=active.cp,segs=kind==="front"?getFrontSpline():foilSpline,seg=segs[si];if(!seg)return;
   const scale=kind==="foil"?.1:1,px=dx*scale,py=dy*scale;const p=[seg[cp][0]+px,seg[cp][1]+py];
   if(kind==="front"){p[0]=Math.max(0,Math.min(state.thickness*1.2,p[0]));p[1]=Math.max(0,Math.min(state.height,p[1]));}else{p[0]=Math.max(0,Math.min(1,p[0]));p[1]=Math.max(0,Math.min(1.25,p[1]));}
   const ox=p[0]-seg[cp][0],oy=p[1]-seg[cp][1];seg[cp]=p;
   if(cp===0){seg[1]=[seg[1][0]+ox,seg[1][1]+oy];if(si>0){segs[si-1][3]=p;segs[si-1][2]=[segs[si-1][2][0]+ox,segs[si-1][2][1]+oy];}}
   if(cp===3){seg[2]=[seg[2][0]+ox,seg[2][1]+oy];if(si<segs.length-1){segs[si+1][0]=p;segs[si+1][1]=[segs[si+1][1][0]+ox,segs[si+1][1][1]+oy];}}
   if(kind==="front")syncProfileParameters("front");else{enforceFoilMonotonicity();syncProfileParameters("foil");}selectEditorPoint(kind,si,cp,svgId);update({interactive:true});saveDesign();focusProfileHandle(kind,si,cp,svgId);return;
  }
  if(selectedPoint){e.preventDefault();e.stopPropagation();const step=e.altKey?.5:e.shiftKey?10:2.5,dx=e.key==="ArrowLeft"?-step:e.key==="ArrowRight"?step:0,dy=e.key==="ArrowDown"?-step:e.key==="ArrowUp"?step:0;nudgeOutlinePoint(selectedPoint.seg,selectedPoint.cp,dx,dy);}
 },true);
}
let outlineFrame=0,outlinePending=null;
function bindOutlineEditor(){
 const svg=$("side-view");
 svg.addEventListener("pointerdown",e=>{const handle=e.target.closest("[data-seg][data-cp]");if(!handle)return;e.preventDefault();dragPoint={seg:Number(handle.dataset.seg),cp:Number(handle.dataset.cp),pointerId:e.pointerId};selectEditorPoint("outline",dragPoint.seg,dragPoint.cp);svg.setPointerCapture(e.pointerId);requestAnimationFrame(()=>{const h=document.querySelector("#outline-handles .handle-hit[data-seg='"+selectedPoint.seg+"'][data-cp='"+selectedPoint.cp+"']");h?.focus({preventScroll:true});});});
 svg.addEventListener("pointermove",e=>{if(!dragPoint||dragPoint.pointerId!==e.pointerId)return;outlinePending={x:e.clientX,y:e.clientY,pointerId:e.pointerId};if(outlineFrame)return;outlineFrame=requestAnimationFrame(()=>{outlineFrame=0;const job=outlinePending;if(!job||!dragPoint||dragPoint.pointerId!==job.pointerId)return;const pt=svg.createSVGPoint();pt.x=job.x;pt.y=job.y;const local=pt.matrixTransform(svg.getScreenCTM().inverse()),map=outlineViewMap(),p=map.toModel([local.x,local.y],dragPoint.seg,dragPoint.cp),seg=getOutlinePoints().segments[dragPoint.seg],cp=dragPoint.cp;if(cp===0||cp===3){p[1]=Math.max(0,Math.min(state.height*1.2,p[1]));syncBezierJoin(dragPoint.seg,cp,p);}else seg[cp]=p;syncOutlineParametersAfterEdit();$("side-view-path").setAttribute("d",bezierOutlinePath(map));drawOutlineHandles(false);});});
 const finish=e=>{if(dragPoint&&dragPoint.pointerId===e.pointerId){dragPoint=null;update();}};svg.addEventListener("pointerup",finish);svg.addEventListener("pointercancel",finish);svg.addEventListener("lostpointercapture",()=>{dragPoint=null;});
 svg.addEventListener("click",e=>{const h=e.target.closest("[data-seg][data-cp]");if(!h)return;selectEditorPoint("outline",h.dataset.seg,h.dataset.cp);requestAnimationFrame(()=>{const n=document.querySelector("#outline-handles .handle-hit[data-seg='"+selectedPoint.seg+"'][data-cp='"+selectedPoint.cp+"']");n?.focus({preventScroll:true});});});
}

async function importOutline(file){
 const source=await file.text(),doc=new DOMParser().parseFromString(source,"image/svg+xml");
 if(doc.querySelector("parsererror"))throw new Error("Die SVG-Datei ist fehlerhaft.");
 const nodes=[...doc.querySelectorAll("path,polygon,polyline")];if(!nodes.length)throw new Error("Keine SVG-Kontur gefunden (path, polygon oder polyline).");if(nodes.length>1)throw new Error("Bitte eine einzelne geschlossene Finnenkontur importieren. Hilfs- und Maßlinien vorher aus der SVG entfernen.");
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
 const normalizedOutline=normalized;const aspect=(maxX-minX)/(maxY-minY);const lead=[],trail=[];
 for(let k=0;k<=6;k++){const v=k/6,y=k===0?1e-7:k===6?1-1e-7:v;const hits=[];for(let i=0;i<normalizedOutline.length;i++){const a=normalizedOutline[i],b=normalizedOutline[(i+1)%normalizedOutline.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y)){const t=(y-a[1])/(b[1]-a[1]);hits.push(a[0]+t*(b[0]-a[0]));}}hits.sort((a,b)=>a-b);if(hits.length>=2){lead.push([hits[0]*state.height*aspect,v*state.height]);trail.push([hits[hits.length-1]*state.height*aspect,v*state.height]);}}
 if(lead.length<3)throw new Error("Die SVG-Kontur muss eine geschlossene Finnen-Seitenkontur sein.");
 outlinePoints={lead,trail,base:Math.max(1,trail[0][0]-lead[0][0]),height:state.height};state.base=outlinePoints.base;importedOutline=null;importedAspect=1;state.template="custom";$("template").value="custom";syncInputs();update();
 $("outline-status").textContent=file.name+" · "+pts.length+" Stützpunkte · importiert";
}
function metrics(){const p=outline();let area=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];area+=a[0]*b[1]-b[0]*a[1];}area=Math.abs(area/2);$("read-area").textContent=Math.round(area)+" mm²";$("read-volume").textContent=Math.round(area*state.thickness*.52)+" mm³";}
function pathFor(points,width,height,pad=12){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),sx=(width-2*pad)/Math.max(1,maxX-minX),sy=(height-2*pad)/Math.max(1,maxY-minY),scale=Math.min(sx,sy),ox=(width-(maxX-minX)*scale)/2,oy=(height-(maxY-minY)*scale)/2;return points.map((p,i)=>(i?"L":"M")+(ox+(p[0]-minX)*scale).toFixed(2)+","+(height-oy-(p[1]-minY)*scale).toFixed(2)).join(" ")+" Z";}
function frontMap(){const scaleX=130/Math.max(1,state.thickness*1.2),scaleY=140/state.height,ox=160,baseY=155;return {toSvg:p=>[ox+p[0]*scaleX,baseY-p[1]*scaleY],toModel:p=>[(p[0]-ox)/scaleX,(baseY-p[1])/scaleY]};}
function foilMap(){return {toSvg:p=>[15+p[0]*290,55-p[1]*34],toModel:p=>[(p[0]-15)/290,(55-p[1])/34]};}
function topFoilMap(){return {toSvg:p=>[15+p[0]*290,85-p[1]*34],toModel:p=>[(p[0]-15)/290,(85-p[1])/34]};}
function renderBezierHandles(svgId,groupId,tangentId,segs,map,selection,kind){
 const g=$(groupId),tg=$(tangentId);if(!g||!tg)return;
 const ns="http://www.w3.org/2000/svg",make=(tag,attrs)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));return el;};
 const anchors=[],handles=[],lines=[];
 segs.forEach((seg,si)=>{
  [[0,1],[3,2]].forEach(([ai,hi])=>{const a=map.toSvg(seg[ai]),h=map.toSvg(seg[hi]);lines.push(make("line",{class:"tangent-line",x1:a[0],y1:a[1],x2:h[0],y2:h[1],"pointer-events":"none"}));});
  seg.forEach((p,pi)=>{
   if(pi===0&&si>0)return;
   const q=map.toSvg(p),active=selection?.seg===si&&selection?.cp===pi,anchor=pi===0||pi===3;
   const hit=make("circle",{class:"handle-hit","data-kind":kind,"data-seg":si,"data-cp":pi,cx:q[0],cy:q[1],r:14,fill:"transparent",stroke:"transparent","pointer-events":"all",tabindex:0,role:"button","aria-label":(anchor?"Ankerpunkt":"Tangentenpunkt")+" "+(si+1)});const el=make("circle",{class:(anchor?"outline-handle":"tangent-handle")+(active?" selected":""),"data-kind":kind,"data-seg":si,"data-cp":pi,cx:q[0],cy:q[1],r:anchor?7:6,fill:anchor?"#fff1dc":"#ffad55",stroke:"#172630","stroke-width":2,"vector-effect":"non-scaling-stroke","pointer-events":"none"});
   el.style.cursor="grab";el.style.opacity="1";el.style.visibility="visible";
   (anchor?anchors:handles).push(hit,el);
  });
 });
 g.replaceChildren(...anchors);tg.replaceChildren(...lines,...handles);
}
function updateTechnicalViews(interactive=false){const map=outlineViewMap();$("side-view-path").setAttribute("d",bezierOutlinePath(map));drawOutlineHandles(!interactive);const tm=topFoilMap(),fmt=p=>{const q=tm.toSvg(p);return q[0].toFixed(2)+","+q[1].toFixed(2);};let topPath="M"+fmt(foilSpline[0][0]);for(const seg of foilSpline)topPath+=" C"+fmt(seg[1])+" "+fmt(seg[2])+" "+fmt(seg[3]);for(let si=foilSpline.length-1;si>=0;si--){const seg=foilSpline[si];topPath+=" C"+fmt([seg[2][0],-seg[2][1]])+" "+fmt([seg[1][0],-seg[1][1]])+" "+fmt([seg[0][0],-seg[0][1]]);}topPath+=" Z";$("top-view-path").setAttribute("d",topPath);const front=[];for(let i=0;i<=80;i++){const v=i/80,z=state.height*v,f=profile(.38,frontThicknessAt(v));front.push([f.top,z]);}for(let i=80;i>=0;i--){const v=i/80,z=state.height*v,f=profile(.38,frontThicknessAt(v));front.push([f.bottom,z]);}const fm=frontMap();$("front-view-path").setAttribute("d",front.map((p,i)=>{const q=fm.toSvg(p);return (i?"L":"M")+q[0].toFixed(2)+","+q[1].toFixed(2);}).join(" ")+" Z");renderBezierHandles("front-view","front-handles","front-tangents",getFrontSpline(),frontMap(),frontSelection,"front");renderBezierHandles("foil-svg","foil-handles","foil-tangents",foilSpline,foilMap(),foilSelection,"foil");renderBezierHandles("top-view","top-foil-handles","top-foil-tangents",foilSpline,topFoilMap(),foilSelection,"foil");}
function updateFoil(){const pts=[],half=Math.max(.001,state.thickness*.5);for(let i=0;i<=100;i++){const f=profile(i/100,state.thickness);pts.push([15+i/100*290,55-f.top/half*34]);}for(let i=100;i>=0;i--){const f=profile(i/100,state.thickness);pts.push([15+i/100*290,55-f.bottom/half*34]);}$("foil-path").setAttribute("d",pts.map((p,i)=>(i?"L":"M")+p[0]+","+p[1]).join(" ")+"Z");}
function update(options={}){const interactive=!!options.interactive;syncInputs();if(!outlinePoints?.lead){const tipHits=splineIntersections(state.height-1e-5);sourceTipWidth=tipHits.length>1?(tipHits[tipHits.length-1]-tipHits[0])*(state.base/(getOutlinePoints().base||(sourceSplines[state.template]||sourceSplines.fin37).base)):0;}else sourceTipWidth=0;[...definitions,...foilDefs].forEach(([id,label])=>{if($(id+"-out"))$(id+"-out").textContent=(state[id]??0)+(id==="cant"?"°":id==="concavity"?" mm":" mm");});$("read-height").textContent=state.height+" mm";$("read-base").textContent=state.base+" mm";$("read-tip").textContent=state.tip+" mm";$("read-thick").textContent=state.thickness+" mm";$("base-position").value=state.basePosition??50;if($("base-position-value"))$("base-position-value").value=state.basePosition??50;$("base-position-out").textContent=(state.basePosition??50)+"%";$("base-lateral").value=state.baseLateral??0;if($("base-lateral-value"))$("base-lateral-value").value=state.baseLateral??0;$("base-lateral-out").textContent=(state.baseLateral??0).toFixed(1)+" mm";$("model-label").textContent=$("setup").selectedOptions[0].text+" · "+(state.finType==="center"?"Centerfin":"Sidefin");makeFin(interactive);if(!interactive){metrics();saveDesign();}updateFoil();updateTechnicalViews(interactive);}
function setView(mode){viewMode=mode;document.querySelectorAll(".view-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===mode));if(mode==="3d"){camera.position.set(220,170,260);controls.enableRotate=true;}else if(mode==="side"){camera.position.set(0,0,420);controls.enableRotate=false;}else{camera.position.set(420,0,0);controls.enableRotate=false;}controls.target.set(0,0,0);controls.update();}
document.querySelectorAll(".view-btn").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
function download(name,blob){const a=document.createElement("a"),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportSTL(){
 const meshes=[finMesh],triangles=[];
 meshes.forEach(root=>{
  root.updateMatrixWorld(true);
  root.traverse(obj=>{
   if(!obj.isMesh||obj.userData.referenceOnly||!obj.geometry?.attributes?.position)return;
   const g=obj.geometry,pos=g.attributes.position,idx=g.index;
   const count=idx?idx.count:pos.count;
   for(let i=0;i+2<count;i+=3){
    const ia=idx?idx.getX(i):i,ib=idx?idx.getX(i+1):i+1,ic=idx?idx.getX(i+2):i+2;
    const a=new THREE.Vector3().fromBufferAttribute(pos,ia).applyMatrix4(obj.matrixWorld);
    const b=new THREE.Vector3().fromBufferAttribute(pos,ib).applyMatrix4(obj.matrixWorld);
    const c=new THREE.Vector3().fromBufferAttribute(pos,ic).applyMatrix4(obj.matrixWorld);
    const n=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).normalize();
    triangles.push(`facet normal ${n.x} ${n.y} ${n.z}\nouter loop\nvertex ${a.x} ${a.y} ${a.z}\nvertex ${b.x} ${b.y} ${b.z}\nvertex ${c.x} ${c.y} ${c.z}\nendloop\nendfacet\n`);
   }
  });
 });
 download("finlab-fin-mit-base.stl",new Blob(["solid FINLAB\n",...triangles,"endsolid FINLAB"],{type:"model/stl"}));
}
function exportSVG(){const p=outline(),xs=p.map(q=>q[0]),ys=p.map(q=>q[1]),minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX,h=Math.max(...ys)-minY;const d=p.map((q,i)=>(i?"L":"M")+(q[0]-minX).toFixed(3)+","+(h-(q[1]-minY)).toFixed(3)).join(" ")+" Z";const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(2)}mm" height="${h.toFixed(2)}mm" viewBox="0 0 ${w.toFixed(3)} ${h.toFixed(3)}"><path d="${d}" fill="none" stroke="black" stroke-width="0.5"/></svg>`;download("finlab-outline.svg",new Blob([svg],{type:"image/svg+xml"}));}
function exportDXF(){const p=outline();const rows=["0","SECTION","2","ENTITIES","0","LWPOLYLINE","8","FIN_OUTLINE","90",String(p.length),"70","1"];p.forEach(([x,y])=>rows.push("10",x.toFixed(3),"20",y.toFixed(3)));rows.push("0","ENDSEC","0","EOF");download("finlab-outline.dxf",new Blob([rows.join("\n")],{type:"application/dxf"}));}
async function loadProject(file){
 const data=JSON.parse(await file.text());const saved=data.state||data;
 const allowed={finType:["center","side"],setup:["thruster","single","twin","quad"],box:["futures","fcs1","usbox","none"],template:["fin37","fin25","fin7","fin15","custom"],foilType:["symmetric","flat","concave"]};
 for(const [key,values] of Object.entries(allowed)){if(saved[key]!==undefined){if(!values.includes(saved[key]))throw new Error("Ungültiger Projektwert: "+key);state[key]=saved[key];}}
 for(const [key,,min,max] of definitions.concat(foilDefs)){if(saved[key]!==undefined){const n=Number(saved[key]);if(!Number.isFinite(n))throw new Error("Ungültiger Zahlenwert: "+key);state[key]=Math.max(min,Math.min(max,n));}}
 for(const key of ["basePosition","baseLateral"]){if(saved[key]!==undefined){const n=Number(saved[key]);if(!Number.isFinite(n))throw new Error("Ungültiger Basiswert: "+key);state[key]=key==="basePosition"?Math.max(0,Math.min(100,n)):Math.max(-5,Math.min(5,n));}}
 const validSpline=s=>Array.isArray(s)&&s.length>0&&s.every(seg=>Array.isArray(seg)&&seg.length===4&&seg.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)));
 if(data.outlinePoints){const p=data.outlinePoints;if(p.segments&&validSpline(p.segments))outlinePoints=p;else if(Array.isArray(p.lead)&&Array.isArray(p.trail)&&p.lead.length>=3&&p.lead.length===p.trail.length&&[...p.lead,...p.trail].every(q=>Array.isArray(q)&&q.length===2&&q.every(Number.isFinite)))outlinePoints=p;else throw new Error("Ungültige Outline im Projekt.");}else outlinePoints=null;
 if(data.foilSpline){if(!validSpline(data.foilSpline))throw new Error("Ungültiges Foil-Profil.");foilSpline=data.foilSpline;}
 frontSpline=data.frontSpline===null?null:data.frontSpline? (validSpline(data.frontSpline)?data.frontSpline:(()=>{throw new Error("Ungültiger Dickenverlauf.");})()):null;
 $("finType").value=state.finType;$("setup").value=state.setup;$("box").value=state.box;$("foilType").value=state.foilType;$("template").value=state.template;$("base-position").value=state.basePosition??50;$("base-lateral").value=state.baseLateral??0;
 $("base-position-out").textContent=(state.basePosition??50)+"%";$("base-lateral-out").textContent=(state.baseLateral??0).toFixed(1)+" mm";syncInputs();$("outline-status").textContent="Projekt geladen: "+file.name;update();
}
$("project-file").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{await loadProject(file);}catch(err){$("outline-status").textContent="Projekt konnte nicht geladen werden: "+err.message;}});
$("outline-file").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{await importOutline(file);}catch(err){$("outline-status").textContent="Import fehlgeschlagen: "+err.message;}});
$("clear-outline").addEventListener("click",()=>{importedOutline=null;importedAspect=1;outlinePoints=null;frontSpline=null;$("outline-file").value="";$("outline-status").textContent="Standard-Outline aktiv";update();});
$("export-stl").addEventListener("click",exportSTL);$("export-svg").addEventListener("click",exportSVG);$("export-dxf").addEventListener("click",exportDXF);$("export-json").addEventListener("click",()=>download("finlab-project.json",new Blob([JSON.stringify({format:"FINLAB_PROJECT",version:1,state,outlinePoints,foilSpline,frontSpline},null,2)],{type:"application/json"})));
$("reset").addEventListener("click",()=>{importedOutline=null;importedAspect=1;outlinePoints=null;state.basePosition=50;state.baseLateral=0;$("base-position").value=50;$("base-position-out").textContent="50%";$("base-lateral").value=0;$("base-lateral-out").textContent="0.0 mm";$("base-position-controls").hidden=true;$("base-position-toggle").textContent="Position anpassen";$("outline-file").value="";$("outline-status").textContent="Standard-Outline aktiv";const resetTemplate=state.setup==="single"?(state.template==="fin15"?"fin15":"fin7"):state.setup==="twin"?"fin25":"fin37";Object.assign(state,{...presets[state.finType],template:resetTemplate,foilType:state.setup==="single"||state.finType==="center"?"symmetric":"flat"});frontSpline=null;foilSpline=[[[0,0],[.10,.34],[.22,.86],[.38,1]],[[.38,1],[.58,1],[.84,.28],[1,0]]];frontSelection=null;foilSelection=null;selectedPoint=null;$("template").value=resetTemplate;$("foilType").value=state.foilType;enforceSetupRules();restoreControlsFromState();syncInputs();update();});
bindOutlineEditor();bindProfileEditors();bindPointKeyboard();prepareSetupEntry(initialSetup);restoreDesign(initialSetup,initialSetup==="single"?"center":"side");enforceSetupRules();restoreControlsFromState();if(state.template!=="custom"&&!outlinePoints)templateValues();buildControls();init3d();update();
