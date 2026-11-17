const fs=require('node:fs');
const path=require('node:path');
const postcss=require('postcss');
const root='src/app/pages/budget';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
const cosmetic=new Set(['background','color','border','border-color','border-radius','padding','min-height','font-size','font-weight','box-shadow']);
function files(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):e.name.endsWith('.css')?[path.join(dir,e.name)]:[]);}
for(const file of files(root)) {
 const sheet=postcss.parse(read(file));
 sheet.walkRules(rule=>{
  if(rule.selectors.every(s=>/\.(primary-button|secondary-button|danger-button)$/.test(s)))rule.walkDecls(d=>{if(cosmetic.has(d.prop))d.remove();});
  if(!file.includes('components')&&rule.selectors.every(s=>/\.payment-(actions|notes)/.test(s)))rule.remove();
  if(file.includes('budget-debts')&&rule.selectors.every(s=>s===':host-context(.dark) .error'))rule.remove();
 });
 sheet.walkRules(r=>{if(!r.nodes.length)r.remove();});
 sheet.walkAtRules(r=>{if(r.nodes&&!r.nodes.length)r.remove();});write(file,sheet.toString());
}
// The semantic page selector ties with app-wide panel styling, so Budget tokens win.
for(const file of ['budget-page.css','budget-page-layout.css']) {
 const p=root+'/components/budget-page/'+file;
 write(p,read(p).replace(/(?:main)*\.budget-page \.panel/g,'main.budget-page .panel'));
}
// Remove obsolete Budget-only global overrides whose markup no longer exists.
{
 const file='src/professional.css';const sheet=postcss.parse(require('node:child_process').execFileSync('git',['show','HEAD:'+file],{encoding:'utf8'}));
 const dead=['budget-entry-actions','budget-overview-header','budget-title','budget-month-picker','plan-forecast'];
 sheet.walkRules(rule=>{
  const selectors=rule.selectors.map(s=>s.replace(/:is\(([^()]*)\)/g,(_,items)=>':is('+items.split(',').filter(item=>!dead.some(c=>item.includes('.'+c))).join(',')+')')).filter(s=>!dead.some(c=>s.includes('.'+c)));
  if(selectors.length)rule.selectors=selectors;else rule.remove();
  if(rule.selectors.every(s=>s==='ion-app.lifeos-app .budget-overview-page'))rule.walkDecls(d=>{if(d.prop==='max-width')d.remove();});
 });
 sheet.walkAtRules(r=>{if(r.nodes&&!r.nodes.length)r.remove();});write(file,sheet.toString());
}
