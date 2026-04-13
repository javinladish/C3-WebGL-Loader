/**
 * C3 WebGL Renderer
 * Renders C3 models using WebGL
 */

import { TextureLoader } from './TextureLoader.js';

export class C3Renderer {
  
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!this.gl) {
      throw new Error('WebGL not supported');
    }
    
    this.meshes = [];
    this.camera = {
      eye: { x: 0, y: -800, z: -800 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 0, z: -1 }
    };
    
    this.textureLoader = new TextureLoader(this.gl);
    
    this.initShaders();
    this.initUniforms();
  }
  
  /**
   * Initialize shaders
   */
  initShaders() {
    const gl = this.gl;
    
    // Vertex shader
    const vsSource = `
      attribute vec3 aPosition;
      attribute vec2 aUV;
      
      uniform mat4 uProjection;
      uniform mat4 uView;
      uniform mat4 uModel;
      
      varying vec2 vUV;
      
      void main() {
        gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
        vUV = aUV;
      }
    `;
    
    // Fragment shader with texture support
    const fsSource = `
      precision mediump float;
      
      varying vec2 vUV;
      
      uniform sampler2D uTexture;
      uniform bool uHasTexture;
      
      void main() {
        if (uHasTexture) {
          gl_FragColor = texture2D(uTexture, vUV);
        } else {
          // Fallback: UV-based coloring
          gl_FragColor = vec4(vUV.x, vUV.y, 0.5, 1.0);
        }
      }
    `;
    
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      throw new Error('VS compile error: ' + gl.getShaderInfoLog(vs));
    }
    
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      throw new Error('FS compile error: ' + gl.getShaderInfoLog(fs));
    }
    
    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);
    
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(this.program));
    }
    
    gl.useProgram(this.program);
    
    // Get attribute locations
    this.aPosition = gl.getAttribLocation(this.program, 'aPosition');
    this.aUV = gl.getAttribLocation(this.program, 'aUV');
    
    // Get uniform locations
    this.uProjection = gl.getUniformLocation(this.program, 'uProjection');
    this.uView = gl.getUniformLocation(this.program, 'uView');
    this.uModel = gl.getUniformLocation(this.program, 'uModel');
    this.uTexture = gl.getUniformLocation(this.program, 'uTexture');
    this.uHasTexture = gl.getUniformLocation(this.program, 'uHasTexture');
  }
  
  /**
   * Initialize uniform matrices
   */
  initUniforms() {
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const aspect = w / h;
    
    // Projection matrix (perspective)
    const fov = 45 * Math.PI / 180;
    const near = 1;
    const far = 10000;
    const f = 1 / Math.tan(fov / 2);
    
    const projection = new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / (near - far), -1,
      0, 0, (2 * far * near) / (near - far), 0
    ]);
    
    gl.uniformMatrix4fv(this.uProjection, false, projection);
    
    // View matrix (lookAt)
    const view = this.createLookAtMatrix(
      this.camera.eye,
      this.camera.target,
      this.camera.up
    );
    
    gl.uniformMatrix4fv(this.uView, false, view);
  }
  
  /**
   * Create lookAt view matrix
   */
  createLookAtMatrix(eye, target, up) {
    // Forward = normalize(target - eye)
    let fx = target.x - eye.x;
    let fy = target.y - eye.y;
    let fz = target.z - eye.z;
    const flen = Math.sqrt(fx * fx + fy * fy + fz * fz);
    fx /= flen; fy /= flen; fz /= flen;
    
    // Right = normalize(cross(forward, up))
    let rx = fy * up.z - fz * up.y;
    let ry = fz * up.x - fx * up.z;
    let rz = fx * up.y - fy * up.x;
    const rlen = Math.sqrt(rx * rx + ry * ry + rz * rz);
    rx /= rlen; ry /= rlen; rz /= rlen;
    
    // Up = cross(right, forward)
    const ux = ry * fz - rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy - ry * fx;
    
    return new Float32Array([
      rx, ux, -fx, 0,
      ry, uy, -fy, 0,
      rz, uz, -fz, 0,
      -(rx * eye.x + ry * eye.y + rz * eye.z),
      -(ux * eye.x + uy * eye.y + uz * eye.z),
      (fx * eye.x + fy * eye.y + fz * eye.z),
      1
    ]);
  }
  
  /**
   * Add a mesh to the scene with optional texture
   */
  async addMesh(mesh, texturePath = null) {
    const gl = this.gl;
    
    // Skip attachment point meshes for now (they need bone hierarchy)
    if (mesh.name.includes('weapon') || mesh.name.includes('armet')) {
      console.log(`  Skipping attachment mesh: "${mesh.name}"`);
      return;
    }
    
    // Only render body meshes
    if (!mesh.name.includes('body')) {
      return;
    }
    
    // Convert vertices to flat arrays
    const positions = [];
    const uvs = [];
    const indices = [];
    
    // Build flat arrays from faces
    for (const face of mesh.faces) {
      for (const idx of face) {
        if (idx >= mesh.vertices.length) {
          console.warn(`Invalid vertex index: ${idx} >= ${mesh.vertices.length}`);
          continue;
        }
        
        const v = mesh.vertices[idx];
        const uv = mesh.uvs[idx] || { u: 0, v: 0 };
        
        positions.push(v.x, v.y, v.z);
        uvs.push(uv.u, uv.v);
        indices.push(positions.length / 3 - 1);
      }
    }
    
    console.log(`  Building mesh "${mesh.name}": ${positions.length / 3} expanded vertices, ${indices.length / 3} triangles`);
    
    // Always compute bounding box from actual vertices (stored ones can be unreliable)
    const bbox = this.calculateBoundingBox(mesh.vertices);
    
    // Compute scale to normalize all bodies to roughly the same size
    const size = {
      x: bbox.max.x - bbox.min.x,
      y: bbox.max.y - bbox.min.y,
      z: bbox.max.z - bbox.min.z
    };
    
    // Use the maximum dimension for uniform scaling
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 200; // Target size for all bodies
    const scale = maxDim > 0 ? targetSize / maxDim : 1;
    
    // Center of bounding box
    const center = {
      x: (bbox.min.x + bbox.max.x) / 2,
      y: (bbox.min.y + bbox.max.y) / 2,
      z: (bbox.min.z + bbox.max.z) / 2
    };
    
    console.log(`  BBox: size=(${size.x.toFixed(1)}, ${size.y.toFixed(1)}, ${size.z.toFixed(1)}) scale=${scale.toFixed(2)}`);
    
    // Create transform matrix: scale, then translate to center
    const transform = new Float32Array([
      scale, 0, 0, 0,
      0, scale, 0, 0,
      0, 0, scale, 0,
      -center.x * scale, -center.y * scale, -center.z * scale, 1
    ]);
    
    // Create buffers
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
    
    const idxBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
    // Load texture if provided
    let texture = null;
    if (texturePath) {
      try {
        texture = await this.textureLoader.load(texturePath);
      } catch (err) {
        console.warn(`  Failed to load texture: ${err.message}`);
      }
    }
    
    this.meshes.push({
      name: mesh.name,
      posBuffer,
      uvBuffer,
      idxBuffer,
      indexCount: indices.length,
      transform: transform,
      boundingBox: bbox,
      texture: texture
    });
    
    console.log(`  Mesh added: ${this.meshes.length} total meshes`);
  }
  
  /**
   * Calculate bounding box from vertices
   */
  calculateBoundingBox(vertices) {
    if (vertices.length === 0) {
      return {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 }
      };
    }
    
    let min = { x: Infinity, y: Infinity, z: Infinity };
    let max = { x: -Infinity, y: -Infinity, z: -Infinity };
    
    for (const v of vertices) {
      min.x = Math.min(min.x, v.x);
      min.y = Math.min(min.y, v.y);
      min.z = Math.min(min.z, v.z);
      max.x = Math.max(max.x, v.x);
      max.y = Math.max(max.y, v.y);
      max.z = Math.max(max.z, v.z);
    }
    
    return { min, max };
  }
  
  /**
   * Render the scene
   */
  render() {
    const gl = this.gl;
    
    // Clear
    gl.clearColor(0.1, 0.1, 0.15, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Enable depth test
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    // Enable alpha blending for textures
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Draw each mesh with its own transformation matrix
    for (const mesh of this.meshes) {
      // Set model matrix (use mesh's transformation)
      gl.uniformMatrix4fv(this.uModel, false, mesh.transform);
      
      // Bind texture if available
      if (mesh.texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, mesh.texture);
        gl.uniform1i(this.uTexture, 0);
        gl.uniform1i(this.uHasTexture, 1);
      } else {
        gl.uniform1i(this.uHasTexture, 0);
      }
      
      // Bind position buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.posBuffer);
      gl.enableVertexAttribArray(this.aPosition);
      gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);
      
      // Bind UV buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uvBuffer);
      gl.enableVertexAttribArray(this.aUV);
      gl.vertexAttribPointer(this.aUV, 2, gl.FLOAT, false, 0, 0);
      
      // Bind index buffer
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idxBuffer);
      
      // Draw
      gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    }
  }
}
