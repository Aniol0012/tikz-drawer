import type { CanvasShape } from '../models/tikz.models';
import { selectionContainsShape, shapeSetIds, toggledShapeSetSelection } from './editor-selection.utils';

const shapes: readonly CanvasShape[] = [
  {
    id: 'rect-1',
    name: 'Rect 1',
    kind: 'rectangle',
    x: 0,
    y: 0,
    width: 2,
    height: 1,
    stroke: '#111111',
    strokeOpacity: 1,
    strokeWidth: 0.1,
    fill: '#ffffff',
    fillOpacity: 1,
    cornerRadius: 0,
    mergeId: 'merge-a'
  },
  {
    id: 'rect-2',
    name: 'Rect 2',
    kind: 'rectangle',
    x: 4,
    y: 0,
    width: 2,
    height: 1,
    stroke: '#111111',
    strokeOpacity: 1,
    strokeWidth: 0.1,
    fill: '#ffffff',
    fillOpacity: 1,
    cornerRadius: 0,
    mergeId: 'merge-a'
  },
  {
    id: 'line-1',
    name: 'Divider',
    kind: 'line',
    from: { x: 0, y: 0 },
    to: { x: 4, y: 0 },
    anchors: [],
    lineMode: 'straight',
    stroke: '#111111',
    strokeOpacity: 1,
    strokeWidth: 0.1,
    arrowStart: false,
    arrowEnd: false,
    arrowType: 'latex',
    arrowColor: '#111111',
    arrowOpacity: 1,
    arrowOpen: false,
    arrowRound: false,
    arrowScale: 1,
    arrowLengthScale: 1,
    arrowWidthScale: 1,
    arrowBendMode: 'none'
  }
];

describe('editor-selection utils', () => {
  it('checks whether a shape id is already selected', () => {
    expect(selectionContainsShape([shapes[0]], 'rect-1')).toBe(true);
    expect(selectionContainsShape([shapes[0]], 'rect-2')).toBe(false);
  });

  it('returns grouped ids for merged shapes', () => {
    expect(shapeSetIds(shapes[0], shapes)).toEqual(['rect-1', 'rect-2']);
  });

  it('returns single id when shape has no merge or table grouping', () => {
    expect(shapeSetIds(shapes[2], shapes)).toEqual(['line-1']);
  });

  it('toggles grouped selection deterministically', () => {
    expect(toggledShapeSetSelection(['rect-1'], ['rect-1', 'rect-2'])).toEqual(['rect-1', 'rect-2']);
    expect(toggledShapeSetSelection(['rect-1', 'rect-2'], ['rect-1', 'rect-2'])).toEqual([]);
  });
});
