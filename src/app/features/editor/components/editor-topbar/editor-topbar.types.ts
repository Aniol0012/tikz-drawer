export interface TopbarTool {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly iconPath: string;
  readonly shortcut?: string;
}
