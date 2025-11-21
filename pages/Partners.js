// pages/Partners.js

import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";

/**
 * Renders the Partners page content, filtering data based on the user's role.
 * * @param {HTMLElement} contentRoot The element where the page content will be injected.
 * @param {object} db The Firestore database instance.
 * @param {string} userRole The role of the current user ('admin', 'transferz', 'partner').
 * @param {string|null} partnerId The ID of the partner if the user is a 'partner' user.
 */
export async function renderPartnersPage(contentRoot, db, userRole, partnerId) {
    contentRoot.innerHTML = `
        <div class="content-card">
            <p>Loading Partners data...</p>
        </div>
    `;

    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        greetingElement.style.display = 'none';
    }

    const partnersCol = collection(db, "partners");
    let partnersQuery;

    if (userRole === 'admin' || userRole === 'transferz') {
        partnersQuery = query(partnersCol); 
        console.log("Fetching ALL partner data (Admin/Transferz User).");
    } else if (userRole === 'partner' && partnerId) {
        partnersQuery = query(partnersCol, where("partnerId", "==", partnerId));
        console.log(`Fetching specific partner data for ID: ${partnerId}.`);
    } else {
        contentRoot.innerHTML = '<p>Access Denied or Missing Partner ID.</p>';
        return;
    }

    try {
        const querySnapshot = await getDocs(partnersQuery);
        const partners = [];
        querySnapshot.forEach((doc) => {
            partners.push({ id: doc.id, ...doc.data() });
        });

        const stages = Array.from(
            new Set(partners.map((partner) => partner.onboardingStatus).filter(Boolean))
        );
        const psms = Array.from(
            new Set(partners.map((partner) => partner.psm).filter(Boolean))
        );
        const integrations = Array.from(
            new Set(partners.map((partner) => partner.integrationType).filter(Boolean))
        );

        const renderList = (partnersToRender) => {
            if (!partnersToRender.length) {
                return '<p class="empty-state">No partners found matching your filters.</p>';
            }

            return partnersToRender
                .map((partner) => {
                    const formattedDate = formatDate(partner.lastUpdated);
                    return `
                        <div class="partner-row" data-partner-id="${partner.id}" style="cursor: pointer;">
                            <div class="partner-cell partner-name">
                                <p class="label">Partner</p>
                                <p class="value">${partner.name || 'Untitled Partner'}</p>
                            </div>
                            <div class="partner-cell">
                                <p class="label">Onboarding Status</p>
                                <p class="value">${partner.onboardingStatus || 'N/A'}</p>
                            </div>
                            <div class="partner-cell">
                                <p class="label">PSM</p>
                                <p class="value">${partner.psm || 'Unassigned'}</p>
                            </div>
                            <div class="partner-cell">
                                <p class="label">Integration</p>
                                <p class="value">${partner.integrationType || 'Unknown'}</p>
                            </div>
                            <div class="partner-cell">
                                <p class="label">Last Updated</p>
                                <p class="value">${formattedDate}</p>
                            </div>
                        </div>
                    `;
                })
                .join('');
        };

        contentRoot.innerHTML = `
            <section class="partners-page">
                <header class="partners-header">
                    <div class="partners-header-row">
                        <p class="eyebrow">Onboarding progress</p>
                        <button class="add-partner-btn" id="open-add-partner-modal">+ ADD</button>
                    </div>
                    <h2>Your Partners Dashboard</h2>
                </header>

                <div class="content-card filters-card">
                    <div class="filters-row">
                        <input type="search" id="partners-search" placeholder="Search partners..." />
                        <select id="filter-stage">
                            <option value="">Stage</option>
                            ${stages.map((stage) => `<option value="${stage}">${stage}</option>`).join('')}
                        </select>
                        <select id="filter-psm">
                            <option value="">PSM</option>
                            ${psms.map((psm) => `<option value="${psm}">${psm}</option>`).join('')}
                        </select>
                        <select id="filter-integration">
                            <option value="">Integration</option>
                            ${integrations
                                .map((integration) => `<option value="${integration}">${integration}</option>`)
                                .join('')}
                        </select>
                    </div>
                </div>

                <div class="content-card partners-list-card">
                    <div id="partners-list">
                        ${renderList(partners)}
                    </div>
                </div>

                <div class="modal-backdrop" id="add-partner-modal" aria-hidden="true">
                    <div class="modal-card">
                        <div class="modal-header">
                            <h3>Add a Partner</h3>
                            <button class="modal-close" type="button" id="close-add-partner-modal" aria-label="Close">&times;</button>
                        </div>
                        <form id="add-partner-form">
                            <div class="form-grid">
                                <label>
                                    <span>Partner Name</span>
                                    <input type="text" name="partnerName" required />
                                </label>
                                <label>
                                    <span>Partner ID</span>
                                    <input type="text" name="partnerId" required />
                                </label>
                                <label>
                                    <span>Onboarding Stage</span>
                                    <input type="text" name="onboardingStatus" placeholder="e.g., Intake, Testing" required />
                                </label>
                                <label>
                                    <span>PSM</span>
                                    <input type="text" name="psm" placeholder="Jane Doe" />
                                </label>
                                <label>
                                    <span>Integration Type</span>
                                    <input type="text" name="integrationType" placeholder="API, SFTP..." />
                                </label>
                                <label>
                                    <span>Contact Email</span>
                                    <input type="email" name="contactEmail" placeholder="contact@email.com" />
                                </label>
                            </div>
                            <label class="notes-field">
                                <span>Notes</span>
                                <textarea name="notes" rows="4" placeholder="Add any context for this partner"></textarea>
                            </label>
                            <div class="form-actions">
                                <button type="button" class="secondary-btn" id="cancel-add-partner">Cancel</button>
                                <button type="submit" class="primary-btn">Save Partner</button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        `;

        const searchInput = contentRoot.querySelector('#partners-search');
        const stageSelect = contentRoot.querySelector('#filter-stage');
        const psmSelect = contentRoot.querySelector('#filter-psm');
        const integrationSelect = contentRoot.querySelector('#filter-integration');
        const partnersList = contentRoot.querySelector('#partners-list');
        const addPartnerModal = contentRoot.querySelector('#add-partner-modal');
        const openModalBtn = contentRoot.querySelector('#open-add-partner-modal');
        const closeModalBtn = contentRoot.querySelector('#close-add-partner-modal');
        const cancelModalBtn = contentRoot.querySelector('#cancel-add-partner');
        const addPartnerForm = contentRoot.querySelector('#add-partner-form');

        const applyFilters = () => {
            const searchTerm = (searchInput.value || '').toLowerCase().trim();
            const stageFilter = stageSelect.value;
            const psmFilter = psmSelect.value;
            const integrationFilter = integrationSelect.value;

            const filteredPartners = partners.filter((partner) => {
                const nameMatch =
                    partner.name?.toLowerCase().includes(searchTerm) ||
                    partner.partnerId?.toLowerCase().includes(searchTerm) ||
                    !searchTerm;
                const stageMatch = stageFilter ? partner.onboardingStatus === stageFilter : true;
                const psmMatch = psmFilter ? partner.psm === psmFilter : true;
                const integrationMatch = integrationFilter
                    ? partner.integrationType === integrationFilter
                    : true;

                return nameMatch && stageMatch && psmMatch && integrationMatch;
            });

            partnersList.innerHTML = renderList(filteredPartners);
            attachRowClickHandlers();
        };

        [searchInput, stageSelect, psmSelect, integrationSelect].forEach((el) => {
            el?.addEventListener('input', applyFilters);
            el?.addEventListener('change', applyFilters);
        });

        // Make partner rows clickable
        const handlePartnerRowClick = (partnerRow) => {
            const partnerId = partnerRow.getAttribute('data-partner-id');
            if (partnerId) {
                window.history.pushState({}, '', `/partners/${partnerId}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }
        };

        const attachRowClickHandlers = () => {
            contentRoot.querySelectorAll('.partner-row').forEach((row) => {
                row.onclick = () => handlePartnerRowClick(row);
            });
        };

        // Attach click handlers to existing rows
        attachRowClickHandlers();

        const openModal = () => {
            addPartnerModal?.setAttribute('aria-hidden', 'false');
            addPartnerModal?.classList.add('visible');
        };

        const closeModal = () => {
            addPartnerModal?.setAttribute('aria-hidden', 'true');
            addPartnerModal?.classList.remove('visible');
            addPartnerForm?.reset();
        };

        openModalBtn?.addEventListener('click', openModal);
        closeModalBtn?.addEventListener('click', closeModal);
        cancelModalBtn?.addEventListener('click', closeModal);
        addPartnerModal?.addEventListener('click', (e) => {
            if (e.target === addPartnerModal) {
                closeModal();
            }
        });

        addPartnerForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(addPartnerForm);

            const newPartner = {
                name: formData.get('partnerName')?.toString().trim(),
                partnerId: formData.get('partnerId')?.toString().trim(),
                onboardingStatus: formData.get('onboardingStatus')?.toString().trim(),
                psm: formData.get('psm')?.toString().trim() || null,
                integrationType: formData.get('integrationType')?.toString().trim() || null,
                contactEmail: formData.get('contactEmail')?.toString().trim() || null,
                notes: formData.get('notes')?.toString().trim() || '',
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
            };

            if (!newPartner.name || !newPartner.partnerId || !newPartner.onboardingStatus) {
                alert('Please complete the required fields.');
                return;
            }

            try {
                await addDoc(partnersCol, newPartner);
                closeModal();
                renderPartnersPage(contentRoot, db, userRole, partnerId);
            } catch (err) {
                console.error('Error adding partner:', err);
                alert('Could not save partner. Please try again.');
            }
        });
    } catch (error) {
        console.error("Error fetching partners:", error);
        contentRoot.innerHTML = `
            <div class="content-card">
                <p>Error loading data. Check console and Firebase Security Rules.</p>
            </div>
        `;
    }
}

function formatDate(value) {
    if (!value) return 'Unknown';
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
    }

    if (value.toDate) {
        const date = value.toDate();
        return date.toLocaleDateString();
    }

    if (value.seconds) {
        return new Date(value.seconds * 1000).toLocaleDateString();
    }

    return 'Unknown';
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

/**
 * Renders the Partner Detail page for a specific partner.
 * @param {HTMLElement} contentRoot The element where the page content will be injected.
 * @param {object} db The Firestore database instance.
 * @param {string} partnerDocId The Firestore document ID of the partner.
 * @param {string} userRole The role of the current user.
 */
export async function renderPartnerDetailPage(contentRoot, db, partnerDocId, userRole) {
    contentRoot.innerHTML = `
        <div class="content-card">
            <p>Loading partner details...</p>
        </div>
    `;

    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        greetingElement.style.display = 'none';
    }

    try {
        const partnerDocRef = doc(db, "partners", partnerDocId);
        const partnerDocSnap = await getDoc(partnerDocRef);

        if (!partnerDocSnap.exists()) {
            contentRoot.innerHTML = `
                <div class="content-card">
                    <p>Partner not found.</p>
                    <a href="/partners" data-route="/partners" style="color: var(--color-sidebar-bg);">← Back to Partners</a>
                </div>
            `;
            return;
        }

        const partner = { id: partnerDocSnap.id, ...partnerDocSnap.data() };
        const partnerName = partner.name || 'Untitled Partner';
        const addedDate = formatDate(partner.createdAt);
        const stageSinceDate = formatDate(partner.stageSince || partner.createdAt);

        // Mock data for CS Guide Status - in real app, this would come from Firestore
        const defaultCsGuideStatus = [
            { label: 'Form sent', completed: false },
            { label: 'Form answered by partner', completed: false },
            { label: 'Awaiting PSM', completed: false },
            { label: 'Ready for draft', completed: false },
            { label: 'Created', completed: false },
        ];
        let csGuideStatus = Array.isArray(partner.csGuideStatus) && partner.csGuideStatus.length
            ? partner.csGuideStatus
            : defaultCsGuideStatus.map((item) => ({ ...item }));

        // Mock comments - in real app, this would come from Firestore
        const comments = partner.comments || [];

        contentRoot.innerHTML = `
            <section class="partner-detail-page">
                <div class="partner-detail-header">
                    <nav class="breadcrumb">
                        <a href="/partners" data-route="/partners">Partners</a>
                        <span> > </span>
                        <span>${partnerName}</span>
                    </nav>
                    <h1 class="partner-detail-title">${partnerName}</h1>
                </div>

                <div class="partner-detail-grid">
                    <div class="detail-card info-card">
                        <div class="detail-card-header">
                            <h3 class="detail-card-title">INFORMATION</h3>
                            <button class="edit-partner-btn" id="edit-partner-btn">Edit</button>
                        </div>
                        <div class="detail-info-list">
                            <div class="detail-info-item">
                                <span class="detail-label">INTEGRATION TYPE:</span>
                                <span class="detail-value">${partner.integrationType || 'N/A'}</span>
                            </div>
                            <div class="detail-info-item">
                                <span class="detail-label">PSM:</span>
                                <span class="detail-value">${partner.psm || 'Unassigned'}</span>
                            </div>
                            <div class="detail-info-item">
                                <span class="detail-label">CONTACT PERSON:</span>
                                <span class="detail-value">${partner.contactEmail || 'N/A'}</span>
                            </div>
                            <div class="detail-info-item">
                                <span class="detail-label">ADDED ON:</span>
                                <span class="detail-value">${addedDate}</span>
                            </div>
                            <div class="detail-info-item">
                                <span class="detail-label">NOTES:</span>
                                <span class="detail-value">${partner.notes || 'No notes'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="detail-card">
                        <h3 class="detail-card-title">METRICS</h3>
                        <div class="metrics-placeholder">
                            <p>Metrics coming soon</p>
                        </div>
                    </div>

                    <div class="detail-card">
                        <h3 class="detail-card-title">CURRENT STAGE</h3>
                        <div class="stage-content">
                            <p class="stage-name">${partner.onboardingStatus || 'N/A'}</p>
                            <p class="stage-meta">On this stage since: ${stageSinceDate}</p>
                            <p class="stage-meta">Next stage: ${partner.nextStage || 'TBD'}</p>
                            <div class="stage-actions">
                                <a href="#" class="see-notes-link">See notes</a>
                                <button class="next-stage-btn">NEXT STAGE</button>
                            </div>
                        </div>
                    </div>

                    <div class="detail-card">
                        <h3 class="detail-card-title">CS GUIDE STATUS</h3>
                        <div class="cs-guide-list">
                            ${csGuideStatus.map((item, index) => `
                                <label class="cs-guide-item">
                                    <input 
                                        type="checkbox" 
                                        class="cs-guide-checkbox" 
                                        data-index="${index}"
                                        ${item.completed ? 'checked' : ''}
                                    />
                                    <span class="cs-guide-label ${item.completed ? 'completed' : ''}">
                                        ${item.label}
                                    </span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="comments-section">
                    <h3 class="detail-card-title">COMMENTS</h3>
                    <div class="comments-list">
                        ${comments.length > 0
                            ? comments.map((comment) => `
                                <div class="comment-item">
                                    <div class="comment-header">
                                        <span class="comment-author">${comment.author || 'USER NAME'}</span>
                                        <span class="comment-date">${formatDate(comment.date)}</span>
                                    </div>
                                    <p class="comment-text">${comment.text || 'No comment text'}</p>
                                </div>
                            `).join('')
                            : '<p class="no-comments">No comments yet</p>'
                        }
                    </div>
                </div>

                <div class="modal-backdrop" id="edit-partner-modal" aria-hidden="true">
                    <div class="modal-card">
                        <div class="modal-header">
                            <h3>Edit Partner</h3>
                            <button class="modal-close" type="button" id="close-edit-partner-modal" aria-label="Close">&times;</button>
                        </div>
                        <form id="edit-partner-form">
                            <div class="form-grid">
                                <label>
                                    <span>Partner Name</span>
                                    <input type="text" name="partnerName" value="${escapeHtml(partner.name)}" required />
                                </label>
                                <label>
                                    <span>Partner ID</span>
                                    <input type="text" name="partnerId" value="${escapeHtml(partner.partnerId)}" required />
                                </label>
                                <label>
                                    <span>Onboarding Stage</span>
                                    <input type="text" name="onboardingStatus" value="${escapeHtml(partner.onboardingStatus)}" required />
                                </label>
                                <label>
                                    <span>PSM</span>
                                    <input type="text" name="psm" value="${escapeHtml(partner.psm)}" />
                                </label>
                                <label>
                                    <span>Integration Type</span>
                                    <input type="text" name="integrationType" value="${escapeHtml(partner.integrationType)}" />
                                </label>
                                <label>
                                    <span>Contact Email</span>
                                    <input type="email" name="contactEmail" value="${escapeHtml(partner.contactEmail)}" />
                                </label>
                            </div>
                            <label class="notes-field">
                                <span>Notes</span>
                                <textarea name="notes" rows="4">${escapeHtml(partner.notes)}</textarea>
                            </label>
                            <div class="form-actions">
                                <button type="button" class="secondary-btn" id="cancel-edit-partner">Cancel</button>
                                <button type="submit" class="primary-btn">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        `;

        // Handle breadcrumb navigation
        const breadcrumbLink = contentRoot.querySelector('.breadcrumb a');
        if (breadcrumbLink) {
            breadcrumbLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/partners');
                window.dispatchEvent(new PopStateEvent('popstate'));
            });
        }

        // Edit partner modal interactions
        const editButton = contentRoot.querySelector('#edit-partner-btn');
        const editModal = contentRoot.querySelector('#edit-partner-modal');
        const editForm = contentRoot.querySelector('#edit-partner-form');
        const closeEditModalBtn = contentRoot.querySelector('#close-edit-partner-modal');
        const cancelEditBtn = contentRoot.querySelector('#cancel-edit-partner');

        const openEditModal = () => {
            editModal?.setAttribute('aria-hidden', 'false');
            editModal?.classList.add('visible');
        };

        const closeEditModal = () => {
            editModal?.setAttribute('aria-hidden', 'true');
            editModal?.classList.remove('visible');
        };

        editButton?.addEventListener('click', openEditModal);
        closeEditModalBtn?.addEventListener('click', closeEditModal);
        cancelEditBtn?.addEventListener('click', closeEditModal);
        editModal?.addEventListener('click', (event) => {
            if (event.target === editModal) {
                closeEditModal();
            }
        });

        editForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(editForm);
            const updatedPartner = {
                name: formData.get('partnerName')?.toString().trim(),
                partnerId: formData.get('partnerId')?.toString().trim(),
                onboardingStatus: formData.get('onboardingStatus')?.toString().trim(),
                psm: formData.get('psm')?.toString().trim() || null,
                integrationType: formData.get('integrationType')?.toString().trim() || null,
                contactEmail: formData.get('contactEmail')?.toString().trim() || null,
                notes: formData.get('notes')?.toString().trim() || '',
                lastUpdated: serverTimestamp(),
            };

            if (!updatedPartner.name || !updatedPartner.partnerId || !updatedPartner.onboardingStatus) {
                alert('Please complete the required fields.');
                return;
            }

            try {
                await updateDoc(partnerDocRef, updatedPartner);
                closeEditModal();
                renderPartnerDetailPage(contentRoot, db, partnerDocId, userRole);
            } catch (error) {
                console.error('Error updating partner:', error);
                alert('Could not update partner. Please try again.');
            }
        });

        // CS Guide checklist interactions
        const csGuideCheckboxes = contentRoot.querySelectorAll('.cs-guide-checkbox');
        csGuideCheckboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', async (event) => {
                const index = Number(event.target.getAttribute('data-index'));
                const updatedStatus = csGuideStatus.map((item, idx) =>
                    idx === index ? { ...item, completed: event.target.checked } : item
                );

                try {
                    await updateDoc(partnerDocRef, {
                        csGuideStatus: updatedStatus,
                        lastUpdated: serverTimestamp(),
                    });
                    csGuideStatus = updatedStatus;
                    const label = event.target.closest('.cs-guide-item')?.querySelector('.cs-guide-label');
                    label?.classList.toggle('completed', event.target.checked);
                } catch (error) {
                    console.error('Error updating CS guide status:', error);
                    event.target.checked = !event.target.checked;
                    alert('Could not update status. Please try again.');
                }
            });
        });

    } catch (error) {
        console.error("Error fetching partner details:", error);
        contentRoot.innerHTML = `
            <div class="content-card">
                <p>Error loading partner details. Check console and Firebase Security Rules.</p>
                <a href="/partners" data-route="/partners" style="color: var(--color-sidebar-bg);">← Back to Partners</a>
            </div>
        `;
    }
}