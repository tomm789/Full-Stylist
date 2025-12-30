/* ----------------------------------------------------------------
   STATE MANAGEMENT
   ---------------------------------------------------------------- */
const state = {
    rawSelfie: null,
    rawBody: null,
    masterBodyB64: null, 

    previewHeadshotUrl: null,
    previewHeadshotB64: null,

    savedLooks: [], 
    wardrobe: [],
    outfitHistory: [],
    
    selectedLookId: null,
};

const MODEL_ID = "gemini-3-pro-image-preview"; 

/* ----------------------------------------------------------------
   HELPERS
   ---------------------------------------------------------------- */
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});

function showLoading(show, text="Processing...") {
    const el = document.getElementById('loading-overlay');
    const txt = document.getElementById('loading-text');
    if(show) {
        el.style.display = 'block';
        txt.innerText = text;
    } else {
        el.style.display = 'none';
    }
}

// DOWNLOAD FEATURE
function downloadCurrentImage() {
    const img = document.getElementById('stage-image');
    const src = img.src;
    
    if (!src || src === "") return alert("No image to download.");
    
    const link = document.createElement('a');
    link.href = src;
    link.download = `full_stylist_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* ----------------------------------------------------------------
   ONBOARDING LOGIC
   ---------------------------------------------------------------- */
async function handleFile(input, previewId, stateKey) {
    if (input.files && input.files[0]) {
        const b64 = await toBase64(input.files[0]);
        if(stateKey === 'selfieBase64') state.rawSelfie = b64;
        if(stateKey === 'bodyBase64') state.rawBody = b64;
        const img = document.getElementById(previewId);
        img.src = URL.createObjectURL(input.files[0]);
        img.classList.remove('hidden');
    }
}

function goToStep(step) {
    document.querySelectorAll('.step-card').forEach(el => el.classList.add('hidden'));
    document.getElementById(`step-${step}`).classList.remove('hidden');
}

// STEP 1: INITIAL HEADSHOT
async function generateInitialHeadshot() {
    if(!state.rawSelfie) return alert("Please upload a selfie");

    document.getElementById('msg-1').innerText = "Generating Headshot...";
    
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
        document.getElementById('msg-1').innerText = "Error: " + e.message;
    }
}

// STEP 3: GENERATE STUDIO MODEL
async function generateStudioModel() {
    if(!state.rawBody) return alert("Please upload a body photo");
    document.getElementById('msg-3').innerText = "Creating Master Studio Model...";

    try {
        const bodyB64 = await runBodyGeneration(state.previewHeadshotB64, state.rawBody);
        state.masterBodyB64 = bodyB64; // Set Master Ref
        saveNewLook(state.previewHeadshotB64, bodyB64);
        enterDashboard();
    } catch(e) {
        alert(e.message);
        document.getElementById('msg-3').innerText = "Error: " + e.message;
    }
}

async function runBodyGeneration(headB64, referenceBodyB64) {
    const prompt = `
    Generate a photorealistic full-body studio photograph.
    SUBJECT: A person standing in grey boxer shorts and a white ribbed singlet.
    REFERENCES:
    - Image 0: STRICT reference for facial identity (Headshot).
    - Image 1: STRICT reference for body shape, pose, framing, and crop.
    INSTRUCTIONS:
    1. Create a cohesive image where Head (Img 0) is seamlessly integrated onto Body (Img 1).
    2. Match the lighting and skin tones perfectly.
    3. CRITICAL: You MUST maintain the exact framing of Image 1. Output a Full Body Vertical Portrait.
    4. Background: Pure white infinite studio.
    `;
    return await callGemini(prompt, [headB64, referenceBodyB64]);
}

/* ----------------------------------------------------------------
   DASHBOARD LOGIC
   ---------------------------------------------------------------- */
function enterDashboard() {
    document.getElementById('onboarding-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
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
    if(tab === 'stylist' && state.outfitHistory.length > 0) {
        slider.classList.remove('hidden');
        stageArea.classList.add('has-history');
    } else {
        slider.classList.add('hidden');
        stageArea.classList.remove('has-history');
    }

    updateStageImage(tab);
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
        stageImg.src = currentLook.bodyUrl;
        label.innerText = "Studio Base (Reference)";
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

    const h = document.getElementById('salon-hair').value || "Keep original hair";
    const m = document.getElementById('salon-makeup').value || "Natural look";

    showLoading(true, "Generating Headshot Preview...");

    try {
        const headPrompt = `Professional studio headshot. 
        SUBJECT: The person in Image 0.
        CLOTHING: Wearing a simple white ribbed singlet (wife beater).
        MODIFICATIONS: ${h}, ${m}.
        CRITICAL: Maintain the EXACT framing and composition of Image 0.
        Style: Light background.`;

        const headB64 = await callGemini(headPrompt, [state.rawSelfie]);
        
        state.previewHeadshotB64 = headB64;
        state.previewHeadshotUrl = `data:image/png;base64,${headB64}`;
        
        document.getElementById('stage-image').src = state.previewHeadshotUrl;
        document.getElementById('stage-label').innerText = "Preview (Click Save to Apply)";

    } catch(e) {
        alert(e.message);
    } finally {
        showLoading(false);
    }
}

async function saveCurrentHeadshot() {
    if(!state.previewHeadshotB64) return alert("Generate a look first!");
    showLoading(true, "Generating Full Body Asset...");
    try {
        const bodyB64 = await runBodyGeneration(state.previewHeadshotB64, state.masterBodyB64);
        saveNewLook(state.previewHeadshotB64, bodyB64);
        alert("Look Saved!");
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
async function handleWardrobeUpload(input) {
    if(input.files) {
        const files = Array.from(input.files);
        for (const file of files) {
            const b64 = await toBase64(file);
            state.wardrobe.push({ 
                id: Date.now() + Math.random(), 
                url: URL.createObjectURL(file), 
                b64: b64, 
                selected: true 
            });
        }
        renderWardrobeGrid();
    }
}

function renderWardrobeGrid() {
    const grid = document.getElementById('wardrobe-grid');
    grid.innerHTML = '';
    state.wardrobe.forEach(item => {
        const img = document.createElement('img');
        img.src = item.url;
        img.className = `thumb ${item.selected ? 'selected' : ''}`;
        img.onclick = () => {
            item.selected = !item.selected;
            renderWardrobeGrid();
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

    const activeClothes = state.wardrobe.filter(i => i.selected);
    const additionalDesc = document.getElementById('clothing-desc').value;

    // Auto Prompting Logic
    let instructionText = "";
    let images = [currentLook.bodyB64]; // Start with body

    if (activeClothes.length > 0) {
        // Case A: Clothes + Optional Text
        instructionText = "Dress the subject in the provided clothing images.";
        if (additionalDesc) instructionText += ` Also include these details: ${additionalDesc}.`;
        activeClothes.forEach(c => images.push(c.b64));
    } 
    else if (additionalDesc) {
        // Case B: Text Only
        instructionText = `Design and generate a fashionable outfit for the subject based on this description: ${additionalDesc}`;
    } 
    else {
        // Case C: Empty (Default)
        instructionText = "Design a stylish, modern outfit that perfectly suits the subject's appearance.";
    }

    showLoading(true, "Styling Outfit...");

    let prompt = `Fashion Photography Generation.
    OUTPUT FORMAT: Vertical Portrait (3:4 Aspect Ratio).
    
    SUBJECT REFERENCE:
    - Image 0: Use this EXACT body pose, facial identity, and framing.
    
    CLOTHING INSTRUCTIONS:
    - ${instructionText}
    
    TASK:
    1. Dress the subject (Image 0).
    2. Keep face, hair, makeup, and framing EXACTLY consistent with Image 0.
    3. SCENE: Professional studio white background.
    4. Do NOT output a landscape image. The output must be tall (Portrait).
    `;
    
    try {
        const b64 = await callGemini(prompt, images);
        const url = `data:image/png;base64,${b64}`;
        
        document.getElementById('stage-image').src = url;
        document.getElementById('stage-label').innerText = "Generated Outfit";
        addToHistory(url);

    } catch(e) {
        alert(e.message);
    } finally {
        showLoading(false);
    }
}

function addToHistory(url) {
    state.outfitHistory.unshift(url);
    const slider = document.getElementById('history-slider');
    const track = document.getElementById('history-track');
    const stageArea = document.querySelector('.stage-area');
    
    slider.classList.remove('hidden');
    stageArea.classList.add('has-history');
    track.innerHTML = ''; 

    state.outfitHistory.forEach(histUrl => {
        const img = document.createElement('img');
        img.src = histUrl;
        img.className = 'history-thumb';
        img.onclick = () => {
            document.getElementById('stage-image').src = histUrl;
            document.getElementById('stage-label').innerText = "History View";
        };
        img.ondblclick = () => openLightbox(histUrl);
        track.appendChild(img);
    });
}

/* ----------------------------------------------------------------
   API FUNCTION
   ---------------------------------------------------------------- */
async function callGemini(promptText, b64Images) {
    try {
        const response = await fetch('/.netlify/functions/generate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: promptText,
                images: b64Images
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

function downloadLightboxImage() {
    const lightboxImage = document.getElementById('lightbox-image');
    const src = lightboxImage.src;
    
    if (!src || src === "") return alert("No image to download.");
    
    const link = document.createElement('a');
    link.href = src;
    link.download = `full_stylist_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Close lightbox on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeLightbox();
    }
});

