/**
 * analytics.js
 * Handles Firebase Analytics initialization and event tracking.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAnalytics, logEvent, setAnalyticsCollectionEnabled } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';

// 1. Firebase Configuration (Must match your other files)
const firebaseConfig = {
    apiKey: "AIzaSyBkVYS0CaKe1kHPp9GVnURiZz5WP5tE3iM",
    authDomain: "top-autocare.firebaseapp.com",
    projectId: "top-autocare",
    storageBucket: "top-autocare.firebasestorage.app",
    messagingSenderId: "879247821822",
    appId: "1:879247821822:web:e6a418395d52aac99a4eaf",
    measurementId: "G-T5NDM5M33Z"
};

// 2. Initialize Firebase App & Analytics
// We check if an app is already initialized to prevent errors if included multiple times
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (e) {
    // App already initialized (likely in the main script of the page)
    // This block might not be reached depending on import order, but is good safety.
}

const analytics = getAnalytics(app);

// 3. Helper Function to determine environment
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Disable analytics on localhost to avoid polluting production data
if (isLocalhost) {
    setAnalyticsCollectionEnabled(analytics, false);
    console.log('📊 Analytics disabled on localhost');
} else {
    setAnalyticsCollectionEnabled(analytics, true);
}

// 4. Automatically Log Page View
const pageTitle = document.title;
logEvent(analytics, 'page_view', {
    page_title: pageTitle,
    page_location: window.location.href,
    page_path: window.location.pathname
});
console.log(`📊 Page View Logged: ${pageTitle}`);

// 5. Expose a Global Function for Custom Events
// This allows you to call window.trackEvent('button_click', { id: 'submit' }) from standard HTML scripts
window.trackEvent = (eventName, eventParams = {}) => {
    if (!isLocalhost) {
        logEvent(analytics, eventName, eventParams);
    }
    console.log(`📊 Custom Event Logged: ${eventName}`, eventParams);
};

// 6. Track Performance Metrics (Basic Load Time)
window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    
    if (!isLocalhost) {
        logEvent(analytics, 'performance_timing', {
            value: pageLoadTime,
            metric: 'load_time_ms'
        });
    }
});

// Export analytics instance if needed by other modules
export { analytics };
