Read `PLAN.md` and the existing React, Supabase, and destination tracker code.

Build **Feature 7: Travel Statistics Dashboard** for my Travel Bucket List app.

### Requirements

1. Create a beautiful, modern Travel Dashboard accessible from the app's navigation.
2. Display at least three statistics:
   - Total destinations saved
   - Number of destinations visited
   - Number of unique countries represented
3. Add a chart using Recharts that compares Visited versus Wishlist destinations.
4. Calculate all statistics from the logged-in user's real Supabase destinations.
5. Make sure the dashboard updates when destinations are added, edited, or deleted.
6. Add a friendly empty state for users who haven't added destinations.
7. Protect the dashboard route so only authenticated users can access it.
8. Make the design mobile-friendly and consistent with the existing app.
9. Include clear chart labels and a legend.

### Required Dashboard Calculation Test

Create an automated test that verifies the dashboard statistics are calculated correctly.

For example, given five destinations:
- Three visited
- Two wishlist
- Three unique countries

The dashboard should display:
- Total destinations: 5
- Visited: 3
- Countries: 3

IMPORTANT: My class assignment requires **red/green test evidence**.

Please:
1. Create a dashboard calculation test.
2. Temporarily introduce a deliberate calculation bug so the test fails (RED).
3. Capture and save a screenshot of the failing test output in `evidence/dashboard-red.png`.
4. Fix the bug so the test passes (GREEN).
5. Capture and save a screenshot of the passing test output in `evidence/dashboard-green.png`.
6. Explain what would cause this test to fail in the future.
7. Make sure the final committed code contains the correct implementation, not the deliberate bug.

### Important

- Work ONLY on `feature/travel-dashboard`.
- Use real Supabase data, not mock data for the live app.
- Mock data is allowed in automated tests.
- Do not change existing database migrations unless necessary.
- Preserve all existing authentication, CRUD, starred destinations, and search/filter/sort functionality.
- Save this prompt in `prompts/travel-dashboard.md`.
- Run `npm test` and `npm run build`.
- Do not push or merge anything until I approve.

When finished, tell me:
1. What you built.
2. Whether all tests and the build passed.
3. Whether both red/green evidence screenshots were saved.
4. How to test the dashboard in Replit Preview.
