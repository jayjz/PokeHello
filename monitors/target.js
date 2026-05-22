const BaseMonitor = require('../classes/BaseMonitor');

class TargetMonitor extends BaseMonitor {
  constructor() {
    super({
      name: 'Target',
      urls: process.env.TARGET_URLS 
        ? process.env.TARGET_URLS.split(',').map(u => u.trim())
        : ['https://www.target.com/p/pokemon-tcg/-/A-10007885'],
      checkInterval: parseInt(process.env.CHECK_INTERVAL) || 3000
    });
  }

  async checkStock() {
    if (!this.apiClient) {
      console.error(`[${this.name}] API client not initialized`);
      return;
    }

    for (const url of this.urls) {
      try {
        // Extract TCIN from URL
        const tcin = url.match(/\/A-(\d+)/)?.[1] || url.match(/A-(\d+)/)?.[1];
        if (!tcin) {
          console.log(`[${this.name}] Could not extract TCIN from ${url}`);
          continue;
        }

        // Target API endpoint (RedSky API)
        const apiUrl = `https://redsky.target.com/redsky_aggregations/v1/web/pdp_client_v1?key=ff457966e64d5e877fdbad070f276d18ecec4a01&tcin=${tcin}`;
        
        const response = await this.apiClient(apiUrl, {
          timeout: { request: 10000 },
          retry: { limit: 2 },
          headers: {
            'Accept': 'application/json',
            'Referer': 'https://www.target.com/'
          }
        }).json();

        // Parse Target API response
        const product = response?.data?.product;
        const fulfillment = product?.fulfillment;
        
        const inStock = fulfillment?.shipping_options?.availability_status === 'IN_STOCK' ||
                       fulfillment?.pickup_options?.[0]?.availability_status === 'IN_STOCK';
        
        const productName = product?.item?.product_description?.title || 'Target Product';
        const price = product?.price?.formatted_current_price || 'N/A';

        if (inStock) {
          console.log(`🔥 [${this.name}] IN STOCK: ${productName}`);
          
          await this.sendAlert({
            title: '🎯 TARGET RESTOCK!',
            description: `**${productName}**\n💰 ${price}`,
            url: url,
            color: 0xff0000,
            fields: [
              { name: 'Status', value: '✅ IN STOCK (API)', inline: true },
              { name: 'TCIN', value: tcin, inline: true }
            ]
          });
        } else {
          console.log(`❌ [${this.name}] Out of stock: ${productName}`);
        }

        await new Promise(r => setTimeout(r, Math.random() * 2000 + 1000));
        
      } catch (error) {
        if (error.response?.statusCode === 403 || error.response?.statusCode === 429 || error.response?.statusCode === 403) {
          console.log(`[${this.name}] Blocked (Akamai), rotating...`);
          await this.rotateAndRecover(url);
        } else {
          console.error(`[${this.name}] Error:`, error.message);
        }
      }
    }
  }
}

if (require.main === module) {
  const monitor = new TargetMonitor();
  monitor.start();
  process.on('SIGINT', () => monitor.stop().then(() => process.exit(0)));
}

module.exports = TargetMonitor;