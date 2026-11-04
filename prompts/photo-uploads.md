Read `PLAN.md` and the existing React app, Supabase schema, and destination tracker code.

Build **Feature 10: Destination Photo Uploads** for my Travel Bucket List app.

### Requirements

1. Add an "Upload Photo" button to each destination's detail view.
2. Allow users to select an image from their computer or phone.
3. Upload the image to Supabase Storage in a bucket named `destination-photos`.
4. Save the uploaded photo's storage path or URL using the existing `photo_url` column in the `destinations` table.
5. Display uploaded photos on destination cards and detail views.
6. Allow users to replace or remove an existing photo.
7. Make sure photos persist after refreshing the page.
8. Validate image uploads:
   - Accept JPG, PNG, and WebP.
   - Maximum file size: 5 MB.
   - Show friendly error messages for invalid files.
9. Show an image preview before uploading.
10. Keep the design mobile-friendly and consistent with the existing app.

### Supabase Storage Security

- Create a NEW SQL migration to configure the `destination-photos` storage bucket and its access policies.
- Only authenticated users should be able to upload photos.
- Store photos in user-specific paths.
- Users must only be able to upload, replace, or delete their own photos.
- Ensure the photo is associated with a destination belonging to that user.
- Do not expose service-role keys or bypass row-level security.
- Use secure storage policies, not just frontend checks.
- Explain whether the bucket is public or private and how images are displayed securely.

### Testing

Add automated tests for:
- Valid image uploads.
- Invalid file types.
- Files larger than 5 MB.
- Replacing an existing photo.
- Removing a photo.
- Upload errors and permission failures.

### Important

- Work ONLY on `feature/photo-uploads`.
- Preserve authentication, destination CRUD, starred destinations, search/filter/sort, dashboard, random picker, and travel notes.
- Do not modify existing migrations.
- Save this prompt in `prompts/photo-uploads.md`.
- Run `npm test` and `npm run build`.
- Do not commit, push, or merge until I approve.

When finished, tell me:
1. What you built.
2. Whether all tests and the build passed.
3. The exact SQL migration file I need to run in Supabase.
4. Whether I need to manually create a Storage bucket.
5. How to test photo uploads in Replit Preview.
