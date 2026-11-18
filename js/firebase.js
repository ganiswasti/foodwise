
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Authentication
const auth = getAuth(app);

// Check existing login before creating anonymous account
const authReady = new Promise((resolve, reject) => {

    const unsubscribe = onAuthStateChanged(auth, async (user) => {

        unsubscribe();

        try {
            if (user) {
                resolve({ user });
            } else {
                const result = await signInAnonymously(auth);
                resolve(result);
            }

        } catch (error) {
            reject(error);
        }

    }, reject);

});

export { app, db, auth, authReady };
