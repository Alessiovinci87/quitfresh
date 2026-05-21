// Genera gli screenshot dell'app per la landing (quitfresh.com).
// Apre l'app in headless Chromium, login come demo user, naviga e scatta
// 5 screen iPhone 15 Pro (393x852 @ 3x) salvati in client/landing/screens/.
//
// Pre-requisito: account demo seedato (server: npm run seed:demo).
//
// Uso:
//   DEMO_EMAIL=demo@quitfresh.it DEMO_PASSWORD=... npm run screenshots
//
// Variabili opzionali:
//   BASE_URL=https://quitfresh.it (default)
//
// Esce con codice 1 se uno qualsiasi degli screenshot fallisce.

import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../client/landing/screens');

const BASE_URL = process.env.BASE_URL || 'https://quitfresh.it';
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@quitfresh.it';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

if (!DEMO_PASSWORD) {
  console.error('FATAL: DEMO_PASSWORD mancante. Esempio:');
  console.error('  DEMO_PASSWORD=quitfresh-demo-2026 npm run screenshots');
  process.exit(1);
}

// iPhone 15 Pro logical viewport, deviceScaleFactor 3 = PNG 1179x2556 nitide.
const VIEWPORT = { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

async function waitForReact(page) {
  // Lascia tempo al SplashScreen (1.8s) + primo render.
  await page.waitForFunction(() => !!document.querySelector('#root *'), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2200));
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await waitForReact(page);
  await page.type('input[type="email"]', DEMO_EMAIL);
  await page.type('input[type="password"]', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  await waitForReact(page);
}

async function shot(page, name) {
  const path = resolve(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, type: 'png', omitBackground: false });
  console.log(`  ✓ ${name}.png`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: VIEWPORT,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  try {
    console.log(`Login come ${DEMO_EMAIL} su ${BASE_URL}…`);
    await login(page);

    // 1. HOME — contatore giorni + soldi risparmiati
    console.log('1/5 Home…');
    await page.goto(`${BASE_URL}/home`, { waitUntil: 'networkidle0' });
    await waitForReact(page);
    await shot(page, '1-home');

    // 2. SOS Craving — flow step 4 (timer + benefici live).
    // Strategia: vai su /sos, click step1 cta, click "Sono pronto", clicca azione "Respiro".
    console.log('2/5 SOS Craving (timer)…');
    await page.goto(`${BASE_URL}/sos`, { waitUntil: 'networkidle0' });
    await waitForReact(page);
    // Step 1 → click "Vai avanti"
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => /vai avanti/i.test(b.textContent));
      btn?.click();
    });
    await new Promise(r => setTimeout(r, 500));
    // Step 2 → "Sono pronto"
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => /sono pronto/i.test(b.textContent));
      btn?.click();
    });
    await new Promise(r => setTimeout(r, 500));
    // Step 3 → click sulla card "Respiro profondo"
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => /respiro profondo/i.test(b.textContent));
      btn?.click();
    });
    await new Promise(r => setTimeout(r, 3500)); // lascia partire timer + 3s elapsed
    await shot(page, '2-sos');

    // 3. CRAVING CHAT — DOM mock: navighiamo a /craving, aspettiamo il primo
    // messaggio AI auto-fired, poi iniettiamo manualmente bubble extra.
    console.log('3/5 Craving chat (DOM mock)…');
    await page.goto(`${BASE_URL}/craving`, { waitUntil: 'networkidle0' });
    await waitForReact(page);
    // attendi che il primo messaggio AI sia visibile (esce dal TypingDots)
    await page.waitForFunction(
      () => !!document.querySelector('.bg-white.text-sage-900'),
      { timeout: 20000 }
    ).catch(() => {});
    await new Promise(r => setTimeout(r, 800));
    // Inject extra messages right before screenshot (React non rerenders senza state change).
    await page.evaluate(() => {
      const container = document.querySelector('.space-y-3');
      if (!container) return;
      const userMsg = document.createElement('div');
      userMsg.className = 'flex justify-end';
      userMsg.innerHTML = '<div class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-soft bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-br-md">Sto cedendo, ho voglia di una sigaretta dopo pranzo</div>';
      const aiMsg = document.createElement('div');
      aiMsg.className = 'flex justify-start';
      aiMsg.innerHTML = '<div class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-soft bg-white text-sage-900 rounded-bl-md border border-sage-100/60">Ti capisco, dopo i pasti il cervello cerca quella pausa abituale. Prova questo: alzati ora, vai al lavandino e bevi due bicchieri d\'acqua fredda lentamente. Sono 60 secondi che spezzano il segnale. Poi torna e dimmi com\'è andata.</div>';
      container.insertBefore(userMsg, container.lastElementChild);
      container.insertBefore(aiMsg, container.lastElementChild);
      container.lastElementChild?.scrollIntoView({ behavior: 'instant', block: 'end' });
    });
    await new Promise(r => setTimeout(r, 400));
    await shot(page, '3-chat');

    // 4. CITISINA — Profilo > Gestione abitudini, scroll alla sezione protocollo.
    // In alternativa diretta: la home Tools potrebbe mostrare il next dose.
    console.log('4/5 Citisina schedule…');
    await page.goto(`${BASE_URL}/tools`, { waitUntil: 'networkidle0' });
    await waitForReact(page);
    await shot(page, '4-citisina');

    // 5. STATS — visualizzazione benefici / craving battuti.
    console.log('5/5 Stats…');
    await page.goto(`${BASE_URL}/stats`, { waitUntil: 'networkidle0' });
    await waitForReact(page);
    await shot(page, '5-stats');

    console.log(`\nFatto. Screenshot salvati in: ${OUT_DIR}`);
  } catch (err) {
    console.error('FAIL:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
