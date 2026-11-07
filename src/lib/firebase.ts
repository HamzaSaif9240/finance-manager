import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore,
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  getDocFromServer,
  query,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { RegisteredUser, SUPER_ADMIN } from '../components/AuthScreen';
import { AppState } from '../types';

// Initialize the Firebase app with credentials
const app = initializeApp(firebaseConfig);

// Initialize services with long-polling and the custom database ID to prevent WebSocket/iFrame sandbox blocks
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */

// Standard handleFirestoreError from firebase-integration skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Catalog Logic Failed Error Info: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on load as mandated by instructions
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client is offline.");
    }
  }
}
testConnection();

/**
 * Service: Retrieves a user's details from database or registers new one
 */
export async function getOnlineUser(username: string): Promise<RegisteredUser | null> {
  const cleanUsername = username.trim().toLowerCase();
  const pathRef = `users/${cleanUsername}`;
  try {
    const docSnap = await getDoc(doc(db, 'users', cleanUsername));
    if (docSnap.exists()) {
      return docSnap.data() as RegisteredUser;
    }
    return null;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, pathRef);
    return null;
  }
}

/**
 * Service: Save or update online user registration profiles
 */
export async function registerOnlineUser(user: RegisteredUser): Promise<void> {
  const cleanUsername = user.username.trim().toLowerCase();
  const pathRef = `users/${cleanUsername}`;
  try {
    const payload = {
      ...user,
      username: cleanUsername
    };
    const sanitizedPayload = JSON.parse(JSON.stringify(payload));
    await setDoc(doc(db, 'users', cleanUsername), sanitizedPayload);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, pathRef);
  }
}

/**
 * Service: Fetch directory of all registered accounts
 */
export async function fetchAllOnlineUsers(): Promise<RegisteredUser[]> {
  const pathRef = 'users';
  try {
    const q = query(collection(db, 'users'));
    const querySnapshot = await getDocs(q);
    const users: RegisteredUser[] = [];
    querySnapshot.forEach((docSnap) => {
      users.push(docSnap.data() as RegisteredUser);
    });
    
    // Ensure Super Admin exists in the synced online database
    const superAdminExists = users.some(u => u.username === SUPER_ADMIN.username);
    if (!superAdminExists) {
      const payload: RegisteredUser = {
        ...SUPER_ADMIN,
        username: SUPER_ADMIN.username.trim().toLowerCase()
      };
      await setDoc(doc(db, 'users', SUPER_ADMIN.username), payload);
      users.push(payload);
    }
    return users;
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, pathRef);
    return [];
  }
}

/**
 * Service: Synchronize local changes to the cloud matching user state
 */
export async function saveOnlineState(username: string, state: AppState): Promise<void> {
  const cleanUsername = username.trim().toLowerCase();
  const pathRef = `user_states/${cleanUsername}`;
  try {
    const payload = {
      ...state,
      userId: cleanUsername,
      updatedAt: new Date().toISOString()
    };
    const sanitizedPayload = JSON.parse(JSON.stringify(payload));
    await setDoc(doc(db, 'user_states', cleanUsername), sanitizedPayload);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, pathRef);
  }
}

/**
 * Service: Retrieve user's online financial state once
 */
export async function fetchOnlineState(username: string): Promise<AppState | null> {
  const cleanUsername = username.trim().toLowerCase();
  const pathRef = `user_states/${cleanUsername}`;
  try {
    const docSnap = await getDoc(doc(db, 'user_states', cleanUsername));
    if (docSnap.exists()) {
      return docSnap.data() as AppState;
    }
    return null;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, pathRef);
    return null;
  }
}

/**
 * Service: Delete a user and their financial state from Firestore
 */
export async function deleteOnlineUserAndState(username: string): Promise<void> {
  const cleanUsername = username.trim().toLowerCase();
  const userRef = doc(db, 'users', cleanUsername);
  const stateRef = doc(db, 'user_states', cleanUsername);
  try {
    await deleteDoc(userRef);
    await deleteDoc(stateRef);
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `users/${cleanUsername} or user_states/${cleanUsername}`);
  }
}

export function subscribeToOnlineUser(
  username: string,
  onUpdate: (user: RegisteredUser | null) => void,
  onError: (error: any) => void
) {
  const cleanUsername = username.trim().toLowerCase();
  const userDocRef = doc(db, 'users', cleanUsername);

  return onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as RegisteredUser);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${cleanUsername}`);
    onError(error);
  });
}

/**
 * Service: Subscribe to real-time updates of client state
 */
export function subscribeToOnlineState(
  username: string,
  onUpdate: (state: AppState | null) => void,
  onError: (error: any) => void
) {
  const cleanUsername = username.trim().toLowerCase();
  const stateDocRef = doc(db, 'user_states', cleanUsername);

  return onSnapshot(stateDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      onUpdate(data as AppState);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `user_states/${cleanUsername}`);
    onError(error);
  });
}
