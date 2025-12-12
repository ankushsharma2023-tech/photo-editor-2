// --- 1. Canvas Setup ---
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

// --- 2. History (Undo/Redo) ---
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

// --- 3. UPLOAD BUTTON LOGIC (FIXED) ---
const headerUploadBtn = document.getElementById('headerUploadBtn');
const hiddenUploadInput = document.getElementById('hiddenUploadInput');

// Clicking the purple button triggers the hidden file input
headerUploadBtn.addEventListener('click', () => {
    hiddenUploadInput.click();
});

// Handling the file selection
hiddenUploadInput.addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (f) => {
        fabric.Image.fromURL(f.target.result, (img) => {
            img.scaleToWidth(canvas.width * 0.8);
            canvas.add(img);
            canvas.centerObject(img);
            canvas.setActiveObject(img);
            saveHistory();
        });
    };
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
    hiddenUploadInput.value = ''; // Reset so you can upload same file again
});

// --- 4. FILTERS LOGIC (FIXED) ---
const filterBtns = document.querySelectorAll('.filter-btn');

filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const type = this.getAttribute('data-filter');
        applyFilter(type);
    });
});

function applyFilter(type) {
    const obj = canvas.getActiveObject();
    
    // Check if an object is selected and it is an image
    if (!obj || obj.type !== 'image') {
        alert("Please select an image on the canvas first!");
        return;
    }

    // Reset filters
    obj.filters = [];

    // Apply new filter based on button data-attribute
    switch(type) {
        case 'grayscale':
            obj.filters.push(new fabric.Image.filters.Grayscale());
            break;
        case 'sepia':
            obj.filters.push(new fabric.Image.filters.Sepia());
            break;
        case 'invert':
            obj.filters.push(new fabric.Image.filters.Invert());
            break;
        case 'reset':
            // Already cleared above
            break;
    }

    obj.applyFilters();
    canvas.renderAll();
    saveHistory();
}


// --- 5. Other Features ---

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

// Navigation
const sidebarIcons = document.querySelectorAll('.sidebar-icon');
const toolSections = document.querySelectorAll('.tool-section');
const toolsPanel = document.getElementById('toolsPanel');

sidebarIcons.forEach(icon => {
    icon.addEventListener('click', () => {
        sidebarIcons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
        toolSections.forEach(section => section.classList.remove('active'));
        
        const targetId = icon.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
        if (window.innerWidth <= 768) { toolsPanel.classList.add('open'); }
    });
});
canvas.on('mouse:down', () => { if (window.innerWidth <= 768) toolsPanel.classList.remove('open'); });

// Crop & Rotate
document.getElementById('headerRotateBtn').addEventListener('click', () => {
    const activeObj = canvas.getActiveObject();
    if (activeObj) { activeObj.rotate((activeObj.angle || 0) + 90); canvas.requestRenderAll(); saveHistory(); }
});
document.getElementById('headerCropBtn').addEventListener('click', () => {
    const size = Math.min(canvas.width, canvas.height);
    canvas.setDimensions({ width: size, height: size });
    canvas.renderAll(); saveHistory();
});

// Text
document.getElementById('addTextBtn').addEventListener('click', () => {
    const text = new fabric.IText('Double click to edit', { left: 50, top: 50, fontSize: 30, fill: '#000' });
    canvas.add(text); canvas.setActiveObject(text); saveHistory();
});
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

// Draw
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