# Production Environment Setup

## Prerequisites

- Node.js v18+
- MongoDB v6+
- Redis (optional, for rate limiting)

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Node environment
NODE_ENV=production

# Server
PORT=10000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/integr8

# P2P Network
SEED_PEERS=ws://peer1:10001,ws://peer2:10001
MAX_PEERS=10

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
```

## Directory Structure

```
/logs           - Application logs
  /error.log    - Error logs only
  /combined.log - All logs
  /requests.log - HTTP request logs (production)
/data           - Blockchain data
  /blocks       - Block data files
  /state        - State snapshots
```

## Production Setup

1. Install dependencies:

   ```bash
   npm ci --production
   ```

2. Create required directories:

   ```bash
   mkdir -p logs data/blocks data/state
   ```

3. Set file permissions:
   ```bash
   chmod 755 logs data/blocks data/state
   ```

## Running in Production

### Using PM2

1. Install PM2:

   ```bash
   npm install -g pm2
   ```

2. Start the application:

   ```bash
   pm2 start index.js --name "integr8" \
     --max-memory-restart 1G \
     -i max \
     --merge-logs \
     --log ./logs/pm2.log
   ```

3. Monitor the application:
   ```bash
   pm2 monit
   ```

### Using Docker

1. Build the image:

   ```bash
   docker build -t integr8-node .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name integr8 \
     -p 10000:10000 \
     -v $(pwd)/logs:/app/logs \
     -v $(pwd)/data:/app/data \
     --env-file .env \
     integr8-node
   ```

## Monitoring & Maintenance

### Log Rotation

Install logrotate configuration:

```
/path/to/app/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 node node
    sharedscripts
    postrotate
        kill -HUP `cat /var/run/node.pid`
    endscript
}
```

### Health Check

Monitor application health:

```bash
curl http://localhost:10000/health
```

### Metrics

Basic metrics available at:

```bash
curl http://localhost:10000/metrics
```

### Backup

1. State database backup:

   ```bash
   mongodump --db integr8 --out /backup/$(date +%Y%m%d)
   ```

2. Blockchain data backup:
   ```bash
   tar -czf /backup/blockchain-$(date +%Y%m%d).tar.gz ./data
   ```

## Security Notes

1. Firewall Rules

   ```bash
   # Allow HTTP API
   ufw allow 10000/tcp

   # Allow P2P network
   ufw allow 10001/tcp
   ```

2. SSL/TLS Setup

   - Use reverse proxy (nginx/haproxy)
   - Configure with Let's Encrypt certificates
   - Enable HTTP/2

3. Rate Limiting

   - Default: 100 requests per 15 minutes
   - Adjust in .env for production load

4. Memory Management
   - Monitor memory usage
   - Set appropriate heap limits
   - Configure garbage collection

## Troubleshooting

### Common Issues

1. Connection Timeouts

   - Check network connectivity
   - Verify peer list
   - Review firewall rules

2. High Memory Usage

   - Check memory leaks
   - Monitor garbage collection
   - Review transaction pool size

3. Slow Response Times
   - Monitor database indexes
   - Check network latency
   - Review logging levels

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

## Support

For production support:

- GitHub Issues: [Repository Issues](https://github.com/your-org/integr8/issues)
- Documentation: [Project Wiki](https://github.com/your-org/integr8/wiki)
