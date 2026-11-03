import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js";

const ids=["height","base","rake","tip","thickness"];
const defaults={height:130,base:115,rake:35,tip:55,thickness:10};
const $=id=>document.getElementById(id);
const descriptions={
 keel:"Breite, eher kompakte Fläche mit ausgeprägter Tip-Chord – typisch für eine klassische Keel-Finne.",
 upright:"Aufrechter Shape mit stärker verjüngter Spitze und wenig Sweep. Die Fläche sitzt näher an der Senkrechten.",
 raked:"Deutlich nach hinten gezogene Vorderkante und schlankere Spitze – ein stärker geraketer Umriss.",
 pivot:"Relativ gerade Vorder- und Hinterkante mit moderater Verjüngung – ein eher klassischer Pivot-Umriss."
};

const host=$("three-view");
const scene=new THREE.Scene();scene.background=new THREE.Color("#14232c");
const camera=new THREE.PerspectiveCamera(34,1,0.1,2000);
camera.position.set(175,145,245);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
host.replaceChildren(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.07;controls.target.set(55,65,0);
controls.minDistance=100;controls.maxDistance=650;
scene.add(new THREE.HemisphereLight(0xe8f0f2,0x34414a,2.0));
const keyLight=new THREE.DirectionalLight(0xffe2bd,3.0);keyLight.position.set(-100,180,160);scene.add(keyLight);
const fillLight=new THREE.DirectionalLight(0x9fc4d8,1.4);fillLight.position.set(150,70,-120);scene.add(fillLight);
const grid=new THREE.GridHelper(360,18,0x40535c,0x293c46);grid.position.set(55,-2,0);scene.add(grid);
let finMesh=null;

function getValues(){return Object.fromEntries(ids.map(id=>[id,Number($(id).value)]));}
function stationShape(t,v,type){
 const smooth=t*t*(3-2*t);
 let chord;
 if(type==="keel") chord=v.base+(v.tip-v.base)*Math.pow(t,.72);
 else if(type==="upright") chord=v.base+(v.tip-v.base)*Math.pow(t,1.35);
 else if(type==="raked") chord=v.base+(v.tip-v.base)*Math.pow(t,.9);
 else chord=v.base+(v.tip-v.base)*t;
 const sweepFactor={keel:.62,upright:.42,raked:1.32,pivot:.28}[type];
 const leading=v.rake*sweepFactor*Math.pow(t,1.15);
 // Slightly round the shoulder and tip; keep the root chord exact.
 const tipRound=Math.pow(Math.max(0,1-t),.18);
 return {chord:Math.max(8,chord*tipRound),leading};
}
function buildOutline(v,type){
 const count=48, left=[],right=[];
 for(let i=0;i<=count;i++){
  const t=i/count,s=stationShape(t,v,type),y=t*v.height;
  left.push({x:s.leading,y});right.push({x:s.leading+s.chord,y});
 }
 return [...left,...right.reverse()];
}
function drawOutline(v,type){
 const points=buildOutline(v,type);
 const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
 const sx=330/Math.max(80,maxX-minX),sy=238/v.height,scale=Math.min(sx,sy);
 const width=(maxX-minX)*scale,offsetX=(440-width)/2-minX*scale,baseY=292;
 const mapped=points.map(p=>({x:offsetX+p.x*scale,y:baseY-p.y*scale}));
 const d=mapped.map((p,i)=>(i?"L":"M")+p.x.toFixed(2)+" "+p.y.toFixed(2)).join(" ")+" Z";
 $("fin-shape").setAttribute("d",d);
 $("base-line").setAttribute("d",`M ${mapped[0].x} ${baseY} L ${mapped[points.length/2-1].x} ${baseY}`);
 const baseStart=mapped[0].x,baseEnd=mapped[points.length/2-1].x,topY=baseY-v.height*scale;
 $("dimension-lines").innerHTML=`
  <line x1="${baseStart}" y1="305" x2="${baseEnd}" y2="305"/>
  <text x="${(baseStart+baseEnd)/2}" y="319" text-anchor="middle">${v.base} mm</text>
  <line x1="${Math.max(26,offsetX+minX*scale-12)}" y1="${topY}" x2="${Math.max(26,offsetX+minX*scale-12)}" y2="${baseY}"/>
  <text x="15" y="${(topY+baseY)/2}" text-anchor="middle" transform="rotate(-90 15 ${(topY+baseY)/2})">${v.height} mm</text>`;
 $("outline-summary").textContent=`${v.height} × ${v.base} mm · ${$("shape").selectedOptions[0].text}`;
}
function buildFinGeometry(v,type){
 const spanSteps=48,chordSteps=64,positions=[],indices=[];
 for(let i=0;i<=spanSteps;i++){
  const t=i/spanSteps,s=stationShape(t,v,type),y=t*v.height;
  const localThickness=(v.thickness*(s.chord/v.base));
  for(let j=0;j<=chordSteps;j++){
   const u=j/chordSteps;
   const x=s.leading+u*s.chord;
   const xn=Math.max(0,Math.min(1,u));
   const naca=5*.12*(.2969*Math.sqrt(xn)-.1260*xn-.3516*xn*xn+.2843*xn*xn*xn-.1015*xn*xn*xn*xn);
   const z=localThickness*(naca/.06);
   positions.push(x,y,z);
  }
 }
 const row=chordSteps+1;
 // upper and lower skins; thickness tapers to zero at leading/trailing edges.
 const verts=positions.length/3;
 const allPositions=new Float32Array(positions.length*2);
 allPositions.set(positions);
 for(let i=0;i<verts;i++){allPositions[verts*3+i*3]=positions[i*3];allPositions[verts*3+i*3+1]=positions[i*3+1];allPositions[verts*3+i*3+2]=-positions[i*3+2];}
 const allIndices=[];
 for(let side=0;side<2;side++){
  const offset=side*verts;
  for(let i=0;i<spanSteps;i++)for(let j=0;j<chordSteps;j++){
   const a=offset+i*row+j,b=a+1,c=a+row,d=c+1;
   if(side===0)allIndices.push(a,c,b,b,c,d);else allIndices.push(a,b,c,b,d,c);
  }
 }
 // Close the leading and trailing edges and the root and tip perimeter.
 for(let i=0;i<spanSteps;i++)for(const j of [0,chordSteps]){
  const a=i*row+j,b=(i+1)*row+j,al=verts+a,bl=verts+b;
  allIndices.push(a,b,al,b,bl,al);
 }
 for(let j=0;j<chordSteps;j++)for(const i of [0,spanSteps]){
  const a=i*row+j,b=a+1,al=verts+a,bl=verts+b;
  allIndices.push(a,al,b,b,al,bl);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.BufferAttribute(allPositions,3));
 g.setIndex(allIndices);g.computeVertexNormals();
 return g;
}
function updateModel(v,type){
 if(finMesh){scene.remove(finMesh);finMesh.geometry.dispose();finMesh.material.dispose();}
 const geometry=buildFinGeometry(v,type);
 const material=new THREE.MeshStandardMaterial({color:0xc99a6b,metalness:.18,roughness:.34,side:THREE.DoubleSide});
 finMesh=new THREE.Mesh(geometry,material);scene.add(finMesh);
 const maxX=v.base+v.rake+20;
 controls.target.set(maxX*.42,v.height*.48,0);
 camera.position.set(maxX*.42+v.height*.55,v.height*.9,maxX*1.55);
 camera.near=.1;camera.far=2000;camera.updateProjectionMatrix();
 controls.update();
 $("model-status").textContent=`${type.toUpperCase()} · ${v.thickness} mm`;
}
function update(){
 const v=getValues(),type=$("shape").value;
 ids.forEach(id=>{$(id+"-out").textContent=v[id]+" mm";});
 $("shape-description").textContent=descriptions[type];
 drawOutline(v,type);updateModel(v,type);
}
function resize(){
 const w=host.clientWidth,h=host.clientHeight;
 if(!w||!h)return;
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
ids.forEach(id=>$(id).addEventListener("input",update));
$("shape").addEventListener("change",update);
$("reset").addEventListener("click",()=>{ids.forEach(id=>$(id).value=defaults[id]);$("shape").value="keel";update();});
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}
animate();update();
