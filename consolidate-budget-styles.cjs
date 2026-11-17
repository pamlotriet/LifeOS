const fs=require('node:fs');
const path=require('node:path');
const postcss=require('postcss');
const root='src/app/pages/budget';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);};
function files(dir,extension) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name),extension):e.name.endsWith(extension)?[path.join(dir,e.name)]:[]);}
const cssFiles=files(root,'.css');
if(!fs.existsSync('.angular/cache/budget-styles-before.json'))write('.angular/cache/budget-styles-before.json',JSON.stringify(Object.fromEntries(cssFiles.map(p=>[p,read(p)])),null,2));
const commonSource=read(root+'/budget.css')+'\n'+read(root+'/budget-layout.css');
const common=postcss.parse(commonSource);
const allTemplates=[...files(root,'.html'),...files(root,'.ts')].map(read).join('\n');
const dead=[];
// Remove selectors for retired markup, not rules shared by current feature views.
common.walkRules(rule=>{
 const keep=rule.selectors.map(selector=>selector.replace(/:is\(([^()]*)\)/g,(_,items)=>{
  const used=items.split(',').filter(item=>[...item.matchAll(/\.([a-zA-Z][\w-]*)/g)].every(m=>new RegExp('\\b'+m[1]+'\\b').test(allTemplates)));
  return used.length?':is('+used.join(',')+')':':not(*)';
 })).filter(selector=>{
  if(selector.includes(':not(*)'))return false;
  const names=[...selector.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m=>m[1]);
  const used=names.every(name=>name==='dark'||new RegExp('\\b'+name+'\\b').test(allTemplates));
  if(!used)dead.push(selector);
  return used;
 });
 if(keep.length)rule.selectors=keep;else rule.remove();
});
// Common actions now use AppButton, including route links.
const actionSelectors=new Set(['.primary-button','.secondary-button','.danger-button',':host-context(.dark) .secondary-button',':host-context(.dark) .danger-button']);
common.walkRules(rule=>{
 const selectors=rule.selectors.filter(s=>!actionSelectors.has(s));
 if(!selectors.length){rule.remove();return;}rule.selectors=selectors;
 // AppInput owns field appearance. Keep only layout and specialized colour fields.
 if(selectors.every(s=>s==='.field input'||s==='.field textarea')) {
  rule.walkDecls(d=>{if(!['width','min-width','box-sizing','resize'].includes(d.prop))d.remove();});
 }
});
// Scope the single shared stylesheet to the Budget feature, including child views.
common.walkRules(rule=>{
 rule.selectors=rule.selectors.map(selector=>{
  if(selector===':host')return '.budget-screen';
  if(selector==='ion-content')return '.budget-screen > ion-content';
  if(selector.startsWith(':host-context(.dark) '))return '.dark .budget-page '+selector.slice(':host-context(.dark) '.length);
  selector=selector.replace(/^:host\s+/, '');
  return selector.startsWith('.budget-page')?selector:'.budget-page '+selector;
 });
});
// The page frame has one owner instead of conflicting width/padding utilities.
common.walkRules(rule=>{
 if(rule.selectors.includes('.budget-page'))rule.walkDecls(d=>{
  if(['max-width','padding','padding-top','padding-inline','padding-bottom','width','margin','box-sizing','--budget-gap','--budget-padding'].includes(d.prop))d.remove();
 });
});
let theme=`/* Shared Budget foundations. Every selector is scoped to this feature. */
.budget-page {
 --budget-gap: 24px;
 --budget-padding: 24px;
 --budget-radius: 14px;
 --budget-error-foreground: #a82148;
 --budget-error-background: #fff0f4;
 --budget-error-border: #f0a5b8;
 box-sizing: border-box;
 display: block;
 width: 100%;
 min-width: 0;
 min-height: 100%;
 max-width: none;
 margin: 0;
 padding: 20px 16px calc(40px + env(safe-area-inset-bottom));
 color: var(--foreground);
}
.dark .budget-page {
 --budget-error-foreground: #fecdd3;
 --budget-error-background: #3b2035;
 --budget-error-border: #a44768;
}
@media (min-width: 768px) {
 .budget-page { padding-inline: 32px; padding-top: 28px; }
}
@media (max-width: 640px) {
 .budget-page { --budget-padding: 16px; }
}
`+common.toString();
// Keep the existing shared mobile behavior, now readable CSS instead of a host-class string.
theme+=`
.budget-page > * { min-width: 0; }
.budget-page .panel { border-radius: var(--budget-radius); }
.budget-page .error { color: var(--budget-error-foreground); background: var(--budget-error-background); border-color: var(--budget-error-border); }
.budget-page .budget-metric { min-width: 0; padding: var(--budget-padding); border: 1px solid var(--border); border-radius: var(--budget-radius); background: var(--card); }
@media (max-width: 639px) {
 .budget-page .page-header { display:grid !important; grid-template-columns:auto minmax(0,1fr) !important; gap:12px !important; border:0 !important; background:none !important; padding:0 !important; }
 .budget-page .page-header > :nth-child(n+3) { grid-column:1/-1; width:100%; }
 .budget-page h1 { font-size:24px !important; line-height:1.25 !important; }
 .budget-page .section-heading { align-items:flex-start !important; gap:12px !important; }
 .budget-page .form-actions { display:grid !important; grid-template-columns:1fr !important; gap:8px !important; }
 .budget-page .form-actions > * { min-width:0; width:100%; }
 .budget-page .segments { display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:4px !important; }
 .budget-page .segments > button { min-height:44px; padding-inline:8px !important; font-size:12px !important; }
 .budget-page .month-nav { width:100%; max-width:none; flex-direction:column !important; align-items:stretch !important; }
 .budget-page .month-nav > app-month-picker { flex:auto !important; }
 .budget-page :is(input,select,textarea) { font-size:16px !important; }
 .budget-page .data-table { display:block; overflow-x:auto; }
 .budget-page .panel { min-width:0; overflow-wrap:break-word; }
 .budget-page strong { overflow-wrap:anywhere; }
}
`;
write(root+'/components/budget-page/budget-page.css',theme);
if(process.argv.includes('--theme-only'))process.exit(0);
// Stop injecting the common sheets into each page and transaction list.
for(const file of files(root,'.ts')) {
 let source=read(file);
 if(source.includes("'../budget.css'")) {
  source=source.replace(/styleUrls:\s*\[([^\]]+)\],/,(_,values)=>{
   const local=values.split(',').map(s=>s.trim()).filter(s=>!s.includes('budget.css')&&!s.includes('budget-layout.css'));
   return local.length?'styleUrls: ['+local.join(', ')+'],':'';
  });
  source=source.replace(/(@Component\(\{)/,'$1\n  host: { class: \'budget-screen\' },');
 }
 source=source.replace("styleUrls: ['../../budget.css', '../../budget-layout.css', './budget-transactions.css']","styleUrl: './budget-transactions.css'");
 write(file,source);
}
// Remove copies of common rules from feature components. Their layout rules stay local.
const commonSelectors=new Set(['h1','h2','h3','button','input','select','textarea','button:disabled','button:focus-visible','a:focus-visible','input:focus-visible','select:focus-visible','textarea:focus-visible','.text-link','.eyebrow','.primary-button','.secondary-button','.danger-button','.muted','small','.positive','.negative','.help-text','.panel','.empty-state','.empty-state > ion-icon','.empty-state h3','.row-copy','.row-copy strong','.row-copy small',':host-context(.budget-page) .row-copy small',':host-context(.dark) .secondary-button']);
for(const file of cssFiles.filter(p=>p.includes(path.join('components','')))) {
 if(file.endsWith('budget-nav.css'))continue;
 const sheet=postcss.parse(read(file));
 sheet.walkRules(rule=>{
  const remaining=rule.selectors.filter(s=>!commonSelectors.has(s));
  if(remaining.length)rule.selectors=remaining;else rule.remove();
 });write(file,sheet.toString());
}
// Make AppButton the appearance owner for native action buttons and route links.
for(const file of files(root,'.html').concat(files(root,'.ts'))) {
 let source=read(file);let needsButton=false;
 source=source.replace(/<(button|a)\b(?:"[^"]*"|'[^']*'|[^'">])*>/g,tag=>{
  if(tag.includes('appButton'))return tag;
  const match=/class="([^"]*)"/.exec(tag);
  if(!match)return tag;
  const names=match[1].split(/\s+/);
  const appearance=names.includes('danger-button')?'danger':names.includes('primary-button')?'primary':names.includes('secondary-button')?'secondary':null;
  if(!appearance)return tag;
  needsButton=true;return tag.replace(/^<(button|a)/,`<$1 appButton="${appearance}"`);
 });
 // Width and gutters belong to the shared page frame.
 source=source.replace(/<main\b[^>]*appBudgetPage[^>]*>/g,tag=>tag.replace(/class="([^"]*)"/,(_,names)=>'class="'+names.split(/\s+/).filter(c=>!/(?:^|:)(?:m-0!?|w-full!?|max-w-[\w-]+!?|px-[\w-]+!?)$/.test(c)).join(' ')+'"'));
 if(needsButton) {
  const tsFile=file.endsWith('.html')?file.slice(0,-5)+'.ts':file;
  let ts=file===tsFile?source:read(tsFile);
  if(!ts.includes("import { AppButton }")) ts="import { AppButton } from '@shared/components/app-button/app-button';\n"+ts.replace(/imports:\s*\[/,'imports: [AppButton, ');
  if(file===tsFile)source=ts;else write(tsFile,ts);
 }
 write(file,source);
}
write('.angular/cache/budget-unused-selectors.json',JSON.stringify(dead,null,2));
console.log(`Centralized Budget styles; removed ${dead.length} retired selectors.`);
