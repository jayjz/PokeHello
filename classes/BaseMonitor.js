const { connect } = require('puppeteer-real-browser');
const { CookieJar } = require('tough-cookie');
const { sendDiscordAlert } = require('../utils/alerts');

// Base class with hybrid monitoring, stealth, and recovery
class BaseMonitor {
  constructor(options = {}) {
    this.name = options.name || 'BaseMonitor';
    this.urls = options.urls || [];
    this.baseInterval = options.checkInterval || 8000; // Default 8s
    this.currentInterval = this.baseInterval;
    this.proxies = process.env.PROXY_LIST
      ? process.env.PROXY_LIST.split(',').map(p => p.trim()).filter(Boolean)
      : [];
    this.proxyIndex = 0;
    this.bannedProxies = new Set();
    this.cookieJar = new CookieJar();
    this.sessionHeaders = {};
    this.gotScraping = null;
    this.apiClient = null;
    this.lastHarvest = 0;
    this.harvestInterval = 90000; // Re-harvest session every 90s
    this.isRunning = false;
  }

  // Get next clean proxy
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
      this.log(`🚫 Banned proxy: ${proxy}`);
    }
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] [${this.name}] ${message}`, data || '');
    // TODO: Later pipe to Winston/Pino for file + structured logs
  }

  async initGotScraping() {
    if (!this.gotScraping) {
      const module = await import('got-scraping');
      this.gotScraping = module.gotScraping;
    }
    return this.gotScraping;
  }

  // Harvest fresh session via real browser (cookies, headers, tokens)
  async harvestSession(targetUrl) {
    this.log('INFO', `Harvesting session from ${targetUrl}`);
    const proxy = this.getNextProxy();
    
    const { browser, page } = await connect({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
      proxy: proxy ? { host: proxy.split(':')[0], port: parseInt(proxy.split(':')[1]) } : undefined,
    });

    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(2500 + Math.random() * 1500);

      const cookies = await page.cookies();
      for (const cookie of cookies) {
        await this.cookieJar.setCookie(`${cookie.name}=${cookie.value}`, targetUrl);
      }

      const userAgent = await page.evaluate(() => navigator.userAgent);
      this.sessionHeaders = {
        'User-Agent': userAgent,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': targetUrl,
        'Cache-Control': 'no-cache',
      };

      this.log('SUCCESS', `Session harvested (${cookies.length} cookies)`);
      this.lastHarvest = Date.now();
      return true;
    } catch (error) {
      this.log('ERROR', `Session harvest failed`, error.message);
      return false;
    } finally {
      await browser.close();
    }
  }

  async initApiClient() {
    const gotScraping = await this.initGotScraping();
    this.apiClient = gotScraping.extend({
      cookieJar: this.cookieJar,
      headers: this.sessionHeaders,
      http2: true,
      timeout: { request: 12000 },
      retry: { limit: 2, methods: ['GET'] },
    });
    this.log('SUCCESS', 'API client initialized with stealth');
    return this.apiClient;
  }

  // Smart recovery with backoff
  async rotateAndRecover(targetUrl) {
    this.log('WARN', 'Rotating proxy and recovering session...');
    const currentProxy = this.getNextProxy();
    if (currentProxy) this.banProxy(currentProxy);

    this.cookieJar = new CookieJar();
    this.sessionHeaders = {};

    const success = await this.harvestSession(targetUrl);
    if (success) {
      await this.initApiClient();
      this.currentInterval = Math.max(8000, this.baseInterval); // Reset backoff
      return true;
    }
    this.currentInterval = Math.min(45000, this.currentInterval * 1.5); // Exponential backoff
    return false;
  }

  async sendAlert(data) {
    await sendDiscordAlert(data);
  }

  // Jittered delay to avoid patterns
  async randomDelay(min = 800, max = 2200) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(r => setTimeout(r, delay));
  }

  async checkStock() {
    throw new Error('checkStock() must be implemented by subclass');
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.log('INFO', 'Starting hybrid monitor...');

    if (this.urls.length > 0) {
      await this.harvestSession(this.urls[0]);
      await this.initApiClient();
    }

    // Initial check
    this.checkStock().catch(e => this.log('ERROR', 'Initial check failed', e.message));

    // Adaptive polling loop
    this.interval = setInterval(async () => {
      if (!this.isRunning) return;
      try {
        await this.checkStock();
      } catch (e) {
        this.log('ERROR', 'CheckStock failed', e.message);
      }
    }, this.currentInterval);
  }

  async stop() {
    this.isRunning = false;
    if (this.interval) clearInterval(this.interval);
    this.log('INFO', 'Monitor stopped');
  }
}

module.exports = BaseMonitor;
