Implement the GitHub issue "Add destination input validation" for my Travel Bucket List app.

I have already created and switched to the branch `feature/input-validation`.

Requirements:
1. Require destination name and country.
2. Reject empty or whitespace-only values.
3. Validate numeric fields and dates where applicable.
4. Display friendly error messages beside invalid fields.
5. Prevent invalid submissions from being saved to Supabase.
6. Preserve entered information when validation fails.
7. Make validation work when creating AND editing destinations.
8. Add automated tests for valid and invalid submissions.

Save this AI prompt in `prompts/input-validation.md`.

Run all existing tests and `npm run build`. Fix any failures caused by your changes.

Do not switch branches, merge, publish, or change unrelated features.

When finished, tell me:
- Which files changed
- How many tests passed
- Whether the build succeeded
- Whether any issues remain

Do not commit or push yet.
