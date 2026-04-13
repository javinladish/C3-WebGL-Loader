# C3 WebGL Character Viewer

A from-scratch WebGL port of the Conquer Online C3 Engine, built by reverse-engineering the Windows SDK.

## Features

- 🎮 **Native C3 Format Support** - Direct loading and parsing of C3 binary model files
- 🎨 **Real-time Texture Switching** - Switch between 10 different garments/outfits per body type
- 🔄 **Smooth 3D Rotation** - Automatic camera rotation with toggle control
- 📦 **DDS Texture Support** - Full DXT1/DXT3 compressed texture decompression
- 🏃 **4 Body Types** - Male, Female, Fat, and Muscular character models
- ⚡ **Pure WebGL** - No dependencies, vanilla JavaScript modules

## Live Demo

Open `index.html` in a browser (requires a local web server due to CORS).

### Running Locally

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx http-server -p 8000

# Using Bun
bun run --watch server.js  # if you have a server.js

# Then open: http://localhost:8000
```

## Controls

- **Body Type Dropdown** - Switch between 4 character body types
- **Garment Dropdown** - Select from 10 different outfits (200-290)
- **Quick Select Buttons** - Fast switching between garments
- **Auto-Rotate Checkbox** - Toggle automatic camera rotation

## Technical Details

### Architecture

Built from scratch by studying the Windows C3 SDK. No dependencies on the original engine.

**Components:**
- `C3Loader.js` - Binary C3 file parser
- `C3Renderer.js` - WebGL rendering engine
- `TextureLoader.js` - DDS and PNG texture loader
- `DXTDecoder.js` - DXT1/DXT3 texture decompression
- `index.html` - Main viewer interface

### C3 File Format

The parser handles the proprietary C3 (Conquer III Engine) binary format:

**Header:** `MAXFILE C3 00001` (16 bytes)

**Chunks:**
- `PHY` (0x20) - Skinned mesh geometry
- `MOTI` (0x49) - Animation data
- `CAME` (0x45) - Camera data
- `BONE` - Skeleton hierarchy

**PHY Chunk Structure:**
```
+0x00: nameSize (uint32)
+0x04: name (variable length)
+0x??: padding (4 bytes)
+0x??: vertexCount1 (uint32)
+0x??: vertexCount2 (uint32)
[vertices]
[face indices]
[bounding box]
[transform matrix]
```

**Vertex Format (Type 0x20):**
```
+0x00: position (vec3, 12 bytes)
+0x0C: normals/tangents (36 bytes, skipped)
+0x30: uv coords (vec2, 8 bytes)
+0x38: color (uint32, 4 bytes)
+0x3C: bone weights (4 uint32, 16 bytes)
Total: 76 bytes per vertex
```

### Coordinate System

Conquer uses a Z-down coordinate system:
- X axis: left(-) / right(+)
- Y axis: into screen(+) / towards camera(-)
- Z axis: down(+) / up(-)

Camera positioned at `(0, -800, -800)` with up vector `(0, 0, -1)`.

### Texture System

**Format:** DXT1/DXT3 compressed DDS files  
**Naming:** `{bodyID:3d}{actionID:3d}{garmentID:3d}.dds`  
**Example:** `003130240.dds` = Body 003, Action 130, Garment 240

Textures are decompressed to RGBA on the CPU before uploading to WebGL.

## Project Structure

```
c3-webgl-viewer/
├── index.html              # Main viewer
├── C3Loader.js            # C3 binary parser
├── C3Renderer.js          # WebGL renderer
├── TextureLoader.js       # DDS/PNG loader
├── DXTDecoder.js          # DXT decompressor
├── client-5065/           # Sample data
│   └── c3/
│       ├── 0001/611/130.C3  # Male body
│       ├── 0002/611/130.C3  # Female body
│       ├── 0003/611/130.C3  # Fat body
│       ├── 0004/611/130.C3  # Muscular body
│       └── texture/
│           ├── 001130200.dds  # Body 1 garments
│           ├── 001130210.dds
│           ├── ... (all garments 200-290)
│           └── 004130290.dds
└── README.md
```

## Current Limitations

- **Static T-Pose** - Animation system not yet implemented
- **Body Mesh Only** - Weapon/helmet attachment points are filtered out (need skeleton)
- **No Equipment Layering** - Hair, weapons, accessories not yet supported
- **Some UV Mapping Issues** - Body types 1, 2, and 4 have minor texture misalignment

## What's Working

✅ C3 binary file parsing  
✅ PHY chunk (mesh geometry)  
✅ WebGL rendering  
✅ DDS texture decompression  
✅ Texture switching  
✅ Multiple body types  
✅ Automatic scaling and centering  
✅ Camera rotation  

## Roadmap

- [ ] Skeletal animation (BONE/MOTI chunks)
- [ ] Equipment system (weapons, hair, armor)
- [ ] Multiple animations (walk, attack, idle)
- [ ] Better DXT5 support
- [ ] Optimize DXT decompression
- [ ] Add lighting and shadows

## Credits

Built by reverse-engineering the Conquer Online C3 Engine Windows SDK.  
Conquer Online © TQ Digital Entertainment.

## License

Educational/Research purposes only. All Conquer Online assets are property of TQ Digital.
