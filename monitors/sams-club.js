// monitors/sams-club.js
const BaseMonitor = require('../classes/BaseMonitor');

class SamsClubMonitor extends BaseMonitor {
  constructor() {
    super();
    this.siteName = 'SamsClub';
    this.baseUrl = 'https://www.samsclub.com';
    this.checkInterval = parseInt(process.env.SAMS_CHECK_INTERVAL) || 3000;
  }

  async detectStock(productUrl) {
    try {
      const productId = this.extractProductId(productUrl);
      if (!productId) throw new Error('Invalid Sams Club product URL');

      await this.initApiClient(); // Hybrid session harvest + got-scraping

      // Product details
      const productRes = await this.apiClient.get(`/api/node/v2/products/${productId}`).json();
      
      const name = productRes.product?.name || 'Unknown Product';
      const price = productRes.product?.price?.currentPrice || 0;
      const inStock = productRes.product?.inventory?.inStock || false;
      const quantity = productRes.product?.inventory?.quantity || 0;

      // Fulfillment check (critical for Sam's)
      const fulfillmentRes = await this.apiClient.get(
        `/api/node/v3/fulfillment/${productId}?clubId=${process.env.SAMS_CLUB_ID}&zipCode=${process.env.SAMS_ZIP}`
      ).json();

      const canShip = fulfillmentRes?.shipping?.available || false;
      const canPickup = fulfillmentRes?.pickup?.available || false;

      const isAvailable = inStock && (canShip || canPickup) && quantity > 0;

      if (isAvailable) {
        this.logger.info(`✅ Sam's Club stock found: ${name}`);
        await this.handleStockFound({
          site: 'SamsClub',
          name,
          price,
          url: productUrl,
          quantity,
          fulfillment: { canShip, canPickup }
        });
      }

      return isAvailable;
    } catch (error) {
      this.logger.error(`Sams Club monitor error: ${error.message}`);
      return false;
    }
  }

  extractProductId(url) {
    const match = url.match(/\/(\d+)/);
    return match ? match[1] : null;
  }
}

module.exports = SamsClubMonitor;