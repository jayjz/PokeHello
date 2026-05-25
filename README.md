# PokeHello - Pokémon TCG Sniping Bot

**GitHub:** https://github.com/jayjz/PokeHello

High-performance sniping bot for Pokémon TCG drops (Pokémon Center, Target, Walmart, etc.) - Inspired by Stellar AIO / NSB / BotBro

## 🚀 Quick Start

**New to the project?** See [LOCAL-DEPLOYMENT.md](LOCAL-DEPLOYMENT.md) for complete setup instructions.

```bash
git clone https://github.com/jayjz/PokeHello.git
cd PokeHello
npm install
cp .env.example .env
# Edit .env with your settings
npm start
```

**Dashboard:** http://localhost:3000 (after starting)

## 📋 Roadmap

### Phase 1: Foundation ✅ Complete
- [x] Project structure
- [x] Core monitor engine (Hybrid API/Browser)
- [x] Config system
- [x] Discord webhook alerts
- [x] Pokemon Center monitor with stealth

### Phase 2: Multi-Site Support ✅ Complete
- [x] Target.com monitor (API interception)
- [x] Walmart monitor (DataDome evasion)
- [x] Proxy rotation system
- [x] BaseMonitor architecture

### Phase 3: Checkout Automation 🚧 In Progress
- [x] Profile management system
- [x] Checkout base class architecture
- [x] Task runner with concurrency
- [x] Dry-run mode
- [ ] Auto-checkout flows (partial implementation)
- [ ] Captcha solving integration
- [ ] Queue bypass techniques

### Phase 4: Production Hardening 📋 Planned
- [ ] PM2 process management
- [ ] Docker containerization
- [ ] Comprehensive logging
- [ ] Web dashboard enhancements
- [ ] Success analytics

### Phase 4.1: Sam's Club Support ✅ Complete
- [x] Sam's Club monitor with hybrid API scraping
- [x] Fulfillment API integration (pickup/ship availability)
- [x] Sam's Club checkout skeleton (ATC + order submission)
- [x] Membership validation handling
- [x] Club-specific inventory checking
- [ ] Production testing with real membership
- [ ] Payment gateway integration (requires PCI compliance)

## 🛠️ Architecture

- **Hybrid Monitoring:** Browser harvests session tokens → API client uses them with TLS spoofing
- **Anti-Bot Evasion:** got-scraping (JA3 fingerprinting), puppeteer-real-browser, proxy rotation
- **Multi-Site:** Modular monitors for each retailer
- **Real-time Dashboard:** Express + Socket.IO on port 3000

## 📁 Project Structure

```
tcgbot/
├── classes/
│   ├── BaseMonitor.js      # Core monitoring with stealth
│   ├── CheckoutBase.js     # Abstract checkout class
│   └── ProfileManager.js   # Encrypted profile storage
├── monitors/
│   ├── pokemon-center.js   # Pokemon Center monitor
│   ├── target.js           # Target.com monitor
│   ├── walmart.js          # Walmart monitor
│   └── sams-club.js        # Sam's Club monitor (Prismatic SPC)
├── checkouts/
│   ├── pokemon-center.js   # Demandware checkout
│   ├── target.js           # Target checkout
│   ├── walmart.js          # Walmart checkout
│   └── sams-club.js        # Sam's Club checkout
├── gui/
│   ├── server.js           # Express dashboard
│   └── public/
│       └── index.html      # Real-time UI
├── profiles/               # Encrypted user profiles
├── utils/
│   └── alerts.js           # Discord webhooks
└── index.js               # Main entry point
```

## ⚙️ Configuration

See `.env.example` for all available options:

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
PRODUCT_URLS=https://...
CHECK_INTERVAL=5000
PROXY_LIST=http://user:pass@proxy:port
PROFILE_ENCRYPTION_KEY=your-64-char-hex-key
```

## 🚨 Legal Disclaimer

**Use at your own risk.** Automated purchasing may violate retailer Terms of Service and could result in account bans. This tool is for educational purposes. The authors are not responsible for any accounts terminated, orders cancelled, or legal consequences.

**Security Warning:** Never commit real payment information to git. Always use environment variables or encrypted profiles.

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Pull requests welcome! Please ensure:
- Code follows existing patterns
- No real credentials in commits
- Test in dry-run mode first
- Update documentation

---

**Status:** Phase 3 in progress | **Last Updated:** 2026-05-22
