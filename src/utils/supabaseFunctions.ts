import { supabase } from "../supabaseClient";

/**
 * Invokes a Supabase Edge Function with automatic session refresh on "Invalid JWT" error.
 *
 * @param functionName The name of the function to invoke
 * @param options The invocation options (body, headers, etc.)
 * @returns The response data or throws an error
 */
export const invokeSupabaseFunction = async (
  functionName: string,
  options: any = {}
) => {
  try {
    // 1. Attempt to invoke the function
    const { data, error } = await supabase.functions.invoke(
      functionName,
      options
    );

    if (error) {
      console.error(`First attempt to invoke ${functionName} failed:`, error);

      // Check if error is related to invalid JWT or session expiration
      const errorMessage = error.message || "";
      const errorContext = error.context ? JSON.stringify(error.context) : "";

      const isAuthError =
        errorMessage.includes("Invalid JWT") ||
        errorMessage.includes("jwt expired") ||
        errorMessage.includes("401") ||
        errorContext.includes("Invalid JWT") ||
        errorContext.includes("jwt expired");

      if (isAuthError) {
        console.log("Session expired or invalid JWT, attempting refresh...");

        // 2. Try to refresh the session
        const { data: sessionData, error: sessionError } =
          await supabase.auth.refreshSession();

        if (sessionError) {
          console.error("Failed to refresh session:", sessionError);
          // Don't throw here yet, let's try to get the session one more time
        }

        const { data: currentSession } = await supabase.auth.getSession();
        if (!currentSession.session) {
          console.error("No active session found after refresh attempt.");
          throw new Error("Session expired. Please log out and log in again.");
        }

        console.log(
          "Session refreshed successfully. Retrying function invocation..."
        );

        // 3. Retry the function invocation with the new session
        // Note: supabase-js automatically uses the new token from the session
        const { data: retryData, error: retryError } =
          await supabase.functions.invoke(functionName, options);

        if (retryError) {
          console.error(
            `Retry attempt for ${functionName} failed:`,
            retryError
          );
          throw retryError;
        }

        return { data: retryData, error: null };
      }

      throw error;
    }

    return { data, error: null };
  } catch (err: any) {
    console.error(`invokeSupabaseFunction error:`, err);
    throw err;
  }
};
