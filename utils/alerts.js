const axios = require('axios');

async function sendDiscordAlert(embed) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('Discord webhook not configured');
    return;
  }
  
  try {
    await axios.post(webhookUrl, {
      embeds: [{
        title: embed.title,
        description: embed.description,
        url: embed.url,
        color: embed.color || 0x0099ff,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'PokeHello TCG Bot'
        }
      }]
    });
    console.log('✅ Discord alert sent');
  } catch (error) {
    console.error('Failed to send Discord alert:', error.message);
  }
}

module.exports = { sendDiscordAlert };