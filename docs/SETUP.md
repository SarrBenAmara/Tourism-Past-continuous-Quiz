# Setup guide – Firebase + GitHub Pages (all free)

Time needed: about 30–40 minutes the first time. You need a Google account and a GitHub account.
Menu names in the Firebase console change from time to time; if a label is slightly different, look for the closest match.

---

## Part A – Firebase

### 1. Create the project
1. Go to <https://console.firebase.google.com> → **Create a project** (or *Add project*).
2. Name it, e.g. `tourism-quiz-challenge`. Google Analytics is not needed – you can switch it off.
3. The project starts on the free **Spark** plan. Do **not** upgrade; nothing in this game needs Blaze.

### 2. Create the Realtime Database
1. In the left menu: **Build → Realtime Database → Create database**.
2. Location: choose the closest one (for Tunisia, **Belgium (europe-west1)**).
3. Security rules: choose **Start in locked mode**. (You will paste the real rules in step 5.)
4. Copy the database URL shown at the top of the **Data** tab, e.g.
   `https://tourism-quiz-challenge-default-rtdb.europe-west1.firebasedatabase.app` – you need it in step 7.

### 3. Turn on sign-in methods
1. **Build → Authentication → Get started**.
2. Tab **Sign-in method** → enable **Anonymous** (for students) → Save.
3. Enable **Email/Password** (for the teacher) → Save.

### 4. Create the teacher account
1. **Authentication → Users → Add user**. Enter the teacher's email and a strong password.
2. In the users list, copy the **User UID** of that account (a long code such as `Xy12AbC…`).

### 5. Publish the security rules
1. **Realtime Database → Rules** tab.
2. Delete everything there and paste the full contents of `database.rules.json` from this project.
3. Click **Publish**.

> Alternative for people comfortable with a terminal: copy `.firebaserc.example` to `.firebaserc`, put your project ID in it,
> then run `npm run deploy:rules` (you will be asked to log in to Firebase the first time).

### 6. Approve the teacher account
Teacher rights come from a list that only you can edit in the console:
1. **Realtime Database → Data** tab.
2. Hover over the root of the database and click **+**.
3. Key: `teachers` – then click **+** next to it to add a child: Key = *the User UID from step 4*, Value = `true`.
   (Make sure the value is the boolean `true`, not the text `"true"`.)
4. Click **Add**. You should see `teachers → <UID>: true`.

To add another teacher later, create the user (step 4) and add their UID here.

### 7. Register the web app and copy its settings
1. Click the ⚙️ gear → **Project settings** → **General** → *Your apps* → the **Web** icon `</>`.
2. App nickname: `Tourism Quiz Web`. **Do not** tick Firebase Hosting (we use GitHub Pages). Register.
3. You will see a `firebaseConfig` block. Keep this page open – you need these 7 values:

| Value in firebaseConfig | Environment variable |
| --- | --- |
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `databaseURL` | `VITE_FIREBASE_DATABASE_URL` (if missing, use the URL from step 2) |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |

---

## Part B – Try it on your computer (optional but recommended)

1. Install **Node.js 20 or newer** from <https://nodejs.org>.
2. In the project folder:
   ```bash
   npm install
   cp .env.example .env.local     # on Windows: copy .env.example .env.local
   ```
3. Open `.env.local` and paste the 7 values from step 7.
4. `npm run dev` and open the address it prints (usually <http://localhost:5173>).
5. Click **Host Game**, sign in with the teacher account, open **Question Bank → Import file**, choose
   `private-question-bank/tourism-unit3.json`, then **Save changes**. This uploads the 36 questions to your private
   database node. You only do this once – the bank stays in Firebase.

To test with phones on the same Wi‑Fi: `npm run dev -- --host`, then open the "Network" address on the phones.

---

## Part C – Publish on GitHub Pages

### 8. Create the repository
1. On GitHub: **New repository**, e.g. `tourism-quiz-challenge`. It must be **Public** for free GitHub Pages.
   That is safe: the answer key is **not** in the repository (the `private-question-bank` folder is ignored by git), and your
   Firebase settings go into encrypted secrets.
2. Upload the project:
   ```bash
   git init
   git add .
   git commit -m "Tourism Quiz Challenge"
   git branch -M main
   git remote add origin https://github.com/<your-username>/tourism-quiz-challenge.git
   git push -u origin main
   ```
   Check on GitHub that there is **no** `private-question-bank` folder and **no** `.env.local` file in the repository.

### 9. Add the Firebase settings as secrets
Repository → **Settings → Secrets and variables → Actions → New repository secret**. Add the 7 secrets from the table in
step 7, with exactly those names (`VITE_FIREBASE_API_KEY`, …).

### 10. Switch on GitHub Pages
Repository → **Settings → Pages** → *Build and deployment* → **Source: GitHub Actions**.

### 11. Deploy
Go to the **Actions** tab. The workflow "Deploy to GitHub Pages" runs on every push to `main` (you can also start it with
**Run workflow**). It runs the tests, builds the site with your secrets and publishes it. When it is green, the site is at:

```
https://<your-username>.github.io/tourism-quiz-challenge/
```

### 12. Allow the GitHub domain in Firebase
Firebase console → **Authentication → Settings → Authorized domains → Add domain** → `<your-username>.github.io`.

### 13. Import the question bank (if you skipped Part B)
Open the published site → **Host Game** → sign in → **Question Bank → Import file** → choose
`private-question-bank/tourism-unit3.json` from your computer → **Save changes**.

---

## Optional hardening (free)

* **Restrict the API key** – Google Cloud console → *APIs & Services → Credentials* → your "Browser key" →
  *Application restrictions: Websites* → add `https://<your-username>.github.io/*` and `http://localhost:5173/*`.
* **App Check** with reCAPTCHA can reduce abuse of anonymous sign-in. It is not required for classroom use.
* Delete finished rooms from the teacher dashboard now and then (they are tiny, but it keeps things tidy).

## Updating the game later

Edit the code, commit and push to `main` – GitHub Actions rebuilds and republishes automatically. If you change
`database.rules.json`, paste it into the Firebase **Rules** tab again (or run `npm run deploy:rules`).
