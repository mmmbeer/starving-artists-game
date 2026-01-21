"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Admin routes for canvas management
const express_1 = require("express");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const memoryDb_1 = require("../database/memoryDb");
const router = (0, express_1.Router)();
// Parse filename into components: "Artist - Title (Year).extension"
function parseCanvasFilename(filename) {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '');
    // Try to parse "Artist - Title (Year)" format
    const match = nameWithoutExt.match(/^(.+?)\s*-\s*(.+?)(?:\s*\(([^)]+)\))?$/);
    if (match) {
        return {
            artist: match[1].trim(),
            title: match[2].trim(),
            year: match[3] ? match[3].trim() : null,
        };
    }
    // Fallback: use whole name as title
    return {
        artist: 'Unknown',
        title: nameWithoutExt,
        year: null,
    };
}
// Get all canvas files from assets directory
function getCanvasFiles() {
    const canvasDir = path.join(process.cwd(), '..', 'assets', 'canvases');
    if (!fs.existsSync(canvasDir)) {
        console.log('Canvas directory not found:', canvasDir);
        return [];
    }
    const files = fs.readdirSync(canvasDir)
        .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
        .sort();
    const existingCanvases = memoryDb_1.memoryDb.getCanvasDefinitions();
    return files.map(filename => {
        const parsed = parseCanvasFilename(filename);
        const ext = path.extname(filename).substring(1);
        // Check if already in database (by filename)
        const existing = existingCanvases.find(c => c.filename === filename ||
            c.name === parsed.title);
        return {
            filename,
            artist: parsed.artist,
            title: parsed.title,
            year: parsed.year,
            extension: ext,
            fullPath: `/assets/canvases/${filename}`,
            inDatabase: !!existing,
            canvasId: existing?.id,
        };
    });
}
// Admin dashboard
router.get('/', (_req, res) => {
    const canvasFiles = getCanvasFiles();
    const canvasDefinitions = memoryDb_1.memoryDb.getCanvasDefinitions();
    const stats = {
        totalFiles: canvasFiles.length,
        filesInDb: canvasFiles.filter(f => f.inDatabase).length,
        filesMissing: canvasFiles.filter(f => !f.inDatabase).length,
        totalDefinitions: canvasDefinitions.length,
    };
    res.render('pages/admin/index', {
        title: 'Admin - Canvas Management',
        stats,
        canvasFiles: canvasFiles.slice(0, 20), // First 20 for preview
    });
});
// List all canvas files
router.get('/canvases', (_req, res) => {
    const canvasFiles = getCanvasFiles();
    res.render('pages/admin/canvases', {
        title: 'Admin - All Canvases',
        canvasFiles,
    });
});
// Canvas editor - view/edit a single canvas
router.get('/canvas/edit/:filename', (req, res) => {
    const { filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);
    const canvasFiles = getCanvasFiles();
    const fileInfo = canvasFiles.find(f => f.filename === decodedFilename);
    if (!fileInfo) {
        return res.status(404).render('pages/error', {
            title: 'Error',
            message: 'Canvas file not found',
        });
    }
    // Get existing canvas definition if any
    const canvasDefinitions = memoryDb_1.memoryDb.getCanvasDefinitions();
    const existing = canvasDefinitions.find(c => c.filename === decodedFilename ||
        c.name === fileInfo.title);
    res.render('pages/admin/canvas-editor', {
        title: `Edit Canvas - ${fileInfo.title}`,
        fileInfo,
        canvas: existing || null,
        defaultValues: {
            star_value: 3,
            paint_value: 2,
            food_value: 1,
        },
    });
});
// API: Get canvas files as JSON
router.get('/api/canvases', (_req, res) => {
    const canvasFiles = getCanvasFiles();
    res.json({ success: true, canvases: canvasFiles });
});
// API: Get single canvas definition
router.get('/api/canvas/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const canvas = memoryDb_1.memoryDb.getCanvasDefinition(id);
    if (!canvas) {
        return res.status(404).json({ error: 'Canvas not found' });
    }
    res.json({ success: true, canvas });
});
// API: Save/update canvas definition
router.post('/api/canvas', (req, res) => {
    try {
        const { id, filename, name, artist, year, star_value, paint_value, food_value, orientation, squares, } = req.body;
        // Validate required fields
        if (!name || !squares || !Array.isArray(squares)) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Build layout_json
        const layoutJson = {
            id: id ? `canvas-${id}` : `canvas-new-${Date.now()}`,
            orientation: orientation || 'landscape',
            squares: squares.map((sq, index) => ({
                id: sq.id || `square-${index}`,
                position: {
                    x: parseInt(sq.position?.x || sq.x || 0),
                    y: parseInt(sq.position?.y || sq.y || 0),
                },
                allowedColors: sq.allowedColors || ['red'],
            })),
        };
        const canvasData = {
            name,
            artist: artist || 'Unknown',
            year: year || null,
            star_value: parseInt(star_value) || 3,
            paint_value: parseInt(paint_value) || 2,
            food_value: parseInt(food_value) || 1,
            layout_json: layoutJson,
            filename: filename || null,
        };
        // Save to memory database
        const savedCanvas = memoryDb_1.memoryDb.saveCanvasDefinition(id, canvasData);
        res.json({
            success: true,
            canvas: savedCanvas,
            message: id ? 'Canvas updated' : 'Canvas created',
        });
    }
    catch (error) {
        console.error('Save canvas error:', error);
        res.status(500).json({ error: error.message || 'Failed to save canvas' });
    }
});
// API: Delete canvas definition
router.delete('/api/canvas/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const success = memoryDb_1.memoryDb.deleteCanvasDefinition(id);
    if (!success) {
        return res.status(404).json({ error: 'Canvas not found' });
    }
    res.json({ success: true, message: 'Canvas deleted' });
});
// API: Bulk import canvases from files
router.post('/api/canvases/import', (_req, res) => {
    try {
        const canvasFiles = getCanvasFiles();
        const imported = [];
        const skipped = [];
        for (const file of canvasFiles) {
            if (file.inDatabase) {
                skipped.push(file.filename);
                continue;
            }
            // Create basic canvas definition
            const canvasData = {
                name: file.title,
                artist: file.artist,
                year: file.year,
                star_value: 3,
                paint_value: 2,
                food_value: 1,
                layout_json: {
                    id: `canvas-${file.filename}`,
                    orientation: 'landscape',
                    squares: [], // Empty - needs manual configuration
                },
                filename: file.filename,
            };
            memoryDb_1.memoryDb.saveCanvasDefinition(null, canvasData);
            imported.push(file.filename);
        }
        res.json({
            success: true,
            imported: imported.length,
            skipped: skipped.length,
            message: `Imported ${imported.length} canvases, skipped ${skipped.length} existing`,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Import failed' });
    }
});
exports.default = router;
