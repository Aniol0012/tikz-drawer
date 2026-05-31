import { DOCUMENT } from '@angular/common';
import type { ElementRef } from '@angular/core';
import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { AiAssistantStateService } from '../../ai/ai-assistant-state.service';

interface AiIntroFlightLayout {
  readonly dx: number;
  readonly dy: number;
  readonly dx1: number;
  readonly dy1: number;
  readonly dx2: number;
  readonly dy2: number;
}

@Component({
  selector: 'app-ai-intro-flight',
  templateUrl: './ai-intro-flight.component.html',
  styleUrl: './ai-intro-flight.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiIntroFlightComponent {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly assistantState = inject(AiAssistantStateService);
  private timeoutHandle: number | null = null;
  private animation: Animation | null = null;
  private readonly flightElement = viewChild<ElementRef<HTMLElement>>('flightElement');

  readonly flight = signal<AiIntroFlightLayout | null>(null);

  constructor() {
    afterNextRender(() => this.scheduleIntroFlight());

    this.destroyRef.onDestroy(() => {
      const view = this.document.defaultView;
      if (this.timeoutHandle !== null && view) {
        view.clearTimeout(this.timeoutHandle);
      }
      this.animation?.cancel();
    });
  }

  finish(): void {
    this.flight.set(null);
  }

  private scheduleIntroFlight(): void {
    const view = this.document.defaultView;
    if (!view || this.assistantState.hasPromptBeenSeen()) {
      return;
    }

    if (view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.timeoutHandle = view.setTimeout(() => {
      this.timeoutHandle = null;
      this.startIntroFlight();
    }, 420);
  }

  private startIntroFlight(): void {
    if (this.flight() || this.assistantState.hasPromptBeenSeen()) {
      return;
    }

    const view = this.document.defaultView;
    if (!view) {
      return;
    }

    const target = this.document.querySelector<HTMLElement>('[data-ai-tab-target]');
    const targetRect = target?.getBoundingClientRect();
    const targetX = targetRect ? targetRect.left + targetRect.width / 2 : view.innerWidth - 92;
    const targetY = targetRect ? targetRect.top + targetRect.height / 2 : 96;
    const dx = targetX - view.innerWidth / 2;
    const dy = targetY - view.innerHeight / 2;

    const layout = {
      dx,
      dy,
      dx1: dx * 0.14,
      dy1: dy * 0.08 - 18,
      dx2: dx * 0.68,
      dy2: dy * 0.58 - 22
    };

    this.flight.set(layout);
    view.requestAnimationFrame(() => this.animateFlight(layout));
  }

  private animateFlight(layout: AiIntroFlightLayout): void {
    const element = this.flightElement()?.nativeElement;
    if (!element) {
      this.finish();
      return;
    }

    this.animation?.cancel();
    this.animation = element.animate(
      [
        { opacity: 0, transform: 'translate3d(-50%, -50%, 0) scale(0.78) rotate(-7deg)', offset: 0 },
        { opacity: 1, transform: 'translate3d(-50%, -50%, 0) scale(1.02) rotate(0deg)', offset: 0.16 },
        {
          opacity: 1,
          transform: `translate3d(calc(-50% + ${layout.dx1}px), calc(-50% + ${layout.dy1}px), 0) scale(1) rotate(-4deg)`,
          offset: 0.42
        },
        {
          opacity: 1,
          transform: `translate3d(calc(-50% + ${layout.dx2}px), calc(-50% + ${layout.dy2}px), 0) scale(0.62) rotate(6deg)`,
          offset: 0.72
        },
        {
          opacity: 0,
          transform: `translate3d(calc(-50% + ${layout.dx}px), calc(-50% + ${layout.dy}px), 0) scale(0.26) rotate(0deg)`,
          offset: 1
        }
      ],
      {
        duration: 1850,
        easing: 'cubic-bezier(0.18, 0.84, 0.18, 1)',
        fill: 'both'
      }
    );
    this.animation.addEventListener('finish', () => this.finish(), { once: true });
  }
}
