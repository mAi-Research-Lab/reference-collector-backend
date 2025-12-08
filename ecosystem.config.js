module.exports = {
  apps: [{
    name: 'citext-backend',
    script: 'dist/src/main.js',
    cwd: '/root/citext/citext-backend',
    instances: 1,
    autorestart: true,
    watch: false,
    env_file:'.env',
    max_memory_restart: '1G',
    log_file: '/home/citext/logs/citext-backend.log',
    out_file: '/home/citext/logs/citext-backend-out.log',
    error_file: '/home/citext/logs/citext-backend-error.log'
  }]
};