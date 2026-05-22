# Local PC Deployment Guide - PokeHello TCG Bot

Complete step-by-step instructions for running the bot on your local PC (Ubuntu/Debian).

## Prerequisites

- Ubuntu 20.04+ or Debian 11+ (or WSL2 on Windows)
- Node.js 18+ installed (`node --version`)
- Git installed (`git --version`)
- sudo access for system packages

## Step 1: Clone Repository

```bash
# If first time:
git clone https://github.com/jayjz/PokeHello.git
cd PokeHello

# If updating existing:
cd /path/to/PokeHello
git pull origin main
```

## Step 2: Install System Dependencies

```bash
# Update package lists
sudo apt-get update

# Install Chromium and dependencies for Playwright
sudo apt-get install -y \
  xvfb \
  chromium-browser \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libxss1 \
  libasound2

# Verify installation
chromium-browser --version
```

## Step 3: Install Node Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Verify installation
npx playwright --version
```

## Step 4: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit with your settings
nano .env
```

**Required variables in `.env`:**
```env
# Discord webhook for alerts (get from Discord channel settings)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE

# Products to monitor (comma-separated URLs)
PRODUCT_URLS=https://www.pokemoncenter.com/product/290-10038,https://www.pokemoncenter.com/product/...

# Check interval in milliseconds (5000 = 5 seconds)
CHECK_INTERVAL=5000

# Profile encryption key (generate with: openssl rand -hex 32)
PROFILE_ENCRYPTION_KEY=your-64-character-hex-key-here

# Optional: Proxy list (comma-separated)
# PROXY_LIST=http://user:pass@ip:port,http://ip2:port

# GUI port (default 3000)
GUI_PORT=3000
```

**Generate encryption key:**
```bash
openssl rand -hex 32
```

## Step 5: Test Installation

```bash
# Test basic functionality (dry run)
npm test

# Expected output:
# 🎯 PokeHello TCG Bot v0.2.0
# 🧪 DRY RUN MODE - No real purchases will be made
# Usage: node index.js [pokemon|target|walmart|all] [--dry-run]
```

## Step 6: Start with PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs tcgbot-monitor
pm2 logs tcgbot-gui

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup
# Follow the instructions shown (copy/paste the sudo command)
```

**PM2 Commands:**
```bash
pm2 status              # Check running processes
pm2 logs                # View all logs
pm2 restart all         # Restart everything
pm2 stop all            # Stop everything
pm2 delete all          # Remove from PM2
pm2 monit               # Real-time monitoring
```

## Step 7: Access Dashboard

Open browser and navigate to:
```
http://localhost:3000
```

**Dashboard features:**
- Real-time logs
- Active monitor status
- Proxy health
- Success rate metrics
- Last check timestamps

**API endpoints:**
- Health: http://localhost:3000/health
- Metrics: http://localhost:3000/metrics

## Step 8: Start Monitoring

```bash
# Monitor Pokemon Center only
npm run start:pokemon

# Monitor all sites
npm start

# Or use PM2 (recommended for production)
pm2 start ecosystem.config.js
```

## Troubleshooting

### Error: "ChromePathNotSetError" or "Could not start Xvfb"

**Solution:**
```bash
# Install xvfb
sudo apt-get install xvfb

# Set display for headless operation
export DISPLAY=:99
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &

# Or use xvfb-run wrapper
xvfb-run -a npm start
```

### Error: "Failed to launch browser" or missing dependencies

**Solution:**
```bash
# Install Playwright system dependencies
npx playwright install-deps chromium

# Or manually install common deps
sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libasound2
```

### Error: "Cannot find module" or dependency issues

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Error: Discord webhook not working

**Solution:**
1. Go to Discord channel → Edit Channel → Integrations → Webhooks
2. Create webhook and copy URL
3. Add to `.env`: `DISCORD_WEBHOOK_URL=your_url_here`
4. Test: `curl -X POST -H "Content-Type: application/json" -d '{"content":"Test"}' YOUR_WEBHOOK_URL`

### Bot gets blocked (403/429 errors)

**Solutions:**
1. **Increase delays** in `.env`:
   ```
   CHECK_INTERVAL=10000  # 10 seconds instead of 5
   ```

2. **Add proxies** to `.env`:
   ```
   PROXY_LIST=http://user:pass@proxy1:port,http://proxy2:port
   ```

3. **Use residential proxies** (datacenter IPs are often blocked)
   - Bright Data, Oxylabs, Smartproxy, etc.

### High CPU/Memory Usage

**Solutions:**
1. Reduce concurrent monitors (run one site at a time)
2. Increase check intervals
3. Use PM2 to limit memory: `max_memory_restart: '500M'` (already in ecosystem.config.js)
4. Run on VPS with more resources

### Port 3000 Already in Use

**Solution:**
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill it or change port in .env
GUI_PORT=3001
```

## Performance Tuning

**For VPS deployment:**
- Minimum: 2GB RAM, 1 vCPU
- Recommended: 4GB RAM, 2 vCPU
- Use SSD storage for faster I/O
- Choose location close to target sites (US East for Pokemon Center)

**Optimization tips:**
- Run monitors during off-peak hours to avoid rate limits
- Use proxies close to target site's servers
- Monitor success rates and adjust intervals accordingly
- Set up log rotation to prevent disk fill: `pm2 install pm2-logrotate`

## Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore` for a reason
2. **Encrypt profiles** - Use the built-in AES-256 encryption
3. **Use environment variables** for sensitive data in production
4. **Rotate Discord webhooks** periodically
5. **Monitor logs** for suspicious activity
6. **Keep dependencies updated**: `npm audit fix`

## Updating the Bot

```bash
cd /path/to/PokeHello
git pull origin main
npm install
pm2 restart all
```

## Getting Help

- Check logs: `pm2 logs` or `tail -f logs/*.log`
- GitHub Issues: https://github.com/jayjz/PokeHello/issues
- Verify health: `curl http://localhost:3000/health`

## Uninstall / Cleanup

```bash
# Stop PM2 processes
pm2 delete all
pm2 unstartup

# Remove files ( careful! )
cd ~
rm -rf PokeHello

# Optional: Remove global PM2
npm uninstall -g pm2
```
