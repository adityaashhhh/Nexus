# Scalability Notes

This document outlines the scalability strategies and architectural decisions that can be applied to scale this REST API for production environments.

---

## 1. Horizontal Scaling

### Application Layer
- **Load Balancing**: Deploy multiple Node.js instances behind a reverse proxy (NGINX/HAProxy) to distribute traffic
- **PM2 Cluster Mode**: Use PM2's cluster mode to spawn workers equal to CPU cores:
  ```bash
  pm2 start server.js -i max
  ```
- **Stateless Design**: The API is already stateless (JWT-based auth, no server-side sessions), making it horizontally scalable out of the box

### Database Layer
- **Replica Sets**: Use MongoDB replica sets for read scalability and high availability
- **Sharding**: Shard the database across multiple servers for write scalability. The `products` collection can be sharded by `category` or `createdBy`
- **Read Replicas**: Route read-heavy queries (product listing) to secondary replicas

---

## 2. Caching Strategy

### Redis Integration
- **Session/Token Caching**: Cache JWT blacklist for logout functionality
- **API Response Caching**: Cache frequently accessed product listings with TTL
- **Rate Limiting Store**: Use Redis as the store for express-rate-limit (instead of in-memory)

### Implementation Example
```javascript
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Cache product listing
app.get('/api/v1/products', async (req, res) => {
  const cacheKey = `products:${JSON.stringify(req.query)}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) return res.json(JSON.parse(cached));
  
  const products = await Product.find(filter);
  await redis.setex(cacheKey, 300, JSON.stringify(products)); // 5min TTL
  res.json(products);
});
```

### CDN
- Serve static frontend assets via a CDN (CloudFront, Cloudflare) to reduce server load

---

## 3. Microservices Architecture

As the application grows, decompose into independent services:

| Service | Responsibility |
|---------|---------------|
| **Auth Service** | User registration, login, JWT management |
| **Product Service** | Product CRUD, search, filtering |
| **Notification Service** | Email, push notifications |
| **API Gateway** | Routing, rate limiting, authentication |

### Communication
- **Synchronous**: REST/gRPC between services
- **Asynchronous**: Message queues (RabbitMQ, Apache Kafka) for event-driven flows
  - Example: When a product is created → emit event → Notification Service sends alert

---

## 4. Database Optimization

### Indexing Strategy
Already implemented:
- `users.email` — Unique index for fast lookups
- `products.category` — Index for filtered queries
- `products.createdBy` — Index for user-specific queries
- `products.name + description` — Text index for search

### Additional Optimizations
- **Aggregation Pipeline**: Use MongoDB aggregation for complex analytics
- **Connection Pooling**: Configure Mongoose connection pool size based on load
- **Query Optimization**: Use `.lean()` for read-only queries to skip Mongoose hydration

---

## 5. Containerization & Orchestration

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  api:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/scalable-api
    depends_on:
      - mongo
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
volumes:
  mongo-data:
```

### Kubernetes
- Deploy with Kubernetes for auto-scaling, self-healing, and rolling updates
- Use Horizontal Pod Autoscaler (HPA) to scale based on CPU/memory utilization

---

## 6. Monitoring & Observability

| Tool | Purpose |
|------|---------|
| **Winston + Morgan** | Application & HTTP request logging (already implemented) |
| **Prometheus** | Metrics collection (response times, error rates) |
| **Grafana** | Visualization dashboards |
| **Sentry** | Error tracking and alerting |
| **ELK Stack** | Centralized log management |

---

## 7. CI/CD Pipeline

```
Push → GitHub Actions → Lint → Test → Build Docker → Push to Registry → Deploy to Cloud
```

### Recommended Services
- **Hosting**: AWS ECS/EKS, Google Cloud Run, Railway, or Render
- **Database**: MongoDB Atlas (managed, auto-scaling)
- **CDN**: Cloudflare for frontend assets
- **CI/CD**: GitHub Actions

---

## 8. Security at Scale

- **API Gateway** (Kong, AWS API Gateway): Centralized auth, rate limiting, and monitoring
- **WAF** (Web Application Firewall): Protect against DDoS, SQL injection, XSS
- **Secret Management**: Use AWS Secrets Manager or HashiCorp Vault instead of .env files
- **HTTPS**: Enforce TLS everywhere with auto-renewal (Let's Encrypt)
- **JWT Rotation**: Implement refresh tokens for enhanced security

---

## Summary

| Strategy | Impact | Complexity |
|----------|--------|------------|
| PM2 Cluster Mode | High | Low |
| Redis Caching | High | Medium |
| MongoDB Replica Sets | High | Medium |
| Docker/Compose | Medium | Low |
| Microservices | Very High | High |
| Kubernetes | Very High | High |
| CDN for Static Assets | Medium | Low |
| CI/CD Pipeline | High | Medium |

The current architecture is designed with scalability in mind — stateless authentication, modular codebase, and indexed database queries provide a strong foundation for growth.
