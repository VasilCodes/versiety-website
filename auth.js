import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc,
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const errorMessage = document.getElementById('error-message');

// Helper to show errors
const showError = (message) => {
    if (errorMessage) {
        errorMessage.textContent = message;
    } else {
        alert(message);
    }
};

// Signup Logic
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            return showError("Passwords do not match.");
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user profile in Firestore
            await setDoc(doc(db, "users", user.uid), {
                username: username,
                email: email,
                expiry_date: null, // Initial blank field
                hwid: "", // Blank string as requested
                role: 'user', // Internal role management
                createdAt: Timestamp.now()
            });

            window.location.href = 'user_dashboard.html';
        } catch (error) {
            showError(error.message);
        }
    });
}

// Login Logic
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Check role and redirect
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.role === 'admin') {
                    window.location.href = 'admin_dashboard.html';
                } else {
                    window.location.href = 'user_dashboard.html';
                }
            } else {
                window.location.href = 'user_dashboard.html';
            }
        } catch (error) {
            showError(error.message);
        }
    });
}

// Auth State Observer (for dashboard protection)
onAuthStateChanged(auth, async (user) => {
    const path = window.location.pathname;
    
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : { role: 'user' };

        // If on auth pages, redirect to appropriate dashboard
        if (path.endsWith('login.html') || path.endsWith('signup.html') || path === '/' || path.endsWith('index.html')) {
            if (userData.role === 'admin') {
                window.location.href = 'admin_dashboard.html';
            } else {
                window.location.href = 'user_dashboard.html';
            }
        }

        // Enforce Admin Access
        if (path.endsWith('admin_dashboard.html') && userData.role !== 'admin') {
            window.location.href = 'user_dashboard.html';
        }

        // Enforce User Access (Optional: Redirect admin away from user dash if preferred)
        if (path.endsWith('user_dashboard.html') && userData.role === 'admin') {
            window.location.href = 'admin_dashboard.html';
        }
    } else {
        // If on dashboard pages without being logged in, redirect to login
        if (path.endsWith('user_dashboard.html') || path.endsWith('admin_dashboard.html')) {
            window.location.href = 'login.html';
        }
    }
});

// Logout Export
export const handleLogout = async () => {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error("Logout error:", error);
    }
};
