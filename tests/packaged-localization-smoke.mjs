import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const port = process.env.WAKELENS_DEBUG_PORT ?? '9337';
const baseUrl = `http://127.0.0.1:${port}`;

const targets = await fetch(`${baseUrl}/json`).then((response) => response.json());
const page = targets.find((target) => target.type === 'page');

if (!page) {
  throw new Error(`WakeLens page target was not found on ${baseUrl}`);
}

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 1;

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }
    }, 30_000);

    pending.set(id, {
      method,
      resolve: (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      }
    });
  });
}

socket.addEventListener('message', (event) => {
  const payload = JSON.parse(event.data);

  if (!payload.id || !pending.has(payload.id)) return;

  const item = pending.get(payload.id);
  pending.delete(payload.id);

  if (payload.error) {
    item.reject(new Error(`${item.method}: ${payload.error.message}`));
    return;
  }

  item.resolve(payload.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1280,
  height: 820,
  deviceScaleFactor: 1,
  mobile: false
});

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? 'Runtime exception');
  }

  return result.result.value;
}

async function setLanguage(locale) {
  return evaluate(`(async () => {
    const select = document.querySelector('.language-picker select');
    if (!select) throw new Error('language select not found');
    select.value = ${JSON.stringify(locale)};
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      text: document.body.innerText
    };
  })()`);
}

async function capture(name) {
  const image = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false
  });
  const path = join(process.cwd(), 'docs', 'assets', name);
  writeFileSync(path, Buffer.from(image.data, 'base64'));
  return path;
}

const russian = await setLanguage('ru');
if (russian.lang !== 'ru' || russian.dir !== 'ltr' || !russian.text.includes('Узнайте, почему этот ПК проснулся')) {
  throw new Error(`Russian localization check failed: ${JSON.stringify({
    lang: russian.lang,
    dir: russian.dir,
    hasTitle: russian.text.includes('Узнайте, почему этот ПК проснулся')
  })}`);
}
const russianEmptyScreenshot = await capture('wakelens-v030-dashboard-ru.png');

const afterScan = await evaluate(`(async () => {
  const button = document.querySelector('.topbar .command-button');
  if (!button) throw new Error('scan button not found');
  button.click();
  const start = Date.now();
  while (Date.now() - start < 25_000) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const text = document.body.innerText;
    if (!text.includes('Сканирование...') && (text.includes('Сканировать снова') || text.includes('Экспорт Markdown'))) {
      return {
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        text
      };
    }
  }
  throw new Error('scan did not finish in time');
})()`);

if (!afterScan.text.includes('Сканировать снова') || !afterScan.text.includes('Что проверил WakeLens')) {
  throw new Error('Russian scan result did not render expected localized dashboard text');
}
const russianScanScreenshot = await capture('wakelens-v030-scan-ru.png');

const arabic = await setLanguage('ar');
if (arabic.lang !== 'ar' || arabic.dir !== 'rtl' || !arabic.text.includes('اعرف سبب استيقاظ هذا الكمبيوتر')) {
  throw new Error(`Arabic localization check failed: ${JSON.stringify({
    lang: arabic.lang,
    dir: arabic.dir,
    hasTitle: arabic.text.includes('اعرف سبب استيقاظ هذا الكمبيوتر')
  })}`);
}
const arabicScreenshot = await capture('wakelens-v030-dashboard-ar.png');

const spanish = await setLanguage('es');
if (spanish.lang !== 'es' || spanish.dir !== 'ltr' || !spanish.text.includes('Descubre por qué se despertó este PC')) {
  throw new Error('Spanish localization check failed');
}
const spanishScreenshot = await capture('wakelens-v030-dashboard-es.png');

const chinese = await setLanguage('zh-Hans');
if (chinese.lang !== 'zh-Hans' || chinese.dir !== 'ltr' || !chinese.text.includes('找出这台电脑为何被唤醒')) {
  throw new Error('Simplified Chinese localization check failed');
}
const chineseScreenshot = await capture('wakelens-v030-dashboard-zh-Hans.png');

const hindi = await setLanguage('hi');
if (hindi.lang !== 'hi' || hindi.dir !== 'ltr' || !hindi.text.includes('जानें कि यह पीसी क्यों जागा')) {
  throw new Error('Hindi localization check failed');
}
const hindiScreenshot = await capture('wakelens-v030-dashboard-hi.png');

const english = await setLanguage('en');
if (english.lang !== 'en' || english.dir !== 'ltr' || !english.text.includes('Find out why this PC woke up')) {
  throw new Error('English localization check failed');
}
const englishScreenshot = await capture('wakelens-v030-dashboard-en.png');

const apiAvailable = await evaluate('Boolean(window.wakeLens?.scan && window.wakeLens?.exportReport && window.wakeLens?.history)');
if (!apiAvailable) {
  throw new Error('WakeLens preload API is unavailable');
}

socket.close();

console.log(JSON.stringify({
  apiAvailable,
  russianEmptyScreenshot,
  russianScanScreenshot,
  arabicScreenshot,
  spanishScreenshot,
  chineseScreenshot,
  hindiScreenshot,
  englishScreenshot
}, null, 2));
