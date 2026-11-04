Read `PLAN.md` and the existing React, Supabase, and destination tracker code.

Build **Feature 9: Enhanced Travel Notes** for my Travel Bucket List app.

### Requirements

1. Add a dedicated **Travel Notes** section to each destination's detail view.
2. Allow users to write, edit, save, and view personal notes about each destination.
3. Support longer notes with multiple paragraphs and line breaks.
4. Add a clearly labeled "Save Notes" button.
5. Display saved notes in a clean, attractive format.
6. Allow users to edit existing notes without changing other destination information.
7. Show a friendly empty state when a destination has no notes.
8. Save notes using the existing `notes` column in the Supabase `destinations` table.
9. Make sure notes persist after refreshing the page.
10. Ensure users can only access and edit notes belonging to their own destinations.
11. Make the interface mobile-friendly and consistent with the existing travel-themed design.

### Testing

Add automated tests verifying:
- Users can save new notes.
- Users can edit existing notes.
- Multiple paragraphs and line breaks are preserved.
- Empty notes are handled correctly.
- Updating notes doesn't accidentally change other destination fields.

### Important

- Work ONLY on `feature/travel-notes`.
- Preserve authentication, CRUD, starred destinations, search/filter/sort, dashboard, and random destination picker.
- Reuse the existing Supabase schema. Do not create another notes table.
- Save this prompt in `prompts/travel-notes.md`.
- Run `npm test` and `npm run build`.
- Do not push or merge anything until I approve.
