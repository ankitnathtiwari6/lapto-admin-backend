# Docker Setup for Lapto Admin Backend

This guide explains how to run the Lapto Admin backend using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10 or later
- Docker Compose 2.0 or later
- MongoDB Atlas account with a cluster set up

## Quick Start

### 1. Environment Configuration

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Update the `.env` file with your MongoDB Atlas connection string and other configuration:

```env
NODE_ENV=production
PORT=5000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/lapto

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

### 2. Start the Backend

Start the backend API:

```bash
docker-compose up -d
```

This will:
- Build the backend Docker image
- Start the backend service in detached mode
- Connect to your MongoDB Atlas cluster

### 3. View Logs

To view backend logs:

```bash
docker-compose logs -f
```

Or specifically:

```bash
docker-compose logs -f backend
```

### 4. Check Service Health

Check if the backend is running:

```bash
docker-compose ps
```

Test the backend health endpoint:

```bash
curl http://localhost:5000/health
```

## Docker Commands

### Stop the Backend

```bash
docker-compose down
```

### Rebuild and Restart

After making code changes:

```bash
docker-compose up -d --build
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

1. Use your production MongoDB Atlas cluster connection string
2. Use strong passwords for `LAPTO_ADMIN_PASSWORD`
3. Generate a secure `JWT_SECRET` (use `openssl rand -base64 32`)
4. Set appropriate `CORS_ORIGIN` to your frontend domain
5. Use HTTPS in production
6. Whitelist your server's IP address in MongoDB Atlas Network Access

### Docker Compose Override for Production

Create a `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    environment:
      NODE_ENV: production
    restart: always
```

Run with:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Networking

- **Backend**: Accessible at `http://localhost:5000`
- The backend connects to MongoDB Atlas via the internet

## Health Checks

The backend service includes a health check:

- **Backend**: Checks `/health` endpoint every 30 seconds

## Troubleshooting

### Backend Can't Connect to MongoDB Atlas

1. Verify your MongoDB Atlas connection string in `.env`:
   ```bash
   cat .env | grep MONGODB_URI
   ```

2. Check backend logs for connection errors:
   ```bash
   docker-compose logs backend
   ```

3. Ensure your IP address is whitelisted in MongoDB Atlas:
   - Go to MongoDB Atlas Dashboard
   - Navigate to Network Access
   - Add your server's IP address or use `0.0.0.0/0` for testing (not recommended for production)

4. Verify MongoDB Atlas credentials are correct in the connection string

### Port Already in Use

If port 5000 is already in use, change the port mapping in `docker-compose.yml`:

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

Remove container and images:

```bash
docker-compose down
docker system prune -a
```

## Important Notes

- This setup uses MongoDB Atlas, so ensure your cluster is always accessible
- Network Access in MongoDB Atlas must include your Docker host's IP address
- For local development, you can use `0.0.0.0/0` in MongoDB Atlas Network Access (allow from anywhere)
- For production, restrict access to specific IP addresses
- The container connects to MongoDB Atlas over the internet, so ensure proper security measures are in place
