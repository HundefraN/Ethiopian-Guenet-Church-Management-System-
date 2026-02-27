import { supabase } from "../supabaseClient";

/**
 * Action types for activity logging
 */
export type ActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "BLOCK"
  | "UNBLOCK"
  | "ROLE_CHANGE"
  | "LOGIN"
  | "LOGOUT"
  | "UPLOAD"
  | "TOGGLE"
  | "PASSWORD_CHANGE";

/**
 * Entity types for activity logging
 */
export type EntityType =
  | "SERVANT"
  | "PASTOR"
  | "MEMBER"
  | "CHURCH"
  | "DEPARTMENT"
  | "PROFILE"
  | "SETTINGS"
  | "USER"
  | "SYSTEM";

/**
 * Returns a human-readable label for an action type
 */
export const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    CREATE: "created",
    UPDATE: "updated",
    DELETE: "deleted",
    BLOCK: "blocked",
    UNBLOCK: "unblocked",
    ROLE_CHANGE: "changed role of",
    LOGIN: "logged in",
    LOGOUT: "logged out",
    UPLOAD: "uploaded",
    TOGGLE: "toggled",
    PASSWORD_CHANGE: "changed password",
  };
  return labels[action] || action.toLowerCase();
};

/**
 * Returns the color scheme for an action type (for UI display)
 */
export const getActionColor = (action: string): { bg: string; text: string; border: string } => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    CREATE: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    UPDATE: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    DELETE: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    BLOCK: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    UNBLOCK: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    ROLE_CHANGE: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    LOGIN: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
    LOGOUT: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
    UPLOAD: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    TOGGLE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    PASSWORD_CHANGE: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  };
  return colors[action] || { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };
};

/**
 * Returns the entity icon name for display
 */
export const getEntityLabel = (entity: string): string => {
  const labels: Record<string, string> = {
    SERVANT: "servant",
    PASTOR: "pastor",
    MEMBER: "member",
    CHURCH: "church",
    DEPARTMENT: "department",
    PROFILE: "profile",
    SETTINGS: "settings",
    USER: "user",
    SYSTEM: "system",
  };
  return labels[entity] || entity.toLowerCase();
};

/**
 * Utility to find differences between two objects
 * Returns an object containing only the fields that were changed
 */
export const getObjectDiff = (oldData: any, newData: any) => {
  if (!oldData) return newData;

  const diff: any = {
    old: {},
    new: {}
  };

  let hasChanges = false;

  // Combine all unique keys from both objects
  const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));

  for (const key of allKeys) {
    // Skip internal fields if any (like id, created_at)
    if (['id', 'created_at', 'updated_at', 'user_id', 'church_id', 'department_id'].includes(key)) continue;

    const oldVal = oldData[key];
    const newVal = newData[key];

    // Deep compare check for arrays (like children)
    if (Array.isArray(oldVal) || Array.isArray(newVal)) {
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diff.old[key] = oldVal;
        diff.new[key] = newVal;
        hasChanges = true;
      }
      continue;
    }

    // Standard compare
    if (oldVal !== newVal) {
      // Avoid false positives with null vs empty string or undefined
      if ((oldVal === null || oldVal === undefined || oldVal === "") &&
        (newVal === null || newVal === undefined || newVal === "")) {
        continue;
      }

      diff.old[key] = oldVal ?? null;
      diff.new[key] = newVal ?? null;
      hasChanges = true;
    }
  }

  return hasChanges ? diff : null;
};

/**
 * Logs an activity to the activity_logs table in Supabase.
 */
export const logActivity = async (
  action_type: string,
  entity_type: string,
  details: string,
  entity_id?: string | null,
  changes?: any
) => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn("Could not log activity: No authenticated user found");
      return;
    }

    const { error: insertError } = await supabase.from("activity_logs").insert({
      user_id: user.id,
      action_type,
      entity_type,
      entity_id: entity_id || null,
      details,
      changes: changes || null,
    });

    if (insertError) {
      console.error("Database error logging activity:", insertError);
    }
  } catch (error) {
    console.error("Unexpected error logging activity:", error);
    // Don't block the UI if logging fails
  }
};
