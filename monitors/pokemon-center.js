const BaseMonitor = require('../classes/BaseMonitor');

class PokemonCenterMonitor extends BaseMonitor {
  constructor() {
    super({
      name: 'PokemonCenter',
      urls: process.env.PRODUCT_URLS 
        ? process.env.PRODUCT_URLS.split(',').map(u => u.trim())
        : ['https://www.pokemoncenter.com/category/tcg'],
      checkInterval: parseInt(process.env.CHECK_INTERVAL) || 5000
    });
  }

  async checkStock() {
    if (!this.context) {
      await this.initBrowser();
    }

    const page = await this.context.newPage();
    
    try {
      for (const url of this.urls) {
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        
        await this.randomDelay(1000, 2000);
        
        // Check stock using inherited methods
        const inStock = await this.detectStock(page);
        
        if (inStock) {
          await this.handleStockFound(page, url);
        }
        
        await this.randomDelay(2000, 4000);
      }
    } catch (error) {
      if (error.message.includes('403') || error.message.includes('429')) {
        this.banProxy(this.context._proxy);
      }
      console.error(`[${this.name}] Error:`, error.message);
    } finally {
      await page.close();
    }
  }

  async detectStock(page) {
    const selectors = [
      'button[data-testid="add-to-cart-button"]:not([disabled])',
      'button:has-text("Add to Cart"):not([disabled])',
      'button.add-to-cart-button:not([disabled])'
    ];
    
    for (const selector of selectors) {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await element.isVisible().catch(() => false);
        const isEnabled = await element.isEnabled().catch(() => false);
        if (isVisible && isEnabled) return true;
      }
    }
    return false;
  }

  async handleStockFound(page, url) {
    const productName = await page.$eval('h1', el => el.textContent.trim())
      .catch(() => 'Pokémon Product');
    const price = await page.$eval('[data-testid="product-price"]', el => el.textContent.trim())
      .catch(() => 'N/A');

    console.log(`🔥 [${this.name}] IN STOCK: ${productName}`);

    await this.sendAlert({
      title: '🎯 POKÉMON CENTER RESTOCK!',
      description: `**${productName}**\n💰 ${price}`,
      url: url,
      color: 0x00ff00,
      fields: [
        { name: 'Status', value: '✅ IN STOCK', inline: true },
        { name: 'Site', value: 'Pokémon Center', inline: true }
      ]
    });
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new PokemonCenterMonitor();
  monitor.start();
  
  process.on('SIGINT', () => {
    monitor.stop().then(() => process.exit(0));
  });
}

module.exports = PokemonCenterMonitor;