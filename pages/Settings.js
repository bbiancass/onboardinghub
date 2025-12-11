// pages/Settings.js

import { loadOnboardingStages, saveOnboardingStages, clearStagesCache } from "../constants/onboardingStages.js";
import { auth } from "../firebase-init.js";
import { doc, getDoc, updateDoc } from "firebase/firestore";

/**
 * Renders the Settings page with onboarding stages management.
 * @param {HTMLElement} contentRoot The element where the page content will be injected.
 * @param {object} db The Firestore database instance.
 * @param {string} userRole The role of the current user.
 */
export async function renderSettingsPage(contentRoot, db, userRole) {
    // Validate contentRoot exists
    if (!contentRoot) {
        console.error("contentRoot is null or undefined");
        return;
    }

    contentRoot.innerHTML = `
        <div class="content-card">
            <p>Loading settings...</p>
        </div>
    `;

    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        greetingElement.style.display = 'none';
    }

    try {
        // Get current user's display name first (before loading stages)
        const user = auth.currentUser;
        if (!user) {
            throw new Error("User is not authenticated");
        }

        let currentDisplayName = user.email || '';
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                currentDisplayName = userData.displayName || user.email || '';
            }
        } catch (userError) {
            console.warn("Could not load user display name:", userError);
            // Continue with email as fallback
        }

        // Load current stages
        let stages = await loadOnboardingStages(db);

        contentRoot.innerHTML = `
            <section class="settings-page">
                <header class="settings-header">
                    <h1>Account Settings</h1>
                    <p class="settings-subtitle">Manage your account preferences</p>
                </header>

                <div class="detail-card">
                    <h3 class="detail-card-title">DISPLAY NAME</h3>
                    <p class="settings-description">Set your display name that will appear in the sidebar and greeting throughout the application.</p>
                    
                    <div class="display-name-section">
                        <div class="display-name-input-group">
                            <input 
                                type="text" 
                                id="display-name-input" 
                                class="display-name-input" 
                                value="${escapeHtml(currentDisplayName)}"
                                placeholder="Enter your display name"
                            />
                            <button class="primary-btn" id="save-display-name-btn">Save Display Name</button>
                        </div>
                        <div id="display-name-message" class="save-message" style="display: none;"></div>
                    </div>
                </div>

                <div class="detail-card">
                    <h3 class="detail-card-title">ONBOARDING STAGES</h3>
                    <p class="settings-description">Configure the order of onboarding stages. Partners will progress through these stages in the order listed below.</p>
                    
                    <div id="stages-list" class="stages-list">
                        ${stages.map((stage, index) => `
                            <div class="stage-item" data-index="${index}">
                                <div class="stage-item-content">
                                    <span class="stage-number">${index + 1}</span>
                                    <input 
                                        type="text" 
                                        class="stage-input" 
                                        value="${escapeHtml(stage)}" 
                                        data-original="${escapeHtml(stage)}"
                                        data-index="${index}"
                                    />
                                </div>
                                <div class="stage-item-actions">
                                    <button class="stage-btn move-up-btn" data-index="${index}" ${index === 0 ? 'disabled' : ''} title="Move up">
                                        ↑
                                    </button>
                                    <button class="stage-btn move-down-btn" data-index="${index}" ${index === stages.length - 1 ? 'disabled' : ''} title="Move down">
                                        ↓
                                    </button>
                                    <button class="stage-btn delete-btn" data-index="${index}" ${stages.length <= 1 ? 'disabled' : ''} title="Delete">
                                        ×
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="stages-actions">
                        <button class="add-stage-btn" id="add-stage-btn">+ Add Stage</button>
                        <div class="stages-save-actions">
                            <button class="secondary-btn" id="reset-stages-btn">Reset to Default</button>
                            <button class="primary-btn" id="save-stages-btn">Save Changes</button>
                        </div>
                    </div>

                    <div id="save-message" class="save-message" style="display: none;"></div>
                </div>
            </section>
        `;

        // Attach event listeners
        attachDisplayNameEventListeners(contentRoot, db, user);
        attachStageEventListeners(contentRoot, db, stages);

    } catch (error) {
        console.error("Error loading settings:", error);
        contentRoot.innerHTML = `
            <div class="content-card">
                <h2>Error loading settings</h2>
                <p>There was an error loading the settings page. Please check the console for details.</p>
                <p style="color: #666; font-size: 0.9rem; margin-top: 10px;">Error: ${error.message || 'Unknown error'}</p>
            </div>
        `;
    }
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function attachDisplayNameEventListeners(contentRoot, db, user) {
    if (!user) return;

    const displayNameInput = contentRoot.querySelector('#display-name-input');
    const saveDisplayNameBtn = contentRoot.querySelector('#save-display-name-btn');
    const displayNameMessage = contentRoot.querySelector('#display-name-message');

    saveDisplayNameBtn.addEventListener('click', async () => {
        const newDisplayName = displayNameInput.value.trim();
        
        if (!newDisplayName) {
            showDisplayNameMessage('Display name cannot be empty.', 'error');
            return;
        }

        try {
            saveDisplayNameBtn.disabled = true;
            saveDisplayNameBtn.textContent = 'Saving...';
            
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                displayName: newDisplayName
            });
            
            showDisplayNameMessage('Display name saved successfully! Updating UI...', 'success');
            
            // Update the UI immediately
            const usernameElement = document.querySelector('.username');
            const greetingElement = document.getElementById('greeting');
            
            if (usernameElement) {
                usernameElement.textContent = newDisplayName;
            }
            if (greetingElement) {
                greetingElement.textContent = `Hello, ${newDisplayName.split(' ')[0].toUpperCase()}`;
            }
            
            // Reset button after a short delay
            setTimeout(() => {
                saveDisplayNameBtn.disabled = false;
                saveDisplayNameBtn.textContent = 'Save Display Name';
            }, 1500);
        } catch (error) {
            console.error('Error saving display name:', error);
            showDisplayNameMessage('Error saving display name. Please try again.', 'error');
            saveDisplayNameBtn.disabled = false;
            saveDisplayNameBtn.textContent = 'Save Display Name';
        }
    });

    // Allow saving with Enter key
    displayNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveDisplayNameBtn.click();
        }
    });

    function showDisplayNameMessage(text, type) {
        displayNameMessage.textContent = text;
        displayNameMessage.className = `save-message ${type}`;
        displayNameMessage.style.display = 'block';
        
        setTimeout(() => {
            displayNameMessage.style.display = 'none';
        }, 3000);
    }
}

function attachStageEventListeners(contentRoot, db, initialStages) {
    let stages = [...initialStages];
    const stagesList = contentRoot.querySelector('#stages-list');
    const addStageBtn = contentRoot.querySelector('#add-stage-btn');
    const saveStagesBtn = contentRoot.querySelector('#save-stages-btn');
    const resetStagesBtn = contentRoot.querySelector('#reset-stages-btn');
    const saveMessage = contentRoot.querySelector('#save-message');

    // Function to render the stages list
    function renderStagesList() {
        stagesList.innerHTML = stages.map((stage, index) => `
            <div class="stage-item" data-index="${index}">
                <div class="stage-item-content">
                    <span class="stage-number">${index + 1}</span>
                    <input 
                        type="text" 
                        class="stage-input" 
                        value="${escapeHtml(stage)}" 
                        data-original="${escapeHtml(stage)}"
                        data-index="${index}"
                    />
                </div>
                <div class="stage-item-actions">
                    <button class="stage-btn move-up-btn" data-index="${index}" ${index === 0 ? 'disabled' : ''} title="Move up">
                        ↑
                    </button>
                    <button class="stage-btn move-down-btn" data-index="${index}" ${index === stages.length - 1 ? 'disabled' : ''} title="Move down">
                        ↓
                    </button>
                    <button class="stage-btn delete-btn" data-index="${index}" ${stages.length <= 1 ? 'disabled' : ''} title="Delete">
                        ×
                    </button>
                </div>
            </div>
        `).join('');

        // Reattach event listeners after re-rendering
        attachItemEventListeners();
    }

    // Function to attach event listeners to stage items
    function attachItemEventListeners() {
        // Move up buttons
        contentRoot.querySelectorAll('.move-up-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                if (index > 0) {
                    [stages[index], stages[index - 1]] = [stages[index - 1], stages[index]];
                    renderStagesList();
                }
            });
        });

        // Move down buttons
        contentRoot.querySelectorAll('.move-down-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                if (index < stages.length - 1) {
                    [stages[index], stages[index + 1]] = [stages[index + 1], stages[index]];
                    renderStagesList();
                }
            });
        });

        // Delete buttons
        contentRoot.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                if (stages.length > 1) {
                    if (confirm(`Are you sure you want to delete the stage "${stages[index]}"?`)) {
                        stages.splice(index, 1);
                        renderStagesList();
                    }
                }
            });
        });

        // Input change handlers
        contentRoot.querySelectorAll('.stage-input').forEach(input => {
            input.addEventListener('blur', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                const newValue = e.target.value.trim();
                if (newValue && newValue !== stages[index]) {
                    stages[index] = newValue;
                } else if (!newValue) {
                    // Restore original value if empty
                    e.target.value = stages[index];
                }
            });

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur();
                }
            });
        });
    }

    // Initial attachment
    attachItemEventListeners();

    // Add stage button
    addStageBtn.addEventListener('click', () => {
        const newStageName = prompt('Enter the name of the new stage:');
        if (newStageName && newStageName.trim()) {
            stages.push(newStageName.trim());
            renderStagesList();
        }
    });

    // Save stages button
    saveStagesBtn.addEventListener('click', async () => {
        // Validate all stages have names
        const emptyStages = stages.filter(s => !s || !s.trim());
        if (emptyStages.length > 0) {
            showMessage('Please ensure all stages have names.', 'error');
            return;
        }

        // Remove duplicates while preserving order
        const uniqueStages = [];
        const seen = new Set();
        for (const stage of stages) {
            const trimmed = stage.trim();
            if (trimmed && !seen.has(trimmed)) {
                seen.add(trimmed);
                uniqueStages.push(trimmed);
            }
        }

        if (uniqueStages.length !== stages.length) {
            if (!confirm('Some duplicate stages were found and will be removed. Continue?')) {
                return;
            }
            stages = uniqueStages;
            renderStagesList();
        }

        try {
            saveStagesBtn.disabled = true;
            saveStagesBtn.textContent = 'Saving...';
            
            await saveOnboardingStages(db, stages);
            clearStagesCache();
            
            showMessage('Stages saved successfully!', 'success');
            
            // Reload the page to reflect changes
            setTimeout(() => {
                renderSettingsPage(contentRoot, db, 'admin');
            }, 1500);
        } catch (error) {
            console.error('Error saving stages:', error);
            showMessage('Error saving stages. Please try again.', 'error');
        } finally {
            saveStagesBtn.disabled = false;
            saveStagesBtn.textContent = 'Save Changes';
        }
    });

    // Reset to default button
    resetStagesBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset to default stages? This will overwrite your current configuration.')) {
            try {
                resetStagesBtn.disabled = true;
                resetStagesBtn.textContent = 'Resetting...';
                
                const defaultStages = [
                    'Intake',
                    'Testing',
                    'Integration',
                    'Go Live',
                    'Complete'
                ];
                
                await saveOnboardingStages(db, defaultStages);
                clearStagesCache();
                
                showMessage('Stages reset to default!', 'success');
                
                // Reload the page
                setTimeout(() => {
                    renderSettingsPage(contentRoot, db, 'admin');
                }, 1500);
            } catch (error) {
                console.error('Error resetting stages:', error);
                showMessage('Error resetting stages. Please try again.', 'error');
            } finally {
                resetStagesBtn.disabled = false;
                resetStagesBtn.textContent = 'Reset to Default';
            }
        }
    });

    function showMessage(text, type) {
        saveMessage.textContent = text;
        saveMessage.className = `save-message ${type}`;
        saveMessage.style.display = 'block';
        
        setTimeout(() => {
            saveMessage.style.display = 'none';
        }, 3000);
    }
}

