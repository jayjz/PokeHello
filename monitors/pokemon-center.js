require('dotenv').config();
const { chromium } = require('playwright');
const { sendDiscordAlert } = require('../utils/alerts');
const fs = require('fs');

// Support multiple URLs from env (comma-separated)
const PRODUCT_URLS = process.env.PRODUCT_URLS 
  ? process.env.PRODUCT_URLS.split(',').map(url => url.trim())
  : [
      'https://www.pokemoncenter.com/product/290-10038/pokemon-tcg-scarlet-violet-prismatic-evolutions-elite-trainer-box',
    ];

// Proxy rotation skeleton
const PROXIES = process.env.PROXY_LIST 
  ? process.env.PROXY_LIST.split(',').map(p => p.trim())
  : [];
let proxyIndex = 0;

function getNextProxy() {
  if (PROXIES.length === 0) return null;
  const proxy = PROXIES[proxyIndex];
  proxyIndex = (proxyIndex + 1) % PROXIES.length;
  return proxy;
}

// Random jitter to avoid detection
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function checkStock() {
  const proxy = getNextProxy();
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    proxy: proxy ? { server: proxy } : undefined
  });
  
  const context = await browser.newContext({
    userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    for (const url of PRODUCT_URLS) {
      console.log(`Checking: ${url}`);
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      
      // Wait for page to load
      await page.waitForTimeout(randomDelay(1000, 2000));
      
      // Improved selectors for Pokémon Center
      // Looking for Add to Cart button with multiple fallback selectors
      const addToCartSelectors = [
        'button[data-testid="add-to-cart-button"]',
        'button:has-text("Add to Cart")',
        'button.add-to-cart-button',
        '[data-automation="add-to-cart"]',
        'button:has-text("ADD TO CART")'
      ];
      
      let addToCartButton = null;
      for (const selector of addToCartSelectors) {
        addToCartButton = await page.$(selector);
        if (addToCartButton) break;
      }
      
      // Check for sold out indicators
      const soldOutSelectors = [
        'text=/sold out/i',
        'text=/out of stock/i',
        '[data-testid="sold-out"]',
        '.sold-out'
      ];
      
      let isSoldOut = false;
      for (const selector of soldOutSelectors) {
        const element = await page.$(selector);
        if (element) {
          isSoldOut = true;
          break;
        }
      }
      
      // Check if button is disabled
      const isDisabled = addToCartButton 
        ? await addToCartButton.isDisabled().catch(() => false)
        : true;
      
      if (addToCartButton && !isSoldOut && !isDisabled) {
        const productName = await page.$eval('h1', el => el.textContent.trim())
          .catch(() => 'Unknown Product');
        const price = await page.$eval('[data-testid="product-price"], .price, [class*="price"]', 
          el => el.textContent.trim()).catch(() => 'N/A');
        
        console.log(`🔥 IN STOCK: ${productName} - ${price}`);
        
        // Send Discord alert
        await sendDiscordAlert({
          title: '🎯 POKÉMON CENTER RESTOCK!',
          description: `**${productName}**\n💰 Price: ${price}\n🔗 [Buy Now](${url})`,
          url: url,
          color: 0x00ff00,
          fields: [
            { name: 'Status', value: '✅ IN STOCK', inline: true },
            { name: 'Site', value: 'Pokémon Center', inline: true }
          ]
        });
        
        // Take screenshot
        if (!fs.existsSync('screenshots')) {
          fs.mkdirSync('screenshots');
        }
        await page.screenshot({ 
          path: `screenshots/stock-${Date.now()}.png`,
          fullPage: false
        });
      } else {
        const productName = await page.$eval('h1', el => el.textContent.trim())
          .catch(() => 'Product');
        console.log(`❌ Out of stock: ${productName}`);
      }
      
      // Random delay between checks to avoid detection
      await page.waitForTimeout(randomDelay(2000, 4000));
    }
  } catch (error) {
    console.error('❌ Monitor error:', error.message);
  } finally {
    await browser.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down monitor...');
  process.exit(0);
});

console.log('🎯 PokeHello - Pokémon Center Monitor Starting...');
console.log(`📊 Monitoring ${PRODUCT_URLS.length} product(s)`);
console.log(`⏱️  Check interval: ${process.env.CHECK_INTERVAL || 5000}ms`);
console.log(`🔗 Discord alerts: ${process.env.DISCORD_WEBHOOK_URL ? 'ENABLED' : 'DISABLED'}`);
console.log('');

// Run immediately then on interval
checkStock();
const interval = setInterval(checkStock, parseInt(process.env.CHECK_INTERVAL) || 5000);

// Export for testing
module.exports = { checkStock };