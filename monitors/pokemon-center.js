require('dotenv').config();
const { chromium } = require('playwright');

const POKEMON_CENTER_URLS = [
  'https://www.pokemoncenter.com/category/tcg',
  // Add specific product URLs here
];

async function checkStock() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    for (const url of POKEMON_CENTER_URLS) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      // TODO: Implement stock detection logic
      console.log(`Checked: ${url}`);
    }
  } catch (error) {
    console.error('Monitor error:', error);
  } finally {
    await browser.close();
  }
}

// Run immediately then on interval
checkStock();
setInterval(checkStock, parseInt(process.env.CHECK_INTERVAL) || 5000);