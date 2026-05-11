import type { ArrowTipKind } from '../models/tikz.models';
import { getIconPath } from './editor-icons';

export interface ArrowTipOptionDescriptor {
  readonly id: ArrowTipKind;
  readonly labelKey: string;
  readonly iconPath: string;
  readonly filled: boolean;
}

const ARROW_TIP_IDS = [
  'latex',
  'triangle',
  'stealth',
  'diamond',
  'circle',
  'bar',
  'hooks',
  'bracket',
  'kite',
  'square',
  'parenthesis',
  'straight-barb'
] as const satisfies readonly ArrowTipKind[];

const arrowTipLabelKey = (arrowType: ArrowTipKind): string => {
  switch (arrowType) {
    case 'latex':
      return 'arrowTypeLatex';
    case 'triangle':
      return 'arrowTypeTriangle';
    case 'stealth':
      return 'arrowTypeStealth';
    case 'diamond':
      return 'arrowTypeDiamond';
    case 'circle':
      return 'arrowTypeCircle';
    case 'bar':
      return 'arrowTypeBar';
    case 'hooks':
      return 'arrowTypeHooks';
    case 'bracket':
      return 'arrowTypeBracket';
    case 'kite':
      return 'arrowTypeKite';
    case 'square':
      return 'arrowTypeSquare';
    case 'parenthesis':
      return 'arrowTypeParenthesis';
    case 'straight-barb':
      return 'arrowTypeStraightBarb';
  }
};

const arrowTipIconName = (arrowType: ArrowTipKind): Parameters<typeof getIconPath>[0] => {
  switch (arrowType) {
    case 'latex':
      return 'arrowTipLatex';
    case 'triangle':
      return 'arrowTipTriangle';
    case 'stealth':
      return 'arrowTipStealth';
    case 'diamond':
      return 'arrowTipDiamond';
    case 'circle':
      return 'arrowTipCircle';
    case 'bar':
      return 'arrowTipBar';
    case 'hooks':
      return 'arrowTipHooks';
    case 'bracket':
      return 'arrowTipBracket';
    case 'kite':
      return 'arrowTipKite';
    case 'square':
      return 'arrowTipSquare';
    case 'parenthesis':
      return 'arrowTipParenthesis';
    case 'straight-barb':
      return 'arrowTipStraightBarb';
  }
};

export const arrowTipIconFilled = (arrowType: ArrowTipKind): boolean =>
  arrowType === 'triangle' || arrowType === 'stealth' || arrowType === 'circle' || arrowType === 'kite' || arrowType === 'square';

export const ARROW_TIP_OPTIONS: readonly ArrowTipOptionDescriptor[] = ARROW_TIP_IDS.map((id) => ({
  id,
  labelKey: arrowTipLabelKey(id),
  iconPath: getIconPath(arrowTipIconName(id)),
  filled: arrowTipIconFilled(id)
}));
