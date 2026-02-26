# Troubleshooting "Session Expired / Invalid JWT" Errors

If you are seeing "Session expired. Please log out and log in again. (System Error: Invalid JWT)" even after logging in, it means your **Supabase Edge Function is out of sync** with your Supabase Project's Authentication settings.

## The Cause
This happens when the **JWT Secret** of your Supabase project has been rotated or changed, but the Edge Function (`create-user`) is still using the **old secret**. The function rejects your valid login tokens because it doesn't recognize the signature.

## The Solution: Redeploy the Edge Function

You must redeploy the function to update it with the latest project secrets.

### Option 1: Using the Terminal (Recommended)

1.  Open your terminal in the project root.
2.  Run the following command:
    ```bash
    npx supabase functions deploy create-user
    ```
3.  If asked for the **Project Reference**, enter: `ugcpcfjgppuynntsskjv`
4.  If asked for a password/token, you may need to run `npx supabase login` first and provide your Access Token from [Supabase Dashboard > Access Tokens](https://supabase.com/dashboard/account/tokens).

### Option 2: Verify in Dashboard

1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Navigate to **Edge Functions**.
3.  Click on `create-user`.
4.  Check the **Logs** tab. If you see `401` errors, it confirms the issue.
5.  Unfortunately, you cannot "refresh" the secret from the Dashboard UI alone. You **must** redeploy the function using the CLI (Option 1).

### Alternative: Disable JWT Verification (Temporary Workaround)

*Warning: This makes the function public. Only do this if you cannot redeploy immediately.*

1.  Go to **Edge Functions** -> `create-user`.
2.  Look for "Enforce JWT Verification" toggle.
3.  **Turn it OFF**.
4.  Now try to create a pastor. It might work, but it is **insecure** because anyone can call the function.
5.  **Re-enable it** as soon as you can redeploy.

## Environment Variables

Ensure your `.env` file has the correct values (which seem correct in your project):

```env
VITE_SUPABASE_URL=https://ugcpcfjgppuynntsskjv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (your anon key)
```
