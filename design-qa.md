# Design QA

## Reference

- Source: `C:\Users\anton\.codex\generated_images\019ff039-5898-7403-a028-a9babb864d58\exec-f7866ff1-101d-4625-bd58-895cb1d7d1d4.png`
- Reference viewport: `1488 x 1058`
- State: landing page, signed out

## Captures

- Desktop implementation: `artifacts/design-qa/landing-desktop.png`
- Desktop side-by-side: `artifacts/design-qa/comparison-desktop.png`
- Mobile implementation: `artifacts/design-qa/landing-mobile.png`
- Current desktop before change: `artifacts/design-qa/landing-desktop-current-production.png`
- Current desktop after change: `artifacts/design-qa/landing-desktop-after.png`
- Mobile before change: `artifacts/design-qa/landing-mobile-before.png`
- Mobile after change: `artifacts/design-qa/landing-mobile-after.png`
- Responsive comparison: `artifacts/design-qa/comparison-responsive-mobile-pass.png`
- Mobile image-background correction: `artifacts/design-qa/landing-mobile-no-square.png`
- Mobile image-background comparison: `artifacts/design-qa/comparison-mobile-image-background.png`
- Mobile vertical-balance correction: `artifacts/design-qa/landing-mobile-balanced.png`
- Mobile vertical-balance comparison: `artifacts/design-qa/comparison-mobile-vertical-balance.png`
- Full-flow responsive audit before fixes: `artifacts/responsive-audit/before/`
- Full-flow responsive audit after fixes: `artifacts/responsive-audit/after/`

## Comparison history

1. Initial capture: the hero was too low, the illustration was too small and the three-step row started about 70 px below the reference.
2. First adjustment: matched the step row and illustration bounds; the grid's intrinsic image height still pushed the copy down.
3. Final adjustment: constrained the desktop grid row and aligned the copy, buttons, illustration and steps with the reference.
4. Mobile density pass: reduced the illustration and vertical spacing below `540px`, kept both actions prominent and arranged the three explanatory steps in a compact row.
5. Mobile image pass: the reduced illustration exposed the raster's rectangular background. Replacing the mobile-only multiply blend with darken integrates the asset into the page while leaving the desktop rendering unchanged.
6. Mobile height pass: tall mobile viewports left excessive empty space below the steps. Height-aware spacing now distributes that space around the composition while preserving the compact, scroll-free layout on shorter screens.
7. Full-flow responsive pass: removed page-level overflow from selection and review, stacked the intermediate layout at `1024px`, converted the review table into mobile cards and made progress actions full-width on narrow screens.

## Final visual review

- P0: none.
- P1: none.
- P2: none.
- P3: minor raster and antialiasing differences remain in the independently recreated illustration and brand mark.
- The desktop composition, spacing, button geometry, typography hierarchy and three-step row match the supplied reference at the target viewport.
- The desktop composition remains unchanged and fits exactly at `1488 x 1058` (`scrollHeight: 1058`, `scrollWidth: 1488`).
- The mobile layout preserves the complete illustration, content, actions and steps in one viewport at `375 x 667`, `390 x 700`, `390 x 844` and `520 x 844`.
- The mobile illustration no longer shows a rectangular image boundary; its organic backdrop blends into the page background without clipping the folders or files.
- Tall mobile screens use the available height more evenly; short mobile screens retain the compact spacing and remain scroll-free.

## Interaction and responsive checks

- Complete exploration flow checked: selection, review, confirmation, progress, pause, resume and result.
- Selection and review align to one content axis at `390`, `768`, `1024` and `1488` px; no child crosses the viewport at those widths.
- Review uses compact, labelled cards below `540px` instead of requiring horizontal table scrolling.
- Source and destination remain side-by-side on tablet and stack on mobile; progress controls stack only where space is limited.
- Move action checked: execution remains disabled until the explicit confirmation is selected.
- Missing Google configuration checked: a user-facing message is shown and exploration remains available.
- Browser console: no errors or warnings during the checked flow.
- Horizontal overflow: none at `390`, `768`, `1024` or `1488` px.
- Mobile scroll: none at `375 x 667`, `390 x 700`, `390 x 844` or `520 x 844`.
- Reduced motion: supported through `prefers-reduced-motion`.

- Workspace navigation, transfer center, schedules and history checked at 390, 768, 1024 and 1488 px.
- The mobile virtualized job cards use breakpoint-aware row heights; no overlap remains at 390 px.
- The new workspace views produced no browser console errors or warnings.

final result: passed

## Legal and component polish — 2026-08-12

- Favorite cards now use a consistent two-action layout without native button borders.
- Virtualized job cards fit inside each allocated row with a clean 12 px canvas gap.
- Privacy, data provenance and legal notice routes were checked at desktop and 390 px mobile width.
- OAuth disclosure and copyright remain visible without horizontal overflow.
- Browser console: no errors.

final result: passed
