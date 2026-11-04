Read `PLAN.md` and the existing React and Supabase code.

Build the **Search, Filter & Sort** feature for my Travel Bucket List app.

### Requirements

1. Add a search bar to **My Destinations** so users can search destinations by name.
2. Add a country dropdown so users can filter destinations by country.
3. Add a status filter with three options: All, Visited, and Wishlist.
4. Add sorting options:
   - Name (A–Z)
   - Name (Z–A)
   - Most recently added
   - Oldest added
5. Allow users to combine searching, filtering, and sorting at the same time.
6. Add a **Clear Filters** button.
7. Show a friendly message when no destinations match the search.
8. Make the controls mobile-friendly and consistent with the existing travel-themed design.
9. Ensure search and filters only operate on the logged-in user's destinations.
10. Preserve the existing add/edit/delete and starred destination features.

### Important

- Work ONLY on `feature/search-filter-sort`.
- Use the existing Supabase data, not mock destinations.
- Do not change database migrations unless absolutely necessary.
- Save this prompt in `prompts/search-filter-sort.md`.
- Add automated tests for searching, filtering, sorting, and combining filters.
- Run `npm test` and `npm run build`.
- Do not push or merge anything until I approve.

When finished, tell me what you built, whether the tests passed, and how to verify everything in Replit Preview.
