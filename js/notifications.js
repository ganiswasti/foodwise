
import { app } from "./firebase.js";

import {
    getMessaging,
    getToken,
    onMessage
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging.js";

// Initialize Firebase Messaging
const messaging = getMessaging(app);

// Your Firebase VAPID public key
const vapidKey = "PASTE_YOUR_VAPID_PUBLIC_KEY_HERE";

// Enable notifications
export async function enableNotifications() {
    try {
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            alert("Notification permission was not granted.");
            return;
        }

        const registration = await navigator.serviceWorker.register(
            "./firebase-messaging-sw.js"
        );

        const token = await getToken(messaging, {
            vapidKey: vapidKey,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log("FoodWise notification token:", token);
            alert("FoodWise notifications enabled successfully!");
        } else {
            alert("Could not generate a notification token.");
        }

    } catch (error) {
        console.error("Notification setup error:", error);
        alert("Notification setup failed. Please check the Console.");
    }
}

// Receive notifications while FoodWise is open
onMessage(messaging, function(payload) {
    console.log("FoodWise notification received:", payload);

    const title = payload.notification?.title || "FoodWise Reminder";
    const body = payload.notification?.body || "Check your food inventory!";

    if (Notification.permission === "granted") {
        new Notification(title, { body: body });
    }
});
