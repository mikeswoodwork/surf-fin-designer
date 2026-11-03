const params=new URLSearchParams(location.search);
const setup=params.get("setup")||"thruster";
const system=setup==="single"?"us-box":(params.get("system")||"futures");
const setupNames={thruster:"Thruster",twin:"Twin · Keel Fins",quad:"Quad",single:"Singlefin"};
const systemNames={futures:"Futures",fcs1:"FCS I","us-box":"US Box"};
const presets={
 thruster:{height:120,base:110,rake:30,tip:40,thickness:10,foil:40,cant:6},
 twin:{height:130,base:115,rake:35,tip:55,thickness:10,foil:45,cant:0},
 quad:{height:115,base:105,rake:35,tip:38,thickness:9,foil:40,cant:6},
 single:{height:180,base:145,rake:25,tip:65,thickness:10,foil:50,cant:0}
};
const defaults=presets[setup]||presets.thruster;
const ids=Object.keys(defaults),$=id=>document.getElementById(id);
const label=setupNames[setup]||setupNames.thruster;
document.title="FINLAB · "+label;
$("page-title").innerHTML=label+"<br><em>deine Finne.</em>";
$("page-sub").textContent="Passe die grundlegenden Geometriedaten für dein "+label+"-Setup an. Alle drei Ansichten werden aus denselben Werten berechnet.";
$("spec-title").textContent=label;$("spec-setup").textContent=label;
$("spec-system").textContent=systemNames[system]||"Futures";
$("selection-summary").innerHTML="<span>"+label+"</span><span>"+(systemNames[system]||"Futures")+"</span>";
$("back-link").href=setup==="single"?"../":"../fin-system/index.html?setup="+encodeURIComponent(setup);
ids.forEach(id=>$(id).value=defaults[id]);

const NS="http://www.w3.org/2000/svg";
function el(tag,attrs,parent){const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));parent.appendChild(n);return n;}
function clear(node){while(node.firstChild)node.removeChild(node.firstChild);}
function pathFrom(points){return points.map((p,i)=>(i?"L":"M")+p[0].toFixed(2)+" "+p[1].toFixed(2)).join(" ")+" Z";}
function nacaThickness(x,t){const u=Math.max(0,Math.min(1,x));return 5*t*(.2969*Math.sqrt(u)-.1260*u-.3516*u*u+.2843*u*u*u-.1015*u*u*u*u);}
function drawTop(v){
 const group=$("top-dims");clear(group);
 // Looking down onto the fin root: chord runs left-right, foil thickness is the vertical axis.
 const x0=72,x1=348,cy=125,chord=v.base,thick=v.thickness;
 const chordPx=chord*1.65,thickPx=Math.max(5,thick*5.2),left=(420-chordPx)/2;
 const pts=[];
 for(let i=0;i<=80;i++){const u=i/80;pts.push([left+u*chordPx,cy-nacaThickness(u,thickPx/5.2)*5.2]);}
 for(let i=80;i>=0;i--){const u=i/80;pts.push([left+u*chordPx,cy+nacaThickness(u,thickPx/5.2)*5.2]);}
 $("top-fin").setAttribute("d",pathFrom(pts));
 $("top-center").setAttribute("d",`M ${left} ${cy} H ${left+chordPx}`);
 const foilX=left+chordPx*v.foil/100;
 el("line",{x1:foilX,y1:cy-thickPx*.72,x2:foilX,y2:cy+thickPx*.72,class:"dim-line","stroke-dasharray":"3 3"},group);
 el("text",{x:210,y:cy+72,"text-anchor":"middle",class:"dim-text"},group).textContent="Base / Chord: "+v.base+" mm";
 el("text",{x:foilX,y:cy-20,"text-anchor":"middle",class:"dim-text"},group).textContent="max. Dicke";
}
function drawSide(v){
 const group=$("side-dims");clear(group);
 const sx=2.05,sy=1.02,baseY=207,baseX=74;
 const h=v.height*sy,base=v.base*sx,rake=v.rake*sx,tip=v.tip*sx;
 const leadingBase=baseX+rake,leadingTip=baseX+base*.48+rake;
 const trailingBase=baseX+base, trailingTip=leadingTip+tip;
 // leading edge sweep and trailing edge taper, with smooth quadratic interpolation.
 const left=[],right=[];
 for(let i=0;i<=60;i++){const t=i/60;left.push([leadingBase+(leadingTip-leadingBase)*Math.pow(t,1.18),baseY-h*t]);}
 for(let i=60;i>=0;i--){const t=i/60;right.push([trailingBase+(trailingTip-trailingBase)*Math.pow(t,.88),baseY-h*t]);}
 $("side-fin").setAttribute("d",pathFrom([...left,...right]));
 $("side-base").setAttribute("d",`M ${baseX} ${baseY} H ${trailingBase}`);
 el("line",{x1:baseX-12,y1:baseY,x2:baseX-12,y2:baseY-h,class:"dim-line"},group);
 el("text",{x:baseX-19,y:baseY-h/2,"text-anchor":"middle",class:"dim-text",transform:`rotate(-90 ${baseX-19} ${baseY-h/2})`},group).textContent="Höhe "+v.height+" mm";
 el("line",{x1:baseX,y1:baseY+13,x2:trailingBase,y2:baseY+13,class:"dim-line"},group);
 el("text",{x:(baseX+trailingBase)/2,y:baseY+28,"text-anchor":"middle",class:"dim-text"},group).textContent="Base "+v.base+" mm";
 el("text",{x:leadingTip+tip/2,y:baseY-h-10,"text-anchor":"middle",class:"dim-text"},group).textContent="Tip "+v.tip+" mm";
}
function drawFront(v){
 const group=$("front-dims");clear(group);
 const baseY=207,topY=207-v.height*1.02,halfBase=v.thickness*2.4;
 const cant=Math.tan(v.cant*Math.PI/180);
 const centerAt=y=>210+cant*(baseY-y)*.72;
 const pointsL=[],pointsR=[];
 for(let i=0;i<=60;i++){const t=i/60,y=baseY-(baseY-topY)*t;const taper=(1-.78*Math.pow(t,.78));const half=Math.max(.8,halfBase*taper);const cx=centerAt(y);pointsL.push([cx-half,y]);}
 for(let i=60;i>=0;i--){const t=i/60,y=baseY-(baseY-topY)*t;const taper=(1-.78*Math.pow(t,.78));const half=Math.max(.8,halfBase*taper);const cx=centerAt(y);pointsR.push([cx+half,y]);}
 $("front-fin").setAttribute("d",pathFrom([...pointsL,...pointsR]));
 $("front-center").setAttribute("d",`M ${centerAt(baseY)} ${baseY} L ${centerAt(topY)} ${topY}`);
 el("line",{x1:centerAt(baseY)-halfBase,y1:baseY+14,x2:centerAt(baseY)+halfBase,y2:baseY+14,class:"dim-line"},group);
 el("text",{x:210,y:baseY+29,"text-anchor":"middle",class:"dim-text"},group).textContent="Dicke max. "+v.thickness+" mm";
 el("text",{x:300,y:45,"text-anchor":"middle",class:"dim-text"},group).textContent="Cant "+v.cant+"°";
}
function update(){
 const v=Object.fromEntries(ids.map(id=>[id,Number($(id).value)]));
 ids.forEach(id=>{$(id+"-out").textContent=v[id]+(id==="foil"?" %":id==="cant"?"°":" mm");});
 $("spec-height").textContent=v.height+" mm";$("spec-base").textContent=v.base+" mm";
 $("spec-tip").textContent=v.tip+" mm";$("spec-thickness").textContent=v.thickness+" mm";$("spec-cant").textContent=v.cant+"°";
 drawTop(v);drawSide(v);drawFront(v);
}
ids.forEach(id=>$(id).addEventListener("input",update));
$("reset").addEventListener("click",()=>{ids.forEach(id=>$(id).value=defaults[id]);update();});
update();