import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    getDocs, 
    collection, 
    setDoc, 
    updateDoc,
    serverTimestamp,
    Timestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { handleLogout } from './auth.js';

// Global Logic
document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const logoutBtn = document.getElementById('logout-btn');
    const userDisplay = document.getElementById('user-display');
    const subStatus = document.getElementById('sub-status');
    const renewBtn = document.getElementById('renew-sub-btn');
    const renewalModal = document.getElementById('renewal-modal');
    
    // Admin Dashboard Elements
    const previewBtn = document.getElementById('preview-user-btn');
    const previewModal = document.getElementById('preview-modal');
    const totalUsersSpan = document.getElementById('total-users');
    const activeKeysSpan = document.getElementById('active-keys-count');
    const keysContainer = document.getElementById('keys-container');
    const keyGenModal = document.getElementById('key-gen-modal');
    const userTableBody = document.getElementById('user-table-body');
    const updateStatusBtn = document.getElementById('update-status-btn');
    const statusText = document.getElementById('cheat-status-text');

    // Modals & Their Elements
    const editUserModal = document.getElementById('edit-user-modal');
    const editKeyModal = document.getElementById('edit-key-modal');
    
    // Admin Dashboard Info Storage (Temporary for edits)
    let adminCache = {
        users: {},
        keys: {}
    };

    // Custom Toast Notification
    function showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.5s forwards';
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }

    // Modal Control Helpers
    const openModal = (modal) => modal && modal.classList.add('active');
    const closeModal = (modal) => modal && modal.classList.remove('active');

    // --- Admin Dashboard Loading ---
    async function initAdminDashboard() {
        if (!totalUsersSpan && !keysContainer && !userTableBody) return;
        
        try {
            // 1. Fetch Users
            const usersSnap = await getDocs(collection(db, "users"));
            if (totalUsersSpan) totalUsersSpan.textContent = usersSnap.size;
            
            if (userTableBody) {
                userTableBody.innerHTML = '';
                usersSnap.forEach(userDoc => {
                    const data = userDoc.data();
                    adminCache.users[userDoc.id] = data; // Cache for edit
                    
                    const expiry = data.expiry_date ? data.expiry_date.toDate().toLocaleDateString() : 'None';
                    const active = data.expiry_date && data.expiry_date.toDate() > new Date() ? 'Active' : 'N/A';
                    
                    userTableBody.innerHTML += `
                        <tr>
                            <td><i class="fas fa-user-circle" style="margin-right: 0.8rem; color: var(--primary);"></i>${data.username || 'N/A'}</td>
                            <td>${data.email}</td>
                            <td><span class="status-badge ${active === 'Active' ? 'status-active' : 'status-expired'}">${active}</span></td>
                            <td><i class="far fa-calendar-alt" style="margin-right: 0.5rem; color: var(--text-dim);"></i>${expiry}</td>
                            <td><button class="btn btn-login edit-user-trigger" data-uid="${userDoc.id}" style="padding: 0.5rem 1rem; font-size: 0.8rem; border-radius: 10px;">
                                <i class="fas fa-edit"></i> Edit
                            </button></td>
                        </tr>`;
                });
            }

            // 2. Fetch Keys
            const keysSnap = await getDocs(collection(db, "license_keys"));
            if (keysContainer) {
                keysContainer.innerHTML = '';
                let activeCount = 0;
                
                if (keysSnap.empty) {
                    keysContainer.innerHTML = '<p style="color: var(--text-dim); grid-column: 1/-1; text-align: center; padding: 2rem;">No keys found.</p>';
                    if (activeKeysSpan) activeKeysSpan.textContent = '0';
                } else {
                    keysSnap.forEach(keyDoc => {
                        const data = keyDoc.data();
                        adminCache.keys[keyDoc.id] = data; // Cache for edit
                        if (!data.is_used) activeCount++;
                        
                        keysContainer.innerHTML += `
                            <div class="key-card">
                                <span class="key-id-text">${keyDoc.id}</span>
                                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-dim); font-weight: 500;">
                                    <span>${data.duration_days} Days</span>
                                    <span style="color: ${data.is_used ? '#ef4444' : '#22c55e'}">${data.is_used ? 'Used' : 'Available'}</span>
                                </div>
                                <button class="btn btn-signup edit-key-trigger" data-keyid="${keyDoc.id}" style="margin-top: 1rem; padding: 0.4rem; font-size: 0.75rem; width: 100%;">EDIT KEY</button>
                            </div>`;
                    });
                    if (activeKeysSpan) activeKeysSpan.textContent = activeCount;
                }
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to load database.", "error");
        }
    }

    // --- Global Click Listener (Event Delegation) ---
    document.addEventListener('click', (e) => {
        // Edit User Trigger
        const userTrigger = e.target.closest('.edit-user-trigger');
        if (userTrigger) {
            const uid = userTrigger.dataset.uid;
            const data = adminCache.users[uid];
            if (data) {
                document.getElementById('edit-user-uid').value = uid;
                document.getElementById('edit-user-username').value = data.username || '';
                document.getElementById('edit-user-email').value = data.email || '';
                document.getElementById('edit-user-role').value = data.role || 'user';
                document.getElementById('edit-user-hwid').value = data.hwid || '';
                if (data.expiry_date) {
                    document.getElementById('edit-user-expiry').value = data.expiry_date.toDate().toISOString().split('T')[0];
                } else {
                    document.getElementById('edit-user-expiry').value = '';
                }
                openModal(editUserModal);
            }
            return;
        }

        // Edit Key Trigger
        const keyTrigger = e.target.closest('.edit-key-trigger');
        if (keyTrigger) {
            const keyId = keyTrigger.dataset.keyid;
            const data = adminCache.keys[keyId];
            if (data) {
                document.getElementById('edit-key-id').value = keyId;
                document.getElementById('edit-key-duration').value = data.duration_days || 30;
                document.getElementById('edit-key-isUsed').checked = data.is_used || false;
                openModal(editKeyModal);
            }
            return;
        }

        // Close Modals (Generic)
        if (e.target.classList.contains('close-modal') || e.target.classList.contains('modal')) {
            const modal = e.target.closest('.modal') || (e.target.classList.contains('modal') ? e.target : null);
            if (modal) {
                closeModal(modal);
                // Reset loader if it was open in preview
                const downloadBtn = document.getElementById('download-btn');
                const loaderContainer = document.getElementById('loader-container');
                if (downloadBtn) downloadBtn.style.display = 'block';
                if (loaderContainer) loaderContainer.style.display = 'none';
            }
        }

        // Renew Modal
        if (e.target.id === 'renew-sub-btn') openModal(renewalModal);
        
        // Preview Modal
        if (e.target.id === 'preview-user-btn') openModal(previewModal);

        // Key Gen Modal
        if (e.target.id === 'generate-keys-btn') openModal(keyGenModal);
    });

    // --- Form Submissions ---

    // Save User
    const saveUserBtn = document.getElementById('save-user-btn');
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', async () => {
            const uid = document.getElementById('edit-user-uid').value;
            const expiryVal = document.getElementById('edit-user-expiry').value;
            const updates = {
                username: document.getElementById('edit-user-username').value,
                email: document.getElementById('edit-user-email').value,
                role: document.getElementById('edit-user-role').value,
                hwid: document.getElementById('edit-user-hwid').value,
                expiry_date: expiryVal ? Timestamp.fromDate(new Date(expiryVal)) : null
            };
            try {
                await updateDoc(doc(db, "users", uid), updates);
                showToast("User updated!", "success");
                closeModal(editUserModal);
                initAdminDashboard();
            } catch (err) { showToast("Error saving user.", "error"); }
        });
    }

    // Save Key
    const saveKeyBtn = document.getElementById('save-key-btn');
    if (saveKeyBtn) {
        saveKeyBtn.addEventListener('click', async () => {
            const keyId = document.getElementById('edit-key-id').value;
            const updates = {
                duration_days: parseInt(document.getElementById('edit-key-duration').value),
                is_used: document.getElementById('edit-key-isUsed').checked
            };
            try {
                await updateDoc(doc(db, "license_keys", keyId), updates);
                showToast("Key updated!", "success");
                closeModal(editKeyModal);
                initAdminDashboard();
            } catch (err) { showToast("Error saving key.", "error"); }
        });
    }

    // Confirm Key Gen
    const confirmGenBtn = document.getElementById('confirm-gen-btn');
    if (confirmGenBtn) {
        confirmGenBtn.addEventListener('click', async () => {
            const kid = document.getElementById('new-key-id').value.trim();
            const days = parseInt(document.getElementById('new-key-days').value);
            if (!kid || !days) return showToast("Provide ID and days.", "error");
            try {
                await setDoc(doc(db, "license_keys", kid), { duration_days: days, is_used: false, created_at: serverTimestamp() });
                showToast("Key generated!", "success");
                closeModal(keyGenModal);
                initAdminDashboard();
            } catch (err) { showToast("Failed to generate.", "error"); }
        });
    }

    // Cheat Status Update
    if (updateStatusBtn && statusText) {
        updateStatusBtn.addEventListener('click', () => {
            const isUndetected = statusText.textContent.includes('UNDETECTED');
            statusText.textContent = isUndetected ? 'Status: DETECTED' : 'Status: UNDETECTED';
            statusText.style.color = isUndetected ? '#ef4444' : '#4ade80';
            showToast(`Cheat marked as ${isUndetected ? 'DETECTED' : 'UNDETECTED'}`, isUndetected ? "error" : "success");
        });
    }

    // Logout
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Auth & Init
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (userDisplay) userDisplay.textContent = `Logged in as: ...`;
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const ud = userDoc.data();
                    if (userDisplay) userDisplay.textContent = `Logged in as: ${ud.username || user.email}`;
                    if (ud.role === 'admin') initAdminDashboard();
                    
                    if (subStatus) {
                        const exp = ud.expiry_date;
                        if (!exp) {
                            subStatus.innerHTML = '<span class="status-badge status-expired">No Subscription</span>';
                        } else {
                            const d = exp.toDate();
                            const now = new Date();
                            if (d < now) {
                                subStatus.innerHTML = `<span class="status-badge status-expired">Expired (${d.toLocaleDateString()})</span>`;
                            } else {
                                const diffTime = Math.abs(d - now);
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                                subStatus.innerHTML = `<span class="status-badge status-active">Active • ${diffDays} days left</span>`;
                                subStatus.title = `Expires on ${d.toLocaleDateString()}`;
                            }
                        }
                    }
                }
            } catch (err) { console.error(err); }
        }
    });

    // --- Simulations ---
    const downloadBtn = document.getElementById('download-btn');
    const loaderContainer = document.getElementById('loader-container');
    if (downloadBtn && loaderContainer) {
        downloadBtn.addEventListener('click', () => {
            downloadBtn.style.display = 'none';
            loaderContainer.style.display = 'flex';
            let p = 0;
            const inv = setInterval(() => {
                p += Math.random() * 10;
                if (p >= 100) {
                    p = 100;
                    clearInterval(inv);
                    setTimeout(() => {
                        const l = document.createElement('a');
                        l.href = 'downloads/Versiety.rar';
                        l.download = 'Versiety.rar';
                        document.body.appendChild(l);
                        l.click();
                        document.body.removeChild(l);
                        showToast("Client downloaded!", "success");
                        loaderContainer.style.display = 'none';
                        downloadBtn.style.display = 'block';
                    }, 300);
                }
                const bar = document.getElementById('loader-progress');
                const perc = document.getElementById('progress-percent');
                if (bar) bar.style.width = `${p}%`;
                if (perc) perc.textContent = `${Math.floor(p)}%`;
            }, 80);
        });
    }
    // License Key Redemption
    const redeemKeyBtn = document.getElementById('redeem-key-btn');
    const redeemKeyInput = document.getElementById('redeem-key-input');
    
    if (redeemKeyBtn && redeemKeyInput) {
        redeemKeyBtn.addEventListener('click', async () => {
            const keyId = redeemKeyInput.value.trim();
            if (!keyId) return showToast("Please enter a key.", "error");
            
            const user = auth.currentUser;
            if (!user) return showToast("You must be logged in.", "error");
            
            try {
                redeemKeyBtn.disabled = true;
                redeemKeyBtn.textContent = "...";
                
                const keyRef = doc(db, "license_keys", keyId);
                const keySnap = await getDoc(keyRef);
                
                if (!keySnap.exists()) {
                    showToast("Invalid license key.", "error");
                } else {
                    const keyData = keySnap.data();
                    if (keyData.is_used) {
                        showToast("This key has already been used.", "error");
                    } else {
                        // Key is valid and available
                        const userRef = doc(db, "users", user.uid);
                        const userSnap = await getDoc(userRef);
                        const userData = userSnap.data();
                        
                        let currentExpiry = userData.expiry_date ? userData.expiry_date.toDate() : new Date();
                        if (currentExpiry < new Date()) currentExpiry = new Date();
                        
                        const newExpiry = new Date(currentExpiry);
                        newExpiry.setDate(newExpiry.getDate() + keyData.duration_days);
                        
                        // Update User and Key
                        await updateDoc(userRef, {
                            expiry_date: Timestamp.fromDate(newExpiry)
                        });
                        
                        await updateDoc(keyRef, {
                            is_used: true,
                            used_at: serverTimestamp(),
                            used_by: user.uid
                        });
                        
                        showToast(`Key redeemed! +${keyData.duration_days} days added.`, "success");
                        redeemKeyInput.value = '';
                        
                        // Refresh UI
                        setTimeout(() => window.location.reload(), 1500);
                    }
                }
            } catch (err) {
                console.error(err);
                showToast("Redemption failed. Check your connection.", "error");
            } finally {
                redeemKeyBtn.disabled = false;
                redeemKeyBtn.textContent = "REDEEM";
            }
        });
    }
});
