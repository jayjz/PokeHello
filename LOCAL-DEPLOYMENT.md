# Local PC Deployment Guide - PokeHello TCG Bot

Complete step-by-step instructions for running the bot on your local PC.

## 🪟 Windows Users (Recommended: WSL2)

**If you're on Windows 10/11, use WSL2 (Windows Subsystem for Linux) - it's the easiest way to run this bot.**

### Step 0: Install WSL2 with Ubuntu 24.04

**Option A: Quick Install (Windows 10 2004+ / Windows 11)**
```powershell
# Open PowerShell as Administrator and run:
wsl --install -d Ubuntu-24.04
```

**Option B: Manual Install**
1. Open PowerShell as Administrator
2. Enable WSL:
```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```
3. Restart your computer
4. Download Ubuntu 24.04 from Microsoft Store
5. Launch Ubuntu and create your username/password

### Step 0.5: Initial WSL2 Setup

Once Ubuntu is installed, open your WSL2 terminal and run:

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential

# Install Node.js 20.x (required)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
git --version   # Should show 2.x.x
```

**Important WSL2 Notes:**
- Your files are accessible from Windows at: `\\wsl$\Ubuntu-24.04\home\YOUR_USERNAME`
- WSL2 has full network access - no special firewall rules needed
- You can run the bot 24/7 - WSL2 stays running even when you close the terminal (use `wsl --shutdown` to stop it)
- For best performance, store the project in WSL filesystem (`~/PokeHello`), NOT in Windows-mounted drives (`/mnt/c/...`)

### Step 0.7: Windows-Specific Tips

**Accessing the Dashboard from Windows:**
After starting the bot, access the GUI at: http://localhost:3000
- WSL2 automatically forwards ports to Windows
- Works in Chrome, Firefox, Edge on Windows

**Editing Files:**
- **Recommended:** Use VS Code with WSL extension
  1. Install VS Code on Windows
  2. Install "WSL" extension
  3. Open WSL terminal, run: `code .`
  4. VS Code opens connected to WSL filesystem
  
- **Alternative:** Edit in WSL with nano/vim
  ```bash
  nano .env  # Simple editor
  # or
  vim .env   # Advanced editor
  ```

**Keeping WSL Running:**
```powershell
# In Windows PowerShell, to keep WSL running in background:
wsl -d Ubuntu-24.04 -e bash -c "cd ~/PokeHello && pm2 resurrect && pm2 logs"

# To stop WSL completely:
wsl --shutdown
```

---

## Prerequisites (Linux/macOS/WSL2)

- Ubuntu 20.04+ / Debian 11+ / Ubuntu 24.04 (recommended) / macOS 12+
- Node.js 18+ installed (`node --version`)
- Git installed (`git --version`)
- sudo access for system packages

## Step 1: Clone Repository

```bash
# If first time:
git clone https://github.com/jayjz/PokeHello.git
cd PokeHello

# If updating existing:
cd ~/PokeHello  # or wherever you cloned it
git pull origin main
```

## Step 2: Install System Dependencies

### For Ubuntu 24.04 / Debian 12+ (Recommended):
```bash
# Update package lists
sudo apt-get update

# Install Chromium and dependencies for Playwright
# Note: Ubuntu 24.04 uses t64 suffix for some libraries
sudo apt-get install -y \
  xvfb \
  chromium-browser \
  libnss3 \
  libatk-bridge2.0-0t64 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libxss1 \
  libasound2t64 \
  libatspi2.0-0t64 \
  libcups2t64 \
  libxshmfence1

# Verify installation
chromium-browser --version
```

### For Ubuntu 22.04 / Debian 11:
```bash
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
```

### For macOS:
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Chromium is bundled with Playwright on macOS, no separate install needed
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
# or on Windows with VS Code: code .env
```

**Required variables in `.env`:**
```env
# Discord webhook for alerts (see "Setting Up Discord Webhook" section below)
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

## Step 4.5: Setting Up Discord Webhook Alerts

Discord webhooks are **essential** - they send you instant notifications when products are in stock.

### Step-by-Step Discord Setup:

**1. Create or Open Your Discord Server**
- Open Discord (desktop app or web)
- You can use an existing server or create a new one for bot alerts

**2. Create a Channel for Alerts**
- Right-click your server → "Create Channel"
- Name it: `#tcg-alerts` or `#pokebot`
- Channel type: Text Channel
- Click "Create Channel"

**3. Create the Webhook**
- Right-click the channel → "Edit Channel"
- Go to "Integrations" tab (left sidebar)
- Click "Webhooks" → "New Webhook"
- Configure:
  - **Name:** `PokeHello Bot` (or whatever you want)
  - **Avatar:** Upload a Pokémon image (optional)
  - **Channel:** Should show your alerts channel
- Click "Copy Webhook URL"
- **IMPORTANT:** Save this URL - you'll need it for `.env`

**4. Test the Webhook (Optional but Recommended)**
```bash
# Test with curl (replace with your actual webhook URL)
curl -X POST "YOUR_WEBHOOK_URL_HERE" \
  -H "Content-Type: application/json" \
  -d '{"content": "🧪 Test from PokeHello - Webhook is working!"}'
```
You should see the message appear in your Discord channel.

**5. Add to Your `.env` File**
```bash
nano .env
```
Find the line:
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE
```
Replace with your actual webhook URL (it starts with `https://discord.com/api/webhooks/...`)

**6. Test in the Bot**
```bash
npm run test:discord
```
You should see a test alert in your Discord channel.

### Discord Webhook Troubleshooting:

**"Invalid Webhook URL" error:**
- Make sure you copied the ENTIRE URL (it's long)
- URL should start with `https://discord.com/api/webhooks/`
- No extra spaces before or after the URL in `.env`

**Not receiving alerts:**
1. Check webhook URL is correct in `.env`
2. Verify the Discord channel still exists
3. Check bot logs: `pm2 logs tcgbot-monitor`
4. Look for "Discord webhook" errors in logs
5. Test webhook with curl command above

**Want different alerts for different sites?**
Create multiple webhooks (one per channel):
- `#pokemon-center-alerts`
- `#target-alerts`
- `#walmart-alerts`

Then use environment variables:
```env
DISCORD_WEBHOOK_POKEMON=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_TARGET=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_WALMART=https://discord.com/api/webhooks/...
```

**Security Note:**
- Never share your webhook URL publicly
- Anyone with the URL can post to your channel
- If leaked, delete the webhook in Discord and create a new one
- Webhook URLs are in `.env` which is gitignored (never committed to GitHub)

---

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
# Follow the instructions it prints (copy/paste the command it gives you)
```

**Access the dashboard:**
- **WSL2/Windows:** http://localhost:3000 (open in Windows browser)
- **Linux/macOS:** http://localhost:3000
- **Remote VPS:** http://YOUR_SERVER_IP:3000

## Step 7: Start Monitoring

```bash
# Start monitoring all sites (dry run mode for testing)
npm run start:all -- --dry-run

# Or monitor specific sites:
npm run start:pokemon -- --dry-run
npm run start:target -- --dry-run
npm run start:walmart -- --dry-run

# For production (real purchases - BE CAREFUL):
# npm run start:all
```

## Step 8: Verify Everything Works

**Checklist:**
- [ ] PM2 shows both processes running: `pm2 status`
- [ ] Dashboard loads at http://localhost:3000
- [ ] Discord test alert works: `npm run test:discord`
- [ ] No errors in logs: `pm2 logs`
- [ ] Monitor detects test products (check logs for "Checking..." messages)

---

## 🔧 Troubleshooting

### WSL2-Specific Issues

**Problem: "Cannot connect to display" or GUI issues**
```bash
# WSL2 doesn't have a display by default (this is normal - we use headless mode)
# If you see display errors, make sure you're running in headless mode:
export DISPLAY=:99
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
```

**Problem: Playwright fails with "Host system is missing dependencies"**
```bash
# Install missing dependencies
sudo apt-get install -y libgtk-4-1 libgraphene-1.0-0 \
  libgstreamer-plugins-bad1.0-0 libflite1 libavif13
```

**Problem: "EACCES: permission denied" when installing packages**
```bash
# Fix npm permissions in WSL2
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

**Problem: WSL2 clock is out of sync (causes SSL errors)**
```bash
# Sync WSL2 clock with Windows
sudo hwclock -s
# Or restart WSL2:
# In PowerShell: wsl --shutdown
# Then reopen WSL2 terminal
```

**Problem: Port 3000 already in use**
```bash
# Find what's using the port
sudo lsof -i :3000
# Kill the process
kill -9 <PID>
# Or use a different port in .env:
echo "GUI_PORT=3001" >> .env
```

**Problem: High memory usage in WSL2**
```bash
# Limit WSL2 memory usage
# Create/edit: %USERPROFILE%\.wslconfig (on Windows side)
# Add:
[wsl2]
memory=4GB
processors=2
# Then restart WSL2: wsl --shutdown
```

### General Issues

**Problem: "Chrome not found" or "CHROME_PATH not set"**
```bash
# Find Chromium path
which chromium-browser || which chromium

# Set in .env
echo "CHROME_PATH=/usr/bin/chromium-browser" >> .env
```

**Problem: "Module not found" errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npx playwright install chromium
```

**Problem: Discord webhook not working**
1. Verify URL in `.env` is correct (no spaces, full URL)
2. Test with curl (see Discord setup section above)
3. Check Discord channel permissions
4. Verify webhook wasn't deleted in Discord
5. Check logs: `pm2 logs | grep -i discord`

**Problem: Bot getting blocked (403/429 errors)**
1. **Add proxies** to `.env`:
   ```env
   PROXY_LIST=http://user:pass@proxy1:port,http://user:pass@proxy2:port
   ```
2. **Increase delays** in `.env`:
   ```env
   CHECK_INTERVAL=8000  # Was 5000, now 8 seconds
   ```
3. **Use residential proxies** (datacenter IPs are often blocked)
4. **Rotate user agents** (already implemented in code)

**Problem: High CPU usage**
```bash
# Check what's using CPU
pm2 monit

# Reduce concurrent tasks in ecosystem.config.js
# Or increase CHECK_INTERVAL in .env to reduce frequency
```

### Getting Help

**Check logs first:**
```bash
pm2 logs tcgbot-monitor --lines 100
pm2 logs tcgbot-gui --lines 50
```

**Common log locations:**
- PM2 logs: `~/.pm2/logs/`
- Application logs: `./logs/` (if configured)

**Still stuck?**
1. Check GitHub Issues: https://github.com/jayjz/PokeHello/issues
2. Verify environment: `node --version` (should be 18+), `npm --version`
3. Test with minimal config (one product URL, no proxies)
4. Enable debug logging: Add `DEBUG=*` to `.env`

---

## 🔄 Updating

```bash
cd ~/PokeHello
git pull origin main
npm install
npx playwright install chromium
pm2 restart all
```

## 🗑️ Uninstalling

```bash
# Stop services
pm2 stop all
pm2 delete all

# Remove files
cd ~
rm -rf PokeHello

# Optional: Remove Node.js and dependencies
# (Only if you don't need them for other projects)
```

---

## 📊 Performance Tuning

**For low-end systems (2GB RAM, 1-2 cores):**
```env
# In .env
CHECK_INTERVAL=10000  # Check every 10 seconds instead of 5
```
```javascript
// In ecosystem.config.js, reduce instances to 1
instances: 1,
max_memory_restart: '300M',
```

**For high-end systems (8GB+ RAM, 4+ cores):**
```env
# In .env - can check more frequently
CHECK_INTERVAL=3000  # Check every 3 seconds
```
```javascript
// In ecosystem.config.js
instances: 2,  // Run 2 monitor instances
max_memory_restart: '1G',
```

---

## 🔐 Security Best Practices

1. **Never commit `.env` file** - It's gitignored for a reason
2. **Use strong encryption key** - Generate with `openssl rand -hex 32`
3. **Rotate Discord webhooks** periodically if shared
4. **Don't run as root** - Use regular user account
5. **Keep system updated** - `sudo apt update && sudo apt upgrade`
6. **Use firewall** - UFW recommended on VPS: `sudo ufw enable`
7. **Monitor logs** - Check for suspicious activity regularly

---

## ✅ First Run Checklist

After installation, verify everything works:

- [ ] **Node.js version:** `node --version` (should be 18+)
- [ ] **Dependencies installed:** `ls node_modules | wc -l` (should be 300+)
- [ ] **Playwright works:** `npx playwright --version` (should show version)
- [ ] **Environment configured:** `ls -la .env` (file exists)
- [ ] **Discord webhook set:** `grep DISCORD_WEBHOOK_URL .env` (has value)
- [ ] **Basic test passes:** `npm test` (shows usage info, no errors)
- [ ] **GUI starts:** `npm run gui` (then visit http://localhost:3000)
- [ ] **PM2 works:** `pm2 start ecosystem.config.js && pm2 status` (shows 2 processes)
- [ ] **Logs are clean:** `pm2 logs --lines 20` (no red errors)

If all checks pass, you're ready to start monitoring! 🎉

---

**Need help?** Open an issue: https://github.com/jayjz/PokeHello/issues