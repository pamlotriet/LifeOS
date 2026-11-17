const fs=require('node:fs');
const path=require('node:path');
const postcss=require('postcss');
const root='src/app/pages/budget';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
// Metric surfaces share a theme; each component retains its values and chart layout.
for(const [file,selector] of [
 ['components/budget-planning-summary/budget-planning-summary.html','<article'],
 ['components/budget-comparison-summary/budget-comparison-summary.html','<div class="panel'],
]) {
 const p=root+'/'+file;let text=read(p);
 text=text.replaceAll(selector,selector==='<article'?'<article class="budget-metric"':'<div class="budget-metric panel');write(p,text);
}
{
 const p=root+'/components/budget-summary/budget-summary.ts';let text=read(p);
 text=text.replace('<article [class.balance-kpi]','<article class="budget-metric" [class.balance-kpi]');
 text=text.replace(/\.budget-kpis article \{[^}]*\}/g,'');write(p,text);
}
for(const file of ['components/budget-planning-summary/budget-planning-summary.css','components/budget-comparison-summary/budget-comparison-summary.css']) {
 const p=root+'/'+file;const sheet=postcss.parse(read(p));
 sheet.walkRules(rule=>{
  if(rule.selectors.every(s=>s===':host article'||s===':host > .panel'))rule.walkDecls(d=>{
   if(['padding','border','border-radius','background','min-width'].includes(d.prop))d.remove();
  });
 });sheet.walkRules(r=>{if(!r.nodes.length)r.remove();});sheet.walkAtRules(r=>{if(r.nodes&&!r.nodes.length)r.remove();});write(p,sheet.toString());
}
// Payment frames belong to the payment row, including its mobile direction.
{
 const p=root+'/components/debt-overview-card/debt-overview-card.css';const sheet=postcss.parse(read(p));
 sheet.walkRules(r=>{if(r.selectors.every(s=>s==='.payment-row'||s==='.payment-row:last-child'))r.remove();});write(p,sheet.toString());
 const row=root+'/components/debt-payment-row/debt-payment-row.css';write(row,read(row)+'\n@media (max-width:520px) { :host { align-items:flex-start; flex-direction:column; } }\n');
}
// The former common sheets have no consumers; BudgetPage installs their scoped replacements.
for(const file of ['budget.css','budget-layout.css','components/budget-nav/budget-nav.css']) {
 const p=path.resolve(root,file);if(!p.startsWith(path.resolve(root)+path.sep))throw new Error('Invalid path');fs.unlinkSync(p);
}
