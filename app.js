const ids = ["height","base","rake","tip","thickness"];
const defaults = {height:130,base:115,rake:35,tip:55,thickness:10};
const $ = id => document.getElementById(id);

function update(){
  const v = Object.fromEntries(ids.map(id => [id, Number($(id).value)]));
  ids.forEach(id => { $(id+"-out").textContent = v[id]+" mm"; });
  $("outline-summary").textContent = v.height+" × "+v.base+" mm";

  // Schematic outline: dimensions are mapped proportionally into the drawing area.
  const scale = 1.45;
  const basePx = v.base*scale;
  const heightPx = v.height*scale;
  const rakePx = v.rake*scale;
  const tipPx = v.tip*scale;
  const x0 = 75, y0 = 270;
  const x1 = x0 + basePx;
  const topY = y0 - heightPx;
  const tipStart = x0 + Math.max(8, rakePx);
  const tipEnd = Math.min(x1, tipStart + tipPx*scale);
  const d = [
    "M",x0,y0,
    "L",x1,y0,
    "C",x1-rakePx*.12,y0-heightPx*.30,tipEnd+18,topY+heightPx*.16,tipEnd,topY,
    "L",tipStart,topY,
    "C",tipStart-rakePx*.22,topY+heightPx*.22,x0+rakePx*.28,y0-heightPx*.45,x0,y0,
    "Z"
  ].join(" ");
  $("fin-shape").setAttribute("d",d);
  $("base-line").setAttribute("d",`M ${x0} ${y0} L ${x1} ${y0}`);
  $("dimension-lines").innerHTML = `
    <line x1="${x0}" y1="286" x2="${x1}" y2="286"/>
    <text x="${(x0+x1)/2}" y="303" text-anchor="middle">${v.base} mm</text>
    <line x1="58" y1="${topY}" x2="58" y2="${y0}"/>
    <text x="48" y="${(topY+y0)/2}" text-anchor="middle" transform="rotate(-90 48 ${(topY+y0)/2})">${v.height} mm</text>
  `;
}
ids.forEach(id => $(id).addEventListener("input",update));
$("reset").addEventListener("click",()=>{ids.forEach(id=>$(id).value=defaults[id]);update();});
update();