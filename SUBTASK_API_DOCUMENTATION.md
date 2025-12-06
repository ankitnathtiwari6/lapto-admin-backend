# Sub-Task Management System - API Documentation

## Overview

The Sub-Task Management System allows for hierarchical task delegation within orders. Staff members can break down orders into smaller sub-tasks and assign them to other team members, enabling better workload distribution and progress tracking.

## Key Features

- ✅ Create and manage sub-tasks for orders
- ✅ Hierarchical task delegation (nested sub-tasks)
- ✅ Real-time progress tracking
- ✅ Time and cost estimation vs actuals
- ✅ Parts/materials tracking per sub-task
- ✅ Complete audit trail with updates history
- ✅ Staff performance analytics
- ✅ Dependency management
- ✅ Automatic order progress calculation

## Data Model

### SubTask Schema

```typescript
{
  orderId: ObjectId,              // Reference to parent order
  orderNumber: string,             // For quick reference

  // Hierarchy
  parentTaskId?: ObjectId,         // For nested sub-tasks
  taskLevel: number,               // 0 = main, 1 = first level, etc.

  // Task Details
  title: string,                   // e.g., "Replace Screen"
  description?: string,
  taskType: 'service' | 'part_replacement' | 'diagnosis' | 'testing' | 'quality_check' | 'other',

  // Assignment
  createdBy: ObjectId,             // Staff who created
  createdByName: string,
  assignedTo: ObjectId,            // Staff assigned to
  assignedToName: string,
  assignedAt: Date,

  // Progress
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked' | 'on_hold',
  progress: number,                // 0-100

  // Time Tracking
  estimatedHours?: number,
  actualHours?: number,
  startedAt?: Date,
  completedAt?: Date,
  dueDate?: Date,

  // Cost Tracking
  estimatedCost?: number,
  actualCost?: number,

  // Parts Used
  partsUsed?: [{
    partName: string,
    quantity: number,
    cost: number,
    addedAt: Date
  }],

  // Updates History
  updates: [{
    note: string,
    addedBy: ObjectId,
    addedByName: string,
    timestamp: Date,
    type: 'comment' | 'status_change' | 'assignment' | 'completion' | 'progress_update',
    oldValue?: string,
    newValue?: string
  }],

  // Dependencies
  dependencies?: [ObjectId],       // Other sub-tasks that must complete first
  blockedBy?: string,              // Reason if blocked

  priority: 'low' | 'medium' | 'high' | 'urgent',
  companyId: ObjectId,

  isDeleted: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Updated Order Schema

```typescript
{
  // ... existing fields ...

  // Sub-task tracking (new fields)
  hasSubTasks: boolean,            // Flag indicating sub-tasks exist
  totalSubTasks: number,           // Count of sub-tasks
  completedSubTasks: number,       // Count of completed sub-tasks
  subTaskProgress: number          // 0-100 overall progress
}
```

## API Endpoints

### 1. Create Sub-Task

**POST** `/api/orders/:orderId/subtasks`

Create a new sub-task for an order.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Replace Screen",
  "description": "Replace cracked iPhone 13 Pro screen",
  "taskType": "part_replacement",
  "assignedTo": "648a1b2c3d4e5f6g7h8i9j0k",
  "parentTaskId": "optional-parent-task-id",
  "estimatedHours": 2,
  "estimatedCost": 5000,
  "dueDate": "2025-01-15T10:00:00Z",
  "priority": "high",
  "dependencies": ["task-id-1", "task-id-2"]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "_id": "648a1b2c3d4e5f6g7h8i9j0k",
    "orderId": "648a1b2c3d4e5f6g7h8i9j0a",
    "orderNumber": "ORD-2025-0001",
    "title": "Replace Screen",
    "status": "pending",
    "assignedTo": "648a1b2c3d4e5f6g7h8i9j0k",
    "assignedToName": "John Doe",
    "createdBy": "648a1b2c3d4e5f6g7h8i9j0b",
    "createdByName": "Jane Smith",
    "taskLevel": 0,
    "progress": 0,
    "createdAt": "2025-01-10T10:00:00Z"
  }
}
```

---

### 2. Get Order Sub-Tasks

**GET** `/api/orders/:orderId/subtasks`

Get all sub-tasks for a specific order.

**Query Parameters:**
- `status` (optional): Filter by status
- `assignedTo` (optional): Filter by assigned staff
- `includeDeleted` (optional): Include deleted sub-tasks

**Response:** `200 OK`
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "...",
      "title": "Screen Diagnosis",
      "status": "completed",
      "assignedTo": {...},
      "progress": 100,
      "completedAt": "2025-01-11T14:30:00Z"
    },
    // ... more sub-tasks
  ]
}
```

---

### 3. Get Sub-Task by ID

**GET** `/api/subtasks/:id`

Get detailed information about a specific sub-task.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "orderId": {...},
    "title": "Replace Screen",
    "description": "Replace cracked iPhone 13 Pro screen",
    "status": "in_progress",
    "assignedTo": {...},
    "createdBy": {...},
    "parentTaskId": {...},
    "dependencies": [...],
    "updates": [...],
    "partsUsed": [...],
    "childTasks": [...]
  }
}
```

---

### 4. Update Sub-Task

**PUT** `/api/subtasks/:id`

Update sub-task details.

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "priority": "urgent",
  "estimatedHours": 3,
  "actualHours": 2.5,
  "estimatedCost": 6000,
  "actualCost": 5500,
  "progress": 75,
  "dueDate": "2025-01-16T10:00:00Z",
  "partsUsed": [
    {
      "partName": "iPhone 13 Pro Screen",
      "quantity": 1,
      "cost": 5000
    }
  ]
}
```

**Response:** `200 OK`

---

### 5. Update Sub-Task Status

**PUT** `/api/subtasks/:id/status`

Update the status of a sub-task.

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Task completed successfully"
}
```

**Response:** `200 OK`

**Automatic Actions:**
- Status → `in_progress`: Sets `startedAt` timestamp
- Status → `completed`: Sets `completedAt`, calculates `actualHours`, sets `progress` to 100
- Updates order's sub-task statistics

---

### 6. Reassign Sub-Task

**PUT** `/api/subtasks/:id/assign`

Reassign a sub-task to a different staff member.

**Request Body:**
```json
{
  "assignedTo": "648a1b2c3d4e5f6g7h8i9j0m",
  "notes": "Reassigning due to workload"
}
```

**Response:** `200 OK`

---

### 7. Add Update/Comment

**POST** `/api/subtasks/:id/updates`

Add a comment or update to the sub-task.

**Request Body:**
```json
{
  "note": "Waiting for part delivery",
  "type": "comment"
}
```

**Response:** `200 OK`

---

### 8. Delete Sub-Task

**DELETE** `/api/subtasks/:id`

Soft delete a sub-task (cannot delete if it has active child tasks).

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Sub-task deleted successfully"
}
```

---

### 9. Get Staff Sub-Tasks

**GET** `/api/staff/:staffId/subtasks`

Get all sub-tasks assigned to a specific staff member.

**Query Parameters:**
- `status` (optional): Filter by status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:** `200 OK`
```json
{
  "success": true,
  "count": 5,
  "total": 15,
  "page": 1,
  "pages": 2,
  "data": [...]
}
```

---

### 10. Get Staff Created Sub-Tasks

**GET** `/api/staff/:staffId/subtasks/created`

Get all sub-tasks created by a specific staff member.

**Query Parameters:**
- `status` (optional)
- `page` (optional)
- `limit` (optional)

**Response:** `200 OK`

---

### 11. Get Staff Sub-Task Statistics

**GET** `/api/staff/:staffId/subtasks/stats`

Get performance statistics for a staff member's sub-tasks.

**Query Parameters:**
- `fromDate` (optional): Start date for filtering
- `toDate` (optional): End date for filtering

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalSubTasks": 25,
    "completedSubTasks": 20,
    "inProgressSubTasks": 3,
    "pendingSubTasks": 2,
    "blockedSubTasks": 0,
    "completionRate": 80,
    "totalEstimatedHours": 50,
    "totalActualHours": 48,
    "totalEstimatedCost": 100000,
    "totalActualCost": 95000,
    "avgCompletionTime": 2.4,
    "onTimeCompletionRate": 85.5
  }
}
```

---

### 12. Get Sub-Task History

**GET** `/api/subtasks/:id/history`

Get the complete update history/timeline for a sub-task.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "title": "Replace Screen",
    "orderNumber": "ORD-2025-0001",
    "updates": [
      {
        "note": "Status changed from in_progress to completed",
        "addedBy": {...},
        "addedByName": "John Doe",
        "timestamp": "2025-01-11T14:30:00Z",
        "type": "status_change",
        "oldValue": "in_progress",
        "newValue": "completed"
      },
      // ... more updates
    ]
  }
}
```

---

## Usage Examples

### Example 1: Creating a Delegated Workflow

**Scenario:** Senior technician (Staff A) receives a laptop repair order and delegates tasks to junior staff.

```javascript
// 1. Staff A creates main diagnostic task
POST /api/orders/order-123/subtasks
{
  "title": "Initial Diagnosis",
  "assignedTo": "junior-tech-1",
  "taskType": "diagnosis",
  "estimatedHours": 1,
  "priority": "high"
}

// 2. After diagnosis, create specific repair tasks
POST /api/orders/order-123/subtasks
{
  "title": "Screen Replacement",
  "assignedTo": "screen-specialist",
  "taskType": "part_replacement",
  "estimatedHours": 2,
  "dependencies": ["diagnostic-task-id"]
}

POST /api/orders/order-123/subtasks
{
  "title": "Battery Replacement",
  "assignedTo": "battery-specialist",
  "taskType": "part_replacement",
  "estimatedHours": 1
}

// 3. Staff A keeps final testing for themselves
POST /api/orders/order-123/subtasks
{
  "title": "Final Quality Check",
  "assignedTo": "staff-a-id",
  "taskType": "quality_check",
  "dependencies": ["screen-task-id", "battery-task-id"]
}
```

### Example 2: Updating Sub-Task Progress

```javascript
// Junior tech starts working
PUT /api/subtasks/subtask-123/status
{
  "status": "in_progress"
}

// Add parts used
PUT /api/subtasks/subtask-123
{
  "partsUsed": [
    {
      "partName": "iPhone 13 Screen",
      "quantity": 1,
      "cost": 5000
    }
  ],
  "progress": 50
}

// Add comment
POST /api/subtasks/subtask-123/updates
{
  "note": "Screen removed, cleaning in progress",
  "type": "comment"
}

// Complete the task
PUT /api/subtasks/subtask-123/status
{
  "status": "completed",
  "notes": "Screen replacement completed successfully"
}
```

### Example 3: Monitoring Team Performance

```javascript
// Get all pending tasks for a staff member
GET /api/staff/staff-123/subtasks?status=pending

// Get performance statistics
GET /api/staff/staff-123/subtasks/stats?fromDate=2025-01-01&toDate=2025-01-31

// Get all tasks created by senior tech
GET /api/staff/senior-tech-id/subtasks/created
```

---

## Workflow Integration

### Order Creation Flow

1. Order is created and assigned to **Staff A** (Senior Technician)
2. **Staff A** receives the device and creates sub-tasks for different components
3. Sub-tasks are assigned to specialized technicians (**Staff B**, **Staff C**, etc.)
4. Each technician works on their assigned sub-task
5. **Staff A** monitors overall progress
6. When all sub-tasks complete, **Staff A** does final quality check
7. Order is marked complete

### Progress Calculation

- Order's `subTaskProgress` is automatically calculated: `(completedSubTasks / totalSubTasks) * 100`
- Each sub-task can track its own progress: `0-100`
- Hierarchical progress: Parent task progress can be based on child task completion

### Commission Calculation

Sub-tasks enable fair commission distribution:
- Each sub-task can track `actualCost`
- Staff commission can be calculated based on sub-tasks they completed
- Transparent breakdown of who contributed what to each order

---

## Error Handling

### Common Error Codes

- `400 Bad Request`: Invalid input data, cannot assign to inactive staff, cannot delete task with children
- `404 Not Found`: Sub-task or order not found
- `500 Internal Server Error`: Server error

### Example Error Response

```json
{
  "success": false,
  "message": "Cannot assign to inactive staff member"
}
```

---

## Best Practices

1. **Task Granularity**: Break down complex orders into logical, manageable sub-tasks
2. **Clear Naming**: Use descriptive titles that clearly indicate what needs to be done
3. **Estimates**: Always provide estimated hours and costs for better planning
4. **Dependencies**: Set dependencies to ensure tasks are completed in the right order
5. **Updates**: Encourage staff to add regular updates for transparency
6. **Parts Tracking**: Record all parts used in sub-tasks for accurate costing
7. **Due Dates**: Set realistic due dates and monitor completion rates
8. **Hierarchy**: Limit nesting to 2-3 levels to avoid over-complication

---

## Database Indexes

The following indexes are created for optimal performance:

```javascript
SubTaskSchema.index({ orderId: 1, isDeleted: 1 });
SubTaskSchema.index({ assignedTo: 1, status: 1 });
SubTaskSchema.index({ createdBy: 1 });
SubTaskSchema.index({ companyId: 1, status: 1 });
SubTaskSchema.index({ parentTaskId: 1 });
SubTaskSchema.index({ orderNumber: 1 });
SubTaskSchema.index({ status: 1, dueDate: 1 });
```

---

## Future Enhancements

- [ ] Real-time notifications when sub-tasks are assigned/completed
- [ ] Sub-task templates for common repair workflows
- [ ] Time tracking with start/stop functionality
- [ ] Mobile app support for field technicians
- [ ] Auto-assignment based on staff skills and workload
- [ ] Gantt chart visualization for project planning
- [ ] Integration with inventory system for parts
- [ ] Customer-visible sub-task progress
- [ ] SLA tracking and alerts

---

## Support

For issues or questions about the Sub-Task Management System, please contact the development team or open an issue in the project repository.
