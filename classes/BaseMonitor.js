const { connect } = require('puppeteer-real-browser');
const { CookieJar } = require('tough-cookie');
const { sendDiscordAlert } = require('../utils/alerts');

// Base class with hybrid monitoring, stealth, and recovery
class BaseMonitor {
  constructor(options = {}) {
    this.name = options.name || 'BaseMonitor';
    this.urls = options.urls || [];
    this.baseInterval = options.checkInterval || 8000;
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
    this.harvestInterval = 90000;
    this.isRunning = false;

    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    ];
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
      this.log('WARN', `Banned proxy: ${proxy}`);
    }
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const extra = data ? ` | ${JSON.stringify(data).slice(0, 250)}` : '';
    console.log(`[${timestamp}] [${level}] [${this.name}] ${message}${extra}`);
  }

  async initGotScraping() {
    if (!this.gotScraping) {
      const module = await import('got-scraping');
      this.gotScraping = module.gotScraping;
    }
    return this.gotScraping;
  }

  async harvestSession(targetUrl) {
    this.log('INFO', `Harvesting session from ${targetUrl}`);

    const proxy = this.getNextProxy();
    const randomUA = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];

    const { browser, page } = await connect({
      headless: true,
      args: [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-blink-features=AutomationControlled',
  '--disable-features=IsolateOrigins,site-per-process',
  '--disable-web-security',
  '--disable-features=VizDisplayCompositor'
],
      proxy: proxy ? { host: proxy.split(':')[0], port: parseInt(proxy.split(':')[1]) } : undefined,
    });

    try {
      await page.setUserAgent(randomUA);
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // FIXED: No more waitForTimeout
      await new Promise(resolve => setTimeout(resolve, 2800 + Math.random() * 1200));

      const cookies = await page.cookies();
      for (const cookie of cookies) {
        await this.cookieJar.setCookie(`${cookie.name}=${cookie.value}`, targetUrl);
      }

      this.sessionHeaders = {
        'User-Agent': randomUA,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': targetUrl,
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      };

      this.log('SUCCESS', `Session harvested (${cookies.length} cookies) | UA: ${randomUA.substring(0, 55)}...`);
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

  async rotateAndRecover(targetUrl) {
    this.log('WARN', 'Rotating proxy and recovering session...');
    const currentProxy = this.getNextProxy();
    if (currentProxy) this.banProxy(currentProxy);

    this.cookieJar = new CookieJar();
    this.sessionHeaders = {};

    const success = await this.harvestSession(targetUrl);
    if (success) {
      await this.initApiClient();
      this.currentInterval = Math.max(8000, this.baseInterval);
      return true;
    }
    this.currentInterval = Math.min(45000, this.currentInterval * 1.5);
    return false;
  }

  async sendAlert(data) {
    await sendDiscordAlert(data);
  }

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

    this.checkStock().catch(e => this.log('ERROR', 'Initial check failed', e.message));

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
