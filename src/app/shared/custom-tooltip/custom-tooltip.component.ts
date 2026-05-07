import { DOCUMENT } from '@angular/common';
import type { ElementRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, signal, viewChild } from '@angular/core';

interface TooltipState {
  readonly text: string;
  readonly left: number;
  readonly top: number;
  readonly placement: 'top' | 'bottom';
  readonly phase: 'entering' | 'leaving';
}

const TOOLTIP_MARGIN_PX = 12;
const TOOLTIP_OFFSET_PX = 8;
const TOOLTIP_MAX_WIDTH_PX = 280;
const TOOLTIP_SHOW_DELAY_MS = 500;
const TOOLTIP_HIDE_DELAY_MS = 90;
const TOOLTIP_LEAVE_ANIMATION_MS = 120;

@Component({
  selector: 'app-custom-tooltip',
  templateUrl: './custom-tooltip.component.html',
  styleUrl: './custom-tooltip.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomTooltipComponent {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private activeTarget: HTMLElement | null = null;
  private showHandle: ReturnType<typeof setTimeout> | null = null;
  private hideHandle: ReturnType<typeof setTimeout> | null = null;
  private dismissHandle: ReturnType<typeof setTimeout> | null = null;
  private positionHandle: number | null = null;
  private mutationObserver: MutationObserver | null = null;
  private readonly handleAnyScroll = () => this.refreshActiveTooltip();

  readonly tooltip = signal<TooltipState | null>(null);
  readonly tooltipElement = viewChild<ElementRef<HTMLElement>>('tooltipElement');

  constructor() {
    this.document.addEventListener('scroll', this.handleAnyScroll, true);
    this.destroyRef.onDestroy(() => {
      this.clearTimers();
      this.clearPositionHandle();
      this.disconnectMutationObserver();
      this.restoreTitle(this.activeTarget);
      this.document.removeEventListener('scroll', this.handleAnyScroll, true);
    });
  }

  @HostListener('document:pointerover', ['$event'])
  onPointerOver(event: PointerEvent): void {
    const target = this.tooltipTarget(event.target);
    if (!target) {
      return;
    }

    if (target === this.activeTarget && this.tooltip()?.phase !== 'leaving') {
      return;
    }

    this.scheduleShow(target);
  }

  @HostListener('document:pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    if (this.isNativeControlEventTarget(event.target) || this.isShoelaceDropdownTarget(event.target)) {
      this.hideNow();
    }
  }

  @HostListener('document:pointerout', ['$event'])
  onPointerOut(event: PointerEvent): void {
    this.scheduleHideAfterTargetExit(event.relatedTarget);
  }

  @HostListener('document:focusin', ['$event'])
  onFocusIn(event: FocusEvent): void {
    const target = this.tooltipTarget(event.target);
    if (!target) {
      return;
    }

    this.scheduleShow(target, true);
  }

  @HostListener('document:focusout', ['$event'])
  onFocusOut(event: FocusEvent): void {
    this.scheduleHideAfterTargetExit(event.relatedTarget);
  }

  private scheduleHideAfterTargetExit(relatedTarget: EventTarget | null): void {
    if (!this.activeTarget) {
      return;
    }

    if (relatedTarget instanceof Node && this.activeTarget.contains(relatedTarget)) {
      return;
    }

    this.scheduleHide();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.hideNow();
  }

  @HostListener('document:sl-show', ['$event'])
  onShoelaceDropdownShow(event: Event): void {
    if (this.isShoelaceDropdownTarget(event.target)) {
      this.hideNow();
    }
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange(): void {
    this.refreshActiveTooltip();
  }

  private scheduleShow(target: HTMLElement, immediate = false): void {
    this.clearTimers();
    this.restoreTitle(this.activeTarget);
    this.activeTarget = target;
    this.removeNativeTitle(target);

    const show = () => this.show(target);
    if (immediate) {
      show();
      return;
    }

    this.showHandle = setTimeout(show, TOOLTIP_SHOW_DELAY_MS);
  }

  private show(target: HTMLElement): void {
    const text = this.tooltipText(target);
    if (!text) {
      this.hideNow();
      return;
    }

    this.removeNativeTitle(target);
    this.observeTooltipText(target);
    this.tooltip.set(this.positionTooltip(target, text));
    this.scheduleMeasuredPosition(target, text);
  }

  private scheduleHide(): void {
    this.clearTimers();
    this.hideHandle = setTimeout(() => this.hideNow(), TOOLTIP_HIDE_DELAY_MS);
  }

  private hideNow(): void {
    this.clearTimers();
    const currentTooltip = this.tooltip();
    if (currentTooltip) {
      this.tooltip.set({
        ...currentTooltip,
        phase: 'leaving'
      });
      this.dismissHandle = setTimeout(() => this.finishHide(), TOOLTIP_LEAVE_ANIMATION_MS);
      return;
    }

    this.finishHide();
  }

  private finishHide(): void {
    this.disconnectMutationObserver();
    this.restoreTitle(this.activeTarget);
    this.activeTarget = null;
    this.tooltip.set(null);
  }

  private observeTooltipText(target: HTMLElement): void {
    this.disconnectMutationObserver();
    this.mutationObserver = new MutationObserver(() => this.refreshActiveTooltip());
    this.mutationObserver.observe(target, {
      attributeFilter: ['aria-label', 'data-tooltip', 'title'],
      attributes: true
    });
  }

  private refreshActiveTooltip(): void {
    const currentTooltip = this.tooltip();
    if (!this.activeTarget || !currentTooltip || currentTooltip.phase === 'leaving') {
      return;
    }

    const text = this.tooltipText(this.activeTarget);
    if (!text) {
      this.hideNow();
      return;
    }

    this.clearHideTimers();
    this.tooltip.set({
      ...this.positionTooltip(this.activeTarget, text),
      phase: currentTooltip.phase
    });
    this.scheduleMeasuredPosition(this.activeTarget, text, currentTooltip.phase);
  }

  private disconnectMutationObserver(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
  }

  private tooltipTarget(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) {
      return null;
    }

    const explicitCandidate = target.closest<HTMLElement>('[data-tooltip]');
    if (explicitCandidate && !explicitCandidate.closest('app-custom-tooltip')) {
      return this.tooltipText(explicitCandidate) ? explicitCandidate : null;
    }

    if (target.closest('[data-tooltip-disabled]')) {
      return null;
    }

    if (this.isNativeControlEventTarget(target) || this.isShoelaceDropdownTarget(target)) {
      return null;
    }

    const candidate = target.closest<HTMLElement>('[data-tooltip], [title], [aria-label]');
    if (!candidate || candidate.closest('app-custom-tooltip')) {
      return null;
    }

    return this.tooltipText(candidate) ? candidate : null;
  }

  private isNativeControlEventTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest('select, option, input, textarea') !== null;
  }

  private isShoelaceDropdownTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest('sl-dropdown, sl-select, sl-menu, sl-menu-item, sl-option') !== null;
  }

  private tooltipText(target: HTMLElement): string {
    return (target.dataset['tooltip'] || target.dataset['nativeTitle'] || target.getAttribute('title') || target.getAttribute('aria-label') || '').trim();
  }

  private removeNativeTitle(target: HTMLElement): void {
    const title = target.getAttribute('title');
    if (!title) {
      return;
    }

    target.dataset['nativeTitle'] = title;
    target.removeAttribute('title');
  }

  private restoreTitle(target: HTMLElement | null): void {
    const title = target?.dataset['nativeTitle'];
    if (!target || !title || target.hasAttribute('title')) {
      return;
    }

    target.setAttribute('title', title);
    delete target.dataset['nativeTitle'];
  }

  private positionTooltip(target: HTMLElement, text: string): TooltipState {
    const rect = target.getBoundingClientRect();
    const viewportWidth = this.document.defaultView?.innerWidth ?? this.document.documentElement.clientWidth;
    const viewportHeight = this.document.defaultView?.innerHeight ?? this.document.documentElement.clientHeight;
    const estimatedWidth = Math.min(TOOLTIP_MAX_WIDTH_PX, Math.max(44, text.length * 6.4 + 20));
    const estimatedHeight = Math.max(26, Math.ceil(text.length / 34) * 15 + 14);
    return this.positionTooltipWithSize(target, text, estimatedWidth, estimatedHeight, rect, viewportWidth, viewportHeight);
  }

  private positionTooltipWithSize(
    target: HTMLElement,
    text: string,
    width: number,
    height: number,
    rect = target.getBoundingClientRect(),
    viewportWidth = this.document.defaultView?.innerWidth ?? this.document.documentElement.clientWidth,
    viewportHeight = this.document.defaultView?.innerHeight ?? this.document.documentElement.clientHeight
  ): TooltipState {
    const anchorX = rect.left + rect.width / 2;
    const left = Math.min(viewportWidth - TOOLTIP_MARGIN_PX - width / 2, Math.max(TOOLTIP_MARGIN_PX + width / 2, anchorX));
    const hasTopSpace = rect.top - height - TOOLTIP_OFFSET_PX > TOOLTIP_MARGIN_PX;
    const placement = hasTopSpace ? 'top' : 'bottom';
    const rawTop = hasTopSpace ? rect.top - TOOLTIP_OFFSET_PX : rect.bottom + TOOLTIP_OFFSET_PX;
    const top = hasTopSpace
      ? Math.max(TOOLTIP_MARGIN_PX + height, rawTop)
      : Math.min(viewportHeight - TOOLTIP_MARGIN_PX - height, Math.max(TOOLTIP_MARGIN_PX, rawTop));

    return {
      text,
      left,
      top,
      placement,
      phase: 'entering'
    };
  }

  private scheduleMeasuredPosition(target: HTMLElement, text: string, phase: TooltipState['phase'] = 'entering'): void {
    this.clearPositionHandle();
    this.positionHandle = requestAnimationFrame(() => {
      this.positionHandle = null;
      const element = this.tooltipElement()?.nativeElement;
      if (!element || this.activeTarget !== target || this.tooltip()?.phase === 'leaving') {
        return;
      }

      const rect = element.getBoundingClientRect();
      this.tooltip.set({
        ...this.positionTooltipWithSize(target, text, rect.width, rect.height),
        phase
      });
    });
  }

  private clearTimers(): void {
    if (this.showHandle !== null) {
      clearTimeout(this.showHandle);
      this.showHandle = null;
    }

    this.clearHideTimers();
  }

  private clearHideTimers(): void {
    if (this.hideHandle !== null) {
      clearTimeout(this.hideHandle);
      this.hideHandle = null;
    }

    if (this.dismissHandle !== null) {
      clearTimeout(this.dismissHandle);
      this.dismissHandle = null;
    }
  }

  private clearPositionHandle(): void {
    if (this.positionHandle !== null) {
      cancelAnimationFrame(this.positionHandle);
      this.positionHandle = null;
    }
  }
}
