# Animalia - AI Coding Instructions

## Project Overview
Animalia is a quiz game web app for identifying stuffed animals in a school display cabinet. Players match animal names to numbers or vice versa, competing for leaderboard positions based on speed and accuracy.

## Architecture

### Tech Stack
- **Backend**: Express.js v5 (Node.js v22) with EJS templates
- **Database**: MongoDB via Mongoose v8 with two collections:
  - `szekreny` (cabinet/room): Stores animal data (name, number, image URL) per room
  - `leader` (leaderboard): Stores player scores per room
- **Frontend**: jQuery-based SPA pattern within EJS templates, SweetAlert2 v7
- **Deployment**: Docker with nginx-proxy-manager network
- **Authentication**: Express sessions with password-protected admin area

### Data Model
```javascript
// Room/Cabinet (szekreny)
{ _id: ObjectId, name: String, szekreny: Number, allatok: [{ nev: String, szam: Number, url: String }] }

// Leaderboard (leader)
{ szekreny: Number, leaders: [{ nev: String, pont: Number, created: Date }] }
```

## Critical Patterns

### URL Structure & Dynamic Room System
- Room IDs (szekreny) are **dynamically validated** against database - no hardcoded limits
- Routes: `/:szekreny` (start), `/:szekreny/play` (game), `/:szekreny/leader` (full leaderboard)
- **Validation pattern**: Check `isNaN(szekreny) || szekreny <= 0`, then query database with `findOne({ szekreny })` - redirect to `/` if not found
- Example from `app.js`:
```javascript
var szekreny = Number(req.params.szekreny);
if (isNaN(szekreny) || szekreny <= 0) return res.redirect("/");
const data = await szekrenyDB.findOne({ szekreny: szekreny });
if (!data) return res.redirect("/");
```

### Admin System (Session-Based Authentication)
- **Routes**: `/admin/login` (GET/POST), `/admin` (dashboard), `/admin/logout`
- **Password**: Stored in `process.env.ADMIN_PASSWORD`, checked on login to set `req.session.isAuthenticated`
- **Middleware**: `requireAuth(req, res, next)` protects all admin routes
- **Admin Dashboard** (`/admin`):
  - Full CRUD for szekrenys: Create new rooms, edit animals/leaders inline, delete rooms
  - Changes are **client-side only** until "Mentés" (Save) button clicked - sends PUT to `/admin/szekreny/:id/save`
  - Delete operations: Leaders deleted client-side (manual save required), Szekrenys deleted via AJAX DELETE to `/admin/szekreny/:id` (immediate)
  - Data passed to frontend: `<%- JSON.stringify(szekrenysData) %>` with `_id` converted to string for AJAX calls

### Game Logic (in `play.ejs`)
1. **Question Generation**: Randomly shows either animal name → number or number → name
2. **Scoring Formula**: `Math.round(((540-seconds) + correctAnswers*120)*1.7)`
   - Time penalty: max 9 minutes (540s), decreasing score after
   - Correct answer bonus: 120 points each
3. **Answer Handling**: String comparison uses `.replace(/\s+/g, '')` to ignore whitespace
4. **Player Names**: Duplicate prevention - updates existing score only if higher, maintains single entry per player

### Frontend Patterns
- **EJS Data Injection**: Server data passed via `<%- JSON.stringify(data) %>` into `<script>` blocks
- **SweetAlert2 v7**: Used for all dialogs - **use `type:` parameter, NOT `icon:`** (v7 syntax)
- **Visual Feedback**: `pipa.png` (checkmark) and `kereszt.png` (X) images with opacity animations
- **Hungarian Variable Names**: `allatok` (animals), `talalat` (hits), `hanyadik` (rank), `szekreny` (cabinet)

### Database Operations
- **Mongoose 8**: Uses async/await pattern (callbacks removed in v8+) - always wrap in `try/catch`
- **Custom utilities** in `app.js`:
  - `sortObj(array, key)`: Sorts objects in array by key value (custom implementation, not Lodash)
  - `shuffle(array)`: In-place Fisher-Yates shuffle for question randomization
  - `filterBySchoolYear(leaders)`: Filters leaderboard by school year (Sept 1 - Aug 31)
- **School Year Logic**: Leaderboards reset each academic year automatically via `filterBySchoolYear()` applied to all leaderboard displays

## Development Workflow

### Environment Setup
```bash
# Required: Create .env file with these variables
DB_URL=mongodb://your-connection-string
SESSION_SECRET=random-secure-string
ADMIN_PASSWORD=your-admin-password
PORT=3000  # Optional, defaults to 3000
```

### Running Locally
```bash
npm install
npm start          # Production
npm run dev        # Development with nodemon
```

### Docker Deployment
```bash
docker-compose up -d  # Runs on port 4001, connects to nginx-proxy-manager network
```

## Code Style Notes
- Comments and strings in **Hungarian** (legacy) - don't translate existing Hungarian text
- No TypeScript, no linting configured
- jQuery patterns: `.on()` with `.unbind()` for one-time handlers, `$.ajax()` for all HTTP requests
- CSS: `hasznos.css` has Bootstrap-like utilities (e.g., `marginTop1`, `fontSize9vwMobile17vw`)
- **Box-sizing fix**: All `.form-control` inputs have `box-sizing: border-box` to prevent overflow

## When Adding Features
- **New routes**: Add database-based validation (not hardcoded limits) - check if szekreny exists, redirect if not
- **Database changes**: Update schemas at top of `app.js` and regenerate data mapping in `/admin` route
- **Admin functionality**: Client-side edits require manual save - don't auto-save unless deleting entire entity
- **SweetAlert**: Use `type:` not `icon:` parameter (v7 compatibility)
- **Styling**: Use existing `hasznos.css` utilities + inline styles (no separate CSS files per page except `play.css`)

## Known Constraints
- Client-side game logic (scoring in `play.ejs`) vulnerable to manipulation - score calculated before POST
- Hard limit of 10 questions per game (sliced from shuffled array)
- Admin password in plaintext environment variable (no bcrypt hashing)
- No CSRF protection on admin forms

## Recent Updates (October 2025)
- **Dynamic room validation**: Removed hardcoded limits, now checks database for existence
- **Session-based admin**: Added express-session with password authentication
- **Admin dashboard**: Full CRUD interface with inline editing and delete functionality
- **CSS fixes**: Added global `box-sizing: border-box` to prevent input overflow
- **Node.js v22**: Upgraded with Mongoose v8 (async/await only), Express v5
