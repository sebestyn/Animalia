# Animalia - Complete Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technologies Used](#technologies-used)
3. [Architecture](#architecture)
4. [Database Design](#database-design)
5. [API Endpoints](#api-endpoints)
6. [Frontend Pages](#frontend-pages)
7. [Game Logic](#game-logic)
8. [Scoring System](#scoring-system)
9. [Data Flow](#data-flow)
10. [Deployment](#deployment)
11. [Development Guide](#development-guide)

---

## Project Overview

Animalia is a web-based quiz game designed for students at Kölcsey Ferenc Gimnázium in Budapest. The game features a display cabinet on the second floor filled with stuffed animals. Players must correctly identify which animal corresponds to which number (or vice versa) as quickly as possible to earn a spot on the leaderboard.

### Key Features
- Multiple rooms/cabinets (1-4) with different animal collections
- Randomized question generation (name→number or number→name)
- Real-time scoring based on accuracy and speed
- Persistent leaderboard system
- Responsive mobile-first design
- Admin interface for adding new animals

---

## Technologies Used

### Backend
- **Node.js** v22 (LTS) - JavaScript runtime
- **Express.js** v5.1.0 - Web application framework
- **Mongoose** v8.19.0 - MongoDB ODM (Object Data Modeling)
- **dotenv** v17.2.3 - Environment variable management
- **body-parser** v2.2.0 - Request body parsing middleware
- **EJS** v3.1.10 - Embedded JavaScript templating

### Frontend
- **jQuery** v3.3.1 - DOM manipulation and AJAX
- **SweetAlert2** v7.33.1 - Beautiful alert dialogs
- **Unicode Emojis** - Visual icons (no external dependencies)
- **Custom CSS** - Lightweight custom styles (~9 KB) with Bootstrap-like utilities

### Database
- **MongoDB** - NoSQL document database
- Accessed via connection string in `.env` file

### Development Tools
- **nodemon** v3.1.10 - Auto-restart development server

### Deployment
- **Docker** - Containerization
- **nginx-proxy-manager** - Reverse proxy for production

---

## Architecture

### Application Structure
```
Animalia/
├── app.js                  # Main server file (Express routes & logic)
├── package.json            # Dependencies and scripts
├── .env                    # Environment variables (DB_URL, PORT)
├── Dockerfile              # Docker image configuration
├── docker-compose.yml      # Docker deployment config
├── public/                 # Static assets
│   ├── hasznos.css        # Utility CSS classes
│   ├── hasznos.js         # Utility JavaScript functions
│   ├── play.css           # Game-specific styles
│   ├── icon.jpg           # Favicon
│   ├── pipa.png           # Checkmark image (correct answer)
│   └── kereszt.png        # X image (wrong answer)
└── views/                  # EJS templates
    ├── home.ejs           # Landing page
    ├── info.ejs           # Information/help page
    ├── start.ejs          # Room start page (top 3 leaderboard)
    ├── play.ejs           # Game interface
    ├── leaderboard.ejs    # Full leaderboard display
    └── push.ejs           # Admin: Add new animals
```

### Design Patterns
- **MVC-like Structure**: Routes in `app.js`, views in `views/`, static assets in `public/`
- **SPA Pattern**: Game logic runs client-side with AJAX for score submission
- **Server-Side Rendering**: EJS templates render pages with injected data
- **Async/Await**: All database operations use modern async patterns

---

## Database Design

### Connection
```javascript
// Environment variable required
DB_URL=mongodb://username:password@host:port/database

// Connection in app.js
mongoose.connect(process.env.DB_URL);
```

### Collections

#### 1. `szekreny` (Cabinets/Rooms)
Stores animal data for each room/cabinet.

**Schema:**
```javascript
{
  szekreny: Number,        // Room ID (1-4)
  allatok: [               // Array of animals
    {
      nev: String,         // Animal name (e.g., "Barna medve")
      szam: Number,        // Animal number in cabinet
      url: String          // Image URL (currently unused in game)
    }
  ]
}
```

**Example Document:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "szekreny": 1,
  "allatok": [
    { "nev": "Barna medve", "szam": 1, "url": "https://example.com/bear.jpg" },
    { "nev": "Róka", "szam": 2, "url": "https://example.com/fox.jpg" },
    { "nev": "Farkas", "szam": 3, "url": "https://example.com/wolf.jpg" }
  ]
}
```

#### 2. `leader` (Leaderboards)
Stores player scores for each room.

**Schema:**
```javascript
{
  szekreny: Number,        // Room ID (1-4)
  leaders: [               // Array of player scores
    {
      nev: String,         // Player name
      pont: Number,        // Score/points
      created: Date        // Timestamp (default: Date.now)
    }
  ]
}
```

**Example Document:**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "szekreny": 1,
  "leaders": [
    { "nev": "János", "pont": 1234, "created": "2025-10-04T10:30:00.000Z" },
    { "nev": "Petra", "pont": 1156, "created": "2025-10-04T11:15:00.000Z" },
    { "nev": "Márk", "pont": 982, "created": "2025-10-04T12:00:00.000Z" }
  ]
}
```

---

## API Endpoints

### Public Routes

#### `GET /`
**Description:** Home/landing page  
**Response:** Renders `home.ejs`  
**Auth:** None

#### `GET /info`
**Description:** Information page explaining the game  
**Response:** Renders `info.ejs`  
**Auth:** None

#### `GET /:szekreny`
**Description:** Room start page with top 3 leaderboard  
**Parameters:**
- `szekreny` (path) - Room number (1-2 only)

**Validation:** `szekreny <= 2 && szekreny > 0`  
**Response:** Renders `start.ejs` with room data and top 3 leaders  
**Data Passed:**
```javascript
{
  szekreny: Number,
  leaders: Array[3]  // Top 3 players
}
```

#### `GET /:szekreny/play`
**Description:** Game interface  
**Parameters:**
- `szekreny` (path) - Room number (1-4)

**Validation:** `szekreny < 5 && szekreny > 0`  
**Logic:**
1. Fetches all animals for the room
2. Shuffles animals randomly
3. Selects first 10 for the game
4. Extracts all animal names and numbers for answer options

**Response:** Renders `play.ejs`  
**Data Passed:**
```javascript
{
  szekreny: Number,
  allatok: Array[10],    // 10 shuffled animals for questions
  szamok: Array,         // All animal numbers (for options)
  nevek: Array           // All animal names (for options)
}
```

#### `GET /:szekreny/leader`
**Description:** Full leaderboard for a room  
**Parameters:**
- `szekreny` (path) - Room number (1-4)

**Validation:** `szekreny < 5 && szekreny > 0`  
**Response:** Renders `leaderboard.ejs` with all scores  
**Data Passed:**
```javascript
{
  szekreny: Number,
  leaders: Array  // All players, sorted by score
}
```

#### `POST /newResult`
**Description:** Submit game score  
**Request Body:**
```javascript
{
  szekreny: Number,  // Room ID
  nev: String,       // Player name
  pont: Number       // Score
}
```

**Logic:**
1. Finds leaderboard document for room
2. Adds new score to leaders array
3. Sorts by score (descending)
4. Finds player's rank
5. Saves to database

**Response:**
```javascript
{
  success: Number  // Player's rank (1-based)
}
```

**Error Response:**
```javascript
{
  error: String
}
```

### Admin Routes

#### `GET /pushAdmin`
**Description:** Admin interface for adding animals  
**Response:** Renders `push.ejs`  
**Auth:** ⚠️ None (unprotected!)

#### `POST /push`
**Description:** Add a new animal to a room  
**Request Body:**
```javascript
{
  szekreny: Number,  // Room ID
  nev: String,       // Animal name
  szam: Number,      // Animal number
  url: String        // Image URL
}
```

**Logic:**
1. Finds room document
2. Pushes new animal to `allatok` array
3. Saves document

**Response:**
```javascript
{
  success: String  // Animal name that was added
}
```

**Error Response:**
```javascript
{
  error: String
}
```

#### `GET /db/clear`
**Description:** ⚠️ **DANGEROUS** - Clears all leaderboards  
**Logic:**
1. Finds all leaderboard documents
2. Sets `leaders` array to empty for each
3. Saves all documents

**Response:** Redirects to `/`  
**Auth:** ⚠️ None (unprotected!)

---

## Frontend Pages

### 1. `home.ejs` - Landing Page
**Purpose:** Entry point to the application  
**Features:**
- Welcome message
- Links to room selection
- Information about the game

### 2. `info.ejs` - Information Page
**Purpose:** Explains game rules and context  
**Content:**
- Description of the cabinet
- How to play instructions
- Scoring explanation

### 3. `start.ejs` - Room Start Page
**URL Pattern:** `/:szekreny`  
**Purpose:** Room selection and mini leaderboard  
**Features:**
- Room identification
- Top 3 players display
- "Show All" button → full leaderboard
- "Continue" button → start game
- Link to info page

**Data Received:**
```javascript
{
  szekreny: Number,
  leaders: [
    { nev: String, pont: Number },
    // ... top 3
  ]
}
```

### 4. `play.ejs` - Game Interface
**URL Pattern:** `/:szekreny/play`  
**Purpose:** Main game logic and interaction  
**Features:**
- Player name input
- Timer (MM:SS format)
- Question counter (X/10)
- Dynamic question generation
- Multiple choice answers (4 options)
- Visual feedback (checkmark/X)
- Score calculation
- Result display with rank

**Game Flow:**
1. Player enters name (3-20 characters)
2. Click "Indítás" (Start)
3. Timer starts
4. 10 randomized questions appear one by one
5. Player selects answer
6. Visual feedback shown
7. Click anywhere to continue
8. After 10 questions: score calculated and saved
9. Results displayed with rank

**Client-Side Logic:** All game logic runs in browser (see [Game Logic](#game-logic))

### 5. `leaderboard.ejs` - Full Leaderboard
**URL Pattern:** `/:szekreny/leader`  
**Purpose:** Display all scores for a room  
**Features:**
- Room identification
- Full sorted leaderboard table
- Columns: Rank (#), Name (Név), Score (Pont), Date (Dátum)
- Back button to room start page

**Data Received:**
```javascript
{
  szekreny: Number,
  leaders: [
    { nev: String, pont: Number, created: Date },
    // ... all scores
  ]
}
```

### 6. `push.ejs` - Admin Panel
**URL:** `/pushAdmin`  
**Purpose:** Add new animals to rooms  
**Features:**
- Room selection dropdown
- Animal name input
- Animal number input
- Image URL input
- Submit button with AJAX

---

## Game Logic

### Question Generation (`play.ejs`)

The game randomly selects whether to ask for a number (given name) or name (given number).

```javascript
// Random selection: 0 or 1
var nevVagySzam = randomBetween(0, 1);

if (nevVagySzam) {
  // Show animal NAME, ask for NUMBER
  // Display: "Barna medve"
  // Options: [1, 5, 12, 3] (one correct, three wrong)
} else {
  // Show animal NUMBER, ask for NAME
  // Display: "5"
  // Options: ["Róka", "Farkas", "Medve", "Nyúl"]
}
```

### Answer Options Generation

**For Number Questions (name → number):**
1. Remove the correct number from all available numbers
2. Shuffle and select 3 wrong numbers
3. Add the correct number
4. Shuffle all 4 options

**For Name Questions (number → name):**
1. Remove the correct name from all available names
2. Shuffle and select 3 wrong names
3. Add the correct name
4. Shuffle all 4 options

### Answer Validation

**Number Comparison:**
```javascript
if (Number(allatok[hanyadik].szam) == Number(selectedAnswer)) {
  // Correct!
  talalat++;
  showpipa();
}
```

**String Comparison (ignores whitespace):**
```javascript
if (allatok[hanyadik].nev.replace(/\s+/g, '') == selectedAnswer.replace(/\s+/g, '')) {
  // Correct!
  talalat++;
  showpipa();
}
```

### Visual Feedback

**Correct Answer:**
- Green background (`#11bf4c`)
- Checkmark image fades in (opacity: 0 → 1)

**Wrong Answer:**
- Selected answer: Red background (`#ff0055`)
- Correct answer: Green background
- X image fades in

**Transition:**
- All options dim (opacity: 0.6)
- "Click anywhere to continue" message appears
- Body click listener activates after 10ms delay
- Next question loads

---

## Scoring System

### Formula
```javascript
var pont = Math.round(((540 - meddigJatszott) + talalat * 120) * 1.7);
```

### Components

1. **Time Component:** `540 - meddigJatszott`
   - `meddigJatszott`: Total seconds played
   - `540`: Maximum time (9 minutes)
   - **Effect:** Faster completion = higher score
   - **Range:** 540 (instant) to negative (over 9 min)

2. **Accuracy Component:** `talalat * 120`
   - `talalat`: Number of correct answers (0-10)
   - **Weight:** 120 points per correct answer
   - **Range:** 0 to 1,200 points

3. **Multiplier:** `* 1.7`
   - Scales final score by 1.7×

### Example Calculations

**Perfect Game (10/10 in 60 seconds):**
```javascript
pont = Math.round(((540 - 60) + 10 * 120) * 1.7)
     = Math.round((480 + 1200) * 1.7)
     = Math.round(1680 * 1.7)
     = Math.round(2856)
     = 2856 points
```

**Average Game (7/10 in 180 seconds):**
```javascript
pont = Math.round(((540 - 180) + 7 * 120) * 1.7)
     = Math.round((360 + 840) * 1.7)
     = Math.round(1200 * 1.7)
     = Math.round(2040)
     = 2040 points
```

**Slow Game (5/10 in 600 seconds):**
```javascript
pont = Math.round(((540 - 600) + 5 * 120) * 1.7)
     = Math.round((-60 + 600) * 1.7)
     = Math.round(540 * 1.7)
     = Math.round(918)
     = 918 points
```

### Score Ranking

After submission, the server:
1. Adds the new score to the `leaders` array
2. Sorts by `pont` (descending) using custom `sortObj()` function
3. Finds the player's position
4. Returns rank (1-based index)

---

## Data Flow

### 1. Game Start Flow
```
User enters name → Click "Indítás"
    ↓
Client: Start timer, load animals from server data
    ↓
Client: Generate first question (random type)
    ↓
Client: Display question + 4 shuffled options
```

### 2. Answer Flow
```
User clicks answer
    ↓
Client: Unbind click handlers
    ↓
Client: Validate answer (correct/wrong)
    ↓
Client: Show visual feedback (checkmark/X)
    ↓
Client: Highlight correct answer (green)
    ↓
Client: Dim all options, show "Click to continue"
    ↓
User clicks anywhere
    ↓
Client: Load next question (or finish game)
```

### 3. Game End Flow
```
10 questions completed
    ↓
Client: Calculate score (time + accuracy)
    ↓
AJAX POST /newResult
    {
      szekreny: 1,
      nev: "János",
      pont: 2856
    }
    ↓
Server: Find leaderboard document
    ↓
Server: Add score, sort, find rank
    ↓
Server: Save to database
    ↓
Server: Return rank
    {
      success: 3  // 3rd place
    }
    ↓
Client: Display results screen
    - Rank
    - Correct answers (X/10)
    - Time
    - Final score
    - Button to view leaderboard
```

### 4. Admin Add Animal Flow
```
Admin fills form (room, name, number, URL)
    ↓
AJAX POST /push
    {
      szekreny: 1,
      nev: "Tigris",
      szam: 15,
      url: "https://..."
    }
    ↓
Server: Find room document
    ↓
Server: Push to allatok array
    ↓
Server: Save document
    ↓
Server: Return success
    {
      success: "Tigris"
    }
    ↓
Client: Show success alert
```

---

## Deployment

### Environment Setup

**Required `.env` file:**
```bash
DB_URL=mongodb://username:password@host:port/database
PORT=3000  # Optional, defaults to 3000
```

### Local Development

**Install dependencies:**
```bash
npm install
```

**Run development server (with auto-restart):**
```bash
npm run dev
```

**Run production server:**
```bash
npm start
```

**Access:**
```
http://localhost:3000
```

### Docker Deployment

**Build and start container:**
```bash
docker-compose up -d
```

**Configuration (`docker-compose.yml`):**
- Container name: `animalia`
- Host port: `4001` → Container port: `3000`
- Network: `nginx-proxy-manager_default`
- Auto-restart: `unless-stopped`
- Volumes: Current directory mounted to `/app`

**Rebuild after code changes:**
```bash
docker-compose build
docker-compose up -d
```

**View logs:**
```bash
docker logs animalia -f
```

**Stop container:**
```bash
docker-compose down
```

### Production URL
```
https://animalia.debtation.hu/1
```

---

## Development Guide

### Adding a New Room

1. **Create database documents:**
   - Add `szekreny` document with room ID and empty `allatok` array
   - Add `leader` document with room ID and empty `leaders` array

2. **Update validation in routes:**
   - Adjust conditions in `/:szekreny` (currently `<= 2`)
   - Adjust conditions in `/:szekreny/play` and `/:szekreny/leader` (currently `< 5`)

### Adding Animals

**Via Admin Interface:**
1. Navigate to `/pushAdmin`
2. Select room
3. Enter animal name, number, and image URL
4. Submit

**Via Database:**
```javascript
// MongoDB shell or Compass
db.szekreny.updateOne(
  { szekreny: 1 },
  { 
    $push: { 
      allatok: { 
        nev: "Tigris", 
        szam: 15, 
        url: "https://example.com/tiger.jpg" 
      } 
    } 
  }
)
```

### Modifying the Scoring Formula

**Location:** `play.ejs`, around line 230

**Current formula:**
```javascript
var pont = Math.round(((540 - meddigJatszott) + talalat * 120) * 1.7);
```

**Adjustable parameters:**
- `540`: Maximum time in seconds (9 minutes)
- `120`: Points per correct answer
- `1.7`: Final score multiplier

### Custom Utility Functions

**`hasznos.css`** - Responsive utility classes:
- `marginTop1`, `marginTop2`, `marginTop3` - Vertical spacing
- `fontSize9vwMobile17vw` - Responsive font sizes
- `width30pcmobile90pc` - Responsive widths
- `centerVertical` - Vertical centering

**`sortObj(array, key)`** - Custom sorting algorithm:
```javascript
// Sorts array of objects by numeric key (descending)
var sorted = sortObj(leaders, "pont");
```

**`shuffle(array)`** - Fisher-Yates shuffle:
```javascript
// In-place array randomization
shuffle(allatok);
```

### Hungarian Variable Names

Common terms used in the codebase:
- `szekreny` - Cabinet/room
- `allatok` - Animals
- `szam` - Number
- `nev` - Name
- `pont` - Points/score
- `talalat` - Hits/correct answers
- `hanyadik` - Which/rank
- `nevek` - Names (plural)
- `szamok` - Numbers (plural)

### Security Considerations

⚠️ **Current Vulnerabilities:**

1. **No Admin Authentication**
   - `/pushAdmin` and `/db/clear` are publicly accessible
   - Anyone can add/delete data

2. **Client-Side Scoring**
   - Score calculation happens in browser
   - Can be manipulated via browser console
   - Should validate/recalculate on server

3. **No Input Validation**
   - Player names not sanitized (XSS risk)
   - Animal data not validated
   - Room IDs could be invalid

4. **No Rate Limiting**
   - Score submission can be spammed
   - Database could be flooded

**Recommendations:**
- Add authentication middleware for admin routes
- Move scoring calculation to server-side
- Implement input validation and sanitization
- Add rate limiting for POST routes
- Use CSRF tokens for form submissions

---

## Troubleshooting

### Common Issues

**MongoDB Connection Error:**
```bash
MongooseError: connect ECONNREFUSED
```
**Solution:** Check `.env` file has correct `DB_URL`

**Port Already in Use:**
```bash
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:** Kill process on port 3000 or change `PORT` in `.env`

**Callback Error:**
```bash
MongooseError: Model.findOne() no longer accepts a callback
```
**Solution:** Update to Mongoose 8 async/await pattern (already done)

**Docker Build Fails:**
**Solution:** Check Node version in `Dockerfile` is available

### Debug Mode

Add logging to routes:
```javascript
app.get("/:szekreny/play", async function (req, res) {
  console.log("Play route hit:", req.params.szekreny);
  // ... rest of code
});
```

---

## Future Improvements

### Potential Features
- [ ] User authentication system
- [ ] Difficulty levels (more/fewer questions)
- [ ] Time limit per question
- [ ] Image display during questions
- [ ] Achievements/badges system
- [ ] Daily/weekly leaderboards
- [ ] Multiplayer mode
- [ ] Admin dashboard with statistics
- [ ] Export leaderboard to CSV
- [ ] Animal categories/filters

### Technical Enhancements
- [ ] Server-side score validation
- [ ] Admin authentication
- [ ] Input sanitization
- [ ] Rate limiting
- [ ] WebSocket for real-time updates
- [ ] Progressive Web App (PWA)
- [ ] Automated tests (Jest/Mocha)
- [ ] API documentation (Swagger)
- [ ] Logging system (Winston)
- [ ] Error monitoring (Sentry)

---

## License

ISC

## Author

Created for Kölcsey Ferenc Gimnázium, Budapest

---

**Last Updated:** October 2025  
**Version:** 1.0.0  
**Node.js:** v22 (LTS)  
**Mongoose:** v8.19.0  
**Express:** v5.1.0
