
import { auth, authReady } from "./firebase.js";

import {
    EmailAuthProvider,
    linkWithCredential,
    signInWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// ===================================
// FOODWISE - LOGIN AND REGISTRATION
// ===================================

// LOGIN
const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        const message = document.getElementById("loginMessage");

        message.textContent = "Logging in...";

        try {

            await authReady;

            await signInWithEmailAndPassword(auth, email, password);

            message.textContent = "Login successful! 💗";

            window.location.href = "./index.html";

        } catch (error) {

            console.error("Login error:", error);

            message.textContent = "Login failed. Please check your email and password.";

        }

    });

}


// REGISTRATION
const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const name = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        const message = document.getElementById("registerMessage");

        if (password !== confirmPassword) {
            message.textContent = "Passwords do not match!";
            return;
        }

        if (password.length < 6) {
            message.textContent = "Password must contain at least 6 characters.";
            return;
        }

        message.textContent = "Creating your account...";

        try {

            await authReady;

            const currentUser = auth.currentUser;

            // Preserve the existing anonymous account and inventory
            if (!currentUser || !currentUser.isAnonymous) {
                message.textContent =
                    "Please sign out before creating another account.";
                return;
            }

            const credential = EmailAuthProvider.credential(email, password);

            const result = await linkWithCredential(
                currentUser,
                credential
            );

            // Save the user's name
            await updateProfile(result.user, {
                displayName: name
            });

            message.textContent = "Account created successfully! 💗";

            window.location.href = "./index.html";

        } catch (error) {

            console.error("Registration error:", error);

            if (error.code === "auth/email-already-in-use") {
                message.textContent =
                    "This email already has an account. Please login instead.";
            } else {
                message.textContent =
                    "Registration failed. Please try again.";
            }

        }

    });

}
