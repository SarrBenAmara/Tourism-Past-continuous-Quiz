import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'

const env = import.meta.env

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

const useEmulators = env.VITE_USE_EMULATORS === 'true'

/** True when the Firebase environment variables have been filled in. */
export const firebaseConfigured = Boolean(
  (firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId) || useEmulators,
)

let app = null
let auth = null
let db = null

if (firebaseConfigured) {
  app = initializeApp(
    useEmulators
      ? {
          apiKey: firebaseConfig.apiKey || 'demo-key',
          projectId: firebaseConfig.projectId || 'demo-tourism-quiz',
          databaseURL: `http://127.0.0.1:9000?ns=${firebaseConfig.projectId || 'demo-tourism-quiz'}`,
        }
      : firebaseConfig,
  )
  auth = getAuth(app)
  db = getDatabase(app)
  if (useEmulators) {
    const host = window.location.hostname || '127.0.0.1'
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
    connectDatabaseEmulator(db, host, 9000)
  }
}

export { app, auth, db }
