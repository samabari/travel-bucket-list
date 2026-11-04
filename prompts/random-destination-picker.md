Read `PLAN.md` and the existing React, Supabase, and destination tracker code.

Build **Feature 8: Random Destination Picker** for my Travel Bucket List app.

### Requirements

1. Add a fun, visually appealing **"Pick My Next Trip"** feature accessible from the app's navigation or dashboard.
2. Add a button labeled "Pick My Next Trip!"
3. When clicked, randomly select one destination from the logged-in user's wishlist (status = `wishlist`).
4. Display the selected destination's name and country in a beautiful result card.
5. Add a "Pick Again" button to generate another random destination.
6. If multiple destinations are available, avoid selecting the same destination twice in a row when possible.
7. Show a friendly empty state if the user has no wishlist destinations, with a link to add one.
8. Use the existing Supabase-backed destination data. Do not use mock data or localStorage for the live app.
9. Make the feature mobile-friendly and consistent with the existing travel-themed design.
10. Ensure users can only select destinations from their own account.

### Testing

Add automated tests verifying:
- Only wishlist destinations are eligible.
- A visited destination is never selected.
- An empty wishlist is handled correctly.
- Repeated picks avoid the previous selection when multiple options exist.

### Important

- Work ONLY on `feature/random-destination-picker`.
- Preserve authentication, CRUD, starred destinations, search/filter/sort, and dashboard functionality.
- Do not modify database migrations unless absolutely necessary.
- Save this prompt in `prompts/random-destination-picker.md`.
- Run `npm test` and `npm run build`.
- Do not push or merge anything until I approve.

When finished, tell me:
1. What you built.
2. Whether the tests and production build passed.
3. How to test the Random Destination Picker in Replit Preview.
4. Which files changed.
