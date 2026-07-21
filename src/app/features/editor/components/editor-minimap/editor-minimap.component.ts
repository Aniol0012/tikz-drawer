import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output, computed, signal, viewChild, type ElementRef } from '@angular/core';
import {
  MINIMAP_MIN_IMAGE_DIMENSION,
  MINIMAP_MIN_RADIUS,
  MINIMAP_MIN_TEXT_HEIGHT,
  LINE_DASHED_PATTERN,
  LINE_DASH_DOTTED_PATTERN,
  LINE_DOTTED_PATTERN,
  LINE_LOOSELY_DASHED_PATTERN
} from '../../constants/editor.constants';
import type { CanvasShape, LineShape, LineStrokeStyle, Point, TextAlign, TextShape } from '../../models/tikz.models';
import type { SelectionBounds } from '../../utils/editor-page.utils';
import { arrowMarkerFill, arrowMarkerGeometry, zoomScaledArrowStrokeWidth } from '../../utils/editor-arrow.utils';
import {
  buildLinePath,
  buildTrianglePath,
  computeBounds,
  effectiveRectangleCornerRadius,
  effectiveTriangleCornerRadius
} from '../../utils/editor-geometry.utils';
import { displayTextLinesForShape, textLeftForWidth } from '../../utils/text.utils';

type SvgTextAnchor = 'start' | 'middle' | 'end';
type LineEndpoint = 'from' | 'to';

interface MinimapRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface MinimapArrowShape {
  readonly path: string;
  readonly transform: string;
  readonly fill: string;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly lineJoin: 'round' | 'miter';
  readonly lineCap: 'round' | 'butt';
}

interface MinimapShapeBase {
  readonly kind: CanvasShape['kind'];
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly dashArray?: string;
}

interface MinimapLineShape extends MinimapShapeBase {
  readonly kind: 'line';
  readonly path: string;
  readonly dashArray?: string;
  readonly arrowStart?: MinimapArrowShape;
  readonly arrowEnd?: MinimapArrowShape;
}

interface MinimapRectangleShape extends MinimapShapeBase {
  readonly kind: 'rectangle';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
  readonly rx: number;
}

interface MinimapTriangleShape extends MinimapShapeBase {
  readonly kind: 'triangle';
  readonly path: string;
  readonly fill: string;
}

interface MinimapCircleShape extends MinimapShapeBase {
  readonly kind: 'circle';
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly fill: string;
}

interface MinimapEllipseShape extends MinimapShapeBase {
  readonly kind: 'ellipse';
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly fill: string;
}

interface MinimapTextShape extends MinimapShapeBase {
  readonly kind: 'text';
  readonly x: number;
  readonly y: number;
  readonly lines: readonly string[];
  readonly fontSize: number;
  readonly fill: string;
  readonly fillOpacity: number;
  readonly textAnchor: SvgTextAnchor;
  readonly fontWeight: TextShape['fontWeight'];
  readonly fontStyle: TextShape['fontStyle'];
  readonly textDecoration: TextShape['textDecoration'];
  readonly transform: string | null;
}

interface MinimapImageShape extends MinimapShapeBase {
  readonly kind: 'image';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly opacity: number;
  readonly href: string;
}

type MinimapShape =
  MinimapLineShape | MinimapRectangleShape | MinimapTriangleShape | MinimapCircleShape | MinimapEllipseShape | MinimapTextShape | MinimapImageShape;

interface MinimapOverview {
  readonly viewBoxWidth: number;
  readonly viewBoxHeight: number;
  readonly viewportRect: MinimapRect;
  readonly worldLeft: number;
  readonly worldTop: number;
  readonly mapScale: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly shapes: readonly MinimapShape[];
}

@Component({
  selector: 'app-editor-minimap',
  templateUrl: './editor-minimap.component.html',
  styleUrl: './editor-minimap.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorMinimapComponent {
  private readonly shapesValue = signal<readonly CanvasShape[]>([]);
  private readonly visibleBoundsValue = signal<SelectionBounds>({ left: 0, right: 0, bottom: 0, top: 0 });
  private readonly canvasWidthValue = signal(1);
  private readonly canvasHeightValue = signal(1);
  private readonly scaleValue = signal(1);
  private readonly defaultScaleValue = signal(1);
  private readonly mobileLayoutValue = signal(false);
  private readonly overlayLayoutValue = signal(false);

  @Input({ required: true }) set shapes(value: readonly CanvasShape[]) {
    this.shapesValue.set(value);
  }

  @Input({ required: true }) set visibleBounds(value: SelectionBounds) {
    this.visibleBoundsValue.set(value);
  }

  @Input({ required: true }) set canvasWidth(value: number) {
    this.canvasWidthValue.set(value);
  }

  @Input({ required: true }) set canvasHeight(value: number) {
    this.canvasHeightValue.set(value);
  }

  @Input({ required: true }) set scale(value: number) {
    this.scaleValue.set(value);
  }

  @Input({ required: true }) set defaultScale(value: number) {
    this.defaultScaleValue.set(value);
  }

  @Input() set mobileLayout(value: boolean) {
    this.mobileLayoutValue.set(value);
  }

  @Input() set overlayLayout(value: boolean) {
    this.overlayLayoutValue.set(value);
  }

  @Output() readonly viewportCenterChange = new EventEmitter<Point>();

  private readonly minimapSvg = viewChild<ElementRef<SVGSVGElement>>('minimapSvg');
  private readonly minimapPanPointerId = signal<number | null>(null);

  readonly sceneContentBounds = computed(() => computeBounds(this.shapesValue()));
  readonly frame = computed(() => {
    const aspectRatio = this.canvasWidthValue() / Math.max(this.canvasHeightValue(), 1);
    const width = Math.min(240, Math.max(132, Math.round(this.canvasWidthValue() * 0.12)));
    const height = Math.min(180, Math.max(96, Math.round(width / Math.max(aspectRatio, 0.35))));
    return { width, height };
  });
  readonly overview = computed<MinimapOverview | null>(() => {
    const sceneBounds = this.sceneContentBounds();
    if (!sceneBounds) {
      return null;
    }

    const visibleBounds = this.visibleBoundsValue();
    const padding = 1.5;
    const left = Math.min(sceneBounds.left, visibleBounds.left) - padding;
    const right = Math.max(sceneBounds.right, visibleBounds.right) + padding;
    const bottom = Math.min(sceneBounds.bottom, visibleBounds.bottom) - padding;
    const top = Math.max(sceneBounds.top, visibleBounds.top) + padding;
    const width = Math.max(right - left, 1);
    const height = Math.max(top - bottom, 1);
    const frame = this.frame();
    const scaleX = frame.width / width;
    const scaleY = frame.height / height;
    const mapScale = Math.min(scaleX, scaleY);
    const contentWidth = width * mapScale;
    const contentHeight = height * mapScale;
    const offsetX = (frame.width - contentWidth) / 2;
    const offsetY = (frame.height - contentHeight) / 2;
    const toMapX = (x: number): number => offsetX + (x - left) * mapScale;
    const toMapY = (y: number): number => offsetY + (top - y) * mapScale;
    const toMapRect = (bounds: SelectionBounds): MinimapRect => ({
      x: toMapX(bounds.left),
      y: toMapY(bounds.top),
      width: Math.max((bounds.right - bounds.left) * mapScale, 1.6),
      height: Math.max((bounds.top - bounds.bottom) * mapScale, 1.6)
    });

    return {
      viewBoxWidth: frame.width,
      viewBoxHeight: frame.height,
      worldLeft: left,
      worldTop: top,
      mapScale,
      offsetX,
      offsetY,
      viewportRect: toMapRect(visibleBounds),
      shapes: this.shapesValue().map((shape) => this.toMinimapShape(shape, toMapX, toMapY, mapScale))
    };
  });
  readonly visible = computed(() => {
    if (this.mobileLayoutValue() || this.overlayLayoutValue()) {
      return false;
    }

    const sceneBounds = this.sceneContentBounds();
    if (!sceneBounds) {
      return false;
    }

    const visibleBounds = this.visibleBoundsValue();
    const sceneFitsInView =
      sceneBounds.left >= visibleBounds.left &&
      sceneBounds.right <= visibleBounds.right &&
      sceneBounds.bottom >= visibleBounds.bottom &&
      sceneBounds.top <= visibleBounds.top;
    return !sceneFitsInView || this.scaleValue() > this.defaultScaleValue() + 8;
  });

  startMinimapPan(event: PointerEvent, overview: MinimapOverview): void {
    event.preventDefault();
    event.stopPropagation();
    this.minimapPanPointerId.set(event.pointerId);
    this.updateViewportFromPointer(event.clientX, event.clientY, overview, event.currentTarget instanceof SVGSVGElement ? event.currentTarget : undefined);
  }

  @HostListener('window:pointermove', ['$event'])
  handleWindowPointerMove(event: PointerEvent): void {
    if (this.minimapPanPointerId() !== event.pointerId) {
      return;
    }

    const overview = this.overview();
    if (overview) {
      this.updateViewportFromPointer(event.clientX, event.clientY, overview);
    }
  }

  @HostListener('window:pointerup', ['$event'])
  handleWindowPointerUp(event: PointerEvent): void {
    if (this.minimapPanPointerId() === event.pointerId) {
      this.minimapPanPointerId.set(null);
    }
  }

  @HostListener('window:blur')
  handleWindowBlur(): void {
    this.minimapPanPointerId.set(null);
  }

  private updateViewportFromPointer(clientX: number, clientY: number, overview: MinimapOverview, sourceSvg?: SVGSVGElement): void {
    const svg = sourceSvg ?? this.minimapSvg()?.nativeElement;
    if (!svg) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const localX = ((clientX - rect.left) / rect.width) * overview.viewBoxWidth;
    const localY = ((clientY - rect.top) / rect.height) * overview.viewBoxHeight;
    const worldX = overview.worldLeft + (localX - overview.offsetX) / overview.mapScale;
    const worldY = overview.worldTop - (localY - overview.offsetY) / overview.mapScale;
    this.viewportCenterChange.emit({ x: worldX, y: worldY });
  }

  private toMinimapShape(shape: CanvasShape, toMapX: (x: number) => number, toMapY: (y: number) => number, mapScale: number): MinimapShape {
    const minimapStrokeWidth = (strokeWidth: number): number => Math.min(Math.max(strokeWidth * mapScale * 0.42, 0.16), 0.95);
    switch (shape.kind) {
      case 'line':
        return {
          kind: 'line',
          stroke: shape.stroke,
          strokeWidth: minimapStrokeWidth(shape.strokeWidth),
          dashArray: this.strokeDashArray(shape.strokeStyle ?? 'solid', minimapStrokeWidth(shape.strokeWidth)) ?? undefined,
          arrowStart: this.minimapArrowTip(shape, 'from', toMapX, toMapY, mapScale),
          arrowEnd: this.minimapArrowTip(shape, 'to', toMapX, toMapY, mapScale),
          path: buildLinePath(shape, (point) => ({
            x: toMapX(point.x),
            y: toMapY(point.y)
          }))
        };
      case 'rectangle':
        return {
          kind: 'rectangle',
          stroke: shape.stroke,
          strokeWidth: minimapStrokeWidth(shape.strokeWidth),
          dashArray: this.strokeDashArray(shape.strokeStyle ?? 'solid', minimapStrokeWidth(shape.strokeWidth)) ?? undefined,
          fill: shape.fill,
          x: toMapX(shape.x),
          y: toMapY(shape.y + shape.height),
          width: Math.max(shape.width * mapScale, MINIMAP_MIN_IMAGE_DIMENSION),
          height: Math.max(shape.height * mapScale, MINIMAP_MIN_IMAGE_DIMENSION),
          rx: Math.max(effectiveRectangleCornerRadius(shape) * mapScale, 0.6)
        };
      case 'triangle':
        return {
          kind: 'triangle',
          stroke: shape.stroke,
          strokeWidth: minimapStrokeWidth(shape.strokeWidth),
          dashArray: this.strokeDashArray(shape.strokeStyle ?? 'solid', minimapStrokeWidth(shape.strokeWidth)) ?? undefined,
          fill: shape.fill,
          path: buildTrianglePath(
            shape,
            (point) => ({
              x: toMapX(point.x),
              y: toMapY(point.y)
            }),
            effectiveTriangleCornerRadius(shape) * mapScale
          )
        };
      case 'circle':
        return {
          kind: 'circle',
          stroke: shape.stroke,
          strokeWidth: minimapStrokeWidth(shape.strokeWidth),
          dashArray: this.strokeDashArray(shape.strokeStyle ?? 'solid', minimapStrokeWidth(shape.strokeWidth)) ?? undefined,
          fill: shape.fill,
          cx: toMapX(shape.cx),
          cy: toMapY(shape.cy),
          r: Math.max(shape.r * mapScale, MINIMAP_MIN_RADIUS)
        };
      case 'ellipse':
        return {
          kind: 'ellipse',
          stroke: shape.stroke,
          strokeWidth: minimapStrokeWidth(shape.strokeWidth),
          dashArray: this.strokeDashArray(shape.strokeStyle ?? 'solid', minimapStrokeWidth(shape.strokeWidth)) ?? undefined,
          fill: shape.fill,
          cx: toMapX(shape.cx),
          cy: toMapY(shape.cy),
          rx: Math.max(shape.rx * mapScale, MINIMAP_MIN_RADIUS),
          ry: Math.max(shape.ry * mapScale, MINIMAP_MIN_RADIUS)
        };
      case 'text': {
        const lines = displayTextLinesForShape(shape);
        return {
          kind: 'text',
          stroke: 'transparent',
          strokeWidth: 0,
          fill: shape.color,
          fillOpacity: shape.colorOpacity,
          x: this.textRenderXAt(shape, toMapX, mapScale),
          y: toMapY(shape.y),
          lines,
          fontSize: Math.max(shape.fontSize * mapScale, MINIMAP_MIN_TEXT_HEIGHT),
          textAnchor: this.textAnchor(shape.textAlign),
          fontWeight: shape.fontWeight,
          fontStyle: shape.fontStyle,
          textDecoration: shape.textDecoration,
          transform: shape.rotation ? `rotate(${shape.rotation} ${toMapX(shape.x)} ${toMapY(shape.y)})` : null
        };
      }
      case 'image':
        return {
          kind: 'image',
          stroke: shape.stroke,
          strokeWidth: minimapStrokeWidth(shape.strokeWidth),
          x: toMapX(shape.x),
          y: toMapY(shape.y + shape.height),
          width: Math.max(shape.width * mapScale, MINIMAP_MIN_IMAGE_DIMENSION),
          height: Math.max(shape.height * mapScale, MINIMAP_MIN_IMAGE_DIMENSION),
          opacity: shape.strokeOpacity,
          href: shape.src
        };
    }
  }

  private minimapArrowTip(
    shape: LineShape,
    endpoint: LineEndpoint,
    toMapX: (x: number) => number,
    toMapY: (y: number) => number,
    mapScale: number
  ): MinimapArrowShape | undefined {
    const showsArrow = endpoint === 'from' ? shape.arrowStart : shape.arrowEnd;
    if (!showsArrow) {
      return undefined;
    }

    const points = [shape.from, ...shape.anchors, shape.to];
    if (points.length < 2) {
      return undefined;
    }

    const target = endpoint === 'from' ? shape.from : shape.to;
    const adjacent = endpoint === 'from' ? points[1] : (points.at(-2) ?? shape.from);
    const targetMap = { x: toMapX(target.x), y: toMapY(target.y) };
    const adjacentMap = { x: toMapX(adjacent.x), y: toMapY(adjacent.y) };
    const deltaX = targetMap.x - adjacentMap.x;
    const deltaY = targetMap.y - adjacentMap.y;
    const length = Math.hypot(deltaX, deltaY);
    if (!Number.isFinite(length) || length < 0.001) {
      return undefined;
    }

    const geometry = arrowMarkerGeometry(shape);
    const unit = { x: deltaX / length, y: deltaY / length };
    const normal = { x: -unit.y, y: unit.x };
    const unitScale = (zoomScaledArrowStrokeWidth(shape.strokeWidth, this.scaleValue()) * shape.arrowScale * mapScale) / this.scaleValue();
    const a = unit.x * unitScale;
    const b = unit.y * unitScale;
    const c = normal.x * unitScale;
    const d = normal.y * unitScale;
    const e = targetMap.x - geometry.refX * a - geometry.refY * c;
    const f = targetMap.y - geometry.refX * b - geometry.refY * d;
    const strokeWidth = Math.max((shape.strokeWidth * mapScale * 0.42) / Math.max(unitScale, 0.001), 0.28 / Math.max(unitScale, 0.001));

    return {
      path: geometry.path,
      transform: `matrix(${a} ${b} ${c} ${d} ${e} ${f})`,
      fill: arrowMarkerFill(shape),
      stroke: shape.arrowColor,
      strokeWidth,
      lineJoin: shape.arrowRound ? 'round' : 'miter',
      lineCap: shape.arrowRound ? 'round' : 'butt'
    };
  }

  private strokeDashArray(strokeStyle: LineStrokeStyle, strokeWidth: number): string | null {
    const dashArray = (pattern: readonly number[]): string => pattern.map((multiplier) => strokeWidth * multiplier).join(' ');
    switch (strokeStyle) {
      case 'solid':
        return null;
      case 'dashed':
        return dashArray(LINE_DASHED_PATTERN);
      case 'dotted':
        return dashArray(LINE_DOTTED_PATTERN);
      case 'dash-dotted':
        return dashArray(LINE_DASH_DOTTED_PATTERN);
      case 'loosely-dashed':
        return dashArray(LINE_LOOSELY_DASHED_PATTERN);
    }
  }

  private textAnchor(align: TextAlign): SvgTextAnchor {
    if (align === 'left') {
      return 'start';
    }
    if (align === 'right') {
      return 'end';
    }
    return 'middle';
  }

  private textRenderXAt(shape: TextShape, projectX: (value: number) => number, mapScale: number): number {
    if (!shape.textBox) {
      return projectX(shape.x);
    }
    const width = shape.boxWidth * mapScale;
    const left = textLeftForWidth(shape, projectX(shape.x), width);
    if (shape.textAlign === 'right') {
      return left + width;
    }
    if (shape.textAlign === 'center') {
      return left + width / 2;
    }
    return left;
  }
}
