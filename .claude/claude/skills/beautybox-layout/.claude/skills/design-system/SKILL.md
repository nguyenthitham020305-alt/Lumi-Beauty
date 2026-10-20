---
name: design-system-d-ng-da
description: Creates implementation-ready design-system guidance with tokens, component behavior, and accessibility standards. Use when creating or updating UI rules, component specifications, or design-system documentation.
---

<!-- TYPEUI_SH_MANAGED_START -->

# Dưỡng da

## Mission
Deliver implementation-ready design-system guidance for Dưỡng da that can be applied consistently across e-commerce storefront interfaces.

## Brand
- Product/brand: Dưỡng da
- URL: https://beautybox.com.vn/categories/duong-da
- Audience: online shoppers and consumers
- Product surface: e-commerce storefront

## Style Foundations
- Visual style: structured, accessible, implementation-first
- Main font style: `font.family.primary=SVNMont`, `font.family.stack=SVNMont, sans-serif`, `font.size.base=14px`, `font.weight.base=400`, `font.lineHeight.base=22.001px`
- Typography scale: `font.size.xs=12px`, `font.size.sm=14px`, `font.size.md=16px`, `font.size.lg=18px`, `font.size.xl=20px`, `font.size.2xl=25px`
- Color palette: `color.surface.base=#000000`, `color.text.secondary=#fadb14`, `color.text.tertiary=#797979`, `color.text.inverse=#ab2328`, `color.surface.muted=#ffffff`, `color.surface.raised=#f7d8e7`, `color.surface.strong=#ffc08b`
- Spacing scale: `space.1=4.9px`, `space.2=6px`, `space.3=8px`, `space.4=10px`, `space.5=15px`, `space.6=20px`, `space.7=72.43px`, `space.8=147.86px`
- Radius/shadow/motion tokens: `radius.xs=2px`, `radius.sm=17px`, `radius.md=999px` | `motion.duration.instant=200ms`, `motion.duration.fast=300ms`, `motion.duration.normal=400ms`, `motion.duration.slow=500ms`, `motion.duration.slower=800ms`

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
concise, confident, implementation-focused

## Rules: Do
- Use semantic tokens, not raw hex values in component guidance.
- Every component must define required states: default, hover, focus-visible, active, disabled, loading, error.
- Responsive behavior and edge-case handling should be specified for every component family.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and tokens.
3. Define component anatomy, variants, and interactions.
4. Add accessibility acceptance criteria.
5. Add anti-patterns and migration notes.
6. End with QA checklist.

## Required Output Structure
- Context and goals
- Design tokens and foundations
- Component-level rules (anatomy, variants, states, responsive behavior)
- Accessibility requirements and testable acceptance criteria
- Content and tone standards with examples
- Anti-patterns and prohibited implementations
- QA checklist

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Prefer system consistency over local visual exceptions.

<!-- TYPEUI_SH_MANAGED_END -->
