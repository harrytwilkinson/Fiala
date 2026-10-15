// Static, search-friendly vial guide pages (getfiala.com/vial-guides/...). Each one
// works on its own: a small inline script runs the same syringe maths as the app,
// so people arriving from a search can use it straight away. No dose is suggested.

import { STATUS_LABEL } from "../data/peptides.ts";
import { VIAL_GUIDES, guidesFor, vialLabel, waterOptions, type VialGuide } from "../data/vialGuides.ts";
import { fmt } from "./reconstitution.ts";
import { esc, metaDescription, page } from "./sitePages.ts";
import { SITE_URL, peptidePageUrl, vialGuidePageUrl } from "./site.ts";
import { FREQUENCIES, MIXED_SHELF_DAYS, mixRow } from "./vialGuide.ts";

const per10 = (mg: number) => (mg < 1 ? `${fmt(mg * 1000)} mcg` : `${fmt(mg)} mg`);

// Kept dependency-free and small. Builds the syringe from numbers only (no user text).
const SIM_SCRIPT = `
(function(){
var root=document.getElementById("sim");if(!root)return;
var vial=parseFloat(root.dataset.vial),shelf=${MIXED_SHELF_DAYS};
var $=function(id){return document.getElementById(id)};
var SY={"30":0.5,"50":1,"100":2};
function f(n,d){return n.toLocaleString(undefined,{maximumFractionDigits:d==null?2:d})}
function days(d){if(d<1)return"less than a day";if(d<14){var x=Math.floor(d);return x+" day"+(x===1?"":"s")}if(d<60)return"about "+Math.round(d/7)+" weeks";return"about "+Math.round(d/30)+" months"}
function syringe(cap,units){
  var x0=40,w=300,y=20,h=34,s=w/cap,fill=Math.min(Math.max(units,0),cap)*s,every=cap<=30?5:10,step=cap>50?2:1,t="";
  for(var u=0;u<=cap+1e-9;u+=step){var tx=x0+u*s,maj=Math.round(u*10)%(every*10)===0;t+='<line class="tick" x1="'+tx+'" y1="'+y+'" x2="'+tx+'" y2="'+(y+(maj?14:7))+'"/>';if(maj)t+='<text x="'+tx+'" y="'+(y+h+16)+'" text-anchor="middle">'+u+'</text>'}
  return '<svg class="syr" viewBox="0 0 400 90" role="img" aria-label="Syringe filled to '+f(units,1)+' of '+cap+' units">'+
    '<rect class="rod" x="'+(x0+fill)+'" y="'+(y+h/2-3)+'" width="'+(w-fill+30)+'" height="6"/>'+
    '<rect class="liquid'+(units>cap?' over':'')+'" x="'+x0+'" y="'+y+'" width="'+fill+'" height="'+h+'"/>'+
    '<rect class="barrel" x="'+x0+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="3"/>'+
    '<line class="tick" x1="'+(x0-14)+'" y1="'+(y+h/2)+'" x2="4" y2="'+(y+h/2)+'"/>'+t+'</svg>';
}
function run(){
  var water=parseFloat($("s-water").value),raw=$("s-dose").value.trim(),unit=$("s-unit").value,cap=parseFloat($("s-syringe").value),per=parseFloat($("s-freq").value);
  var dose=parseFloat(raw);if(unit==="mcg")dose=dose/1000;
  var mgml=vial/water,out=$("s-out"),warn=[],html="";
  $("s-strength").textContent="Makes "+f(mgml,3)+" mg/mL: each unit on the syringe holds "+f(mgml*10)+" mcg.";
  if(!raw||!(dose>0)){out.innerHTML='<p class="muted">Enter your dose to see where to draw to and how long the vial lasts.</p>'+syringe(cap,0);return}
  if(dose>vial){out.innerHTML='<p class="warnings">That dose is more than the whole vial holds.</p>';return}
  var exact=dose/mgml*100,tick=SY[String(cap)]||1,units=Math.round(exact/tick)*tick,doses=Math.floor(vial/dose+1e-9),d=doses/per;
  if(exact>cap)warn.push("This is more than the syringe holds ("+cap+" units). Use a bigger syringe or less water.");
  if(exact<2)warn.push("Under about 2 units is hard to measure. More water makes each dose a bigger, easier-to-read volume.");
  if(units>0&&Math.abs(units-exact)/exact>0.05)warn.push("The exact amount falls between the marks. Drawing to "+f(units,1)+" units gives "+f(units/100*mgml*1000)+" mcg.");
  if(d>shelf)warn.push("At this rate the vial lasts longer than about 4 weeks. Mixed peptides often aren't stable that long, so check the supplier's use-by guidance.");
  html='<p class="muted" style="margin:0">Draw the syringe to</p><p class="big">'+f(units,1)+' <small>units</small></p><p class="muted" style="margin:0">= '+f(exact/100,3)+' mL'+(units!==exact?' (exact: '+f(exact)+' units)':'')+'</p>'+syringe(cap,units)+
    '<p><strong>'+doses+'</strong> doses in the vial · lasts <strong>'+days(d)+'</strong></p>';
  if(warn.length)html+='<ul class="warnings"><li>'+warn.join("</li><li>")+'</li></ul>';
  out.innerHTML=html;
}
["s-water","s-dose","s-unit","s-syringe","s-freq"].forEach(function(id){$(id).addEventListener("input",run);$(id).addEventListener("change",run)});
run();
})();
`;

export function vialGuidePage(g: VialGuide): string {
  const root = "../../";
  const { peptide: p, vialMg } = g;
  const label = vialLabel(vialMg);
  const waters = waterOptions(vialMg);
  const others = guidesFor(p.id).filter((o) => o.id !== g.id);
  const rows = waters
    .map((w) => {
      const r = mixRow(vialMg, w);
      return `<tr><th scope="row">${fmt(w)} mL</th><td>${fmt(r.mgPerMl, 3)} mg/mL</td><td>${fmt(r.mcgPerUnit)} mcg</td><td>${per10(r.mgPer10Units)}</td></tr>`;
    })
    .join("");
  const first = mixRow(vialMg, waters[1]);
  const body = `
      <p class="crumbs"><a href="${root}vial-guides/">Mixing guides</a> › <a href="${root}peptides/${esc(p.id)}/">${esc(p.name)}</a></p>
      <h1>${esc(p.name)} ${esc(label)} vial: mixing &amp; syringe guide</h1>
      <div class="badges"><span class="badge s-${p.status}">${esc(STATUS_LABEL[p.status])}</span><span class="badge">${esc(p.category)}</span></div>
      <p class="lead">How much bacteriostatic water to add to a ${esc(label)} ${esc(p.name)} vial, what each mark on a U-100 insulin syringe holds, and how long the vial lasts at your dose.</p>
      ${g.note ? `<section class="card warn">${esc(g.note)}</section>` : ""}

      <section class="card sim" id="sim" data-vial="${vialMg}">
        <h2>Syringe simulator</h2>
        <p class="muted" style="font-size:.9rem">Enter the dose your clinician has prescribed. This only converts units. It doesn't recommend doses.</p>
        <label><span>Water added</span><select id="s-water">${waters
          .map((w, i) => `<option value="${w}"${i === 1 ? " selected" : ""}>${fmt(w)} mL</option>`)
          .join("")}</select></label>
        <p class="muted" id="s-strength" style="font-size:.88rem;margin:.1rem 0"></p>
        <label><span>Your dose per injection</span><span class="row"><input id="s-dose" inputmode="decimal" placeholder="Your dose" size="8" /><select id="s-unit"><option${
          vialMg < 1 ? " selected" : ""
        }>mcg</option><option${vialMg < 1 ? "" : " selected"}>mg</option></select></span></label>
        <label><span>Syringe (U-100 insulin)</span><select id="s-syringe"><option value="30">0.3 mL (30 units)</option><option value="50">0.5 mL (50 units)</option><option value="100" selected>1.0 mL (100 units)</option></select></label>
        <label><span>How often you inject</span><select id="s-freq">${FREQUENCIES.map(
          (f) => `<option value="${f.perDay}"${f.id === "daily" ? " selected" : ""}>${esc(f.label)}</option>`,
        ).join("")}</select></label>
        <div id="s-out" aria-live="polite"><noscript><p class="muted">Turn on JavaScript to use the simulator, or use the table below.</p></noscript></div>
      </section>

      <section class="card">
        <h2>Mixing table for a ${esc(label)} vial</h2>
        <p>What each mark on a U-100 insulin syringe holds. With ${fmt(waters[1])} mL of water, for example, the vial holds ${fmt(first.mgPerMl, 3)} mg/mL, so every unit is ${fmt(first.mcgPerUnit)} mcg and 10 units is ${per10(first.mgPer10Units)}.</p>
        <table><thead><tr><th scope="col">Water</th><th scope="col">Strength</th><th scope="col">1 unit</th><th scope="col">10 units</th></tr></thead><tbody>${rows}</tbody></table>
        <p class="muted" style="font-size:.88rem">More water doesn't change the dose, only how much liquid holds it. It makes small doses easier to measure. On a U-100 syringe, 100 units = 1 mL.</p>
      </section>

      <section class="card">
        <h2>How to mix a ${esc(p.name)} vial</h2>
        <ol>
          <li>Wash your hands. Wipe the tops of the peptide vial and the water vial with an alcohol swab and let them dry.</li>
          <li>Draw up the amount of bacteriostatic water you've chosen with a fresh syringe.</li>
          <li>Push the needle through the rubber top and let the water run slowly down the inside wall, not straight onto the powder.</li>
          <li>Swirl or roll the vial gently until the powder dissolves. Don't shake it.</li>
          <li>Label the vial with the date and strength, and keep it in the fridge.</li>
          <li>Use a new sterile syringe for every dose, and never share needles.</li>
        </ol>
      </section>

      <section class="card"><h2>About ${esc(p.name)}</h2>
        <p><strong>How it's taken:</strong> ${esc(p.route)}</p>
        <p><strong>How long it lasts (half-life):</strong> ${esc(p.halfLife)}</p>
        ${p.storage ? `<p><strong>Storage:</strong> ${esc(p.storage)}</p>` : ""}
        <p><a href="${root}peptides/${esc(p.id)}/">${esc(p.name)}: uses, evidence and side effects</a></p>
      </section>
      ${
        others.length
          ? `<section class="card"><h2>Other ${esc(p.name)} vial sizes</h2><ul class="chips">${others
              .map((o) => `<li><a href="${root}vial-guides/${esc(o.id)}/">${esc(vialLabel(o.vialMg))} vial</a></li>`)
              .join("")}</ul></section>`
          : ""
      }
      <section class="card cta">
        <h2>Track your ${esc(p.name)} vial privately</h2>
        <p>Fiala is a free app that does this maths for any vial, logs your doses, counts down what's left in each vial and reminds you when a dose is due. No account, and everything you log stays on your phone.</p>
        <a class="button" href="${root}#/guides/${esc(g.id)}">Open this guide in Fiala</a>
      </section>

      <section class="card warn"><strong>Not medical advice.</strong> This guide only converts units. Double-check every result, and confirm doses and mixing with a pharmacist or clinician.</section>
      <script>${SIM_SCRIPT}</script>`;
  return page({
    title: `${p.name} ${label} vial: how much water to add & syringe units · Fiala`,
    description: metaDescription(
      `Mixing a ${label} ${p.name} vial: how much bacteriostatic water to add, what each U-100 syringe unit holds, and a syringe simulator for your own dose.`,
    ),
    canonical: vialGuidePageUrl(g.id),
    root,
    body,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Fiala", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Mixing guides", item: `${SITE_URL}/vial-guides/` },
          { "@type": "ListItem", position: 3, name: p.name, item: peptidePageUrl(p.id) },
          { "@type": "ListItem", position: 4, name: `${label} vial`, item: vialGuidePageUrl(g.id) },
        ],
      },
    ],
  });
}

export function vialGuidesIndexPage(): string {
  const root = "../";
  const byPeptide = new Map<string, VialGuide[]>();
  for (const g of VIAL_GUIDES) byPeptide.set(g.peptide.id, [...(byPeptide.get(g.peptide.id) ?? []), g]);
  const groups = [...byPeptide.values()].sort((a, b) => a[0].peptide.name.localeCompare(b[0].peptide.name));
  const body = `
      <p class="crumbs"><a href="${root}peptides/">Peptide library</a> › Mixing guides</p>
      <h1>Peptide vial mixing guides</h1>
      <p class="lead">Pick your peptide and the amount on the vial label. Each guide shows how much bacteriostatic water to add, what every mark on a U-100 insulin syringe holds, and how long the vial lasts at your dose.</p>
${groups
  .map(
    (gs) =>
      `      <section class="card"><h2><a href="${root}peptides/${esc(gs[0].peptide.id)}/">${esc(gs[0].peptide.name)}</a></h2><ul class="chips">${gs
        .map((x) => `<li><a href="${esc(x.id)}/">${esc(vialLabel(x.vialMg))} vial</a></li>`)
        .join("")}</ul></section>`,
  )
  .join("\n")}
      <section class="card cta">
        <p>Different vial size? Fiala's free converter works for any amount, and it can log your doses and track what's left in each vial.</p>
        <a class="button" href="${root}#/calculator">Open the converter</a>
      </section>
      <section class="card warn"><strong>Not medical advice.</strong> These guides only convert units and never suggest a dose.</section>`;
  return page({
    title: "Peptide vial mixing guides: water, strength & syringe units · Fiala",
    description: metaDescription(
      `Mixing guides for ${VIAL_GUIDES.length} common vial sizes of ${new Set(VIAL_GUIDES.map((g) => g.peptide.id)).size} peptides: how much bacteriostatic water to add, what each U-100 syringe unit holds, and a syringe simulator.`,
    ),
    canonical: `${SITE_URL}/vial-guides/`,
    root,
    body,
  });
}
