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

      // === CRITICAL: Detect DataDome / Captcha Block ===
      if (response?.url && response.url.includes('captcha-delivery.com')) {
        this.log('WARN', 'DataDome CAPTCHA detected - rotating session');
        await this.rotateAndRecover(url);
        await this.randomDelay(1500, 3500);
        continue;
      }

      // Debug real response
      this.log('DEBUG', `Raw API Response`, response);

      const productName = response?.name || response?.title || 'Unknown Product';
      const price = response?.price?.formatted || 'N/A';

      let inStock = false;
      if (response?.availability) {
        inStock = response.availability.inStock === true ||
                  response.availability.status === 'IN_STOCK' ||
                  (response.availability?.quantity > 0);
      } else if (response?.inventory) {
        inStock = response.inventory?.quantity > 0;
      } else if (response?.variants) {
        inStock = response.variants.some(v => v.inventory?.quantity > 0);
      }

      if (inStock) {
        this.log('SUCCESS', `IN STOCK: ${productName}`);
        await this.sendAlert({ /* ... */ });
      } else {
        this.log('INFO', `Out of stock: ${productName}`);
      }

      if (Date.now() - this.lastHarvest > this.harvestInterval) {
        await this.harvestSession(url);
        await this.initApiClient();
      }

      await this.randomDelay(800, 2200);

    } catch (error) {
      if (error.response?.statusCode === 403 || error.response?.statusCode === 429) {
        this.log('WARN', 'Blocked (403/429) - rotating');
        await this.rotateAndRecover(url);
      } else {
        this.log('ERROR', `Check failed`, error.message);
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
