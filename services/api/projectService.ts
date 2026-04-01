import {
    CreateProjectPayload,
    FirebaseListResponse,
    Project,
} from "../../types";

const FIREBASE_URL =
  "https://firestore.googleapis.com/v1/projects/expensetracker-8954e/databases/(default)/documents/projects";

/**
 * Fetches all projects from Firebase
 */
export const fetchProjects = async (): Promise<Project[]> => {
  try {
    const response = await fetch(FIREBASE_URL);
    const json: FirebaseListResponse = await response.json();

    if (json.documents) {
      return json.documents.map((doc) => parseProjectFromFirebase(doc));
    }
    return [];
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw new Error(
      "Failed to fetch projects. Please check your network connection.",
    );
  }
};

/**
 * Fetches a single project by ID
 */
export const fetchProjectById = async (
  projectId: string,
): Promise<Project | null> => {
  try {
    const response = await fetch(`${FIREBASE_URL}/${projectId}`);
    const doc = await response.json();
    return parseProjectFromFirebase(doc);
  } catch (error) {
    console.error(`Error fetching project ${projectId}:`, error);
    return null;
  }
};

/**
 * Creates a new project in Firebase
 */
export const createProject = async (
  payload: CreateProjectPayload,
): Promise<Project | null> => {
  try {
    const response = await fetch(FIREBASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: convertToFirebaseFields(payload),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return parseProjectFromFirebase(data);
    }
    throw new Error("Failed to create project");
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
};

/**
 * Updates an existing project in Firebase
 */
export const updateProject = async (
  projectId: string,
  payload: Partial<CreateProjectPayload>,
): Promise<Project | null> => {
  try {
    const response = await fetch(`${FIREBASE_URL}/${projectId}`, {
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
      return parseProjectFromFirebase(data);
    }
    throw new Error("Failed to update project");
  } catch (error) {
    console.error(`Error updating project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Deletes a project from Firebase
 */
export const deleteProject = async (projectId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${FIREBASE_URL}/${projectId}`, {
      method: "DELETE",
    });

    return response.ok;
  } catch (error) {
    console.error(`Error deleting project ${projectId}:`, error);
    throw error;
  }
};

/**
 * Parses a Firebase document into a Project object
 */
function parseProjectFromFirebase(doc: any): Project {
  const fields = doc.fields || {};
  const id = doc.name ? doc.name.split("/").pop() : "";

  return {
    id,
    code: fields.code?.stringValue || "",
    name: fields.name?.stringValue || "No name",
    description: fields.description?.stringValue || "",
    startDate: fields.startDate?.stringValue || "",
    endDate: fields.endDate?.stringValue || "",
    manager: fields.manager?.stringValue || "Not assigned",
    status: fields.status?.stringValue || "N/A",
    budget: parseFirestoreNumber(fields.budget),
    specialRequirements: fields.specialRequirements?.stringValue,
    clientInfo: fields.clientInfo?.stringValue,
    priority: fields.priority?.stringValue || "Medium",
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
