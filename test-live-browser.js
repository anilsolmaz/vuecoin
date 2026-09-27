const puppeteer = require('puppeteer-core');
const path = require('path');

async function testLive() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]`, msg.text());
  });

  page.on('pageerror', err => {
    console.error(`[PAGE ERROR]`, err.message);
  });

  console.log('Navigating to https://anilsolmaz.com/ ...');
  await page.goto('https://anilsolmaz.com/', { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Waiting 5 seconds for WebSocket & rendering...');
  await new Promise(r => setTimeout(r, 5000));

  const pageTitle = await page.title();
  console.log('Page Title:', pageTitle);

  const evaluation = await page.evaluate(() => {
    const appVersionEl = document.querySelector('.app-version-badge');
    const versionText = appVersionEl ? appVersionEl.innerText : 'not found';

    const topDealsBoxes = Array.from(document.querySelectorAll('.top-deal-box')).map(el => {
      const b = el.querySelector('b');
      return b ? b.innerText : 'unknown';
    });

    const scanningTextEl = Array.from(document.querySelectorAll('div')).find(d => d.innerText && d.innerText.includes('Scanning markets for active'));
    const scanningText = scanningTextEl ? scanningTextEl.innerText.trim() : null;

    const allMarketBoxes = Array.from(document.querySelectorAll('.all-market-box')).map(el => {
      const b = el.querySelector('b');
      return b ? b.innerText : 'unknown';
    });

    return {
      versionText,
      topDealsCount: topDealsBoxes.length,
      topDeals: topDealsBoxes,
      scanningText,
      allMarketsCount: allMarketBoxes.length,
      first5AllMarkets: allMarketBoxes.slice(0, 5)
    };
  });

  console.log('--- PAGE EVALUATION RESULT ---');
  console.log(JSON.stringify(evaluation, null, 2));

  const screenshotPath = path.join(__dirname, 'live-screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to', screenshotPath);

  await browser.close();
}

testLive().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
