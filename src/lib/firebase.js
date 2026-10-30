import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, setDoc, updateDoc, deleteDoc, onSnapshot, deleteField, getDocs, writeBatch,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCknTIyR0eQLvGh9jzgzeLEth7uneDGJl0',
  authDomain: 'last-bell-77238.firebaseapp.com',
  projectId: 'last-bell-77238',
  storageBucket: 'last-bell-77238.firebasestorage.app',
  messagingSenderId: '747392670169',
  appId: '1:747392670169:web:3bcea76bb13cf8e77fa1c8',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export const signInGoogle = () => signInWithPopup(auth, provider);
export const signOutUser = () => fbSignOut(auth);
export const onAuth = (fn) => onAuthStateChanged(auth, fn);

export const userDoc = (uid) => doc(db, 'users', uid);
export const entriesCol = (uid) => collection(db, 'users', uid, 'entries');
export const entryDoc = (uid, id) => doc(db, 'users', uid, 'entries', id);
export { setDoc, updateDoc, deleteDoc, onSnapshot, deleteField, getDocs, writeBatch };
