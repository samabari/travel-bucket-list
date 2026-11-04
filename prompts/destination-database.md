Read PLAN.md and the existing Supabase schema before starting.

Build ONLY the database foundation for travel destinations.

Requirements:
1. Create a countries table linked to users.
2. Create a destinations table linked to users and countries.
3. Include the fields specified in PLAN.md.
4. Add foreign keys, appropriate constraints, and row-level security policies.
5. Ensure users can only read, create, update, and delete their own records.
6. Ensure destinations cannot reference another user's country.
7. Create a new SQL migration file for these tables. Do not modify or replace the original authentication migration.
8. Explain how to run the SQL in Supabase.
9. Save this prompt in prompts/destination-database.md.
10. Run available checks and explain the results.

IMPORTANT:
- Work only on feature/destination-database.
- Do not build destination forms, dashboards, stars, or other features yet.
- Do not commit, push, or merge until I approve.
- Never expose environment secrets.
