require('dotenv').config();
const { chromium } = require('playwright');
const { sendDiscordAlert } = require('../utils/alerts');

const PRODUCT_URLS = [
  'https://www.pokemoncenter.com/product/290-10038/pokemon-tcg-scarlet-violet-prismatic-evolutions-elite-trainer-box',
  'https://www.pokemoncenter.com/category/tcg',
  // Add more URLs as needed
];

async function checkStock() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    for (const url of PRODUCT_URLS) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Check for Add to Cart button
      const addToCartButton = await page.$('button:has-text("Add to Cart"), button.add-to-cart, [data-testid="add-to-cart"]');
      const soldOutText = await page.$('text=/sold out|out of stock/i');
      
      if (addToCartButton && !soldOutText) {
        const productName = await page.$eval('h1', el => el.textContent).catch(() => 'Unknown Product');
        const price = await page.$eval('[class*="price"], .price', el => el.textContent).catch(() => 'N/A');
        
        console.log(`🔥 IN STOCK: ${productName} - ${price}`);
        
        // Send Discord alert
        await sendDiscordAlert({
          title: '🎯 POKÉMON CENTER RESTOCK',
          description: `**${productName}**\nPrice: ${price}`,
          url: url,
          color: 0x00ff00
        });
        
        // Take screenshot
        await page.screenshot({ path: `screenshots/${Date.now()}.png` });
      } else {
        console.log(`❌ Out of stock: ${url}`);
      }
      
      await page.waitForTimeout(2000); // Rate limiting
    }
  } catch (error) {
    console.error('Monitor error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run monitor
console.log('🎯 Starting Pokémon Center monitor...');
checkStock();
setInterval(checkStock, parseInt(process.env.CHECK_INTERVAL) || 5000);