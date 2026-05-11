export type AiQuickActionId = 'createDiagram' | 'improveScene' | 'fixTikz' | 'addLabels';

export interface AiQuickAction {
  readonly id: AiQuickActionId;
  readonly labelKey: string;
  readonly promptKey: string;
  readonly icon: 'sparkles' | 'layout' | 'code' | 'tag';
}

export const AI_QUICK_ACTIONS: readonly AiQuickAction[] = [
  {
    id: 'createDiagram',
    labelKey: 'ai.action.createDiagram',
    promptKey: 'ai.prompt.createDiagram',
    icon: 'sparkles'
  },
  {
    id: 'improveScene',
    labelKey: 'ai.action.improveScene',
    promptKey: 'ai.prompt.improveScene',
    icon: 'layout'
  },
  {
    id: 'fixTikz',
    labelKey: 'ai.action.fixTikz',
    promptKey: 'ai.prompt.fixTikz',
    icon: 'code'
  },
  {
    id: 'addLabels',
    labelKey: 'ai.action.addLabels',
    promptKey: 'ai.prompt.addLabels',
    icon: 'tag'
  }
];
