const { chromium } = require('playwright');
const { sendDiscordAlert } = require('../utils/alerts');

class BaseMonitor {
  constructor(options = {}) {
    this.name = options.name || 'BaseMonitor';
    this.urls = options.urls || [];
    this.checkInterval = options.checkInterval || 5000;
    this.proxies = process.env.PROXY_LIST 
      ? process.env.PROXY_LIST.split(',').map(p => p.trim()).filter(Boolean)
      : [];
    this.proxyIndex = 0;
    this.bannedProxies = new Set();
    this.browser = null;
    this.context = null;
  }

  // Proxy rotation with ban support
  getNextProxy() {
    if (this.proxies.length === 0) return null;
    
    let attempts = 0;
    while (attempts < this.proxies.length) {
      const proxy = this.proxies[this.proxyIndex];
      this.proxyIndex = (this.proxyIndex + 1) % this.proxies.length;
      
      if (!this.bannedProxies.has(proxy)) {
        return proxy;
      }
      attempts++;
    }
    return null; // All proxies banned
  }

  banProxy(proxy) {
    if (proxy) {
      this.bannedProxies.add(proxy);
      console.log(`🚫 Banned proxy: ${proxy}`);
    }
  }

  // Stealth browser initialization
  async initBrowser() {
    const proxy = this.getNextProxy();
    
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
      ],
      proxy: proxy ? { server: proxy } : undefined,
    });

    this.context = await this.browser.newContext({
      userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      // Stealth settings
      javaScriptEnabled: true,
      bypassCSP: true,
    });

    // Add stealth evasions
    await this.context.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

    return this.context;
  }

  // Discord alert dispatcher
  async sendAlert(data) {
    await sendDiscordAlert({
      title: data.title || `${this.name} Alert`,
      description: data.description,
      url: data.url,
      color: data.color || 0x0099ff,
      fields: data.fields || []
    });
  }

  // Random delay with jitter
  async randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Abstract method - must be implemented by subclasses
  async checkStock() {
    throw new Error('checkStock() must be implemented by subclass');
  }

  // Start monitoring loop
  async start() {
    console.log(`🎯 ${this.name} monitor starting...`);
    console.log(`📊 Monitoring ${this.urls.length} URL(s)`);
    
    // Initial check
    await this.checkStock().catch(console.error);
    
    // Set up interval
    this.interval = setInterval(() => {
      this.checkStock().catch(console.error);
    }, this.checkInterval);
  }

  // Stop monitoring
  async stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    if (this.browser) {
      await this.browser.close();
    }
    console.log(`👋 ${this.name} monitor stopped`);
  }
}

module.exports = BaseMonitor;