const CheckoutBase = require('../classes/CheckoutBase');

class WalmartCheckout extends CheckoutBase {
  async addToCart(itemId, quantity = 1) {
    console.log(`🛒 Walmart add to cart: ${itemId}`);
    // Walmart uses specific cart API
    return { success: false, message: 'Walmart checkout not yet implemented' };
  }

  async checkout() {
    return { success: false, message: 'Not implemented' };
  }
}

module.exports = WalmartCheckout;