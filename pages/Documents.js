// pages/Documents.js

import { 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc, 
    updateDoc, 
    doc, 
    deleteDoc,
    serverTimestamp,
    orderBy 
} from "firebase/firestore";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "firebase/storage";

/**
 * Renders the Documents page content with folders, search, upload, download, and favorites.
 * @param {HTMLElement} contentRoot Element where the page content is injected.
 * @param {object} db Firestore database instance.
 * @param {object} storage Firebase Storage instance.
 * @param {string} userRole Current user's role.
 * @param {string|null} partnerId Partner ID when the userRole is 'partner'.
 */
export async function renderDocumentsPage(contentRoot, db, storage, userRole, partnerId) {
    contentRoot.innerHTML = `
        <div class="content-card">
            <p>Loading documents...</p>
        </div>
    `;

    // Hide greeting
    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        greetingElement.style.display = 'none';
    }

    let currentFolder = null; // null = root view, folder name = inside folder

    const documentsCol = collection(db, "documents");
    const foldersCol = collection(db, "folders");

    // Load documents and folders
    const loadDocuments = async (folderName = null) => {
        let documentsQuery;
        if (userRole === 'admin' || userRole === 'transferz') {
            if (folderName) {
                documentsQuery = query(
                    documentsCol,
                    where("folder", "==", folderName),
                    orderBy("createdAt", "desc")
                );
            } else {
                documentsQuery = query(documentsCol, orderBy("createdAt", "desc"));
            }
        } else if (userRole === 'partner' && partnerId) {
            if (folderName) {
                documentsQuery = query(
                    documentsCol,
                    where("partnerId", "==", partnerId),
                    where("folder", "==", folderName),
                    orderBy("createdAt", "desc")
                );
            } else {
                documentsQuery = query(
                    documentsCol,
                    where("partnerId", "==", partnerId),
                    orderBy("createdAt", "desc")
                );
            }
        } else {
            return [];
        }

        const snapshot = await getDocs(documentsQuery);
        const documents = [];
        snapshot.forEach(doc => {
            documents.push({ id: doc.id, ...doc.data() });
        });
        return documents;
    };

    const loadFolders = async () => {
        const snapshot = await getDocs(foldersCol);
        const folders = [];
        snapshot.forEach(doc => {
            folders.push({ id: doc.id, ...doc.data() });
        });
        return folders;
    };

    // Filter documents by search term
    const filterDocuments = (docs, searchTerm) => {
        if (!searchTerm) return docs;
        const term = searchTerm.toLowerCase();
        return docs.filter(doc => 
            doc.name?.toLowerCase().includes(term) ||
            doc.folder?.toLowerCase().includes(term)
        );
    };

    // Render document items
    const renderDocuments = (docsToRender) => {
        if (!docsToRender.length) {
            return '<p class="empty-state">No documents found.</p>';
        }

        return docsToRender.map(document => {
            const isVideo = document.type === 'video' || 
                           document.name?.toLowerCase().match(/\.(mp4|avi|mov|wmv|flv|webm)$/i);
            const icon = isVideo ? '▶️' : '📄';
            return `
                <div class="document-item" data-doc-id="${document.id}">
                    <div class="document-icon">${icon}</div>
                    <div class="document-info">
                        <p class="document-name">${document.name || 'Untitled Document'}</p>
                    </div>
                    <div class="document-actions">
                        <button class="favorite-btn ${document.isFavorite ? 'active' : ''}" 
                                data-doc-id="${document.id}" 
                                title="${document.isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                            ${document.isFavorite ? '★' : '☆'}
                        </button>
                        <button class="download-btn" data-doc-id="${document.id}" title="Download">
                            ⬇️
                        </button>
                        ${userRole === 'admin' || userRole === 'transferz' 
                            ? `<button class="delete-btn" data-doc-id="${document.id}" title="Delete">🗑️</button>`
                            : ''
                        }
                    </div>
                </div>
            `;
        }).join('');
    };

    const renderPage = async (folderName = null) => {
        currentFolder = folderName;
        const documents = await loadDocuments(folderName);
        const folders = await loadFolders();
        const favorites = documents.filter(doc => doc.isFavorite);

        // Render folder cards
        const renderFolders = (foldersToRender) => {
            if (folderName) return ''; // Don't show folders when inside a folder
            
            const defaultFolders = ['Presentations', 'Videos'];
            const allFolders = [...new Set([...defaultFolders, ...foldersToRender.map(f => f.name)])];
            
            return allFolders.map(folderName => {
                const folderDocs = documents.filter(d => d.folder === folderName);
                const count = folderDocs.length;
                return `
                    <div class="folder-card" data-folder="${folderName}">
                        <div class="folder-icon">📁</div>
                        <div class="folder-info">
                            <h3 class="folder-name">${folderName}</h3>
                            <p class="folder-count">${count} ${count === 1 ? 'file' : 'files'}</p>
                        </div>
                    </div>
                `;
            }).join('');
        };

        contentRoot.innerHTML = `
            <section class="documents-page">
                <header class="documents-header">
                    <div class="documents-header-row">
                        <h1 class="documents-title">${folderName ? folderName : 'Onboarding documents'}</h1>
                        <button class="add-btn" id="add-btn">+ ADD</button>
                    </div>
                    ${folderName 
                        ? `<button class="back-btn" id="back-btn">← Back to Documents</button>`
                        : ''
                    }
                    <input type="search" 
                           id="documents-search" 
                           class="documents-search" 
                           placeholder="Search" />
                </header>

                ${!folderName ? `
                    <div class="folders-section">
                        ${renderFolders(folders)}
                    </div>
                ` : ''}

                ${favorites.length > 0 ? `
                    <div class="favorites-section">
                        <h2 class="section-title">Favorites</h2>
                        <div class="documents-list" id="favorites-list">
                            ${renderDocuments(favorites)}
                        </div>
                    </div>
                ` : ''}

                ${folderName ? `
                    <div class="folder-documents-section">
                        <h2 class="section-title">Documents in ${folderName}</h2>
                        <div class="documents-list" id="folder-documents-list">
                            ${renderDocuments(documents.filter(d => d.folder === folderName))}
                        </div>
                    </div>
                ` : ''}
            </section>

            <!-- Add Modal -->
            <div class="modal-backdrop" id="add-modal" aria-hidden="true">
                <div class="modal-card">
                    <div class="modal-header">
                        <h3>Add Document or Folder</h3>
                        <button class="modal-close" type="button" id="close-add-modal" aria-label="Close">&times;</button>
                    </div>
                    <div class="add-modal-content">
                        <button class="modal-action-btn" id="upload-file-btn">
                            📄 Upload File
                        </button>
                        <button class="modal-action-btn" id="create-folder-btn">
                            📁 Create Folder
                        </button>
                    </div>
                </div>
            </div>

            <!-- Upload File Modal -->
            <div class="modal-backdrop" id="upload-modal" aria-hidden="true">
                <div class="modal-card">
                    <div class="modal-header">
                        <h3>Upload File</h3>
                        <button class="modal-close" type="button" id="close-upload-modal" aria-label="Close">&times;</button>
                    </div>
                    <form id="upload-form">
                        <label>
                            <span>Select Folder</span>
                            <select name="folder" id="upload-folder-select">
                                <option value="">Root (No folder)</option>
                                ${folders.map(f => `<option value="${f.name}" ${f.name === folderName ? 'selected' : ''}>${f.name}</option>`).join('')}
                                ${!folders.find(f => f.name === 'Presentations') ? '<option value="Presentations">Presentations</option>' : ''}
                                ${!folders.find(f => f.name === 'Videos') ? '<option value="Videos">Videos</option>' : ''}
                            </select>
                        </label>
                        <label>
                            <span>File</span>
                            <input type="file" name="file" id="upload-file-input" required />
                        </label>
                        <div class="form-actions">
                            <button type="button" class="secondary-btn" id="cancel-upload">Cancel</button>
                            <button type="submit" class="primary-btn">Upload</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Create Folder Modal -->
            <div class="modal-backdrop" id="folder-modal" aria-hidden="true">
                <div class="modal-card">
                    <div class="modal-header">
                        <h3>Create Folder</h3>
                        <button class="modal-close" type="button" id="close-folder-modal" aria-label="Close">&times;</button>
                    </div>
                    <form id="folder-form">
                        <label>
                            <span>Folder Name</span>
                            <input type="text" name="folderName" id="folder-name-input" required placeholder="Enter folder name" />
                        </label>
                        <div class="form-actions">
                            <button type="button" class="secondary-btn" id="cancel-folder">Cancel</button>
                            <button type="submit" class="primary-btn">Create</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Event listeners
        setupEventListeners(documents, folders);
    };

    const setupEventListeners = (documents, folders) => {
        // Search functionality
        const searchInput = contentRoot.querySelector('#documents-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const searchTerm = e.target.value.toLowerCase();
                    const allDocs = [...documents];
                    const filtered = filterDocuments(allDocs, searchTerm);
                    
                    // Update favorites list
                    const favoritesList = contentRoot.querySelector('#favorites-list');
                    if (favoritesList) {
                        const favs = filtered.filter(d => d.isFavorite);
                        favoritesList.innerHTML = renderDocuments(favs);
                        attachDocumentListeners(favs);
                    }
                    
                    // Update folder documents list
                    const folderList = contentRoot.querySelector('#folder-documents-list');
                    if (folderList && currentFolder) {
                        const folderDocs = filtered.filter(d => d.folder === currentFolder);
                        folderList.innerHTML = renderDocuments(folderDocs);
                        attachDocumentListeners(folderDocs);
                    }
                }, 300);
            });
        }

        // Folder click handlers
        contentRoot.querySelectorAll('.folder-card').forEach(card => {
            card.addEventListener('click', () => {
                const folderName = card.getAttribute('data-folder');
                renderPage(folderName);
            });
        });

        // Back button
        const backBtn = contentRoot.querySelector('#back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                renderPage(null);
            });
        }

        // Add button
        const addBtn = contentRoot.querySelector('#add-btn');
        const addModal = contentRoot.querySelector('#add-modal');
        const closeAddModal = contentRoot.querySelector('#close-add-modal');
        
        addBtn?.addEventListener('click', () => {
            addModal?.setAttribute('aria-hidden', 'false');
            addModal?.classList.add('visible');
        });

        closeAddModal?.addEventListener('click', () => closeModal(addModal));

        // Upload file button
        const uploadFileBtn = contentRoot.querySelector('#upload-file-btn');
        const uploadModal = contentRoot.querySelector('#upload-modal');
        const closeUploadModal = contentRoot.querySelector('#close-upload-modal');
        const cancelUpload = contentRoot.querySelector('#cancel-upload');
        const uploadForm = contentRoot.querySelector('#upload-form');

        uploadFileBtn?.addEventListener('click', () => {
            addModal?.setAttribute('aria-hidden', 'true');
            addModal?.classList.remove('visible');
            uploadModal?.setAttribute('aria-hidden', 'false');
            uploadModal?.classList.add('visible');
        });

        closeUploadModal?.addEventListener('click', () => closeModal(uploadModal));
        cancelUpload?.addEventListener('click', () => closeModal(uploadModal));

        uploadForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(uploadForm);
            const file = formData.get('file');
            const folderName = formData.get('folder') || null;

            if (!file || !file.name) {
                alert('Please select a file.');
                return;
            }

            try {
                // Upload to Firebase Storage
                const fileRef = ref(storage, `documents/${Date.now()}_${file.name}`);
                await uploadBytes(fileRef, file);
                const downloadURL = await getDownloadURL(fileRef);

                // Determine file type
                const isVideo = file.type.startsWith('video/') || 
                               file.name.toLowerCase().match(/\.(mp4|avi|mov|wmv|flv|webm)$/i);
                const type = isVideo ? 'video' : 'document';

                // Save metadata to Firestore
                const docData = {
                    name: file.name,
                    type: type,
                    url: downloadURL,
                    storagePath: fileRef.fullPath,
                    folder: folderName,
                    isFavorite: false,
                    partnerId: userRole === 'partner' ? partnerId : null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };

                await addDoc(documentsCol, docData);
                closeModal(uploadModal);
                uploadForm.reset();
                await renderPage(currentFolder);
            } catch (error) {
                console.error('Error uploading file:', error);
                alert('Failed to upload file. Please try again.');
            }
        });

        // Create folder button
        const createFolderBtn = contentRoot.querySelector('#create-folder-btn');
        const folderModal = contentRoot.querySelector('#folder-modal');
        const closeFolderModal = contentRoot.querySelector('#close-folder-modal');
        const cancelFolder = contentRoot.querySelector('#cancel-folder');
        const folderForm = contentRoot.querySelector('#folder-form');

        createFolderBtn?.addEventListener('click', () => {
            addModal?.setAttribute('aria-hidden', 'true');
            addModal?.classList.remove('visible');
            folderModal?.setAttribute('aria-hidden', 'false');
            folderModal?.classList.add('visible');
        });

        closeFolderModal?.addEventListener('click', () => closeModal(folderModal));
        cancelFolder?.addEventListener('click', () => closeModal(folderModal));

        folderForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(folderForm);
            const folderName = formData.get('folderName')?.toString().trim();

            if (!folderName) {
                alert('Please enter a folder name.');
                return;
            }

            try {
                // Check if folder already exists
                const existingFolders = await getDocs(foldersCol);
                const folderExists = existingFolders.docs.some(doc => doc.data().name === folderName);

                if (folderExists) {
                    alert('A folder with this name already exists.');
                    return;
                }

                await addDoc(foldersCol, {
                    name: folderName,
                    createdAt: serverTimestamp()
                });

                closeModal(folderModal);
                folderForm.reset();
                await renderPage(currentFolder);
            } catch (error) {
                console.error('Error creating folder:', error);
                alert('Failed to create folder. Please try again.');
            }
        });

        // Attach document action listeners
        attachDocumentListeners(documents);
    };

    const attachDocumentListeners = (docs) => {
        // Favorite toggle
        contentRoot.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const docId = btn.getAttribute('data-doc-id');
                const docItem = docs.find(d => d.id === docId);
                if (!docItem) return;

                try {
                    const docRef = doc(documentsCol, docId);
                    await updateDoc(docRef, {
                        isFavorite: !docItem.isFavorite,
                        updatedAt: serverTimestamp()
                    });
                    await renderPage(currentFolder);
                } catch (error) {
                    console.error('Error updating favorite:', error);
                    alert('Failed to update favorite status.');
                }
            });
        });

        // Download
        contentRoot.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const docId = btn.getAttribute('data-doc-id');
                const docItem = docs.find(d => d.id === docId);
                if (!docItem || !docItem.url) return;

                try {
                    const link = document.createElement('a');
                    link.href = docItem.url;
                    link.download = docItem.name || 'download';
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (error) {
                    console.error('Error downloading file:', error);
                    alert('Failed to download file.');
                }
            });
        });

        // Delete
        contentRoot.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const docId = btn.getAttribute('data-doc-id');
                const docItem = docs.find(d => d.id === docId);
                if (!docItem) return;

                if (!confirm(`Are you sure you want to delete "${docItem.name}"?`)) {
                    return;
                }

                try {
                    // Delete from Storage
                    if (docItem.storagePath) {
                        const fileRef = ref(storage, docItem.storagePath);
                        await deleteObject(fileRef).catch(err => {
                            console.warn('Error deleting file from storage:', err);
                        });
                    }

                    // Delete from Firestore
                    const docRef = doc(documentsCol, docId);
                    await deleteDoc(docRef);
                    await renderPage(currentFolder);
                } catch (error) {
                    console.error('Error deleting document:', error);
                    alert('Failed to delete document.');
                }
            });
        });
    };

    const closeModal = (modal) => {
        modal?.setAttribute('aria-hidden', 'true');
        modal?.classList.remove('visible');
    };

    // Close modals on backdrop click
    contentRoot.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                closeModal(backdrop);
            }
        });
    });

    // Initial render
    await renderPage(null);
}
