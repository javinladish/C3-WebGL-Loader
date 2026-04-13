/**
 * DXT Texture Decompressor
 * Decompresses DXT1/DXT3/DXT5 compressed textures to RGBA
 */

export class DXTDecoder {
  
  /**
   * Decompress DXT1 to RGBA
   */
  static decompressDXT1(width, height, data) {
    const rgba = new Uint8Array(width * height * 4);
    
    const blockWidth = Math.ceil(width / 4);
    const blockHeight = Math.ceil(height / 4);
    
    let offset = 0;
    
    for (let by = 0; by < blockHeight; by++) {
      for (let bx = 0; bx < blockWidth; bx++) {
        if (offset + 8 > data.length) break;
        
        const blockData = data.slice(offset, offset + 8);
        DXTDecoder.decodeDXT1Block(blockData, rgba, bx * 4, by * 4, width, height);
        offset += 8;
      }
    }
    
    return rgba;
  }
  
  /**
   * Decompress DXT3 to RGBA
   */
  static decompressDXT3(width, height, data) {
    const rgba = new Uint8Array(width * height * 4);
    
    const blockWidth = Math.ceil(width / 4);
    const blockHeight = Math.ceil(height / 4);
    
    let offset = 0;
    
    for (let by = 0; by < blockHeight; by++) {
      for (let bx = 0; bx < blockWidth; bx++) {
        if (offset + 16 > data.length) break;
        
        const blockData = data.slice(offset, offset + 16);
        DXTDecoder.decodeDXT3Block(blockData, rgba, bx * 4, by * 4, width, height);
        offset += 16;
      }
    }
    
    return rgba;
  }
  
  /**
   * Decode a single DXT1 4x4 block
   */
  static decodeDXT1Block(blockData, output, startX, startY, imgWidth, imgHeight) {
    const view = new DataView(blockData.buffer, blockData.byteOffset);
    
    // Read two 16-bit colors (RGB565)
    const c0 = view.getUint16(0, true);
    const c1 = view.getUint16(2, true);
    
    // Decode RGB565 to RGB888
    const colors = new Array(4);
    
    colors[0] = DXTDecoder.rgb565ToRgb888(c0);
    colors[1] = DXTDecoder.rgb565ToRgb888(c1);
    
    // Interpolate other two colors
    if (c0 > c1) {
      colors[2] = [
        Math.floor((2 * colors[0][0] + colors[1][0]) / 3),
        Math.floor((2 * colors[0][1] + colors[1][1]) / 3),
        Math.floor((2 * colors[0][2] + colors[1][2]) / 3),
        255
      ];
      colors[3] = [
        Math.floor((colors[0][0] + 2 * colors[1][0]) / 3),
        Math.floor((colors[0][1] + 2 * colors[1][1]) / 3),
        Math.floor((colors[0][2] + 2 * colors[1][2]) / 3),
        255
      ];
    } else {
      colors[2] = [
        Math.floor((colors[0][0] + colors[1][0]) / 2),
        Math.floor((colors[0][1] + colors[1][1]) / 2),
        Math.floor((colors[0][2] + colors[1][2]) / 2),
        255
      ];
      colors[3] = [0, 0, 0, 0]; // Transparent
    }
    
    // Read 32-bit lookup table
    const indices = view.getUint32(4, true);
    
    // Decode 4x4 pixels
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const px = startX + x;
        const py = startY + y;
        
        if (px >= imgWidth || py >= imgHeight) continue;
        
        const pixelIndex = y * 4 + x;
        const colorIndex = (indices >> (pixelIndex * 2)) & 0x3;
        const color = colors[colorIndex];
        
        const outIndex = (py * imgWidth + px) * 4;
        output[outIndex + 0] = color[0];
        output[outIndex + 1] = color[1];
        output[outIndex + 2] = color[2];
        output[outIndex + 3] = color[3];
      }
    }
  }
  
  /**
   * Decode a single DXT3 4x4 block
   */
  static decodeDXT3Block(blockData, output, startX, startY, imgWidth, imgHeight) {
    // First 8 bytes: explicit alpha (4 bits per pixel)
    const alphaData = blockData.slice(0, 8);
    
    // Next 8 bytes: color data (same as DXT1)
    const colorData = blockData.slice(8, 16);
    
    // Decode color first
    DXTDecoder.decodeDXT1Block(colorData, output, startX, startY, imgWidth, imgHeight);
    
    // Apply explicit alpha
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const px = startX + x;
        const py = startY + y;
        
        if (px >= imgWidth || py >= imgHeight) continue;
        
        const pixelIndex = y * 4 + x;
        const byteIndex = Math.floor(pixelIndex / 2);
        const nibbleShift = (pixelIndex % 2) * 4;
        
        const alphaNibble = (alphaData[byteIndex] >> nibbleShift) & 0xF;
        const alpha = Math.floor(alphaNibble * 255 / 15);
        
        const outIndex = (py * imgWidth + px) * 4;
        output[outIndex + 3] = alpha;
      }
    }
  }
  
  /**
   * Convert RGB565 to RGB888
   */
  static rgb565ToRgb888(color) {
    const r = Math.floor(((color >> 11) & 0x1F) * 255 / 31);
    const g = Math.floor(((color >> 5) & 0x3F) * 255 / 63);
    const b = Math.floor((color & 0x1F) * 255 / 31);
    return [r, g, b, 255];
  }
}
