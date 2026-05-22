require('dotenv').config();
const PokemonCenterMonitor = require('./monitors/pokemon-center');
const TargetMonitor = require('./monitors/target');
const WalmartMonitor = require('./monitors/walmart');

console.log('🎯 PokeHello TCG Bot v0.2.0');
console.log('================================');

// Parse command line args
const args = process.argv.slice(2);
const mode = args[0] || 'all';
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('🧪 DRY RUN MODE - No real purchases will be made');
}

console.log('');

// Start monitors based on mode
const monitors = [];

if (mode === 'all' || mode === 'pokemon') {
  monitors.push(new PokemonCenterMonitor());
}

if (mode === 'all' || mode === 'target') {
  monitors.push(new TargetMonitor());
}

if (mode === 'all' || mode === 'walmart') {
  monitors.push(new WalmartMonitor());
}

if (monitors.length === 0) {
  console.log('Usage: node index.js [pokemon|target|walmart|all] [--dry-run]');
  process.exit(1);
}

// Start all monitors
monitors.forEach(monitor => {
  monitor.start();
  console.log(`✅ ${monitor.name} monitor started`);
});

console.log('');
console.log(`📊 Monitoring ${monitors.length} site(s)`);
console.log('Press Ctrl+C to stop');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down monitors...');
  await Promise.all(monitors.map(m => m.stop()));
  process.exit(0);
});