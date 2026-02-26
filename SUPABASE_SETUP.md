# Supabase Setup Guide

This guide will help you set up the database, authentication, and backend functions for the Ethiopian Guenet Church Management System.

## Prerequisites

1.  A [Supabase](https://supabase.com/) account and project.
2.  [Supabase CLI](https://supabase.com/docs/guides/cli) installed (optional but recommended for functions).

## Step 1: Database Setup

1.  Go to your Supabase Project Dashboard.
2.  Navigate to the **SQL Editor**.
3.  Copy the content of `supabase/schema.sql` from this repository.
4.  Paste it into the SQL Editor and click **Run**.

This will create all the necessary tables (`churches`, `departments`, `members`, `profiles`, `global_settings`) and set up Row Level Security (RLS) policies.

## Step 2: Create the First Super Admin

Since the system relies on a `super_admin` to manage other users, you need to create the first one manually.

1.  Go to the **Authentication** section in your Supabase Dashboard.
2.  Click **Add User** -> **Invite** (or just create a user with email/password).
3.  Enter the email (e.g., `name@gmail.com`) and password.
4.  Once the user is created, go back to the **SQL Editor**.
5.  Run the following SQL query to assign the `super_admin` role to this user (replace `YOUR_USER_EMAIL` with the actual email):

```sql
UPDATE public.profiles
SET role = 'super_admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_USER_EMAIL');
```

## Step 3: Deploy the Edge Function (For creating users)

The "Register Pastor" and "Register Servant" features require a Supabase Edge Function to create users securely.

1.  Login to Supabase CLI:
    ```bash
    npx supabase login
    ```

2.  Link your project:
    ```bash
    npx supabase link --project-ref your-project-ref
    ```
    (You can find your project ref in the Supabase Dashboard URL: `https://app.supabase.com/project/your-project-ref`)

3.  Deploy the `create-user` function:
    ```bash
    npx supabase functions deploy create-user
    ```

4.  Set the necessary environment variables for the function (if not automatically set):
    ```bash
    npx supabase secrets set SUPABASE_URL=your-project-url SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
    ```
    *Note: The function uses `Deno.env.get("SUPABASE_URL")` and `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` which are usually available by default in Supabase Edge Functions, but verify if needed.*

## Step 4: Environment Variables

Create a `.env` file in the root of your project (copy from `.env.example`):

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Replace the values with your project's URL and Anon Key found in **Project Settings -> API**.

## Step 5: Verify

1.  Start the application: `npm run dev`.
2.  Login with the Super Admin account you created.
3.  Try creating a Church.
4.  Try registering a Pastor (this will call the Edge Function).
5.  Login as the Pastor and try creating a Department and a Servant.
6.  Login as the Servant and try adding Members.

## Troubleshooting

-   **RLS Errors**: Check the Browser Console for any permission denied errors. Ensure you are logged in with the correct role.
-   **Function Errors**: Check the **Edge Functions** logs in the Supabase Dashboard if user creation fails.
-   **Profile not found**: If the profile isn't created automatically, check the **Database -> Triggers** to ensure `on_auth_user_created` is active.
