// Admin routes for canvas management
import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { CanvasFileInfo } from '../models/types';
import * as canvasDb from '../database/canvasDb';

const router = Router();

// Parse filename into components: "Artist - Title (Year).extension"
function parseCanvasFilename(filename: string): { artist: string; title: string; year: string | null } {
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
async function getCanvasFiles(): Promise<CanvasFileInfo[]> {
  const canvasDir = path.join(process.cwd(), 'dist', 'server', 'assets', 'canvases');
  
  if (!fs.existsSync(canvasDir)) {
    console.log('Canvas directory not found:', canvasDir);
    return [];
  }
  
  const files = fs.readdirSync(canvasDir)
    .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
    .sort();
  
  const existingCanvases = await canvasDb.getAllCanvasDefinitions();
  
  return files.map(filename => {
    const parsed = parseCanvasFilename(filename);
    const ext = path.extname(filename).substring(1);
    
    // Check if already in database (by filename)
    const existing = existingCanvases.find(c => 
      c.filename === filename || 
      c.name === parsed.title
    );
    const isUnfinished = !existing || !existing.layout_json || !existing.layout_json.squares || existing.layout_json.squares.length === 0;
    
    return {
      filename,
      artist: parsed.artist,
      title: parsed.title,
      year: parsed.year,
      extension: ext,
      fullPath: `/assets/canvases/${filename}`,
      inDatabase: !!existing,
      canvasId: existing?.id,
      isUnfinished,
    };
  });
}

async function getNextUnfinishedFilename(currentFilename: string): Promise<string | null> {
  const canvasFiles = await getCanvasFiles();
  const currentIndex = canvasFiles.findIndex(file => file.filename === currentFilename);
  if (currentIndex === -1) return null;
  for (let i = currentIndex + 1; i < canvasFiles.length; i++) {
    if (canvasFiles[i].isUnfinished) {
      return canvasFiles[i].filename;
    }
  }
  return null;
}

// Admin dashboard
router.get('/', async (_req: Request, res: Response) => {
  const canvasFiles = await getCanvasFiles();
  const canvasDefinitions = await canvasDb.getAllCanvasDefinitions();
  
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
router.get('/canvases', async (_req: Request, res: Response) => {
  const canvasFiles = await getCanvasFiles();
  
  res.render('pages/admin/canvases', {
    title: 'Admin - All Canvases',
    canvasFiles,
  });
});

// Canvas editor - view/edit a single canvas
router.get('/canvas/edit/:filename', async (req: Request<{ filename: string }>, res: Response) => {
  const { filename } = req.params;
  const decodedFilename = decodeURIComponent(filename);
  
  const canvasFiles = await getCanvasFiles();
  const fileInfo = canvasFiles.find(f => f.filename === decodedFilename);
  
  if (!fileInfo) {
    return res.status(404).render('pages/error', {
      title: 'Error',
      message: 'Canvas file not found',
    });
  }
  
  // Get existing canvas definition if any
  const existingByFilename = await canvasDb.getCanvasDefinitionByFilename(decodedFilename);
  const existingByTitle = existingByFilename ? null : await canvasDb.getCanvasDefinitionByTitle(fileInfo.title);
  const existing = existingByFilename || existingByTitle;
  const nextUnfinishedFilename = await getNextUnfinishedFilename(decodedFilename);
  
  res.render('pages/admin/canvas-editor', {
    title: `Edit Canvas - ${fileInfo.title}`,
    fileInfo,
    canvas: existing || null,
    nextUnfinishedFilename,
    defaultValues: {
      star_value: 3,
      paint_value: 2,
      food_value: 1,
    },
  });
});

// API: Get canvas files as JSON
router.get('/api/canvases', async (_req: Request, res: Response) => {
  const canvasFiles = await getCanvasFiles();
  res.json({ success: true, canvases: canvasFiles });
});

// API: Get single canvas definition
router.get('/api/canvas/:id', async (req: Request<{ id: string }>, res: Response) => {
  const id = parseInt(req.params.id);
  const canvas = await canvasDb.getCanvasDefinition(id);
  
  if (!canvas) {
    return res.status(404).json({ error: 'Canvas not found' });
  }
  
  res.json({ success: true, canvas });
});

// API: Save/update canvas definition
router.post('/api/canvas', async (req: Request, res: Response) => {
  try {
    const {
      id,
      filename,
      name,
      artist,
      year,
      star_value,
      paint_value,
      food_value,
      orientation,
      squares,
    } = req.body;
    
    // Validate required fields
    if (!name || !squares || !Array.isArray(squares)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Build layout_json
    const layoutJson = {
      id: id ? `canvas-${id}` : `canvas-new-${Date.now()}`,
      orientation: orientation || 'landscape',
      squares: squares.map((sq: any, index: number) => ({
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
    
    const normalizedId = id ? parseInt(id, 10) : null;
    const savedCanvas = await canvasDb.saveCanvasDefinition(normalizedId, canvasData);
    
    res.json({
      success: true,
      canvas: savedCanvas,
      message: normalizedId ? 'Canvas updated' : 'Canvas created',
    });
  } catch (error: any) {
    console.error('Save canvas error:', error);
    res.status(500).json({ error: error.message || 'Failed to save canvas' });
  }
});

// API: Delete canvas definition
router.delete('/api/canvas/:id', async (req: Request<{ id: string }>, res: Response) => {
  const id = parseInt(req.params.id);
  
  const success = await canvasDb.deleteCanvasDefinition(id);
  
  if (!success) {
    return res.status(404).json({ error: 'Canvas not found' });
  }
  
  res.json({ success: true, message: 'Canvas deleted' });
});

// API: Bulk import canvases from files
router.post('/api/canvases/import', async (_req: Request, res: Response) => {
  try {
    const canvasFiles = await getCanvasFiles();
    const imported: string[] = [];
    const skipped: string[] = [];
    
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
          orientation: 'landscape' as const,
          squares: [], // Empty - needs manual configuration
        },
        filename: file.filename,
      };
      
      await canvasDb.saveCanvasDefinition(null, canvasData);
      imported.push(file.filename);
    }
    
    res.json({
      success: true,
      imported: imported.length,
      skipped: skipped.length,
      message: `Imported ${imported.length} canvases, skipped ${skipped.length} existing`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Import failed' });
  }
});

export default router;
