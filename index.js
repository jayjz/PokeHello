console.log('🎯 PokeHello TCG Bot Starting...');
console.log('Monitoring: Pokémon Center, Target, Walmart');
console.log('Discord alerts: ' + (process.env.DISCORD_WEBHOOK_URL ? 'ENABLED' : 'DISABLED'));

// Import monitors
require('./monitors/pokemon-center');