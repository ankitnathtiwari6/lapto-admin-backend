# Automatic Stage Transitions

## Overview

The order management system now features **automatic stage transitions** based on order assignments and sub-task progress. Stages are updated automatically without manual intervention, providing a seamless workflow.

---

## Stage Transition Rules

### 1. **Order Creation**
- **Trigger**: New order is created
- **Stage**: `Pending`
- **Note**: "Order created"

### 2. **Order Assignment**
- **Trigger**: Order is assigned to a staff member (engineer/technician)
- **Stage**: `Assigned`
- **Note**: "Assigned to [Staff Name]"
- **Implementation**: [orderController.ts:579-663](backend/src/controllers/orderController.ts#L579-L663)

### 3. **Sub-Task Creation**
- **Trigger**: First sub-task is created for an order
- **Stage**: Remains current or evaluates based on sub-task states
- **Note**: Automatic evaluation triggers
- **Implementation**: [subTaskController.ts:157-168](backend/src/controllers/subTaskController.ts#L157-L168)

### 4. **Sub-Task In Progress**
- **Trigger**: Any sub-task status changes to `in_progress`
- **Stage**: `In Progress`
- **Note**: "Sub-tasks in progress"
- **Logic**: If at least one sub-task is in progress

### 5. **Sub-Tasks Partially Completed**
- **Trigger**: Some sub-tasks completed but not all
- **Stage**: `In Progress`
- **Note**: "Sub-tasks partially completed"
- **Logic**: When some tasks are done but others remain

### 6. **All Sub-Tasks Completed**
- **Trigger**: All sub-tasks reach `completed` status
- **Stage**: `Quality Check` (or `Completed` if Quality Check stage doesn't exist)
- **Note**: "All sub-tasks completed"
- **Logic**: When every sub-task is marked complete

---

## Implementation Details

### Backend Functions

#### 1. Auto-Update Order Stage Helper
Location: [subTaskController.ts:25-84](backend/src/controllers/subTaskController.ts#L25-L84)

```typescript
const autoUpdateOrderStage = async (
  orderId: string,
  userId: string,
  userName: string
): Promise<void>
```

**Logic Flow**:
1. Fetch order and all its sub-tasks
2. Analyze sub-task states:
   - `allCompleted`: All sub-tasks are completed
   - `hasInProgress`: At least one sub-task is in progress
   - `anyCompleted`: At least one sub-task is completed
3. Determine target stage based on state analysis
4. Update order stage if different from current
5. Add entry to stage history with automatic note

**Stage Priority**:
```
All Completed → Quality Check/Completed (highest priority)
Has In Progress → In Progress
Any Completed → In Progress
```

#### 2. Trigger Points

**On Sub-Task Creation**:
```typescript
// subTaskController.ts:163
await autoUpdateOrderStage(orderId, req.user.id, req.user.fullName);
```

**On Sub-Task Status Update**:
```typescript
// subTaskController.ts:320
await autoUpdateOrderStage(subTask.orderId.toString(), req.user.id, req.user.fullName);
```

### Frontend Changes

#### Removed Manual Stage Update UI
- Removed "Update Stage" card from OrderDetailPage
- Removed stage selection dropdown
- Removed manual stage update button
- Added informational text: "Stage updates automatically based on sub-task progress"

#### Updated User Feedback
- Assignment alert: "User assigned successfully! Order stage updated automatically."
- Sub-task status alert: "Sub-task status updated! Order stage updated automatically."

---

## Stage Workflow Example

### Scenario: Laptop Repair Order

1. **Order Created**
   - Stage: `Pending`
   - Action: Order is created by admin

2. **Assigned to Senior Technician**
   - Stage: `Assigned` ✓ (Automatic)
   - Action: Admin assigns order to senior tech

3. **Senior Tech Creates Sub-Tasks**
   - Sub-task 1: "Screen Diagnosis" → Assigned to Tech A
   - Sub-task 2: "Battery Check" → Assigned to Tech B
   - Sub-task 3: "Quality Check" → Assigned to Senior Tech
   - Stage: `Assigned` (remains, no tasks started yet)

4. **Tech A Starts Working**
   - Sub-task 1: Status → `in_progress`
   - Stage: `In Progress` ✓ (Automatic)

5. **Tech A Completes Screen Diagnosis**
   - Sub-task 1: Status → `completed`
   - Sub-task 2: Status → `pending`
   - Sub-task 3: Status → `pending`
   - Stage: `In Progress` (other tasks pending)

6. **Tech B Starts and Completes Battery Check**
   - Sub-task 2: Status → `in_progress` → `completed`
   - Stage: `In Progress` (Quality Check pending)

7. **Senior Tech Performs Quality Check**
   - Sub-task 3: Status → `in_progress`
   - Stage: `In Progress`

8. **Quality Check Complete**
   - Sub-task 3: Status → `completed`
   - All sub-tasks: `completed`
   - Stage: `Quality Check` or `Completed` ✓ (Automatic)

---

## Benefits

### 1. **Reduced Manual Work**
- No need to manually update stages
- Stages reflect actual work progress
- Less room for human error

### 2. **Accurate Workflow Tracking**
- Stages automatically match sub-task progress
- Real-time status updates
- Better visibility into order lifecycle

### 3. **Better UX**
- Cleaner UI without manual stage controls
- Automatic feedback messages
- Less confusion about when to update stages

### 4. **Consistent Stage History**
- Automatic stage transitions create audit trail
- Clear notes explain why stage changed
- Timestamps show exactly when changes occurred

---

## Stage History Format

Automatic stage changes are recorded with:

```typescript
{
  stageId: ObjectId,
  stageName: string,
  timestamp: Date,
  updatedBy: ObjectId,        // User who triggered the change
  updatedByName: string,
  notes: string               // Automatic note explaining reason
}
```

**Example Notes**:
- "All sub-tasks completed"
- "Sub-tasks in progress"
- "Sub-tasks partially completed"
- "Assigned to [Staff Name]"

---

## Edge Cases Handled

### No Sub-Tasks
- If order has no sub-tasks, auto-stage logic doesn't interfere
- Stage remains as manually set or based on assignment

### Sub-Task Deletion
- When sub-task is deleted, order stats update automatically
- Stage re-evaluates based on remaining sub-tasks

### Concurrent Status Updates
- Each status change triggers stage evaluation
- Stage only updates if target stage is different from current
- Prevents duplicate stage history entries

### Missing Stages
- If target stage doesn't exist (e.g., no "Quality Check" stage configured)
- Falls back to "Completed" stage
- Graceful error handling - doesn't break the flow

---

## Configuration

### Required Stages
Ensure these stages exist in your system for optimal workflow:

1. `pending` - Initial state
2. `assigned` - After staff assignment
3. `in_progress` - Work is being done
4. `quality_check` - Final verification (optional)
5. `completed` - Work finished

### Stage Slug Mapping
The system uses stage slugs to identify stages:
- `slug: 'assigned'` → When order is assigned
- `slug: 'in_progress'` → When sub-tasks are active
- `slug: 'quality_check'` → When all sub-tasks complete
- `slug: 'completed'` → Fallback if quality_check doesn't exist

---

## Future Enhancements

- [ ] Custom stage rules per company
- [ ] Stage transition webhooks/notifications
- [ ] Manual override capability for admins
- [ ] Stage approval workflows
- [ ] Stage-based permissions
- [ ] Analytics on average time per stage
- [ ] SLA tracking per stage

---

## Testing

### Manual Testing Checklist

1. ✓ Create order → Verify "Pending" stage
2. ✓ Assign order → Verify "Assigned" stage
3. ✓ Create sub-task → Verify stage remains or changes appropriately
4. ✓ Start sub-task → Verify "In Progress" stage
5. ✓ Complete one sub-task → Verify stage remains "In Progress"
6. ✓ Complete all sub-tasks → Verify "Quality Check" or "Completed" stage
7. ✓ Check stage history → Verify automatic notes are clear

---

## Support

For questions or issues with automatic stage transitions, please refer to:
- Order Controller: [orderController.ts](backend/src/controllers/orderController.ts)
- Sub-Task Controller: [subTaskController.ts](backend/src/controllers/subTaskController.ts)
- Stage Model: [Stage.ts](backend/src/models/Stage.ts)
