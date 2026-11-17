const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');

// Static fixtures only: this preview never bootstraps Firebase or accesses user data.
const edge =
  process.env.EDGE_BINARY ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const directory = path.resolve('.angular/cache/budget-style-preview');
fs.mkdirSync(directory, { recursive: true });
const browser = path.resolve('dist/lifeos/browser');
const globalCss = fs.readdirSync(browser).find((name) => /^styles-.*\.css$/.test(name));
if (!globalCss) throw new Error('Run npm run build before generating previews.');

function styles(file, host) {
  let css = fs.readFileSync(file, 'utf8');
  if (!host) return css;
  css = css.replace(/:host-context\(([^)]+)\)/g, `$1 ${host}`);
  css = css.replace(/:host\((\.[^)]+)\)/g, `${host}$1`);
  css = css.replace(/:host\(([^)]+)\)/g, `$1${host}`);
  return css.replaceAll(':host', host);
}
const root = 'src/app/pages/budget/components/';
const css = [
  styles(root + 'budget-page/budget-page.css'),
  styles(root + 'budget-page/budget-page-layout.css'),
  styles(root + 'debt-overview-card/debt-overview-card.css', '.debt-card'),
  styles(root + 'debt-payment-row/debt-payment-row.css', '.payment-row'),
  styles('src/app/shared/components/app-button/app-button.css', '[appButton]'),
  styles('src/app/shared/components/app-input/app-input.css', '[appInput]'),
].join('\n');
const markup = `
<header class="page-header"><a href="#" class="icon-button" aria-label="Back">←</a><h1>Manage debt</h1><button appButton type="button">Add debt</button></header>
<section class="panel editor"><h2>Account details</h2><div class="field-grid"><label class="field"><span>Name</span><input appInput value="Everyday account"></label><label class="field"><span>Opening balance</span><input appInput value="1200.00" type="number"></label></div><div class="form-actions"><a appButton class="secondary-action" href="#">Cancel</a><button appButton type="button">Save account</button></div></section>
<article class="panel debt-card"><div class="debt-card-heading"><div><p class="eyebrow">Loan</p><h2>Personal loan</h2></div><div class="debt-header-actions"><button appButton class="secondary-action">Export PDF</button><button appButton class="secondary-action">Edit debt</button></div></div><div class="debt-balance"><span class="muted">Remaining balance</span><strong>R 9,500.00</strong></div><dl class="debt-metrics"><div><dt>Paid so far</dt><dd class="positive">R 500.00</dd></div><div><dt>Planned</dt><dd>R 1,000.00</dd></div><div><dt>After planned payments</dt><dd>R 8,500.00</dd></div></dl><section class="payment-section"><h3>Planned payments</h3><div class="payment-row"><div class="row-copy"><strong>R 1,000.00</strong><small>17 Nov 2026 <span class="payment-badge overdue">Overdue</span></small><small>Monthly instalment</small></div><div class="payment-actions"><button appButton class="secondary-action">Mark paid</button><button class="text-link">Edit</button><button class="text-link">Delete</button></div></div></section></article>
<p class="status error" role="alert">Example validation message. Check the amount and try again.</p>
<section class="panel budget-metric"><small>Planned spending money</small><strong class="positive">R 2,500.00</strong></section>`;
async function browserConnection() {
  const process = spawn(
    edge,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--disable-extensions',
      '--disable-background-networking',
      '--remote-debugging-port=0',
      '--user-data-dir=' + path.join(directory, 'browser-profile'),
      'about:blank',
    ],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] },
  );
  const endpoint = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Browser startup timed out')), 15000);
    let output = '';
    process.stderr.on('data', (data) => {
      output += data;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
    process.on('error', reject);
  });
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let sequence = 0;
  const responses = new Map();
  const events = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const pending = message.id
      ? responses.get(message.id)
      : events.get(message.sessionId + ':' + message.method);
    if (!pending) return;
    clearTimeout(pending.timeout);
    if (message.id) responses.delete(message.id);
    else events.delete(message.sessionId + ':' + message.method);
    if (message.error) pending.reject(new Error(message.error.message));
    else pending.resolve(message.result ?? message.params);
  });
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timeout = setTimeout(() => {
        responses.delete(id);
        reject(new Error(method + ' timed out'));
      }, 15000);
      responses.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  async function capture(file, width) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);
    await send(
      'Emulation.setDeviceMetricsOverride',
      { width, height: 1100, deviceScaleFactor: 1, mobile: false },
      sessionId,
    );
    const loaded = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Fixture load timed out')), 15000);
      events.set(sessionId + ':Page.loadEventFired', { resolve, reject, timeout });
    });
    await send('Page.navigate', { url: pathToFileURL(file).href }, sessionId);
    await loaded;
    await send(
      'Runtime.evaluate',
      {
        expression:
          'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
        awaitPromise: true,
      },
      sessionId,
    );
    const result = await send(
      'Runtime.evaluate',
      { expression: 'document.documentElement.outerHTML', returnByValue: true },
      sessionId,
    );
    const { cssContentSize } = await send('Page.getLayoutMetrics', {}, sessionId);
    const screenshot = await send(
      'Page.captureScreenshot',
      {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height: Math.max(1100, cssContentSize.height), scale: 1 },
      },
      sessionId,
    );
    await send('Target.closeTarget', { targetId });
    return { html: result.result.value, png: Buffer.from(screenshot.data, 'base64') };
  }
  return {
    capture,
    close: async () => {
      await send('Browser.close').catch(() => {});
      socket.close();
      process.kill();
    },
  };
}

(async () => {
  const connection = await browserConnection();
  const results = [];
  try {
    for (const width of [390, 1280])
      for (const dark of [false, true]) {
        const name = `${width}-${dark ? 'dark' : 'light'}`;
        const file = path.join(directory, name + '.html');
        fs.writeFileSync(
          file,
          `<!doctype html><html class="ion-ce ${dark ? 'dark' : ''}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${pathToFileURL(path.join(browser, globalCss))}"><style>${css}
html,body{height:auto;overflow:visible!important}body{margin:0;background:var(--background);color:var(--foreground);font-family:var(--font-sans)}ion-app.lifeos-app{display:block;position:static;height:auto;contain:none;overflow:visible!important}#metrics{display:none}.debt-card{padding:var(--budget-padding);margin-bottom:24px}.debt-card-heading{flex-wrap:wrap}.budget-metric strong{display:block;font-size:24px;margin-top:12px}
</style></head><body><ion-app class="lifeos-app hydrated"><div class="budget-screen"><main class="budget-page">${markup}</main></div></ion-app><pre id="metrics"></pre><script>
addEventListener('load',()=>requestAnimationFrame(()=>{
const input=document.querySelector('input');const button=document.querySelector('button[appButton]');const panel=document.querySelector('.panel');const error=document.querySelector('.error');
document.querySelector('#metrics').textContent=JSON.stringify({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,inputHeight:input.getBoundingClientRect().height,buttonHeight:button.getBoundingClientRect().height,panelRadius:getComputedStyle(panel).borderRadius,errorBackground:getComputedStyle(error).backgroundColor,pagePadding:getComputedStyle(document.querySelector('main')).paddingInlineStart,paymentDirection:getComputedStyle(document.querySelector('.payment-row')).flexDirection});
}));</script></body></html>`,
        );
        const { html, png } = await connection.capture(file, width);
        fs.writeFileSync(path.join(directory, name + '.png'), png);
        const match = html.match(/<pre id="metrics">([^<]+)<\/pre>/);
        if (!match) throw new Error('No preview measurements for ' + name);
        const metrics = JSON.parse(match[1]);
        if (
          metrics.width !== width ||
          metrics.overflow ||
          metrics.inputHeight < 48 ||
          metrics.buttonHeight < 44
        )
          throw new Error('Layout regression: ' + JSON.stringify(metrics));
        results.push({ name, ...metrics });
      }
    fs.writeFileSync(path.join(directory, 'measurements.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await connection.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
