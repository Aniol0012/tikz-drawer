import type { SelectionBounds } from './editor-page.utils';

export type ObjectSnapAxis = 'x' | 'y';
export type ObjectSnapRole = 'min' | 'center' | 'max';

export interface ObjectSnapBounds {
  readonly id: string;
  readonly bounds: SelectionBounds;
}

export interface ObjectSnapGuide {
  readonly axis: ObjectSnapAxis;
  readonly position: number;
  readonly start: number;
  readonly end: number;
}

export interface ObjectSnapResult {
  readonly offset: {
    readonly x: number;
    readonly y: number;
  };
  readonly guides: readonly ObjectSnapGuide[];
}

export interface ObjectResizeSnapRoles {
  readonly x?: ObjectSnapRole;
  readonly y?: ObjectSnapRole;
}

interface SnapCandidate {
  readonly id: string;
  readonly role: ObjectSnapRole;
  readonly position: number;
  readonly bounds: SelectionBounds;
}

interface SnapMatch {
  readonly delta: number;
  readonly source: SnapCandidate;
  readonly target: SnapCandidate;
}

const center = (start: number, end: number): number => (start + end) / 2;

const candidatesForAxis = (entry: ObjectSnapBounds, axis: ObjectSnapAxis, role?: ObjectSnapRole): readonly SnapCandidate[] => {
  const { bounds } = entry;
  const candidates: readonly SnapCandidate[] =
    axis === 'x'
      ? [
          { id: entry.id, role: 'min', position: bounds.left, bounds },
          { id: entry.id, role: 'center', position: center(bounds.left, bounds.right), bounds },
          { id: entry.id, role: 'max', position: bounds.right, bounds }
        ]
      : [
          { id: entry.id, role: 'min', position: bounds.bottom, bounds },
          { id: entry.id, role: 'center', position: center(bounds.bottom, bounds.top), bounds },
          { id: entry.id, role: 'max', position: bounds.top, bounds }
        ];
  return role ? candidates.filter((candidate) => candidate.role === role) : candidates;
};

const bestMatchForAxis = (
  axis: ObjectSnapAxis,
  sourceEntries: readonly ObjectSnapBounds[],
  targetEntries: readonly ObjectSnapBounds[],
  tolerance: number,
  sourceRole?: ObjectSnapRole
): SnapMatch | null => {
  const sourceCandidates = sourceEntries.flatMap((entry) => candidatesForAxis(entry, axis, sourceRole));
  const targetCandidates = targetEntries.flatMap((entry) => candidatesForAxis(entry, axis));

  return sourceCandidates.reduce<SnapMatch | null>((bestMatch, source) => {
    const nextMatch = targetCandidates.reduce<SnapMatch | null>((bestTargetMatch, target) => {
      const delta = target.position - source.position;
      if (Math.abs(delta) > tolerance) {
        return bestTargetMatch;
      }
      if (!bestTargetMatch || Math.abs(delta) < Math.abs(bestTargetMatch.delta)) {
        return { delta, source, target };
      }
      return bestTargetMatch;
    }, null);

    if (!nextMatch) {
      return bestMatch;
    }
    if (!bestMatch || Math.abs(nextMatch.delta) < Math.abs(bestMatch.delta)) {
      return nextMatch;
    }
    return bestMatch;
  }, null);
};

const translateBounds = (bounds: SelectionBounds, offset: { readonly x: number; readonly y: number }): SelectionBounds => ({
  left: bounds.left + offset.x,
  right: bounds.right + offset.x,
  bottom: bounds.bottom + offset.y,
  top: bounds.top + offset.y
});

const guideFromMatch = (axis: ObjectSnapAxis, match: SnapMatch, offset: { readonly x: number; readonly y: number }): ObjectSnapGuide => {
  const sourceBounds = translateBounds(match.source.bounds, offset);
  const targetBounds = match.target.bounds;
  if (axis === 'x') {
    return {
      axis,
      position: match.target.position,
      start: Math.min(sourceBounds.bottom, targetBounds.bottom),
      end: Math.max(sourceBounds.top, targetBounds.top)
    };
  }

  return {
    axis,
    position: match.target.position,
    start: Math.min(sourceBounds.left, targetBounds.left),
    end: Math.max(sourceBounds.right, targetBounds.right)
  };
};

export const objectSnapResult = (
  sourceEntries: readonly ObjectSnapBounds[],
  targetEntries: readonly ObjectSnapBounds[],
  tolerance: number
): ObjectSnapResult => {
  if (sourceEntries.length === 0 || targetEntries.length === 0 || tolerance <= 0) {
    return { offset: { x: 0, y: 0 }, guides: [] };
  }

  const xMatch = bestMatchForAxis('x', sourceEntries, targetEntries, tolerance);
  const yMatch = bestMatchForAxis('y', sourceEntries, targetEntries, tolerance);
  const offset = {
    x: xMatch?.delta ?? 0,
    y: yMatch?.delta ?? 0
  };

  return {
    offset,
    guides: [...(xMatch ? [guideFromMatch('x', xMatch, offset)] : []), ...(yMatch ? [guideFromMatch('y', yMatch, offset)] : [])]
  };
};

export const objectResizeSnapResult = (
  sourceEntries: readonly ObjectSnapBounds[],
  targetEntries: readonly ObjectSnapBounds[],
  roles: ObjectResizeSnapRoles,
  tolerance: number
): ObjectSnapResult => {
  if (sourceEntries.length === 0 || targetEntries.length === 0 || tolerance <= 0 || (!roles.x && !roles.y)) {
    return { offset: { x: 0, y: 0 }, guides: [] };
  }

  const xMatch = roles.x ? bestMatchForAxis('x', sourceEntries, targetEntries, tolerance, roles.x) : null;
  const yMatch = roles.y ? bestMatchForAxis('y', sourceEntries, targetEntries, tolerance, roles.y) : null;
  const offset = {
    x: xMatch?.delta ?? 0,
    y: yMatch?.delta ?? 0
  };

  return {
    offset,
    guides: [...(xMatch ? [guideFromMatch('x', xMatch, offset)] : []), ...(yMatch ? [guideFromMatch('y', yMatch, offset)] : [])]
  };
};
