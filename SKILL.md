# Modern Angular best practices for agents

Assume Angular v20+ syntax. In Angular v20+ standalone is the default, and Angular’s own AI guidance tells LLMs to prefer standalone components, signals, `host` bindings, `NgOptimizedImage`, modern control flow, and lazy-loaded routes. The current docs are published on Angular v21.2.5.

## Goal

Generate Angular code that is modern, typed, reactive, performant, accessible, secure, and easy to maintain.

## Scope

- Target Angular v20+ syntax and APIs
- Prefer official Angular, Angular CDK, and Angular Material solutions before third-party abstractions
- Default to standalone architecture
- Do not generate legacy NgModule-first code unless explicitly requested

## Core principles

- Prefer simple, explicit, strongly typed code
- Keep components small and focused
- Push state derivation into signals and `computed()`
- Keep templates declarative and lightweight
- Lazy-load aggressively
- Treat accessibility, performance, and security as default requirements
- Avoid experimental APIs in production unless the user explicitly asks for them

## Quick reference

| Area                   | Prefer                               | Avoid                                       |
| ---------------------- | ------------------------------------ | ------------------------------------------- |
| App structure          | Standalone APIs                      | NgModule-first architecture                 |
| Inputs                 | `input()` / `input.required()`       | `@Input()`                                  |
| Outputs                | `output()`                           | `@Output()`                                 |
| Two-way component APIs | `model()` when appropriate           | Manual paired input/output boilerplate      |
| Dependency injection   | `inject()`                           | Constructor injection by default            |
| Local state            | `signal()`                           | Mutable class state scattered across fields |
| Derived state          | `computed()`                         | Getters with hidden work                    |
| Side effects           | `effect()` only for side effects     | Using `effect()` to synchronize state       |
| Templates              | `@if`, `@for`, `@switch`             | `*ngIf`, `*ngFor`, `*ngSwitch`              |
| Loops                  | `@for (...; track ...)`              | Loops without `track`                       |
| Class/style binding    | `[class.foo]`, `[style.width.px]`    | `ngClass`, `ngStyle` by default             |
| Change detection       | `OnPush`                             | `Default`                                   |
| Forms                  | Typed reactive forms                 | Template-driven forms for complex flows     |
| Images                 | `NgOptimizedImage` for static images | Plain `img` everywhere                      |
| Host bindings          | `host: {}` in decorator              | `@HostBinding`, `@HostListener`             |

## TypeScript rules

- Use `strict: true`
- Enable `angularCompilerOptions.strictTemplates: true`
- Turn on Angular extended diagnostics
- Avoid `any`; use `unknown` when the type is genuinely uncertain
- Use `import type` for type-only imports
- Add explicit return types to exported functions
- Prefer `readonly` for immutable data
- Prefer discriminated unions over boolean flag combinations
- Model API DTOs, domain models, and view models as separate types when they differ
- Do not silence typing problems with broad casts unless there is no safer option

Angular’s template type checking gets much stronger with `strictTemplates`, and Angular’s extended diagnostics build on top of it. Typed reactive forms are strictly typed by default. ([angular.dev][2])

## Component rules

- Use standalone components
- Use `ChangeDetectionStrategy.OnPush`
- Use `input()` and `input.required()` for inputs
- Use `output()` for outputs
- Use `model()` only when a component truly exposes a two-way API
- Use `inject()` in field initializers or other valid injection contexts
- Keep one component focused on one responsibility
- Prefer inline templates for very small components
- Prefer `host: {}` for host bindings and listeners
- Prefer feature-local private helpers over bloated shared utility files
- Do not put networking, orchestration, and view logic all in the same component

Angular documents `input()` as returning an `InputSignal`, supports required inputs and input transforms, and `inject()` works in injection contexts. Angular’s AI guidance also recommends `host: {}` instead of `@HostBinding` / `@HostListener`. The newer `output()` API is production-ready from Angular v19 onward. ([angular.dev][3])

## Signals and reactivity

- Use `signal()` for local component state
- Use `computed()` for derived state
- Use `effect()` only for real side effects such as logging, storage sync, imperative APIs, or analytics
- Never use `effect()` to keep two pieces of state in sync if a `computed()` or a single source of truth can solve it
- Prefer `set()` and `update()` over mutation
- Keep signal transformations pure
- Avoid deep mutable objects as signal state when a flatter structure is clearer

Angular’s signal APIs are part of the modern core guidance, and Angular’s roadmap marks `Effect API` and related signal work as production-ready. ([angular.dev][4])

## Template rules

- Use `@if`, `@for`, and `@switch`
- Always include `track` in `@for`
- Keep template logic simple
- Move expensive or repeated computations out of templates
- Prefer direct class/style bindings over `ngClass` and `ngStyle`
- Do not write arrow functions in templates
- Do not rely on globals in templates unless explicitly exposed
- Prefer semantic HTML over div-heavy structures
- Use `@defer` for heavy, below-the-fold, or rarely used UI
- Use `@placeholder`, `@loading`, and `@error` when deferred content needs graceful states

Angular introduced built-in control flow to improve ergonomics, type narrowing, and performance, and deprecated `*ngIf`, `*ngFor`, and `*ngSwitch` in favor of the new syntax. `@defer` reduces initial bundle size and can improve metrics such as LCP and TTFB. For true deferral, deferred dependencies need to be standalone and not referenced elsewhere in the same file. ([Angular Blog][5])

## Routing and architecture

- Organize code by feature, not by technical layer only
- Prefer one feature per lazy route boundary
- Lazy-load routes by default
- Scope providers at route level when the state is feature-specific
- Use route resolvers for critical data needed before first render
- Keep route guards focused on access and navigation concerns
- Keep route configuration declarative and readable
- Do not hardcode URLs or environment-specific values inside components

Angular’s routing docs recommend lazy-loading as a key loading strategy, and data resolvers fetch route data before activation so components can render with the data already available, which is also useful for SSR. ([angular.dev][6])

## SSR, hydration, and rendering

- Prefer SSR or hybrid rendering for public, SEO-sensitive, or performance-sensitive pages
- Assume hydration is part of the baseline SSR setup
- For large pages, combine SSR with incremental hydration
- Use `@defer (hydrate ...)` strategically for parts that do not need to become interactive immediately
- Keep server and client DOM output structurally identical
- Use transfer cache defaults unless there is a clear reason to opt out

Angular’s hydration guide explains that hydration reuses server-rendered DOM and improves metrics such as FID, LCP, and CLS while avoiding UI flicker. Incremental hydration is stable since v20 and works with `withIncrementalHydration()`. Angular SSR also reuses cached `GET` and `HEAD` `HttpClient` responses during hydration by default, unless auth headers are involved. ([angular.dev][7])

## RxJS interop rules

- Use the `async` pipe in templates when a template is consuming an observable directly
- Use `toSignal()` when bridging observables into signal-based state or templates
- Call `toSignal()` once per source and reuse the resulting signal
- Provide `initialValue` or `requireSync` when needed
- Use `takeUntilDestroyed()` for imperative subscriptions
- Use `switchMap` for latest-only requests
- Use `exhaustMap` for submit flows that must ignore re-entry while busy
- Put `catchError` at the correct level so you do not accidentally kill the outer stream

Angular’s RxJS interop docs note that `toSignal()` subscribes immediately, auto-unsubscribes on destroy, and should not be called repeatedly for the same observable. `takeUntilDestroyed()` is the recommended concise way to clean up subscriptions. ([angular.dev][8])

## Forms rules

- Default to typed reactive forms for production apps
- Prefer explicit form models and validators over implicit template-driven logic
- Keep validation rules near the form model
- Map form values to DTOs explicitly
- Avoid large forms with business logic scattered across the template
- Only use Signal Forms if the user explicitly wants them or the team accepts experimental APIs

Angular’s typed reactive forms are the stable default. Signal Forms are still experimental and Angular explicitly warns that the API may change. The roadmap also lists Signal Forms and the Resource API as features to experiment with, not baseline production defaults. ([angular.dev][9])

## Performance rules

- Prefer `OnPush`
- Lazy-load feature routes
- Use `@defer` for heavy secondary UI
- Avoid synchronous layout reads inside loops
- Batch DOM work when possible
- Prefer stable object identities when rendering lists
- Avoid unnecessary signal churn
- Use `NgOptimizedImage` for static images
- Profile before applying low-level micro-optimizations

Angular’s performance guidance emphasizes controlling change detection carefully, and Angular’s AI guidance explicitly recommends `NgOptimizedImage` and `OnPush`. ([angular.dev][10])

## Accessibility rules

- Reuse native HTML elements whenever possible
- Prefer components that wrap native semantics instead of recreating them
- Bind ARIA attributes correctly with attribute/property binding
- Ensure keyboard access, visible focus, and sensible tab order
- Use Angular Material or CDK accessibility utilities when needed
- Pass AXE checks and meet WCAG AA minimums
- Do not ship custom interactive controls without verifying semantics and keyboard behavior

Angular’s accessibility guide explicitly recommends reusing native elements, binding ARIA correctly, and using Angular Material/CDK accessibility tools such as `LiveAnnouncer` and focus trapping utilities. Angular’s AI guidance also treats accessibility as a hard requirement. ([angular.dev][11])

## Security rules

- Rely on Angular’s default sanitization behavior by default
- Never bypass sanitization unless there is a reviewed, unavoidable reason
- If sanitization must be bypassed, use the correct `DomSanitizer` trust method for the exact context
- Prefer CSP and Trusted Types in hardened deployments
- Never hardcode secrets, API keys, or private endpoints in client code
- Treat all external HTML, URLs, and resource URLs as untrusted by default

Angular’s security guide covers built-in XSS protections, `DomSanitizer`, and Trusted Types integration. ([angular.dev][12])

## Testing rules

- Test public behavior, not private implementation details
- Prefer testing rendered output, interactions, and state transitions
- Test signal-driven updates as observable UI behavior
- Mock service boundaries, not the internals of the component under test
- Keep tests close to features
- Prefer small, deterministic tests over giant integration tests
- When using Material or CDK components, prefer harness-style testing where it improves resilience
- Test loading, error, empty, and success states

## AI-specific generation rules

- Generate standalone-first Angular code
- Do not emit NgModules unless explicitly requested
- Do not add `standalone: true`
- Use the newest stable syntax first
- If you use an experimental API, say so clearly
- Generate only the imports that are actually required
- Prefer official Angular APIs over custom abstractions unless the user asks otherwise
- Do not generate obsolete structural directives when modern control flow is available
- Do not generate placeholder comments like `TODO` instead of real code
- For forms, default to typed reactive forms
- For images, default to `NgOptimizedImage` when relevant
- For routing, default to lazy-loaded features
- For SSR/performance-sensitive pages, include hydration-aware decisions
- For host bindings/listeners, use the `host` field in the decorator

## Default stack for a new modern Angular app

- Standalone app with `bootstrapApplication`
- Strict TypeScript
- `strictTemplates`
- Extended diagnostics enabled
- Signals for local state
- Typed reactive forms
- Built-in control flow
- Lazy routes
- `OnPush`
- `NgOptimizedImage`
- SSR + hydration when the app benefits from it
- Incremental hydration for large public pages
- Tailwind, CDK, and Angular Material where appropriate

## What the AI should not do

- Do not default to NgModules
- Do not default to decorator-based inputs/outputs
- Do not use template-driven forms for large business forms
- Do not use `ngClass` and `ngStyle` as the first option
- Do not put complex logic inside templates
- Do not overuse `effect()`
- Do not mutate signal state directly
- Do not bypass Angular sanitization casually
- Do not introduce experimental APIs silently
- Do not generate bloated shared modules or giant utility barrels without reason

## Decision rules

| Situation                                | Default choice               |
| ---------------------------------------- | ---------------------------- |
| Small local UI state                     | `signal()`                   |
| Derived value from other state           | `computed()`                 |
| Imperative side effect                   | `effect()`                   |
| Observable consumed in template          | `async` pipe or `toSignal()` |
| Manual subscription needed               | `takeUntilDestroyed()`       |
| New component API input                  | `input()`                    |
| New component API output                 | `output()`                   |
| Two-way component contract               | `model()` if justified       |
| Heavy secondary content                  | `@defer`                     |
| Critical route data                      | Resolver                     |
| Complex production form                  | Typed reactive forms         |
| Public performance-sensitive page        | SSR + hydration              |
| Huge SSR page with delayed interactivity | Incremental hydration        |

## Code style

Use the code style defined in the [Angular Style Guide](https://angular.dev/styleguide) and format with [Prettier](https://prettier.io/). So, the code must be formatted properly.

## Libraries usage

Make sure to use the right libraries for the job, and prefer official Angular solutions when they exist. If you need to use a third-party library, make sure it is well-maintained, widely adopted,
and does not duplicate existing Angular functionality. For UI components, prefer Angular Material or CDK when they meet the requirements.
Try to use libraries whenever you can instead of reinventing the wheel.

## Output quality bar

Every generated solution should be:

- typed
- standalone-first
- signal-friendly
- lazy-load aware
- accessible
- secure by default
- easy to test
- free of legacy Angular patterns unless explicitly requested

## Extra resources:

1. [LLM prompts and AI IDE setup • Angular](https://v20.angular.dev/ai/develop-with-ai)
1. [Template type checking • Angular](https://angular.dev/tools/cli/template-typecheck)
1. [Accepting data with input properties • Angular](https://angular.dev/guide/components/inputs)
1. [Signals • Overview • Angular](https://angular.dev/guide/signals?utm_source=chatgpt.com)
1. [Announcing Angular v20. The past couple of years have been… | by Minko Gechev | Angular Blog](https://blog.angular.dev/announcing-angular-v20-b5c9c06cf301)
1. [Route Loading Strategies](https://angular.dev/guide/routing/loading-strategies?utm_source=chatgpt.com)
1. [Hydration • Angular](https://angular.dev/guide/hydration)
1. [Signals interop • Angular](https://angular.dev/ecosystem/rxjs-interop)
1. [Strictly typed reactive forms • Angular](https://angular.dev/guide/forms/typed-forms)
1. [Performance • Overview](https://angular.dev/best-practices/runtime-performance?utm_source=chatgpt.com)
1. [Accessibility • Angular](https://angular.dev/best-practices/a11y)
1. [Security • Angular](https://angular.dev/best-practices/security)