# TCGBot Agents - Operating Rules

## Core Principles
- **Speed over everything** - Milliseconds matter in drops
- **Reliability** - Bot must stay running 24/7
- **Stealth** - Avoid detection, respect rate limits
- **Alerts** - Instant Discord notifications on stock

## Safety Rules
- Never expose API keys or webhooks in code
- Use proxies for all requests (rotate frequently)
- Respect robots.txt and ToS (within reason)
- Log all checkouts for debugging
- Never share profiles or payment data

## Architecture
- Each monitor runs independently
- Central alert dispatcher
- Profile encryption at rest
- Graceful error handling
- Auto-restart on crash