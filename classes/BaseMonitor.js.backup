const { gotScraping } = require('got-scraping');
const { connect } = require('puppeteer-real-browser');
const { CookieJar } = require('tough-cookie');
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
    this.cookieJar = new CookieJar();
    this.apiClient = null;
    this.sessionHeaders = {};
  }

  getNextProxy() {
    if (this.proxies.length === 0) return null;
    let attempts = 0;
    while (attempts < this.proxies.length) {
      const proxy = this.proxies[this.proxyIndex];
      this.proxyIndex = (this.proxyIndex + 1) % this.proxies.length;
      if (!this.bannedProxies.has(proxy)) return proxy;
      attempts++;
    }
    return null;
  }

  banProxy(proxy) {
    if (proxy) {
      this.bannedProxies.add(proxy);
      console.log(`🚫 [${this.name}] Banned proxy: ${proxy}`);
    }
  }

  // Method 1: Harvest session cookies and tokens via real browser
  async harvestSession(targetUrl) {
    console.log(`🔍 [${this.name}] Harvesting session from ${targetUrl}...`);
    
    const proxy = this.getNextProxy();
    const { browser, page } = await connect({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
      customConfig: {},
      proxy: proxy ? { host: proxy.split(':')[0], port: proxy.split(':')[1] } : undefined,
    });

    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for Cloudflare/Akamai/DataDome to clear
      await page.waitForTimeout(3000);
      
      // Extract cookies
      const cookies = await page.cookies();
      for (const cookie of cookies) {
        await this.cookieJar.setCookie(
          `${cookie.name}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}`,
          targetUrl
        );
      }
      
      // Extract critical headers/tokens
      const userAgent = await page.evaluate(() => navigator.userAgent);
      this.sessionHeaders = {
        'User-Agent': userAgent,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': targetUrl,
      };
      
      // Extract Akamai _abck cookie if present
      const abckCookie = cookies.find(c => c.name === '_abck');
      if (abckCookie) {
        console.log(`✅ [${this.name}] Harvested _abck token`);
      }
      
      // Extract DataDome cookie if present
      const datadomeCookie = cookies.find(c => c.name.includes('datadome'));
      if (datadomeCookie) {
        console.log(`✅ [${this.name}] Harvested DataDome token`);
      }
      
      console.log(`✅ [${this.name}] Session harvested (${cookies.length} cookies)`);
      return true;
    } catch (error) {
      console.error(`❌ [${this.name}] Session harvest failed:`, error.message);
      return false;
    } finally {
      await browser.close();
    }
  }

  // Method 2: Initialize got-scraping client with harvested session
  initApiClient() {
    this.apiClient = gotScraping.extend({
      cookieJar: this.cookieJar,
      headers: this.sessionHeaders,
      http2: true,
      // got-scraping automatically handles TLS fingerprinting
      // to mimic real Chrome browser
    });
    
    console.log(`✅ [${this.name}] API client initialized with TLS spoofing`);
    return this.apiClient;
  }

  // Method 3: Rotate proxy and recover from blocks
  async rotateAndRecover(targetUrl) {
    console.log(`🔄 [${this.name}] Rotating proxy and recovering session...`);
    
    // Ban current proxy if we have one
    const currentProxy = this.getNextProxy();
    if (currentProxy) {
      this.banProxy(currentProxy);
    }
    
    // Clear old session
    this.cookieJar = new CookieJar();
    this.sessionHeaders = {};
    
    // Harvest new session with fresh proxy
    const success = await this.harvestSession(targetUrl);
    if (success) {
      this.initApiClient();
      console.log(`✅ [${this.name}] Recovery complete`);
      return true;
    }
    
    console.error(`❌ [${this.name}] Recovery failed`);
    return false;
  }

  async sendAlert(data) {
    await sendDiscordAlert({
      title: data.title || `${this.name} Alert`,
      description: data.description,
      url: data.url,
      color: data.color || 0x0099ff,
      fields: data.fields || []
    });
  }

  async checkStock() {
    throw new Error('checkStock() must be implemented by subclass');
  }

  async start() {
    console.log(`🎯 [${this.name}] Starting hybrid monitor...`);
    
    // Initial session harvest
    if (this.urls.length > 0) {
      await this.harvestSession(this.urls[0]);
      this.initApiClient();
    }
    
    // Start monitoring loop
    await this.checkStock();
    this.interval = setInterval(() => {
      this.checkStock().catch(console.error);
    }, this.checkInterval);
  }

  async stop() {
    if (this.interval) clearInterval(this.interval);
    console.log(`👋 [${this.name}] Stopped`);
  }
}

module.exports = BaseMonitor;