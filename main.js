// main.js

// --- 1. Imports ---
import { app, auth, db } from './firebase-init.js'; 
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; 

// --- Import Page Components (Will be created next) ---
import { renderLoginPage } from './pages/Login.js';
import { renderPartnersPage, renderPartnerDetailPage } from './pages/Partners.js'; 
import { renderDocumentsPage } from './pages/Documents.js';
import { renderTemplatesPage } from './pages/Templates.js';
// import { renderSettingsPage } from './pages/Settings.js';


// --- 2. Layout Structure ---

function createLayout() {
    const root = document.getElementById('root');
    root.innerHTML = ''; // Clear the root element

    const appContainer = document.createElement('div');
    appContainer.id = 'app-container'; 
    
    // Create the fixed sidebar (dark green area)
    const sidebar = document.createElement('div');
    sidebar.id = 'sidebar';
    sidebar.innerHTML = `
        <div id="logo-section" class="logo-text">
            <a href="/" data-route="/" class="logo-link">
                transferz.com
                <div class="onboarding-hub-text">ONBOARDING HUB</div>
            </a>
        </div>
        
        <nav id="main-nav">
            <a href="/partners" data-route="/partners">Partners</a>
            <a href="/documents" data-route="/documents">Documents</a>
            <a href="/templates" data-route="/templates">Templates</a>
        </nav>

        <div id="user-footer">
            <div class="user-info">
                <span class="username">Loading User...</span>
                <a href="/settings" data-route="/settings" class="settings-link">Account settings</a>
            </div>
            <button id="logout-btn">Log out</button>
        </div>
    `;

    // Create the main content area (light gray area)
    const mainView = document.createElement('div');
    mainView.id = 'main-view';
    mainView.innerHTML = `
        <header>
            <h1 id="greeting">Hello...</h1>
        </header>
        <div id="page-content">
            </div>
    `;
    
    appContainer.appendChild(sidebar);
    appContainer.appendChild(mainView);
    root.appendChild(appContainer);
    
    return document.getElementById('page-content');
}


// --- 3. Routing Logic ---

// The main function that decides which page to display
function renderRoute(path, contentRoot, userRole, partnerId) {
    const normalizedPath = normalizePath(path);
    highlightActiveNav(normalizedPath);

    // Clear previous content
    contentRoot.innerHTML = ''; 
    
    // Check for partner detail route: /partners/:partnerId
    const partnerDetailMatch = path.match(/^\/partners\/([^/]+)$/);
    if (partnerDetailMatch) {
        const partnerDocId = partnerDetailMatch[1];
        renderPartnerDetailPage(contentRoot, db, partnerDocId, userRole);
        return;
    }
    
    // --- Routing Switch ---
    switch (normalizedPath) {
        case '/partners': // Making /partners the default home view for now
            // Pass the Firestore instance and user info to the page component
            renderPartnersPage(contentRoot, db, userRole, partnerId); 
            break;
        case '/documents':
            renderDocumentsPage(contentRoot, db, userRole, partnerId);
            break;
        case '/templates':
            renderTemplatesPage(contentRoot, db, userRole, partnerId);
            break;
        case '/settings':
            // renderSettingsPage(contentRoot, db, userRole, partnerId);
            contentRoot.innerHTML = '<h1>Account Settings</h1><p>Settings page for role: ' + userRole + '</p>';
            break;
        default:
            contentRoot.innerHTML = '<h1>404 | Not Found</h1>';
    }
}

// Function to handle link clicks and URL changes
function handleNavigation(contentRoot, userRole, partnerId) {
    // Attach event listeners to all navigation links using the data-route attribute
    document.querySelectorAll('[data-route]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const path = e.currentTarget.getAttribute('data-route');
            
            // 1. Update the browser URL without refreshing
            window.history.pushState({}, path, window.location.origin + path); 
            
            // 2. Render the new page content
            renderRoute(path, contentRoot, userRole, partnerId);
        });
    });
    
    // Listen for browser back/forward buttons
    window.addEventListener('popstate', () => {
        renderRoute(window.location.pathname, contentRoot, userRole, partnerId);
    });
    
    // Render the initial route when the app starts
    renderRoute(window.location.pathname, contentRoot, userRole, partnerId);
}


// --- 4. Main Application Entry Point (Auth Check) ---

document.addEventListener('DOMContentLoaded', () => {
    // Start listening for authentication state changes immediately
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            
            // 1. Fetch user role from Firestore
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            let userRole = 'default';
            let partnerId = null;
            let displayName = user.displayName || user.email;

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                userRole = userData.role || 'default';
                partnerId = userData.partnerId || null;
                displayName = userData.displayName || displayName;
            }
            
            console.log(`Authenticated User. Role: ${userRole}, Partner ID: ${partnerId}`);

            // 2. Render the full authenticated layout
            const contentRoot = createLayout();
            
            // 3. Update the UI with user info
            document.querySelector('.username').textContent = displayName;
            document.getElementById('greeting').textContent = `Hello, ${displayName.split(' ')[0].toUpperCase()}`;

            // 4. Start Routing
            handleNavigation(contentRoot, userRole, partnerId);

            // 5. Attach Logout Listener
            document.getElementById('logout-btn').addEventListener('click', () => {
                signOut(auth).then(() => window.location.reload()).catch(console.error);
            });

        } else {
            // User is signed out. 
            console.log("User is signed out. Displaying login page.");
            
            // 🚨 RENDER THE LOGIN PAGE INSTEAD OF A SIMPLE MESSAGE 🚨
            document.getElementById('root').innerHTML = ''; // Clear existing content
            renderLoginPage(document.getElementById('root'), auth); // Render the login form
        }
    });
});

/**
 * Utility helpers
 */
function normalizePath(pathname) {
    if (!pathname || pathname === '/' || pathname === '/home') {
        return '/partners';
    }
    return pathname;
}

function highlightActiveNav(currentPath) {
    document.querySelectorAll('#main-nav a').forEach((link) => {
        const linkRoute = normalizePath(link.getAttribute('data-route'));
        if (linkRoute === currentPath) {
            link.classList.add('active-nav');
        } else {
            link.classList.remove('active-nav');
        }
    });
}