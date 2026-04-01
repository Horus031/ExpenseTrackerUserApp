import {
    CreateExpensePayload,
    Expense,
    FirebaseListResponse,
} from "../../types";

const FIREBASE_BASE_URL =
  "https://firestore.googleapis.com/v1/projects/expensetracker-8954e/databases/(default)/documents";
const EXPENSES_COLLECTION = "expenses";
const FIRESTORE_RUN_QUERY_URL =
  "https://firestore.googleapis.com/v1/projects/expensetracker-8954e/databases/(default)/documents:runQuery";

/**
 * Fetches all expenses for a specific project
 */
export const fetchExpensesByProjectId = async (
  projectId: string,
): Promise<Expense[]> => {
  try {
    const response = await fetch(FIRESTORE_RUN_QUERY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: EXPENSES_COLLECTION }],
          where: {
            fieldFilter: {
              field: { fieldPath: "projectId" },
              op: "EQUAL",
              value: { stringValue: projectId },
            },
          },
        },
      }),
    });

    const results: { document?: any }[] = await response.json();
    const documents = results
      .map((item) => item.document)
      .filter((doc): doc is any => Boolean(doc));

    return documents
      .map((doc) => parseExpenseFromFirebase(doc))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error(`Error fetching expenses for project ${projectId}:`, error);
    return [];
  }
};

/**
 * Fetches a single expense by ID
 */
export const fetchExpenseById = async (
  expenseId: string,
): Promise<Expense | null> => {
  try {
    const url = `${FIREBASE_BASE_URL}/${EXPENSES_COLLECTION}/${expenseId}`;
    const response = await fetch(url);
    const doc = await response.json();
    return parseExpenseFromFirebase(doc);
  } catch (error) {
    console.error(`Error fetching expense ${expenseId}:`, error);
    return null;
  }
};

/**
 * Creates a new expense in Firebase
 */
export const createExpense = async (
  payload: CreateExpensePayload,
): Promise<Expense | null> => {
  try {
    const url = `${FIREBASE_BASE_URL}/${EXPENSES_COLLECTION}`;
    // Generate unique expense code if not provided
    const expenseCode =
      payload.expenseCode ||
      `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: convertToFirebaseFields({
          ...payload,
          expenseCode,
        }),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return parseExpenseFromFirebase(data);
    }
    throw new Error("Failed to create expense");
  } catch (error) {
    console.error("Error creating expense:", error);
    throw error;
  }
};

/**
 * Updates an existing expense in Firebase
 */
export const updateExpense = async (
  expenseId: string,
  payload: Partial<CreateExpensePayload>,
): Promise<Expense | null> => {
  try {
    const url = `${FIREBASE_BASE_URL}/${EXPENSES_COLLECTION}/${expenseId}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: convertToFirebaseFields(payload),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return parseExpenseFromFirebase(data);
    }
    throw new Error("Failed to update expense");
  } catch (error) {
    console.error(`Error updating expense ${expenseId}:`, error);
    throw error;
  }
};

/**
 * Deletes an expense from Firebase
 */
export const deleteExpense = async (expenseId: string): Promise<boolean> => {
  try {
    const url = `${FIREBASE_BASE_URL}/${EXPENSES_COLLECTION}/${expenseId}`;
    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      console.error(`Delete expense failed with status ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error deleting expense ${expenseId}:`, error);
    throw error;
  }
};

/**
 * Fetches all expenses (admin view)
 */
export const fetchAllExpenses = async (): Promise<Expense[]> => {
  try {
    const url = `${FIREBASE_BASE_URL}/${EXPENSES_COLLECTION}`;
    const response = await fetch(url);
    const json: FirebaseListResponse = await response.json();

    if (json.documents) {
      return json.documents
        .map((doc) => parseExpenseFromFirebase(doc))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
    }
    return [];
  } catch (error) {
    console.error("Error fetching all expenses:", error);
    return [];
  }
};

/**
 * Calculates total expenses for a project
 */
export const calculateProjectTotalExpense = async (
  projectId: string,
): Promise<number> => {
  try {
    const expenses = await fetchExpensesByProjectId(projectId);
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  } catch (error) {
    console.error(`Error calculating total for project ${projectId}:`, error);
    return 0;
  }
};

/**
 * Gets expenses summary for a project (grouped by type)
 */
export const getExpenseSummaryByType = async (
  projectId: string,
): Promise<Record<string, number>> => {
  try {
    const expenses = await fetchExpensesByProjectId(projectId);
    const summary: Record<string, number> = {};

    expenses.forEach((expense) => {
      if (!summary[expense.type]) {
        summary[expense.type] = 0;
      }
      summary[expense.type] += expense.amount;
    });

    return summary;
  } catch (error) {
    console.error(
      `Error getting expense summary for project ${projectId}:`,
      error,
    );
    return {};
  }
};

/**
 * Parses a Firebase document into an Expense object
 */
function parseExpenseFromFirebase(doc: any): Expense {
  const fields = doc.fields || {};
  const id = doc.name ? doc.name.split("/").pop() : "";

  return {
    id,
    projectId: fields.projectId?.stringValue || "",
    expenseCode: fields.expenseCode?.stringValue || "",
    date: fields.date?.stringValue || "",
    amount: parseFirestoreNumber(fields.amount),
    currency: fields.currency?.stringValue || "USD",
    type: fields.type?.stringValue || "Miscellaneous",
    paymentMethod: fields.paymentMethod?.stringValue || "Cash",
    claimant: fields.claimant?.stringValue || "",
    paymentStatus: fields.paymentStatus?.stringValue || "Pending",
    description: fields.description?.stringValue,
    location: fields.location?.stringValue,
    receiptPath: fields.receiptPath?.stringValue,
  };
}

function parseFirestoreNumber(field: any): number {
  if (!field) {
    return 0;
  }

  if (typeof field.integerValue !== "undefined") {
    return Number(field.integerValue) || 0;
  }

  if (typeof field.doubleValue !== "undefined") {
    return Number(field.doubleValue) || 0;
  }

  return 0;
}

/**
 * Converts a payload to Firebase field format
 */
function convertToFirebaseFields(payload: any): Record<string, any> {
  const fields: Record<string, any> = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === "string") {
      fields[key] = { stringValue: value };
    } else if (typeof value === "number") {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    }
  });

  return fields;
}
