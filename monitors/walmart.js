const BaseMonitor = require('../classes/BaseMonitor');

class WalmartMonitor extends BaseMonitor {
  constructor() {
    super({
      name: 'Walmart',
      urls: process.env.WALMART_URLS 
        ? process.env.WALMART_URLS.split(',').map(u => u.trim())
        : ['https://www.walmart.com/ip/12345678'],
      checkInterval: parseInt(process.env.CHECK_INTERVAL) || 4000
    });
  }

  async checkStock() {
    if (!this.apiClient) {
      console.error(`[${this.name}] API client not initialized`);
      return;
    }

    for (const url of this.urls) {
      try {
        // Extract item ID from URL
        const itemId = url.match(/\/ip\/(\d+)/)?.[1];
        if (!itemId) {
          console.log(`[${this.name}] Could not extract item ID from ${url}`);
          continue;
        }

        // Walmart API endpoint
        const apiUrl = `https://www.walmart.com/api/v3/items/${itemId}`;
        
        const response = await this.apiClient(apiUrl, {
          timeout: { request: 10000 },
          retry: { limit: 2 },
          headers: {
            'Accept': 'application/json',
            'WM_SEC.ACCESS_TOKEN': process.env.WALMART_TOKEN || '',
            'Referer': 'https://www.walmart.com/'
          }
        }).json();

        // Parse Walmart API response
        const product = response?.product;
        const buyBox = product?.buyBox;
        
        const inStock = buyBox?.products?.[0]?.availabilityStatus === 'IN_STOCK' ||
                       product?.availabilityStatus === 'IN_STOCK';
        
        const productName = product?.name || 'Walmart Product';
        const price = buyBox?.products?.[0]?.priceMap?.price?.toString() || 'N/A';

        if (inStock) {
          console.log(`🔥 [${this.name}] IN STOCK: ${productName}`);
          
          await this.sendAlert({
            title: '🎯 WALMART RESTOCK!',
            description: `**${productName}**\n💰 $${price}`,
            url: url,
            color: 0x0071ce,
            fields: [
              { name: 'Status', value: '✅ IN STOCK (API)', inline: true },
              { name: 'Method', value: 'Hybrid API', inline: true }
            ]
          });
        } else {
          console.log(`❌ [${this.name}] Out of stock: ${productName}`);
        }

        await new Promise(r => setTimeout(r, Math.random() * 2000 + 1500));
        
      } catch (error) {
        if (error.response?.statusCode === 403 || error.response?.statusCode === 429) {
          console.log(`[${this.name}] Blocked by DataDome, rotating...`);
          await this.rotateAndRecover(url);
        } else {
          console.error(`[${this.name}] Error:`, error.message);
        }
      }
    }
  }
}

if (require.main === module) {
  const monitor = new WalmartMonitor();
  monitor.start();
  process.on('SIGINT', () => monitor.stop().then(() => process.exit(0)));
}

module.exports = WalmartMonitor;