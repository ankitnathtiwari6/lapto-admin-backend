# Docker Setup for Lapto Admin Backend

This guide explains how to run the Lapto Admin backend using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10 or later
- Docker Compose 2.0 or later

## Quick Start

### 1. Environment Configuration

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration. For Docker, you can use:

```env
NODE_ENV=production
PORT=5000

# MongoDB (Docker)
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/lapto?authSource=admin

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Lapto Admin Password
LAPTO_ADMIN_PASSWORD=your-secure-password

# CORS
CORS_ORIGIN=http://localhost:5173

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key
```

### 2. Start Services

Start both MongoDB and the backend API:

```bash
docker-compose up -d
```

This will:
- Pull the MongoDB 7 image
- Build the backend Docker image
- Start both services in detached mode
- Create persistent volumes for MongoDB data

### 3. View Logs

To view logs from all services:

```bash
docker-compose logs -f
```

To view logs from a specific service:

```bash
docker-compose logs -f backend
docker-compose logs -f mongodb
```

### 4. Check Service Health

Check if services are running:

```bash
docker-compose ps
```

Test the backend health endpoint:

```bash
curl http://localhost:5000/health
```

## Docker Commands

### Stop Services

```bash
docker-compose down
```

### Stop and Remove Volumes (WARNING: This deletes all database data)

```bash
docker-compose down -v
```

### Rebuild and Restart

After making code changes:

```bash
docker-compose up -d --build
```

### Access MongoDB Shell

```bash
docker-compose exec mongodb mongosh -u admin -p admin123 --authenticationDatabase admin
```

### Execute Commands in Backend Container

```bash
docker-compose exec backend sh
```

## Production Deployment

### Build Production Image

```bash
docker build -t lapto-admin-backend:latest .
```

### Environment Variables for Production

For production, ensure you:

1. Change MongoDB credentials in `docker-compose.yml`
2. Use strong passwords for `LAPTO_ADMIN_PASSWORD`
3. Generate a secure `JWT_SECRET`
4. Set appropriate `CORS_ORIGIN`
5. Use HTTPS in production

### Docker Compose Override for Production

Create a `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - /var/lib/mongodb/data:/data/db

  backend:
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@mongodb:27017/lapto?authSource=admin
    restart: always
```

Run with:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Networking

The services communicate over a custom bridge network called `lapto-network`.

- **Backend**: Accessible at `http://localhost:5000`
- **MongoDB**: Accessible at `localhost:27017` (from host) or `mongodb:27017` (from containers)

## Volumes

Persistent data is stored in Docker volumes:

- `mongodb_data`: MongoDB database files
- `mongodb_config`: MongoDB configuration files

## Health Checks

Both services include health checks:

- **MongoDB**: Pings the database every 10 seconds
- **Backend**: Checks `/health` endpoint every 30 seconds

## Troubleshooting

### Backend Can't Connect to MongoDB

1. Check if MongoDB is healthy:
   ```bash
   docker-compose ps
   ```

2. Check MongoDB logs:
   ```bash
   docker-compose logs mongodb
   ```

3. Verify network connectivity:
   ```bash
   docker-compose exec backend ping mongodb
   ```

### Port Already in Use

If port 5000 or 27017 is already in use, change the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "5001:5000"  # Map to different host port
```

### Permission Issues

If you encounter permission errors, rebuild with:

```bash
docker-compose build --no-cache
docker-compose up -d
```

## Development with Docker

For development, you can mount the source code:

```yaml
services:
  backend:
    volumes:
      - ./src:/app/src
    command: npm run dev
```

This allows hot-reloading during development.

## Clean Up

Remove all containers, networks, and volumes:

```bash
docker-compose down -v
docker system prune -a
```
