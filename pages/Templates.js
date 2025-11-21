// pages/Templates.js

import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

/**
 * Renders the Templates page content, showing available templates based on role.
 * @param {HTMLElement} contentRoot Element where the page content is injected.
 * @param {object} db Firestore database instance.
 * @param {string} userRole Current user's role.
 * @param {string|null} partnerId Partner ID when the userRole is 'partner'.
 */
export async function renderTemplatesPage(contentRoot, db, userRole, partnerId) {
    contentRoot.innerHTML = `
        <div class="content-card">
            <p>Loading templates...</p>
        </div>
    `;

    const templatesCol = collection(db, "templates");
    let templatesQuery;

    if (userRole === 'admin' || userRole === 'transferz') {
        templatesQuery = query(templatesCol, orderBy("updatedAt", "desc"));
        console.log("Loading all templates (Admin/Transferz view).");
    } else if (userRole === 'partner' && partnerId) {
        templatesQuery = query(
            templatesCol,
            where("partnerId", "==", partnerId),
            orderBy("updatedAt", "desc")
        );
        console.log(`Loading templates for partner ${partnerId}.`);
    } else {
        contentRoot.innerHTML = `
            <div class="content-card">
                <p>Access denied or missing partner assignment.</p>
            </div>
        `;
        return;
    }

    try {
        const snapshot = await getDocs(templatesQuery);
        const templates = [];

        snapshot.forEach(doc => {
            templates.push({ id: doc.id, ...doc.data() });
        });

        contentRoot.innerHTML = `
            <div class="content-card">
                <h2>Templates</h2>
                <p>Status: ${userRole.toUpperCase()} View</p>
                <div id="templates-list">
                    ${templates.length > 0
                        ? templates.map(template => `
                            <div class="template-item">
                                <h3>${template.title || 'Untitled Template'}</h3>
                                <p>Category: ${template.category || 'General'}</p>
                                <p>Partner ID: ${template.partnerId || 'All'}</p>
                                <p>Last Updated: ${template.updatedAt ? new Date(template.updatedAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</p>
                                ${template.url
                                    ? `<a href="${template.url}" target="_blank" rel="noopener noreferrer">Download template</a>`
                                    : '<em>No file attached</em>'
                                }
                            </div>
                            <hr style="margin: 10px 0;">
                        `).join('')
                        : '<p>No templates found for your access level.</p>'
                    }
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error loading templates:", error);
        contentRoot.innerHTML = `
            <div class="content-card">
                <p>Unable to load templates. Please check console and Firestore rules.</p>
            </div>
        `;
    }
}

