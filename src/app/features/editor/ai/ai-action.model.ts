export type AiQuickActionId = 'createDiagram' | 'improveScene' | 'fixTikz' | 'addLabels' | 'explainScene' | 'simplifyScene';

export interface AiQuickAction {
  readonly id: AiQuickActionId;
  readonly labelKey: string;
  readonly promptKey: string;
  readonly icon: 'sparkles' | 'layout' | 'code' | 'tag' | 'note' | 'funnel';
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
  },
  {
    id: 'explainScene',
    labelKey: 'ai.action.explainScene',
    promptKey: 'ai.prompt.explainScene',
    icon: 'note'
  },
  {
    id: 'simplifyScene',
    labelKey: 'ai.action.simplifyScene',
    promptKey: 'ai.prompt.simplifyScene',
    icon: 'funnel'
  }
];
