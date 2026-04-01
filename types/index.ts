// Project types
export interface Project {
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

// Expense types
export interface Expense {
  id: string;
  projectId: string;
  expenseCode: string;
  date: string;
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

// Enum types
export enum ExpenseType {
  TRAVEL = "Travel",
  EQUIPMENT = "Equipment",
  MATERIALS = "Materials",
  SERVICES = "Services",
  SOFTWARE_LICENSES = "Software/Licenses",
  LABOUR_COSTS = "Labour costs",
  UTILITIES = "Utilities",
  MISCELLANEOUS = "Miscellaneous",
}

export enum PaymentMethod {
  CASH = "Cash",
  CREDIT_CARD = "Credit Card",
  BANK_TRANSFER = "Bank Transfer",
  CHEQUE = "Cheque",
}

export enum PaymentStatus {
  PAID = "Paid",
  PENDING = "Pending",
  REIMBURSED = "Reimbursed",
}

// Firebase document format types
export interface FirebaseDocument<T> {
  name: string;
  fields: Record<string, any>;
}

export interface FirebaseListResponse {
  documents?: FirebaseDocument<any>[];
}

export interface CreateProjectPayload {
  name: string;
  code: string;
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

export interface CreateExpensePayload {
  projectId: string;
  expenseCode: string;
  date: string;
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
