# User-provided authentication prompt

I'm building a Travel Bucket List web app for my MBA coding class.

Please read the PLAN.md file in this repository before starting.

IMPORTANT GITHUB REQUIREMENTS:
- Work ONLY on the existing feature/authentication branch.
- Never commit or push directly to main.
- Build ONLY the authentication feature in this task.
- Do not build the destination tracker, dashboard, stars, or other features yet.
- Save this prompt in prompts/authentication.md.
- Do not automatically merge any branches.

FEATURE 1: USER AUTHENTICATION

Build the initial React application with Supabase authentication.

Requirements:
1. Create a beautiful, modern travel-themed landing page with a warm neutral background, soft blue accents, and clean typography.
2. Add a Sign Up page where new users can create accounts using their email and password.
3. Add a Login page for existing users.
4. Add a Logout button.
5. Use Supabase Auth and a users profile table so each registered user has an associated database record.
6. Ensure users can only access their own data using appropriate database security policies.
7. Display friendly error messages for invalid credentials, missing fields, and duplicate accounts.
8. After login, show a simple welcome screen. Do not build the other app features yet.
9. Ensure the app runs in Replit's preview.

Use environment variables for all Supabase credentials. Never commit secrets to GitHub.

Please explain any external setup steps I need to complete, including creating a Supabase project, before implementing anything that depends on those credentials.

When finished, explain what you built, how to test sign up/login/logout, and which files were changed. Do not commit or push until I approve.
