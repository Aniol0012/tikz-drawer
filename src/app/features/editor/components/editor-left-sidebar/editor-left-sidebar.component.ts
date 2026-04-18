import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-editor-left-sidebar',
  templateUrl: './editor-left-sidebar.component.html',
  styleUrl: './editor-left-sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorLeftSidebarComponent {
  readonly collapsed = input.required<boolean>();
  readonly mobileLayout = input.required<boolean>();
  readonly iconMap = input.required<Record<string, string>>();
  readonly translate = input.required<(key: string) => string>();

  readonly toggleCollapsed = output<void>();

  t(key: string): string {
    return this.translate()(key);
  }
}
