import AsyncStorage from "@react-native-async-storage/async-storage";
import { Expense, Project } from "../../types";

const PROJECTS_CACHE_KEY = "@projects_cache";
const EXPENSES_CACHE_KEY = "@expenses_cache";
const CACHE_EXPIRY_KEY = "@cache_expiry";
const CACHE_EXPIRY_MINUTES = 30; // Cache expires after 30 minutes

/**
 * Saves projects to local cache
 */
export const cacheProjects = async (projects: Project[]): Promise<void> => {
  try {
    const expiryTime = Date.now() + CACHE_EXPIRY_MINUTES * 60 * 1000;
    await AsyncStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(projects));
    await AsyncStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());
  } catch (error) {
    console.error("Error caching projects:", error);
  }
};

/**
 * Retrieves cached projects
 */
export const getCachedProjects = async (): Promise<Project[] | null> => {
  try {
    const cached = await AsyncStorage.getItem(PROJECTS_CACHE_KEY);
    const expiryTime = await AsyncStorage.getItem(CACHE_EXPIRY_KEY);

    if (cached && expiryTime) {
      if (Date.now() < parseInt(expiryTime)) {
        return JSON.parse(cached);
      } else {
        // Cache expired, clear it
        await AsyncStorage.removeItem(PROJECTS_CACHE_KEY);
        await AsyncStorage.removeItem(CACHE_EXPIRY_KEY);
      }
    }
  } catch (error) {
    console.error("Error retrieving cached projects:", error);
  }
  return null;
};

/**
 * Saves expenses to local cache
 */
export const cacheExpenses = async (
  projectId: string,
  expenses: Expense[],
): Promise<void> => {
  try {
    const key = `${EXPENSES_CACHE_KEY}_${projectId}`;
    await AsyncStorage.setItem(key, JSON.stringify(expenses));
  } catch (error) {
    console.error(`Error caching expenses for project ${projectId}:`, error);
  }
};

/**
 * Retrieves cached expenses for a project
 */
export const getCachedExpenses = async (
  projectId: string,
): Promise<Expense[] | null> => {
  try {
    const key = `${EXPENSES_CACHE_KEY}_${projectId}`;
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error(
      `Error retrieving cached expenses for project ${projectId}:`,
      error,
    );
  }
  return null;
};

/**
 * Clears all cache
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(
      (key) =>
        key.includes("@projects_cache") ||
        key.includes("@expenses_cache") ||
        key.includes("@cache_expiry"),
    );
    await AsyncStorage(cacheKeys);
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
};

/**
 * Clears expenses cache for a specific project
 */
export const clearExpensesCache = async (projectId: string): Promise<void> => {
  try {
    const key = `${EXPENSES_CACHE_KEY}_${projectId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(
      `Error clearing expenses cache for project ${projectId}:`,
      error,
    );
  }
};

/**
 * Saves user preferences
 */
export const saveUserPreferences = async (
  preferences: Record<string, any>,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      "@user_preferences",
      JSON.stringify(preferences),
    );
  } catch (error) {
    console.error("Error saving user preferences:", error);
  }
};

/**
 * Retrieves user preferences
 */
export const getUserPreferences = async (): Promise<Record<
  string,
  any
> | null> => {
  try {
    const preferences = await AsyncStorage.getItem("@user_preferences");
    if (preferences) {
      return JSON.parse(preferences);
    }
  } catch (error) {
    console.error("Error retrieving user preferences:", error);
  }
  return null;
};

/**
 * Saves offline changes for syncing later
 */
export const saveOfflineChange = async (
  action: "create" | "update" | "delete",
  entityType: "expense" | "project",
  data: any,
): Promise<void> => {
  try {
    const key = "@offline_changes";
    const existing = await AsyncStorage.getItem(key);
    const changes = existing ? JSON.parse(existing) : [];

    changes.push({
      id: Math.random().toString(),
      action,
      entityType,
      data,
      timestamp: Date.now(),
    });

    await AsyncStorage.setItem(key, JSON.stringify(changes));
  } catch (error) {
    console.error("Error saving offline change:", error);
  }
};

/**
 * Retrieves pending offline changes
 */
export const getPendingOfflineChanges = async (): Promise<any[]> => {
  try {
    const key = "@offline_changes";
    const changes = await AsyncStorage.getItem(key);
    return changes ? JSON.parse(changes) : [];
  } catch (error) {
    console.error("Error retrieving offline changes:", error);
    return [];
  }
};

/**
 * Clears offline changes after successful sync
 */
export const clearOfflineChanges = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem("@offline_changes");
  } catch (error) {
    console.error("Error clearing offline changes:", error);
  }
};
