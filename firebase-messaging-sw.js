
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

// Replace these values with your actual Firebase configuration
firebase.initializeApp({
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
});

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Receive background notifications
messaging.onBackgroundMessage(function(payload) {
    console.log("Background notification received:", payload);

    const notificationTitle =
        payload.notification?.title || "FoodWise Reminder";

    const notificationOptions = {
        body: payload.notification?.body || "Check your food inventory!",
        icon: "./images/logo.png"
    };

    self.registration.showNotification(
        notificationTitle,
        notificationOptions
    );
});
