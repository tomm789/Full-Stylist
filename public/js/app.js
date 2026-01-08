/* ----------------------------------------------------------------
   STATE MANAGEMENT
   ---------------------------------------------------------------- */
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
}; 

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
        }
    }, false);
}

/**
 * Resizes a base64 image string if it exceeds maxDimension.
 * Returns a base64 string (without prefix).
 */
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
    enterDashboard();
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
    document.getElementById('onboarding-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    
    // Initialize model selector
    initModelSelector();
    updateCostDisplay();
    renderWardrobeGrid();
    
    switchTab('stylist'); 
}

function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${tab}`).classList.add('active');
    document.querySelectorAll('.control-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    // History Slider
    const slider = document.getElementById('history-slider');
    const stageArea = document.querySelector('.stage-area');
    const topControls = document.getElementById('top-session-controls');

    if(tab === 'stylist') {
        renderWardrobeGrid();
        if (state.outfitHistory.length > 0) {
            slider.classList.remove('hidden');
            stageArea.classList.add('has-history');
        }
        if (state.currentSessionBaseB64) {
            topControls.classList.remove('hidden');
        }
    } else {
        slider.classList.add('hidden');
        stageArea.classList.remove('has-history');
        topControls.classList.add('hidden');
    }

    updateStageImage(tab);
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
        const bodyB64 = await runBodyGeneration(state.salonPreviewB64, state.masterBodyB64);
        saveNewLook(state.salonPreviewB64, bodyB64);
        alert("Look Saved!");
        state.salonPreviewB64 = null; 
        state.previewHeadshotUrl = null; 
        updateStageImage('salon');
    } catch(e) {
        alert(e.message);
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
    renderHeadshotGrid();
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
async function processWardrobeFiles(files) {
    if (!files || files.length === 0) return;
    
    const filesArray = Array.from(files);
    const successful = [];
    const failed = [];
    
    for (const file of filesArray) {
        try {
            let b64 = await toBase64(file);
            // Resize wardrobe items too
            b64 = await resizeImage(b64, 1024);
            
            state.wardrobe.push({ 
                id: Date.now() + Math.random(), 
                url: `data:image/jpeg;base64,${b64}`, 
                b64: b64, 
                selected: true 
            });
            successful.push(file.name);
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            failed.push(file.name);
        }
    }
    
    renderWardrobeGrid();
    updateCostDisplay();
    
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
    }
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

    // MANNEQUIN WORKFLOW logic
    const threshold = (state.selectedModel === 'gemini-2.5-flash-image' || state.selectedModel === 'standard-plus') ? 2 : Infinity;
    
    if (!isPro && activeClothes.length > threshold) {
        await triggerMannequinWorkflow(activeClothes, additionalDesc);
        return;
    }

    // Normal generation logic...
    await runOutfitGeneration(baseB64, activeClothes, additionalDesc);
}

async function triggerMannequinWorkflow(activeClothes, additionalDesc) {
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
        alert("Mannequin generation failed: " + e.message);
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
    
    showLoading(true, "Applying...", "loading-stage");
    
    const prompt = `
    DRESSING THE SUBJECT:
    - IMAGE 0: The subject (base photo).
    - IMAGE 1: The target outfit (on mannequin).
    
    TASK:
    - Transfer the EXACT outfit from Image 1 onto the person in Image 0.
    - Keep face, hair, and body pose of Image 0 EXACTLY the same.
    - Ensure lighting and skin tones match perfectly.
    - OUTPUT: Full Body Vertical Portrait.
    `;

    try {
        const finalB64 = await callGemini(prompt, [baseB64, state.currentMannequinB64]);
        applyGenerationResult(finalB64);
    } catch (e) {
        alert(e.message);
    } finally {
        showLoading(false, null, "loading-stage");
    }
}

async function runOutfitGeneration(baseB64, activeClothes, additionalDesc) {
    // Deduplication logic: filter out clothes already "in" the base image if needed
    // (For now, we'll keep it simple and just send the active clothes)
    
    let instructionText = "";
    let images = [baseB64];

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
    - Image 0: Current state of the subject. Use this EXACT pose, identity, and framing.
    
    CLOTHING INSTRUCTIONS:
    - ${instructionText}
    
    CRITICAL:
    1. Maintain EXACT facial identity, hair, and framing from Image 0.
    2. Focus ONLY on applying/changing the clothes as requested.
    3. Ensure head-to-body proportions are accurate. No long necks or large heads.
    4. Background: Pure white infinite studio.
    `;
    
    try {
        const b64 = await callGemini(prompt, images);
        applyGenerationResult(b64);
    } catch(e) {
        alert(e.message);
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
    
    addToHistory(b64);
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
async function callGemini(promptText, b64Images, modelOverride = null) {
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
                model: targetModel
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(`API Error: ${data.error}`);
        }
        
        if (!data.imageData) {
            throw new Error("No image data returned from server.");
        }

        return data.imageData;
    } catch (error) {
        console.error('Error calling Gemini API:', error);
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

