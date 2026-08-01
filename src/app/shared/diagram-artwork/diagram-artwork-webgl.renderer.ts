import type { DiagramArtworkKind } from './diagram-artwork.component';

type EnhancedArtworkKind = Extract<DiagramArtworkKind, 'gallery' | 'lost' | 'spatial'>;
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
  readonly scale: WebGLUniformLocation;
  readonly overscan: WebGLUniformLocation;
  readonly pointMode: WebGLUniformLocation;
  readonly time: WebGLUniformLocation;
}

const VERTEX_SHADER = `
  attribute vec3 a_position;
  attribute vec4 a_color;
  attribute float a_size;

  uniform vec2 u_rotation;
  uniform float u_aspect;
  uniform float u_scale;
  uniform float u_overscan;
  uniform float u_point_mode;
  uniform float u_time;

  varying vec4 v_color;

  void main() {
    float idleY = u_time * 0.00016;
    float idleX = sin(u_time * 0.00027) * 0.1;
    float cy = cos(u_rotation.y + idleY);
    float sy = sin(u_rotation.y + idleY);
    float cx = cos(u_rotation.x + idleX);
    float sx = sin(u_rotation.x + idleX);

    vec3 p = a_position;
    float pointSize = a_size < -0.5 ? 38.0 : abs(a_size);
    if (a_size < -0.5) {
      float orbitId = abs(a_size) - 21.0;
      float orbitAngle = u_time * (0.00062 + orbitId * 0.00012) + orbitId * 2.1;
      if (orbitId < 0.5) {
        p = vec3(cos(orbitAngle) * 1.72, sin(orbitAngle) * 0.5, sin(orbitAngle) * 1.08);
      } else if (orbitId < 1.5) {
        p = vec3(cos(orbitAngle) * 0.56, sin(orbitAngle) * 1.58, cos(orbitAngle) * 0.92);
      } else if (orbitId < 2.5) {
        p = vec3(cos(orbitAngle) * 1.42, sin(orbitAngle) * 1.0, cos(orbitAngle) * 0.58);
      } else {
        p = vec3(cos(orbitAngle) * 1.55, sin(orbitAngle) * 0.76, cos(orbitAngle) * 0.86);
      }
    }
    p *= u_scale;
    p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
    p = vec3(p.x, cx * p.y - sx * p.z, sx * p.y + cx * p.z);

    float depth = max(2.1, 4.35 - p.z);
    float perspective = 2.8 / depth;
    gl_Position = vec4((p.x * perspective) / (u_aspect * u_overscan), (p.y * perspective) / u_overscan, p.z / 7.0, 1.0);
    gl_PointSize = max(2.0, pointSize * perspective);
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
      gl_FragColor = vec4(litColor, v_color.a * mix(glow * 0.2, 1.0, core));
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

const isLightSurface = (foreground: Rgb): boolean => foreground[0] + foreground[1] + foreground[2] < 1.5;

const mixRgb = (from: Rgb, to: Rgb, toWeight: number): Rgb => [
  from[0] * (1 - toWeight) + to[0] * toWeight,
  from[1] * (1 - toWeight) + to[1] * toWeight,
  from[2] * (1 - toWeight) + to[2] * toWeight
];

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
  const pointOnRing = (index: number, radius: number, z: number): Point3 => {
    const angle = (index / 5) * Math.PI * 2 + Math.PI / 2;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, z];
  };
  const outerNodes: readonly Point3[] = Array.from({ length: 5 }, (_, index) => pointOnRing(index, 1.24, -0.24));
  const innerNodes: readonly Point3[] = Array.from({ length: 5 }, (_, index) => pointOnRing(index, 0.62, 0.38));
  const edgeColor = color(foreground, 0.88);
  const lightSurface = isLightSurface(foreground);
  const orbitColor = lightSurface ? mixRgb(accent, foreground, 0.28) : accent;
  const primaryOrbitOpacity = lightSurface ? 0.68 : 0.28;
  const secondaryOrbitOpacity = lightSurface ? 0.5 : 0.18;

  outerNodes.forEach((outerNode, index) => {
    geometry.addLine(outerNode, outerNodes[(index + 1) % 5], edgeColor);
    geometry.addLine(outerNode, innerNodes[index], edgeColor);
    geometry.addLine(innerNodes[index], innerNodes[(index + 2) % 5], edgeColor);
    geometry.addPoint(outerNode, color(accent), 28);
    geometry.addPoint(innerNodes[index], color(accent), 24);
  });

  const orbitSegments = 72;
  const orbitPoints: readonly ((angle: number) => Point3)[] = [
    (angle) => [Math.cos(angle) * 1.72, Math.sin(angle) * 0.5, Math.sin(angle) * 1.08],
    (angle) => [Math.cos(angle) * 0.56, Math.sin(angle) * 1.58, Math.cos(angle) * 0.92],
    (angle) => [Math.cos(angle) * 1.42, Math.sin(angle) * 1.0, Math.cos(angle) * 0.58]
  ];
  orbitPoints.forEach((pointAt, orbitIndex) => {
    for (let index = 0; index < orbitSegments; index += 1) {
      const angle = (index / orbitSegments) * Math.PI * 2;
      const nextAngle = ((index + 1) / orbitSegments) * Math.PI * 2;
      geometry.addLine(pointAt(angle), pointAt(nextAngle), color(orbitColor, orbitIndex === 0 ? primaryOrbitOpacity : secondaryOrbitOpacity));
    }
    geometry.addPoint([0, 0, 0], color(accent), -(21 + orbitIndex));
  });

  return geometry.build();
};

const createGalleryGeometry = (accent: Rgb, foreground: Rgb): SceneGeometry => {
  const geometry = createGeometryBuilder();
  const strong = color(foreground, 0.86);
  const blue = color(accent, 0.98);
  const addShape = (points: readonly Point3[], edges: readonly (readonly [number, number])[], nodeSize = 18): void => {
    edges.forEach(([from, to]) => geometry.addLine(points[from], points[to], strong));
    points.forEach((point) => geometry.addPoint(point, blue, nodeSize));
  };

  const tetrahedron: readonly Point3[] = [
    [-1.5, 0.42, 0.02],
    [-0.5, 0.42, 0.02],
    [-1, 1.2, 0.02],
    [-1, 0.7, 0.78]
  ];
  addShape(
    tetrahedron,
    [
      [0, 1],
      [1, 2],
      [2, 0],
      [0, 3],
      [1, 3],
      [2, 3]
    ],
    17
  );

  const cube: readonly Point3[] = [
    [0.48, 0.02, -0.36],
    [1.28, 0.02, -0.36],
    [1.28, 0.74, -0.36],
    [0.48, 0.74, -0.36],
    [0.7, 0.18, 0.36],
    [1.5, 0.18, 0.36],
    [1.5, 0.9, 0.36],
    [0.7, 0.9, 0.36]
  ];
  addShape(
    cube,
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7]
    ],
    15
  );

  const octahedron: readonly Point3[] = [
    [-0.16, -0.18, 0],
    [-0.16, -1.36, 0],
    [-0.68, -0.77, 0],
    [0.36, -0.77, 0],
    [-0.16, -0.77, 0.64],
    [-0.16, -0.77, -0.64]
  ];
  addShape(
    octahedron,
    [
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [2, 4],
      [4, 3],
      [3, 5],
      [5, 2]
    ],
    16
  );

  return geometry.build();
};

const createLostGeometry = (accent: Rgb, foreground: Rgb): SceneGeometry => {
  const geometry = createGeometryBuilder();
  const orbitSegments = 96;
  const orbitPoints: readonly ((angle: number) => Point3)[] = [
    (angle) => [Math.cos(angle) * 1.72, Math.sin(angle) * 0.5, Math.sin(angle) * 1.08],
    (angle) => [Math.cos(angle) * 0.56, Math.sin(angle) * 1.58, Math.cos(angle) * 0.92],
    (angle) => [Math.cos(angle) * 1.42, Math.sin(angle) * 1, Math.cos(angle) * 0.58],
    (angle) => [Math.cos(angle) * 1.55, Math.sin(angle) * 0.76, Math.cos(angle) * 0.86],
    (angle) => [Math.cos(angle) * 1.12, Math.sin(angle) * 1.34, Math.sin(angle) * 0.52]
  ];
  const orbitColors = [color(foreground, 0.72), color(accent, 0.58), color(foreground, 0.52), color(accent, 0.42), color(foreground, 0.34)] as const;

  orbitPoints.forEach((pointAt, orbitIndex) => {
    for (let index = 0; index < orbitSegments; index += 1) {
      const angle = (index / orbitSegments) * Math.PI * 2;
      const nextAngle = ((index + 1) / orbitSegments) * Math.PI * 2;
      geometry.addLine(pointAt(angle), pointAt(nextAngle), orbitColors[orbitIndex]);
    }
    if (orbitIndex < 4) {
      geometry.addPoint([0, 0, 0], color(accent), -(21 + orbitIndex));
    }
  });

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
    const overscan = Number.parseFloat(styles.getPropertyValue('--artwork-render-overscan')) || 1;

    try {
      return new DiagramArtworkWebglRenderer(
        canvas,
        host,
        gl,
        kind === 'spatial'
          ? createSpatialGeometry(accent, foreground)
          : kind === 'gallery'
            ? createGalleryGeometry(accent, foreground)
            : createLostGeometry(accent, foreground),
        kind === 'lost' ? 0.72 : 1,
        overscan
      );
    } catch {
      return null;
    }
  }

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    host: HTMLElement,
    private readonly gl: WebGLRenderingContext,
    geometry: SceneGeometry,
    private readonly sceneScale: number,
    private readonly overscan: number
  ) {
    const program = createProgram(gl);
    if (!program) {
      throw new Error('Unable to initialize diagram artwork shaders.');
    }
    this.program = program;
    this.geometry = geometry;

    const rotation = requiredUniform(gl, program, 'u_rotation');
    const aspect = requiredUniform(gl, program, 'u_aspect');
    const scale = requiredUniform(gl, program, 'u_scale');
    const overscanUniform = requiredUniform(gl, program, 'u_overscan');
    const pointMode = requiredUniform(gl, program, 'u_point_mode');
    const time = requiredUniform(gl, program, 'u_time');
    const buffers = Array.from({ length: 5 }, () => gl.createBuffer());
    if (!rotation || !aspect || !scale || !overscanUniform || !pointMode || !time || buffers.some((buffer) => !buffer)) {
      throw new Error('Unable to initialize diagram artwork buffers.');
    }

    this.locations = {
      position: gl.getAttribLocation(program, 'a_position'),
      color: gl.getAttribLocation(program, 'a_color'),
      size: gl.getAttribLocation(program, 'a_size'),
      rotation,
      aspect,
      scale,
      overscan: overscanUniform,
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

  setRotation(x: number, y: number): void {
    this.targetRotation = { x, y };
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
    gl.uniform1f(this.locations.scale, this.sceneScale);
    gl.uniform1f(this.locations.overscan, this.overscan);
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
