// --- 1. Canvas Initialization ---
const initCanvasWidth = window.innerWidth > 768 ? 600 : window.innerWidth - 40;
const canvas = new fabric.Canvas('editorCanvas', {
    width: initCanvasWidth,
    height: initCanvasWidth * 1.3,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true
});

window.addEventListener('resize', () => {
    const container = document.querySelector('.canvas-area');
    const w = container.clientWidth - 40;
    if(w < 800) { canvas.setDimensions({ width: w, height: w * 1.3 }); }
});

// --- 2. Undo/Redo System ---
let history = [];
let historyIndex = -1;
let isRedoing = false;

function saveHistory() {
    if(isRedoing) return;
    if (historyIndex < history.length - 1) { history = history.slice(0, historyIndex + 1); }
    history.push(JSON.stringify(canvas));
    historyIndex++;
}
saveHistory();
canvas.on('object:modified', saveHistory);
canvas.on('object:added', saveHistory);

document.getElementById('undoBtn').addEventListener('click', () => {
    if (historyIndex > 0) {
        isRedoing = true; historyIndex--;
        canvas.loadFromJSON(history[historyIndex], () => { canvas.renderAll(); isRedoing = false; });
    }
});
document.getElementById('redoBtn').addEventListener('click', () => {
    if (historyIndex < history.length - 1) {
        isRedoing = true; historyIndex++;
        canvas.loadFromJSON(history[historyIndex], () => { canvas.renderAll(); isRedoing = false; });
    }
});

// --- 3. Header & Navigation Logic ---

// Upload Button
const headerUploadBtn = document.getElementById('headerUploadBtn');
const hiddenUploadInput = document.getElementById('hiddenUploadInput');
headerUploadBtn.addEventListener('click', () => hiddenUploadInput.click());
hiddenUploadInput.addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (f) => {
        fabric.Image.fromURL(f.target.result, (img) => {
            img.scaleToWidth(canvas.width * 0.8);
            canvas.add(img); canvas.centerObject(img); canvas.setActiveObject(img);
            saveHistory();
        });
    };
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
    hiddenUploadInput.value = ''; 
});

// Sidebar Tab Navigation
const sidebarIcons = document.querySelectorAll('.sidebar-icon');
const toolSections = document.querySelectorAll('.tool-section');
const toolsPanel = document.getElementById('toolsPanel');

function openPanel(panelId) {
    // UI Updates
    sidebarIcons.forEach(i => i.classList.remove('active'));
    document.querySelector(`.sidebar-icon[data-target="${panelId}"]`).classList.add('active');
    
    toolSections.forEach(section => section.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');

    // Mobile Drawer Logic
    if (window.innerWidth <= 768) { toolsPanel.classList.add('open'); }
}

sidebarIcons.forEach(icon => {
    icon.addEventListener('click', () => {
        openPanel(icon.getAttribute('data-target'));
    });
});
// Close drawer on canvas click (mobile)
canvas.on('mouse:down', () => { if (window.innerWidth <= 768) toolsPanel.classList.remove('open'); });


// --- 4. Tool Features ---

// Header: Text Button (New)
// Header: Text Button
document.getElementById('headerAddTextBtn').addEventListener('click', () => {
    const text = new fabric.IText('New Text', { 
        left: canvas.width / 2, top: canvas.height / 2, 
        originX: 'center', originY: 'center', fontSize: 30, fill: '#000' 
    });
    canvas.add(text); canvas.setActiveObject(text); saveHistory();
    // Auto-open text panel (reusing the function from before)
    // If you don't have the openPanel function defined, just use this:
    document.querySelectorAll('.sidebar-icon').forEach(i => i.classList.remove('active'));
    document.querySelector('.sidebar-icon[data-target="panel-text"]').classList.add('active');
    document.querySelectorAll('.tool-section').forEach(s => s.classList.remove('active'));
    document.getElementById('panel-text').classList.add('active');
    if (window.innerWidth <= 768) { document.getElementById('toolsPanel').classList.add('open'); }
});

// Sidebar: Add Text Button
document.getElementById('addTextBtnSidebar').addEventListener('click', () => {
    const text = new fabric.IText('Heading', { left: 50, top: 50, fontSize: 30, fill: '#000' });
    canvas.add(text); canvas.setActiveObject(text); saveHistory();
});

// Text Controls (Font/Color)
const textControls = document.getElementById('textControls');
canvas.on('selection:created', checkSelection);
canvas.on('selection:updated', checkSelection);
canvas.on('selection:cleared', () => textControls.style.display = 'none');

function checkSelection(e) {
    const obj = e.selected[0];
    if (obj && obj.type === 'i-text') textControls.style.display = 'block';
    else textControls.style.display = 'none';
}
document.getElementById('textColorPicker').addEventListener('input', function() {
    const obj = canvas.getActiveObject(); if(obj && obj.type==='i-text') { obj.set('fill', this.value); canvas.renderAll(); }
});
document.getElementById('fontFamilySelect').addEventListener('change', function() {
    const obj = canvas.getActiveObject(); if(obj && obj.type==='i-text') { obj.set('fontFamily', this.value); canvas.renderAll(); saveHistory(); }
});

// Header: Crop & Rotate
document.getElementById('headerRotateBtn').addEventListener('click', () => {
    const activeObj = canvas.getActiveObject();
    if (activeObj) { activeObj.rotate((activeObj.angle || 0) + 90); canvas.requestRenderAll(); saveHistory(); }
});
document.getElementById('headerCropBtn').addEventListener('click', () => {
    const size = Math.min(canvas.width, canvas.height);
    canvas.setDimensions({ width: size, height: size });
    canvas.renderAll(); saveHistory();
    alert("Canvas cropped to square!");
});

// Theme Toggle
document.getElementById('themeToggleBtn').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const icon = document.querySelector('#themeToggleBtn i');
    if (document.body.classList.contains('dark-mode')) {
        icon.classList.remove('fa-moon'); icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun'); icon.classList.add('fa-moon');
    }
});

// Filters
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const type = this.getAttribute('data-filter');
        const obj = canvas.getActiveObject();
        if (!obj || obj.type !== 'image') { alert("Select an image first!"); return; }
        
        obj.filters = [];
        if(type === 'grayscale') obj.filters.push(new fabric.Image.filters.Grayscale());
        if(type === 'sepia') obj.filters.push(new fabric.Image.filters.Sepia());
        if(type === 'invert') obj.filters.push(new fabric.Image.filters.Invert());
        
        obj.applyFilters(); canvas.renderAll(); saveHistory();
    });
});

// Shapes & Stickers
document.getElementById('addRectBtn').addEventListener('click', () => {
    canvas.add(new fabric.Rect({ left: 100, top: 100, fill: document.getElementById('shapeColorPicker').value, width: 80, height: 80 })); saveHistory();
});
document.getElementById('addCircleBtn').addEventListener('click', () => {
    canvas.add(new fabric.Circle({ left: 100, top: 100, fill: document.getElementById('shapeColorPicker').value, radius: 50 })); saveHistory();
});
document.getElementById('addTriangleBtn').addEventListener('click', () => {
     canvas.add(new fabric.Triangle({ left: 100, top: 100, fill: document.getElementById('shapeColorPicker').value, width: 80, height: 80 })); saveHistory();
});
document.getElementById('shapeColorPicker').addEventListener('input', function(){
    const obj = canvas.getActiveObject();
    if(obj && (obj.type==='rect' || obj.type==='circle' || obj.type==='triangle')) { obj.set('fill', this.value); canvas.renderAll(); }
});
window.addSticker = function(emoji) {
    const text = new fabric.Text(emoji, { fontSize: 80, left: canvas.width/2, top: canvas.height/2 });
    canvas.add(text); canvas.setActiveObject(text); saveHistory();
};

// Templates
document.querySelectorAll('.template-item').forEach(item => {
    item.addEventListener('click', () => {
        canvas.clear(); canvas.backgroundColor = '#ffffff';
        const type = item.innerText;
        const text = new fabric.IText(type, { left: canvas.width/2, top: canvas.height/2, originX:'center', originY:'center', fontSize:40 });
        canvas.add(text); saveHistory();
    });
});

// Draw Mode
const toggleDraw = document.getElementById('toggleDrawBtn');
toggleDraw.addEventListener('click', () => {
    canvas.isDrawingMode = !canvas.isDrawingMode;
    toggleDraw.innerText = canvas.isDrawingMode ? "Disable Drawing" : "Enable Drawing";
    document.getElementById('drawingControls').style.display = canvas.isDrawingMode ? 'block' : 'none';
    if(canvas.isDrawingMode) {
        canvas.freeDrawingBrush.color = document.getElementById('brushColor').value;
        canvas.freeDrawingBrush.width = parseInt(document.getElementById('brushSize').value, 10);
    }
});

// Download
document.getElementById('downloadBtn').addEventListener('click', () => {
    canvas.discardActiveObject().renderAll();
    const link = document.createElement('a'); link.download = 'creative-studio-edit.png'; link.href = canvas.toDataURL(); link.click();
});