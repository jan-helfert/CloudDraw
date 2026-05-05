import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBlKzFTb2aG6BvcIKXwdEYFZKk-mWyhM5w",
  authDomain: "clouddraw-b3a85.firebaseapp.com",
  databaseURL: "https://clouddraw-b3a85-default-rtdb.firebaseio.com",
  projectId: "clouddraw-b3a85",
  storageBucket: "clouddraw-b3a85.firebasestorage.app",
  messagingSenderId: "815084430688",
  appId: "1:815084430688:web:335a2995f286cf3edaaa05"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);