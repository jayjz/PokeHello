const BaseMonitor = require('../classes/BaseMonitor');

class PokemonCenterMonitor extends BaseMonitor {
  constructor() {
    super({
      name: 'PokemonCenter',
      urls: process.env.PRODUCT_URLS 
        ? process.env.PRODUCT_URLS.split(',').map(u => u.trim())
        : ['https://www.pokemoncenter.com/product/290-10038'],
      checkInterval: parseInt(process.env.CHECK_INTERVAL) || 5000
    });
  }

  async checkStock() {
    if (!this.apiClient) {
      console.error(`[${this.name}] API client not initialized`);
      return;
    }

    for (const url of this.urls) {
      try {
        // Extract product ID from URL
        const productId = url.match(/product\/(\d+)/)?.[1];
        if (!productId) continue;

        // Hit Pokemon Center's API endpoint instead of scraping HTML
        const apiUrl = `https://www.pokemoncenter.com/api/products/${productId}`;
        
        const response = await this.apiClient(apiUrl, {
          timeout: { request: 10000 },
          retry: { limit: 2 }
        }).json();

        // Check inventory via API response
        const inStock = response?.availability?.inStock || false;
        const productName = response?.name || 'Unknown Product';
        const price = response?.price?.formatted || 'N/A';

        if (inStock) {
          console.log(`🔥 [${this.name}] IN STOCK: ${productName}`);
          
          await this.sendAlert({
            title: '🎯 POKEMON CENTER RESTOCK!',
            description: `**${productName}**\n💰 ${price}`,
            url: url,
            color: 0x00ff00,
            fields: [
              { name: 'Status', value: '✅ IN STOCK (API)', inline: true },
              { name: 'Method', value: 'Hybrid API', inline: true }
            ]
          });
        } else {
          console.log(`❌ [${this.name}] Out of stock: ${productName}`);
        }

        // Random delay
        await new Promise(r => setTimeout(r, Math.random() * 2000 + 1000));
        
      } catch (error) {
        if (error.response?.statusCode === 403 || error.response?.statusCode === 429) {
          console.log(`[${this.name}] Blocked, rotating...`);
          await this.rotateAndRecover(url);
        } else {
          console.error(`[${this.name}] Error:`, error.message);
        }
      }
    }
  }
}

if (require.main === module) {
  const monitor = new PokemonCenterMonitor();
  monitor.start();
  process.on('SIGINT', () => monitor.stop().then(() => process.exit(0)));
}

module.exports = PokemonCenterMonitor;