# Animalia - AI Coding Instructions

## Project Overview
Animalia is a quiz game web app for identifying stuffed animals in a school display cabinet. Players match animal names to numbers or vice versa, competing for leaderboard positions based on speed and accuracy.

## Architecture

### Tech Stack
- **Backend**: Express.js (Node.js) with EJS templates
- **Database**: MongoDB via Mongoose with two collections:
  - `szekreny` (cabinet/room): Stores animal data (name, number, image URL) per room
  - `leader` (leaderboard): Stores player scores per room
- **Frontend**: jQuery-based SPA pattern within EJS templates, Bootstrap 4, SweetAlert2
- **Deployment**: Docker with nginx-proxy-manager network

### Data Model
```javascript
// Room/Cabinet (szekreny)
{ szekreny: Number, allatok: [{ nev: String, szam: Number, url: String }] }

// Leaderboard
{ szekreny: Number, leaders: [{ nev: String, pont: Number, created: Date }] }
```

## Critical Patterns

### URL Structure & Room System
- Room IDs (szekreny) are integers 1-4, hardcoded in route validation
- Routes: `/:szekreny` (start), `/:szekreny/play` (game), `/:szekreny/leader` (full leaderboard)
- **Always validate**: `szekreny <= 2 && szekreny > 0` for start page, `< 5 && > 0` for play/leader

### Game Logic (in `play.ejs`)
1. **Question Generation**: Randomly shows either animal name → number or number → name
2. **Scoring Formula**: `Math.round(((540-seconds) + correctAnswers*120)*1.7)`
   - Time penalty: max 9 minutes (540s), decreasing score after
   - Correct answer bonus: 120 points each
3. **Answer Handling**: 
   - String comparison uses `.replace(/\s+/g, '')` to ignore whitespace
   - Shuffle functions exist both server-side (`app.js`) and client-side (`play.ejs`)

### Frontend Patterns
- **EJS Data Injection**: Server data passed via `<%- JSON.stringify(data) %>` into `<script>` blocks
- **SweetAlert2**: Used for all user notifications (not native alerts)
- **Visual Feedback**: `pipa.png` (checkmark) and `kereszt.png` (X) images with opacity animations
- **Hungarian Variable Names**: `allatok` (animals), `talalat` (hits), `hanyadik` (which/rank), etc.

### Database Operations
- **Mongoose 8**: Uses async/await pattern (callbacks removed in v8+)
- All database operations use `async function` with `try/catch` for error handling
- **Custom sort**: `sortObj(array, key)` function sorts objects in array by key value
- **Array manipulation**: In-place shuffling and slicing for question generation

## Development Workflow

### Environment Setup
```bash
# Required: Create .env file with DB_URL
DB_URL=mongodb://your-connection-string
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

### Admin Routes
- `/pushAdmin` (GET): Admin UI for adding animals
- `/push` (POST): Add animal to room
- `/db/clear` (GET): **Dangerous** - clears all leaderboards

## Code Style Notes
- Comments and some strings in Hungarian (legacy)
- No TypeScript, no linting configured
- jQuery `.on()` with `.unbind()` for one-time event handlers
- Client-side AJAX uses `$.ajax()` with callbacks
- CSS utility classes in `hasznos.css` (e.g., `marginTop1`, `fontSize9vwMobile17vw`)

## When Adding Features
- **New routes**: Add `szekreny` validation matching existing patterns
- **Database changes**: Update both schemas at top of `app.js` and relevant queries
- **Frontend interactions**: Follow jQuery pattern with SweetAlert2 for feedback
- **Scoring logic**: Modify formula in `play.ejs` around line 230-235
- **Styling**: Use existing Bootstrap classes + custom `hasznos.css` utilities

## Known Constraints
- No authentication/authorization on admin routes
- Client-side game logic vulnerable to manipulation (scoring happens client-side, then POSTed)
- Hard limit of 10 questions per game (sliced from shuffled array)

## Recent Updates (October 2025)
- **Node.js**: Upgraded to v22 (latest LTS)
- **Mongoose**: v6 → v8 (all callbacks converted to async/await)
- **Express**: v4 → v5
- All dependencies updated to latest versions
