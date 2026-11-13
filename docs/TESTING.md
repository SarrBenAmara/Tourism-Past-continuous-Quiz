# Testing

## What has been tested so far

| Check | How | Result |
| --- | --- | --- |
| Game logic (team balancing for 0–37 players × 2/3/4 teams, room codes, name cleaning, speed bonus across pauses, scoring, totals, team averages and tied ranks, question-bank validation, passage questions kept together) | `npm run test:unit` (Vitest) | 10/10 pass |
| Security rules – 82 scenarios replaying the app's real writes and cheating attempts (forged scores, changing answers, late answers, fake timestamps, reading answer keys or other students' data, stealing names, self-assigning teams, blocked users, expired rooms, impersonating the teacher…) | `npm run test:rules-offline` (Targaryen rules simulator) | 82/82 pass |
| Every screen rendered at 1600×900, 1280×800 and 390×844 (phone) | Design preview gallery (`npm run dev`, open `#/__preview`) | Visually checked |
| Production build | `npm run build` | OK; the answer key and preview gallery are not in the build |

**Not yet tested:** the live game against a real Firebase project on several real devices. The development sandbox could not
reach Firebase's servers or download the Firebase emulator, so **please run the multi-device test below before using the game
with a class**. The rules simulator is very close to Firebase but not identical – the live test is the final proof.

## Automated tests

```bash
npm test                     # unit tests + offline rules simulation (also runs on GitHub before each deploy)
```

## Local multi-device test with the Firebase Emulator (no real project needed)

Needs Java 11+ installed (<https://adoptium.net>).

1. Terminal 1: `npm run emulators` – starts a local Auth + Realtime Database using `database.rules.json`.
   The emulator UI is at <http://localhost:4000>.
2. In the emulator UI → **Authentication → Add user** (teacher email/password). Copy its UID.
   Then **Realtime Database** → add `teachers/<UID>: true`.
3. Create `.env.local` with just: `VITE_USE_EMULATORS=true`
4. Terminal 2: `npm run dev -- --host`
5. Open the printed *Network* address on the laptop (teacher) and on phones on the same Wi‑Fi (students).

## Live test checklist (real Firebase, real devices) – about 15 minutes

Use the projector laptop + at least **3 phones** (or 1 phone + 2 laptop browsers in **separate private/incognito windows** –
tabs in the same normal window share one sign-in and count as the same person).

**Setup & joining**
- [ ] Teacher: Host Game → sign in → dashboard shows "Question bank ready: 36 questions".
- [ ] Create a Game Room → six-digit code appears; Copy works; QR code opens the join page on a phone.
- [ ] Phone 1 joins with the code and name "Amira" → appears on the projector within ~1 s; phone shows "You're in!".
- [ ] Phone 2 tries name "amira" → refused ("already taken"). Joins as "Omar".
- [ ] Wrong code (e.g. 000000) → "We could not find that room".
- [ ] Remove Omar (×) → Omar's phone shows "You're not in this room"; he can rejoin with another name.
- [ ] Block a player → that phone can no longer join this room.

**Teams**
- [ ] Select 2 teams → Generate Teams → each phone shows its team; Reshuffle changes them; sizes differ by ≤ 1.

**Questions & answers**
- [ ] Start Game → projector shows Question 1; phones say "Look at the screen" (no question text on phones).
- [ ] Timer starts (automatically for grammar/vocabulary, with **Start answering** for reading) → phones show A/B/C/D.
- [ ] Tap an answer → "Answer submitted!", buttons locked; projector counter goes up ("1 / 3 students have answered").
- [ ] Refresh that phone → it still shows "Answer submitted!" (cannot answer twice).
- [ ] Pause → phones show "Paused" and cannot answer; Resume → timer continues from where it stopped.
- [ ] Let the timer run out → answering stops on all phones at the same moment.
- [ ] Reveal shows the correct answer highlighted, how many chose each option, and the explanation.
- [ ] Each phone shows Correct/Incorrect and points; team points update on the projector and phones.

**Leaderboard & end**
- [ ] Leaderboard → animated team bars; toggle "Rank by average per member" in a new room and compare.
- [ ] Final results → trophy, podium and confetti; winning team's phones celebrate.
- [ ] Play again (same teams) → scores reset to 0.

**Resilience**
- [ ] Turn a phone's Wi‑Fi off for 20 s during a question, then on → it reconnects with the same team and score.
- [ ] Close the projector tab during a question → phones show "Mrs Sarra's screen is reconnecting…". Re-open the site →
      Host Game → Resume → the game continues.
- [ ] Join late (after the start) with "Allow late joiners" on → the new student is put in the smallest team.
- [ ] Mute button silences sounds; with the OS "Reduce motion" setting on, animations and confetti are minimal.

**Security spot-checks** (optional, for the curious)
- [ ] On a student phone, open `https://<project>-default-rtdb.<region>.firebasedatabase.app/rooms/<code>.json` – you get
      "Permission denied" (students cannot download the room, answers or answer key).
