/**
 * js/pwa-init.js
 * version 1.1.0
 *
 * This script initializes the PWA features:
 * 1. Registers the Service Worker
 * 2. Handles the "Add to Home Screen" (Install) prompt
 * 3. Manages Offline/Online UI notifications
 * 4. Checks for App Updates
 */

// Ensure we run only after the page is fully loaded
window.addEventListener('load', () => {
    initServiceWorker();
    initOfflineDetection();
    initInstallPrompt();
});

/* =========================================
   1. SERVICE WORKER REGISTRATION & UPDATES
   ========================================= */
function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        // Register the SW located at the ROOT of the domain
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('✅ [PWA] Service Worker Registered. Scope:', registration.scope);

                // Check for updates (new sw.js file)
                registration.onupdatefound = () => {
                    const installingWorker = registration.installing;
                    if (installingWorker == null) return;

                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // New update available
                                console.log('🔄 [PWA] New content available; please refresh.');
                                showUpdateToast();
                            } else {
                                // Content is cached for the first time
                                console.log('✅ [PWA] Content is cached for offline use.');
                            }
                        }
                    };
                };
            })
            .catch((error) => {
                console.error('❌ [PWA] Service Worker registration failed:', error);
            });

        // Ensure the page reloads when the new Service Worker takes control
        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    }
}

/* =========================================
   2. OFFLINE/ONLINE DETECTION
   ========================================= */
function initOfflineDetection() {
    const badge = document.getElementById('offlineBadge');

    function updateStatus() {
        if (navigator.onLine) {
            // We are Online
            if (badge) {
                badge.classList.remove('show');
                // Wait for animation to finish before hiding display
                setTimeout(() => {
                    if (!badge.classList.contains('show')) {
                        badge.style.display = 'none';
                    }
                }, 300);
            }
        } else {
            // We are Offline
            if (badge) {
                badge.style.display = 'flex';
                // Small delay to allow display:flex to apply before opacity transition
                setTimeout(() => badge.classList.add('show'), 10);
            }
        }
    }

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Initial check
    updateStatus();
}

/* =========================================
   3. INSTALL PROMPT (Add to Home Screen)
   ========================================= */
let deferredPrompt;

function initInstallPrompt() {
    const installBtn = document.getElementById('pwaInstallBtn');

    // Capture the event so we can trigger it later
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        deferredPrompt = e;
        console.log('📲 [PWA] Install prompt intercepted');

        // Show your custom install button if it exists in DOM
        if (installBtn) {
            installBtn.style.display = 'flex'; // or 'block' depending on your CSS
        }
    });

    // Handle the Click
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                // Show the install prompt
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`📲 [PWA] User Install outcome: ${outcome}`);
                
                // Reset
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });
    }

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
        console.log('📲 [PWA] App Installed successfully');
        if (installBtn) installBtn.style.display = 'none';
        deferredPrompt = null;
    });
}

/* =========================================
   4. UPDATE NOTIFICATION UI (Toast)
   ========================================= */
function showUpdateToast() {
    // Create Elements
    const toast = document.createElement('div');
    toast.className = 'pwa-update-toast';
    
    const text = document.createElement('span');
    text.innerText = 'New version available.';
    
    const refreshBtn = document.createElement('button');
    refreshBtn.innerText = 'Refresh';
    
    // Styles
    toast.style.cssText = `
        position: fixed;
        bottom: 25px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: #fff;
        padding: 12px 20px;
        border-radius: 50px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 15px;
        z-index: 10000;
        font-family: sans-serif;
        font-size: 0.9rem;
        animation: slideUpFade 0.4s ease forwards;
    `;
    
    refreshBtn.style.cssText = `
        background: #d4af37;
        border: none;
        padding: 5px 12px;
        border-radius: 20px;
        font-weight: bold;
        cursor: pointer;
        color: #000;
    `;

    // Styling for Animation
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        @keyframes slideUpFade {
            from { bottom: -50px; opacity: 0; }
            to { bottom: 25px; opacity: 1; }
        }
    `;
    document.head.appendChild(styleSheet);

    // Append
    toast.appendChild(text);
    toast.appendChild(refreshBtn);
    document.body.appendChild(toast);

    // Action
    refreshBtn.addEventListener('click', () => {
        // Skip Waiting will make the new SW active, triggering controllerchange -> reload
        const registration = navigator.serviceWorker.getRegistration().then(reg => {
            if (reg && reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else {
                window.location.reload();
            }
        });
    });
}
