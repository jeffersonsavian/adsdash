// ecosystem.config.js — PM2 Ecosystem Configuration
// Deploy AdsDash without Docker using PM2
//
// Usage:
//   pnpm build
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup
//
// For production, use PM2 Plus or PM2 monitoring.

module.exports = {
  apps: [
    {
      name: 'adsdash-app',
      script: 'pnpm',
      args: 'start',
      cwd: '/var/www/adsdash', // Change to your deployment directory
      instances: 1, // Or 'max' for clustering
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Database (use environment variables or .env file)
        // DATABASE_URL: 'postgresql://user:pass@bancodedados01:5432/adsdash',
        // REDIS_URL: 'redis://redis-host:6379',
        // NEXTAUTH_URL: 'https://adsdash.seudominio.com.br',
        // ENCRYPTION_KEY: '<generate with openssl rand -base64 32>',
        // META_APP_ID: '<your meta app id>',
        // META_APP_SECRET: '<your meta app secret>',
      },
      error_file: '/var/log/adsdash-app-error.log',
      out_file: '/var/log/adsdash-app-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      autorestart: true,
      watch: false, // Set to true only for development
      ignore_watch: ['node_modules', '.next', 'logs', 'dist'],
      max_restarts: 10,
      min_uptime: '10s',
    },

    {
      name: 'adsdash-worker',
      script: 'pnpm',
      args: 'worker',
      cwd: '/var/www/adsdash',
      instances: 1, // BullMQ worker (typically 1-3 instances)
      exec_mode: 'fork', // Workers should run in fork mode, not cluster
      env: {
        NODE_ENV: 'production',
        // DATABASE_URL: 'postgresql://user:pass@bancodedados01:5432/adsdash',
        // REDIS_URL: 'redis://redis-host:6379',
        // ENCRYPTION_KEY: '<same as app>',
      },
      error_file: '/var/log/adsdash-worker-error.log',
      out_file: '/var/log/adsdash-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '512M',
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', '.next', 'logs', 'dist'],
      max_restarts: 10,
      min_uptime: '5s',
    },

    {
      name: 'adsdash-scheduler',
      script: 'pnpm',
      args: 'scheduler',
      cwd: '/var/www/adsdash',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        // DATABASE_URL: 'postgresql://user:pass@bancodedados01:5432/adsdash',
        // REDIS_URL: 'redis://redis-host:6379',
      },
      error_file: '/var/log/adsdash-scheduler-error.log',
      out_file: '/var/log/adsdash-scheduler-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '256M',
      // Cron job: run daily at 00:00 (midnight)
      cron_restart: '0 0 * * *',
      autorestart: true,
      watch: false,
      max_restarts: 5,
      min_uptime: '10s',
    },
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'adsdash-server',
      port: 22,
      ref: 'origin/main',
      repo: 'git@github.com:yourorg/adsdash.git',
      path: '/var/www/adsdash',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env production',
    },
  },
};
