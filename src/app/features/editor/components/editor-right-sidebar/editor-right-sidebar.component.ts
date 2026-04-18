import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-editor-right-sidebar',
  templateUrl: './editor-right-sidebar.component.html',
  styleUrl: './editor-right-sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorRightSidebarComponent {
  readonly collapsed = input.required<boolean>();
  readonly mobileLayout = input.required<boolean>();
  readonly iconMap = input.required<Record<string, string>>();
  readonly translate = input.required<(key: string) => string>();

  readonly toggleCollapsed = output<void>();

  t(key: string): string {
    return this.translate()(key);
  }
}
