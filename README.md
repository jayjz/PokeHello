# PokeHello - Pokémon TCG Sniping Bot

**GitHub:** https://github.com/jayjz/PokeHello

High-performance sniping bot for Pokémon TCG drops (Pokémon Center, Target, Walmart, etc.) - Inspired by Stellar AIO / NSB / BotBro

## Roadmap

### Phase 1: Foundation (Current)
- [x] Project structure
- [ ] Core monitor engine (Playwright)
- [ ] Config system
- [ ] Discord webhook alerts
- [ ] Basic Pokémon Center monitor

### Phase 2: Multi-Site Support
- [ ] Target.com monitor
- [ ] Walmart monitor
- [ ] Best Buy monitor
- [ ] Proxy rotation system

### Phase 3: Checkout Automation 🚧 In Progress
- [x] Profile management system (JSON-based)
- [x] Checkout base class architecture
- [x] Task runner with multi-monitor support
- [x] Dry-run mode for safe testing
- [ ] Auto-checkout flows (partial - cart add implemented)
- [ ] Captcha solving integration
- [ ] Queue bypass techniques

#### Usage
```bash
# Monitor all sites
npm start

# Monitor specific site
npm run start:pokemon
npm run start:target
npm run start:walmart

# Dry-run mode (safe testing, no purchases)
npm test

# Development mode with auto-reload
npm run dev
```

#### Profiles
Profiles are stored in `profiles/` directory as JSON files:
```json
{
  "name": "example",
  "shipping": { ... },
  "payment": { ... },
  "email": "..."
}
```

### Phase 4: Advanced Features
- [ ] Keyword + URL monitoring
- [ ] Restock detection
- [ ] Analytics dashboard
- [ ] Success tracking

### Phase 5: Optimization
- [ ] Performance tuning
- [ ] Error handling
- [ ] Monitoring dashboard
- [ ] Mobile alerts

## Quick Start
```bash
npm install
cp .env.example .env
# Configure your settings
npm run monitor
```

## Architecture
- **Monitors:** Site-specific scrapers using Playwright
- **Checkouts:** Automated purchase flows
- **Profiles:** User data and payment info
- **Skills:** Reusable components (proxy, captcha, etc.)
```