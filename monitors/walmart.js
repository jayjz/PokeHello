const BaseMonitor = require('../classes/BaseMonitor');

class WalmartMonitor extends BaseMonitor {
  constructor() {
    super({
      name: 'Walmart',
      urls: [
        'https://www.walmart.com/browse/toys/pokemon-trading-cards/4171_4186_1107343',
      ],
      checkInterval: 4000
    });
  }

  async checkStock() {
    if (!this.context) {
      await this.initBrowser();
    }

    const page = await this.context.newPage();
    
    // Aggressive stealth for Walmart/DataDome
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });

    try {
      for (const url of this.urls) {
        const response = await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        // Check for bot detection
        if (response.status() === 403 || response.status() === 429) {
          console.log(`[${this.name}] Blocked (${response.status()}), rotating proxy...`);
          this.banProxy(this.context._proxy);
          await this.context.close();
          this.context = null;
          return;
        }

        // Check for CAPTCHA
        const captcha = await page.$('text=/captcha|verify you are human/i');
        if (captcha) {
          console.log(`[${this.name}] CAPTCHA detected, skipping...`);
          continue;
        }

        await this.randomDelay(2000, 3500);
        
        // Look for add to cart buttons
        const inStock = await page.$('button:has-text("Add to cart"):not([disabled])');
        
        if (inStock) {
          console.log(`🔥 [${this.name}] POTENTIAL STOCK FOUND`);
          
          await this.sendAlert({
            title: '🎯 WALMART STOCK ALERT',
            description: 'Add to cart button detected - verify manually',
            url: url,
            color: 0x0071ce,
            fields: [
              { name: 'Status', value: '⚠️ VERIFY MANUALLY', inline: true },
              { name: 'Site', value: 'Walmart.com', inline: true }
            ]
          });
        }
        
        await this.randomDelay(3000, 5000);
      }
    } catch (error) {
      console.error(`[${this.name}] Error:`, error.message);
    } finally {
      await page.close();
    }
  }
}

if (require.main === module) {
  const monitor = new WalmartMonitor();
  monitor.start();
  process.on('SIGINT', () => monitor.stop().then(() => process.exit(0)));
}

module.exports = WalmartMonitor;