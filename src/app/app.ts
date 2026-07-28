import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import type { SeoRouteData } from './features/site-pages/site-page-seo';
import { CustomTooltipComponent } from './shared/custom-tooltip/custom-tooltip.component';

const SITE_ORIGIN = 'https://tikzdrawer.com';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CustomTooltipComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.updateRouteMetadata();
      });
  }

  private updateRouteMetadata(): void {
    const route = this.leafRoute();
    const seo = route.snapshot.data['seo'] as SeoRouteData | undefined;
    if (!seo) {
      return;
    }

    this.title.setTitle(seo.title);
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({ name: 'robots', content: seo.robots });
    this.updateCanonical(seo.canonicalPath);
  }

  private leafRoute(): ActivatedRoute {
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
  }

  private updateCanonical(canonicalPath: string | null): void {
    const existing = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalPath) {
      existing?.remove();
      return;
    }

    const canonical = existing ?? this.document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = `${SITE_ORIGIN}${canonicalPath}`;
    if (!existing) {
      this.document.head.append(canonical);
    }
  }
}
