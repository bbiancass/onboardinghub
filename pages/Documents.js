// pages/Documents.js

import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

/**
 * Renders the Documents page content, showing files based on the user's role.
 * @param {HTMLElement} contentRoot Element where the page content is injected.
 * @param {object} db Firestore database instance.
 * @param {string} userRole Current user's role.
 * @param {string|null} partnerId Partner ID when the userRole is 'partner'.
 */
export async function renderDocumentsPage(contentRoot, db, userRole, partnerId) {
    contentRoot.innerHTML = `
        <div class="content-card">
            <p>Loading documents...</p>
        </div>
    `;

    const documentsCol = collection(db, "documents");
    let documentsQuery;

    if (userRole === 'admin' || userRole === 'transferz') {
        documentsQuery = query(documentsCol, orderBy("updatedAt", "desc"));
        console.log("Loading all documents (Admin/Transferz view).");
    } else if (userRole === 'partner' && partnerId) {
        documentsQuery = query(
            documentsCol,
            where("partnerId", "==", partnerId),
            orderBy("updatedAt", "desc")
        );
        console.log(`Loading documents for partner ${partnerId}.`);
    } else {
        contentRoot.innerHTML = `
            <div class="content-card">
                <p>Access denied or missing partner assignment.</p>
            </div>
        `;
        return;
    }

    try {
        const snapshot = await getDocs(documentsQuery);
        const documents = [];

        snapshot.forEach(doc => {
            documents.push({ id: doc.id, ...doc.data() });
        });

        contentRoot.innerHTML = `
            <div class="content-card">
                <h2>Documents</h2>
                <p>Status: ${userRole.toUpperCase()} View</p>
                <div id="documents-list">
                    ${documents.length > 0
                        ? documents.map(document => `
                            <div class="document-item">
                                <h3>${document.title || 'Untitled Document'}</h3>
                                <p>Type: ${document.type || 'General'}</p>
                                <p>Partner ID: ${document.partnerId || 'All'}</p>
                                <p>Last Updated: ${document.updatedAt ? new Date(document.updatedAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</p>
                                ${document.url
                                    ? `<a href="${document.url}" target="_blank" rel="noopener noreferrer">Open document</a>`
                                    : '<em>No file attached</em>'
                                }
                            </div>
                            <hr style="margin: 10px 0;">
                        `).join('')
                        : '<p>No documents found for your access level.</p>'
                    }
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error loading documents:", error);
        contentRoot.innerHTML = `
            <div class="content-card">
                <p>Unable to load documents. Please check console and Firestore rules.</p>
            </div>
        `;
    }
}

