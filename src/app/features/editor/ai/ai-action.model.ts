export type AiQuickActionId = 'createDiagram' | 'improveScene' | 'connectElements' | 'addLabels' | 'explainScene' | 'simplifyScene';

export interface AiQuickAction {
  readonly id: AiQuickActionId;
  readonly labelKey: string;
  readonly promptKey: string;
  readonly icon: 'sparkles' | 'layout' | 'arrow' | 'tag' | 'note' | 'funnel';
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
    id: 'connectElements',
    labelKey: 'ai.action.connectElements',
    promptKey: 'ai.prompt.connectElements',
    icon: 'arrow'
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
