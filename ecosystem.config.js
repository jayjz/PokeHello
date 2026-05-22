module.exports = {
  apps: [
    {
      name: 'tcgbot-monitor',
      script: 'index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
    {
      name: 'tcgbot-gui',
      script: 'gui/server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        GUI_PORT: 3000,
      },
      error_file: './logs/gui-err.log',
      out_file: './logs/gui-out.log',
      log_file: './logs/gui-combined.log',
      time: true,
      autorestart: true,
    }
  ],
};
