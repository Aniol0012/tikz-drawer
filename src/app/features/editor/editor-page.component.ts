import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import packageManifest from '../../../../package.json';
import { sceneToStandaloneDocument } from './tikz.codegen';
import { EditorStore } from './editor.store';
import type { CanvasShape, LineShape, ObjectPreset, ScenePreset, ThemeMode } from './tikz.models';

type InspectorTab = 'properties' | 'code';
type LanguageCode = 'en' | 'ca';
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'from' | 'to';
type ContextTarget = 'canvas' | 'shape';

interface ToolDescriptor {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly iconPath: string;
}

interface SelectionBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

interface HandleDescriptor {
  readonly id: ResizeHandle;
  readonly x: number;
  readonly y: number;
  readonly cursor: string;
}

interface MoveInteractionState {
  readonly kind: 'move';
  readonly pointerId: number;
  readonly lastWorldPoint: {
    readonly x: number;
    readonly y: number;
  };
}

interface PanInteractionState {
  readonly kind: 'pan';
  readonly pointerId: number;
  readonly lastClientPoint: {
    readonly x: number;
    readonly y: number;
  };
}

interface ResizeInteractionState {
  readonly kind: 'resize';
  readonly pointerId: number;
  readonly handle: ResizeHandle;
  readonly initialShape: CanvasShape;
}

type InteractionState = MoveInteractionState | PanInteractionState | ResizeInteractionState;

interface ContextMenuState {
  readonly clientX: number;
  readonly clientY: number;
  readonly target: ContextTarget;
  readonly shapeId: string | null;
}

type TranslationKey =
  | 'brand'
  | 'searchComponents'
  | 'tools'
  | 'templates'
  | 'select'
  | 'properties'
  | 'tikzCode'
  | 'objects'
  | 'scene'
  | 'selectedObject'
  | 'noneSelected'
  | 'zoomOut'
  | 'zoomIn'
  | 'undo'
  | 'redo'
  | 'export'
  | 'copy'
  | 'download'
  | 'applyTikz'
  | 'sendToImport'
  | 'generatedCode'
  | 'importCode'
  | 'name'
  | 'stroke'
  | 'strokeWidth'
  | 'fill'
  | 'text'
  | 'fontSize'
  | 'color'
  | 'radius'
  | 'width'
  | 'height'
  | 'x'
  | 'y'
  | 'cx'
  | 'cy'
  | 'rx'
  | 'ry'
  | 'fromX'
  | 'fromY'
  | 'toX'
  | 'toY'
  | 'arrowStart'
  | 'arrowEnd'
  | 'showGrid'
  | 'showAxes'
  | 'snapToGrid'
  | 'canvasSettings'
  | 'startDrawing'
  | 'startDrawingHint'
  | 'duplicate'
  | 'delete'
  | 'bringToFront'
  | 'sendToBack'
  | 'nothingSelected'
  | 'selection'
  | 'codeWarnings'
  | 'language'
  | 'version';

const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
  en: {
    brand: 'TIKZ DRAWER',
    searchComponents: 'Search component',
    tools: 'Tools',
    templates: 'Templates',
    select: 'Select',
    properties: 'Properties',
    tikzCode: 'TikZ code',
    objects: 'Objects',
    scene: 'Scene',
    selectedObject: 'Selected object',
    noneSelected: 'None',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    undo: 'Undo',
    redo: 'Redo',
    export: 'Export',
    copy: 'Copy',
    download: 'Download',
    applyTikz: 'Apply TikZ',
    sendToImport: 'Send to import',
    generatedCode: 'Generated code',
    importCode: 'Import code',
    name: 'Name',
    stroke: 'Stroke',
    strokeWidth: 'Stroke width',
    fill: 'Fill',
    text: 'Text',
    fontSize: 'Font size',
    color: 'Color',
    radius: 'Radius',
    width: 'Width',
    height: 'Height',
    x: 'X',
    y: 'Y',
    cx: 'CX',
    cy: 'CY',
    rx: 'RX',
    ry: 'RY',
    fromX: 'From X',
    fromY: 'From Y',
    toX: 'To X',
    toY: 'To Y',
    arrowStart: 'Arrow start',
    arrowEnd: 'Arrow end',
    showGrid: 'Show grid',
    showAxes: 'Show axes',
    snapToGrid: 'Snap to grid',
    canvasSettings: 'Canvas settings',
    startDrawing: 'Start drawing on the canvas',
    startDrawingHint: 'Pick a tool or template and place elements directly on the workspace.',
    duplicate: 'Duplicate',
    delete: 'Delete',
    bringToFront: 'Bring to front',
    sendToBack: 'Send to back',
    nothingSelected: 'Nothing selected',
    selection: 'Selection',
    codeWarnings: 'Some lines were skipped:',
    language: 'Language',
    version: 'Version'
  },
  ca: {
    brand: 'TIKZ DRAWER',
    searchComponents: 'Cercar component',
    tools: 'Eines',
    templates: 'Plantilles',
    select: 'Seleccionar',
    properties: 'Propietats',
    tikzCode: 'Codi TikZ',
    objects: 'Objectes',
    scene: 'Escena',
    selectedObject: 'Objecte seleccionat',
    noneSelected: 'Cap',
    zoomOut: 'Allunyar',
    zoomIn: 'Apropar',
    undo: 'Desfer',
    redo: 'Refer',
    export: 'Exportar',
    copy: 'Copiar',
    download: 'Descarregar',
    applyTikz: 'Aplicar TikZ',
    sendToImport: "Enviar a l'importador",
    generatedCode: 'Codi generat',
    importCode: "Importar codi",
    name: 'Nom',
    stroke: 'Línia',
    strokeWidth: 'Gruix',
    fill: 'Farcit',
    text: 'Text',
    fontSize: 'Mida font',
    color: 'Color',
    radius: 'Radi',
    width: 'Amplada',
    height: 'Alçada',
    x: 'X',
    y: 'Y',
    cx: 'CX',
    cy: 'CY',
    rx: 'RX',
    ry: 'RY',
    fromX: 'Origen X',
    fromY: 'Origen Y',
    toX: 'Destí X',
    toY: 'Destí Y',
    arrowStart: 'Fletxa inici',
    arrowEnd: 'Fletxa final',
    showGrid: 'Mostrar graella',
    showAxes: 'Mostrar eixos',
    snapToGrid: 'Ajustar a graella',
    canvasSettings: 'Paràmetres del llenç',
    startDrawing: 'Comença a dibuixar al llenç',
    startDrawingHint: "Escull una eina o una plantilla i col·loca elements directament a l'espai de treball.",
    duplicate: 'Duplicar',
    delete: 'Eliminar',
    bringToFront: 'Portar al davant',
    sendToBack: 'Enviar al fons',
    nothingSelected: 'Res seleccionat',
    selection: 'Selecció',
    codeWarnings: "S'han ignorat algunes línies:",
    language: 'Idioma',
    version: 'Versió'
  }
};

const localizedPresetLabels: Record<
  LanguageCode,
  Record<string, { readonly title: string; readonly description: string }>
> = {
  en: {
    segment: { title: 'Segment', description: 'Straight line segment' },
    arrow: { title: 'Arrow', description: 'Directional line' },
    box: { title: 'Rectangle', description: 'Block or container' },
    circle: { title: 'Circle', description: 'Circular node' },
    ellipse: { title: 'Ellipse', description: 'Elliptic node' },
    label: { title: 'Text', description: 'Text label' },
    blank: { title: 'Blank board', description: 'Empty drawing surface' },
    'triangle-diagram': { title: 'Triangle diagram', description: 'Basic geometry scaffold' },
    'flow-starter': { title: 'Flow starter', description: 'Small flowchart starter' },
    'plot-callout': { title: 'Plot callout', description: 'Chart with annotation' }
  },
  ca: {
    segment: { title: 'Segment', description: 'Segment recte' },
    arrow: { title: 'Fletxa', description: 'Línia direccional' },
    box: { title: 'Rectangle', description: 'Bloc o contenidor' },
    circle: { title: 'Cercle', description: 'Node circular' },
    ellipse: { title: 'El·lipse', description: 'Node el·líptic' },
    label: { title: 'Text', description: 'Etiqueta de text' },
    blank: { title: 'Tauler buit', description: 'Superfície de dibuix buida' },
    'triangle-diagram': { title: 'Diagrama triangle', description: 'Base geomètrica simple' },
    'flow-starter': { title: 'Flux inicial', description: 'Esquelet de flux' },
    'plot-callout': { title: 'Gràfica anotada', description: 'Gràfica amb anotació' }
  }
};

const localizedShapeKinds: Record<LanguageCode, Record<CanvasShape['kind'], string>> = {
  en: { line: 'Line', rectangle: 'Rectangle', circle: 'Circle', ellipse: 'Ellipse', text: 'Text' },
  ca: { line: 'Línia', rectangle: 'Rectangle', circle: 'Cercle', ellipse: 'El·lipse', text: 'Text' }
};

const iconPaths = {
  select:
    'M5 4.5 18 12l-5.5 1.7 2.1 5.3-2.1 1L10.4 14 6.9 18.6 5 17.1 8.5 12.7 5 4.5Z',
  zoomOut: 'M4 11h10v2H4v-2Zm12.5 5.1 3.7 3.7-1.4 1.4-3.7-3.7 1.4-1.4ZM11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z',
  zoomIn:
    'M10 10V6h2v4h4v2h-4v4h-2v-4H6v-2h4Zm6.5 6.1 3.7 3.7-1.4 1.4-3.7-3.7 1.4-1.4ZM11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z',
  undo:
    'M7.4 7.4V4L1.9 9.5 7.4 15V11.6h5.4a3.6 3.6 0 1 1 0 7.2H8.5V21h4.3a5.8 5.8 0 1 0 0-11.6H7.4Z',
  redo:
    'M16.6 7.4V4l5.5 5.5-5.5 5.5v-3.4h-5.4a3.6 3.6 0 1 0 0 7.2h4.3V21h-4.3a5.8 5.8 0 1 1 0-11.6h5.4Z',
  github:
    'M12 1.5a10.5 10.5 0 0 0-3.32 20.47c.52.1.71-.22.71-.5v-1.75c-2.9.63-3.51-1.22-3.51-1.22-.48-1.2-1.17-1.53-1.17-1.53-.96-.66.08-.65.08-.65 1.06.07 1.62 1.08 1.62 1.08.94 1.61 2.46 1.14 3.06.87.1-.68.37-1.15.67-1.41-2.31-.26-4.75-1.15-4.75-5.13 0-1.13.4-2.05 1.06-2.77-.11-.26-.46-1.31.1-2.73 0 0 .87-.28 2.85 1.05a9.96 9.96 0 0 1 5.2 0c1.98-1.33 2.85-1.05 2.85-1.05.56 1.42.21 2.47.1 2.73.66.72 1.06 1.64 1.06 2.77 0 3.99-2.45 4.87-4.79 5.12.38.33.71.97.71 1.96v2.91c0 .28.19.61.72.5A10.5 10.5 0 0 0 12 1.5Z',
  segment: 'M4 18 18 6l2 2-14 12-2-2Z',
  arrow: 'M4 12h11.17l-3.58-3.59L13 7l6 6-6 6-1.41-1.41L15.17 14H4v-2Z',
  rectangle: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z',
  circle:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z',
  ellipse:
    'M12 5c-4.97 0-9 3.13-9 7s4.03 7 9 7 9-3.13 9-7-4.03-7-9-7Zm0 2c3.93 0 7 2.24 7 5s-3.07 5-7 5-7-2.24-7-5 3.07-5 7-5Z',
  text: 'M5 5h14v2H13v12h-2V7H5V5Z',
  blank: 'M5 5h14v14H5z',
  triangle: 'M12 5 4 19h16L12 5Zm0 4.1 4.54 7.9H7.46L12 9.1Z',
  flow: 'M4 7h6v4H4V7Zm10 0h6v4h-6V7ZM9 13h6v4H9v-4Zm-1-4h8v2H8V9Zm3 4V9h2v4h-2Z',
  plot:
    'M5 5h2v12h12v2H5V5Zm3 8.5 2.8-2.8 2.2 2.2 4-4L18.4 10l-5.4 5.4-2.2-2.2L9.4 14.6 8 13.5Z',
  sun:
    'M12 4.5a1 1 0 0 1 1 1V7a1 1 0 1 1-2 0V5.5a1 1 0 0 1 1-1Zm0 12a1 1 0 0 1 1 1V19a1 1 0 1 1-2 0v-1.5a1 1 0 0 1 1-1Zm7.5-5.5a1 1 0 0 1 0 2H18a1 1 0 1 1 0-2h1.5ZM7 12a1 1 0 0 1-1 1H4.5a1 1 0 1 1 0-2H6a1 1 0 0 1 1 1Zm8.3-4.89a1 1 0 0 1 1.4-1.41l1.06 1.06a1 1 0 1 1-1.41 1.41L15.3 7.11Zm-8.01 8.02a1 1 0 0 1 1.41 0l1.06 1.06a1 1 0 0 1-1.41 1.41l-1.06-1.06a1 1 0 0 1 0-1.41Zm9.47.94a1 1 0 0 1 0-1.41l1.06-1.06a1 1 0 1 1 1.41 1.41l-1.06 1.06a1 1 0 0 1-1.41 0ZM8.35 8.17a1 1 0 0 1-1.41 0L5.88 7.11A1 1 0 0 1 7.3 5.7l1.06 1.06a1 1 0 0 1 0 1.41ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z',
  moon:
    'M14.7 3.1a8 8 0 1 0 6.2 11.8 8.5 8.5 0 1 1-6.2-11.8Z',
  copy: 'M8 8h11v12H8V8Zm-3-4h11v2H7v10H5V4Z',
  trash:
    'M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Z',
  upload:
    'M12 3 7.5 7.5l1.4 1.4L11 6.8V16h2V6.8l2.1 2.1 1.4-1.4L12 3Zm-7 14h14v4H5v-4Z',
  download:
    'M11 4h2v9.17l2.09-2.08 1.41 1.41L12 17l-4.5-4.5 1.41-1.41L11 13.17V4Zm-6 14h14v2H5v-2Z'
} satisfies Record<string, string>;

const getIconPath = (key: string): string => iconPaths[key as keyof typeof iconPaths] ?? iconPaths['rectangle'];
const detectLanguage = (): LanguageCode => (globalThis.navigator?.language?.toLowerCase().startsWith('ca') ? 'ca' : 'en');

@Component({
  selector: 'app-editor-page',
  templateUrl: './editor-page.component.html',
  styleUrl: './editor-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [EditorStore],
  host: {
    '[attr.data-theme]': 'store.preferences().theme',
    '(window:keydown)': 'handleWindowKeydown($event)',
    '(window:keyup)': 'handleWindowKeyup($event)',
    '(window:blur)': 'handleWindowBlur()'
  }
})
export class EditorPageComponent {
  readonly store = inject(EditorStore);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly canvasSvg = viewChild.required<ElementRef<SVGSVGElement>>('canvasSvg');
  readonly canvasViewport = viewChild.required<ElementRef<HTMLDivElement>>('canvasViewport');

  readonly appVersion = packageManifest.version;
  readonly scene = this.store.scene;
  readonly preferences = this.store.preferences;
  readonly selectedShape = this.store.selectedShape;
  readonly exportedCode = this.store.exportedCode;
  readonly parserWarnings = this.store.parserWarnings;
  readonly objectPresets = this.store.objectPresets;
  readonly scenePresets = this.store.scenePresets;
  readonly objectCount = this.store.objectCount;
  readonly canUndo = this.store.canUndo;
  readonly canRedo = this.store.canRedo;

  readonly language = signal<LanguageCode>(detectLanguage());
  readonly inspectorTab = signal<InspectorTab>('properties');
  readonly toolSearchValue = signal('');
  readonly viewportCenter = signal({ x: 0, y: 0 });
  readonly canvasWidth = signal(1280);
  readonly canvasHeight = signal(840);
  readonly interactionState = signal<InteractionState | null>(null);
  readonly contextMenu = signal<ContextMenuState | null>(null);
  readonly spacePressed = signal(false);

  readonly zoomPercent = computed(() => Math.round((this.preferences().scale / 42) * 100));
  readonly selectedSummary = computed(() => this.selectedShape()?.name ?? this.t('nothingSelected'));
  readonly visibleWorldBounds = computed(() => {
    const scale = this.preferences().scale;
    const halfWidth = this.canvasWidth() / 2 / scale;
    const halfHeight = this.canvasHeight() / 2 / scale;
    const viewportCenter = this.viewportCenter();

    return {
      left: viewportCenter.x - halfWidth,
      right: viewportCenter.x + halfWidth,
      top: viewportCenter.y + halfHeight,
      bottom: viewportCenter.y - halfHeight
    };
  });
  readonly primaryTools = computed<readonly ToolDescriptor[]>(() =>
    this.objectPresets.map((preset) => ({
      id: preset.id,
      label: this.localizedPresetTitle(preset.id, preset.title),
      description: this.localizedPresetDescription(preset.id, preset.description),
      iconPath: getIconPath(preset.icon)
    }))
  );
  readonly filteredPrimaryTools = computed(() => {
    const searchValue = this.toolSearchValue().trim().toLowerCase();
    return !searchValue
      ? this.primaryTools()
      : this.primaryTools().filter(
          (tool) => tool.label.toLowerCase().includes(searchValue) || tool.description.toLowerCase().includes(searchValue)
        );
  });
  readonly layerShapes = computed(() => [...this.scene().shapes].reverse());
  readonly selectionBounds = computed<SelectionBounds | null>(() => {
    const selectedShape = this.selectedShape();

    if (!selectedShape) {
      return null;
    }

    switch (selectedShape.kind) {
      case 'rectangle':
        return { left: selectedShape.x, right: selectedShape.x + selectedShape.width, bottom: selectedShape.y, top: selectedShape.y + selectedShape.height };
      case 'circle':
        return { left: selectedShape.cx - selectedShape.r, right: selectedShape.cx + selectedShape.r, bottom: selectedShape.cy - selectedShape.r, top: selectedShape.cy + selectedShape.r };
      case 'ellipse':
        return { left: selectedShape.cx - selectedShape.rx, right: selectedShape.cx + selectedShape.rx, bottom: selectedShape.cy - selectedShape.ry, top: selectedShape.cy + selectedShape.ry };
      case 'line':
        return {
          left: Math.min(selectedShape.from.x, selectedShape.to.x),
          right: Math.max(selectedShape.from.x, selectedShape.to.x),
          bottom: Math.min(selectedShape.from.y, selectedShape.to.y),
          top: Math.max(selectedShape.from.y, selectedShape.to.y)
        };
      case 'text': {
        const estimatedWidth = Math.max(selectedShape.text.length * selectedShape.fontSize * 0.48, selectedShape.fontSize);
        const estimatedHeight = selectedShape.fontSize * 0.72;
        return {
          left: selectedShape.x - estimatedWidth / 2,
          right: selectedShape.x + estimatedWidth / 2,
          bottom: selectedShape.y - estimatedHeight / 2,
          top: selectedShape.y + estimatedHeight / 2
        };
      }
    }
  });
  readonly selectionHandles = computed<readonly HandleDescriptor[]>(() => {
    const selectedShape = this.selectedShape();

    if (!selectedShape) {
      return [];
    }

    if (selectedShape.kind === 'line') {
      return [
        { id: 'from', x: this.toSvgX(selectedShape.from.x), y: this.toSvgY(selectedShape.from.y), cursor: 'crosshair' },
        { id: 'to', x: this.toSvgX(selectedShape.to.x), y: this.toSvgY(selectedShape.to.y), cursor: 'crosshair' }
      ];
    }

    if (selectedShape.kind === 'text') {
      return [];
    }

    const selectionBounds = this.selectionBounds();

    if (!selectionBounds) {
      return [];
    }

    const centerX = (selectionBounds.left + selectionBounds.right) / 2;
    const centerY = (selectionBounds.top + selectionBounds.bottom) / 2;

    return [
      { id: 'nw', x: this.toSvgX(selectionBounds.left), y: this.toSvgY(selectionBounds.top), cursor: 'nwse-resize' },
      { id: 'n', x: this.toSvgX(centerX), y: this.toSvgY(selectionBounds.top), cursor: 'ns-resize' },
      { id: 'ne', x: this.toSvgX(selectionBounds.right), y: this.toSvgY(selectionBounds.top), cursor: 'nesw-resize' },
      { id: 'e', x: this.toSvgX(selectionBounds.right), y: this.toSvgY(centerY), cursor: 'ew-resize' },
      { id: 'se', x: this.toSvgX(selectionBounds.right), y: this.toSvgY(selectionBounds.bottom), cursor: 'nwse-resize' },
      { id: 's', x: this.toSvgX(centerX), y: this.toSvgY(selectionBounds.bottom), cursor: 'ns-resize' },
      { id: 'sw', x: this.toSvgX(selectionBounds.left), y: this.toSvgY(selectionBounds.bottom), cursor: 'nesw-resize' },
      { id: 'w', x: this.toSvgX(selectionBounds.left), y: this.toSvgY(centerY), cursor: 'ew-resize' }
    ];
  });
  readonly iconPaths = iconPaths;

  constructor() {
    afterNextRender(() => {
      const updateCanvasSize = () => {
        const hostElement = this.canvasViewport().nativeElement;
        this.canvasWidth.set(Math.max(320, Math.round(hostElement.clientWidth)));
        this.canvasHeight.set(Math.max(320, Math.round(hostElement.clientHeight)));
      };

      const resizeObserver = new ResizeObserver(() => updateCanvasSize());
      resizeObserver.observe(this.canvasViewport().nativeElement);
      updateCanvasSize();
      this.destroyRef.onDestroy(() => resizeObserver.disconnect());
    });
  }

  t(key: TranslationKey): string {
    return translations[this.language()][key];
  }

  setLanguage(language: LanguageCode): void {
    this.language.set(language);
  }

  setTheme(theme: ThemeMode): void {
    this.store.setTheme(theme);
  }

  toggleTheme(): void {
    this.setTheme(this.preferences().theme === 'dark' ? 'light' : 'dark');
  }

  selectShape(shapeId: string | null): void {
    this.closeContextMenu();
    this.inspectorTab.set('properties');
    this.store.selectShape(shapeId);
  }

  addPreset(presetId: string): void {
    this.runSceneMutation(() => {
      this.store.addShapeFromPreset(presetId);
      this.inspectorTab.set('properties');
    });
  }

  applyScenePreset(presetId: string): void {
    this.runSceneMutation(() => {
      this.store.applyScenePreset(presetId);
      this.inspectorTab.set('properties');
      this.viewportCenter.set({ x: 0, y: 0 });
    });
  }

  setInspectorTab(tab: InspectorTab): void {
    this.inspectorTab.set(tab);
  }

  onToolSearchInput(event: Event): void {
    this.toolSearchValue.set((event.target as HTMLInputElement).value);
  }

  onSceneNameInput(event: Event): void {
    this.runSceneMutation(() => {
      this.store.renameScene((event.target as HTMLInputElement).value);
    });
  }

  onBooleanPreferenceChange(key: 'snapToGrid' | 'showGrid' | 'showAxes', event: Event): void {
    this.runSceneMutation(() => {
      this.store.patchPreferences({ [key]: (event.target as HTMLInputElement).checked });
    });
  }

  zoomIn(): void {
    this.setScaleFromViewportCenter(this.preferences().scale + 6);
  }

  zoomOut(): void {
    this.setScaleFromViewportCenter(this.preferences().scale - 6);
  }

  resetZoom(): void {
    this.setScaleFromViewportCenter(42);
  }

  undo(): void {
    this.closeContextMenu();
    this.store.undo();
  }

  redo(): void {
    this.closeContextMenu();
    this.store.redo();
  }

  removeSelected(): void {
    this.runSceneMutation(() => {
      this.store.removeSelected();
    });
  }

  duplicateSelected(): void {
    this.runSceneMutation(() => {
      this.store.duplicateSelected();
    });
  }

  bringSelectedToFront(): void {
    this.runSceneMutation(() => {
      this.store.bringSelectedToFront();
    });
  }

  sendSelectedToBack(): void {
    this.runSceneMutation(() => {
      this.store.sendSelectedToBack();
    });
  }

  updateShapeText(key: 'name' | 'stroke' | 'fill' | 'text' | 'color', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.runSceneMutation(() => {
      this.store.patchSelectedShape((shape) => ({ ...shape, [key]: value }) as CanvasShape);
    });
  }

  updateShapeNumber(
    key: 'strokeWidth' | 'x' | 'y' | 'width' | 'height' | 'cornerRadius' | 'cx' | 'cy' | 'r' | 'rx' | 'ry' | 'fontSize',
    event: Event
  ): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.runSceneMutation(() => {
      this.store.patchSelectedShape((shape) => ({ ...shape, [key]: value }) as CanvasShape);
    });
  }

  updateShapeBoolean(key: 'arrowStart' | 'arrowEnd', event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.runSceneMutation(() => {
      this.store.patchSelectedShape((shape) => ({ ...shape, [key]: value }) as CanvasShape);
    });
  }

  updateLinePoint(target: 'from' | 'to', axis: 'x' | 'y', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    this.runSceneMutation(() => {
      this.store.patchSelectedShape((shape) => {
        if (shape.kind !== 'line') {
          return shape;
        }

        const currentPoint = shape[target];
        return {
          ...shape,
          [target]: {
            ...currentPoint,
            [axis]: value
          }
        } as LineShape;
      });
    });
  }

  onImportCodeInput(event: Event): void {
    this.store.updateImportCode((event.target as HTMLTextAreaElement).value);
  }

  applyImportCode(): void {
    this.runSceneMutation(() => {
      this.store.applyImportCode();
      this.inspectorTab.set('code');
    });
  }

  syncImportWithExport(): void {
    this.store.useExportedCodeAsImport();
    this.inspectorTab.set('code');
  }

  copyExportedCode(): void {
    void navigator.clipboard?.writeText(this.exportedCode());
  }

  downloadStandaloneFile(): void {
    const blob = new Blob([sceneToStandaloneDocument(this.scene())], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = 'figure.tex';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  openCanvasContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu.set({ clientX: event.clientX, clientY: event.clientY, target: 'canvas', shapeId: this.selectedShape()?.id ?? null });
  }

  openShapeContextMenu(event: MouseEvent, shape: CanvasShape): void {
    event.preventDefault();
    event.stopPropagation();
    this.store.selectShape(shape.id);
    this.inspectorTab.set('properties');
    this.contextMenu.set({ clientX: event.clientX, clientY: event.clientY, target: 'shape', shapeId: shape.id });
  }

  closeContextMenu(): void {
    this.contextMenu.set(null);
  }

  runContextAction(action: 'duplicate' | 'delete' | 'front' | 'back'): void {
    if (!this.selectedShape()) {
      this.closeContextMenu();
      return;
    }

    switch (action) {
      case 'duplicate':
        this.duplicateSelected();
        break;
      case 'delete':
        this.removeSelected();
        break;
      case 'front':
        this.bringSelectedToFront();
        break;
      case 'back':
        this.sendSelectedToBack();
        break;
    }

    this.closeContextMenu();
  }

  onCanvasViewportPointerDown(event: PointerEvent): void {
    this.closeContextMenu();

    if (event.button === 1 || (event.button === 0 && this.spacePressed())) {
      event.preventDefault();
      this.interactionState.set({
        kind: 'pan',
        pointerId: event.pointerId,
        lastClientPoint: { x: event.clientX, y: event.clientY }
      });
      this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
    }
  }

  startMove(event: PointerEvent, shape: CanvasShape): void {
    if (event.button !== 0 || this.spacePressed()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.store.recordHistoryCheckpoint();
    this.store.selectShape(shape.id);
    this.inspectorTab.set('properties');
    this.interactionState.set({
      kind: 'move',
      pointerId: event.pointerId,
      lastWorldPoint: this.toScenePoint(event.clientX, event.clientY)
    });
    this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
  }

  startResize(event: PointerEvent, handle: ResizeHandle): void {
    const selectedShape = this.selectedShape();

    if (!selectedShape || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.store.recordHistoryCheckpoint();
    this.interactionState.set({
      kind: 'resize',
      pointerId: event.pointerId,
      handle,
      initialShape: structuredClone(selectedShape)
    });
    this.canvasSvg().nativeElement.setPointerCapture(event.pointerId);
  }

  onCanvasPointerMove(event: PointerEvent): void {
    const interactionState = this.interactionState();

    if (!interactionState || interactionState.pointerId !== event.pointerId) {
      return;
    }

    if (interactionState.kind === 'move') {
      const nextWorldPoint = this.toScenePoint(event.clientX, event.clientY);
      const deltaX = this.snap(nextWorldPoint.x - interactionState.lastWorldPoint.x);
      const deltaY = this.snap(nextWorldPoint.y - interactionState.lastWorldPoint.y);

      if (deltaX !== 0 || deltaY !== 0) {
        this.store.moveSelectedBy(deltaX, deltaY);
        this.interactionState.set({ ...interactionState, lastWorldPoint: nextWorldPoint });
      }

      return;
    }

    if (interactionState.kind === 'pan') {
      const deltaClientX = event.clientX - interactionState.lastClientPoint.x;
      const deltaClientY = event.clientY - interactionState.lastClientPoint.y;
      const scale = this.preferences().scale;

      this.viewportCenter.update((viewportCenter) => ({
        x: viewportCenter.x - deltaClientX / scale,
        y: viewportCenter.y + deltaClientY / scale
      }));
      this.interactionState.set({ ...interactionState, lastClientPoint: { x: event.clientX, y: event.clientY } });
      return;
    }

    const resizedShape = this.resizeShape(
      interactionState.initialShape,
      interactionState.handle,
      this.snapScenePoint(this.toScenePoint(event.clientX, event.clientY))
    );

    this.store.patchSelectedShape(() => resizedShape);
  }

  endInteraction(event: PointerEvent): void {
    const interactionState = this.interactionState();

    if (!interactionState || interactionState.pointerId !== event.pointerId) {
      return;
    }

    if (this.canvasSvg().nativeElement.hasPointerCapture(event.pointerId)) {
      this.canvasSvg().nativeElement.releasePointerCapture(event.pointerId);
    }

    this.interactionState.set(null);
  }

  onCanvasWheel(event: WheelEvent): void {
    event.preventDefault();
    const nextScale = this.preferences().scale + (event.deltaY < 0 ? 4 : -4);
    this.setScaleAtClientPoint(nextScale, event.clientX, event.clientY);
  }

  onCanvasBackgroundClick(): void {
    this.selectShape(null);
  }

  toSvgX(x: number): number {
    return this.canvasWidth() / 2 + (x - this.viewportCenter().x) * this.preferences().scale;
  }

  toSvgY(y: number): number {
    return this.canvasHeight() / 2 - (y - this.viewportCenter().y) * this.preferences().scale;
  }

  shapeTrackBy(_: number, shape: CanvasShape): string {
    return shape.id;
  }

  presetTrackBy(_: number, preset: ObjectPreset | ScenePreset): string {
    return preset.id;
  }

  handleTrackBy(_: number, handle: HandleDescriptor): string {
    return handle.id;
  }

  gridColumns(): number[] {
    const visibleWorldBounds = this.visibleWorldBounds();
    const start = Math.floor(visibleWorldBounds.left) - 1;
    const end = Math.ceil(visibleWorldBounds.right) + 1;
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  gridRows(): number[] {
    const visibleWorldBounds = this.visibleWorldBounds();
    const start = Math.floor(visibleWorldBounds.bottom) - 1;
    const end = Math.ceil(visibleWorldBounds.top) + 1;
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  shapeIcon(shape: CanvasShape): string {
    return getIconPath(shape.kind === 'line' && shape.arrowEnd ? 'arrow' : shape.kind === 'line' ? 'segment' : shape.kind);
  }

  presetIconPath(icon: string): string {
    return getIconPath(icon);
  }

  scaledStrokeWidth(strokeWidth: number): number {
    return Math.max(strokeWidth * this.preferences().scale * 0.05, 1);
  }

  localizedScenePresetTitle(preset: ScenePreset): string {
    return this.localizedPresetTitle(preset.id, preset.title);
  }

  localizedScenePresetDescription(preset: ScenePreset): string {
    return this.localizedPresetDescription(preset.id, preset.description);
  }

  localizedShapeKind(kind: CanvasShape['kind']): string {
    return localizedShapeKinds[this.language()][kind];
  }

  selectionOutline(): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } | null {
    const selectionBounds = this.selectionBounds();

    if (!selectionBounds) {
      return null;
    }

    return {
      x: this.toSvgX(selectionBounds.left),
      y: this.toSvgY(selectionBounds.top),
      width: (selectionBounds.right - selectionBounds.left) * this.preferences().scale,
      height: (selectionBounds.top - selectionBounds.bottom) * this.preferences().scale
    };
  }

  lineSelectionPath(): string | null {
    const selectedShape = this.selectedShape();
    return selectedShape && selectedShape.kind === 'line'
      ? `M ${this.toSvgX(selectedShape.from.x)} ${this.toSvgY(selectedShape.from.y)} L ${this.toSvgX(selectedShape.to.x)} ${this.toSvgY(selectedShape.to.y)}`
      : null;
  }

  handleWindowKeydown(event: KeyboardEvent): void {
    if (event.key === ' ') {
      this.spacePressed.set(true);
      if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
      }
    }

    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && event.shiftKey) {
      event.preventDefault();
      this.redo();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || event.key.toLowerCase() === 'z')) {
      event.preventDefault();
      event.shiftKey ? this.redo() : this.undo();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.duplicateSelected();
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'delete':
      case 'backspace':
        this.removeSelected();
        return;
      case 'escape':
        this.selectShape(null);
        this.closeContextMenu();
        return;
      case '=':
      case '+':
        this.zoomIn();
        return;
      case '-':
        this.zoomOut();
        return;
      case 'g':
        this.runSceneMutation(() => {
          this.store.patchPreferences({ showGrid: !this.preferences().showGrid });
        });
        return;
    }
  }

  handleWindowKeyup(event: KeyboardEvent): void {
    if (event.key === ' ') {
      this.spacePressed.set(false);
    }
  }

  handleWindowBlur(): void {
    this.spacePressed.set(false);
    this.interactionState.set(null);
  }

  private runSceneMutation(action: () => void): void {
    this.closeContextMenu();
    this.store.recordHistoryCheckpoint();
    action();
  }

  private localizedPresetTitle(id: string, fallback: string): string {
    return localizedPresetLabels[this.language()][id]?.title ?? fallback;
  }

  private localizedPresetDescription(id: string, fallback: string): string {
    return localizedPresetLabels[this.language()][id]?.description ?? fallback;
  }

  private setScaleFromViewportCenter(nextScale: number): void {
    const viewportRect = this.canvasViewport().nativeElement.getBoundingClientRect();
    this.setScaleAtClientPoint(nextScale, viewportRect.left + viewportRect.width / 2, viewportRect.top + viewportRect.height / 2);
  }

  private setScaleAtClientPoint(nextScale: number, clientX: number, clientY: number): void {
    const clampedScale = Math.min(144, Math.max(18, Math.round(nextScale)));
    const currentScale = this.preferences().scale;

    if (clampedScale === currentScale) {
      return;
    }

    const viewportRect = this.canvasViewport().nativeElement.getBoundingClientRect();
    const offsetX = clientX - viewportRect.left - viewportRect.width / 2;
    const offsetY = viewportRect.height / 2 - (clientY - viewportRect.top);
    const viewportCenter = this.viewportCenter();
    const worldX = viewportCenter.x + offsetX / currentScale;
    const worldY = viewportCenter.y + offsetY / currentScale;

    this.store.patchPreferences({ scale: clampedScale });
    this.viewportCenter.set({ x: worldX - offsetX / clampedScale, y: worldY - offsetY / clampedScale });
  }

  private toScenePoint(clientX: number, clientY: number): { x: number; y: number } {
    const viewportRect = this.canvasViewport().nativeElement.getBoundingClientRect();
    return {
      x: this.viewportCenter().x + (clientX - viewportRect.left - viewportRect.width / 2) / this.preferences().scale,
      y: this.viewportCenter().y + (viewportRect.height / 2 - (clientY - viewportRect.top)) / this.preferences().scale
    };
  }

  private snap(value: number): number {
    return this.preferences().snapToGrid ? Math.round(value * 2) / 2 : value;
  }

  private snapScenePoint(point: { x: number; y: number }): { x: number; y: number } {
    return { x: this.snap(point.x), y: this.snap(point.y) };
  }

  private resizeShape(shape: CanvasShape, handle: ResizeHandle, point: { x: number; y: number }): CanvasShape {
    switch (shape.kind) {
      case 'rectangle':
        return this.resizeRectangle(shape, handle, point);
      case 'circle':
        return this.resizeCircle(shape, handle, point);
      case 'ellipse':
        return this.resizeEllipse(shape, handle, point);
      case 'line':
        return this.resizeLine(shape, handle, point);
      case 'text':
        return shape;
    }
  }

  private resizeRectangle(shape: Extract<CanvasShape, { kind: 'rectangle' }>, handle: ResizeHandle, point: { x: number; y: number }): CanvasShape {
    const selectionBounds = this.resizeBounds({ left: shape.x, right: shape.x + shape.width, bottom: shape.y, top: shape.y + shape.height }, handle, point, 0.4, 0.4);
    return { ...shape, x: selectionBounds.left, y: selectionBounds.bottom, width: selectionBounds.right - selectionBounds.left, height: selectionBounds.top - selectionBounds.bottom };
  }

  private resizeCircle(shape: Extract<CanvasShape, { kind: 'circle' }>, handle: ResizeHandle, point: { x: number; y: number }): CanvasShape {
    const selectionBounds = this.resizeBounds({ left: shape.cx - shape.r, right: shape.cx + shape.r, bottom: shape.cy - shape.r, top: shape.cy + shape.r }, handle, point, 0.2, 0.2);
    const centerX = (selectionBounds.left + selectionBounds.right) / 2;
    const centerY = (selectionBounds.top + selectionBounds.bottom) / 2;
    const radius = Math.max((selectionBounds.right - selectionBounds.left) / 2, (selectionBounds.top - selectionBounds.bottom) / 2, 0.1);
    return { ...shape, cx: centerX, cy: centerY, r: radius };
  }

  private resizeEllipse(shape: Extract<CanvasShape, { kind: 'ellipse' }>, handle: ResizeHandle, point: { x: number; y: number }): CanvasShape {
    const selectionBounds = this.resizeBounds({ left: shape.cx - shape.rx, right: shape.cx + shape.rx, bottom: shape.cy - shape.ry, top: shape.cy + shape.ry }, handle, point, 0.2, 0.2);
    return {
      ...shape,
      cx: (selectionBounds.left + selectionBounds.right) / 2,
      cy: (selectionBounds.top + selectionBounds.bottom) / 2,
      rx: Math.max((selectionBounds.right - selectionBounds.left) / 2, 0.1),
      ry: Math.max((selectionBounds.top - selectionBounds.bottom) / 2, 0.1)
    };
  }

  private resizeLine(shape: Extract<CanvasShape, { kind: 'line' }>, handle: ResizeHandle, point: { x: number; y: number }): CanvasShape {
    return handle === 'from' ? { ...shape, from: point } : handle === 'to' ? { ...shape, to: point } : shape;
  }

  private resizeBounds(selectionBounds: SelectionBounds, handle: ResizeHandle, point: { x: number; y: number }, minimumWidth: number, minimumHeight: number): SelectionBounds {
    let left = selectionBounds.left;
    let right = selectionBounds.right;
    let top = selectionBounds.top;
    let bottom = selectionBounds.bottom;

    if (handle.includes('w')) left = Math.min(point.x, right - minimumWidth);
    if (handle.includes('e')) right = Math.max(point.x, left + minimumWidth);
    if (handle.includes('n')) top = Math.max(point.y, bottom + minimumHeight);
    if (handle.includes('s')) bottom = Math.min(point.y, top - minimumHeight);

    return { left, right, top, bottom };
  }
}
