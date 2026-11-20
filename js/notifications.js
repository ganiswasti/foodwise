
import { app } from "./firebase.js";

import {
    getMessaging,
    getToken,
    onMessage
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging.js";

const messaging = getMessaging(app);

// Replace this placeholder with your actual Firebase Web Push Key Pair
const vapidKey = "BBJMKgEIFkAuz47E8qI20HSbxPrdYmYl43iM_BXH-FzyVBi_ZwB15RX9SVKz6I5wK3pYp-TBHABMPHRtxuEdH4w";

export async function enableNotifications() {
    try {
        if (!("Notification" in window)) {
            alert("This browser does not support notifications.");
            return;
        }

        if (!("serviceWorker" in navigator)) {
            alert("Service workers are not supported by this browser.");
            return;
        }

        if (!vapidKey || vapidKey.includes("PASTE_YOUR")) {
            alert("Please add your Firebase VAPID public key first.");
            return;
        }

        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            alert("Notification permission was not granted.");
            return;
        }

        const registration = await navigator.serviceWorker.register(
            "./firebase-messaging-sw.js"
        );

        await navigator.serviceWorker.ready;

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

onMessage(messaging, (payload) => {
    console.log("FoodWise notification received:", payload);

    const title = payload.notification?.title || "FoodWise Reminder";
    const body = payload.notification?.body || "Check your food inventory!";

    if (Notification.permission === "granted") {
        new Notification(title, { body });
    }
});
