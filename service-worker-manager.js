/**
 * service-worker-manager.js
 * Handles PWA Registration, Updates, and Install Prompts.
 */

// --- PWA INSTALL PROMPT LOGIC ---
let deferredPrompt;

// Listen for the 'beforeinstallprompt' event
// This event fires when the browser detects the site can be installed as an app
window.addEventListener('beforeinstallprompt', (e) => {
    // 1. Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // 2. Stash the event so it can be triggered later.
    deferredPrompt = e;
    // 3. Update UI notify the user they can install the PWA
    showInstallPromotion();
    console.log('📲 PWA Install Prompt intercepted');
});

function showInstallPromotion() {
    // Check if we have an install button in the DOM (create one in your HTML if desired)
    const installBtn = document.getElementById('pwaInstallBtn');
    if (installBtn) {
        installBtn.style.display = 'flex';
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                // Show the install prompt
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`📲 User response to install prompt: ${outcome}`);
                // We've used the prompt, and can't use it again, throw it away
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });
    }
}

// Listen for the app being installed
window.addEventListener('appinstalled', () => {
    // Hide the app-provided install promotion
    const installBtn = document.getElementById('pwaInstallBtn');
    if (installBtn) installBtn.style.display = 'none';
    // Clear the deferred prompt so it can be garbage collected
    deferredPrompt = null;
    console.log('📲 PWA was installed');
    
    // Optional: Track this event in analytics
    if (window.trackEvent) {
        window.trackEvent('pwa_installed');
    }
});

// --- SERVICE WORKER REGISTRATION ---

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            // Register the Service Worker
            // 'sw.js' must reside in the ROOT directory
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ ServiceWorker registration successful with scope: ', registration.scope);

            // Check for updates to the Service Worker
            registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (installingWorker == null) {
                    return;
                }

                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            // At this point, the updated precached content has been fetched,
                            // but the previous service worker will still serve the older
                            // content until all client tabs are closed.
                            console.log('🔄 New content is available and will be used when all tabs for this page are closed.');
                            
                            // Trigger a toast/snackbar to ask user to refresh
                            showUpdateNotification();
                        } else {
                            // At this point, everything has been precached.
                            console.log('✅ Content is cached for offline use.');
                        }
                    }
                };
            };
        } catch (err) {
            console.error('❌ ServiceWorker registration failed: ', err);
        }
    });
}

// --- UPDATE NOTIFICATION UI ---

function showUpdateNotification() {
    // Create a Toast notification dynamically
    const toast = document.createElement('div');
    toast.id = 'update-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #333;
        color: white;
        padding: 16px 24px;
        border-radius: 50px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 15px;
        font-family: 'Poppins', sans-serif;
        font-size: 0.9rem;
        animation: slideUp 0.3s ease-out;
    `;

    toast.innerHTML = `
        <span>New version available!</span>
        <button id="refreshBtn" style="
            background: #d4af37;
            border: none;
            color: #000;
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 700;
            cursor: pointer;
        ">Refresh</button>
    `;

    document.body.appendChild(toast);

    // Add CSS animation
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes slideUp {
            from { transform: translate(-50%, 100px); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Handle Click
    document.getElementById('refreshBtn').addEventListener('click', () => {
        // Skip waiting implies the new SW takes over immediately
        if (navigator.serviceWorker.controller) {
            // We can't force skipWaiting directly from here easily without messaging the SW,
            // but usually a reload is sufficient if the SW is set to claim clients.
            // For simplicity:
            window.location.reload();
        }
    });
}

// --- OFFLINE/ONLINE DETECTION HELPER ---
// This is a backup if the specific page script doesn't implement it
window.addEventListener('load', () => {
    function updateOnlineStatus() {
        const badge = document.getElementById('offlineBadge'); // Assuming the HTML has this element ID
        if (badge) {
            if (navigator.onLine) {
                badge.classList.remove('show');
                if(badge.style.display === 'flex') badge.style.display = 'none';
            } else {
                badge.classList.add('show');
                if(badge.style.display === 'none') badge.style.display = 'flex';
            }
        }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
});
