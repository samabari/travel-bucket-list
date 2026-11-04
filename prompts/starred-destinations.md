Read PLAN.md, the existing React app, and the Supabase schema.

Build the Starred Destinations feature for my Travel Bucket List app.

Requirements:

1. Add a star icon to each destination in My Destinations.
2. Clicking the star should favorite or unfavorite that destination.
3. Create a separate "Starred Destinations" view that shows only favorited destinations.
4. Create a Supabase SQL migration for a `stars` junction table linking users and destinations.
5. Add row-level security policies so users can only view and modify their own stars.
6. Prevent duplicate stars for the same user and destination.
7. Make sure stars persist after refreshing the page.
8. Make the interface responsive and consistent with the existing travel-themed design.
9. Show a friendly empty state when no destinations are starred.
10. Handle loading and error states gracefully.

Important:

- Work ONLY on the `feature/starred-destinations` branch.
- Do not modify existing database migrations.
- Save this AI prompt in `prompts/starred-destinations.md`.
- Generate a NEW SQL migration file for the stars table.
- Do not use mock data or localStorage for saved stars.
- Do not implement other planned features yet.
- Run automated tests and the production build.
- Do not push or merge anything until I approve.

When finished, tell me:

1. Which files you changed.
2. Whether the tests and build passed.
3. The exact SQL migration file I need to run in Supabase.
4. How to test starring and unstarring in Preview.
