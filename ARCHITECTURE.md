# OPD Token Allocation Engine - Architecture & Deployment Guide

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client Applications                          │
│         (Web Dashboard, Mobile App, Kiosk, Admin Portal)        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    HTTP/HTTPS REST API
                             │
┌─────────────────────────────┴────────────────────────────────────┐
│                      Express.js Server                           │
│                    (Port 5000 by default)                        │
└───────┬───────────────────────────────────────────────┬──────────┘
        │                                               │
    ┌───┴─────────────────────────────────┐     ┌──────┴─────────┐
    │   Request/Response Pipeline         │     │  Swagger Docs  │
    │                                     │     │  API Explorer  │
    │  1. Authentication Middleware       │     └────────────────┘
    │  2. Role-Based Access Control       │
    │  3. Request Validation              │
    │  4. Business Logic Layer            │
    │  5. Database Operations             │
    │  6. Response Formatting             │
    └───┬─────────────────────────────────┘
        │
    ┌───┴──────────────────────────────────────┐
    │     Application Layer                    │
    ├──────────────────────────────────────────┤
    │  Controllers:                            │
    │  - AuthController                        │
    │  - TokenController                       │
    │  - DoctorController                      │
    │  - CancellationController                │
    │  - EmergencyController                   │
    └───┬──────────────────────────────────────┘
        │
    ┌───┴──────────────────────────────────────┐
    │     Business Logic Layer                 │
    ├──────────────────────────────────────────┤
    │  Services:                               │
    │  - AllocationService (Core Algorithm)    │
    │  - WaitingQueueService                   │
    │  - CancellationService                   │
    │  - EmergencyService                      │
    └───┬──────────────────────────────────────┘
        │
    ┌───┴──────────────────────────────────────┐
    │     Data Access Layer                    │
    ├──────────────────────────────────────────┤
    │  Mongoose Models:                        │
    │  - User                                  │
    │  - Doctor                                │
    │  - Slot                                  │
    │  - Token                                 │
    │  - Waiting                               │
    └───┬──────────────────────────────────────┘
        │
    ┌───┴──────────────────────────────────────┐
    │      MongoDB Database                    │
    ├──────────────────────────────────────────┤
    │  Collections:                            │
    │  - users (with indexes)                  │
    │  - doctors                               │
    │  - slots (with compound indexes)         │
    │  - tokens (with multiple indexes)        │
    │  - waitings (with priority indexes)      │
    └──────────────────────────────────────────┘
```

## Module Structure

### Controllers Layer
```
controllers/
├── authController.js
│   ├── register()
│   ├── login()
│   ├── getProfile()
│   ├── updateProfile()
│   └── changePassword()
│
├── tokenController.js
│   ├── requestToken()
│   ├── getToken()
│   ├── getPatientTokens()
│   ├── updateTokenStatus()
│   ├── getSlotAvailability()
│   ├── getWaitingStatus()
│   ├── checkTokenStatus()
│   └── getSlotTokens()
│
├── doctorController.js
│   ├── registerDoctor()
│   ├── getDoctorProfile()
│   ├── updateDoctorProfile()
│   ├── listDoctors()
│   ├── toggleAvailability()
│   ├── getDoctorSlots()
│   └── getDoctorStats()
│
├── cancellationController.js
│   ├── checkCancellation()
│   ├── cancelToken()
│   ├── bulkCancelSlot()
│   ├── getCancellationHistory()
│   ├── getCancellationStats()
│   ├── requestRefund()
│   └── handleNoShow()
│
└── emergencyController.js
    ├── requestEmergency()
    ├── fastTrackEmergency()
    ├── getCurrentSlot()
    ├── getEmergencyStats()
    ├── overrideSlotRules()
    └── allocateEmergency()
```

### Services Layer (Business Logic)
```
services/
├── allocationService.js
│   ├── allocateToken()
│   ├── findAvailableSlot()
│   ├── reallocateLowerPriorityToken()
│   ├── findNextAvailableSlotAfter()
│   ├── addToWaitingQueue()
│   ├── handleCancellation()
│   ├── allocateFromWaitingQueue()
│   ├── updateQueuePositions()
│   ├── handleNoShow()
│   ├── handleEmergency()
│   └── generateTokenNumber()
│
├── waitingQueueService.js
│   ├── getWaitingQueue()
│   ├── getQueuePosition()
│   ├── cancelWaiting()
│   ├── movePatientInQueue()
│   ├── updateQueuePositions()
│   ├── cleanExpiredEntries()
│   └── getQueueStats()
│
├── cancellationService.js
│   ├── requestCancellation()
│   ├── processCancellation()
│   ├── bulkCancelSlot()
│   ├── getCancellationHistory()
│   ├── getCancellationStats()
│   └── requestRefund()
│
└── emergencyService.js
    ├── requestEmergency()
    ├── getCurrentSlot()
    ├── handleEmergencyReallocation()
    ├── fastTrackEmergency()
    ├── getEmergencyStats()
    └── overrideSlotRules()
```

### Models Layer (Data Schemas)
```
models/
├── User.js
│   ├── name
│   ├── email (unique)
│   ├── password (hashed)
│   ├── role (patient, doctor, admin, receptionist)
│   ├── phone
│   ├── status
│   └── timestamps
│
├── Doctor.js
│   ├── userId (ref to User)
│   ├── specialization
│   ├── licenseNumber (unique)
│   ├── department
│   ├── qualifications
│   ├── experience
│   ├── averageConsultationTime
│   ├── isAvailable
│   ├── workingDays
│   └── timestamps
│
├── Slot.js
│   ├── doctorId (ref to Doctor)
│   ├── startTime
│   ├── endTime
│   ├── date
│   ├── day
│   ├── maxCapacity
│   ├── currentOccupancy
│   ├── status
│   ├── allocatedTokens (array of Token refs)
│   └── indexes: [doctorId, date], [status], [date]
│
├── Token.js
│   ├── tokenNumber (unique)
│   ├── patientId (ref to User)
│   ├── doctorId (ref to Doctor)
│   ├── slotId (ref to Slot)
│   ├── source
│   ├── priorityScore
│   ├── status
│   ├── appointmentTime
│   ├── reason
│   ├── notes
│   ├── isReallocation
│   ├── originalSlotId
│   ├── cancellationReason
│   ├── checkedInAt
│   ├── completedAt
│   └── indexes: [patientId, status], [doctorId, appointmentTime], [slotId], [tokenNumber]
│
└── Waiting.js
    ├── patientId (ref to User)
    ├── doctorId (ref to Doctor)
    ├── source
    ├── priorityScore
    ├── preferredDate
    ├── reason
    ├── status
    ├── queuePosition
    ├── notes
    ├── allocatedTokenId (ref to Token)
    ├── expiresAt
    └── indexes: [doctorId, status], [patientId], [status], [queuePosition]
```

## Data Flow Diagrams

### Token Allocation Flow
```
POST /api/tokens
    │
    ├─→ Auth Middleware
    │   └─→ Validate JWT token
    │
    ├─→ Validation Layer
    │   └─→ Check required fields
    │
    ├─→ TokenController.requestToken()
    │   └─→ Call AllocationService.allocateToken()
    │
    └─→ AllocationService
        │
        ├─→ Calculate priority score
        │
        ├─→ Check preferred slot capacity
        │   ├─ YES: Allocate directly
        │   └─ NO: Find next available slot
        │
        ├─→ If no available slot
        │   └─→ Add to WaitingQueue
        │
        ├─→ If slot full but lower priority exists
        │   ├─→ Reallocate lower priority token
        │   ├─→ Create new token in original slot
        │   └─→ Update both slots
        │
        └─→ Return success/failure response
```

### Cancellation & Recovery Flow
```
DELETE /api/cancellations/token-id
    │
    ├─→ Auth & Validation
    │
    ├─→ CancellationController.cancelToken()
    │
    └─→ CancellationService
        │
        ├─→ Check if cancellation allowed (24h rule)
        │
        ├─→ Update token status → 'cancelled'
        │
        ├─→ Free up slot
        │   ├─→ Remove token from allocatedTokens
        │   ├─→ Decrement currentOccupancy
        │   └─→ Set status = 'available' if needed
        │
        ├─→ AllocationService.allocateFromWaitingQueue()
        │   │
        │   ├─→ Get waiting list sorted by priority
        │   │
        │   ├─→ For each waiting patient
        │   │   ├─→ Find available slot
        │   │   ├─→ Create token
        │   │   ├─→ Update waiting status → 'allocated'
        │   │   └─→ Break if no more slots
        │   │
        │   └─→ Update queue positions
        │
        └─→ Return success response
```

## Deployment Guide

### Prerequisites
- Node.js v14+ 
- MongoDB 4.4+
- npm or yarn
- Environment variables configured

### Local Development Setup

1. **Clone Repository**
   ```bash
   git clone <repository>
   cd OPD-backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start MongoDB**
   ```bash
   mongod
   # or use MongoDB Atlas connection string
   ```

5. **Seed Database (Optional)**
   ```bash
   npm run seed
   ```

6. **Start Server**
   ```bash
   npm run dev
   ```

### Docker Deployment

**Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

EXPOSE 5000

CMD ["node", "src/server.js"]
```

**Docker Compose**
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo_data:/data/db

  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      MONGODB_URI: mongodb://root:password@mongodb:27017/opd_token_system
      JWT_SECRET: your_secret_key
      NODE_ENV: development
    depends_on:
      - mongodb

volumes:
  mongo_data:
```

**Deploy**
```bash
docker-compose up -d
```

### Production Deployment

#### 1. Environment Setup
```bash
# .env (Production)
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/opd_token_system
JWT_SECRET=very-long-secret-key-minimum-32-characters
NODE_ENV=production
```

#### 2. Start with PM2
```bash
npm install -g pm2

pm2 start src/server.js --name "opd-api"
pm2 save
pm2 startup
```

#### 3. Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name api.opd.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 4. SSL/TLS with Let's Encrypt
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d api.opd.com
```

#### 5. Health Monitoring
```bash
pm2 monit
pm2 logs opd-api
```

### Database Optimization for Production

#### 1. Create Indexes
```javascript
// Token indexes
db.tokens.createIndex({ patientId: 1, status: 1 })
db.tokens.createIndex({ doctorId: 1, appointmentTime: 1 })
db.tokens.createIndex({ slotId: 1 })
db.tokens.createIndex({ tokenNumber: 1 })

// Slot indexes
db.slots.createIndex({ doctorId: 1, date: 1 })
db.slots.createIndex({ status: 1 })

// Waiting indexes
db.waitings.createIndex({ doctorId: 1, status: 1 })
db.waitings.createIndex({ queuePosition: 1 })
```

#### 2. Enable Sharding (for large datasets)
```javascript
sh.enableSharding("opd_token_system")
sh.shardCollection("opd_token_system.tokens", { doctorId: 1, date: 1 })
```

#### 3. Set Up Backups
```bash
# Daily backup at 2 AM
0 2 * * * mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/opd_token_system" --out=/backups/opd-$(date +\%Y\%m\%d)
```

## Monitoring & Logging

### Application Monitoring

```javascript
// Example monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});
```

### Key Metrics to Monitor
- API response time (target: < 200ms)
- Database query time
- Token allocation success rate
- Queue wait times
- System resource usage
- Error rates

### Logging Strategy
```
logs/
├── error.log      (All errors)
├── combined.log   (All requests)
└── performance.log (Slow queries)
```

## Security Best Practices

1. **JWT Secrets**
   - Use environment variables
   - Rotate regularly
   - Minimum 32 characters

2. **Password Hashing**
   - Use bcryptjs (already implemented)
   - Salt rounds: 10 (configured)

3. **Rate Limiting**
   - Implement for auth endpoints
   - 5 failed login attempts = 15 min block

4. **Input Validation**
   - Use Joi (already implemented)
   - Validate all input data

5. **CORS Configuration**
   ```javascript
   app.use(cors({
     origin: process.env.ALLOWED_ORIGINS || '*',
     credentials: true
   }));
   ```

6. **HTTPS Only**
   ```javascript
   if (process.env.NODE_ENV === 'production') {
     app.use((req, res, next) => {
       if (req.header('x-forwarded-proto') !== 'https') {
         res.redirect(`https://${req.header('host')}${req.url}`);
       } else {
         next();
       }
     });
   }
   ```

## Performance Optimization

### Caching Strategy
```javascript
// Cache available slots (1 hour)
const slots = await Slot.find(query).cache(3600);

// Cache doctor profile
const doctor = await Doctor.findById(id).cache(1800);
```

### Database Query Optimization
- Use indexes (already configured)
- Use projection to limit fields
- Use pagination for list endpoints
- Use aggregation for statistics

### API Response Compression
```javascript
const compression = require('compression');
app.use(compression());
```

## Scalability Considerations

### Horizontal Scaling
1. Load balance across multiple instances
2. Use MongoDB replica sets
3. Cache layer with Redis
4. Message queue for async operations

### Vertical Scaling
1. Increase server resources
2. Database optimization
3. Connection pooling
4. Memory management

## Disaster Recovery

### Backup Strategy
- Daily full backups
- Hourly incremental backups
- Cross-region replication
- Test restore procedures monthly

### Incident Response
1. Monitor error rates
2. Automatic alerts at thresholds
3. Rollback procedures
4. Communication plan

## API Versioning

```
/api/v1/tokens       (Current stable)
/api/v2/tokens       (New features - beta)
```

## Cost Optimization

### Development
- Free MongoDB tier (limits apply)
- Single instance server
- Basic monitoring

### Production
- MongoDB Atlas M10+
- Multi-node deployment
- CDN for assets
- Comprehensive monitoring

## Support & Maintenance

### Update Strategy
1. Security patches: Immediate
2. Bug fixes: Within 48 hours
3. Features: Scheduled releases
4. Dependencies: Monthly review

### Documentation Updates
- API changes documented immediately
- Architecture docs updated quarterly
- User guides maintained continuously

## Compliance & Standards

- RESTful API design
- OpenAPI 3.0 specification
- Data protection regulations
- HIPAA compliance (if required)

## Contact & Support

For deployment issues or questions:
- Email: ops@opd.com
- Slack: #opd-backend-ops
- On-call: +1-XXX-XXX-XXXX
