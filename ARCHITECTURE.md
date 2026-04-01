# Expense Tracker - Architecture & API Documentation

## Project Structure

```
ExpenseTracker/
├── app/
│   └── (tabs)/
│       ├── index.tsx                 # Projects list screen
│       ├── _layout.tsx               # Tab navigation layout
│       └── expenses/
│           └── index.tsx             # Expense management screen
├── components/
│   └── ExpenseManagementComponent.tsx # Reusable expense management UI
├── services/
│   ├── api/
│   │   ├── projectService.ts         # Project API service
│   │   └── expenseService.ts         # Expense API service
│   └── database/
│       └── databaseService.ts        # Local storage & caching
├── types/
│   └── index.ts                      # TypeScript type definitions
```

## API Services

### projectService.ts

**Available Functions:**

- `fetchProjects()` - Retrieve all projects
- `fetchProjectById(projectId)` - Get a specific project
- `createProject(payload)` - Create new project
- `updateProject(projectId, payload)` - Update project
- `deleteProject(projectId)` - Delete project

### expenseService.ts

**Available Functions:**

- `fetchExpensesByProjectId(projectId)` - Get expenses for a project
- `fetchExpenseById(expenseId)` - Get specific expense
- `createExpense(payload)` - Create new expense
- `updateExpense(expenseId, payload)` - Update expense
- `deleteExpense(expenseId)` - Delete expense
- `calculateProjectTotalExpense(projectId)` - Get total expenses
- `getExpenseSummaryByType(projectId)` - Expenses grouped by type

### databaseService.ts

**Caching & Local Storage:**

- `cacheProjects(projects)` - Cache projects locally
- `getCachedProjects()` - Retrieve cached projects
- `cacheExpenses(projectId, expenses)` - Cache expenses
- `getCachedExpenses(projectId)` - Retrieve cached expenses
- `saveOfflineChange()` - Queue offline changes for sync
- `getPendingOfflineChanges()` - Get pending sync items

## Type Definitions

### Project

```typescript
interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  manager: string;
  status: string;
  budget: number;
  specialRequirements?: string;
  clientInfo?: string;
  priority?: string;
}
```

### Expense

```typescript
interface Expense {
  id: string;
  projectId: string;
  expenseCode: string;
  date: string; // YYYY-MM-DD
  amount: number;
  currency: string;
  type: ExpenseType;
  paymentMethod: PaymentMethod;
  claimant: string;
  paymentStatus: PaymentStatus;
  description?: string;
  location?: string;
  receiptPath?: string;
}
```

### Enums

**ExpenseType:**

- TRAVEL, EQUIPMENT, MATERIALS, SERVICES, SOFTWARE_LICENSES, LABOUR_COSTS, UTILITIES, MISCELLANEOUS

**PaymentMethod:**

- CASH, CREDIT_CARD, BANK_TRANSFER, CHEQUE

**PaymentStatus:**

- PAID, PENDING, REIMBURSED

## Usage Examples

### Fetch Projects

```typescript
import { fetchProjects } from "../../services/api/projectService";

const projects = await fetchProjects();
```

### Create Expense

```typescript
import { createExpense } from "../../services/api/expenseService";
import { ExpenseType, PaymentMethod, PaymentStatus } from "../../types";

await createExpense({
  projectId: "proj-123",
  expenseCode: "EXP-001",
  date: "2024-04-01",
  amount: 150.0,
  currency: "USD",
  type: ExpenseType.TRAVEL,
  paymentMethod: PaymentMethod.CREDIT_CARD,
  claimant: "John Doe",
  paymentStatus: PaymentStatus.PENDING,
});
```

### Use Expense Management Component

```typescript
import { ExpenseManagementComponent } from "../../components/ExpenseManagementComponent";

<ExpenseManagementComponent
  projectId="proj-123"
  projectBudget={10000}
/>
```

## Screens

### Projects Screen

- Display all projects with search and favorites
- Responsive card layout with project details
- Budget information

### Expense Management Screen

- Select project from horizontal list
- Full CRUD operations for expenses
- Budget tracker with visual progress bar
- Expense summary by type

## Features

### Expense Management Component

- ✅ Add new expenses
- ✅ Edit existing expenses
- ✅ Delete expenses
- ✅ Budget tracking with progress visualization
- ✅ Expense categorization
- ✅ Form validation
- ✅ Pull-to-refresh
- ✅ Offline support

## Firebase Collections

**projects**: Contains all project documents
**expenses**: Contains all expense documents linked to projects

## Notes

- All API calls handle errors gracefully
- Firebase Firestore REST API is used
- Local caching improves performance
- Types match the Kotlin Admin app data structure
