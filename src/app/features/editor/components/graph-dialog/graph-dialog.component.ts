import { ChangeDetectionStrategy, Component, computed, input, OnChanges, output, signal } from '@angular/core';
import { getIconPath } from '../../config/editor-icons';
import {
  DEFAULT_GRAPH_DIMENSIONS,
  GRAPH_MAX_GRID_AXIS,
  GRAPH_MAX_TREE_LEVELS,
  GRAPH_MAX_VERTICES,
  GRAPH_MIN_VERTICES,
  type GraphDimensions,
  type GraphPresetKind
} from '../../models/graph.models';
import {
  buildGraphLayout,
  graphDisplayName,
  graphEdgeCount,
  graphVertexCount,
  insetGraphEdge,
  normalizeGraphDimensions
} from '../../utils/graph.utils';
import type { Point } from '../../models/tikz.models';

const PREVIEW_NODE_RADIUS = 7;

interface GraphPreviewNode {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
}

interface GraphPreviewEdge {
  readonly id: string;
  readonly from: Point;
  readonly to: Point;
}

@Component({
  selector: 'app-graph-dialog',
  templateUrl: './graph-dialog.component.html',
  styleUrl: './graph-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphDialogComponent implements OnChanges {
  readonly closeIconPath = getIconPath('closeBold');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly cancelLabel = input.required<string>();
  readonly verticesLabel = input.required<string>();
  readonly leftVerticesLabel = input.required<string>();
  readonly rightVerticesLabel = input.required<string>();
  readonly rowsLabel = input.required<string>();
  readonly columnsLabel = input.required<string>();
  readonly levelsLabel = input.required<string>();
  readonly branchingFactorLabel = input.required<string>();
  readonly layersLabel = input.required<string>();
  readonly nodesPerLayerLabel = input.required<string>();
  readonly directedLabel = input.required<string>();
  readonly labelsLabel = input.required<string>();
  readonly statsVerticesLabel = input.required<string>();
  readonly statsEdgesLabel = input.required<string>();
  readonly initialDimensions = input<GraphDimensions>(DEFAULT_GRAPH_DIMENSIONS);

  readonly cancelDialog = output<void>();
  readonly confirm = output<GraphDimensions>();

  readonly selected = signal<GraphDimensions>(DEFAULT_GRAPH_DIMENSIONS);
  readonly minVertices = GRAPH_MIN_VERTICES;
  readonly maxVertices = GRAPH_MAX_VERTICES;
  readonly maxGridAxis = GRAPH_MAX_GRID_AXIS;
  readonly maxTreeLevels = GRAPH_MAX_TREE_LEVELS;
  readonly displayName = computed(() => graphDisplayName(this.selected().kind));
  readonly vertexCount = computed(() => graphVertexCount(this.selected()));
  readonly edgeCount = computed(() => graphEdgeCount(this.selected()));
  readonly preview = computed(() => this.buildPreview(this.selected()));
  readonly maxColumnsForSelectedKind = computed(() => (this.selected().kind === 'kary-tree' ? 4 : this.maxGridAxis));
  readonly maxLevelsForSelectedKind = computed(() => (this.selected().kind === 'kary-tree' ? 4 : this.maxTreeLevels));

  ngOnChanges(): void {
    this.selected.set(normalizeGraphDimensions(this.initialDimensions()));
  }

  isSimpleVertexGraph(kind: GraphPresetKind): boolean {
    return (
      kind === 'complete' ||
      kind === 'cycle' ||
      kind === 'path' ||
      kind === 'independent' ||
      kind === 'star' ||
      kind === 'wheel' ||
      kind === 'prism'
    );
  }

  isLayeredGraph(kind: GraphPresetKind): boolean {
    return kind === 'layered-dag' || kind === 'flow-network' || kind === 'neural-network';
  }

  updateNumber(
    key: keyof Pick<GraphDimensions, 'vertices' | 'leftVertices' | 'rightVertices' | 'rows' | 'columns' | 'levels'>,
    event: Event
  ): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.selected.update((dimensions) => normalizeGraphDimensions({ ...dimensions, [key]: value }));
  }

  updateToggle(key: keyof Pick<GraphDimensions, 'directed' | 'showLabels'>, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selected.update((dimensions) => normalizeGraphDimensions({ ...dimensions, [key]: checked }));
  }

  toggleBoolean(key: keyof Pick<GraphDimensions, 'directed' | 'showLabels'>): void {
    this.selected.update((dimensions) => normalizeGraphDimensions({ ...dimensions, [key]: !dimensions[key] }));
  }

  onToggleKeydown(event: KeyboardEvent, key: keyof Pick<GraphDimensions, 'directed' | 'showLabels'>): void {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.toggleBoolean(key);
  }

  onBackdropKeydown(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }

    event.preventDefault();
    this.cancelDialog.emit();
  }

  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelDialog.emit();
      return;
    }

    const toggleKey = this.toggleKeyFromEventTarget(event.target);
    if (toggleKey && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.toggleBoolean(toggleKey);
      return;
    }

    event.stopPropagation();
  }

  submit(): void {
    this.confirm.emit(this.selected());
  }

  private toggleKeyFromEventTarget(
    target: EventTarget | null
  ): keyof Pick<GraphDimensions, 'directed' | 'showLabels'> | null {
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    const toggle = target.closest<HTMLElement>('[data-graph-toggle]');
    const key = toggle?.dataset['graphToggle'];
    return key === 'directed' || key === 'showLabels' ? key : null;
  }

  private buildPreview(dimensions: GraphDimensions): {
    readonly nodes: readonly GraphPreviewNode[];
    readonly edges: readonly GraphPreviewEdge[];
  } {
    const layout = buildGraphLayout(dimensions);
    const bounds = layout.nodes.reduce(
      (accumulator, node) => ({
        minX: Math.min(accumulator.minX, node.position.x),
        maxX: Math.max(accumulator.maxX, node.position.x),
        minY: Math.min(accumulator.minY, node.position.y),
        maxY: Math.max(accumulator.maxY, node.position.y)
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );
    const width = Math.max(bounds.maxX - bounds.minX, 0.1);
    const height = Math.max(bounds.maxY - bounds.minY, 0.1);
    const scale = Math.min(180 / width, 126 / height);
    const nodes = layout.nodes.map(
      (node): GraphPreviewNode => ({
        id: node.id,
        label: node.label,
        x: 120 + (node.position.x - (bounds.minX + bounds.maxX) / 2) * scale,
        y: 80 - (node.position.y - (bounds.minY + bounds.maxY) / 2) * scale
      })
    );
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const edges = layout.edges
      .map((edge) => {
        const source = nodeById.get(edge.source);
        const target = nodeById.get(edge.target);
        if (!source || !target) {
          return null;
        }

        const endpoints = insetGraphEdge(source, target, PREVIEW_NODE_RADIUS);
        return {
          id: `${source.id}-${target.id}`,
          from: endpoints.from,
          to: endpoints.to
        };
      })
      .filter((edge): edge is GraphPreviewEdge => !!edge);
    return { nodes, edges };
  }
}
