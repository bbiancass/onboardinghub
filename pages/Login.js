// pages/Login.js

import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

/**
 * Renders the Login/Sign-up form into the root element.
 * @param {HTMLElement} rootElement The element where the login form will be rendered.
 * @param {object} auth The Firebase Auth instance.
 */
export function renderLoginPage(rootElement, auth) {
    rootElement.innerHTML = `
        <style>
            .login-container {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background-color: #f0f0f0;
            }
            .login-card {
                background-color: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                width: 350px;
                text-align: center;
            }
            .login-card input {
                width: 100%;
                padding: 10px;
                margin: 8px 0;
                border: 1px solid #ccc;
                border-radius: 4px;
            }
            .login-card button {
                width: 100%;
                padding: 10px;
                margin-top: 15px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            }
            #login-btn {
                background-color: #004d40; /* Dark Green */
                color: white;
            }
            #signup-btn {
                background-color: #e0e0e0; /* Light Gray */
                color: #004d40;
            }
            #error-message {
                color: red;
                margin-top: 10px;
            }
        </style>

        <div class="login-container">
            <div class="login-card">
                <h2>Transferz Hub Access</h2>
                <form id="auth-form">
                    <input type="email" id="email" placeholder="Email" required>
                    <input type="password" id="password" placeholder="Password" required>
                    <div id="error-message"></div>
                    <button type="submit" id="login-btn">Log In</button>
                    <button type="button" id="signup-btn">Sign Up (New Account)</button>
                </form>
            </div>
        </div>
    `;

    const form = document.getElementById('auth-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const signupBtn = document.getElementById('signup-btn');

    // Handle Login (Form Submission)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';
        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Success: Firebase's onAuthStateChanged listener in main.js will automatically refresh the page
        } catch (error) {
            console.error("Login Failed:", error);
            errorMessage.textContent = `Login failed: ${error.code.replace('auth/', '').split('-').join(' ')}`;
        }
    });
    
    // Handle Sign-Up (New Account)
    signupBtn.addEventListener('click', async () => {
        errorMessage.textContent = '';
        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("Account created. New user UID:", userCredential.user.uid);
            
            // Success: The user is automatically logged in. 
            // The onAuthStateChanged listener will refresh the page and render the main app.

            // IMPORTANT: After sign-up, you must manually set this user's role 
            // (admin, transferz, or partner) in the Firestore 'users' collection 
            // using the UID: userCredential.user.uid
            alert('Account created! Please check the console for the UID to set the role in Firestore.');

        } catch (error) {
            console.error("Sign Up Failed:", error);
            errorMessage.textContent = `Sign up failed: ${error.code.replace('auth/', '').split('-').join(' ')}`;
        }
    });
}