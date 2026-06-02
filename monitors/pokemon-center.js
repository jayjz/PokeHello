const BaseMonitor = require('../classes/BaseMonitor');

class PokemonCenterMonitor extends BaseMonitor {
  constructor() {
    super({
      name: 'PokemonCenter',
      urls: process.env.PRODUCT_URLS
        ? process.env.PRODUCT_URLS.split(',').map(u => u.trim())
        : ['https://www.pokemoncenter.com/product/290-10038'],
      checkInterval: parseInt(process.env.CHECK_INTERVAL) || 8000
    });
  }

  async checkStock() {
    if (!this.apiClient) {
      this.log('ERROR', 'API client not initialized');
      return;
    }

    for (const url of this.urls) {
      try {
        const productId = url.match(/product\/(\d+)/)?.[1];
        if (!productId) continue;

        const apiUrl = `https://www.pokemoncenter.com/api/products/${productId}`;
        const response = await this.apiClient(apiUrl).json();

        // DEBUG: Log full response structure so we can improve detection
        this.log('DEBUG', `API Response for ${productId}`, response);

        const productName = response?.name || response?.title || 'Unknown Product';
        const price = response?.price?.formatted || response?.price || 'N/A';

        // Improved stock detection - Pokemon Center structures vary
        let inStock = false;
        if (response?.availability) {
          inStock = response.availability.inStock === true ||
                    response.availability.status === 'IN_STOCK' ||
                    response.availability?.quantity > 0;
        } else if (response?.inventory) {
          inStock = response.inventory?.quantity > 0 || response.inventory?.inStock === true;
        } else if (response?.variants) {
          inStock = response.variants.some(v => 
            v.inventory?.quantity > 0 || v.availability?.inStock === true
          );
        }

        if (inStock) {
          this.log('SUCCESS', `IN STOCK: ${productName}`);
          await this.sendAlert({
            title: '🎯 POKEMON CENTER RESTOCK!',
            description: `**${productName}**\n💰 ${price}`,
            url: url,
            color: 0x00ff00,
            fields: [
              { name: 'Status', value: '✅ IN STOCK', inline: true },
              { name: 'Method', value: 'Hybrid API', inline: true }
            ]
          });
        } else {
          this.log('INFO', `Out of stock: ${productName}`);
        }

        if (Date.now() - this.lastHarvest > this.harvestInterval) {
          await this.harvestSession(url);
          await this.initApiClient();
        }

        await this.randomDelay(600, 1800);
      } catch (error) {
        if (error.response?.statusCode === 403 || error.response?.statusCode === 429) {
          this.log('WARN', `Blocked (403/429)`);
          await this.rotateAndRecover(url);
        } else {
          this.log('ERROR', `Check failed`, error.message);
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
