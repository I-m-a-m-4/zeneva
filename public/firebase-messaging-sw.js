importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
  apiKey: "AIzaSyCwHoA6JCTKw4FTVtRFvKV6wEKfTiuHxmg",
  authDomain: "studio-3699136485-6747d.firebaseapp.com",
  projectId: "studio-3699136485-6747d",
  storageBucket: "studio-3699136485-6747d.appspot.com",
  messagingSenderId: "382067240570",
  appId: "1:382067240570:web:b5e639d22cbc047c9195c3",
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/zeneva.png', // path to your app logo
    badge: '/badges/pos-professional.png' // small monochrome icon preferably
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
