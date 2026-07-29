import type { DiagramArtworkKind } from './diagram-artwork.component';

type EnhancedArtworkKind = Extract<DiagramArtworkKind, 'gallery' | 'spatial'>;
type Rgb = readonly [number, number, number];
type Point3 = readonly [number, number, number];

interface SceneGeometry {
  readonly linePositions: Float32Array;
  readonly lineColors: Float32Array;
  readonly pointPositions: Float32Array;
  readonly pointColors: Float32Array;
  readonly pointSizes: Float32Array;
}

interface ShaderLocations {
  readonly position: number;
  readonly color: number;
  readonly size: number;
  readonly rotation: WebGLUniformLocation;
  readonly aspect: WebGLUniformLocation;
  readonly pointMode: WebGLUniformLocation;
  readonly time: WebGLUniformLocation;
}

const VERTEX_SHADER = `
  attribute vec3 a_position;
  attribute vec4 a_color;
  attribute float a_size;

  uniform vec2 u_rotation;
  uniform float u_aspect;
  uniform float u_point_mode;
  uniform float u_time;

  varying vec4 v_color;

  void main() {
    float idleY = sin(u_time * 0.00022) * 0.09;
    float cy = cos(u_rotation.y + idleY);
    float sy = sin(u_rotation.y + idleY);
    float cx = cos(u_rotation.x);
    float sx = sin(u_rotation.x);

    vec3 p = a_position;
    p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
    p = vec3(p.x, cx * p.y - sx * p.z, sx * p.y + cx * p.z);

    float depth = max(2.2, 4.4 - p.z);
    float perspective = 2.25 / depth;
    gl_Position = vec4((p.x * perspective) / u_aspect, p.y * perspective, p.z / 7.0, 1.0);
    gl_PointSize = max(2.0, a_size * perspective);
    v_color = vec4(a_color.rgb, a_color.a * clamp(0.68 + perspective * 0.42, 0.7, 1.0));
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform float u_point_mode;
  varying vec4 v_color;

  void main() {
    if (u_point_mode > 0.5) {
      vec2 point = gl_PointCoord - vec2(0.5);
      float distanceFromCenter = length(point);
      if (distanceFromCenter > 0.5) {
        discard;
      }
      float core = smoothstep(0.31, 0.25, distanceFromCenter);
      float glow = smoothstep(0.5, 0.12, distanceFromCenter);
      vec3 litColor = mix(v_color.rgb, vec3(1.0), core * 0.38);
      gl_FragColor = vec4(litColor, v_color.a * mix(glow * 0.48, 1.0, core));
      return;
    }

    gl_FragColor = v_color;
  }
`;

const parseCssColor = (value: string, fallback: Rgb): Rgb => {
  const normalized = value.trim();
  const hex = normalized.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (hex) {
    const expanded = hex.length === 3 ? [...hex].map((character) => character.repeat(2)).join('') : hex;
    return [Number.parseInt(expanded.slice(0, 2), 16) / 255, Number.parseInt(expanded.slice(2, 4), 16) / 255, Number.parseInt(expanded.slice(4, 6), 16) / 255];
  }

  const rgb = normalized.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  return rgb ? [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255] : fallback;
};

const color = (rgb: Rgb, alpha = 1): readonly [number, number, number, number] => [...rgb, alpha];

const createGeometryBuilder = () => {
  const linePositions: number[] = [];
  const lineColors: number[] = [];
  const pointPositions: number[] = [];
  const pointColors: number[] = [];
  const pointSizes: number[] = [];

  const addLine = (from: Point3, to: Point3, lineColor: readonly [number, number, number, number]): void => {
    linePositions.push(...from, ...to);
    lineColors.push(...lineColor, ...lineColor);
  };

  const addPoint = (point: Point3, pointColor: readonly [number, number, number, number], size: number): void => {
    pointPositions.push(...point);
    pointColors.push(...pointColor);
    pointSizes.push(size);
  };

  const build = (): SceneGeometry => ({
    linePositions: new Float32Array(linePositions),
    lineColors: new Float32Array(lineColors),
    pointPositions: new Float32Array(pointPositions),
    pointColors: new Float32Array(pointColors),
    pointSizes: new Float32Array(pointSizes)
  });

  return { addLine, addPoint, build };
};

const createSpatialGeometry = (accent: Rgb, foreground: Rgb): SceneGeometry => {
  const geometry = createGeometryBuilder();
  const vertices: readonly Point3[] = [
    [0, -1.25, 0.05],
    [-1.08, -0.45, 0.62],
    [-0.68, 0.78, -0.18],
    [0, 1.32, 0.28],
    [0.76, 0.77, 0.64],
    [1.16, -0.38, -0.04],
    [0.66, -1.02, -0.62],
    [-0.62, -1.02, -0.55]
  ];
  const outerEdges = vertices.map((_, index) => [index, (index + 1) % vertices.length] as const);
  const edgeColor = color(foreground, 0.84);
  const accentLine = color(accent, 0.92);

  for (const [from, to] of outerEdges) {
    geometry.addLine(vertices[from], vertices[to], edgeColor);
  }

  for (const vertex of vertices) {
    geometry.addLine([0, 0, 0.7], vertex, accentLine);
    geometry.addPoint(vertex, color(vertex[2] > 0.2 ? accent : foreground, 0.98), vertex[2] > 0.2 ? 24 : 19);
  }
  geometry.addPoint([0, 0, 0.78], color(accent), 38);

  const orbitColor = color(accent, 0.52);
  const orbitSegments = 64;
  for (let index = 0; index < orbitSegments; index += 1) {
    const angle = (index / orbitSegments) * Math.PI * 2;
    const nextAngle = ((index + 1) / orbitSegments) * Math.PI * 2;
    const orbitPoint = (value: number): Point3 => [Math.cos(value) * 1.65, Math.sin(value) * 0.58, Math.sin(value * 2) * 0.38];
    geometry.addLine(orbitPoint(angle), orbitPoint(nextAngle), orbitColor);
  }
  geometry.addPoint([1.65, 0, 0], color(accent, 0.95), 25);
  geometry.addPoint([-1.42, -0.29, 0.27], color(accent, 0.95), 22);

  return geometry.build();
};

const createGalleryGeometry = (accent: Rgb, foreground: Rgb): SceneGeometry => {
  const geometry = createGeometryBuilder();
  const strong = color(foreground, 0.72);
  const soft = color(foreground, 0.24);
  const blue = color(accent, 0.9);

  const addDiagramFrame = (center: Point3, width: number, height: number): void => {
    const [x, y, z] = center;
    const corners: readonly Point3[] = [
      [x - width, y - height, z],
      [x + width, y - height, z],
      [x + width, y + height, z],
      [x - width, y + height, z]
    ];
    corners.forEach((corner, index) => geometry.addLine(corner, corners[(index + 1) % corners.length], soft));
  };

  const addNode = (point: Point3, accented = false, size = 14): void => {
    geometry.addPoint(point, accented ? blue : color(foreground, 0.88), size);
  };

  addDiagramFrame([-1.05, 0.5, -0.35], 0.7, 0.54);
  const flowNodes: readonly Point3[] = [
    [-1.42, 0.72, -0.32],
    [-0.72, 0.72, -0.32],
    [-1.05, 0.22, -0.32]
  ];
  geometry.addLine(flowNodes[0], flowNodes[1], strong);
  geometry.addLine(flowNodes[1], flowNodes[2], strong);
  flowNodes.forEach((point, index) => addNode(point, index === 1));

  addDiagramFrame([0.98, 0.38, 0.22], 0.72, 0.58);
  const graphNodes: readonly Point3[] = [
    [0.62, 0.7, 0.28],
    [1.28, 0.76, 0.28],
    [1.46, 0.22, 0.28],
    [0.92, -0.05, 0.28],
    [0.48, 0.18, 0.28]
  ];
  const graphEdges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 0],
    [0, 3],
    [1, 4]
  ] as const;
  graphEdges.forEach(([from, to]) => geometry.addLine(graphNodes[from], graphNodes[to], color(accent, 0.5)));
  graphNodes.forEach((point, index) => addNode(point, index === 0 || index === 3, 13));

  addDiagramFrame([-0.25, -0.78, 0.72], 0.88, 0.5);
  const triangle: readonly Point3[] = [
    [-0.85, -1.04, 0.78],
    [0.38, -1.04, 0.78],
    [-0.05, -0.43, 0.78]
  ];
  triangle.forEach((point, index) => {
    geometry.addLine(point, triangle[(index + 1) % triangle.length], index === 2 ? blue : strong);
    addNode(point, index === 2, 11);
  });

  geometry.addLine([-1.28, 0.04, -0.28], [-0.5, -0.48, 0.48], color(accent, 0.3));
  geometry.addLine([0.62, -0.1, 0.3], [0.08, -0.42, 0.68], color(accent, 0.3));
  geometry.addPoint([0, 0, 1.05], color(accent, 0.9), 9);

  return geometry.build();
};

const compileShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram = (gl: WebGLRenderingContext): WebGLProgram | null => {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertexShader || !fragmentShader) {
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    return null;
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
};

const requiredUniform = (gl: WebGLRenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation | null => gl.getUniformLocation(program, name);

export class DiagramArtworkWebglRenderer {
  private readonly program: WebGLProgram;
  private readonly locations: ShaderLocations;
  private readonly linePositionBuffer: WebGLBuffer;
  private readonly lineColorBuffer: WebGLBuffer;
  private readonly pointPositionBuffer: WebGLBuffer;
  private readonly pointColorBuffer: WebGLBuffer;
  private readonly pointSizeBuffer: WebGLBuffer;
  private readonly geometry: SceneGeometry;
  private readonly resizeObserver: ResizeObserver;
  private animationFrame = 0;
  private visible = true;
  private targetRotation = { x: -0.08, y: 0.12 };
  private rotation = { x: -0.08, y: 0.12 };

  static create(canvas: HTMLCanvasElement, host: HTMLElement, kind: EnhancedArtworkKind): DiagramArtworkWebglRenderer | null {
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: true
    });
    if (!gl) {
      return null;
    }

    const styles = getComputedStyle(host);
    const accent = parseCssColor(styles.getPropertyValue('--accent'), [0.18, 0.4, 0.95]);
    const foreground = parseCssColor(styles.getPropertyValue('--app-foreground'), [0.08, 0.08, 0.08]);

    try {
      return new DiagramArtworkWebglRenderer(
        canvas,
        host,
        gl,
        kind === 'spatial' ? createSpatialGeometry(accent, foreground) : createGalleryGeometry(accent, foreground)
      );
    } catch {
      return null;
    }
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    host: HTMLElement,
    private readonly gl: WebGLRenderingContext,
    geometry: SceneGeometry
  ) {
    const program = createProgram(gl);
    if (!program) {
      throw new Error('Unable to initialize diagram artwork shaders.');
    }
    this.program = program;
    this.geometry = geometry;

    const rotation = requiredUniform(gl, program, 'u_rotation');
    const aspect = requiredUniform(gl, program, 'u_aspect');
    const pointMode = requiredUniform(gl, program, 'u_point_mode');
    const time = requiredUniform(gl, program, 'u_time');
    const buffers = Array.from({ length: 5 }, () => gl.createBuffer());
    if (!rotation || !aspect || !pointMode || !time || buffers.some((buffer) => !buffer)) {
      throw new Error('Unable to initialize diagram artwork buffers.');
    }

    this.locations = {
      position: gl.getAttribLocation(program, 'a_position'),
      color: gl.getAttribLocation(program, 'a_color'),
      size: gl.getAttribLocation(program, 'a_size'),
      rotation,
      aspect,
      pointMode,
      time
    };
    [this.linePositionBuffer, this.lineColorBuffer, this.pointPositionBuffer, this.pointColorBuffer, this.pointSizeBuffer] = buffers as WebGLBuffer[];
    this.uploadGeometry();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
  }

  start(): void {
    if (!this.animationFrame) {
      this.animationFrame = requestAnimationFrame(this.render);
    }
  }

  setPointer(x: number, y: number): void {
    this.targetRotation = {
      x: -y * 0.48 - 0.08,
      y: x * 0.62 + 0.12
    };
  }

  resetPointer(): void {
    this.targetRotation = { x: -0.08, y: 0.12 };
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) {
      this.start();
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
    this.resizeObserver.disconnect();
    const gl = this.gl;
    [this.linePositionBuffer, this.lineColorBuffer, this.pointPositionBuffer, this.pointColorBuffer, this.pointSizeBuffer].forEach((buffer) =>
      gl.deleteBuffer(buffer)
    );
    gl.deleteProgram(this.program);
  }

  private readonly render = (time: number): void => {
    this.animationFrame = 0;
    if (!this.visible || this.gl.isContextLost()) {
      return;
    }

    this.rotation.x += (this.targetRotation.x - this.rotation.x) * 0.075;
    this.rotation.y += (this.targetRotation.y - this.rotation.y) * 0.075;
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniform2f(this.locations.rotation, this.rotation.x, this.rotation.y);
    gl.uniform1f(this.locations.aspect, this.canvas.width / Math.max(this.canvas.height, 1));
    gl.uniform1f(this.locations.time, time);

    this.draw(this.linePositionBuffer, this.lineColorBuffer, null, this.geometry.linePositions.length / 3, gl.LINES);
    this.draw(this.pointPositionBuffer, this.pointColorBuffer, this.pointSizeBuffer, this.geometry.pointPositions.length / 3, gl.POINTS);
    this.animationFrame = requestAnimationFrame(this.render);
  };

  private draw(positionBuffer: WebGLBuffer, colorBuffer: WebGLBuffer, sizeBuffer: WebGLBuffer | null, count: number, mode: number): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(this.locations.position);
    gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.enableVertexAttribArray(this.locations.color);
    gl.vertexAttribPointer(this.locations.color, 4, gl.FLOAT, false, 0, 0);

    if (sizeBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
      gl.enableVertexAttribArray(this.locations.size);
      gl.vertexAttribPointer(this.locations.size, 1, gl.FLOAT, false, 0, 0);
      gl.uniform1f(this.locations.pointMode, 1);
    } else {
      gl.disableVertexAttribArray(this.locations.size);
      gl.vertexAttrib1f(this.locations.size, 1);
      gl.uniform1f(this.locations.pointMode, 0);
    }

    gl.drawArrays(mode, 0, count);
  }

  private uploadGeometry(): void {
    const gl = this.gl;
    const upload = (buffer: WebGLBuffer, data: Float32Array): void => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    };
    upload(this.linePositionBuffer, this.geometry.linePositions);
    upload(this.lineColorBuffer, this.geometry.lineColors);
    upload(this.pointPositionBuffer, this.geometry.pointPositions);
    upload(this.pointColorBuffer, this.geometry.pointColors);
    upload(this.pointSizeBuffer, this.geometry.pointSizes);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const pixelRatio = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }
}
