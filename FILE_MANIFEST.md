# File Manifest

## Core Application Files (6 files)

### Main HTML
- `index.html` - Main viewer interface with UI controls

### JavaScript Modules
- `C3Loader.js` - Binary C3 file parser (PHY chunk support)
- `C3Renderer.js` - WebGL rendering engine
- `TextureLoader.js` - DDS and PNG texture loader with caching
- `DXTDecoder.js` - DXT1/DXT3 texture decompression

## Documentation (3 files)
- `README.md` - Full project documentation
- `QUICK_START.md` - Quick setup and usage guide
- `.gitignore` - Git ignore patterns

## Game Assets (48 files)

### C3 Model Files (4 files)
Located in `client-5065/c3/{bodyID}/611/130.C3`

| Body ID | Type | File Size | Description |
|---------|------|-----------|-------------|
| 0001 | Male | 187 KB | Male character model |
| 0002 | Female | 186 KB | Female character model |
| 0003 | Fat | 185 KB | Fat body type |
| 0004 | Muscular | 206 KB | Muscular body type |

### DDS Texture Files (40 files)
Located in `client-5065/c3/texture/`

**Naming Convention:** `{bodyID:3d}{actionID:3d}{garmentID:3d}.dds`
- Action ID: 130 (T-pose standing)
- Garment IDs: 200-290 (10 outfits per body)

| Body | Textures | Format | Size Each |
|------|----------|--------|-----------|
| 001 | 10 files | DXT1/DXT3 | 16 KB |
| 002 | 10 files | DXT1/DXT3 | 16 KB |
| 003 | 10 files | DXT1/DXT3 | 16 KB |
| 004 | 10 files | DXT1/DXT3 | 16 KB |

**Examples:**
- `001130240.dds` - Body 001, Action 130, Garment 240
- `003130200.dds` - Body 003, Action 130, Garment 200

## Directory Structure

```
c3-webgl-viewer/
├── index.html                    # Main viewer (texture-switcher)
├── C3Loader.js                   # Binary parser
├── C3Renderer.js                 # WebGL renderer
├── TextureLoader.js              # Texture system
├── DXTDecoder.js                 # DXT decompressor
├── README.md                     # Full documentation
├── QUICK_START.md               # Quick start guide
├── .gitignore                   # Git ignore
└── client-5065/
    └── c3/
        ├── 0001/611/130.C3      # Male model
        ├── 0002/611/130.C3      # Female model
        ├── 0003/611/130.C3      # Fat model
        ├── 0004/611/130.C3      # Muscular model
        └── texture/
            ├── 001130200.dds    # Body 1 textures
            ├── 001130210.dds
            ├── ... (10 files)
            ├── 002130200.dds    # Body 2 textures
            ├── ... (10 files)
            ├── 003130200.dds    # Body 3 textures
            ├── ... (10 files)
            ├── 004130200.dds    # Body 4 textures
            └── ... (10 files)
```

## Total Package Size

**Size:** ~1.6 MB  
**Files:** 57 total  
- 6 core application files
- 3 documentation files
- 4 C3 model files
- 40 DDS texture files
- 1 .gitignore

## Module Dependencies

None! This is a vanilla JavaScript project with zero external dependencies.

All modules use ES6 imports:
```javascript
import { C3Loader } from './C3Loader.js';
import { C3Renderer } from './C3Renderer.js';
import { TextureLoader } from './TextureLoader.js';
// DXTDecoder imported by TextureLoader
```

## File Sizes by Type

| Type | Count | Total Size |
|------|-------|------------|
| C3 Models | 4 | ~764 KB |
| DDS Textures | 40 | ~640 KB |
| JavaScript | 4 | ~25 KB |
| HTML | 1 | ~8 KB |
| Docs | 2 | ~12 KB |

## Browser Requirements

- WebGL 1.0+ support
- ES6 module support (all modern browsers)
- Local web server (for CORS)

## License

All assets and code are for educational/research purposes only.  
Conquer Online assets © TQ Digital Entertainment.
