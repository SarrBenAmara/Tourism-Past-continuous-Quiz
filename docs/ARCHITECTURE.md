# Technical architecture

## 1. The big picture

```
 ┌──────────────────────────┐         ┌───────────────────────────────┐        ┌──────────────────────┐
 │ Teacher laptop/projector │ ◄─────► │  Firebase Realtime Database   │ ◄────► │ Student phones (×30) │
 │  signed in with email    │  live   │  + Security Rules (server)    │  live  │ anonymous sign-in    │
 │  = trusted game host     │ sockets │  + Authentication             │sockets │ A/B/C/D buttons only │
 └──────────────────────────┘         └───────────────────────────────┘        └──────────────────────┘
              ▲                                                                           ▲
              └──────────── same static website, served free by GitHub Pages ─────────────┘
```

* **GitHub Pages** serves the website (HTML, JavaScript, images). It is static hosting only – it cannot run server code.
* **Firebase Realtime Database** keeps every device in sync through live listeners. When the teacher opens a question,
  every phone sees its answer buttons within a fraction of a second; when a student taps, the projector counter updates.
* **Firebase Security Rules** run on Google's servers for every read and write. They are the "back end" of this game.

## 2. Why there is no Cloud Function (and what replaces it)

The brief asks for server-calculated scores. On Firebase that would normally be a **Cloud Function**, but Cloud Functions
**require the paid Blaze plan** (a billing card must be attached, even though there is a free allowance). To stay 100 % on the
free Spark plan, the design splits the "server" job in two:

| Job | Who does it | Why students can't cheat |
| --- | --- | --- |
| Accept answers, timestamp them, enforce the deadline, allow one answer per student | **Security Rules (Google's servers)** | Rules check the phase, the question key, the server time (`now`) against the server-stored deadline, that the answer is new, that the value is 0–3, and that the timestamp *is* the server time. |
| Calculate results, scores and the team board | **The teacher's signed-in browser** | Only the host account of the room can write `results`, `scores` and `teamBoard`. Students have no write access at all to these paths. |
| Control the game (start, pause, reveal, next, end) | **The teacher's browser** | Only the host can write `state`. Students cannot change the phase. |

The teacher's account is a real email/password account **and** must be listed in `/teachers/<uid>` – a list that can only be
changed in the Firebase console. Teacher rights never come from a client-side flag.

Because answers are stored with server timestamps and cannot be edited or deleted by students, scoring is fully
reproducible: the host recalculates totals from all stored results every time, so re-running a reveal (for example after the
teacher's browser refreshes) gives exactly the same scores.

**What this design does not protect against:** a teacher who deliberately edits scores in their own browser. That is
acceptable for a classroom game. If you later want scoring to run on Google's servers, upgrade to Blaze and move
`closeAndScore()` from `src/services/hostService.js` into a Cloud Function triggered by the phase change – the database layout
does not need to change.

## 3. Database layout

```
teachers/<uid>: true                      ← set by hand in the console (teacher allow-list)
banks/<teacherUid>                        ← question bank WITH answers – readable only by that teacher
hostRooms/<teacherUid>/<code>: createdAt  ← lets the teacher resume rooms after a refresh
rooms/<code>/                             ← code = 6 digits
  meta        {hostUid, createdAt, teamCount, timerSec, speedBonus, rankBy, lateJoin, autoClose, shuffleOrder, categories}
  state       {phase, qIndex, qNumber, qKey, total, openedAt, durationMs, totalMs, elapsedMs, segs, reveal}
  hostOnline  true/false (with onDisconnect)        ← phones show "teacher reconnecting"
  hostData    {questions:[…with answers…]}          ← host-only snapshot of this game's questions
  names/<nameKey>: uid                              ← atomic claim, prevents duplicate names
  players/<uid> {name, nameKey, joinedAt}
  presence/<uid>: true/false (with onDisconnect)
  banned/<uid>: true
  teams/<uid>: "A" | "B" | "C" | "D"
  answers/<qKey>/<uid> {c: 0-3, t: serverTimestamp}
  results/<qKey>/<uid> {c, ok, pts}
  scores/<uid> {total, correct, answered}
  teamBoard/<A-D> {total, members, avg, rank}
```

### Who can read what

| Path | Teacher (host) | Student |
| --- | --- | --- |
| `meta`, `state`, `hostOnline`, `teamBoard` | read/write | read |
| `hostData` (answer key) | read/write | **no access** |
| `players/<uid>`, `teams/<uid>`, `scores/<uid>`, `results/…/<uid>`, `answers/…/<uid>`, `banned/<uid>` | read/write all | read **own only** |
| `answers/<q>/<own uid>` | read | write once, while open, before the deadline |
| `banks/<teacherUid>` | owner only | **no access** |

The question text is **never** written to a student-readable path. The projector is the teacher's own browser, which reads
the questions from the host-only `hostData`. The correct answer only appears in `state.reveal` after the question is closed.

The question bank is also **not bundled into the website**, so it cannot be found by inspecting the site's JavaScript. The
teacher imports it once from `private-question-bank/tourism-unit3.json` into their private database node.

## 4. Game phases

```
lobby → teams → preview → question ⇄ paused → closed → reveal → (leaderboard) → preview → … → ended
```

* **preview** – question and options on the projector; phones say "Look at the screen". Grammar and vocabulary questions open
  automatically after 5 s; reading questions wait for the teacher's **Start answering** button so students can read.
* **question** – `openedAt` is a server timestamp; the deadline is `openedAt + durationMs`, enforced by the rules (+1 s grace for
  network delay). The projector closes the question when time runs out, when everyone has answered (optional), or on demand.
* **paused** – answering is blocked by the rules; resuming opens a new time segment. The speed bonus only counts time that the
  question was actually open.
* **closed → reveal** – answers are locked first, then scored. Students see correct/incorrect and their points.

## 5. Scoring

* Correct answer: **100 points**. Incorrect or no answer: **0**.
* Optional speed bonus: up to **+50**, decreasing linearly with the time taken.
* Team score = sum of its members' points. Optional ranking by **average points per member** for uneven teams.

## 6. Robustness

| Situation | What happens |
| --- | --- |
| Student refreshes / loses Wi‑Fi | Anonymous sign-in persists on the device; the phone reconnects to the same player, team and score. Presence turns grey on the projector while offline. |
| Duplicate submission | Rules allow exactly one answer per student per question; the buttons also lock locally. |
| Duplicate name | Names are claimed atomically (`names/<key>`): "Amira B" and "amira-b" count as the same. The teacher can remove or block names. |
| Invalid / expired room code | Friendly message. Rooms expire for joining after 12 hours. |
| Joining after the start | Allowed by default (setting). Late joiners are placed in the smallest team automatically. |
| Teacher's browser closes | The game state is all in the database. Phones show "Mrs Sarra's screen is reconnecting…". Re-open the dashboard → **Resume** and continue exactly where you were (a half-scored question finishes scoring automatically). |

## 7. Free-plan limits (Spark)

| Limit | Value | What it means for class |
| --- | --- | --- |
| Simultaneous connections | **100** | One class of 30 + projector uses ~31. Three classes playing at the same moment would still fit. |
| Stored data | 1 GB | A whole game is a few hundred kilobytes. Delete old rooms from the dashboard now and then. |
| Downloads | 10 GB / month | A 36-question game with 30 students uses well under 50 MB. |
| Cloud Functions | **not available** | Hence the rules + trusted-teacher design above. |

If a limit is ever reached, Firebase simply refuses new connections until the next period – it never charges you on Spark.

**GitHub Pages limits:** static files only (fine – there is no server code), the repository must be public on a free GitHub
account, 1 GB site size, ~100 GB/month bandwidth. The Firebase web settings end up in the published JavaScript; that is normal
and safe – Firebase web keys identify the project but give no access on their own. All protection comes from the rules.

## 8. Question types

Every question is multiple choice with exactly four options and one correct answer. The brief also mentions
"free-text response", but it also says not to implement typed answers and that every question must have four options, so free
text is not included. If you want it later, it would need a different student screen (a text box) and manual marking by the
teacher.
