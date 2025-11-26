/**
 * sw.js
 * Production Service Worker for Top Autocare PWA
 * Version: 1.0.0
 */

const CACHE_NAME = 'top-autocare-v1';
const DYNAMIC_CACHE_NAME = 'top-autocare-dynamic-v1';

// 1. Files to Pre-cache (The "App Shell")
// These files are downloaded immediately when the SW installs.
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/signin.html',
    '/signup.html',
    '/dashboard.html',
    '/myvehicles.html',
    '/book-appointment.html',
    '/services.html',
    '/profile.html',
    '/verify-email.html',
    '/forgot-password.html',
    '/terms-of-service.html',
    '/privacy-policy.html',
    '/manifest.json',
    '/analytics.js',
    '/service-worker-manager.js',
    // Local Images (Ensure these exist in your folder structure)
    '/assets/images/favicon.ico',
    '/assets/images/app-icon-192.png',
    '/assets/images/logo.png',
    // External CDNs (Optional: caching these speeds up load, but requires internet on first load)
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap'
];

// --- INSTALL EVENT ---
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    // Forces the waiting service worker to become the active service worker
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching App Shell');
            // We use Promise.allSettled or just addAll. 
            // Note: If ANY of these files are missing (404), installation fails.
            // Ensure all paths in ASSETS_TO_CACHE exist.
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// --- ACTIVATE EVENT ---
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    // Clean up old caches if versions change
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    
    // Tell the service worker to take control of the page immediately
    return self.clients.claim();
});

// --- FETCH EVENT ---
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. IGNORE FIREBASE/API REQUESTS
    // Firebase SDK handles its own offline persistence via IndexedDB.
    // Intercepting these usually causes Auth issues or stale data.
    if (
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('googleapis.com') || 
        url.hostname.includes('firebaseio.com') ||
        url.pathname.includes('/api/') 
    ) {
        return; // Let the browser/SDK handle it directly
    }

    // 2. HTML/NAVIGATION: Network First, Fallback to Cache
    // We want the user to get the latest page structure if they have internet.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // If offline, return cached page
                    return caches.match(event.request).then((cachedResponse) => {
                        if (cachedResponse) return cachedResponse;
                        // Optional: Return a custom offline.html if specific page not found
                        // return caches.match('/offline.html');
                    });
                })
        );
        return;
    }

    // 3. STATIC ASSETS (JS, CSS, Images): Stale-While-Revalidate
    // Load from cache instantly, then update cache in background.
    if (
        event.request.destination === 'style' ||
        event.request.destination === 'script' ||
        event.request.destination === 'image' ||
        event.request.destination === 'font'
    ) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // Update cache
                    caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                    return networkResponse;
                }).catch(err => {
                    // Network failed, nothing to do (we already have cachedResponse or null)
                });

                // Return cached response immediately if available, otherwise wait for network
                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // 4. DEFAULT STRATEGY: Cache First, Fallback to Network
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
