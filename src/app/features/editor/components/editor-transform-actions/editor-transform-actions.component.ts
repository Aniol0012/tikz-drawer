import type { ElementRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, input, output, signal, viewChild, viewChildren } from '@angular/core';
import { EditorTranslatePipe } from '../../i18n/editor-translate.pipe';

export type ContextTransformAction = 'centerCanvas' | 'centerHorizontal' | 'centerVertical' | 'rotateLeft' | 'rotateRight' | 'resetRotation';

interface TransformActionDescriptor {
  readonly action: ContextTransformAction;
  readonly labelKey: string;
  readonly iconKey: string;
  readonly group: 'move' | 'rotate';
}

@Component({
  selector: 'app-editor-transform-actions',
  imports: [EditorTranslatePipe],
  templateUrl: './editor-transform-actions.component.html',
  styleUrl: './editor-transform-actions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-tooltip-disabled': ''
  }
})
export class EditorTransformActionsComponent {
  readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  readonly menuItems = viewChildren<ElementRef<HTMLButtonElement>>('menuItem');

  readonly iconMap = input.required<Record<string, string>>();
  readonly canRotate = input(true);
  readonly canResetRotation = input(false);
  readonly actionSelected = output<ContextTransformAction>();
  readonly expanded = signal(false);

  readonly actions: readonly TransformActionDescriptor[] = [
    { action: 'centerCanvas', labelKey: 'centerOnCanvas', iconKey: 'centerCanvas', group: 'move' },
    { action: 'centerHorizontal', labelKey: 'centerHorizontally', iconKey: 'centerHorizontal', group: 'move' },
    { action: 'centerVertical', labelKey: 'centerVertically', iconKey: 'centerVertical', group: 'move' },
    { action: 'rotateLeft', labelKey: 'rotateLeft90', iconKey: 'rotateLeft', group: 'rotate' },
    { action: 'rotateRight', labelKey: 'rotateRight90', iconKey: 'rotateRight', group: 'rotate' },
    { action: 'resetRotation', labelKey: 'resetRotation', iconKey: 'resetRotation', group: 'rotate' }
  ];

  toggle(): void {
    this.expanded.update((expanded) => !expanded);
  }

  choose(action: ContextTransformAction): void {
    this.actionSelected.emit(action);
    this.expanded.set(false);
  }

  actionDisabled(action: ContextTransformAction): boolean {
    if (action === 'rotateLeft' || action === 'rotateRight') {
      return !this.canRotate();
    }
    return action === 'resetRotation' && !this.canResetRotation();
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown') {
      return;
    }
    event.preventDefault();
    this.expanded.set(true);
    queueMicrotask(() => this.menuItems()[0]?.nativeElement.focus({ preventScroll: true }));
  }

  onMenuKeydown(event: KeyboardEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.expanded.set(false);
      this.trigger()?.nativeElement.focus({ preventScroll: true });
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }

    const items = this.menuItems()
      .map((item) => item.nativeElement)
      .filter((item) => !item.disabled);
    const currentIndex = items.indexOf(target);
    if (currentIndex < 0 || items.length === 0) {
      return;
    }
    event.preventDefault();
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (currentIndex + 1) % items.length
            : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus({ preventScroll: true });
  }
}
