const fs=require('node:fs');
const path=require('node:path');
const postcss=require('postcss');
const root='src/app/pages/budget';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
function files(dir,ext) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name),ext):e.name.endsWith(ext)?[path.join(dir,e.name)]:[]);}
const markup=files(root,'.html').concat(files(root,'.ts')).map(read).join('\n');
const used=name=>name==='dark'||name==='budget-screen'||new RegExp('\\b'+name+'\\b').test(markup);
let removed=0;
function dedupe(sheet) {
 const later=new Map();
 const rules=[];sheet.walkRules(r=>rules.push(r));
 for(const rule of rules.reverse()) {
  // Only equal selector lists under equal conditions can safely override each other.
  let condition='';let parent=rule.parent;
  while(parent&&parent.type!=='root'){condition=parent.name+':'+parent.params+'|'+condition;parent=parent.parent;}
  const key=condition+'|'+rule.selector;
  const props=later.get(key)??new Set();
  for(const decl of [...rule.nodes].reverse()) {
   if(decl.type!=='decl')continue;
   const prop=decl.prop+'|'+!!decl.important;
   if(props.has(prop)){decl.remove();removed++;}else props.add(prop);
  }
  later.set(key,props);
 }
}
const themeFile=root+'/components/budget-page/budget-page.css';
for(const file of files(root,'.css')) {
 if(file.endsWith('budget.css')||file.endsWith('budget-layout.css')||file.endsWith('budget-nav.css'))continue;
 const theme=file.replaceAll('\\','/')===themeFile;
 const sheet=postcss.parse(read(file));
 sheet.walkRules(rule=>{
  let selectors=rule.selectors.map(s=>s.replace(/:is\(([^()]*)\)/g,(_,items)=>{
   const live=items.split(',').filter(s=>[...s.matchAll(/\.([\w-]+)/g)].every(m=>used(m[1])));
   return live.length?':is('+live.join(',')+')':':not(*)';
  })).filter(s=>!s.includes(':not(*)')&&[...s.matchAll(/\.([\w-]+)/g)].every(m=>used(m[1])));
  if(!selectors.length){rule.remove();return;}
  rule.selectors=selectors;
  if(!theme) {
   if(rule.selectors.every(s=>/^(:host\s+)?\.budget-(overview|planning)-page$/.test(s)))rule.walkDecls(d=>{if(/^(padding|margin|max-width|width)/.test(d.prop))d.remove();});
   // The summary components own their descendants; stale page copies cannot reach them.
   if(!file.includes('components')&&rule.selectors.every(s=>/\.planning-summary\s+(article|span|strong|small)/.test(s))){rule.remove();return;}
   if(rule.selectors.every(s=>s==='.cycle-selector'||s==='.planning-cycle'))rule.walkDecls(d=>{if(['padding','border','border-radius','background','box-shadow'].includes(d.prop))d.remove();});
   if(rule.selectors.every(s=>['.cycle-navigation','.planning-cycle-controls','.comparison-month-controls'].includes(s)))rule.walkDecls(d=>{if(['display','align-items','gap','min-width'].includes(d.prop))d.remove();});
   if(rule.selectors.every(s=>s==='.cycle-details'||s==='.planning-cycle-details'))rule.walkDecls(d=>{if(['display','justify-content','align-items','flex-wrap','gap','margin-top'].includes(d.prop))d.remove();});
  }
 });
 dedupe(sheet);
 sheet.walkRules(rule=>{if(!rule.nodes.length)rule.remove();});
 sheet.walkAtRules(rule=>{if(rule.nodes&&!rule.nodes.length)rule.remove();});
 write(file,sheet.toString());
}
let theme=postcss.parse(read(themeFile));
theme.walkRules(rule=>{
 // Common controls own appearance; field wrappers retain only layout rules.
 if(rule.selectors.some(s=>s==='.budget-page .field input')&&rule.selectors.includes('.budget-page .field select')) {
  rule.selectors=['.budget-page .field select'];
 }
 if(rule.selectors.every(s=>s.includes('.budget-page .error')))rule.walkDecls(d=>{if(['color','background','border-color'].includes(d.prop)&&!d.value.includes('--budget-error-'))d.remove();});
});
theme.append(postcss.parse(`
.budget-page .field :is(input,textarea) { width:100%; min-width:0; box-sizing:border-box; }
.budget-page :is(.cycle-selector,.planning-cycle) { padding:var(--budget-padding); border:1px solid var(--border); border-radius:var(--budget-radius); background:var(--card); }
.budget-page :is(.cycle-navigation,.planning-cycle-controls,.comparison-month-controls) { display:flex; align-items:center; gap:12px; min-width:0; }
.budget-page :is(.cycle-details,.planning-cycle-details) { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:12px; margin-top:16px; }
`));
// Split foundations from responsive layout; both are installed once by BudgetPage.
const foundations=postcss.root();const layout=postcss.root();
let inLayout=false;
for(const node of [...theme.nodes]) {
 if(node.type==='comment'&&node.text.includes('Shared budget panels'))inLayout=true;
 (inLayout?layout:foundations).append(node);
}
write(themeFile,foundations.toString());
write(root+'/components/budget-page/budget-page-layout.css',layout.toString());
// Strip now-redundant root sizing from the global desktop Budget grid.
const professional=postcss.parse(read('src/professional.css'));
professional.walkRules(rule=>{
 if(rule.selectors.every(s=>s==='ion-app.lifeos-app .budget-overview-page'))rule.walkDecls(d=>{if(d.prop==='max-width')d.remove();});
});write('src/professional.css',professional.toString());
console.log(`Removed ${removed} declarations overridden by identical selectors.`);
