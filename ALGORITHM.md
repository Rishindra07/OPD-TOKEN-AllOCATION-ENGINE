# OPD Token Allocation Algorithm - Technical Documentation

## Algorithm Overview

The OPD Token Allocation Engine implements a sophisticated priority-queue based algorithm that manages patient appointments with dynamic reallocation capabilities. The system enforces hard slot capacity limits while intelligently handling priority upgrades and emergency cases.

## Algorithm Components

### 1. Priority Scoring System

Each token source is assigned a priority score:

```
Emergency:      100 (Highest)
Paid Priority:   80
Follow-up:       60
Online:          40
Walk-in:         20 (Lowest)
```

**Formula**: `priorityScore = PRIORITY_LEVELS[source]`

### 2. Slot State Management

Each slot maintains:
- `maxCapacity`: Hard limit on number of patients
- `currentOccupancy`: Current number of allocated tokens
- `status`: 'available' | 'full' | 'closed' | 'cancelled'
- `allocatedTokens`: Array of token references

**Capacity Rules**:
- Slot is 'available' when `currentOccupancy < maxCapacity`
- Slot is 'full' when `currentOccupancy >= maxCapacity`
- Hard limit can only be exceeded by emergency override (temporary)

### 3. Token Allocation Algorithm

```
FUNCTION allocateToken(tokenData)
  1. Calculate priority score based on source
  2. IF preferredSlotId provided
       Check if slot exists and belongs to doctor
       IF slot has capacity
         RETURN allocateToSlot(token, slot)
       ELSE
         preferredSlotId = NULL
     ENDIF
  3. IF preferredSlotId is NULL
       slot = findAvailableSlot(doctorId, appointmentTime, source)
       IF slot NOT found
         RETURN addToWaitingQueue(tokenData)
       ENDIF
     ENDIF
  4. IF slot.currentOccupancy >= slot.maxCapacity
       reallocated = reallocateLowerPriorityToken(slot, priorityScore)
       IF NOT reallocated
         RETURN addToWaitingQueue(tokenData)
       ENDIF
     ENDIF
  5. Create token and add to slot
  6. Update slot: 
       - Add token to allocatedTokens
       - Increment currentOccupancy
       - IF currentOccupancy >= maxCapacity
           Set status = 'full'
       ENDIF
  7. RETURN success with token details
END FUNCTION
```

### 4. Reallocation Algorithm

**Core Logic**: When a higher-priority patient arrives at a full slot, the lowest-priority patient is moved to the next available slot.

```
FUNCTION reallocateLowerPriorityToken(slot, newTokenPriority)
  1. Get all non-completed tokens in slot
  2. Sort tokens by priority (ascending)
  3. lowestPriorityToken = tokens[LAST]
  
  4. IF lowestPriorityToken.priority >= newTokenPriority
       RETURN false  // Can't reallocate
     ENDIF
  
  5. nextSlot = findNextAvailableSlot(slot.date + 1, doctorId)
     IF nextSlot NOT found
       RETURN false
     ENDIF
  
  6. Update lowestPriorityToken:
       - slotId = nextSlot._id
       - appointmentTime = nextSlot.startTime
       - isReallocation = true
       - originalSlotId = slot._id
     SAVE token
  
  7. Update slot:
       - Remove token from allocatedTokens
       - currentOccupancy -= 1
       - IF status = 'full' AND currentOccupancy < maxCapacity
           status = 'available'
       ENDIF
  
  8. Update nextSlot:
       - Add token to allocatedTokens
       - currentOccupancy += 1
       - IF currentOccupancy >= maxCapacity
           status = 'full'
       ENDIF
  
  9. RETURN true
END FUNCTION
```

### 5. Waiting Queue Management

**Insertion Logic**:
```
FUNCTION addToWaitingQueue(patientId, doctorId, source, priority, ...)
  1. Get all waiting entries for doctor with status='waiting'
  2. queuePosition = count + 1
  3. Create new Waiting entry with:
       - queuePosition
       - priorityScore
       - status = 'waiting'
       - expiresAt = NOW + 7 days
  4. SAVE entry
  5. RETURN with queue position
END FUNCTION
```

**Allocation from Waiting Queue**:
```
FUNCTION allocateFromWaitingQueue(doctorId)
  1. waitingList = Get all waiting entries for doctor
              Sort by: priorityScore DESC, queuePosition ASC
  
  2. FOR each patient in waitingList
       slot = findAvailableSlot(doctorId, preferredDate)
       IF slot NOT found
         BREAK  // No more slots
       ENDIF
       
       Create token and allocate to slot
       Update waiting entry: status = 'allocated'
     END FOR
  
  3. updateQueuePositions(doctorId)
END FUNCTION
```

### 6. Cancellation Handling

```
FUNCTION handleCancellation(tokenId, reason)
  1. Get token by ID
  2. IF token.status IN ['completed', 'cancelled', 'no_show']
       RETURN error
     ENDIF
  
  3. token.status = 'cancelled'
     token.cancellationReason = reason
     SAVE token
  
  4. slot = Get slot by token.slotId
     IF slot exists
       - Remove token from allocatedTokens
       - currentOccupancy -= 1
       - IF status = 'full' AND currentOccupancy < maxCapacity
           status = 'available'
       ENDIF
       SAVE slot
     ENDIF
  
  5. allocateFromWaitingQueue(token.doctorId)
  6. RETURN success
END FUNCTION
```

### 7. No-Show Handling

```
FUNCTION handleNoShow(tokenId)
  1. token.status = 'no_show'
     SAVE token
  
  2. Update slot (same as cancellation)
  
  3. allocateFromWaitingQueue(doctorId)
  4. RETURN success
END FUNCTION
```

### 8. Emergency Handling

```
FUNCTION handleEmergency(emergencyTokenData)
  1. Get current active slot for doctor
     IF no active slot
       RETURN error
     ENDIF
  
  2. priorityScore = EMERGENCY_PRIORITY (100)
  
  3. IF slot.currentOccupancy >= slot.maxCapacity
       reallocated = reallocateLowerPriorityToken(slot, priorityScore)
       IF NOT reallocated
         RETURN error
       ENDIF
     ENDIF
  
  4. Create emergency token with:
       - tokenNumber = "EMG-" + timestamp
       - source = 'emergency'
       - priorityScore = 100
       - appointmentTime = NOW
  
  5. Add token to slot and update occupancy
  6. RETURN token with fast-track status
END FUNCTION
```

## Algorithm Complexity Analysis

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Allocate Token | O(n log n) | n = tokens in slot; sorting required |
| Find Available Slot | O(s log s) | s = total slots; indexed query |
| Reallocate | O(n + m) | m = tokens in next slot |
| Waiting Queue Ops | O(w log w) | w = waiting patients |
| Cancellation | O(w) | Need to update queue positions |

### Space Complexity
- O(s + t + w) where:
  - s = total slots
  - t = total tokens
  - w = waiting patients

## Edge Cases Handled

### 1. Slot Full with Emergency
**Scenario**: Emergency patient arrives when slot is completely full
**Solution**: Reallocate lowest-priority patient to next available slot

### 2. No Available Future Slots
**Scenario**: All future slots are full
**Solution**: Add to waiting queue; allocate when any slot becomes available

### 3. Multiple Cancellations
**Scenario**: Multiple patients cancel; need to allocate multiple waiting patients
**Solution**: Allocate waiting patients in priority order until slots are filled

### 4. Doctor Goes Off-Duty
**Scenario**: Doctor becomes unavailable; all appointments must be rescheduled
**Solution**: Bulk cancel slot, add all tokens to waiting queue, trigger reallocation

### 5. No-Show + Emergency
**Scenario**: Token marked as no-show; emergency patient arrives same slot
**Solution**: Immediately free slot, allocate emergency to current slot

### 6. Priority Inversion
**Scenario**: Walk-in patient in slot, online booking requests earlier slot
**Solution**: Can't move online booking earlier; must wait for next available slot

### 7. Queue Degradation
**Scenario**: Waiting patients expire (7 day limit)
**Solution**: Automatically mark as 'expired', update queue positions

### 8. Duplicate Requests
**Scenario**: Patient requests multiple tokens simultaneously
**Solution**: Each request is processed independently; patient may be in multiple slots/queue

## Optimization Strategies

### 1. Database Indexes
```javascript
// Token indexes
tokenSchema.index({ patientId: 1, status: 1 });
tokenSchema.index({ doctorId: 1, appointmentTime: 1 });
tokenSchema.index({ slotId: 1 });

// Slot indexes
slotSchema.index({ doctorId: 1, date: 1 });
slotSchema.index({ status: 1 });

// Waiting indexes
waitingSchema.index({ doctorId: 1, status: 1 });
waitingSchema.index({ queuePosition: 1 });
```

### 2. Query Optimization
- Use lean() queries where document modification not needed
- Populate only necessary fields
- Use sorting in query instead of application level

### 3. Caching Opportunities
- Cache active slots for doctors
- Cache waiting queue positions
- Invalidate on changes

## Simulation Results

The algorithm successfully handles:
- ✓ 10+ concurrent patients in single slot
- ✓ Automatic reallocation on priority change
- ✓ Emergency fast-tracking with reallocation
- ✓ Waiting queue management and allocation
- ✓ Cancellation with queue promotion
- ✓ Slot status transitions (available → full → available)

## Practical Trade-offs

1. **Determinism vs Fairness**
   - Trade-off: Deterministic priority system may create inequity
   - Solution: Allow admin to manually adjust priorities or add notes

2. **Immediate Allocation vs Waiting**
   - Trade-off: Emergency overrides can inconvenience others
   - Solution: Only for true emergencies; admin review for borderline cases

3. **Reallocation Frequency**
   - Trade-off: Too frequent = patient dissatisfaction; Too rare = low utilization
   - Solution: Balance with monitoring and feedback

4. **Waiting Queue Capacity**
   - Trade-off: Unlimited = false hope; Limited = denial of service
   - Solution: Set expiry to 7 days; auto-notify if queue > 10

5. **Slot Buffer**
   - Trade-off: No buffer = cannot accommodate emergencies; Large buffer = low utilization
   - Solution: Keep 10-20% buffer for emergency slots

## Future Algorithm Enhancements

1. **Machine Learning Prediction**
   - Predict no-shows based on patient history
   - Predict slot duration more accurately

2. **Dynamic Priority Adjustment**
   - Adjust priority based on wait time
   - Increase priority if patient has waited > 2 hours

3. **Load Balancing**
   - Distribute patients across multiple doctors
   - Consider doctor workload in reallocation

4. **Predictive Availability**
   - Use historical data to predict slot availability
   - Pre-allocate based on patterns

5. **Smart Reallocation**
   - Consider patient travel time in reallocation
   - Prefer nearby slots for displaced patients

## References

- Priority Queue Implementation: O(log n) insertion/deletion
- Graph-based Slot Transitions for optimization
- Queueing Theory for waiting time analysis
- Load Balancing algorithms for multi-doctor scenarios
