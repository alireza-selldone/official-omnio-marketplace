---
name: setup-selldone-fashion-store
description: Clone the maintained Fashioni v2 storefront, repoint it to the connected Selldone shop, redesign and populate the catalog, validate every commerce interaction, and publish the finished fashion store to GitHub and Cloudflare. Use for end-to-end physical fashion-store setup or migration. Do not use for non-fashion catalogs or non-physical products.
---

# Set Up a Selldone Fashion Store

Run the connected fashion shop from discovery through verified production launch. Treat “run it” as authorization to perform reversible in-scope implementation, not merely to propose a plan.

Read [the acceptance checklist](references/acceptance-checklist.md) before writing. Use it again against the production site before declaring completion.

For every new or legacy-template project, also read [the Fashioni v2 starter contract](references/starter-contract.md). Do not substitute Digini, Watchino, an empty scaffold, or remembered code for the maintained starter.

## Operating contract

- Derive the shop identity from the active Selldone connection. Do not ask the user to repeat discoverable facts.
- Audit before mutation. Read the live catalog, taxonomy, variants, media, inventory, tags, pages, posts, repository, and deployment state.
- Keep reruns idempotent. Update existing records and mappings instead of duplicating products, categories, posts, repositories, tags, or deployments.
- Preserve valid catalog data, unrelated files, uncommitted changes, and Git history.
- Use live facts for real stores. Never fabricate prices, stock, materials, sizes, claims, reviews, contact details, or policies.
- Clearly label demo inventory, editorial content, and reviews. Demo reviews must never affect a real rating.
- Announce material external writes such as bulk product edits, publishing, repository creation, and deployment.
- Continue until the requested outcome is verified. Stop only for a genuinely ambiguous shop, missing authority, an unavoidable destructive conflict, or a domain the connected account cannot control.

## Defaults and overrides

Explicit user instructions and live merchant data override these defaults. Apply the numerical defaults only to a full demonstration build when the user has not supplied different numbers:

- Add no more than 100 demo products and keep the finished catalog at or below 300 products.
- Publish 6 useful illustrated fashion articles when editorial content is in scope.
- Tag 20 products `trending` and a different 20 products `best-seller` when dynamic merchandising is in scope.
- Use timed promotions on roughly 30–40 demo products only when a promotional demo is requested. Never invent promotions for a real catalog.
- Use square transparent product assets with the subject occupying about 60% of the canvas; use transparent category cutouts at about 70%. Center subjects and preserve breathing room.
- Show 4 product cards per row at standard desktop widths and 2 per row on mobile unless the selected design system has a better tested breakpoint rule.

These values are guardrails, not reasons to replace good live data or force irrelevant content.

## Identity and naming

Derive once and reuse consistently:

```text
STORE_NAME  = exact shop name from Selldone
SHOP_SLUG   = STORE_NAME as lowercase kebab-case
REPO_NAME   = selldone-SHOP_SLUG unless an existing repository or brief overrides it
WORKER_NAME = selldone-SHOP_SLUG unless hosting configuration overrides it
LIVE_DOMAIN = SHOP_SLUG.selldone.shop when that zone is available
STARTER_REPO = https://github.com/alireza-selldone/selldone-fashioni.git
STARTER_REF  = main
STARTER_MIN_VERSION = 2
```

The Fashioni repository is the required design and behavior baseline unless the user explicitly supplies a newer replacement. It is an implementation aid, never production identity. Remove stale template names such as Digini, Watchino, Fashioni, old shop ids, domains, OAuth clients, screenshots, and brand copy.

## Mandatory starter gate

For a new empty project, run:

```text
python scripts/bootstrap_fashioni_starter.py <project-directory>
```

The helper clones the latest tracked `main`, rejects a starter older than `starterVersion: 2`, verifies the new-design markers, rejects ruler/rail artifacts, records the exact commit in `.starter-provenance.json`, and initializes a clean project repository with Fashioni as `upstream`.

For a non-empty project, do not run the empty-directory helper over existing files. Fetch `STARTER_REPO`, migrate deliberately, preserve user work, and then satisfy the same manifest and design-marker checks. Never silently skip this gate because a repository already exists.

## Phase 1 — Discover and protect

1. Confirm shop id, handle, name, domain, currency, locale, language, and shop type from Selldone.
2. Inventory categories, products, shortcut categories, variants, galleries, inventory, ratings, tags, timed offers, pages, and posts.
3. Record a baseline: counts, empty categories, missing or duplicate images, fake or mismatched color values, missing sizes, variants without images, broken media, and existing merchandising tags.
4. Inspect local instructions, Git status and remotes, package scripts, public configuration, and hosting configuration.
5. Check GitHub and hosting authentication without exposing credentials.

## Phase 2 — Bootstrap without carrying template debt

1. For an empty project, run the bundled bootstrap helper. For an existing project, compare it with the latest `STARTER_REF` and migrate the Fashioni v2 storefront deliberately.
2. Never overwrite unrelated files or erase history to make a starter fit.
3. Verify `starter.manifest.json` has `starterVersion >= 2`, every required marker exists, every forbidden marker is absent, and `.starter-provenance.json` records the imported commit.
4. Confirm the imported commit is the current remote `main` or a descendant that the user explicitly selected. A copied checklist without the v2 source is a failed bootstrap.
5. Set the shop repository as `origin`; keep `STARTER_REPO` as read-only `upstream`.
6. Use the requested repository visibility. Do not make a merchant project public without instruction.
7. Remove legacy storefront chrome and artifacts from DOM and CSS. Never ship a ruler, measuring rail, tick ruler, vertical progress rail, permanent side strip, or page margin reserved for one.
8. Install dependencies, run the starter's setup command with the connected shop identity, and inspect its “STILL TO DO” report before customization.
9. Commit an identifiable baseline before large catalog or visual changes.

## Phase 3 — Connect Selldone safely

1. Populate public runtime configuration from the active shop, not copied values.
2. Configure real identity, ids, slugs, currency, locale, metadata, structured data, and merchant-provided contact fields.
3. Keep secrets server-side. Never commit `.env`, client secrets, private keys, tokens, Wrangler credentials, or raw connector responses.
4. Browser authentication must use a public Authorization Code + PKCE flow.
5. Search the repository for stale ids, domains, template brands, and credentials before continuing.

## Phase 4 — Build a compact professional taxonomy

1. Preserve valid categories and normalize human-readable titles.
2. Treat `All Products`, `Shop by category`, and `Shop by product` as UI copy only. Never materialize a navigation heading as a Selldone category or hierarchy wrapper.
3. Use two complementary dimensions where the catalog supports them:
   - audience or age: Women, Men, Girls, Boys, Baby;
   - product type: Tops, Dresses, Trousers, Footwear, Accessories, and other relevant types.
4. Give every product exactly one real product-type main category, plus relevant audience shortcut categories. Audience roots must not become parents of product-type categories. Baby means under 24 months; Baby Girls and Baby Boys are the only audience children and live beneath Baby when stock justifies them.
5. Before mutation, reject self-parenting, parent cycles, duplicate wrappers, and names that are only navigation copy. After mutation, read back the hierarchy and product counts to prove the same invariants hold.
6. Merge redundant categories and nest narrow groups. Do not expose a flat, repetitive mega-list.
7. Add Brands navigation only when brand data is meaningful. When exposed, build its hover/focus menu and directory from live brand values, counts, and representative product media; clicking a brand must open a genuinely prefiltered listing rather than an All Products alias.
8. Fill obvious demo gaps with coherent products rather than arbitrary volume. Use the physical-product builder for every created item.
9. Ensure accurate title, brand, category, description, commercial data, SKU, physical inventory, material, care, fit, sizes, colors, weight, and shipping facts when available.
10. Reuse shared specification schemas for comparable products.

## Phase 5 — Make imagery and variants truthful

1. Audit every applicable product, not a small sample.
2. Derive color options from the actual product images and merchant data. Remove invented, composite, or mislabeled swatches.
3. Give every visually different color an accurate image. Do not reuse an unchanged image for another color.
4. Verify transparency programmatically. A checkerboard baked into pixels, a white rectangle, or a gray matte is not transparency.
5. Remove duplicate gallery entries and keep only useful distinct views.
6. Map each color by variant id or canonical color to a gallery asset. Never depend on array position alone.
7. A color selection must update the image in product cards and the product page, in every direction, without getting stuck on the last selection.
8. Direct URLs and restored state must initialize the correct variant image.
9. For products with both color and size, stock at least 3 valid sizes for each offered color in a demonstration catalog. Real inventory remains authoritative.
10. Keep selection accessible: visible color name, selected state, keyboard interaction, screen-reader label, and non-color-only indication.

Use original square assets, consistent camera and lighting, intrinsic dimensions, useful alt text, and optimized formats. Create desktop and mobile crops for campaign imagery rather than forcing one crop everywhere.

## Phase 6 — Build the commerce design system

1. Compare up to three current fashion references that fit the audience and price point. Record the chosen reference, access date, and adopted patterns in `DECISIONS.md`.
2. Adapt information hierarchy, density, rhythm, navigation, typography mood, filtering, and responsive behavior. Never copy source code, logos, trade dress, product photos, copy, or proprietary icons.
3. Treat screenshots as evidence, not pixel-perfect truth. Ignore capture artifacts such as stray right margins, duplicated sticky headers, or partial dynamic sections; cross-check multiple captures and the live behavior.
4. Use one shared header and footer across home, listing, category, product, cart, checkout, account, information, blog, and article routes.
5. Make first-paint markup match hydrated UI. The header, search, title, and category must not flash through an obsolete layout.
6. Keep full-width sections symmetric and free of unexplained side gaps. Bound hero height with responsive `clamp()` or tested min/max values; do not let an arbitrary large `vh` dominate the page.
7. Keep theme switching only when the brief requests it or the retained starter genuinely supports it. Do not preserve template features solely because they existed upstream.

### Required listing and discovery behavior

- Use a compact top filter row on desktop. Core controls are Department, Size, Category, Brand, More, and Sort when relevant.
- More may expose Color, Material, Fit, Length, Sleeve, Pattern, Use, Style, and Price based on available data.
- Show active filters, result counts, and Clear All. Use a drawer or bottom sheet on mobile.
- Search results must show the same current price, previous price, color behavior, inventory truth, and promotion state as other product surfaces.
- Product rails support mouse drag and touch swipe, suppress clicks after a drag, hide native scrollbars, and reveal a partial next card where helpful.

### Required product-card behavior

- Keep image scale and whitespace consistent.
- Swatches are interactive and update the card image both forward and backward.
- Selected outlines are never clipped.
- Timed-sale cards show a compact responsive countdown plus old and new price.
- Cards remain usable by keyboard and do not become accidental links while dragging a rail.

### Required product-page behavior

- Gallery thumbnails are unique and variant-aware.
- Swatch containers have enough padding and visible overflow so the selected ring cannot be cropped.
- Size availability follows the selected color.
- Size Guide opens a responsive bottom sheet with a category-specific table and accessible close behavior.
- Add to Bag is a black primary action; Buy Now uses a clearly different approved accent.
- Fit, material, care, delivery, and returns appear when real data exists.
- Timed promotions show a live, compact countdown and old/new pricing without overpowering the product.

## Phase 7 — Drive merchandising from Selldone

1. Use Selldone product Survey tags as the source of truth; do not hardcode product ids in the frontend.
2. For the full demo default, assign `trending` to 20 products and `best-seller` to 20 different products. Preserve merchant tags and verify the two sets are disjoint.
3. Render Trending dynamically. Place a visually distinct Best Sellers section directly after it unless the brief specifies another order.
4. Keep swatches, sale prices, countdowns, drag/swipe, stock truth, and links functional inside both sections.
5. Timed countdowns must use one authoritative end time, update without hydration errors, expire cleanly, and remain compact on mobile.

## Phase 8 — Publish original editorial content

When editorial content is in scope, derive useful posts from the live catalog and audience. Use distinct subjects such as fit, styling, fabric care, capsule wardrobes, layering, and color coordination. Each post needs original copy and cover art, slug, excerpt, author label, date, SEO metadata, headings, related links, alt text, and a real article route. Verify that article URLs never fall back to the homepage.

## Phase 9 — Verify behavior, not just appearance

1. Run build, type, lint, and repository-specific checks. Fix regressions introduced by this work.
2. Test local and production builds at 1440, 1024, 768, and 390 CSS pixels.
3. Test the initial uncached paint and hydrated state separately.
4. Click every color on representative products in both directions on cards and product pages; verify image, size availability, SKU, and stock remain synchronized.
5. Test search, header navigation, mega menus, filters, sort, manual price entry, galleries, size guide, cart actions, authentication callback, merchandising rails, promotions, posts, and 404 behavior.
6. Check true transparency, duplicate images, broken URLs, clipping, overflow, sticky overlap, dead controls, layout shift, and inaccessible focus states.
7. Complete every item in the acceptance checklist against the deployed origin.

## Phase 10 — Publish and deploy

1. Document the real store, setup, checks, deployment, live URL, and fresh desktop/mobile screenshots.
2. Stage only intended files, commit in logical units, and push the tested state to the shop repository.
3. Deploy the generated static assets using the project's configured provider; Cloudflare Workers Static Assets is the default for this starter.
4. Prefer an existing Git-connected deployment when it is already healthy. Interactive Wrangler authentication is not required if the connected deployment has published the tested commit.
5. Configure the preferred custom domain when controlled by the connected account; otherwise preserve the working deployment and report the exact blocker.
6. Verify production content and behavior, not merely a successful deployment status.
7. Report repository URL, commit hash, deployment/version id, live URL, catalog and post counts, checks run, and any remaining merchant-owned facts.

## Completion rule

Completion requires verified Fashioni v2 provenance, a pushed shop repository, truthful catalog and variant media, working responsive discovery and purchase interactions, required dynamic sections and editorial content, a passed production acceptance checklist, and a verified live URL. A copied checklist without the starter source, a plan, local-only preview, partial bulk edit, or unchecked deployment is not completion.
