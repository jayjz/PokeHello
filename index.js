require('dotenv').config();

const SamsClubMonitor = require('./monitors/sams-club');
// const PokemonCenterMonitor = require('./monitors/pokemon-center');  // Commented out - DataDome hell
// const TargetMonitor = require('./monitors/target');
// const WalmartMonitor = require('./monitors/walmart');

console.log('🎯 PokeHello TCG Bot v0.4.0 - SAM\'S CLUB FOCUS');
console.log('================================');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
if (dryRun) console.log('🧪 DRY RUN MODE ENABLED');

const monitors = [];

// Only Sam's Club for focused development
monitors.push(new SamsClubMonitor());

if (monitors.length === 0) {
  console.error('No monitors enabled.');
  process.exit(1);
}

monitors.forEach(monitor => {
  monitor.start();
  console.log(`✅ ${monitor.name} monitor started`);
});

console.log(`📊 Monitoring ${monitors.length} site(s) - Focused on Sam's Club`);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down...');
  await Promise.all(monitors.map(m => m.stop()));
  process.exit(0);
});
