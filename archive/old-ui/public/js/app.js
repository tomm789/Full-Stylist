/* ----------------------------------------------------------------
   STATE MANAGEMENT
   ---------------------------------------------------------------- */
// #region agent log
fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:4',message:'State object initialization start',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion
const state = {
    rawSelfie: null,
    rawBody: null,
    masterBodyB64: null, 

    previewHeadshotUrl: null,
    previewHeadshotB64: null,

    previewBodyUrl: null,
    previewBodyB64: null,

    savedLooks: [], 
    wardrobe: [],
    outfitHistory: [],
    
    selectedLookId: null,
    selectedModel: (() => {
        const saved = localStorage.getItem('selectedModel');
        const validModels = ['gemini-3-pro-image-preview', 'standard-plus', 'gemini-2.5-flash-image'];
        return validModels.includes(saved) ? saved : "gemini-2.5-flash-image";
    })(),
    modelPassword: "",
    isModelLocked: false,

    // SESSION MANAGEMENT
    currentSessionBaseB64: null, // The image we are currently editing
    sessionHistory: [], // Stack of { baseB64, wardrobeIds }
    lastAppliedWardrobeIds: new Set(), // Track which items are already in the image
    salonPreviewB64: null, // For sequential salon refinements
    currentMannequinB64: null, // Temporary storage for mannequin generation
    userName: null,
    wardrobeView: 'list', // 'list' or 'grid'
    outfitSubTab: 'all', // 'all', 'lookbooks', or 'calendar'
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
    selectedOutfitCategory: 'All',
    selectedWardrobeItems: [], // IDs of selected items
    outfits: [], // Array of { id, name, mannequinB64, humanB64, categories: [], lookbooks: [], items: [] }
    selectedWardrobeCategory: 'All',
    selectedWardrobeGroup: 'All',
    customCategories: [], // User-defined categories
    customGroups: [], // User-defined groups
    lookbooks: [], // Array of { id, name, coverImageUrl, outfitIds: [], created_at }
    preferences: {
        autoRemoveBackground: false,
        autoTagItems: true,
        weatherLocation: null, // City or zip code
        weatherEnabled: false
    },
    wardrobeSearchQuery: '',
    outfitsSearchQuery: '',
    bulkSelectMode: false,
    bulkSelectedItems: [], // IDs selected in bulk mode
    workspaceItems: [], // Array of { id: uniqueId, itemId: wardrobeItemId, x: number, y: number }
    lastUsedWardrobeItems: [] // Track wardrobe items used in last generation for saving outfits
};
// #region agent log
fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:57',message:'State object initialization complete',data:{savedLooksCount:state.savedLooks.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

/* ----------------------------------------------------------------
   LOCALSTORAGE PERSISTENCE
   ---------------------------------------------------------------- */
const STORAGE_KEY = 'full_stylist_data';
const STORAGE_VERSION = 1;

function getStorageData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        const data = JSON.parse(stored);
        // Version migration logic can go here in the future
        return data;
    } catch (e) {
        console.error('Error loading from LocalStorage:', e);
        return null;
    }
}

function saveToLocalStorage() {
    try {
        const dataToSave = {
            version: STORAGE_VERSION,
            userName: state.userName,
            wardrobe: state.wardrobe,
            outfits: state.outfits,
            savedLooks: state.savedLooks,
            customCategories: state.customCategories,
            customGroups: state.customGroups,
            lookbooks: state.lookbooks,
            workspaceItems: state.workspaceItems,
            selectedModel: state.selectedModel,
            preferences: {
                wardrobeView: state.wardrobeView,
                selectedWardrobeCategory: state.selectedWardrobeCategory,
                selectedWardrobeGroup: state.selectedWardrobeGroup,
                autoRemoveBackground: state.preferences.autoRemoveBackground,
                autoTagItems: state.preferences.autoTagItems,
                weatherLocation: state.preferences.weatherLocation,
                weatherEnabled: state.preferences.weatherEnabled
            }
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            // Try to free up space by removing oldest outfits/images
            handleStorageQuotaExceeded();
        } else {
            console.error('Error saving to LocalStorage:', e);
        }
    }
}

function handleStorageQuotaExceeded() {
    const message = 'Storage quota exceeded. Would you like to free up space by removing old outfits?';
    if (!confirm(message)) {
        alert('Unable to save. Please manually delete some items to free up space.');
        return;
    }
    
    // Remove oldest outfits (keep last 50)
    if (state.outfits.length > 50) {
        const toRemove = state.outfits.length - 50;
        state.outfits = state.outfits.slice(0, 50);
        alert(`Removed ${toRemove} oldest outfit(s) to free up space.`);
    }
    
    // Remove oldest wardrobe items if still needed (keep last 200)
    if (state.wardrobe.length > 200) {
        const toRemove = state.wardrobe.length - 200;
        state.wardrobe = state.wardrobe.slice(0, 200);
        alert(`Removed ${toRemove} oldest wardrobe item(s) to free up space.`);
    }
    
    // Try saving again
    try {
        saveToLocalStorage();
        alert('Space freed up successfully. Your data has been saved.');
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            alert('Still not enough space. Please manually delete more items.');
        } else {
            alert('Error saving data: ' + e.message);
        }
    }
}

function loadFromLocalStorage() {
    const data = getStorageData();
    if (!data) return;
    
    if (data.wardrobe) state.wardrobe = data.wardrobe;
    if (data.outfits) state.outfits = data.outfits;
    if (data.savedLooks) {
        state.savedLooks = data.savedLooks;
        if (data.savedLooks.length > 0) {
            state.selectedLookId = data.savedLooks[data.savedLooks.length - 1].id;
        }
    }
    if (data.customCategories) state.customCategories = data.customCategories;
    if (data.customGroups) state.customGroups = data.customGroups;
    if (data.lookbooks) state.lookbooks = data.lookbooks;
    if (data.workspaceItems) {
        state.workspaceItems = data.workspaceItems.map(item => ({
            ...item,
            width: item.width || 150,
            height: item.height || 180,
            crop: item.crop || { top: 0, right: 0, bottom: 0, left: 0 }
        }));
    }
    if (data.selectedModel) state.selectedModel = data.selectedModel;
    if (data.preferences) {
        if (data.preferences.wardrobeView) state.wardrobeView = data.preferences.wardrobeView;
        if (data.preferences.selectedWardrobeCategory) state.selectedWardrobeCategory = data.preferences.selectedWardrobeCategory;
        if (data.preferences.selectedWardrobeGroup) state.selectedWardrobeGroup = data.preferences.selectedWardrobeGroup;
        if (data.preferences.autoRemoveBackground !== undefined) state.preferences.autoRemoveBackground = data.preferences.autoRemoveBackground;
        if (data.preferences.autoTagItems !== undefined) state.preferences.autoTagItems = data.preferences.autoTagItems;
        if (data.preferences.weatherLocation) state.preferences.weatherLocation = data.preferences.weatherLocation;
        if (data.preferences.weatherEnabled !== undefined) state.preferences.weatherEnabled = data.preferences.weatherEnabled;
    }
}

// Debounced save function
let saveTimeout = null;
function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveToLocalStorage();
    }, 500);
}

/* ----------------------------------------------------------------
   SESSION LOGGING
   ---------------------------------------------------------------- */
async function logInteraction(actionType, details = {}) {
    if (!state.userName) return;
    
    try {
        await fetch('/.netlify/functions/log-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userName: state.userName,
                action: actionType,
                details: details,
                timestamp: new Date().toISOString()
            })
        });
    } catch (e) {
        console.error("Failed to log interaction:", e);
    }
}

async function handleLogin() {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:168',message:'handleLogin called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const nameInput = document.getElementById('login-name');
    const passInput = document.getElementById('login-password');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:171',message:'DOM elements retrieved',data:{nameInputExists:!!nameInput,passInputExists:!!passInput},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const name = nameInput.value.trim();
    const pass = passInput.value;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:174',message:'Input values extracted',data:{nameLength:name.length,passLength:pass.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!name) return alert("Please enter your name");
    if (pass !== 'styleme') return alert("Incorrect password");
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:177',message:'Validation passed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    state.userName = name;
    
    // Load user data from LocalStorage
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:180',message:'Before loadFromLocalStorage',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    try {
        loadFromLocalStorage();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:182',message:'loadFromLocalStorage completed',data:{savedLooksCount:state.savedLooks.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
    } catch (e) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:185',message:'loadFromLocalStorage error',data:{error:e.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        console.error('Error loading from LocalStorage:', e);
    }
    
    // Transition UI
    const loginView = document.getElementById('login-view');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:191',message:'Before UI transition',data:{loginViewExists:!!loginView},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (loginView) loginView.classList.add('hidden');
    
    // Check if user has looks
    if (state.savedLooks.length === 0) {
        // Show landing states
        const stylistLanding = document.getElementById('stylist-landing');
        const stylistUI = document.getElementById('stylist-ui');
        const salonLanding = document.getElementById('salon-landing');
        const salonUI = document.getElementById('salon-ui');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:199',message:'Landing state elements check',data:{stylistLandingExists:!!stylistLanding,stylistUIExists:!!stylistUI,salonLandingExists:!!salonLanding,salonUIExists:!!salonUI},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        if (stylistLanding) stylistLanding.classList.remove('hidden');
        if (stylistUI) stylistUI.classList.add('hidden');
        if (salonLanding) salonLanding.classList.remove('hidden');
        if (salonUI) salonUI.classList.add('hidden');
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:207',message:'Before enterDashboard',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    try {
        enterDashboard();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:210',message:'enterDashboard completed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
    } catch (e) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:213',message:'enterDashboard error',data:{error:e.message,stack:e.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.error('Error in enterDashboard:', e);
        alert('Error entering dashboard: ' + e.message);
    }
    
    // Log login
    logInteraction('login');
    debouncedSave();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:221',message:'handleLogin completed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
}

function startOnboarding() {
    // Hide dashboard, show onboarding step 1
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('onboarding-view').classList.remove('hidden');
    goToStep(1);
}

/* ----------------------------------------------------------------
   HELPERS
   ---------------------------------------------------------------- */
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});

function setupDragAndDrop(element, onFileDrop) {
    if (!element) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        element.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        element.addEventListener(eventName, () => {
            element.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        element.addEventListener(eventName, () => {
            element.classList.remove('drag-over');
        }, false);
    });

    element.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            onFileDrop(files);
        } else {
            // Check for custom data (wardrobe item ID)
            const itemId = dt.getData('text/plain');
            if (itemId && itemId.startsWith('wardrobe-item-')) {
                const id = itemId.replace('wardrobe-item-', '');
                
                // Check if dropping on workspace grid
                const workspaceGrid = document.getElementById('wardrobe-workspace-grid');
                const dropTarget = e.target;
                if (workspaceGrid && (dropTarget === workspaceGrid || workspaceGrid.contains(dropTarget) || element === workspaceGrid)) {
                    const rect = workspaceGrid.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    addItemToWorkspace(id, x, y);
                } else {
                    // Legacy behavior for other drop zones (if any)
                    if (!state.selectedWardrobeItems.includes(id)) {
                        state.selectedWardrobeItems.push(id);
                        renderWardrobePage();
                    }
                }
            }
        }
    }, false);
}

function setupItemDragging(cardElement, itemId) {
    if (!cardElement) return;
    
    cardElement.draggable = true;
    cardElement.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', `wardrobe-item-${itemId}`);
        e.dataTransfer.effectAllowed = 'move';
        cardElement.style.opacity = '0.5';
    });
    
    cardElement.addEventListener('dragend', () => {
        cardElement.style.opacity = '1';
    });
}

function setupItemDraggingToWorkspace(cardElement, itemId) {
    if (!cardElement) return;
    
    cardElement.draggable = true;
    cardElement.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', `wardrobe-item-${itemId}`);
        e.dataTransfer.effectAllowed = 'move';
        cardElement.style.opacity = '0.5';
    });
    
    cardElement.addEventListener('dragend', () => {
        cardElement.style.opacity = '1';
    });
}

/**
 * Resizes a base64 image string if it exceeds maxDimension.
 * Returns a base64 string (without prefix).
 */
function extractDominantColor(imageB64) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 50; // Small sample for performance
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 50, 50);
            
            const imageData = ctx.getImageData(0, 0, 50, 50);
            const data = imageData.data;
            
            // Simple color extraction: average RGB
            let r = 0, g = 0, b = 0;
            for (let i = 0; i < data.length; i += 4) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
            }
            const pixelCount = data.length / 4;
            r = Math.round(r / pixelCount);
            g = Math.round(g / pixelCount);
            b = Math.round(b / pixelCount);
            
            // Convert to HSL for better color sorting
            const hsl = rgbToHsl(r, g, b);
            resolve({ r, g, b, h: hsl.h, s: hsl.s, l: hsl.l, hex: rgbToHex(r, g, b) });
        };
        img.src = 'data:image/jpeg;base64,' + imageB64;
    });
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function sortByColor() {
    // Extract colors for items that don't have them
    const itemsNeedingColor = state.wardrobe.filter(item => !item.colorData);
    
    if (itemsNeedingColor.length > 0) {
        showLoading(true, "Analyzing colors...");
        Promise.all(itemsNeedingColor.map(async (item) => {
            item.colorData = await extractDominantColor(item.b64);
            return item;
        })).then(() => {
            showLoading(false);
            state.wardrobe.sort((a, b) => {
                const aColor = a.colorData || { h: 0, l: 0 };
                const bColor = b.colorData || { h: 0, l: 0 };
                // Sort by hue first, then lightness
                if (aColor.h !== bColor.h) return aColor.h - bColor.h;
                return aColor.l - bColor.l;
            });
            debouncedSave();
            renderWardrobePage();
        });
    } else {
        // Already have colors, just sort
        state.wardrobe.sort((a, b) => {
            const aColor = a.colorData || { h: 0, l: 0 };
            const bColor = b.colorData || { h: 0, l: 0 };
            if (aColor.h !== bColor.h) return aColor.h - bColor.h;
            return aColor.l - bColor.l;
        });
        renderWardrobePage();
    }
}

async function resizeImage(b64, maxDimension = 1024) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width <= maxDimension && height <= maxDimension) {
                resolve(b64);
                return;
            }

            if (width > height) {
                if (width > maxDimension) {
                    height *= maxDimension / width;
                    width = maxDimension;
                }
            } else {
                if (height > maxDimension) {
                    width *= maxDimension / height;
                    height = maxDimension;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Get base64 without the prefix
            const resizedB64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
            resolve(resizedB64);
        };
        img.src = 'data:image/jpeg;base64,' + b64;
    });
}

function showLoading(show, text="Processing...", containerId=null) {
    const globalEl = document.getElementById('loading-overlay');
    const globalTxt = document.getElementById('loading-text');
    
    if (containerId) {
        const localEl = document.getElementById(containerId);
        if (localEl) {
            localEl.style.display = show ? 'flex' : 'none';
            const localTxt = localEl.querySelector('.loading-text');
            if (localTxt && text) localTxt.innerText = text;
            return;
        }
    }

    if(show) {
        globalEl.style.display = 'block';
        globalTxt.innerText = text;
    } else {
        globalEl.style.display = 'none';
    }
}

function showSkeletonLoader(containerId, count = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton skeleton-item-card';
        container.appendChild(skeleton);
    }
}

function hideSkeletonLoader(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        // Skeleton will be replaced by actual content
    }
}

// DOWNLOAD FEATURE
async function downloadImageById(id) {
    const img = document.getElementById(id);
    if (!img) return;
    return downloadImageBySrc(img.src);
}

async function downloadCurrentImage() {
    return downloadImageBySrc(document.getElementById('stage-image').src);
}

async function downloadImageBySrc(src) {
    if (!src || src === "" || src.startsWith('http://localhost') || src.length < 100) return alert("No image to download.");
    
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    try {
        // Fetch the image as a blob to ensure proper download on mobile
        const response = await fetch(src);
        const blob = await response.blob();
        
        // For iOS, use Share API if available, otherwise open in new tab
        if (isIOS && navigator.share) {
            const file = new File([blob], `full_stylist_${Date.now()}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Full Stylist Image',
                    text: 'Download image'
                });
                return;
            }
        }
        
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `full_stylist_${Date.now()}.png`;
        link.style.display = 'none';
        
        // For iOS, open in new tab as fallback
        if (isIOS) {
            link.target = '_blank';
            link.rel = 'noopener';
        }
        
        // For iOS and mobile browsers, we need to append to body first
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        }, 100);
    } catch (error) {
        console.error('Download error:', error);
        // Fallback: open image in new tab (works on iOS)
        window.open(src, '_blank');
    }
}

/* ----------------------------------------------------------------
   ONBOARDING LOGIC
   ---------------------------------------------------------------- */
async function processFile(file, previewId, stateKey) {
    if (!file) return;
    
    let b64 = await toBase64(file);
    // Resize large mobile photos to ensure stability
    b64 = await resizeImage(b64, 1280);
    
    if(stateKey === 'selfieBase64') state.rawSelfie = b64;
    if(stateKey === 'bodyBase64') state.rawBody = b64;
    
    const img = document.getElementById(previewId);
    if (img) {
        img.src = 'data:image/jpeg;base64,' + b64;
        img.classList.remove('hidden');
        
        // Add class to container
        const box = img.closest('.upload-box');
        if (box) box.classList.add('has-image');
    }
}

async function handleFile(input, previewId, stateKey) {
    if (input.files && input.files[0]) {
        await processFile(input.files[0], previewId, stateKey);
    }
}

function goToStep(step) {
    document.querySelectorAll('.step-card').forEach(el => el.classList.add('hidden'));
    document.getElementById(`step-${step}`).classList.remove('hidden');
}

// STEP 1: INITIAL HEADSHOT
async function generateInitialHeadshot() {
    if(!state.rawSelfie) return alert("Please upload a selfie");
    if(!validateModelAccess()) return;

    showLoading(true, "Generating...", "loading-selfie-upload");
    
    const hair = document.getElementById('setup-hair').value || "Keep original hair";
    const makeup = document.getElementById('setup-makeup').value || "Natural look";

    const headPrompt = `Professional studio headshot. 
    SUBJECT: The person in Image 0. 
    CLOTHING: Wearing a simple white ribbed singlet (wife beater).
    MODIFICATIONS: ${hair}, ${makeup}.
    CRITICAL: Maintain the EXACT framing, zoom level, and head angle of Image 0.
    STYLE: Photorealistic, 8k, soft lighting, light grey/white background.`;

    try {
        const headB64 = await callGemini(headPrompt, [state.rawSelfie]);
        state.previewHeadshotB64 = headB64;
        state.previewHeadshotUrl = `data:image/png;base64,${headB64}`;
        document.getElementById('generated-headshot-preview').src = state.previewHeadshotUrl;
        goToStep(2);
    } catch(e) {
        alert(e.message);
    } finally {
        showLoading(false, null, "loading-selfie-upload");
    }
}

async function refineHeadshot() {
    const desc = document.getElementById('refine-headshot-desc').value;
    if (!desc) return alert("Please describe what to change.");
    if (!validateModelAccess()) return;

    showLoading(true, "Refining...", "loading-headshot");

    const prompt = `Professional studio headshot.
    SUBJECT: The person in Image 0.
    REFINEMENT: Apply these changes: ${desc}.
    CRITICAL: Maintain the exact framing, zoom, and head angle of Image 0.
    STYLE: Photorealistic, 8k, soft lighting, light grey/white background.`;

    try {
        const headB64 = await callGemini(prompt, [state.previewHeadshotB64]);
        state.previewHeadshotB64 = headB64;
        state.previewHeadshotUrl = `data:image/png;base64,${headB64}`;
        document.getElementById('generated-headshot-preview').src = state.previewHeadshotUrl;
        document.getElementById('refine-headshot-desc').value = "";
    } catch (e) {
        alert(e.message);
    } finally {
        showLoading(false, null, "loading-headshot");
    }
}

// STEP 3: GENERATE STUDIO MODEL
async function generateStudioModel() {
    if(!state.rawBody) return alert("Please upload a body photo");
    if(!validateModelAccess()) return;
    
    showLoading(true, "Generating...", "loading-body-upload");

    try {
        const bodyB64 = await runBodyGeneration(state.previewHeadshotB64, state.rawBody);
        state.previewBodyB64 = bodyB64;
        state.previewBodyUrl = `data:image/png;base64,${bodyB64}`;
        document.getElementById('generated-body-preview').src = state.previewBodyUrl;
        goToStep(4);
    } catch(e) {
        alert(e.message);
    } finally {
        showLoading(false, null, "loading-body-upload");
    }
}

// STEP 4: CONFIRM STUDIO MODEL
function confirmStudioModel() {
    if(!state.previewBodyB64) return alert("No studio model to confirm");
    state.masterBodyB64 = state.previewBodyB64; // Set Master Ref
    state.currentSessionBaseB64 = state.previewBodyB64; // Initialize session base
    saveNewLook(state.previewHeadshotB64, state.previewBodyB64);
    
    // Switch to stylist tab and show UI
    enterDashboard();
    switchTab('stylist');
}

async function refineBodyModel() {
    const desc = document.getElementById('refine-body-desc').value;
    if (!desc) return alert("Please describe what to change.");
    if (!validateModelAccess()) return;

    showLoading(true, "Refining...", "loading-body");

    const prompt = `
    Refine the full-body studio photograph.
    SUBJECT: The person in Image 0.
    REFINEMENT: ${desc}.
    INSTRUCTIONS:
    1. Apply the requested changes while maintaining the facial identity and body framing of Image 0.
    2. Background: Pure white infinite studio.
    3. Output a Full Body Vertical Portrait.
    `;

    try {
        const modelOverride = state.selectedModel === 'standard-plus' ? 'gemini-3-pro-image-preview' : null;
        const bodyB64 = await callGemini(prompt, [state.previewBodyB64], modelOverride);
        state.previewBodyB64 = bodyB64;
        state.previewBodyUrl = `data:image/png;base64,${bodyB64}`;
        document.getElementById('generated-body-preview').src = state.previewBodyUrl;
        document.getElementById('refine-body-desc').value = "";
    } catch (e) {
        alert(e.message);
    } finally {
        showLoading(false, null, "loading-body");
    }
}

async function runBodyGeneration(headB64, referenceBodyB64) {
    const prompt = `
    Generate a wide-shot, full-body studio photograph.
    SUBJECT: A person standing in grey boxer shorts and a white ribbed singlet.
    REFERENCES:
    - Image 0: Source for facial features.
    - Image 1: STRICT Source for body shape, pose, framing, and crop.

    INSTRUCTIONS:
    1. COMPOSITION: Wide shot. The camera must be far enough back to show the feet and significant space above the head.
    2. ANATOMY: Strictly enforce the "8-heads-tall" rule. The head must appear small relative to the broadness of the shoulders and length of the torso.
    3. INTEGRATION: Seamlessly blend Head (Img 0) onto Body (Img 1) matching lighting and skin tone.
    4. FRAMING: Maintain the exact framing of Image 1 (Full Body Vertical 3:4 or 9:16).
    5. NEGATIVE CONSTRAINT: Significantly decrease the size of the head and the length of the neck. Do not create a bobblehead effect. The neck must be proportional to the shoulders.
    `;
    const modelOverride = state.selectedModel === 'standard-plus' ? 'gemini-3-pro-image-preview' : null;
    return await callGemini(prompt, [headB64, referenceBodyB64], modelOverride);
}

/* ----------------------------------------------------------------
   DASHBOARD LOGIC
   ---------------------------------------------------------------- */
function enterDashboard() {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:692',message:'enterDashboard called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const onboardingView = document.getElementById('onboarding-view');
    const dashboardView = document.getElementById('dashboard-view');
    const homeView = document.getElementById('home-view');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:696',message:'Dashboard elements check',data:{onboardingViewExists:!!onboardingView,dashboardViewExists:!!dashboardView},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (onboardingView) onboardingView.classList.add('hidden');
    if (homeView) homeView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.remove('hidden');
    
    // Check if we should show/hide landing states based on saved looks
    const hasLooks = state.savedLooks.length > 0;
    const stylistLanding = document.getElementById('stylist-landing');
    const stylistUI = document.getElementById('stylist-ui');
    const salonLanding = document.getElementById('salon-landing');
    const salonUI = document.getElementById('salon-ui');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:705',message:'Landing state elements in enterDashboard',data:{hasLooks,stylistLandingExists:!!stylistLanding,stylistUIExists:!!stylistUI,salonLandingExists:!!salonLanding,salonUIExists:!!salonUI},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (stylistLanding) stylistLanding.classList.toggle('hidden', hasLooks);
    if (stylistUI) stylistUI.classList.toggle('hidden', !hasLooks);
    if (salonLanding) salonLanding.classList.toggle('hidden', hasLooks);
    if (salonUI) salonUI.classList.toggle('hidden', !hasLooks);

    // Initialize model selector
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:712',message:'Before initModelSelector',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    try {
        initModelSelector();
        updateCostDisplay();
        renderWardrobeGrid();
        // Initialize category tabs for wardrobe page (in case user switches to it)
        renderCategoryTabs();
        // Initialize workspace (in case user switches to wardrobe tab)
        renderWorkspace();
        switchTab('stylist');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:718',message:'enterDashboard completed successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
    } catch (e) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:721',message:'Error in enterDashboard init',data:{error:e.message,stack:e.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        throw e;
    }
}

function switchTab(tab) {
    const dashboardView = document.getElementById('dashboard-view');
    const homeView = document.getElementById('home-view');
    
    // Remove active state from all nav items (both desktop and mobile)
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    // Handle home tab separately
    if (tab === 'home') {
        if (dashboardView) dashboardView.classList.add('hidden');
        if (homeView) homeView.classList.remove('hidden');
        // Set active on both desktop and mobile nav items
        const desktopNav = document.getElementById(`nav-${tab}`);
        const mobileNav = document.getElementById(`nav-${tab}-mobile`);
        if (desktopNav) desktopNav.classList.add('active');
        if (mobileNav) mobileNav.classList.add('active');
        // Initialize home view
        setTimeout(() => {
            initHomeView();
        }, 100);
        return; // Exit early for home tab
    }
    
    // For all other tabs, show dashboard and hide home
    if (dashboardView) dashboardView.classList.remove('hidden');
    if (homeView) homeView.classList.add('hidden');
    
    // Set active on both desktop and mobile nav items
    const desktopNav = document.getElementById(`nav-${tab}`);
    const mobileNav = document.getElementById(`nav-${tab}-mobile`);
    if (desktopNav) desktopNav.classList.add('active');
    if (mobileNav) mobileNav.classList.add('active');
    
    document.querySelectorAll('.control-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    // History Slider
    const slider = document.getElementById('history-slider');
    const stageArea = document.querySelector('.stage-area');
    const topControls = document.getElementById('top-session-controls');
    const workspaceContainer = document.getElementById('wardrobe-workspace-container');
    const stageImageContainer = document.getElementById('stage-image-container');
    const stageLabel = document.getElementById('stage-label');

    if(tab === 'stylist') {
        renderWardrobeGrid();
        workspaceContainer.classList.add('hidden');
        stageImageContainer.classList.remove('hidden');
        stageLabel.classList.remove('hidden');
        stageArea.classList.remove('wardrobe-mode');
        if (state.outfitHistory.length > 0) {
            slider.classList.remove('hidden');
            stageArea.classList.add('has-history');
        }
        if (state.currentSessionBaseB64) {
            topControls.classList.remove('hidden');
        }
    } else if (tab === 'wardrobe') {
        renderCategoryTabs();
        renderWardrobePage();
        renderWorkspace(); // Ensure workspace is rendered
        
        // Show workspace, hide stage image
        workspaceContainer.classList.remove('hidden');
        stageImageContainer.classList.add('hidden');
        stageLabel.classList.add('hidden');
        stageArea.classList.add('wardrobe-mode');

        // Set up drag-and-drop for wardrobe items container
        const wardrobeContainer = document.getElementById('wardrobe-items-container');
        if (wardrobeContainer && !wardrobeContainer.hasAttribute('data-drag-setup')) {
            setupDragAndDrop(wardrobeContainer, (files) => {
                if (files.length > 0) {
                    processWardrobeFiles(files);
                }
            });
            wardrobeContainer.setAttribute('data-drag-setup', 'true');
        }
        // Set up drag-and-drop for workspace grid
        const workspaceGrid = document.getElementById('wardrobe-workspace-grid');
        if (workspaceGrid && !workspaceGrid.hasAttribute('data-drag-setup')) {
            setupDragAndDrop(workspaceGrid, () => {});
            workspaceGrid.setAttribute('data-drag-setup', 'true');
        }
        slider.classList.add('hidden');
        stageArea.classList.remove('has-history');
        topControls.classList.add('hidden');
    } else if (tab === 'outfits') {
        renderOutfitsPage();
        workspaceContainer.classList.add('hidden');
        stageImageContainer.classList.remove('hidden');
        stageLabel.classList.remove('hidden');
        stageArea.classList.remove('wardrobe-mode');
        slider.classList.add('hidden');
        stageArea.classList.remove('has-history');
        topControls.classList.add('hidden');
    } else {
        workspaceContainer.classList.add('hidden');
        stageImageContainer.classList.remove('hidden');
        stageLabel.classList.remove('hidden');
        stageArea.classList.remove('wardrobe-mode');
        slider.classList.add('hidden');
        stageArea.classList.remove('has-history');
        topControls.classList.add('hidden');
    }

    if (tab === 'stylist' || tab === 'salon') {
        updateStageImage(tab);
    }
}

function undoGeneration() {
    if (state.sessionHistory.length === 0) return alert("Nothing to undo.");
    
    const previous = state.sessionHistory.pop();
    state.currentSessionBaseB64 = previous.baseB64;
    
    const url = `data:image/png;base64,${state.currentSessionBaseB64}`;
    document.getElementById('stage-image').src = url;
    
    if (state.sessionHistory.length === 0) {
        document.getElementById('top-session-controls').classList.add('hidden');
    }
}

function resetSession() {
    if (!confirm("Start a new outfit session? This will reset the current generation.")) return;
    
    const currentLook = state.savedLooks.find(l => l.id === state.selectedLookId);
    state.currentSessionBaseB64 = null; // Reset to base look reference
    state.sessionHistory = [];
    state.lastUsedWardrobeItems = []; // Clear tracked items
    
    // Hide save button
    const saveBtn = document.getElementById('save-outfit-btn');
    if (saveBtn) {
        saveBtn.style.display = 'none';
    }
    
    document.getElementById('top-session-controls').classList.add('hidden');
    updateStageImage('stylist');
}

function updateStageImage(tab) {
    const stageImg = document.getElementById('stage-image');
    const label = document.getElementById('stage-label');
    
    if (tab === 'salon' && state.previewHeadshotUrl) {
        stageImg.src = state.previewHeadshotUrl;
        label.innerText = "Preview (Unsaved)";
        return;
    }

    const currentLook = state.savedLooks.find(l => l.id === state.selectedLookId);
    if (!currentLook) return;

    if (tab === 'stylist') {
        if (state.currentSessionBaseB64) {
            stageImg.src = `data:image/png;base64,${state.currentSessionBaseB64}`;
            label.innerText = "Current Styling Session";
        } else {
            stageImg.src = currentLook.bodyUrl;
            label.innerText = "Studio Base (Reference)";
        }
    } else {
        stageImg.src = currentLook.headUrl;
        label.innerText = "Salon View (Headshot)";
    }
}

/* ----------------------------------------------------------------
   SALON LOGIC
   ---------------------------------------------------------------- */
async function generateNewHeadshot() {
    if(!state.rawSelfie) return alert("No selfie data found. Restart app.");
    if(!validateModelAccess()) return;

    const h = document.getElementById('salon-hair').value || "Keep original hair";
    const m = document.getElementById('salon-makeup').value || "Natural look";

    showLoading(true, "Refining...", "loading-stage");

    try {
        // Use salonPreviewB64 if it exists for sequential refinement
        const baseB64 = state.salonPreviewB64 || state.rawSelfie;
        const isRefining = !!state.salonPreviewB64;

        const headPrompt = `Professional studio headshot. 
        SUBJECT: The person in Image 0.
        ${isRefining ? `REFINE: Apply these additional changes: ${h}, ${m}` : `CLOTHING: Wearing a simple white ribbed singlet (wife beater). MODIFICATIONS: ${h}, ${m}.`}
        CRITICAL: Maintain the EXACT framing and composition of Image 0.
        Style: Photorealistic, light background.`;

        const headB64 = await callGemini(headPrompt, [baseB64]);
        
        state.salonPreviewB64 = headB64;
        state.previewHeadshotUrl = `data:image/png;base64,${headB64}`;
        
        document.getElementById('stage-image').src = state.previewHeadshotUrl;
        document.getElementById('stage-label').innerText = "Salon Preview (Sequential Refinement)";

    } catch(e) {
        alert(e.message);
    } finally {
        showLoading(false, null, "loading-stage");
    }
}

async function saveCurrentHeadshot() {
    if(!state.salonPreviewB64) return alert("Generate a look first!");
    showLoading(true, "Generating Full Body Asset...");
    try {
        const bodyReference = state.rawBody || state.masterBodyB64 || (state.savedLooks.length > 0 ? state.savedLooks[0].bodyB64 : null);
        
        console.log("saveCurrentHeadshot: bodyReference length =", bodyReference?.length);
        console.log("saveCurrentHeadshot: salonPreviewB64 length =", state.salonPreviewB64?.length);

        if (!bodyReference) {
            alert("Body reference not found. Please restart the app.");
            showLoading(false);
            return;
        }
        const bodyB64 = await runBodyGeneration(state.salonPreviewB64, bodyReference);
        
        // Update master reference with new generated body
        state.masterBodyB64 = bodyB64;
        
        saveNewLook(state.salonPreviewB64, bodyB64);
        alert("Look Saved!");
        state.salonPreviewB64 = null; 
        state.previewHeadshotUrl = null; 
        updateStageImage('salon');
    } catch(e) {
        console.error("saveCurrentHeadshot error:", e);
        alert("Failed to save look: " + e.message);
    } finally {
        showLoading(false);
    }
}

function saveNewLook(headB64, bodyB64) {
    const id = Date.now();
    const look = {
        id: id,
        headB64: headB64,
        headUrl: `data:image/png;base64,${headB64}`,
        bodyB64: bodyB64,
        bodyUrl: `data:image/png;base64,${bodyB64}`
    };
    state.savedLooks.push(look);
    state.selectedLookId = id; 
    
    // Hide landing states now that we have a look
    document.getElementById('stylist-landing').classList.add('hidden');
    document.getElementById('stylist-ui').classList.remove('hidden');
    document.getElementById('salon-landing').classList.add('hidden');
    document.getElementById('salon-ui').classList.remove('hidden');
    
    renderHeadshotGrid();
    debouncedSave();
}

function renderHeadshotGrid() {
    const grid = document.getElementById('headshot-grid');
    grid.innerHTML = '';
    state.savedLooks.forEach(item => {
        const img = document.createElement('img');
        img.src = item.headUrl; 
        img.className = `thumb ${state.selectedLookId === item.id ? 'selected' : ''}`;
        img.onclick = () => {
            state.selectedLookId = item.id;
            renderHeadshotGrid();
            updateStageImage('stylist'); 
        };
        // Double click or double tap for lightbox
        img.ondblclick = (e) => {
            e.stopPropagation();
            openLightbox(item.headUrl);
        };
        grid.appendChild(img);
    });
}

/* ----------------------------------------------------------------
   STYLIST & OUTFIT GENERATION
   ---------------------------------------------------------------- */
async function removeBackground(imageB64) {
    try {
        const response = await fetch('/.netlify/functions/remove-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData: imageB64 })
        });
        
        if (!response.ok) {
            throw new Error('Background removal failed');
        }
        
        const data = await response.json();
        return data.imageData;
    } catch (e) {
        console.error('Background removal error:', e);
        return imageB64; // Return original if removal fails
    }
}

async function autoTagItem(imageB64) {
    try {
        const response = await fetch('/.netlify/functions/auto-tag-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData: imageB64 })
        });
        
        if (!response.ok) {
            throw new Error('Auto-tagging failed');
        }
        
        const data = await response.json();
        return data;
    } catch (e) {
        console.error('Auto-tagging error:', e);
        return {
            category: "All",
            primaryColor: "Unknown",
            style: "casual",
            estimatedSize: null,
            itemType: "clothing item"
        };
    }
}

async function generateProductShot(imageB64) {
    try {
        const prompt = `Transform this clothing item into a professional product photography shot.
REQUIREMENTS:
- Clean white or light grey studio background
- Professional lighting with soft shadows
- Product centered and well-framed
- Maintain EXACT colors, textures, and details from the original
- Style: Ghost mannequin (for 3D items) or flat lay (for accessories)
- High quality, commercial product photography aesthetic
- Remove any background clutter or distractions
- Ensure the item looks professional and ready for e-commerce`;

        // Use cheapest model explicitly
        const productShotB64 = await callGemini(prompt, [imageB64], 'gemini-2.5-flash-image');
        return productShotB64;
    } catch (e) {
        console.error('Product shot generation error:', e);
        // Return original image if generation fails - item will still be created
        // Don't throw, just return original so processing can continue
        return imageB64;
    }
}

async function processWardrobeFiles(files) {
    if (!files || files.length === 0) return;
    
    const filesArray = Array.from(files);
    const successful = [];
    const failed = [];
    const autoRemoveBg = state.preferences?.autoRemoveBackground || false;
    const autoTag = state.preferences?.autoTagItems !== false; // Default to true
    
    // Show loading indicator for batch uploads
    if (filesArray.length > 1) {
        showLoading(true, `Processing ${filesArray.length} items...`);
    }
    
    for (const file of filesArray) {
        try {
            let b64 = await toBase64(file);
            // Resize wardrobe items too
            b64 = await resizeImage(b64, 1024);
            
            let processedB64 = b64;
            let originalB64 = b64;
            
            // Generate product shot using Gemini (always done for all uploads)
            try {
                // Show progress for product shot generation if multiple files
                if (filesArray.length > 1) {
                    const currentIndex = filesArray.indexOf(file) + 1;
                    showLoading(true, `Generating product shot ${currentIndex}/${filesArray.length}...`);
                }
                processedB64 = await generateProductShot(b64);
                // generateProductShot returns original if it fails, so processedB64 is always valid
            } catch (e) {
                console.error(`Product shot generation failed for ${file.name}, using original:`, e);
                // Continue with original image if product shot generation fails
                // Item will still be created with original image
            }
            
            // Optional background removal (if still needed after product shot)
            if (autoRemoveBg) {
                processedB64 = await removeBackground(processedB64);
            }
            
            // Auto-tagging
            let tags = { category: "All", primaryColor: "Unknown", style: "casual", estimatedSize: null, itemType: file.name.split('.')[0] || "New Item" };
            if (autoTag) {
                try {
                    tags = await autoTagItem(processedB64);
                } catch (e) {
                    console.error(`Auto-tagging failed for ${file.name}:`, e);
                    // Continue with default tags - item will still be created
                }
            }
            
            // Extract color data for sorting (non-blocking - runs in background)
            // We'll extract it asynchronously and update later
            const itemId = Date.now() + Math.random();
            let colorData = null;
            
            // Start color extraction in background (non-blocking)
            extractDominantColor(processedB64).then(data => {
                // Update the item's color data after extraction completes
                const item = state.wardrobe.find(i => i.id === itemId);
                if (item) {
                    item.colorData = data;
                    debouncedSave();
                }
            }).catch(e => {
                console.error('Color extraction failed:', e);
            });
            
            state.wardrobe.push({ 
                id: itemId,
                url: `data:image/jpeg;base64,${processedB64}`, 
                b64: processedB64,
                originalB64: originalB64, // Store original for reference
                productShotB64: processedB64, // Store product shot version
                selected: false,
                title: tags.itemType || file.name.split('.')[0] || "New Item",
                size: tags.estimatedSize || "M",
                lastWorn: "Never",
                category: tags.category || "All",
                primaryColor: tags.primaryColor || "Unknown",
                style: tags.style || "casual",
                colorData: colorData, // Will be updated asynchronously
                favourite: false
            });
            successful.push(file.name);
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            failed.push(file.name);
        }
    }
    
    renderWardrobeGrid();
    renderWardrobePage(); // Also update Wardrobe tab view
    updateCostDisplay();
    debouncedSave();
    
    // Hide loading indicator
    if (filesArray.length > 1) {
        showLoading(false);
    }
    
    // Provide user feedback
    if (failed.length > 0) {
        const message = successful.length > 0 
            ? `Successfully uploaded ${successful.length} image(s). Failed to upload ${failed.length} image(s): ${failed.join(', ')}`
            : `Failed to upload ${failed.length} image(s): ${failed.join(', ')}. This may be due to file size limits or memory constraints.`;
        alert(message);
    } else if (successful.length > 0) {
        if (successful.length > 1) {
            console.log(`Successfully uploaded ${successful.length} images`);
        }
        // Note: Product shot generation and auto-tagging errors are logged but don't block upload
        // Items are created even if these features fail
    }
    
    // Show warnings for partial failures (if any occurred during processing)
    // These are tracked per-item but we don't have easy access here without refactoring
    // For now, errors are logged to console
}

async function handleWardrobeUpload(input) {
    if(input.files) {
        await processWardrobeFiles(input.files);
        // Clear input so same file can be uploaded again if needed
        input.value = '';
    }
}

function renderWardrobeGrid() {
    const grid = document.getElementById('wardrobe-grid');
    grid.innerHTML = '';

    // Add Tile
    const addTile = document.createElement('div');
    addTile.className = 'add-thumb';
    addTile.innerHTML = '+<span>Add</span>';
    addTile.onclick = () => document.getElementById('wardrobe-upload').click();
    grid.appendChild(addTile);

    state.wardrobe.forEach(item => {
        const img = document.createElement('img');
        img.src = item.url;
        img.className = `thumb ${item.selected ? 'selected' : ''}`;
        img.onclick = () => {
            item.selected = !item.selected;
            renderWardrobeGrid();
            updateCostDisplay();
        };
        // Double click for lightbox
        img.ondblclick = (e) => {
            e.stopPropagation();
            openLightbox(item.url);
        };
        grid.appendChild(img);
    });
}

async function generateOutfit() {
    const currentLook = state.savedLooks.find(l => l.id === state.selectedLookId);
    if(!currentLook) return alert("No Look selected.");
    if(!validateModelAccess()) return;

    const activeClothes = state.wardrobe.filter(i => i.selected);
    const additionalDesc = document.getElementById('clothing-desc').value;

    const isPro = state.selectedModel === 'gemini-3-pro-image-preview';
    
    // Pro limit check
    if (isPro && activeClothes.length > 7) {
        return alert("Pro model supports up to 7 wardrobe items.");
    }

    // Use current session base if available, otherwise fallback to look body
    const baseB64 = state.currentSessionBaseB64 || currentLook.bodyB64;

    // ACTIVE HEADSHOT: Salon preview takes priority over saved look headshot
    const activeHeadshotB64 = state.salonPreviewB64 || currentLook.headB64;

    // MANNEQUIN WORKFLOW logic
    const threshold = (state.selectedModel === 'gemini-2.5-flash-image' || state.selectedModel === 'standard-plus') ? 2 : Infinity;
    
    if (!isPro && activeClothes.length > threshold) {
        await triggerMannequinWorkflow(activeClothes, additionalDesc);
        return;
    }

    // Normal generation logic...
    await runOutfitGeneration(baseB64, activeClothes, additionalDesc, activeHeadshotB64);
}

async function triggerMannequinWorkflow(activeClothes, additionalDesc) {
    // Track wardrobe items used for saving outfits
    state.lastUsedWardrobeItems = activeClothes.map(c => c.id);
    
    showLoading(true, "Styling...", "loading-stage");
    
    const prompt = `
    Generate a photorealistic image of a fashion outfit on a ghost mannequin.
    INSTRUCTIONS:
    - Combine all provided clothing items into a single cohesive outfit.
    - BACKGROUND: Simple grey studio.
    - STYLE: Ghost mannequin (invisible mannequin).
    - CLOTHING: ${activeClothes.length} items provided.
    - DETAILS: ${additionalDesc || "No additional details"}.
    - ASPECT RATIO: Vertical Portrait.
    `;

    const images = activeClothes.map(c => c.b64);

    try {
        const mannequinB64 = await callGemini(prompt, images);
        state.currentMannequinB64 = mannequinB64;
        
        document.getElementById('mannequin-preview').src = `data:image/jpeg;base64,${mannequinB64}`;
        document.getElementById('mannequin-overlay').classList.remove('hidden');
    } catch (e) {
        const errorMsg = e.message || 'Unknown error occurred';
        alert(`Mannequin generation failed: ${errorMsg}\n\nPlease try again or check your internet connection.`);
        console.error('Mannequin workflow error:', e);
    } finally {
        showLoading(false, null, "loading-stage");
    }
}

function closeMannequinOverlay() {
    document.getElementById('mannequin-overlay').classList.add('hidden');
}

async function approveMannequin() {
    closeMannequinOverlay();
    const currentLook = state.savedLooks.find(l => l.id === state.selectedLookId);
    const baseB64 = state.currentSessionBaseB64 || currentLook.bodyB64;
    
    // ACTIVE HEADSHOT: Salon preview takes priority over saved look headshot
    const activeHeadshotB64 = state.salonPreviewB64 || currentLook.headB64;
    
    // Note: wardrobe items are already tracked in triggerMannequinWorkflow
    // If not set, fallback to current selected items
    if (!state.lastUsedWardrobeItems || state.lastUsedWardrobeItems.length === 0) {
        const activeClothes = state.wardrobe.filter(i => i.selected);
        state.lastUsedWardrobeItems = activeClothes.map(c => c.id);
    }
    
    showLoading(true, "Applying...", "loading-stage");
    
    const prompt = `
    DRESSING THE SUBJECT:
    - IMAGE 0: The body/pose reference (base photo).
    - IMAGE 1: The target outfit (on mannequin).
    - IMAGE 2: The facial identity reference (headshot).
    
    TASK:
    - Transfer the EXACT outfit from Image 1 onto the person in Image 0.
    - Use the face, hair, and head from Image 2.
    - Maintain the body pose and framing from Image 0.
    - Ensure lighting and skin tones match perfectly.
    - Ensure head-to-body proportions are accurate (8-heads-tall rule).
    - OUTPUT: Full Body Vertical Portrait.
    `;

    try {
        const finalB64 = await callGemini(prompt, [baseB64, state.currentMannequinB64, activeHeadshotB64]);
        applyGenerationResult(finalB64);
    } catch (e) {
        const errorMsg = e.message || 'Unknown error occurred';
        alert(`Outfit application failed: ${errorMsg}\n\nPlease try again or check your internet connection.`);
        console.error('Mannequin approval error:', e);
    } finally {
        showLoading(false, null, "loading-stage");
    }
}

async function runOutfitGeneration(baseB64, activeClothes, additionalDesc, headB64) {
    // Deduplication logic: filter out clothes already "in" the base image if needed
    // (For now, we'll keep it simple and just send the active clothes)
    
    // Track wardrobe items used for saving outfits
    state.lastUsedWardrobeItems = activeClothes.map(c => c.id);
    
    let instructionText = "";
    let images = [baseB64, headB64];

    if (activeClothes.length > 0) {
        instructionText = "Dress the subject in the provided clothing images.";
        if (additionalDesc) instructionText += ` Also include these details: ${additionalDesc}.`;
        activeClothes.forEach(c => images.push(c.b64));
    } else if (additionalDesc) {
        instructionText = `Refine the current outfit or generate new details based on: ${additionalDesc}`;
    }

    showLoading(true, "Styling...", "loading-stage");

    const prompt = `Fashion Photography.
    OUTPUT FORMAT: Vertical Portrait (3:4 Aspect Ratio).
    
    SUBJECT REFERENCE:
    - Image 0: Current body state, pose, and framing.
    - Image 1: STRICT Facial Identity reference. Use the face, hair, and head from this image.
    
    CLOTHING INSTRUCTIONS:
    - ${instructionText}
    
    CRITICAL:
    1. Apply the exact facial identity, hair, and head from Image 1 onto the body in Image 0.
    2. Maintain the EXACT pose and framing from Image 0.
    3. Focus ONLY on applying/changing the clothes as requested.
    4. Ensure head-to-body proportions are accurate (8-heads-tall rule). No long necks or large heads.
    5. Background: Pure white infinite studio.
    `;
    
    try {
        const b64 = await callGemini(prompt, images);
        applyGenerationResult(b64);
    } catch(e) {
        const errorMsg = e.message || 'Unknown error occurred';
        alert(`Outfit generation failed: ${errorMsg}\n\nPlease try again or check your internet connection.`);
        console.error('Outfit generation error:', e);
    } finally {
        showLoading(false, null, "loading-stage");
    }
}

function applyGenerationResult(b64) {
    // Save to undo stack before updating
    if (state.currentSessionBaseB64) {
        state.sessionHistory.push({
            baseB64: state.currentSessionBaseB64,
            wardrobeIds: [...state.lastAppliedWardrobeIds]
        });
    }

    state.currentSessionBaseB64 = b64;
    const url = `data:image/png;base64,${b64}`;
    
    document.getElementById('stage-image').src = url;
    document.getElementById('stage-label').innerText = "Generated Outfit";
    document.getElementById('top-session-controls').classList.remove('hidden');
    
    // Show Save Outfit button
    const saveBtn = document.getElementById('save-outfit-btn');
    if (saveBtn) {
        saveBtn.style.display = 'block';
    }
    
    addToHistory(b64);
}

async function saveCurrentOutfit() {
    if (!state.currentSessionBaseB64) {
        alert("No outfit to save. Please generate an outfit first.");
        return;
    }
    
    showLoading(true, "Saving outfit...");
    
    const b64 = state.currentSessionBaseB64;
    const usedItems = state.wardrobe.filter(i => state.lastUsedWardrobeItems.includes(i.id));
    
    // Generate outfit name using Gemini
    let outfitName = "";
    try {
        const itemDetails = usedItems.length > 0 
            ? usedItems.map(i => `${i.title} (${i.category}, ${i.primaryColor || 'various'}, ${i.style || 'casual'})`).join(', ')
            : "Generated outfit";
        
        const namingPrompt = `You are a creative fashion stylist. Generate a short, stylish, and personality-driven name (2-4 words) for a fashion outfit${usedItems.length > 0 ? ` consisting of these items: ${itemDetails}` : ''}.

Consider:
- The color palette and style aesthetic
- The overall vibe (e.g., "Urban Chic", "Minimalist Elegance", "Boho Summer")
- Make it memorable and descriptive
- Avoid generic names like "Outfit 1"

Return ONLY the name, no quotes, no punctuation, no explanation.`;
        
        const nameResult = await callGemini(namingPrompt, [], 'gemini-2.5-flash-image', 'TEXT');
        outfitName = nameResult.trim().replace(/^["']|["']$/g, '');
        if (!outfitName || outfitName.length < 2) {
            throw new Error('Invalid name');
        }
    } catch (e) {
        console.error("Naming failed:", e);
        // Fallback: create descriptive name
        if (usedItems.length > 0) {
            const colors = [...new Set(usedItems.map(i => i.primaryColor).filter(Boolean))];
            const styles = [...new Set(usedItems.map(i => i.style).filter(Boolean))];
            if (colors.length > 0 && styles.length > 0) {
                outfitName = `${colors[0]} ${styles[0]}`;
            } else if (usedItems.length > 0) {
                outfitName = `${usedItems[0].title} Look`;
            } else {
                outfitName = `Outfit ${state.outfits.length + 1}`;
            }
        } else {
            outfitName = `Outfit ${state.outfits.length + 1}`;
        }
    }
    
    const outfitId = Date.now();
    const newOutfit = {
        id: outfitId,
        name: outfitName || `Outfit ${state.outfits.length + 1}`,
        mannequinB64: null,
        mannequinUrl: null,
        humanB64: b64,
        humanUrl: `data:image/png;base64,${b64}`,
        categories: [],
        lookbooks: [],
        items: [...state.lastUsedWardrobeItems],
        timestamp: new Date().toISOString()
    };
    
    state.outfits.unshift(newOutfit);
    debouncedSave();
    
    showLoading(false);
    
    // Hide save button and show success message
    const saveBtn = document.getElementById('save-outfit-btn');
    if (saveBtn) {
        saveBtn.style.display = 'none';
    }
    
    // Optionally switch to outfits tab and open modal
    const shouldView = confirm(`Outfit "${outfitName}" saved successfully!\n\nWould you like to view it on the Outfits page?`);
    if (shouldView) {
        switchTab('outfits');
        setTimeout(() => openOutfitModal(outfitId, true), 100);
    } else {
        // Show success message
        if (saveBtn) {
            const originalText = saveBtn.textContent;
            saveBtn.style.display = 'block';
            saveBtn.textContent = 'Saved!';
            saveBtn.style.background = 'var(--accent-purple)';
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.style.background = '';
                saveBtn.style.display = 'none';
            }, 2000);
        }
    }
}

function addToHistory(b64) {
    const url = `data:image/png;base64,${b64}`;
    state.outfitHistory.unshift({ url, b64 });
    
    const slider = document.getElementById('history-slider');
    const track = document.getElementById('history-track');
    const stageArea = document.querySelector('.stage-area');
    
    slider.classList.remove('hidden');
    stageArea.classList.add('has-history');
    track.innerHTML = '';
    
    state.outfitHistory.forEach((histItem, index) => {
        const container = document.createElement('div');
        container.className = 'history-item-container';
        container.style.position = 'relative';
        
        const img = document.createElement('img');
        img.src = histItem.url;
        img.className = 'history-thumb';
        img.onclick = () => {
            document.getElementById('stage-image').src = histItem.url;
            document.getElementById('stage-label').innerText = "History View";
        };
        img.ondblclick = () => openLightbox(histItem.url);
        
        container.appendChild(img);
        track.appendChild(container);
    });
}

function duplicateCurrentOutfit() {
    if (!state.currentSessionBaseB64) return alert("Nothing to duplicate.");
    
    // We already have state.currentSessionBaseB64, just reset the session history branch
    state.sessionHistory = []; 
    
    document.getElementById('top-session-controls').classList.remove('hidden');
    updateStageImage('stylist');
    alert("Duplicate created! You are now editing a new session based on this outfit.");
}

/* ----------------------------------------------------------------
   API FUNCTION
   ---------------------------------------------------------------- */
async function callGemini(promptText, b64Images, modelOverride = null, responseType = 'IMAGE') {
    let targetModel = modelOverride || state.selectedModel;
    
    // Handle Standard Plus hybrid mapping
    if (targetModel === 'standard-plus' && !modelOverride) {
        targetModel = 'gemini-2.5-flash-image';
    }

    try {
        const response = await fetch('/.netlify/functions/generate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: promptText,
                images: b64Images,
                model: targetModel,
                responseType: responseType
            })
        });

        if (!response.ok) {
            let errorMsg = `Server error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Not JSON
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (responseType === 'TEXT') {
            return data.text;
        }

        if (!data.imageData) {
            throw new Error("No image data returned from server.");
        }

        return data.imageData;
    } catch (error) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error("Network error: Could not connect to the generation service. Check your internet or local server.");
        }
        throw error;
    }
}

/* ----------------------------------------------------------------
   LIGHTBOX FUNCTIONALITY
   ---------------------------------------------------------------- */
function openLightbox(imageSrc) {
    if (!imageSrc || imageSrc === '') return;
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    lightboxImage.src = imageSrc;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

async function downloadLightboxImage() {
    const lightboxImage = document.getElementById('lightbox-image');
    const src = lightboxImage.src;
    
    if (!src || src === "") return alert("No image to download.");
    
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    try {
        // Fetch the image as a blob to ensure proper download on mobile
        const response = await fetch(src);
        const blob = await response.blob();
        
        // For iOS, use Share API if available, otherwise open in new tab
        if (isIOS && navigator.share) {
            const file = new File([blob], `full_stylist_${Date.now()}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Full Stylist Image',
                    text: 'Download image'
                });
                return;
            }
        }
        
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `full_stylist_${Date.now()}.png`;
        link.style.display = 'none';
        
        // For iOS, open in new tab as fallback
        if (isIOS) {
            link.target = '_blank';
            link.rel = 'noopener';
        }
        
        // For iOS and mobile browsers, we need to append to body first
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        }, 100);
    } catch (error) {
        console.error('Download error:', error);
        // Fallback: open image in new tab (works on iOS)
        window.open(src, '_blank');
    }
}

// Close lightbox on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeLightbox();
    }
});

// Model selector event handler
function initModelSelector() {
    const modelSelector = document.getElementById('model-selector');
    const passwordContainer = document.getElementById('model-password-container');
    const passwordInput = document.getElementById('model-password');
    
    if (modelSelector && !modelSelector.hasAttribute('data-listener-attached')) {
        modelSelector.value = state.selectedModel;
        updatePasswordFieldVisibility();
        modelSelector.setAttribute('data-listener-attached', 'true');
        
        modelSelector.addEventListener('change', (e) => {
            state.selectedModel = e.target.value;
            state.modelPassword = ""; // Clear password when switching models
            if (passwordInput) passwordInput.value = "";
            updatePasswordFieldVisibility();
            updateCostDisplay();
            localStorage.setItem('selectedModel', state.selectedModel);
        });
        
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                state.modelPassword = e.target.value;
            });
        }
    }
}

function updatePasswordFieldVisibility() {
    const passwordContainer = document.getElementById('model-password-container');
    const lockedModels = ['gemini-3-pro-image-preview', 'standard-plus'];
    const isLocked = lockedModels.includes(state.selectedModel);
    state.isModelLocked = isLocked;
    
    if (passwordContainer) {
        passwordContainer.style.display = isLocked ? 'block' : 'none';
    }
}

/**
 * Calculates estimated cost based on selected model and number of images.
 * Uses rough approximations for standard Gemini pricing.
 */
function getEstimatedCost(numImages, isBodyShot = false) {
    const pricing = {
        'gemini-3-pro-image-preview': { base: 0.002, perImage: 0.001 },
        'gemini-2.5-flash-image': { base: 0.0001, perImage: 0.00005 }
    };
    
    let model = state.selectedModel;
    if (model === 'standard-plus') {
        model = isBodyShot ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    }
    
    const config = pricing[model] || pricing['gemini-2.5-flash-image'];
    const estimate = config.base + (numImages * config.perImage);
    return estimate.toFixed(4);
}

function updateCostDisplay() {
    const stylistBtn = document.querySelector('#tab-stylist .btn-primary');
    const salonBtn = document.querySelector('#tab-salon .btn-purple');
    
    if (stylistBtn) {
        const activeClothes = state.wardrobe.filter(i => i.selected).length;
        const imagesCount = 1 + activeClothes; // Base image + clothing
        stylistBtn.innerText = `Generate Outfit ($${getEstimatedCost(imagesCount, false)})`;
    }
    
    if (salonBtn) {
        salonBtn.innerText = `Generate New Look ($${getEstimatedCost(1, false)})`;
    }
}

function validateModelAccess() {
    if (state.isModelLocked) {
        if (state.modelPassword !== 'abcxyz') {
            alert('Incorrect password for this model.');
            return false;
        }
    }
    return true;
}

function initDragAndDrop() {
    // Step 1: Selfie upload
    const selfieBox = document.querySelector('#step-1 .upload-box');
    setupDragAndDrop(selfieBox, (files) => {
        if (files.length > 0) {
            processFile(files[0], 'preview-selfie', 'selfieBase64');
        }
    });

    // Step 3: Body upload
    const bodyBox = document.querySelector('#step-3 .upload-box');
    setupDragAndDrop(bodyBox, (files) => {
        if (files.length > 0) {
            processFile(files[0], 'preview-body', 'bodyBase64');
        }
    });

    // Dashboard: Wardrobe upload
    const wardrobeGrid = document.getElementById('wardrobe-grid');
    setupDragAndDrop(wardrobeGrid, (files) => {
        if (files.length > 0) {
            processWardrobeFiles(files);
        }
    });
}

/* ----------------------------------------------------------------
   WARDROBE PAGE LOGIC
   ---------------------------------------------------------------- */
function handleNewItemUpload() {
    document.getElementById('wardrobe-new-item-upload').click();
}

function renderEmptyState(category) {
    return `
        <div class="empty-state">
            <div class="empty-state-icon">👕</div>
            <h3>No ${category} items yet</h3>
            <p>Start building your wardrobe by uploading your first ${category.toLowerCase()} item</p>
            <button class="btn btn-primary" style="width: auto; margin-top: 15px;" onclick="handleNewItemUpload()">Upload Your First ${category}</button>
        </div>
    `;
}

function searchWardrobe(query) {
    state.wardrobeSearchQuery = query.toLowerCase();
    renderWardrobePage();
}

function searchOutfits(query) {
    state.outfitsSearchQuery = query.toLowerCase();
    renderOutfitsPage();
}

function toggleBulkSelectMode() {
    state.bulkSelectMode = !state.bulkSelectMode;
    state.bulkSelectedItems = [];
    const toolbar = document.getElementById('bulk-actions-toolbar');
    const toggleBtn = document.getElementById('toggle-bulk-select');
    
    if (state.bulkSelectMode) {
        toolbar.classList.remove('hidden');
        toggleBtn.textContent = 'Exit Selection';
        toggleBtn.classList.add('active');
    } else {
        toolbar.classList.add('hidden');
        toggleBtn.textContent = 'Select Multiple';
        toggleBtn.classList.remove('active');
    }
    
    renderWardrobePage();
}

function exitBulkSelectMode() {
    state.bulkSelectMode = false;
    state.bulkSelectedItems = [];
    document.getElementById('bulk-actions-toolbar').classList.add('hidden');
    document.getElementById('toggle-bulk-select').textContent = 'Select Multiple';
    document.getElementById('toggle-bulk-select').classList.remove('active');
    renderWardrobePage();
}

function toggleBulkSelection(itemId) {
    const index = state.bulkSelectedItems.indexOf(itemId);
    if (index > -1) {
        state.bulkSelectedItems.splice(index, 1);
    } else {
        state.bulkSelectedItems.push(itemId);
    }
    updateBulkToolbar();
    renderWardrobePage();
}

function updateBulkToolbar() {
    const count = document.getElementById('bulk-selected-count');
    if (count) {
        count.textContent = state.bulkSelectedItems.length;
    }
}

function bulkChangeCategory() {
    if (state.bulkSelectedItems.length === 0) return;
    const categories = ['Tops', 'Bottoms', 'Shoes', 'Accessories', 'Outerwear', 'Dresses', ...state.customCategories];
    const newCat = prompt(`Change category to (${categories.join(', ')}):`);
    if (newCat && categories.includes(newCat)) {
        state.bulkSelectedItems.forEach(id => {
            const item = state.wardrobe.find(i => i.id == id);
            if (item) item.category = newCat;
        });
        debouncedSave();
        exitBulkSelectMode();
    }
}

function bulkChangeGroup() {
    if (state.bulkSelectedItems.length === 0) return;
    const newGroup = prompt(`Move to group (${state.customGroups.join(', ') || 'enter new group name'}):`);
    if (newGroup) {
        if (!state.customGroups.includes(newGroup)) {
            state.customGroups.push(newGroup);
        }
        state.bulkSelectedItems.forEach(id => {
            const item = state.wardrobe.find(i => i.id == id);
            if (item) item.group = newGroup;
        });
        debouncedSave();
        exitBulkSelectMode();
    }
}

function bulkDelete() {
    if (state.bulkSelectedItems.length === 0) return;
    if (!confirm(`Delete ${state.bulkSelectedItems.length} item(s)?`)) return;
    
    state.wardrobe = state.wardrobe.filter(i => !state.bulkSelectedItems.includes(i.id));
    state.selectedWardrobeItems = state.selectedWardrobeItems.filter(id => !state.bulkSelectedItems.includes(id));
    debouncedSave();
    exitBulkSelectMode();
}

function renderWardrobePage() {
    const container = document.getElementById('wardrobe-items-container');
    if (!container) return;
    
    // Ensure category tabs are initialized
    const categoryTabsContainer = document.getElementById('wardrobe-category-tabs');
    if (categoryTabsContainer && categoryTabsContainer.children.length === 0) {
        renderCategoryTabs();
    }
    
    container.innerHTML = '';
    
    // Get all categories (including custom ones)
    const categories = ['All', 'Tops', 'Bottoms', 'Shoes', 'Accessories', 'Outerwear', 'Dresses'];
    const customCategories = [...new Set(state.wardrobe.map(item => item.category).filter(cat => !categories.includes(cat)))];
    const allCategories = [...categories, ...customCategories];
    
    // Filter categories based on selected category
    const categoriesToShow = state.selectedWardrobeCategory === 'All' 
        ? allCategories.filter(c => c !== 'All')
        : [state.selectedWardrobeCategory];

    if (state.wardrobeView === 'grid') {
        // Grid view: single container with all items
        container.className = 'wardrobe-items-grid';
    let filteredItems = state.wardrobe.filter(item => 
        (state.selectedWardrobeCategory === 'All' || item.category === state.selectedWardrobeCategory) &&
        (state.selectedWardrobeGroup === 'All' || item.group === state.selectedWardrobeGroup)
    );
    
    // Apply search filter
    if (state.wardrobeSearchQuery) {
        filteredItems = filteredItems.filter(item => 
            item.title.toLowerCase().includes(state.wardrobeSearchQuery) ||
            item.category.toLowerCase().includes(state.wardrobeSearchQuery) ||
            (item.group && item.group.toLowerCase().includes(state.wardrobeSearchQuery)) ||
            (item.primaryColor && item.primaryColor.toLowerCase().includes(state.wardrobeSearchQuery)) ||
            (item.style && item.style.toLowerCase().includes(state.wardrobeSearchQuery))
        );
    }

            if (filteredItems.length === 0) {
            container.innerHTML = renderEmptyState(state.selectedWardrobeCategory === 'All' ? 'Wardrobe' : state.selectedWardrobeCategory);
            renderWardrobeGroups();
            renderWorkspace();
            return;
        }

        // Add "Add New" tile
        const addTile = document.createElement('div');
        addTile.className = 'add-thumb';
        addTile.innerHTML = '+<span>Add</span>';
        addTile.onclick = handleNewItemUpload;
        container.appendChild(addTile);

        filteredItems.forEach(item => {
            const isSelected = state.selectedWardrobeItems.includes(item.id);
            const isBulkSelected = state.bulkSelectedItems.includes(item.id);
            const card = document.createElement('div');
            card.className = `wardrobe-item-grid-card ${isSelected ? 'selected' : ''} ${isBulkSelected ? 'bulk-selected' : ''}`;
            
            if (state.bulkSelectMode) {
                card.innerHTML = `
                    <div style="position: absolute; top: 5px; right: 5px; z-index: 5;">
                        <input type="checkbox" ${isBulkSelected ? 'checked' : ''} onchange="toggleBulkSelection('${item.id}')" style="width: 20px; height: 20px; cursor: pointer;">
                    </div>
                    <img src="${item.url}" onclick="toggleBulkSelection('${item.id}')" ondblclick="openWardrobeModal('${item.id}')">
                    <div class="item-title" style="font-size: 0.7rem; margin-top: 4px; text-align: center;">${item.title}</div>
                `;
            } else {
                card.innerHTML = `
                    <img src="${item.url}" onclick="openWardrobeModal('${item.id}')" ondblclick="openWardrobeModal('${item.id}')">
                    <div class="item-title" style="font-size: 0.7rem; margin-top: 4px; text-align: center;">${item.title}</div>
                `;
            }
            setupItemDraggingToWorkspace(card, item.id);
            container.appendChild(card);
        });
    } else {
        // Horizontal view: separate slider for each category
        container.className = 'wardrobe-categories-container';
        
        categoriesToShow.forEach(category => {
            let categoryItems = state.wardrobe.filter(item => 
                item.category === category &&
                (state.selectedWardrobeGroup === 'All' || item.group === state.selectedWardrobeGroup)
            );
            
            // Apply search filter
            if (state.wardrobeSearchQuery) {
                categoryItems = categoryItems.filter(item => 
                    item.title.toLowerCase().includes(state.wardrobeSearchQuery) ||
                    item.category.toLowerCase().includes(state.wardrobeSearchQuery) ||
                    (item.group && item.group.toLowerCase().includes(state.wardrobeSearchQuery)) ||
                    (item.primaryColor && item.primaryColor.toLowerCase().includes(state.wardrobeSearchQuery)) ||
                    (item.style && item.style.toLowerCase().includes(state.wardrobeSearchQuery))
                );
            }

            if (categoryItems.length === 0 && state.selectedWardrobeCategory !== 'All') {
                // Show empty state for this category
                const emptySection = document.createElement('div');
                emptySection.className = 'wardrobe-category-section';
                emptySection.innerHTML = `
                    <h4 class="category-header">${category}</h4>
                    ${renderEmptyState(category)}
                `;
                container.appendChild(emptySection);
                return;
            }

            if (categoryItems.length > 0 || state.selectedWardrobeCategory === 'All') {
                const categorySection = document.createElement('div');
                categorySection.className = 'wardrobe-category-section';
                
                const header = document.createElement('h4');
                header.className = 'category-header';
                header.textContent = category;
                categorySection.appendChild(header);

                const slider = document.createElement('div');
                slider.className = 'wardrobe-items-list';

                // Add "Add New" tile as first item
                const addTile = document.createElement('div');
                addTile.className = 'add-thumb';
                addTile.innerHTML = '+<span>Add</span>';
                addTile.onclick = handleNewItemUpload;
                slider.appendChild(addTile);

                categoryItems.forEach(item => {
                    const isSelected = state.selectedWardrobeItems.includes(item.id);
                    const isBulkSelected = state.bulkSelectedItems.includes(item.id);
                    const card = document.createElement('div');
                    card.className = `wardrobe-item-card ${isSelected ? 'selected' : ''} ${isBulkSelected ? 'bulk-selected' : ''}`;
                    
                    if (state.bulkSelectMode) {
                        card.onclick = () => toggleBulkSelection(item.id);
                        card.ondblclick = (e) => { e.stopPropagation(); openWardrobeModal(item.id); };
                        card.innerHTML = `
                            <div style="position: absolute; top: 5px; right: 5px; z-index: 5;">
                                <input type="checkbox" ${isBulkSelected ? 'checked' : ''} onchange="toggleBulkSelection('${item.id}')" style="width: 20px; height: 20px; cursor: pointer;">
                            </div>
                            <img src="${item.url}">
                            <div class="item-info">
                                <div class="item-title">${item.title}</div>
                                <div class="item-meta">Size: ${item.size}</div>
                                <div class="item-meta">Worn: ${item.lastWorn}</div>
                            </div>
                        `;
                    } else {
                        card.onclick = () => openWardrobeModal(item.id);
                        card.ondblclick = (e) => { e.stopPropagation(); openWardrobeModal(item.id); };
                        card.innerHTML = `
                            <img src="${item.url}">
                            <div class="item-info">
                                <div class="item-title">${item.title}</div>
                                <div class="item-meta">Size: ${item.size}</div>
                                <div class="item-meta">Worn: ${item.lastWorn}</div>
                            </div>
                        `;
                    }
                    setupItemDraggingToWorkspace(card, item.id);
                    
                    // Long-press detection for mobile
                    let longPressTimer = null;
                    card.addEventListener('touchstart', (e) => {
                        longPressTimer = setTimeout(() => {
                            if (!state.bulkSelectMode) {
                                toggleBulkSelectMode();
                            }
                            toggleBulkSelection(item.id);
                        }, 500);
                    });
                    card.addEventListener('touchend', () => {
                        clearTimeout(longPressTimer);
                    });
                    card.addEventListener('touchmove', () => {
                        clearTimeout(longPressTimer);
                    });
                    
                    slider.appendChild(card);
                });

                categorySection.appendChild(slider);
                container.appendChild(categorySection);
            }
        });
    }

    renderWardrobeGroups();
    renderWorkspace();
}

function renderWardrobeGroups() {
    const groupContainer = document.getElementById('wardrobe-group-tabs');
    const groups = new Set();
    state.wardrobe.forEach(item => {
        if (item.group) groups.add(item.group);
    });

    // Keep "All Groups" and then add dynamic ones
    groupContainer.innerHTML = `<div class="tab ${state.selectedWardrobeGroup === 'All' ? 'active' : ''}" onclick="filterWardrobeGroup('All')">All Groups</div>`;
    
    groups.forEach(group => {
        const tab = document.createElement('div');
        tab.className = `tab ${state.selectedWardrobeGroup === group ? 'active' : ''}`;
        tab.innerText = group;
        tab.onclick = () => filterWardrobeGroup(group);
        groupContainer.appendChild(tab);
    });
}

function filterWardrobeGroup(group) {
    state.selectedWardrobeGroup = group;
    renderWardrobePage();
}

function openCategoryManager() {
    const modal = document.getElementById('category-manager-modal');
    const body = document.getElementById('category-manager-body');
    
    const defaultCategories = ['Tops', 'Bottoms', 'Shoes', 'Accessories', 'Outerwear', 'Dresses'];
    const allCategories = [...defaultCategories, ...state.customCategories];
    
    body.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3>Default Categories</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
                ${defaultCategories.map(cat => `
                    <div style="padding: 8px 12px; background: var(--surface-light); border-radius: 8px; color: var(--text-muted);">
                        ${cat}
                    </div>
                `).join('')}
            </div>
        </div>
        <div style="margin-bottom: 20px;">
            <h3>Custom Categories</h3>
            <div id="custom-categories-list" style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                ${state.customCategories.length === 0 ? '<p style="color: var(--text-muted); font-size: 0.9rem;">No custom categories yet</p>' : ''}
                ${state.customCategories.map((cat, idx) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--surface-light); border-radius: 8px;">
                        <span>${cat}</span>
                        <button class="btn btn-outline btn-small" onclick="deleteCustomCategory(${idx})">Delete</button>
                    </div>
                `).join('')}
            </div>
        </div>
        <div>
            <label>Add New Category</label>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="new-category-name" placeholder="e.g. Activewear, Formal">
                <button class="btn btn-primary" style="width: auto; margin-top: 0;" onclick="addCustomCategory()">Add</button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeCategoryManager() {
    document.getElementById('category-manager-modal').classList.remove('active');
}

function addCustomCategory() {
    const input = document.getElementById('new-category-name');
    const name = input.value.trim();
    if (!name) return alert("Please enter a category name");
    if (state.customCategories.includes(name)) return alert("Category already exists");
    
    state.customCategories.push(name);
    input.value = '';
    renderCategoryTabs();
    debouncedSave();
    openCategoryManager(); // Refresh the modal
    renderWardrobePage();
}

function deleteCustomCategory(index) {
    const category = state.customCategories[index];
    if (!confirm(`Delete category "${category}"? Items in this category will be moved to "All".`)) return;
    
    // Move items to "All" category
    state.wardrobe.forEach(item => {
        if (item.category === category) {
            item.category = 'All';
        }
    });
    
    state.customCategories.splice(index, 1);
    if (state.selectedWardrobeCategory === category) {
        state.selectedWardrobeCategory = 'All';
    }
    renderCategoryTabs();
    debouncedSave();
    openCategoryManager(); // Refresh the modal
    renderWardrobePage();
}

function openGroupManager() {
    const modal = document.getElementById('group-manager-modal');
    const body = document.getElementById('group-manager-body');
    
    body.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3>Your Groups</h3>
            <div id="custom-groups-list" style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                ${state.customGroups.length === 0 ? '<p style="color: var(--text-muted); font-size: 0.9rem;">No groups yet. Create groups to organize your wardrobe (e.g. Summer, Work, Gym)</p>' : ''}
                ${state.customGroups.map((group, idx) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--surface-light); border-radius: 8px;">
                        <span>${group}</span>
                        <button class="btn btn-outline btn-small" onclick="deleteCustomGroup(${idx})">Delete</button>
                    </div>
                `).join('')}
            </div>
        </div>
        <div>
            <label>Add New Group</label>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="new-group-name" placeholder="e.g. Summer, Work, Gym">
                <button class="btn btn-primary" style="width: auto; margin-top: 0;" onclick="addCustomGroup()">Add</button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeGroupManager() {
    document.getElementById('group-manager-modal').classList.remove('active');
}

function addCustomGroup() {
    const input = document.getElementById('new-group-name');
    const name = input.value.trim();
    if (!name) return alert("Please enter a group name");
    if (state.customGroups.includes(name)) return alert("Group already exists");
    
    state.customGroups.push(name);
    input.value = '';
    debouncedSave();
    openGroupManager(); // Refresh the modal
    renderWardrobePage();
}

function deleteCustomGroup(index) {
    const group = state.customGroups[index];
    if (!confirm(`Delete group "${group}"? Items in this group will be ungrouped.`)) return;
    
    // Remove group from items
    state.wardrobe.forEach(item => {
        if (item.group === group) {
            item.group = null;
        }
    });
    
    state.customGroups.splice(index, 1);
    debouncedSave();
    openGroupManager(); // Refresh the modal
    renderWardrobePage();
}

async function openStyleMe() {
    const modal = document.getElementById('style-me-modal');
    const body = document.getElementById('style-me-body');
    
    // Determine context: selected items or current outfit
    const selectedItems = state.wardrobe.filter(i => state.selectedWardrobeItems.includes(i.id));
    const context = selectedItems.length > 0 ? 'selected' : 'wardrobe';
    
    body.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="spinner" style="margin: 20px auto;"></div>
            <p style="color: var(--text-muted);">Getting style advice...</p>
        </div>
    `;
    
    modal.classList.add('active');
    
    try {
        const advice = await getStyleAdvice(context, selectedItems);
        body.innerHTML = `
            <div style="padding: 20px;">
                <div style="background: var(--surface-light); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; color: var(--primary);">Style Advice</h3>
                    <p style="color: var(--text-main); line-height: 1.6; white-space: pre-wrap;">${advice.advice}</p>
                </div>
                ${advice.suggestedItems && advice.suggestedItems.length > 0 ? `
                    <div>
                        <h4 style="color: var(--text-main); margin-bottom: 15px;">Suggested Items</h4>
                        <div class="grid-3" style="gap: 10px;">
                            ${advice.suggestedItems.map(itemId => {
                                const item = state.wardrobe.find(i => i.id == itemId);
                                if (!item) return '';
                                return `
                                    <div style="cursor: pointer;" onclick="addSuggestedItem('${item.id}')">
                                        <img src="${item.url}" class="thumb">
                                        <div style="font-size: 0.7rem; text-align: center; margin-top: 5px; color: var(--text-muted);">${item.title}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    } catch (e) {
        body.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <p style="color: var(--danger);">Failed to get style advice: ${e.message}</p>
                <button class="btn btn-outline" style="margin-top: 15px; width: auto;" onclick="openStyleMe()">Try Again</button>
            </div>
        `;
    }
}

function closeStyleMe() {
    document.getElementById('style-me-modal').classList.remove('active');
}

function addSuggestedItem(itemId) {
    if (!state.selectedWardrobeItems.includes(itemId)) {
        state.selectedWardrobeItems.push(itemId);
        renderWardrobePage();
        closeStyleMe();
    }
}

async function getStyleAdvice(context, selectedItems) {
    const response = await fetch('/.netlify/functions/style-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            context: context,
            selectedItems: selectedItems.map(i => ({ id: i.id, title: i.title, category: i.category, style: i.style })),
            allWardrobe: state.wardrobe.map(i => ({ id: i.id, title: i.title, category: i.category, style: i.style, primaryColor: i.primaryColor }))
        })
    });
    
    if (!response.ok) {
        throw new Error('Failed to get style advice');
    }
    
    return await response.json();
}

function openWeatherSettings() {
    const modal = document.getElementById('weather-settings-modal');
    const body = document.getElementById('weather-settings-body');
    
    body.innerHTML = `
        <div style="padding: 20px;">
            <div style="margin-bottom: 20px;">
                <label>
                    <input type="checkbox" id="weather-enabled" ${state.preferences.weatherEnabled ? 'checked' : ''} onchange="toggleWeatherEnabled()">
                    Enable weather-based styling suggestions
                </label>
            </div>
            <div style="margin-bottom: 20px;">
                <label>Location (City or Zip Code)</label>
                <input type="text" id="weather-location" placeholder="e.g. London, UK or 10001" value="${state.preferences.weatherLocation || ''}">
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;">Weather API integration coming soon</p>
            </div>
            <button class="btn btn-primary" onclick="saveWeatherSettings()">Save Settings</button>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeWeatherSettings() {
    document.getElementById('weather-settings-modal').classList.remove('active');
}

function toggleWeatherEnabled() {
    state.preferences.weatherEnabled = document.getElementById('weather-enabled').checked;
}

function saveWeatherSettings() {
    const location = document.getElementById('weather-location').value.trim();
    state.preferences.weatherLocation = location || null;
    debouncedSave();
    closeWeatherSettings();
}

// Placeholder functions for weather suggestions (structure only)
function getWeatherSuggestions() {
    // TODO: Integrate weather API (e.g., OpenWeatherMap)
    // This function will fetch weather data and suggest appropriate outfits
    console.log('Weather suggestions - API integration pending');
    return null;
}

function renderWeatherSuggestions() {
    // TODO: Render weather-based outfit suggestions UI
    // This will display suggested outfits based on current weather
    console.log('Weather suggestions UI - structure ready');
}

/* ----------------------------------------------------------------
   WORKSPACE MANAGEMENT
   ---------------------------------------------------------------- */
function renderWorkspace() {
    const workspaceGrid = document.getElementById('wardrobe-workspace-grid');
    const clearBtn = document.getElementById('clear-workspace-btn');
    const generateBtn = document.getElementById('generate-outfit-btn');
    
    if (!workspaceGrid) return;
    
    workspaceGrid.innerHTML = '';
    
    // Set up workspace as drop zone (only once)
    if (!workspaceGrid.hasAttribute('data-drag-setup')) {
        setupDragAndDrop(workspaceGrid, () => {});
        workspaceGrid.setAttribute('data-drag-setup', 'true');
    }
    
    state.workspaceItems.forEach(workspaceItem => {
        const item = state.wardrobe.find(i => i.id == workspaceItem.itemId);
        if (!item) return;
        
        // Use stored width/height or calculate based on category
        const cardWidth = workspaceItem.width || 150; 
        const cardHeight = workspaceItem.height || 180;
        
        const card = document.createElement('div');
        card.className = 'workspace-item';
        card.style.position = 'absolute';
        card.style.left = `${workspaceItem.x}px`;
        card.style.top = `${workspaceItem.y}px`;
        card.style.width = `${cardWidth}px`;
        card.style.height = `${cardHeight}px`;
        card.style.cursor = 'move';
        card.style.zIndex = workspaceItem.zIndex || 10;
        card.dataset.workspaceId = workspaceItem.id;
        
        card.innerHTML = `
            <div class="workspace-item-content">
                <div style="position: absolute; top: 5px; right: 5px; z-index: 50;">
                    <button class="workspace-menu-btn" onclick="event.stopPropagation(); toggleWorkspaceMenu('${workspaceItem.id}')" title="Menu">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="8" cy="4" r="1.5"/>
                            <circle cx="8" cy="8" r="1.5"/>
                            <circle cx="8" cy="12" r="1.5"/>
                        </svg>
                    </button>
                    <div class="workspace-menu-dropdown" id="workspace-menu-${workspaceItem.id}" style="display: none;">
                        <div class="workspace-menu-item" onclick="event.stopPropagation(); removeItemFromWorkspace('${workspaceItem.id}'); closeWorkspaceMenu('${workspaceItem.id}')">
                            <div class="workspace-menu-icon">×</div>
                            <div class="workspace-menu-title">Remove</div>
                        </div>
                        <div class="workspace-menu-separator"></div>
                        <div class="workspace-menu-item" onclick="event.stopPropagation(); bringForward('${workspaceItem.id}'); closeWorkspaceMenu('${workspaceItem.id}')">
                            <div class="workspace-menu-icon">↑</div>
                            <div class="workspace-menu-title">Bring Forward</div>
                        </div>
                        <div class="workspace-menu-separator"></div>
                        <div class="workspace-menu-item" onclick="event.stopPropagation(); sendBackward('${workspaceItem.id}'); closeWorkspaceMenu('${workspaceItem.id}')">
                            <div class="workspace-menu-icon">↓</div>
                            <div class="workspace-menu-title">Send Backward</div>
                        </div>
                    </div>
                </div>

                <!-- Image Container -->
                <div style="width: 100%; height: 100%; overflow: hidden; position: relative;">
                    <img src="${item.url}" style="
                        position: absolute;
                        width: 100%;
                        height: 100%;
                        left: 0;
                        top: 0;
                        display: block;
                        object-fit: cover;
                        pointer-events: none;
                    ">
                </div>

                <!-- Resize Handles (corner only) -->
                <div class="resize-handle tl" data-handle="tl"></div>
                <div class="resize-handle tr" data-handle="tr"></div>
                <div class="resize-handle bl" data-handle="bl"></div>
                <div class="resize-handle br" data-handle="br"></div>
            </div>
        `;
        
        // Setup all interactive actions (drag, resize, crop)
        setupWorkspaceItemActions(card, workspaceItem.id);
        
        workspaceGrid.appendChild(card);
    });
    
    // Show/hide buttons based on workspace items
    if (state.workspaceItems.length > 0) {
        clearBtn.style.display = 'block';
        if (state.workspaceItems.length >= 2) {
            generateBtn.style.display = 'block';
        } else {
            generateBtn.style.display = 'none';
        }
    } else {
        clearBtn.style.display = 'none';
        generateBtn.style.display = 'none';
    }
}

function setupWorkspaceItemActions(element, workspaceId) {
    let activeAction = null; // 'drag', 'resize', 'crop'
    let activeHandle = null;
    let startX, startY;
    let initialX, initialY, initialWidth, initialHeight;
    let initialCrop = { top: 0, right: 0, bottom: 0, left: 0 };

    function handleStart(clientX, clientY, target) {
        if (target.tagName === 'BUTTON') return;

        startX = clientX;
        startY = clientY;

        const workspaceItem = state.workspaceItems.find(wi => wi.id == workspaceId);
        if (!workspaceItem) return;

        initialX = workspaceItem.x;
        initialY = workspaceItem.y;
        initialWidth = workspaceItem.width || element.offsetWidth;
        initialHeight = workspaceItem.height || element.offsetHeight;
        
        // Calculate initial aspect ratio for proportional resizing
        const aspectRatio = initialWidth / initialHeight;

        if (target.classList.contains('resize-handle')) {
            activeAction = 'resize';
            activeHandle = target.dataset.handle;
            // Store aspect ratio for this resize operation
            workspaceItem._resizeAspectRatio = aspectRatio;
        } else {
            activeAction = 'drag';
            element.style.cursor = 'grabbing';
        }
    }

    function handleMove(clientX, clientY) {
        if (!activeAction) return;

        const dx = clientX - startX;
        const dy = clientY - startY;
        const workspaceItem = state.workspaceItems.find(wi => wi.id == workspaceId);
        if (!workspaceItem) return;

        if (activeAction === 'drag') {
            workspaceItem.x = initialX + dx;
            workspaceItem.y = initialY + dy;
        } else if (activeAction === 'resize') {
            // Resize with locked aspect ratio - only corner handles
            const aspectRatio = workspaceItem._resizeAspectRatio || (initialWidth / initialHeight);
            
            let newWidth, newHeight, newX, newY;
            
            // Calculate new dimensions based on which corner is being dragged
            if (activeHandle === 'br') {
                // Bottom-right: use dx and dy, maintain aspect ratio
                const scaleX = (initialWidth + dx) / initialWidth;
                const scaleY = (initialHeight + dy) / initialHeight;
                const scale = Math.max(scaleX, scaleY); // Use larger scale to maintain aspect ratio
                newWidth = Math.max(50, initialWidth * scale);
                newHeight = Math.max(50, initialHeight * scale);
                newX = initialX;
                newY = initialY;
            } else if (activeHandle === 'bl') {
                // Bottom-left: use -dx and dy
                const scaleX = (initialWidth - dx) / initialWidth;
                const scaleY = (initialHeight + dy) / initialHeight;
                const scale = Math.max(scaleX, scaleY);
                newWidth = Math.max(50, initialWidth * scale);
                newHeight = Math.max(50, initialHeight * scale);
                newX = initialX + (initialWidth - newWidth);
                newY = initialY;
            } else if (activeHandle === 'tr') {
                // Top-right: use dx and -dy
                const scaleX = (initialWidth + dx) / initialWidth;
                const scaleY = (initialHeight - dy) / initialHeight;
                const scale = Math.max(scaleX, scaleY);
                newWidth = Math.max(50, initialWidth * scale);
                newHeight = Math.max(50, initialHeight * scale);
                newX = initialX;
                newY = initialY + (initialHeight - newHeight);
            } else if (activeHandle === 'tl') {
                // Top-left: use -dx and -dy
                const scaleX = (initialWidth - dx) / initialWidth;
                const scaleY = (initialHeight - dy) / initialHeight;
                const scale = Math.max(scaleX, scaleY);
                newWidth = Math.max(50, initialWidth * scale);
                newHeight = Math.max(50, initialHeight * scale);
                newX = initialX + (initialWidth - newWidth);
                newY = initialY + (initialHeight - newHeight);
            } else {
                // Fallback for any unexpected handle
                return;
            }
            
            workspaceItem.width = newWidth;
            workspaceItem.height = newHeight;
            workspaceItem.x = newX;
            workspaceItem.y = newY;
        }

        renderWorkspace();
    }

    function handleEnd() {
        if (activeAction) {
            activeAction = null;
            activeHandle = null;
            element.style.cursor = 'move';
            debouncedSave();
        }
    }

    element.addEventListener('mousedown', (e) => {
        handleStart(e.clientX, e.clientY, e.target);
        e.preventDefault();
        e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        handleMove(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', handleEnd);

    // Touch support
    element.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY, e.target);
        e.preventDefault();
        e.stopPropagation();
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (!activeAction) return;
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', handleEnd);
}

function bringForward(workspaceId) {
    const item = state.workspaceItems.find(wi => wi.id == workspaceId);
    if (!item) return;
    item.zIndex = (item.zIndex || 10) + 1;
    renderWorkspace();
    debouncedSave();
}

function sendBackward(workspaceId) {
    const item = state.workspaceItems.find(wi => wi.id == workspaceId);
    if (!item) return;
    item.zIndex = Math.max(1, (item.zIndex || 10) - 1);
    renderWorkspace();
    debouncedSave();
}

function addItemToWorkspace(itemId, x = null, y = null) {
    // Check if item already exists in workspace
    if (state.workspaceItems.some(wi => wi.itemId == itemId)) {
        return; // Don't add duplicates
    }
    
    const workspaceGrid = document.getElementById('wardrobe-workspace-grid');
    if (!workspaceGrid) return;
    
    const rect = workspaceGrid.getBoundingClientRect();
    
    // Size mapping by category for default positioning
    const item = state.wardrobe.find(i => i.id == itemId);
    const sizeMap = {
        'Tops': 0.35,
        'Bottoms': 0.32,
        'Shoes': 0.18,
        'Accessories': 0.15
    };
    const widthFactor = item ? (sizeMap[item.category] || 0.20) : 0.20;
    const itemWidth = rect.width * widthFactor;
    const itemHeight = itemWidth * 1.2; // Initial proportional height
    
    const defaultX = x !== null ? x : Math.random() * (rect.width - itemWidth);
    const defaultY = y !== null ? y : Math.random() * (rect.height - itemHeight);
    
    const workspaceItem = {
        id: Date.now() + Math.random(),
        itemId: itemId,
        x: Math.max(0, Math.min(defaultX, rect.width - itemWidth)),
        y: Math.max(0, Math.min(defaultY, rect.height - itemHeight)),
        width: itemWidth,
        height: itemHeight,
        zIndex: 10
    };
    
    state.workspaceItems.push(workspaceItem);
    renderWorkspace();
    debouncedSave();
}

function removeItemFromWorkspace(workspaceId) {
    const index = state.workspaceItems.findIndex(wi => wi.id == workspaceId);
    if (index > -1) {
        state.workspaceItems.splice(index, 1);
        renderWorkspace();
        debouncedSave();
    }
}

function toggleWorkspaceMenu(workspaceId) {
    // Close all other menus first
    document.querySelectorAll('.workspace-menu-dropdown').forEach(menu => {
        if (menu.id !== `workspace-menu-${workspaceId}`) {
            menu.style.display = 'none';
        }
    });
    
    // Toggle the clicked menu
    const menu = document.getElementById(`workspace-menu-${workspaceId}`);
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

function closeWorkspaceMenu(workspaceId) {
    const menu = document.getElementById(`workspace-menu-${workspaceId}`);
    if (menu) {
        menu.style.display = 'none';
    }
}

// Close dropdown menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.workspace-menu-btn') && !e.target.closest('.workspace-menu-dropdown')) {
        document.querySelectorAll('.workspace-menu-dropdown').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});

function updateItemPosition(workspaceId, x, y) {
    const workspaceItem = state.workspaceItems.find(wi => wi.id == workspaceId);
    if (!workspaceItem) return;
    
    const workspaceGrid = document.getElementById('wardrobe-workspace-grid');
    if (!workspaceGrid) return;
    
    const rect = workspaceGrid.getBoundingClientRect();
    const itemWidth = workspaceItem.width || 150;
    const itemHeight = workspaceItem.height || 180;
    
    workspaceItem.x = Math.max(0, Math.min(x, rect.width - itemWidth));
    workspaceItem.y = Math.max(0, Math.min(y, rect.height - itemHeight));
    
    renderWorkspace();
    debouncedSave();
}

function clearWorkspace() {
    if (state.workspaceItems.length === 0) return;
    if (!confirm(`Clear all ${state.workspaceItems.length} items from workspace?`)) return;
    
    state.workspaceItems = [];
    renderWorkspace();
    debouncedSave();
}

function toggleWardrobeSelection(id) {
    const index = state.selectedWardrobeItems.indexOf(id);
    if (index > -1) {
        state.selectedWardrobeItems.splice(index, 1);
    } else {
        state.selectedWardrobeItems.push(id);
        // Smooth scroll to selection area when item is added
        setTimeout(() => {
            const selectionArea = document.getElementById('wardrobe-selection-area');
            if (selectionArea && !selectionArea.classList.contains('hidden')) {
                selectionArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    }
    renderWardrobePage();
}

function clearWardrobeSelection() {
    state.selectedWardrobeItems = [];
    renderWardrobePage();
}

function setWardrobeView(view) {
    state.wardrobeView = view;
    document.getElementById('toggle-list-view').classList.toggle('active', view === 'list');
    document.getElementById('toggle-grid-view').classList.toggle('active', view === 'grid');
    debouncedSave();
    renderWardrobePage();
}

function renderCategoryTabs() {
    const container = document.getElementById('wardrobe-category-tabs');
    const defaultCategories = ['All', 'Tops', 'Bottoms', 'Shoes', 'Accessories'];
    const allCategories = [...defaultCategories, ...state.customCategories];
    
    container.innerHTML = '';
    allCategories.forEach(cat => {
        const tab = document.createElement('div');
        tab.className = `tab ${state.selectedWardrobeCategory === cat ? 'active' : ''}`;
        tab.textContent = cat;
        tab.onclick = () => filterWardrobe(cat);
        container.appendChild(tab);
    });
}

function filterWardrobe(category) {
    state.selectedWardrobeCategory = category;
    renderCategoryTabs();
    renderWardrobePage();
}

async function generateMannequinOutfit() {
    // Get items from workspace instead of selectedWardrobeItems
    // Use string conversion to avoid type mismatch between string IDs from drag-drop and number IDs in state
    const workspaceItemIds = state.workspaceItems.map(wi => String(wi.itemId));
    const selectedItems = state.wardrobe.filter(i => workspaceItemIds.includes(String(i.id)));
    if (selectedItems.length < 2) {
        alert("Please add at least 2 items to the workspace to generate an outfit.");
        return;
    }

    showLoading(true, "Generating Mannequin Outfit...", "loading-stage");
    
    const prompt = `
    Generate a photorealistic image of a fashion outfit on a ghost mannequin.
    INSTRUCTIONS:
    - Combine these ${selectedItems.length} clothing items into a single cohesive outfit.
    - BACKGROUND: Simple grey studio.
    - STYLE: Ghost mannequin (invisible mannequin).
    - ASPECT RATIO: Vertical Portrait (3:4).
    `;

    const images = selectedItems.map(c => c.b64);

    try {
        // Use cheapest model explicitly
        const b64 = await callGemini(prompt, images, 'gemini-2.5-flash-image');
        
        // Generate an appropriate name for the outfit
        const itemDetails = selectedItems.map(i => `${i.title} (${i.category}, ${i.primaryColor || 'various'}, ${i.style || 'casual'})`).join(', ');
        const namingPrompt = `You are a creative fashion stylist. Generate a short, stylish, and personality-driven name (2-4 words) for a fashion outfit consisting of these items: ${itemDetails}.

Consider:
- The color palette and style aesthetic
- The overall vibe (e.g., "Urban Chic", "Minimalist Elegance", "Boho Summer")
- Make it memorable and descriptive
- Avoid generic names like "Outfit 1"

Return ONLY the name, no quotes, no punctuation, no explanation.`;
        let outfitName = "";
        try {
            const nameResult = await callGemini(namingPrompt, [], 'gemini-2.5-flash-image', 'TEXT');
            outfitName = nameResult.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
            if (!outfitName || outfitName.length < 2) {
                throw new Error('Invalid name');
            }
        } catch (e) {
            console.error("Naming failed:", e);
            // Fallback: create descriptive name from items
            const colors = [...new Set(selectedItems.map(i => i.primaryColor).filter(Boolean))];
            const styles = [...new Set(selectedItems.map(i => i.style).filter(Boolean))];
            if (colors.length > 0 && styles.length > 0) {
                outfitName = `${colors[0]} ${styles[0]}`;
            } else if (selectedItems.length > 0) {
                outfitName = `${selectedItems[0].title} Look`;
            } else {
                outfitName = `Outfit ${state.outfits.length + 1}`;
            }
        }

        const outfitId = Date.now();
        const newOutfit = {
            id: outfitId,
            name: outfitName || `Outfit ${state.outfits.length + 1}`,
            mannequinB64: b64,
            mannequinUrl: `data:image/png;base64,${b64}`,
            humanB64: null,
            humanUrl: null,
            categories: [],
            lookbooks: [],
            items: selectedItems.map(i => i.id), // Use IDs from the filtered wardrobe items (numbers)
            timestamp: new Date().toISOString()
        };
        
        state.outfits.unshift(newOutfit);
        // Clear workspace after successful generation (optional - user can keep items for further editing)
        // Uncomment the next line if you want to clear workspace automatically:
        // clearWorkspace();
        debouncedSave();
        
        // Show next steps directions before switching tabs
        const directions = "Your mannequin is ready! Review the outfit in your collection, or click 'Style Me' to see it on yourself.";
        alert(`Success! ${directions}`);
        
        switchTab('outfits');
        openOutfitModal(outfitId, true); // true indicates newly created
        
        logInteraction('generate_mannequin', { outfitId });
    } catch (e) {
        const errorMsg = e.message || 'Unknown error occurred';
        alert(`Outfit generation failed: ${errorMsg}\n\nPlease try again or check your internet connection.`);
        console.error('Mannequin generation error:', e);
    } finally {
        showLoading(false, null, "loading-stage");
    }
}

function openWardrobeModal(id) {
    const item = state.wardrobe.find(i => i.id == id);
    if (!item) return;
    
    const modal = document.getElementById('wardrobe-modal');
    const body = document.getElementById('wardrobe-modal-body');
    const isSelected = state.selectedWardrobeItems.includes(item.id);
    
    body.innerHTML = `
        <img src="${item.url}">
        <div class="item-details" style="width: 100%; text-align: left;">
            <h2 style="margin-top: 0; display: flex; justify-content: space-between; align-items: center;">
                ${item.title}
                <span onclick="toggleFavourite('${item.id}')" style="cursor: pointer; color: var(--primary);">${item.favourite ? '★' : '☆'}</span>
            </h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <div><strong>Size:</strong> ${item.size}</div>
                <div><strong>Category:</strong> ${item.category}</div>
                <div><strong>Worn:</strong> ${item.lastWorn}</div>
                <div><strong>Group:</strong> ${item.group || 'None'}</div>
            </div>
        </div>
        <div class="modal-actions">
            <button class="btn ${isSelected ? 'btn-outline' : 'btn-primary'}" onclick="toggleWardrobeSelection('${item.id}'); openWardrobeModal('${item.id}')">
                ${isSelected ? 'Remove from Outfit' : 'Add to Outfit'}
            </button>
            <button class="btn btn-outline" onclick="changeItemCategory('${item.id}')">Change Category</button>
            <button class="btn btn-outline" onclick="changeItemGroup('${item.id}')">Change Group</button>
            <button class="btn btn-outline" onclick="editItem('${item.id}')">Edit Title</button>
            <button class="btn btn-outline" style="color: var(--danger); border-color: var(--danger); grid-column: span 2;" onclick="deleteItem('${item.id}')">Delete Item</button>
        </div>
    `;
    
    modal.classList.add('active');
}

function changeItemCategory(id) {
    const item = state.wardrobe.find(i => i.id == id);
    if (!item) return;
    const categories = ['Tops', 'Bottoms', 'Shoes', 'Accessories', 'Outerwear', 'Dresses', ...state.customCategories];
    const newCat = prompt(`Enter new category (${categories.join(', ')}):`, item.category);
    if (newCat) {
        item.category = newCat;
        debouncedSave();
        openWardrobeModal(id);
        renderWardrobePage();
    }
}

function changeItemGroup(id) {
    const item = state.wardrobe.find(i => i.id == id);
    if (!item) return;
    const newGroup = prompt("Enter new group name (e.g. Summer, Work, Gym):", item.group || "");
    if (newGroup !== null) {
        item.group = newGroup;
        if (newGroup && !state.customGroups.includes(newGroup)) {
            state.customGroups.push(newGroup);
        }
        debouncedSave();
        openWardrobeModal(id);
        renderWardrobePage();
    }
}

function closeWardrobeModal() {
    document.getElementById('wardrobe-modal').classList.remove('active');
}

function toggleFavourite(id) {
    const item = state.wardrobe.find(i => i.id == id);
    if (item) {
        item.favourite = !item.favourite;
        debouncedSave();
        openWardrobeModal(id);
    }
}

/* ----------------------------------------------------------------
   OUTFITS PAGE LOGIC
   ---------------------------------------------------------------- */
function renderOutfitsPage() {
    const grid = document.getElementById('all-outfits-grid');
    const recentSlider = document.getElementById('recent-outfits-slider');
    
    grid.innerHTML = '';
    recentSlider.innerHTML = '';
    
    // Recent Outfits (last 10) - only show if not searching
    if (!state.outfitsSearchQuery) {
        state.outfits.slice(0, 10).forEach(outfit => {
            const img = document.createElement('img');
            img.src = outfit.humanUrl || outfit.mannequinUrl;
            img.className = 'history-thumb';
            img.onclick = () => openOutfitModal(outfit.id);
            recentSlider.appendChild(img);
        });
    }
    
    let filteredOutfits = state.outfits.filter(o => 
        state.selectedOutfitCategory === 'All' || o.categories.includes(state.selectedOutfitCategory)
    );
    
    // Apply search filter
    if (state.outfitsSearchQuery) {
        filteredOutfits = filteredOutfits.filter(o => 
            o.name.toLowerCase().includes(state.outfitsSearchQuery) ||
            o.categories.some(cat => cat.toLowerCase().includes(state.outfitsSearchQuery)) ||
            o.lookbooks.some(lb => lb.toLowerCase().includes(state.outfitsSearchQuery))
        );
    }

    // All Outfits (filtered)
    filteredOutfits.forEach(outfit => {
        const card = document.createElement('div');
        card.className = 'outfit-card';
        card.onclick = () => openOutfitModal(outfit.id);
        card.innerHTML = `<img src="${outfit.humanUrl || outfit.mannequinUrl}">`;
        grid.appendChild(card);
    });

    renderOutfitCategories();
}

function renderOutfitCategories() {
    const container = document.getElementById('outfit-categories');
    const categories = new Set();
    state.outfits.forEach(o => {
        o.categories.forEach(c => categories.add(c));
    });

    container.innerHTML = `<div class="tab ${state.selectedOutfitCategory === 'All' ? 'active' : ''}" onclick="filterOutfits('All')">All</div>`;
    
    categories.forEach(cat => {
        const tab = document.createElement('div');
        tab.className = `tab ${state.selectedOutfitCategory === cat ? 'active' : ''}`;
        tab.innerText = cat;
        tab.onclick = () => filterOutfits(cat);
        container.appendChild(tab);
    });
}

function filterOutfits(category) {
    state.selectedOutfitCategory = category;
    renderOutfitsPage();
}

function setOutfitSubTab(tab) {
    state.outfitSubTab = tab;
    document.querySelectorAll('.outfit-tabs .tab').forEach(t => {
        const tabText = t.innerText.toLowerCase();
        t.classList.toggle('active', 
            (tab === 'all' && tabText.includes('all')) ||
            (tab === 'lookbooks' && tabText.includes('lookbook')) ||
            (tab === 'calendar' && tabText.includes('calendar'))
        );
    });
    document.getElementById('outfit-all-content').classList.toggle('hidden', tab !== 'all');
    document.getElementById('outfit-lookbooks-content').classList.toggle('hidden', tab !== 'lookbooks');
    document.getElementById('outfit-calendar-content').classList.toggle('hidden', tab !== 'calendar');
    
    if (tab === 'lookbooks') {
        renderLookbooksPage();
    } else if (tab === 'calendar') {
        renderOutfitCalendar();
    }
}

function renderOutfitCalendar() {
    const calendar = document.getElementById('outfit-calendar');
    const monthYear = document.getElementById('calendar-month-year');
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    monthYear.textContent = `${monthNames[state.calendarMonth]} ${state.calendarYear}`;
    
    const firstDay = new Date(state.calendarYear, state.calendarMonth, 1).getDay();
    const daysInMonth = new Date(state.calendarYear, state.calendarMonth + 1, 0).getDate();
    
    // Get outfits worn this month
    const monthOutfits = state.outfits.filter(o => {
        if (!o.lastWorn) return false;
        const wornDate = new Date(o.lastWorn);
        return wornDate.getMonth() === state.calendarMonth && wornDate.getFullYear() === state.calendarYear;
    });
    
    // Group by date
    const outfitsByDate = {};
    monthOutfits.forEach(o => {
        const date = new Date(o.lastWorn).getDate();
        if (!outfitsByDate[date]) outfitsByDate[date] = [];
        outfitsByDate[date].push(o);
    });
    
    calendar.innerHTML = `
        <div class="calendar-grid">
            <div class="calendar-day-header">Sun</div>
            <div class="calendar-day-header">Mon</div>
            <div class="calendar-day-header">Tue</div>
            <div class="calendar-day-header">Wed</div>
            <div class="calendar-day-header">Thu</div>
            <div class="calendar-day-header">Fri</div>
            <div class="calendar-day-header">Sat</div>
            ${Array(firstDay).fill(0).map(() => '<div class="calendar-day empty"></div>').join('')}
            ${Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dayOutfits = outfitsByDate[day] || [];
                return `
                    <div class="calendar-day ${dayOutfits.length > 0 ? 'has-outfit' : ''}" onclick="${dayOutfits.length > 0 ? `viewDayOutfits(${day})` : ''}">
                        <div class="calendar-day-number">${day}</div>
                        ${dayOutfits.length > 0 ? `
                            <div class="calendar-outfit-preview">
                                <img src="${dayOutfits[0].humanUrl || dayOutfits[0].mannequinUrl}">
                                ${dayOutfits.length > 1 ? `<span class="calendar-more">+${dayOutfits.length - 1}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function navigateCalendarMonth(direction) {
    state.calendarMonth += direction;
    if (state.calendarMonth < 0) {
        state.calendarMonth = 11;
        state.calendarYear--;
    } else if (state.calendarMonth > 11) {
        state.calendarMonth = 0;
        state.calendarYear++;
    }
    renderOutfitCalendar();
}

function viewDayOutfits(day) {
    const monthOutfits = state.outfits.filter(o => {
        if (!o.lastWorn) return false;
        const wornDate = new Date(o.lastWorn);
        return wornDate.getDate() === day && wornDate.getMonth() === state.calendarMonth && wornDate.getFullYear() === state.calendarYear;
    });
    
    if (monthOutfits.length === 0) return;
    
    if (monthOutfits.length === 1) {
        openOutfitModal(monthOutfits[0].id);
    } else {
        // Show multiple outfits
        const modal = document.getElementById('outfit-modal');
        const body = document.getElementById('outfit-modal-body');
        const slider = document.getElementById('outfit-modal-slider');
        
        body.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
                <h2 style="color: white; margin-bottom: 20px;">Outfits Worn on ${day}/${state.calendarMonth + 1}/${state.calendarYear}</h2>
                <div class="grid-2" style="width: 100%; max-width: 600px; gap: 15px;">
                    ${monthOutfits.map(outfit => `
                        <div class="outfit-card" onclick="closeOutfitModal(); openOutfitModal(${outfit.id})">
                            <img src="${outfit.humanUrl || outfit.mannequinUrl}">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        slider.innerHTML = '';
        monthOutfits.forEach(o => {
            const img = document.createElement('img');
            img.src = o.humanUrl || o.mannequinUrl;
            img.className = 'history-thumb';
            img.onclick = () => { closeOutfitModal(); openOutfitModal(o.id); };
            slider.appendChild(img);
        });
        
        modal.classList.add('active');
    }
}

function renderLookbooksPage() {
    const grid = document.getElementById('lookbooks-grid');
    grid.innerHTML = '';
    
    if (state.lookbooks.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);"><p>No lookbooks yet. Create your first lookbook to organize your outfits!</p></div>';
        return;
    }
    
    state.lookbooks.forEach(lookbook => {
        const card = document.createElement('div');
        card.className = 'lookbook-card';
        card.onclick = () => viewLookbook(lookbook.id);
        
        const outfitCount = state.outfits.filter(o => o.lookbooks.includes(lookbook.name)).length;
        const coverOutfit = state.outfits.find(o => o.lookbooks.includes(lookbook.name) && (lookbook.coverImageUrl || o.humanUrl || o.mannequinUrl));
        
        card.innerHTML = `
            <div class="lookbook-cover">
                ${coverOutfit ? `<img src="${lookbook.coverImageUrl || coverOutfit.humanUrl || coverOutfit.mannequinUrl}">` : '<div class="lookbook-placeholder">No cover</div>'}
            </div>
            <div class="lookbook-info">
                <h4>${lookbook.name}</h4>
                <p>${outfitCount} outfit${outfitCount !== 1 ? 's' : ''}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

function createNewLookbook() {
    const name = prompt("Enter lookbook name:");
    if (!name || !name.trim()) return;
    
    const lookbook = {
        id: Date.now(),
        name: name.trim(),
        coverImageUrl: null,
        outfitIds: [],
        created_at: new Date().toISOString()
    };
    
    state.lookbooks.push(lookbook);
    debouncedSave();
    renderLookbooksPage();
}

function viewLookbook(lookbookId) {
    const lookbook = state.lookbooks.find(lb => lb.id === lookbookId);
    if (!lookbook) return;
    
    const outfits = state.outfits.filter(o => o.lookbooks.includes(lookbook.name));
    
    // Show outfits in a modal or navigate to filtered view
    const modal = document.getElementById('outfit-modal');
    const body = document.getElementById('outfit-modal-body');
    const slider = document.getElementById('outfit-modal-slider');
    
    if (outfits.length === 0) {
        body.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px;">
                <h2 style="color: white; margin-bottom: 10px;">${lookbook.name}</h2>
                <p style="color: var(--text-muted);">This lookbook is empty</p>
                <button class="btn btn-primary" style="margin-top: 20px; width: auto;" onclick="closeOutfitModal(); setOutfitSubTab('all');">Browse All Outfits</button>
            </div>
        `;
        slider.innerHTML = '';
    } else {
        body.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
                <h2 style="color: white; margin-bottom: 20px;">${lookbook.name}</h2>
                <div class="grid-2" style="width: 100%; max-width: 600px; gap: 15px;">
                    ${outfits.map(outfit => `
                        <div class="outfit-card" onclick="closeOutfitModal(); openOutfitModal(${outfit.id})">
                            <img src="${outfit.humanUrl || outfit.mannequinUrl}">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        slider.innerHTML = '';
        outfits.forEach(o => {
            const img = document.createElement('img');
            img.src = o.humanUrl || o.mannequinUrl;
            img.className = 'history-thumb';
            img.onclick = () => { closeOutfitModal(); openOutfitModal(o.id); };
            slider.appendChild(img);
        });
    }
    
    modal.classList.add('active');
}

function renderOutfitItemBreakdown(outfit) {
    if (!outfit.items || outfit.items.length === 0) {
        return '<div style="color: var(--text-muted); font-size: 0.9rem;">No items recorded</div>';
    }
    
    const items = outfit.items.map(itemId => state.wardrobe.find(i => i.id == itemId)).filter(Boolean);
    const categoryCounts = {};
    items.forEach(item => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });
    
    return `
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);">
            <h4 style="margin: 0 0 15px 0; color: var(--text-main);">Items Used (${items.length})</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px;">
                ${Object.entries(categoryCounts).map(([cat, count]) => 
                    `<span style="padding: 4px 10px; background: var(--surface-light); border-radius: 12px; font-size: 0.8rem;">${cat}: ${count}</span>`
                ).join('')}
            </div>
            <div class="grid-4" style="gap: 10px;">
                ${items.map(item => `
                    <div style="cursor: pointer;" onclick="navigateToWardrobeItem('${item.id}')">
                        <img src="${item.url}" class="thumb" style="margin-bottom: 5px;">
                        <div style="font-size: 0.7rem; text-align: center; color: var(--text-muted);">${item.title}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function navigateToWardrobeItem(itemId) {
    closeOutfitModal();
    switchTab('wardrobe');
    setTimeout(() => {
        openWardrobeModal(itemId);
    }, 300);
}

function openOutfitModal(id, isNew = false) {
    const outfit = state.outfits.find(o => o.id == id);
    if (!outfit) return;
    
    const modal = document.getElementById('outfit-modal');
    const body = document.getElementById('outfit-modal-body');
    const slider = document.getElementById('outfit-modal-slider');
    
    const itemBreakdown = renderOutfitItemBreakdown(outfit);
    
    body.innerHTML = `
        <div style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; padding: 20px; overflow-y: auto;">
            <div style="position: absolute; top: 20px; left: 80px; z-index: 10; color: white;">
                <h3 style="margin: 0;">${outfit.name}</h3>
                <div style="font-size: 0.8rem; color: #888;">${outfit.categories.join(', ') || 'No categories'}</div>
            </div>
            <img src="${outfit.humanUrl || outfit.mannequinUrl}" style="max-height: 60vh; max-width: 100%; object-fit: contain; margin-bottom: 20px;">
            
            <div style="width: 100%; max-width: 600px; background: rgba(0,0,0,0.5); padding: 20px; border-radius: 12px; margin-bottom: 80px;">
                ${itemBreakdown}
            </div>
            
            ${isNew ? `
                <div style="position: fixed; top: 80px; right: 20px; z-index: 10; display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn btn-primary" style="width: auto; padding: 10px 20px;" onclick="closeOutfitModal(); switchTab('outfits');">View on Outfits Page</button>
                    <button class="btn btn-outline" style="width: auto; padding: 10px 20px;" onclick="closeOutfitModal(); switchTab('wardrobe');">Back to Wardrobe</button>
                </div>
            ` : ''}
            
            <div class="outfit-actions" style="position: fixed; bottom: 20px; display: flex; gap: 10px; z-index: 10;">
                ${!outfit.humanUrl ? `<button class="btn btn-primary" style="width: auto; padding: 10px 30px;" onclick="wearOutfit('${outfit.id}')">Wear It</button>` : ''}
                <button class="btn btn-outline" style="width: auto; padding: 10px 20px;" onclick="manageOutfitCategories('${outfit.id}')">Categories</button>
                <button class="btn btn-outline" style="width: auto; padding: 10px 20px;" onclick="addToLookbook('${outfit.id}')">Lookbook</button>
                <button class="btn btn-outline" style="width: auto; padding: 10px 20px;" onclick="setAsLookbookCover('${outfit.id}')">Set as Cover</button>
            </div>
        </div>
    `;
    
    // Modal slider (prev/next)
    slider.innerHTML = '';
    state.outfits.forEach(o => {
        const img = document.createElement('img');
        img.src = o.humanUrl || o.mannequinUrl;
        img.className = `history-thumb ${o.id == id ? 'selected' : ''}`;
        img.onclick = () => openOutfitModal(o.id);
        slider.appendChild(img);
    });
    
    modal.classList.add('active');
}

function manageOutfitCategories(id) {
    const outfit = state.outfits.find(o => o.id == id);
    if (!outfit) return;
    const cats = prompt("Enter categories (comma separated):", outfit.categories.join(', '));
    if (cats !== null) {
        outfit.categories = cats.split(',').map(s => s.trim()).filter(s => s !== '');
        debouncedSave();
        openOutfitModal(id);
        renderOutfitsPage();
    }
}

function setAsLookbookCover(outfitId) {
    const outfit = state.outfits.find(o => o.id == outfitId);
    if (!outfit) return;
    
    if (outfit.lookbooks.length === 0) {
        alert("Add this outfit to a lookbook first, then set it as the cover.");
        return;
    }
    
    if (outfit.lookbooks.length === 1) {
        const lookbook = state.lookbooks.find(lb => lb.name === outfit.lookbooks[0]);
        if (lookbook) {
            lookbook.coverImageUrl = outfit.humanUrl || outfit.mannequinUrl;
            debouncedSave();
            alert(`Set as cover for "${lookbook.name}"`);
            openOutfitModal(outfitId);
        }
    } else {
        const lookbookName = prompt(`Set as cover for which lookbook?\n${outfit.lookbooks.join('\n')}`);
        if (lookbookName && outfit.lookbooks.includes(lookbookName)) {
            const lookbook = state.lookbooks.find(lb => lb.name === lookbookName);
            if (lookbook) {
                lookbook.coverImageUrl = outfit.humanUrl || outfit.mannequinUrl;
                debouncedSave();
                alert(`Set as cover for "${lookbookName}"`);
                openOutfitModal(outfitId);
            }
        }
    }
}

function addToLookbook(id) {
    const outfit = state.outfits.find(o => o.id == id);
    if (!outfit) return;
    
    if (state.lookbooks.length === 0) {
        const name = prompt("Create a new lookbook:");
        if (!name || !name.trim()) return;
        
        const lookbook = {
            id: Date.now(),
            name: name.trim(),
            coverImageUrl: null,
            outfitIds: [],
            created_at: new Date().toISOString()
        };
        state.lookbooks.push(lookbook);
        outfit.lookbooks.push(name.trim());
        alert(`Created and added to lookbook: ${name.trim()}`);
        openOutfitModal(id);
        return;
    }
    
    // Show selection UI
    const options = state.lookbooks.map(lb => lb.name).join('\n');
    const selected = prompt(`Select or create lookbook:\n\nExisting:\n${options}\n\nEnter name to create new or select existing:`);
    if (!selected || !selected.trim()) return;
    
    const trimmed = selected.trim();
    const existingLookbook = state.lookbooks.find(lb => lb.name === trimmed);
    
    if (existingLookbook) {
        if (!outfit.lookbooks.includes(trimmed)) {
            outfit.lookbooks.push(trimmed);
            alert(`Added to lookbook: ${trimmed}`);
        } else {
            alert(`Already in lookbook: ${trimmed}`);
        }
    } else {
        // Create new lookbook
        const lookbook = {
            id: Date.now(),
            name: trimmed,
            coverImageUrl: null,
            outfitIds: [],
            created_at: new Date().toISOString()
        };
        state.lookbooks.push(lookbook);
        outfit.lookbooks.push(trimmed);
        alert(`Created and added to lookbook: ${trimmed}`);
    }
    
    debouncedSave();
    openOutfitModal(id);
}

function closeOutfitModal() {
    document.getElementById('outfit-modal').classList.remove('active');
}

async function wearOutfit(outfitId) {
    const outfit = state.outfits.find(o => o.id == outfitId);
    if (!outfit) return;

    if (state.savedLooks.length === 0) {
        alert("Please create your first look (headshot & body) before wearing outfits.");
        closeOutfitModal();
        startOnboarding();
        return;
    }

    // Prompt for headshot selection if multiple exist
    let selectedLook = state.savedLooks[0];
    if (state.savedLooks.length > 1) {
        // Carousel selection UI
        const body = document.getElementById('outfit-modal-body');
        let currentIndex = 0;
        
        const renderCarousel = () => {
            const look = state.savedLooks[currentIndex];
            body.innerHTML = `
                <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; position: relative;">
                    <h3 style="color: white; margin-bottom: 30px; text-align: center;">Select a Look</h3>
                    <div class="headshot-carousel-container">
                        <button class="carousel-nav carousel-prev" onclick="navigateCarousel(-1)" ${currentIndex === 0 ? 'disabled' : ''}>‹</button>
                        <div class="headshot-carousel-card">
                            <img src="${look.headUrl}" class="headshot-carousel-image">
                            <div class="headshot-carousel-info">
                                <p style="margin: 10px 0 0 0; color: var(--text-muted); font-size: 0.9rem;">Look ${currentIndex + 1} of ${state.savedLooks.length}</p>
                            </div>
                        </div>
                        <button class="carousel-nav carousel-next" onclick="navigateCarousel(1)" ${currentIndex === state.savedLooks.length - 1 ? 'disabled' : ''}>›</button>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 30px;">
                        <button class="btn btn-primary" style="width: auto; padding: 10px 30px;" onclick="generateWearResult('${outfitId}', '${state.savedLooks[currentIndex].id}')">Use This Look</button>
                        <button class="btn btn-outline" style="width: auto; padding: 10px 20px;" onclick="openOutfitModal('${outfitId}')">Cancel</button>
                    </div>
                    <div class="carousel-dots" style="display: flex; gap: 8px; margin-top: 20px;">
                        ${state.savedLooks.map((_, idx) => `
                            <div class="carousel-dot ${idx === currentIndex ? 'active' : ''}" onclick="jumpToCarousel(${idx})"></div>
                        `).join('')}
                    </div>
                </div>
            `;
        };
        
        window.navigateCarousel = (direction) => {
            currentIndex += direction;
            if (currentIndex < 0) currentIndex = 0;
            if (currentIndex >= state.savedLooks.length) currentIndex = state.savedLooks.length - 1;
            renderCarousel();
        };
        
        window.jumpToCarousel = (index) => {
            currentIndex = index;
            renderCarousel();
        };
        
        // Swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;
        
        body.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { once: true });
        
        body.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { once: true });
        
        function handleSwipe() {
            if (touchEndX < touchStartX - 50) navigateCarousel(1);
            if (touchEndX > touchStartX + 50) navigateCarousel(-1);
        }
        
        renderCarousel();
        return;
    }

    generateWearResult(outfitId, selectedLook.id);
}

async function generateWearResult(outfitId, lookId) {
    const outfit = state.outfits.find(o => o.id == outfitId);
    const look = state.savedLooks.find(l => l.id == lookId);
    if (!outfit || !look) return;

    const headB64 = look.headB64;
    const bodyReference = look.bodyB64;
    
    showLoading(true, "Generating you wearing this outfit...");
    
    const prompt = `
    DRESSING THE SUBJECT:
    - IMAGE 0: The body/pose reference (base photo).
    - IMAGE 1: The target outfit (on mannequin).
    - IMAGE 2: The facial identity reference (headshot).
    
    TASK:
    - Transfer the EXACT outfit from Image 1 onto the person in Image 0.
    - Use the face, hair, and head from Image 2.
    - Maintain the body pose and framing from Image 0.
    - Ensure lighting and skin tones match perfectly.
    - Output: Full Body Vertical Portrait.
    `;

    try {
        const b64 = await callGemini(prompt, [bodyReference, outfit.mannequinB64, headB64]);
        outfit.humanB64 = b64;
        outfit.humanUrl = `data:image/png;base64,${b64}`;
        outfit.lastWorn = new Date().toISOString(); // Track when worn
        
        // Open on Stylist page
        state.currentSessionBaseB64 = b64;
        debouncedSave();
        closeOutfitModal();
        switchTab('stylist');
        
        logInteraction('wear_outfit', { outfitId });
    } catch (e) {
        const errorMsg = e.message || 'Unknown error occurred';
        alert(`Failed to generate outfit on you: ${errorMsg}\n\nPlease try again or check your internet connection.`);
        console.error('Wear outfit error:', e);
    } finally {
        showLoading(false);
    }
}

function editItem(id) {
    const item = state.wardrobe.find(i => i.id == id);
    if (!item) return;
    const newTitle = prompt("Enter new title", item.title);
    if (newTitle) {
        item.title = newTitle;
        debouncedSave();
        openWardrobeModal(id);
        renderWardrobePage();
    }
}

function deleteItem(id) {
    if (!confirm("Are you sure you want to delete this item?")) return;
    state.wardrobe = state.wardrobe.filter(i => i.id != id);
    state.selectedWardrobeItems = state.selectedWardrobeItems.filter(sid => sid != id);
    debouncedSave();
    closeWardrobeModal();
    renderWardrobePage();
}

// Initialize on DOM ready or immediately if already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initModelSelector();
        initDragAndDrop();
    });
} else {
    initModelSelector();
    initDragAndDrop();
}

/* ============================================
   HOME PAGE FUNCTIONS
   ============================================ */

// Home page state
let currentHomeDate = new Date(2026, 1, 20); // February 20, 2026
let calendarDropdownOpen = false;
let calendarDropdownMonth = new Date(2026, 1, 20).getMonth();
let calendarDropdownYear = new Date(2026, 1, 20).getFullYear();

// Outfits by date for home view (date string format: 'YYYY-MM-DD')
const homeOutfitsByDate = {
    '2026-02-20': [
        {
            id: 'outfit-1',
            image: '/full_stylist_1767152682692.png',
            itemCount: 5,
            title: 'Outfit 1'
        },
        {
            id: 'outfit-2',
            image: '/full_stylist_1767152682692.png',
            itemCount: 3,
            title: 'Outfit 2'
        }
    ]
};

// Helper function to format date as YYYY-MM-DD
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to format date as "17 Jan 2026"
function formatShortDate(date) {
    const day = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

// Get outfits for a specific date
function getOutfitsForDate(date) {
    const dateKey = formatDateKey(date);
    return homeOutfitsByDate[dateKey] || [];
}

// Date navigation
function navigateDate(direction) {
    currentHomeDate.setDate(currentHomeDate.getDate() + direction);
    updateDateDisplay();
    renderDayCards();
    // Scroll will be handled by renderDayCards which centers the new current date
}

// Update date display
function updateDateDisplay() {
    const day = currentHomeDate.getDate();
    const month = currentHomeDate.getMonth() + 1;
    const year = currentHomeDate.getFullYear();
    const dateString = `${day}/${month}/${year}`;
    
    const datePicker = document.querySelector('.home-date-picker span');
    if (datePicker) {
        datePicker.textContent = dateString;
    }
    
    // Heading is now static "Planner" - no longer updates
}

// Open date picker
function openDatePicker() {
    const dropdown = document.getElementById('calendar-dropdown');
    if (!dropdown) return;
    
    if (calendarDropdownOpen) {
        closeCalendarDropdown();
    } else {
        calendarDropdownOpen = true;
        dropdown.classList.remove('hidden');
        calendarDropdownMonth = currentHomeDate.getMonth();
        calendarDropdownYear = currentHomeDate.getFullYear();
        renderCalendarDropdown();
    }
}

// Close calendar dropdown
function closeCalendarDropdown() {
    const dropdown = document.getElementById('calendar-dropdown');
    if (dropdown) {
        dropdown.classList.add('hidden');
        calendarDropdownOpen = false;
    }
}

// Navigate calendar month in dropdown
function navigateCalendarMonth(direction) {
    calendarDropdownMonth += direction;
    if (calendarDropdownMonth < 0) {
        calendarDropdownMonth = 11;
        calendarDropdownYear--;
    } else if (calendarDropdownMonth > 11) {
        calendarDropdownMonth = 0;
        calendarDropdownYear++;
    }
    renderCalendarDropdown();
}

// Render calendar dropdown
function renderCalendarDropdown() {
    const grid = document.getElementById('calendar-dropdown-grid');
    const monthYear = document.getElementById('calendar-dropdown-month-year');
    if (!grid || !monthYear) return;
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    monthYear.textContent = `${monthNames[calendarDropdownMonth]} ${calendarDropdownYear}`;
    
    const firstDay = new Date(calendarDropdownYear, calendarDropdownMonth, 1).getDay();
    const daysInMonth = new Date(calendarDropdownYear, calendarDropdownMonth + 1, 0).getDate();
    const today = new Date();
    const selectedDate = currentHomeDate;
    
    let html = `
        <div class="calendar-dropdown-day-header">Sun</div>
        <div class="calendar-dropdown-day-header">Mon</div>
        <div class="calendar-dropdown-day-header">Tue</div>
        <div class="calendar-dropdown-day-header">Wed</div>
        <div class="calendar-dropdown-day-header">Thu</div>
        <div class="calendar-dropdown-day-header">Fri</div>
        <div class="calendar-dropdown-day-header">Sat</div>
    `;
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-dropdown-day other-month"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(calendarDropdownYear, calendarDropdownMonth, day);
        const isToday = date.toDateString() === today.toDateString();
        const isSelected = date.toDateString() === selectedDate.toDateString();
        
        let classes = 'calendar-dropdown-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        
        html += `<div class="${classes}" onclick="selectCalendarDate(${day})">${day}</div>`;
    }
    
    // Empty cells for days after month ends
    const remainingCells = 42 - (firstDay + daysInMonth);
    for (let i = 0; i < remainingCells; i++) {
        html += '<div class="calendar-dropdown-day other-month"></div>';
    }
    
    grid.innerHTML = html;
}

// Select date from calendar dropdown
function selectCalendarDate(day) {
    currentHomeDate = new Date(calendarDropdownYear, calendarDropdownMonth, day);
    updateDateDisplay();
    renderDayCards(); // This will center the selected date
    closeCalendarDropdown();
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('calendar-dropdown');
    const picker = document.querySelector('.home-date-picker');
    
    if (calendarDropdownOpen && dropdown && !dropdown.contains(event.target) && 
        picker && !picker.contains(event.target)) {
        closeCalendarDropdown();
    }
});

// Toggle dashboard menu (placeholder)
function toggleDashboardMenu() {
    const btn = document.querySelector('.unified-header .nav-icon-btn:first-child');
    if (btn) {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }
    // TODO: Implement menu drawer
    console.log('Dashboard menu toggled');
}

// Toggle home menu (placeholder)
function toggleHomeMenu() {
    const btn = document.querySelector('.home-top-nav .nav-icon-btn:first-child');
    if (btn) {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }
    // TODO: Implement menu drawer
    console.log('Menu toggled');
}

// Open notifications (placeholder)
function openNotifications() {
    // Works for both unified header and home top nav
    const btn = document.querySelector('.unified-header .nav-icon-btn:nth-child(3), .home-top-nav .nav-icon-btn:nth-child(2)');
    if (btn) {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }
    // TODO: Implement notifications
    console.log('Notifications opened');
}

// Open search (placeholder)
function openSearch() {
    // Works for both unified header and home top nav
    const btn = document.querySelector('.unified-header .nav-icon-btn:nth-child(2), .home-top-nav .nav-icon-btn:nth-child(3)');
    if (btn) {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }
    // TODO: Implement search
    console.log('Search opened');
}

// Ask AI (placeholder)
function askAI() {
    const btn = document.querySelector('.home-ask-ai-btn');
    if (btn) {
        btn.style.transform = 'scale(0.98)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }
    // TODO: Connect to AI functionality
    console.log('Ask AI clicked');
}

// Open outfit menu (placeholder)
function openOutfitMenu() {
    const btn = document.querySelector('.home-menu-btn');
    if (btn) {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }
    // TODO: Implement outfit menu dropdown
    console.log('Outfit menu opened');
}

// Expand outfit (placeholder)
function expandOutfit() {
    const btn = document.querySelector('.home-expand-btn');
    if (btn) {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }
    // TODO: Implement fullscreen/expand view
    console.log('Expand outfit clicked');
}

// Share outfit (placeholder)
function shareOutfit() {
    const btn = document.querySelector('.home-share-btn');
    if (btn) {
        btn.style.transform = 'scale(0.98)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }
    // TODO: Implement share functionality
    console.log('Share outfit clicked');
}

// Create new (placeholder)
function createNew() {
    const btn = document.querySelector('.home-new-btn');
    if (btn) {
        btn.style.transform = 'scale(0.98)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }
    // TODO: Connect to outfit creation flow
    console.log('Create new clicked');
}

// Switch home tab (placeholder)
function switchHomeTab(tab) {
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.home-nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked item
    const clickedItem = event.target.closest('.home-nav-item');
    if (clickedItem) {
        clickedItem.classList.add('active');
    }
    
    // Visual feedback
    if (clickedItem) {
        clickedItem.style.transform = 'scale(0.95)';
        setTimeout(() => {
            clickedItem.style.transform = '';
        }, 150);
    }
    
    // TODO: Implement tab switching logic
    console.log('Switched to tab:', tab);
}

// Store base date for calculating offsets
let baseRenderDate = null;

// Render day cards
function renderDayCards() {
    const container = document.getElementById('home-days-container');
    if (!container) return;
    
    // Store the base date (the center card's date)
    baseRenderDate = new Date(currentHomeDate);
    
    // Remove existing scroll listener if any
    container.removeEventListener('scroll', handleDayCardScroll);
    
    container.innerHTML = '';
    
    // Show 7 days: 3 before, current, 3 after
    for (let i = -3; i <= 3; i++) {
        const date = new Date(baseRenderDate);
        date.setDate(date.getDate() + i);
        const dayCard = renderDayCard(date);
        dayCard.dataset.dateOffset = i; // Store offset for scroll detection
        container.appendChild(dayCard);
    }
    
    // Scroll to current day card (index 3, which is offset 0)
    setTimeout(() => {
        const cards = container.querySelectorAll('.home-outfit-card');
        if (cards.length > 3) {
            cards[3].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, 100);
    
    // Add scroll listener to update heading/date
    container.addEventListener('scroll', handleDayCardScroll);
    // Also check on initial load
    setTimeout(() => handleDayCardScroll(), 200);
}

// Debounce for scroll handler
let scrollTimeout = null;

// Handle scroll to update heading and date
function handleDayCardScroll() {
    // Clear existing timeout
    if (scrollTimeout) {
        clearTimeout(scrollTimeout);
    }
    
    // Debounce scroll events
    scrollTimeout = setTimeout(() => {
        const container = document.getElementById('home-days-container');
        if (!container || !baseRenderDate) return;
        
        const cards = container.querySelectorAll('.home-outfit-card');
        if (cards.length === 0) return;
        
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;
        
        // Find the card closest to center
        let closestCard = null;
        let closestDistance = Infinity;
        
        cards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            const cardCenter = cardRect.left + cardRect.width / 2;
            const distance = Math.abs(cardCenter - containerCenter);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestCard = card;
            }
        });
        
        if (closestCard) {
            const offset = parseInt(closestCard.dataset.dateOffset || '0');
            // Calculate the actual date from the base render date
            const newDate = new Date(baseRenderDate);
            newDate.setDate(newDate.getDate() + offset);
            
            // Only update if date actually changed
            if (newDate.toDateString() !== currentHomeDate.toDateString()) {
                currentHomeDate = newDate;
                updateDateDisplay();
            }
        }
    }, 100); // 100ms debounce
}

// Render individual day card
function renderDayCard(date) {
    const card = document.createElement('div');
    card.className = 'home-outfit-card';
    
    const outfits = getOutfitsForDate(date);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    // Get day name and formatted date
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];
    const shortDate = formatShortDate(date);
    
    if (outfits.length > 0) {
        // Day with outfits - show carousel
        const carouselId = `carousel-${formatDateKey(date)}`;
        const dateKey = formatDateKey(date);
        
        // Build carousel HTML (nested inside home-outfit-image-container)
        let carouselHTML = `
            <div class="outfit-carousel" id="${carouselId}" data-date-key="${dateKey}">
                <div class="outfit-carousel-track">
        `;
        
        outfits.forEach((outfit, index) => {
            carouselHTML += `
                <div class="outfit-carousel-slide" data-index="${index}">
                    <img src="${outfit.image}" alt="${outfit.title}" class="home-outfit-image">
                </div>
            `;
        });
        
        carouselHTML += `
                </div>
                <div class="carousel-dots">
        `;
        
        outfits.forEach((_, index) => {
            carouselHTML += `<div class="carousel-dot ${index === 0 ? 'active' : ''}" onclick="goToCarouselSlide('${carouselId}', ${index})"></div>`;
        });
        
        carouselHTML += `
                </div>
                <button class="carousel-nav-btn prev" onclick="navigateCarousel('${carouselId}', -1)">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <button class="carousel-nav-btn next" onclick="navigateCarousel('${carouselId}', 1)">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            </div>
        `;
        
        card.innerHTML = `
            <div class="home-outfit-header">
                <div class="home-day-title-section">
                    <h3 class="home-day-title">${dayName}</h3>
                    <p class="home-day-date">${shortDate}</p>
                </div>
                <div class="home-outfit-actions">
                    <button class="home-menu-btn" onclick="openOutfitMenu()" aria-label="Menu">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="home-outfit-image-container">
                ${carouselHTML}
                <button class="home-expand-btn" onclick="expandOutfit()" aria-label="Expand">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                    </svg>
                </button>
            </div>
            <div class="home-outfit-meta-row">
                <h4 class="home-outfit-meta-title" data-date-key="${dateKey}">Outfit 1/${outfits.length}</h4>
                <p class="home-outfit-meta-count" data-date-key="${dateKey}">${outfits[0].itemCount} Items</p>
            </div>
            <div class="home-outfit-metrics">
                <div class="home-metric">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M7 10v12"></path>
                        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-3.33 8A2 2 0 0 1 16.67 22H7"></path>
                        <path d="M11 10V5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v5"></path>
                    </svg>
                    <span>5 Likes</span>
                </div>
                <div class="home-metric">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>3 Comments</span>
                </div>
                <button class="home-metric home-share-action" onclick="shareOutfit()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    <span>Share</span>
                </button>
            </div>
        `;
        
        // Initialize carousel
        initOutfitCarousel(carouselId);
        updateCarouselNavButtons(carouselId);
    } else {
        // Empty day state
        card.innerHTML = `
            <div class="home-outfit-header">
                <div class="home-day-title-section">
                    <h3 class="home-day-title">${dayName}</h3>
                    <p class="home-day-date">${shortDate}</p>
                </div>
            </div>
            <div class="empty-day-state">
                <div class="empty-day-state-icon">👗</div>
                <h3>No outfit scheduled</h3>
                <p>Search for an existing outfit or create a new one</p>
                <div class="empty-day-search">
                    <input type="text" placeholder="Search outfits..." id="empty-day-search-${formatDateKey(date)}" onkeyup="searchOutfitsForDay(event, '${formatDateKey(date)}')">
                </div>
                <button class="empty-day-create-btn" onclick="createNewOutfitForDay('${formatDateKey(date)}')">Create New Outfit</button>
            </div>
        `;
    }
    
    return card;
}

// Initialize outfit carousel
function initOutfitCarousel(carouselId) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    const track = carousel.querySelector('.outfit-carousel-track');
    const slides = carousel.querySelectorAll('.outfit-carousel-slide');
    let currentIndex = 0;
    
    // Store current index on carousel element
    carousel.dataset.currentIndex = '0';
    
    // Add touch/swipe support
    let startX = 0;
    let isDragging = false;
    
    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
    });
    
    track.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
    });
    
    track.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;
        
        if (Math.abs(diff) > 50) {
            if (diff > 0 && currentIndex < slides.length - 1) {
                goToCarouselSlide(carouselId, currentIndex + 1);
            } else if (diff < 0 && currentIndex > 0) {
                goToCarouselSlide(carouselId, currentIndex - 1);
            }
        }
    });
}

// Navigate carousel
function navigateCarousel(carouselId, direction) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    const currentIndex = parseInt(carousel.dataset.currentIndex || '0');
    const slides = carousel.querySelectorAll('.outfit-carousel-slide');
    const newIndex = currentIndex + direction;
    
    if (newIndex >= 0 && newIndex < slides.length) {
        goToCarouselSlide(carouselId, newIndex);
    }
}

// Initialize carousel navigation buttons on first render
function updateCarouselNavButtons(carouselId) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    const currentIndex = parseInt(carousel.dataset.currentIndex || '0');
    const slides = carousel.querySelectorAll('.outfit-carousel-slide');
    const prevBtn = carousel.querySelector('.carousel-nav-btn.prev');
    const nextBtn = carousel.querySelector('.carousel-nav-btn.next');
    
    if (prevBtn) prevBtn.style.display = currentIndex === 0 ? 'none' : 'flex';
    if (nextBtn) nextBtn.style.display = currentIndex === slides.length - 1 ? 'none' : 'flex';
}

// Go to specific carousel slide
function goToCarouselSlide(carouselId, index) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    const track = carousel.querySelector('.outfit-carousel-track');
    const slides = carousel.querySelectorAll('.outfit-carousel-slide');
    const dots = carousel.querySelectorAll('.carousel-dot');
    const dayCard = carousel.closest('.home-outfit-card');
    const metaTitle = dayCard ? dayCard.querySelector('.home-outfit-meta-title') : null;
    const metaCount = dayCard ? dayCard.querySelector('.home-outfit-meta-count') : null;
    
    if (index < 0 || index >= slides.length) return;
    
    carousel.dataset.currentIndex = index.toString();
    track.style.transform = `translateX(-${index * 100}%)`;
    
    // Update dots
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
    
    // Update meta row - get date from carousel data attribute
    const dateKey = carousel.dataset.dateKey;
    if (dateKey && metaTitle && metaCount) {
        // Parse date from dateKey (YYYY-MM-DD)
        const [year, month, day] = dateKey.split('-').map(Number);
        const cardDate = new Date(year, month - 1, day);
        const outfits = getOutfitsForDate(cardDate);
        if (outfits[index]) {
            metaTitle.textContent = `Outfit ${index + 1}/${outfits.length}`;
            metaCount.textContent = `${outfits[index].itemCount} Items`;
        }
    }
    
    // Update nav buttons visibility
    const prevBtn = carousel.querySelector('.carousel-nav-btn.prev');
    const nextBtn = carousel.querySelector('.carousel-nav-btn.next');
    if (prevBtn) prevBtn.style.display = index === 0 ? 'none' : 'flex';
    if (nextBtn) nextBtn.style.display = index === slides.length - 1 ? 'none' : 'flex';
}

// Helper to find date from day card
function findDateFromCard(dayCard) {
    if (!dayCard) return null;
    const container = document.getElementById('home-days-container');
    if (!container) return null;
    
    const cards = Array.from(container.querySelectorAll('.home-outfit-card'));
    const index = cards.indexOf(dayCard);
    if (index === -1) return null;
    
    // Calculate date: index - 3 (since we show 3 before, current, 3 after)
    const date = new Date(currentHomeDate);
    date.setDate(date.getDate() + (index - 3));
    return date;
}

// Search outfits for empty day
function searchOutfitsForDay(event, dateKey) {
    if (event.key === 'Enter') {
        const searchTerm = event.target.value.toLowerCase();
        // TODO: Implement search functionality
        console.log('Searching for:', searchTerm, 'on date:', dateKey);
    }
}

// Create new outfit for day
function createNewOutfitForDay(dateKey) {
    // TODO: Connect to outfit creation flow
    console.log('Create new outfit for date:', dateKey);
    // For now, switch to stylist tab
    if (typeof switchTab === 'function') {
        switchTab('stylist');
    }
}

// Initialize home view when it's shown
function initHomeView() {
    updateDateDisplay();
    renderDayCards();
}

// Initialize home view on page load if it's visible
document.addEventListener('DOMContentLoaded', () => {
    const homeView = document.getElementById('home-view');
    if (homeView && !homeView.classList.contains('hidden')) {
        setTimeout(() => {
            initHomeView();
        }, 100);
    }
});
