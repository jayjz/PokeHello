class CheckoutBase {
  constructor(monitor, profile) {
    this.monitor = monitor;
    this.profile = profile;
    this.apiClient = monitor.apiClient;
  }

  async addToCart(productId, quantity = 1) {
    throw new Error('addToCart() must be implemented by subclass');
  }

  async checkout() {
    throw new Error('checkout() must be implemented by subclass');
  }

  async submitOrder() {
    throw new Error('submitOrder() must be implemented by subclass');
  }
}

module.exports = CheckoutBase;