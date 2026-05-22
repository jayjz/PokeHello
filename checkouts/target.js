const CheckoutBase = require('../classes/CheckoutBase');

class TargetCheckout extends CheckoutBase {
  async addToCart(tcin, quantity = 1) {
    console.log(`🛒 Target add to cart: ${tcin}`);
    // Target uses RedSky API
    // POST to https://carts.target.com/web_checkouts/v1/cart_items
    return { success: false, message: 'Target checkout not yet implemented' };
  }

  async checkout() {
    return { success: false, message: 'Not implemented' };
  }
}

module.exports = TargetCheckout;