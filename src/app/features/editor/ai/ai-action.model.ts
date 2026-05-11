export type AiQuickActionId = 'createDiagram' | 'improveScene' | 'fixTikz' | 'explainScene';

export interface AiQuickAction {
  readonly id: AiQuickActionId;
  readonly labelKey: string;
  readonly promptKey: string;
}

export const AI_QUICK_ACTIONS: readonly AiQuickAction[] = [
  {
    id: 'createDiagram',
    labelKey: 'ai.action.createDiagram',
    promptKey: 'ai.prompt.createDiagram'
  },
  {
    id: 'improveScene',
    labelKey: 'ai.action.improveScene',
    promptKey: 'ai.prompt.improveScene'
  },
  {
    id: 'fixTikz',
    labelKey: 'ai.action.fixTikz',
    promptKey: 'ai.prompt.fixTikz'
  },
  {
    id: 'explainScene',
    labelKey: 'ai.action.explainScene',
    promptKey: 'ai.prompt.explainScene'
  }
];
