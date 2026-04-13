/**
 * Texture Loader for C3 Models
 * Loads PNG and DDS textures and handles WebGL texture creation
 */

import { DXTDecoder } from './DXTDecoder.js';

export class TextureLoader {
  
  constructor(gl) {
    this.gl = gl;
    this.cache = new Map();
  }
  
  /**
   * Load a texture from URL (PNG or DDS)
   */
  async load(url) {
    // Check cache first
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }
    
    console.log(`  Loading texture: ${url}`);
    
    // Determine file type from extension
    const ext = url.split('.').pop().toLowerCase();
    
    if (ext === 'dds') {
      return this.loadDDS(url);
    } else {
      return this.loadImage(url);
    }
  }
  
  /**
   * Load a DDS texture
   */
  async loadDDS(url) {
    const gl = this.gl;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const dds = this.parseDDS(arrayBuffer);
      
      // Create WebGL texture
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      
      // Upload DDS data
      if (dds.mipmaps.length > 0) {
        for (let i = 0; i < dds.mipmaps.length; i++) {
          const mipmap = dds.mipmaps[i];
          gl.texImage2D(
            gl.TEXTURE_2D,
            i,
            gl.RGBA,
            mipmap.width,
            mipmap.height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            mipmap.data
          );
        }
      }
      
      // Set texture parameters
      if (dds.mipmaps.length > 1) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      
      console.log(`  ✓ DDS texture loaded: ${url} (${dds.width}x${dds.height}, ${dds.mipmaps.length} mips)`);
      
      this.cache.set(url, texture);
      return texture;
      
    } catch (err) {
      console.error(`  ✗ Failed to load DDS texture: ${url}`, err);
      throw err;
    }
  }
  
  /**
   * Parse DDS file format
   */
  parseDDS(arrayBuffer) {
    const data = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    
    // Check magic number "DDS "
    const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);
    if (magic !== 'DDS ') {
      throw new Error('Not a DDS file');
    }
    
    // Read DDS header
    const height = view.getUint32(12, true);
    const width = view.getUint32(16, true);
    const mipmapCount = Math.max(1, view.getUint32(28, true));
    
    // Read pixel format (at offset 84-87 for fourCC)
    const fourCC = String.fromCharCode(data[84], data[85], data[86], data[87]);
    
    console.log(`  DDS: ${width}x${height}, ${mipmapCount} mips, format: ${fourCC}`);
    
    // Check if compressed (DXT1, DXT3, DXT5)
    const isCompressed = fourCC.startsWith('DXT') || fourCC.startsWith('3TXD');
    
    if (isCompressed) {
      // For now, decompress DXT to RGBA on CPU
      // This is a simplified approach - for production, use GPU decompression
      return this.decompressDXT(arrayBuffer, width, height, mipmapCount, fourCC);
    }
    
    // Parse uncompressed mipmaps
    const mipmaps = [];
    let offset = 128; // DDS header is 128 bytes
    
    let mipWidth = width;
    let mipHeight = height;
    
    for (let i = 0; i < mipmapCount && offset < arrayBuffer.byteLength; i++) {
      const mipSize = mipWidth * mipHeight * 4;
      
      if (offset + mipSize > arrayBuffer.byteLength) break;
      
      const mipData = new Uint8Array(arrayBuffer, offset, mipSize);
      
      mipmaps.push({
        data: mipData,
        width: mipWidth,
        height: mipHeight
      });
      
      offset += mipSize;
      mipWidth = Math.max(1, mipWidth >> 1);
      mipHeight = Math.max(1, mipHeight >> 1);
    }
    
    return {
      width,
      height,
      mipmaps,
      format: fourCC
    };
  }
  
  /**
   * Decompress DXT compressed DDS to RGBA
   */
  decompressDXT(arrayBuffer, width, height, mipmapCount, fourCC) {
    const data = new Uint8Array(arrayBuffer);
    const offset = 128; // Skip DDS header
    const compressedData = data.slice(offset);
    
    // Decompress using DXTDecoder
    let rgba;
    if (fourCC.includes('1') || fourCC === '1TXD') {
      rgba = DXTDecoder.decompressDXT1(width, height, compressedData);
    } else if (fourCC.includes('3') || fourCC === '3TXD') {
      rgba = DXTDecoder.decompressDXT3(width, height, compressedData);
    } else {
      // Unsupported format, create a placeholder
      rgba = new Uint8Array(width * height * 4);
      rgba.fill(128);
      console.warn(`  Unsupported DXT format: ${fourCC}`);
    }
    
    return {
      width,
      height,
      mipmaps: [{
        data: rgba,
        width: width,
        height: height
      }],
      format: fourCC
    };
  }
  /**
   * Load a PNG/JPG image texture
   */
  async loadImage(url) {
    return new Promise((resolve, reject) => {
      const gl = this.gl;
      
      // Create WebGL texture
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      
      // Fill with a single pixel while loading
      const pixel = new Uint8Array([128, 128, 128, 255]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      
      // Load image
      const image = new Image();
      
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        // Upload the image
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
        // Check if image is power-of-2
        if (this.isPowerOf2(image.width) && this.isPowerOf2(image.height)) {
          gl.generateMipmap(gl.TEXTURE_2D);
        } else {
          // No mipmaps for non-power-of-2 textures
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        
        console.log(`  ✓ Image texture loaded: ${url} (${image.width}x${image.height})`);
        
        this.cache.set(url, texture);
        resolve(texture);
      };
      
      image.onerror = () => {
        console.error(`  ✗ Failed to load texture: ${url}`);
        reject(new Error(`Failed to load texture: ${url}`));
      };
      
      image.src = url;
    });
  }
  
  /**
   * Check if a number is power of 2
   */
  isPowerOf2(value) {
    return (value & (value - 1)) === 0;
  }
  
  /**
   * Generate texture path for a C3 model
   * Pattern: {bodyID}{actionID}{garmentID}.png or .dds
   */
  static getTexturePath(bodyID, actionID, garmentID = 240, ext = 'png') {
    const bodyStr = String(bodyID).padStart(3, '0');
    const actionStr = String(actionID).padStart(3, '0');
    return `/extracted-assets/textures/${bodyStr}${actionStr}${garmentID}.${ext}`;
  }
}
