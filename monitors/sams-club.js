const BaseMonitor = require('../classes/BaseMonitor');

class SamsClubMonitor extends BaseMonitor {
  constructor() {
    super({
      name: 'SamsClub',
      urls: process.env.SAMS_URLS
        ? process.env.SAMS_URLS.split(',').map(u => u.trim())
        : ['https://www.samsclub.com/p/pokemon-tcg-scarlet-violet-prismatic-evolutions-super-premium-collection/XXXXXXX'],
      checkInterval: parseInt(process.env.SAMS_CHECK_INTERVAL) || 4000
    });

    this.clubId = process.env.SAMS_CLUB_ID || '6684';
    this.zipCode = process.env.SAMS_ZIP || '10001';
    this.membershipNumber = process.env.SAMS_MEMBERSHIP_NUMBER;
  }

  async checkStock() {
    if (!this.apiClient) {
      this.log('ERROR', 'API client not initialized');
      return;
    }

    for (const url of this.urls) {
      try {
        const productId = url.match(/\/(\d+)/)?.[1] || url.split('/').pop();
        if (!productId) continue;

        // Sam's Club uses different API endpoints
        const apiUrl = `https://www.samsclub.com/api/node/v1/products/${productId}?clubId=${this.clubId}&zipCode=${this.zipCode}`;

        const response = await this.apiClient(apiUrl).json();

        // Debug response
        this.log('DEBUG', `Sam\'s API Response for ${productId}`, response);

        const productName = response?.data?.productName || response?.name || 'Unknown Product';
        const price = response?.data?.price?.currentPrice?.amount || 'N/A';

        let inStock = false;

        // Sam's Club inventory logic
        if (response?.data?.inventory) {
          inStock = response.data.inventory.status === 'IN_STOCK' ||
                    response.data.inventory.quantity > 0 ||
                    response.data.fulfillmentOptions?.some(opt => opt.available);
        }

        if (inStock) {
          this.log('SUCCESS', `IN STOCK: ${productName}`);
          await this.sendAlert({
            title: '🎯 SAM\'S CLUB RESTOCK!',
            description: `**${productName}**\n💰 $${price}`,
            url: url,
            color: 0x00ff00,
            fields: [
              { name: 'Status', value: '✅ IN STOCK', inline: true },
              { name: 'Method', value: 'Sam\'s Club API', inline: true }
            ]
          });
        } else {
          this.log('INFO', `Out of stock: ${productName}`);
        }

        await this.randomDelay(800, 2200);

      } catch (error) {
        if (error.response?.statusCode === 403 || error.response?.statusCode === 429) {
          this.log('WARN', 'Blocked - rotating session');
          await this.rotateAndRecover(url);
        } else {
          this.log('ERROR', `Check failed`, error.message);
        }
      }
    }
  }
}

if (require.main === module) {
  const monitor = new SamsClubMonitor();
  monitor.start();
  process.on('SIGINT', () => monitor.stop().then(() => process.exit(0)));
}

module.exports = SamsClubMonitor;
