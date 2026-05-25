const BaseMonitor = require('../classes/BaseMonitor');

class SamsClubMonitor extends BaseMonitor {
  constructor() {
    super({
      name: 'SamsClub',
      urls: process.env.SAMS_URLS 
        ? process.env.SAMS_URLS.split(',').map(u => u.trim())
        : [],
      checkInterval: parseInt(process.env.SAMS_CHECK_INTERVAL) || 3000
    });
    this.clubId = process.env.SAMS_CLUB_ID || '6684'; // Default club ID
  }

  async checkStock() {
    if (!this.apiClient) {
      console.error(`[${this.name}] API client not initialized`);
      return;
    }

    for (const url of this.urls) {
      try {
        // Extract product ID from Sam's Club URL
        // Format: https://www.samsclub.com/p/[product-name]/[productId]
        const productIdMatch = url.match(/\/p\/[^\/]+\/(\d+)/) || url.match(/productId=(\d+)/);
        const productId = productIdMatch?.[1];
        
        if (!productId) {
          console.warn(`[${this.name}] Could not extract product ID from: ${url}`);
          continue;
        }

        // Sam's Club uses multiple API endpoints for product data
        // Primary: Catalog service for product details
        const catalogUrl = `https://www.samsclub.com/api/node/v2/products/${productId}`;
        
        // Use got-scraping with stealth headers
        const response = await this.apiClient(catalogUrl, {
          headers: {
            ...this.sessionHeaders,
            'accept': 'application/json',
            'accept-language': 'en-US,en;q=0.9',
            'dnt': '1',
            'sec-ch-ua': '"Chromium";v="120", "Not_A Brand";v="8"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'referer': url,
            'x-requested-with': 'XMLHttpRequest'
          },
          timeout: { request: 10000 },
          retry: { limit: 2 }
        }).json();

        // Parse stock status from response
        // Sam's Club structure: response.payload.inventory or response.online
        const product = response?.payload || response;
        const inventory = product?.inventory || {};
        const onlineInventory = inventory?.online || {};
        const inStock = onlineInventory?.inventoryStatus === 'IN_STOCK' || 
                       onlineInventory?.availableQuantity > 0 ||
                       product?.availability?.status === 'Available';
        
        const productName = product?.name || product?.productName || 'Unknown Product';
        const price = product?.price?.sellingPrice || product?.priceInfo?.currentPrice || 'N/A';
        const availableQty = onlineInventory?.availableQuantity || 0;

        if (inStock) {
          console.log(`🔥 [${this.name}] IN STOCK: ${productName} - Qty: ${availableQty}`);
          
          await this.sendAlert({
            title: '🎯 SAM\'S CLUB RESTOCK!',
            description: `**${productName}**\n💰 $${price}\n📦 Available: ${availableQty}`,
            url: url,
            color: 0x00ff00,
            fields: [
              { name: 'Status', value: '✅ IN STOCK', inline: true },
              { name: 'Quantity', value: `${availableQty}`, inline: true },
              { name: 'Club ID', value: this.clubId, inline: true },
              { name: 'Method', value: 'API Direct', inline: true }
            ]
          });

          // Also check fulfillment API for pickup availability
          await this.checkFulfillment(productId);
          
        } else {
          console.log(`❌ [${this.name}] Out of stock: ${productName}`);
        }

        // Random delay with jitter (2-4 seconds for Sam's Club)
        await new Promise(r => setTimeout(r, Math.random() * 2000 + 2000));
        
      } catch (error) {
        if (error.response?.statusCode === 403 || error.response?.statusCode === 429) {
          const proxy = this.getNextProxy();
          if (proxy) {
            this.banProxy(proxy);
            console.log(`🔄 [${this.name}] Rotating proxy due to ${error.response.statusCode}`);
          }
        }
        
        // Check for specific Sam's Club errors
        if (error.response?.statusCode === 404) {
          console.error(`[${this.name}] Product not found: ${url}`);
        } else if (error.code === 'ETIMEDOUT') {
          console.error(`[${this.name}] Timeout checking: ${url}`);
        } else {
          console.error(`[${this.name}] Error checking ${url}:`, error.message);
        }
      }
    }
  }

  async checkFulfillment(productId) {
    try {
      // Check store pickup availability
      // Sam's Club fulfillment API
      const fulfillmentUrl = `https://www.samsclub.com/api/node/v3/fulfillment/${productId}?clubId=${this.clubId}&zipCode=${process.env.SAMS_ZIP || '10001'}`;
      
      const response = await this.apiClient(fulfillmentUrl, {
        headers: this.sessionHeaders,
        timeout: { request: 8000 }
      }).json();

      const pickupAvailable = response?.pickup?.available || false;
      const shipAvailable = response?.ship?.available || false;

      if (pickupAvailable || shipAvailable) {
        console.log(`📍 [${this.name}] Fulfillment - Pickup: ${pickupAvailable}, Ship: ${shipAvailable}`);
      }
      
      return { pickupAvailable, shipAvailable };
    } catch (error) {
      // Fulfillment check is optional, don't fail monitor if it errors
      return null;
    }
  }

  async harvestSession(targetUrl) {
    // Override to use Sam's Club specific session harvesting
    await super.harvestSession(targetUrl || 'https://www.samsclub.com/');
    
    // Sam's Club requires additional headers for API access
    this.sessionHeaders = {
      ...this.sessionHeaders,
      'x-sc-client-id': 'web',
      'x-sc-client-version': '1.0.0',
      'x-sc-correlation-id': Math.random().toString(36).substring(7)
    };
  }
}

module.exports = SamsClubMonitor;