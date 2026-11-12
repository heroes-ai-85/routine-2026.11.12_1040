import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { DailyLogsMap, LogEntry, RoutineItem } from './types';

const app = initializeApp(firebaseConfig);
// CRITICAL: Must pass firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Sync Daily Log to Cloud Firestore
export async function syncDailyLogToCloud(userId: string, dateStr: string, logs: LogEntry[]): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'dailyLogs', dateStr);
    await setDoc(
      docRef,
      {
        userId,
        dateStr,
        logs,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Failed to sync daily log to cloud:', error);
  }
}

// Sync User Config to Cloud Firestore
export async function syncConfigToCloud(
  userId: string,
  routines: RoutineItem[],
  currentRoutineIndex: number,
  lastTimestamp: number | null,
  lastAction: string | null
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'config', 'routineState');
    await setDoc(
      docRef,
      {
        userId,
        routines,
        currentRoutineIndex,
        lastTimestamp,
        lastAction,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Failed to sync config to cloud:', error);
  }
}

// Load All Daily Logs from Cloud Firestore for a user
export async function loadAllLogsFromCloud(userId: string): Promise<DailyLogsMap> {
  const result: DailyLogsMap = {};
  try {
    const colRef = collection(db, 'users', userId, 'dailyLogs');
    const snapshot = await getDocs(colRef);
    snapshot.forEach((d) => {
      const data = d.data();
      if (data && data.dateStr && Array.isArray(data.logs)) {
        result[data.dateStr] = data.logs;
      }
    });
  } catch (error) {
    console.error('Failed to load logs from cloud:', error);
  }
  return result;
}

// Load User Config from Cloud Firestore
export async function loadConfigFromCloud(userId: string): Promise<{
  routines?: RoutineItem[];
  currentRoutineIndex?: number;
  lastTimestamp?: number | null;
  lastAction?: string | null;
} | null> {
  try {
    const docRef = doc(db, 'users', userId, 'config', 'routineState');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (error) {
    console.error('Failed to load config from cloud:', error);
  }
  return null;
}
