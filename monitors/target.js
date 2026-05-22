const BaseMonitor = require('../classes/BaseMonitor');

class TargetMonitor extends BaseMonitor {
  constructor() {
    super({
      name: 'Target',
      urls: [
        'https://www.target.com/c/pokemon-trading-card-game/-/N-5xt43',
      ],
      checkInterval: 3000
    });
    this.sessionCookies = null;
  }

  async checkStock() {
    if (!this.context) {
      await this.initBrowser();
      // Load session cookies if available
      if (this.sessionCookies) {
        await this.context.addCookies(this.sessionCookies);
      }
    }

    const page = await this.context.newPage();
    
    // Intercept API calls to monitor fulfillment data
    await page.route('**/api/products/**', async route => {
      const response = await route.fetch();
      const json = await response.json().catch(() => null);
      
      if (json && this.checkFulfillmentApi(json)) {
        await this.handleApiStockFound(json, page.url());
      }
      
      await route.continue();
    });

    try {
      for (const url of this.urls) {
        await page.goto(url, { waitUntil: 'networkidle' });
        await this.randomDelay(2000, 3000);
        
        // Check for queue/waiting room
        const inQueue = await page.$('text=/queue|waiting room|please wait/i');
        if (inQueue) {
          console.log(`[${this.name}] In queue, holding session...`);
          await this.randomDelay(5000, 10000);
          continue;
        }
      }
    } catch (error) {
      console.error(`[${this.name}] Error:`, error.message);
    } finally {
      // Save cookies for next run
      this.sessionCookies = await this.context.cookies();
      await page.close();
    }
  }

  checkFulfillmentApi(data) {
    // Check Target's fulfillment API response for in-stock items
    // This is a simplified example - actual implementation would parse the API structure
    try {
      const items = data?.data?.product?.children || [];
      return items.some(item => 
        item?.fulfillment?.shipping_options?.availability_status === 'IN_STOCK'
      );
    } catch {
      return false;
    }
  }

  async handleApiStockFound(data, url) {
    console.log(`🔥 [${this.name}] API indicates STOCK!`);
    
    await this.sendAlert({
      title: '🎯 TARGET RESTOCK DETECTED!',
      description: 'API indicates items available - check site immediately',
      url: url,
      color: 0xff0000,
      fields: [
        { name: 'Status', value: '✅ API STOCK SIGNAL', inline: true },
        { name: 'Site', value: 'Target.com', inline: true }
      ]
    });
  }
}

if (require.main === module) {
  const monitor = new TargetMonitor();
  monitor.start();
  process.on('SIGINT', () => monitor.stop().then(() => process.exit(0)));
}

module.exports = TargetMonitor;