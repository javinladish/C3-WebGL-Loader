/**
 * C3 Binary Loader
 * Loads C3 model files and parses geometry data
 */

export class C3Loader {
  
  /**
   * Load and parse a C3 file
   */
  static async load(url) {
    console.log(`Loading C3: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const result = C3Loader.parse(arrayBuffer);
    
    // Extract body and action IDs from URL
    // Pattern: /extracted-assets/c3/{bodyID}/{folder}/{actionID}.C3
    const match = url.match(/\/c3\/(\d+)\/\d+\/(\d+)\.C3/);
    if (match) {
      result.bodyID = parseInt(match[1]);
      result.actionID = parseInt(match[2]);
      console.log(`  Body ID: ${result.bodyID}, Action ID: ${result.actionID}`);
    }
    
    return result;
  }
  
  /**
   * Parse C3 binary data
   */
  static parse(arrayBuffer) {
    const data = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    
    let offset = 0;
    
    // Read header: "MAXFILE C3 00001"
    let header = '';
    for (let i = 0; i < 16; i++) {
      const c = data[offset++];
      if (c !== 0) header += String.fromCharCode(c);
    }
    
    if (!header.startsWith('MAXFILE C3')) {
      throw new Error(`Invalid C3 file: ${header}`);
    }
    
    console.log(`  Header: ${header}`);
    
    // Parse all chunks
    const meshes = [];
    
    while (offset < data.length - 8) {
      // Read chunk header: 3-char signature + 1 byte type + 4 byte size
      const sig = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2]);
      const type = data[offset + 3];
      const size = view.getUint32(offset + 4, true);
      offset += 8;
      
      const chunkData = data.slice(offset, offset + size);
      const chunkView = new DataView(chunkData.buffer, chunkData.byteOffset, chunkData.byteLength);
      
      console.log(`  Chunk: ${sig} type=0x${type.toString(16).padStart(2, '0')} size=${size}`);
      
      // Parse PHY chunks (meshes)
      if (sig === 'PHY' && type === 0x20) {
        const mesh = C3Loader.parsePHY(chunkData, chunkView, type);
        if (mesh) meshes.push(mesh);
      }
      
      offset += size;
    }
    
    console.log(`  Parsed ${meshes.length} meshes`);
    
    return { meshes };
  }
  
  /**
   * Parse PHY chunk (skinned mesh)
   */
  static parsePHY(data, view, typeByte) {
    let pos = 0;
    
    // Read name size
    const nameSize = view.getUint32(pos, true); pos += 4;
    
    if (nameSize > 100 || nameSize < 1) {
      console.warn(`    Invalid name size: ${nameSize}, skipping mesh`);
      return null;
    }
    
    // Read name
    const nameBytes = data.slice(pos, pos + nameSize);
    const name = new TextDecoder().decode(nameBytes).replace(/\0/g, '');
    pos += nameSize;
    
    // Skip 4 bytes padding
    pos += 4;
    
    // Read vertex counts (TWO counts!)
    const vertexCount1 = view.getUint32(pos, true); pos += 4;
    const vertexCount2 = view.getUint32(pos, true); pos += 4;
    const totalVertices = vertexCount1 + vertexCount2;
    
    console.log(`    Mesh: "${name}" (type: 0x${typeByte.toString(16).padStart(2, '0')})`);
    console.log(`    Vertices: ${vertexCount1} + ${vertexCount2} = ${totalVertices}`);
    
    if (totalVertices === 0 || totalVertices > 10000) {
      console.warn(`    Invalid vertex count: ${totalVertices}, skipping`);
      return null;
    }
    
    const vertices = [];
    const uvs = [];
    
    // Vertex format depends on type
    const hasSkip36 = (typeByte === 0x20 || typeByte === 0x10);
    
    // Parse vertices
    for (let i = 0; i < totalVertices; i++) {
      if (pos + 88 > data.length) {
        console.warn(`    Ran out of data at vertex ${i}/${totalVertices}`);
        break;
      }
      
      // Position (12 bytes)
      const x = view.getFloat32(pos, true); pos += 4;
      const y = view.getFloat32(pos, true); pos += 4;
      const z = view.getFloat32(pos, true); pos += 4;
      
      // Skip 36 bytes if this type has it (normals + tangents)
      if (hasSkip36) {
        pos += 36;
      }
      
      // UV (8 bytes)
      const u = view.getFloat32(pos, true); pos += 4;
      const v = view.getFloat32(pos, true); pos += 4;
      
      // Color (4 bytes)
      pos += 4;
      
      // Bone data (16 bytes for type 0x20, 8 bytes for type 0x10)
      if (typeByte === 0x20) {
        pos += 16; // bone1, bone2, weight1, weight2
      } else if (typeByte === 0x10) {
        pos += 8; // simplified bone data
      }
      
      vertices.push({ x, y, z });
      uvs.push({ u, v });
    }
    
    console.log(`    Parsed ${vertices.length} vertices`);
    
    // Parse faces
    if (pos + 8 > data.length) {
      console.warn(`    No face data available`);
      return null;
    }
    
    const faceCount1 = view.getUint32(pos, true); pos += 4;
    const faceCount2 = view.getUint32(pos, true); pos += 4;
    const totalFaces = faceCount1 + faceCount2;
    
    console.log(`    Faces: ${faceCount1} + ${faceCount2} = ${totalFaces}`);
    
    // Sanity check
    if (totalFaces > totalVertices * 100 || totalFaces < 0) {
      console.warn(`    Face count ${totalFaces} seems invalid, skipping`);
      return null;
    }
    
    const faces = [];
    for (let i = 0; i < totalFaces && pos + 6 <= data.length; i++) {
      const i1 = view.getUint16(pos, true); pos += 2;
      const i2 = view.getUint16(pos, true); pos += 2;
      const i3 = view.getUint16(pos, true); pos += 2;
      faces.push([i1, i2, i3]);
    }
    
    console.log(`    Parsed ${faces.length} faces`);
    
    if (faces.length === 0) return null;
    
    // Parse bounding box (6 floats)
    let boundingBox = null;
    if (pos + 24 <= data.length) {
      boundingBox = {
        min: {
          x: view.getFloat32(pos, true),
          y: view.getFloat32(pos + 4, true),
          z: view.getFloat32(pos + 8, true)
        },
        max: {
          x: view.getFloat32(pos + 12, true),
          y: view.getFloat32(pos + 16, true),
          z: view.getFloat32(pos + 20, true)
        }
      };
      pos += 24;
    }
    
    // Parse transformation matrix (16 floats, 4x4 matrix)
    let transform = null;
    if (pos + 64 <= data.length) {
      transform = new Float32Array(16);
      for (let i = 0; i < 16; i++) {
        transform[i] = view.getFloat32(pos, true);
        pos += 4;
      }
      
      console.log(`    Transform matrix parsed`);
    }
    
    return { name, vertices, uvs, faces, boundingBox, transform };
  }
}
