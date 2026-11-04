# Travel Bucket List — Project Plan

## 1. Pitch

I'm building a Travel Bucket List app because I love traveling and want one place to track destinations I've visited and places I want to explore next. I plan to use it after every trip and whenever I discover a new destination.

## 2. Features

### Required features

1. **Account creation and login:** As a traveler, I want to create an account, log in, and log out so that my travel list is private and saved.
2. **Destination categories:** As a traveler, I want to organize destinations by country so that I can keep my travel history organized.
3. **Manage destinations:** As a traveler, I want to add, view, edit, and delete destinations so that my bucket list stays accurate. Each destination will have a name, country, visit status, travel date (optional), rating (optional), and notes.
4. **Form validation:** As a traveler, I want to see an error if I forget a destination name or country so that incomplete entries are not saved.
5. **Star destinations:** As a traveler, I want to star favorite destinations and view them separately so that I can easily find my top places.
6. **Search, filter, and sort:** As a traveler, I want to search destinations, filter by visited status, and sort alphabetically or by date so that I can find places quickly.
7. **Travel dashboard:** As a traveler, I want to see my total destinations, visited destinations, and bucket-list destinations, along with a chart comparing visited and unvisited places.

### Three custom features

8. **Photo upload:** As a traveler, I want to upload a photo for a destination so that I can remember what the place looks like.
9. **Random destination picker:** As a traveler, I want a button that randomly chooses one unvisited destination so that I can get inspiration for my next trip.
10. **Travel notes:** As a traveler, I want to save personal memories or future activity ideas for each destination so that I can refer to them later.

## 3. Database

The application will use four tables.

**users**
- id: UUID, primary key
- email: text, unique
- password_hash: text, managed by authentication provider
- created_at: timestamp

**countries**
- id: UUID, primary key
- user_id: UUID, references users.id
- name: text

**destinations**
- id: UUID, primary key
- user_id: UUID, references users.id
- country_id: UUID, references countries.id
- name: text
- status: text (visited or wishlist)
- visit_date: date, optional
- rating: number, optional
- notes: text, optional
- photo_url: text, optional
- created_at: timestamp

**stars**
- id: UUID, primary key
- user_id: UUID, references users.id
- destination_id: UUID, references destinations.id

Relationships:
- One user can have many countries and destinations.
- One country can contain many destinations.
- One user can star many destinations.
- Each star connects one user to one destination.
- Users can only access their own data.

## 4. Tests

**Test 1 — Data isolation:** Given two registered users, when User A creates a destination and User B logs in, then User B cannot see or access User A's destination.

**Test 2 — Dashboard accuracy:** Given a user with three visited destinations and two wishlist destinations, when the dashboard loads, then the total destinations stat displays five and the visited stat displays three.

## 5. Technologies

- **AI coding agent:** Replit Agent, because it can help generate, debug, and deploy a web app without requiring extensive coding experience.
- **Frontend:** React, because it supports reusable interactive components.
- **Database:** Supabase PostgreSQL, because it supports relational tables and persistent storage.
- **Authentication:** Supabase Auth, because it supports account creation, login, and secure user sessions.
- **Hosting:** Replit deployment, because it offers a convenient way to publish the application.
- **Photo storage:** Supabase Storage, because uploaded destination photos need persistent storage.
- **Charts:** Recharts, because it can display simple dashboard charts.

## 6. Design

The app will have a clean, modern travel-journal aesthetic with warm neutral backgrounds, soft blue accents, rounded cards, and destination photos. Inspiration will come from Airbnb's destination imagery and Pinterest's visual organization.

The homepage will show a travel dashboard, destination cards, and clear navigation to the bucket list and starred destinations.

## 7. Risks and Cuts

The feature I'm least confident about is photo upload because it requires file storage and permissions.

If time becomes limited, I will simplify photo uploads to a single image per destination. If necessary, I will cut photo uploads before compromising account security, core destination management, or the dashboard.

## 8. Build Order and Process

I will build the application through small GitHub Issues, feature branches, and pull requests. I will save the main AI prompts in a prompts folder and merge changes into main only through pull requests.

The plan will be merged before any application feature development begins. I will test each feature before merging and deploy the updated app after each merge.

After development, I will add a Plan vs. Reality table without rewriting this original plan.
