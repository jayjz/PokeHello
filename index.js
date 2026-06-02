require('dotenv').config();

const PokemonCenterMonitor = require('./monitors/pokemon-center');
// Temporarily disabled others for focused development
// const TargetMonitor = require('./monitors/target');
// const WalmartMonitor = require('./monitors/walmart');

console.log('🎯 PokeHello TCG Bot v0.3.0 - Pokémon Center Focus');
console.log('================================');

// CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
if (dryRun) console.log('🧪 DRY RUN MODE ENABLED');

const monitors = [];

// Only Pokemon Center for now
monitors.push(new PokemonCenterMonitor());

if (monitors.length === 0) {
  console.error('No monitors enabled. Check index.js');
  process.exit(1);
}

// Start everything
monitors.forEach(monitor => {
  monitor.start();
  console.log(`✅ ${monitor.name} monitor started`);
});

console.log(`📊 Monitoring ${monitors.length} site(s) - Focused on Pokémon Center`);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down...');
  await Promise.all(monitors.map(m => m.stop()));
  process.exit(0);
});
