// --- 1. Canvas Initialization ---
const initCanvasWidth = window.innerWidth > 768 ? 600 : window.innerWidth - 40;
const canvas = new fabric.Canvas('editorCanvas', {
    width: initCanvasWidth,
    height: initCanvasWidth * 1.3, // Aspect ratio
    backgroundColor: '#ffffff',
    preserveObjectStacking: true
});

// Resize canvas on window resize
window.addEventListener('resize', () => {
    const container = document.querySelector('.canvas-area');
    const w = container.clientWidth - 40;
    if(w < 800) {
        canvas.setDimensions({ width: w, height: w * 1.3 });
    }
});


// --- 2. Tab Navigation Logic (Sidebar) ---
const sidebarIcons = document.querySelectorAll('.sidebar-icon');
const toolSections = document.querySelectorAll('.tool-section');
const toolsPanel = document.getElementById('toolsPanel');

sidebarIcons.forEach(icon => {
    icon.addEventListener('click', () => {
        // Remove active class from all icons
        sidebarIcons.forEach(i => i.classList.remove('active'));
        // Add active to clicked
        icon.classList.add('active');

        // Hide all sections
        toolSections.forEach(section => section.classList.remove('active'));
        
        // Show target section
        const targetId = icon.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        // Mobile specific: Open the panel if it's closed
        if (window.innerWidth <= 768) {
            toolsPanel.classList.add('open');
        }
    });
});

// Close panel when clicking canvas (Mobile UX)
canvas.on('mouse:down', () => {
    if (window.innerWidth <= 768) {
        toolsPanel.classList.remove('open');
    }
});


// --- 3. Undo / Redo History ---
let history = [];
let historyIndex = -1;
let isRedoing = false;

function saveHistory() {
    if(isRedoing) return;
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    history.push(JSON.stringify(canvas));
    historyIndex++;
}

// Initial Save
saveHistory();
canvas.on('object:modified', saveHistory);
canvas.on('object:added', saveHistory);

document.getElementById('undoBtn').addEventListener('click', () => {
    if (historyIndex > 0) {
        isRedoing = true;
        historyIndex--;
        canvas.loadFromJSON(history[historyIndex], () => {
            canvas.renderAll();
            isRedoing = false;
        });
    }
});

document.getElementById('redoBtn').addEventListener('click', () => {
    if (historyIndex < history.length - 1) {
        isRedoing = true;
        historyIndex++;
        canvas.loadFromJSON(history[historyIndex], () => {
            canvas.renderAll();
            isRedoing = false;
        });
    }
});


// --- 4. Header Tools (Crop & Rotate) ---
document.getElementById('headerRotateBtn').addEventListener('click', () => {
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
        activeObj.rotate((activeObj.angle || 0) + 90);
        canvas.requestRenderAll();
        saveHistory();
    } else {
        // If nothing selected, rotate canvas bg (simulated)
        alert("Select an object/image to rotate");
    }
});

document.getElementById('headerCropBtn').addEventListener('click', () => {
    // Simple Clip to Square logic (Demo purposes)
    const size = Math.min(canvas.width, canvas.height);
    canvas.setDimensions({ width: size, height: size });
    canvas.renderAll();
    alert("Canvas cropped to square! (Full cropping requires complex UI)");
    saveHistory();
});


// --- 5. Templates & Stickers ---
// Templates (Clicking text just changes canvas color/size for demo)
document.querySelectorAll('.template-item').forEach(item => {
    item.addEventListener('click', () => {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        const type = item.innerText;
        
        const text = new fabric.IText(type, {
            left: canvas.width/2, top: canvas.height/2,
            originX: 'center', originY: 'center',
            fontSize: 40, fill: '#333'
        });
        canvas.add(text);
        
        if(type.includes("Instagram")) canvas.setDimensions({width:500, height:500});
        if(type.includes("Story")) canvas.setDimensions({width:400, height:700});
        
        saveHistory();
    });
});

// Sticker Helper
window.addSticker = function(emoji) {
    const text = new fabric.Text(emoji, {
        fontSize: 80,
        left: canvas.width / 2,
        top: canvas.height / 2,
        selectable: true
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    saveHistory();
};


// --- 6. Standard Tools (Upload, Text, Shapes, Download) ---

// Upload
document.getElementById('imageUpload').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = function(f) {
        fabric.Image.fromURL(f.target.result, function(img) {
            img.scaleToWidth(canvas.width * 0.8);
            canvas.add(img);
            canvas.centerObject(img);
            canvas.setActiveObject(img);
            saveHistory();
        });
    };
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
});

// Add Text
document.getElementById('addTextBtn').addEventListener('click', () => {
    const text = new fabric.IText('Your Text', { left: 50, top: 50, fontSize: 30, fill: '#000' });
    canvas.add(text);
    canvas.setActiveObject(text);
    saveHistory();
});

// Text Controls (Font/Color) logic
const textControls = document.getElementById('textControls');
canvas.on('selection:created', checkSelection);
canvas.on('selection:updated', checkSelection);
canvas.on('selection:cleared', () => textControls.style.display = 'none');

function checkSelection(e) {
    const obj = e.selected[0];
    if (obj && obj.type === 'i-text') {
        textControls.style.display = 'block';
    } else {
        textControls.style.display = 'none';
    }
}
document.getElementById('textColorPicker').addEventListener('input', function() {
    const obj = canvas.getActiveObject();
    if(obj && obj.type==='i-text') { obj.set('fill', this.value); canvas.renderAll(); }
});

// Shapes
document.getElementById('addRectBtn').addEventListener('click', () => {
    canvas.add(new fabric.Rect({ left: 100, top: 100, fill: document.getElementById('shapeColorPicker').value, width: 80, height: 80 }));
    saveHistory();
});
document.getElementById('addCircleBtn').addEventListener('click', () => {
    canvas.add(new fabric.Circle({ left: 100, top: 100, fill: document.getElementById('shapeColorPicker').value, radius: 50 }));
    saveHistory();
});
document.getElementById('shapeColorPicker').addEventListener('input', function(){
    const obj = canvas.getActiveObject();
    if(obj && (obj.type==='rect' || obj.type==='circle')) { obj.set('fill', this.value); canvas.renderAll(); }
});

// Draw Mode
const toggleDraw = document.getElementById('toggleDrawBtn');
const drawControls = document.getElementById('drawingControls');
toggleDraw.addEventListener('click', () => {
    canvas.isDrawingMode = !canvas.isDrawingMode;
    toggleDraw.innerText = canvas.isDrawingMode ? "Disable Drawing" : "Enable Drawing";
    drawControls.style.display = canvas.isDrawingMode ? 'block' : 'none';
    if(canvas.isDrawingMode) {
        canvas.freeDrawingBrush.color = document.getElementById('brushColor').value;
        canvas.freeDrawingBrush.width = parseInt(document.getElementById('brushSize').value, 10);
    }
});

// Download
document.getElementById('downloadBtn').addEventListener('click', () => {
    canvas.discardActiveObject().renderAll();
    const link = document.createElement('a');
    link.download = 'creative-studio-edit.png';
    link.href = canvas.toDataURL();
    link.click();
});