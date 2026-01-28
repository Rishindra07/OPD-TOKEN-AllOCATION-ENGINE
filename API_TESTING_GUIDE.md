# API Testing Guide - OPD Token Allocation Engine

## Quick Start

### 1. Start the Server
```bash
npm run dev
# or
npm start
```

Server runs on: `http://localhost:5000`
API Docs: `http://localhost:5000/api/docs`

### 2. Seed Test Data
```bash
npm run seed
```

This creates:
- 1 Admin user
- 1 Receptionist user
- 3 Doctors
- 5 Patients
- Slots for 7 days with 4 slots per day per doctor

### 3. Access API Documentation
Visit: `http://localhost:5000/api/docs`

## Test Credentials

```
ADMIN:
Email: admin@opd.com
Password: admin123

DOCTOR 1:
Email: doctor1@opd.com
Password: doctor123

DOCTOR 2:
Email: doctor2@opd.com
Password: doctor123

DOCTOR 3:
Email: doctor3@opd.com
Password: doctor123

PATIENT 1:
Email: patient1@opd.com
Password: patient123

PATIENT 2:
Email: patient2@opd.com
Password: patient123
```

## API Test Scenarios

### Scenario 1: User Registration and Login

#### 1.1 Register New Patient
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "patient",
  "phone": "9876543210"
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "userId": "mongodb_id"
}
```

#### 1.2 Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "patient1@opd.com",
  "password": "patient123"
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "mongodb_id",
    "name": "Patient 1",
    "email": "patient1@opd.com",
    "role": "patient"
  }
}
```

**Save the token for subsequent requests:**
```
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Scenario 2: Doctor Management

#### 2.1 Register as Doctor
```bash
POST /api/doctors/register
Authorization: Bearer <DOCTOR_TOKEN>
Content-Type: application/json

{
  "specialization": "General",
  "licenseNumber": "LIC-12345",
  "department": "General",
  "qualifications": "MBBS, MD",
  "experience": 5,
  "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
}
```

#### 2.2 Get Doctor Profile
```bash
GET /api/doctors/doctor-id-here
```

#### 2.3 List All Doctors
```bash
GET /api/doctors?specialization=General&isAvailable=true
```

#### 2.4 Get Doctor Slots
```bash
GET /api/doctors/doctor-id-here/slots?date=2024-01-30
```

#### 2.5 Get Doctor Statistics
```bash
GET /api/doctors/doctor-id-here/stats
```

**Expected Response**:
```json
{
  "success": true,
  "stats": {
    "totalTokens": 45,
    "todayTokens": 12,
    "completed": 40,
    "cancelled": 3,
    "noShow": 2,
    "booked": 10,
    "cancellationRate": "6.67"
  }
}
```

---

### Scenario 3: Slot Availability

#### 3.1 Check Slot Availability for a Date
```bash
GET /api/tokens/availability?doctorId=doctor-id-here&date=2024-01-30
```

**Expected Response**:
```json
{
  "success": true,
  "date": "2024-01-30",
  "availableSlots": 3,
  "totalSlots": 4,
  "slots": [
    {
      "slotId": "mongodb_id",
      "startTime": "2024-01-30T09:00:00.000Z",
      "endTime": "2024-01-30T10:00:00.000Z",
      "maxCapacity": 10,
      "currentOccupancy": 7,
      "availableSpots": 3,
      "status": "available"
    },
    {
      "slotId": "mongodb_id",
      "startTime": "2024-01-30T10:00:00.000Z",
      "endTime": "2024-01-30T11:00:00.000Z",
      "maxCapacity": 10,
      "currentOccupancy": 10,
      "availableSpots": 0,
      "status": "full"
    }
  ]
}
```

---

### Scenario 4: Token Allocation (Core Algorithm)

#### 4.1 Request Online Token
```bash
POST /api/tokens
Authorization: Bearer <PATIENT_TOKEN>
Content-Type: application/json

{
  "doctorId": "doctor-id-here",
  "source": "online",
  "preferredSlotId": "slot-id-here",
  "appointmentTime": "2024-01-30T09:00:00Z",
  "reason": "General checkup",
  "notes": "No allergies"
}
```

**Expected Response**:
```json
{
  "success": true,
  "token": {
    "_id": "token_id",
    "tokenNumber": "TKN-1706521800000-123",
    "patientId": "patient_id",
    "doctorId": "doctor_id",
    "slotId": "slot_id",
    "source": "online",
    "priorityScore": 40,
    "status": "booked",
    "appointmentTime": "2024-01-30T09:00:00.000Z",
    "reason": "General checkup",
    "notes": "No allergies",
    "isReallocation": false
  },
  "slotId": "slot_id",
  "message": "Token allocated successfully"
}
```

#### 4.2 Request Walk-in Token
```bash
POST /api/tokens
Authorization: Bearer <PATIENT_TOKEN>
Content-Type: application/json

{
  "doctorId": "doctor-id-here",
  "source": "walk_in",
  "appointmentTime": "2024-01-30T10:00:00Z",
  "reason": "Emergency consultation"
}
```

#### 4.3 Request Paid Priority Token
```bash
POST /api/tokens
Authorization: Bearer <PATIENT_TOKEN>
Content-Type: application/json

{
  "doctorId": "doctor-id-here",
  "source": "paid_priority",
  "preferredSlotId": "slot-id-here",
  "appointmentTime": "2024-01-30T09:00:00Z",
  "reason": "Priority consultation",
  "notes": "Paid priority booking"
}
```

#### 4.4 Get Token Details
```bash
GET /api/tokens/token-id-here
Authorization: Bearer <TOKEN>
```

#### 4.5 Check Token Status
```bash
GET /api/tokens/check/token-id-here
```

**Expected Response**:
```json
{
  "success": true,
  "token": {
    "tokenNumber": "TKN-1706521800000-123",
    "status": "booked",
    "doctor": {
      "_id": "doctor_id",
      "name": "Dr. Doctor 1"
    },
    "appointmentTime": "2024-01-30T09:00:00.000Z",
    "timeUntilAppointment": 240,
    "checkedIn": false,
    "completed": false
  }
}
```

#### 4.6 Get Patient's Tokens
```bash
GET /api/tokens/patient/my-tokens?status=booked
Authorization: Bearer <PATIENT_TOKEN>
```

---

### Scenario 5: Waiting Queue

#### 5.1 Check Waiting Status
```bash
GET /api/tokens/waiting-status?doctorId=doctor-id-here
Authorization: Bearer <PATIENT_TOKEN>
```

**Expected Response**:
```json
{
  "success": true,
  "queuePosition": 3,
  "estimatedWaitTime": 30
}
```

If patient is not in queue:
```json
{
  "success": false,
  "message": "Patient not in waiting queue"
}
```

---

### Scenario 6: Cancellation

#### 6.1 Check If Cancellation Is Allowed
```bash
GET /api/cancellations/check/token-id-here
```

**Expected Response**:
```json
{
  "success": true,
  "canCancel": true,
  "hoursUntilAppointment": 25,
  "message": "Cancellation allowed without penalty"
}
```

#### 6.2 Cancel Token
```bash
DELETE /api/cancellations/token-id-here
Authorization: Bearer <PATIENT_TOKEN>
Content-Type: application/json

{
  "reason": "Unable to attend"
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Token cancelled and slot reallocated",
  "freedSlot": {
    "slotId": "slot_id",
    "appointmentTime": "2024-01-30T09:00:00.000Z"
  }
}
```

#### 6.3 Get Cancellation History
```bash
GET /api/cancellations/history
Authorization: Bearer <PATIENT_TOKEN>
```

#### 6.4 Request Refund
```bash
POST /api/cancellations/refund/token-id-here
Authorization: Bearer <PATIENT_TOKEN>
```

**Expected Response**:
```json
{
  "success": true,
  "refundPercentage": 100,
  "message": "Refund approved: 100%"
}
```

---

### Scenario 7: Emergency Handling

#### 7.1 Request Emergency Token
```bash
POST /api/emergency/request
Authorization: Bearer <PATIENT_TOKEN>
Content-Type: application/json

{
  "doctorId": "doctor-id-here",
  "severity": "critical",
  "reason": "Chest pain",
  "notes": "Patient experiencing acute symptoms"
}
```

**Expected Response**:
```json
{
  "success": true,
  "emergency": {
    "patientId": "patient_id",
    "doctorId": "doctor_id",
    "severity": "critical",
    "reason": "Chest pain",
    "priorityScore": 100,
    "status": "pending"
  },
  "message": "Emergency request received. Severity: critical"
}
```

#### 7.2 Fast-Track Emergency Patient
```bash
POST /api/emergency/fast-track
Authorization: Bearer <PATIENT_TOKEN>
Content-Type: application/json

{
  "doctorId": "doctor-id-here",
  "reason": "Life-threatening condition",
  "notes": "Immediate attention required"
}
```

**Expected Response**:
```json
{
  "success": true,
  "token": {
    "tokenNumber": "EMG-1706521800000-123",
    "status": "booked",
    "source": "emergency",
    "priorityScore": 100,
    "appointmentTime": "2024-01-30T09:15:30.000Z"
  },
  "message": "Emergency token allocated and fast-tracked"
}
```

#### 7.3 Get Current Slot
```bash
GET /api/emergency/current-slot?doctorId=doctor-id-here
```

#### 7.4 Get Emergency Statistics
```bash
GET /api/emergency/stats?doctorId=doctor-id-here
```

**Expected Response**:
```json
{
  "success": true,
  "stats": {
    "totalEmergencies": 5,
    "todayEmergencies": 2,
    "avgWaitTime": 8,
    "completionRate": 4,
    "noShowRate": 0
  }
}
```

---

### Scenario 8: Token Status Update

#### 8.1 Check In Token
```bash
PATCH /api/tokens/token-id-here/status
Authorization: Bearer <DOCTOR_TOKEN>
Content-Type: application/json

{
  "status": "checked_in"
}
```

#### 8.2 Mark Token as Completed
```bash
PATCH /api/tokens/token-id-here/status
Authorization: Bearer <DOCTOR_TOKEN>
Content-Type: application/json

{
  "status": "completed"
}
```

#### 8.3 Mark Token as No-Show
```bash
POST /api/cancellations/no-show/token-id-here
Authorization: Bearer <DOCTOR_TOKEN>
```

---

## Advanced Testing Scenarios

### Scenario A: Full Slot Allocation with Reallocation

1. Fill a slot with 10 online bookings (max capacity = 10)
   - Result: Slot status changes to 'full'

2. Request a paid_priority token for the same slot
   - Expected: Lowest-priority online booking is moved to next slot
   - New priority token is allocated to original slot

3. Request an emergency token for the same slot
   - Expected: Another lowest-priority token is reallocated
   - Emergency token takes its place

### Scenario B: Waiting Queue Management

1. Fill a slot completely
2. Create 5 walk-in token requests
   - Expected: All 5 added to waiting queue at positions 1-5

3. Cancel one token from the filled slot
   - Expected: Highest-priority waiting patient automatically allocated
   - Remaining waiting positions updated (now 1-4)

4. Cancel another token
   - Expected: Next highest-priority patient allocated
   - Positions updated again

### Scenario C: Doctor Unavailability

1. Doctor suddenly becomes unavailable
2. Bulk cancel slot with reason "Doctor emergency"
   - Expected: All tokens in slot marked as cancelled
   - All patients added to waiting queue

3. System attempts to reallocate from waiting queue to other available slots

### Scenario D: Multiple Doctors Scenario

1. Create token request for Doctor 1 (full)
2. Request immediately reallocates to next available slot
3. Check if multiple doctors' slots are handled correctly
4. Verify reallocation considers all doctors' schedules

---

## Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (token allocated, user registered) |
| 400 | Bad Request (missing/invalid data) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found (token, slot, doctor not found) |
| 500 | Internal Server Error |

---

## Common Errors and Solutions

### Error: "Slot not found"
**Cause**: Invalid slotId
**Solution**: Use /api/tokens/availability endpoint to get valid slots

### Error: "No slot available"
**Cause**: All slots are full
**Solution**: Patient is added to waiting queue automatically

### Error: "Cannot cancel a completed token"
**Cause**: Trying to cancel a completed or already cancelled token
**Solution**: Only booked or checked_in tokens can be cancelled

### Error: "User already registered"
**Cause**: Email already exists in database
**Solution**: Use different email or login with existing credentials

### Error: "Invalid token"
**Cause**: JWT token expired or tampered
**Solution**: Login again to get new token

---

## Performance Testing

### Load Test with Multiple Concurrent Requests

```bash
# Install autocannon
npm install -g autocannon

# Run load test
autocannon -c 10 -d 30 http://localhost:5000/health
```

### Database Query Performance

Monitor slow queries:
```bash
# In MongoDB
db.setProfilingLevel(1)
db.system.profile.find().limit(5).sort({ ts : -1 }).pretty()
```

---

## Debugging Tips

### Enable Debug Logging
```bash
LOG_LEVEL=debug npm run dev
```

### Check Database Data
```bash
mongosh
use opd_token_system
db.tokens.find().pretty()
db.slots.find().pretty()
db.waitings.find().pretty()
```

### Test with curl

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient1@opd.com","password":"patient123"}' | jq -r '.token')

# Use token in request
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/auth/profile
```

---

## API Response Time Benchmarks

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Register User | < 100ms | Includes password hashing |
| Login | < 50ms | JWT generation |
| Allocate Token | < 200ms | Includes slot/queue checks |
| Get Availability | < 100ms | Database query |
| Cancel Token | < 150ms | Includes reallocation |
| Emergency Fast-track | < 300ms | May include reallocation |
