# Fashion Store Acceptance Checklist

Use this checklist twice: first to scope the work, then against the deployed production site. Mark an item complete only after direct verification. Items labeled “when in scope” are conditional; all other items are required.

## 1. Identity, safety, and repository

- [ ] Active Selldone shop id, name, handle, currency, locale, language, domain, and shop type are confirmed.
- [ ] Live categories, products, variants, media, inventory, tags, offers, pages, and posts were audited before bulk writes.
- [ ] The project contains the tracked Fashioni v2 source, not merely this skill and checklist.
- [ ] `starter.manifest.json` exists and reports `starterVersion` 2 or newer.
- [ ] `.starter-provenance.json` records the imported repository, ref, and exact commit.
- [ ] The recorded commit was compared with the current `main` of `https://github.com/alireza-selldone/selldone-fashioni.git`.
- [ ] Required v2 markers for Best Sellers, timed-sale UI, size guide, variant swatches, and drag/swipe rails are present.
- [ ] Repository and deployment targets belong to this shop and use the requested visibility.
- [ ] No stale Digini, Watchino, Fashioni, old shop id, OAuth client, domain, screenshot, or copied brand statement remains.
- [ ] Running setup for a different shop clears the starter OAuth client, domain, audiences, and visible Fashioni identity before deployment.
- [ ] No ruler, measuring rail, tick ruler, vertical progress rail, permanent side strip, or reserved page margin remains in DOM, generated HTML, or CSS.
- [ ] Unrelated files, uncommitted changes, and Git history were preserved.
- [ ] The final tested commit is pushed to the intended remote.

## 2. Taxonomy and catalog integrity

- [ ] Category names are human-readable and redundant categories were merged or nested.
- [ ] `All Products`, `Shop by category`, and `Shop by product` exist only as UI copy and were not created as Selldone categories.
- [ ] Products use appropriate audience/age and product-type classifications when the catalog supports both.
- [ ] Every product has exactly one real product-type main category; audience assignments are shortcut categories, not hierarchy wrappers.
- [ ] Women, Men, Girls, Boys, and Baby are used only when relevant; Baby covers under 24 months.
- [ ] Baby Girls and Baby Boys are nested beneath Baby when inventory justifies them.
- [ ] A live hierarchy read-back proves there is no self-parenting, parent cycle, duplicate wrapper, or empty navigation-label category.
- [ ] Multi-category or shortcut-category assignments are stored in Selldone rather than simulated only in navigation.
- [ ] Brands navigation is shown only when meaningful brand data exists.
- [ ] Brands hover/focus content, A–Z directory, search, counts, and representative images come from live catalogue data.
- [ ] Clicking each exposed brand opens a correctly titled listing containing only products assigned to that brand.
- [ ] Empty or misleading categories are not exposed.
- [ ] Product titles, descriptions, brands, prices, currency, materials, care, fit, weight, shipping facts, and policies come from live data or are clearly labeled demo data.
- [ ] Physical products have valid SKUs and usable inventory records.
- [ ] A demo build adds no more than 100 products and keeps the catalog at or below 300 unless the brief overrides the limit.
- [ ] Shared specification schemas are reused across comparable products.

## 3. Image quality and transparency

- [ ] Every exposed category has an uploaded category image, not only a frontend asset.
- [ ] Product and category cutouts use true alpha transparency.
- [ ] Pixel inspection confirms no baked checkerboard, white rectangle, gray matte, or halo.
- [ ] Default product cutouts are square with the subject near 60% of the canvas; category cutouts are near 70%, unless the brief overrides this.
- [ ] Subjects are centered, contained, uncropped, and have consistent breathing room.
- [ ] Product imagery has coherent lighting, scale, camera direction, shadow treatment, and color fidelity.
- [ ] Gallery images are useful and visually distinct; accidental duplicates are removed.
- [ ] Campaign art has tested desktop and mobile crops.
- [ ] Images have meaningful alt text, intrinsic dimensions, optimized formats, and no broken URL.

## 4. Variants, sizes, and inventory

- [ ] Every product with visual color variants was audited, not merely a sample.
- [ ] Offered color names and swatches match real product imagery and merchant data.
- [ ] Invented composite colors and irrelevant swatches were removed.
- [ ] Every visually distinct color has at least one accurate image.
- [ ] Mapping is deterministic by variant id or canonical value, not gallery array order.
- [ ] Selecting each color updates the image immediately on product pages and product cards.
- [ ] Returning from the last color to the first restores the first image; no selection gets stuck.
- [ ] Direct or restored variant state initializes the correct image, SKU, price, stock, and available sizes.
- [ ] Demonstration products with color and size offer at least 3 stocked sizes per color; real inventory remains authoritative.
- [ ] Color controls include visible names, selected states, keyboard support, and screen-reader labels.
- [ ] Selected rings and outlines have adequate padding and are not clipped on their left or any other edge.

## 5. Shared UI and visual system

- [ ] Current fashion references were compared and the chosen design direction is documented without copying protected assets or code.
- [ ] Screenshot artifacts such as stray right whitespace or duplicated sticky headers were not reproduced.
- [ ] Home, listing, category, product, cart, checkout, account, information, blog, and article pages use one coherent system.
- [ ] Header and footer are shared components and remain visually consistent across routes.
- [ ] Full-width sections have symmetric edges and no unexplained left or right gap.
- [ ] Hero height is bounded and useful at every breakpoint; it does not monopolize the viewport or overlap copy.
- [ ] Typography, spacing, buttons, forms, cards, icons, and focus states follow consistent tokens.
- [ ] Legacy starter features are retained only when they support the current brief.

## 6. Header, navigation, and first paint

- [ ] Search begins at the intended left edge of the header content and remains correctly sized.
- [ ] Logo scale, checkout button, icons, and primary navigation have compact intentional spacing.
- [ ] Audience navigation and optional Brands navigation match the live taxonomy.
- [ ] Desktop mega menus and mobile navigation are keyboard/touch usable and do not overflow.
- [ ] Static first paint and hydrated header match; no half-second flash of an obsolete centered-search layout occurs.
- [ ] Category and listing titles are correct on first paint; no `All Products` or wrong-title flash occurs.
- [ ] Loading skeletons match final geometry and prevent meaningful layout shift.

## 7. Listings, filters, cards, and carousels

- [ ] Desktop exposes a compact top filter row with relevant Department, Size, Category, Brand, More, and Sort controls.
- [ ] Additional filters are generated from real data and may include Color, Material, Fit, Length, Sleeve, Pattern, Use, Style, and Price.
- [ ] Active filters, result counts, Clear All, sort, price ranges, and manual min/max inputs work.
- [ ] Mobile filtering uses an accessible drawer or bottom sheet and does not cover product content when closed.
- [ ] Product grids show the tested desktop/mobile density, normally 4 cards desktop and 2 mobile.
- [ ] Card swatches change images forward and backward and keep selected state synchronized.
- [ ] Cards show consistent image scale, current price, previous price when discounted, and stock/promotion truth.
- [ ] Product rails drag with a mouse, swipe with touch, hide scrollbars, suppress clicks after drag, and reveal the next card predictably.
- [ ] Partial next-card previews never create page-level horizontal overflow.

## 8. Product page and purchase flow

- [ ] Gallery thumbnails are unique, variant-aware, and select the correct main image.
- [ ] Swatch containers allow selected outlines to render fully without clipping.
- [ ] Size availability updates with the selected color.
- [ ] Size Guide opens a responsive bottom sheet with a category-specific table, focus management, and accessible close behavior.
- [ ] Add to Bag is the black primary action and Buy Now uses a clearly different approved accent.
- [ ] Fit, materials, care, delivery, and returns are shown only when reliable data exists.
- [ ] Cart actions, quantity, stock validation, checkout handoff, and authentication callback work.
- [ ] Related-product cards retain the same variant, pricing, promotion, and drag behavior as other cards.

## 9. Dynamic merchandising and promotions

- [ ] When in scope, Trending and Best Sellers are queried from Selldone Survey tags rather than hardcoded product ids.
- [ ] The default demo has 20 `trending` and 20 different `best-seller` products, or the brief's requested counts.
- [ ] Tag counts and disjoint membership are verified in backend data.
- [ ] Best Sellers appears immediately below Trending when requested and has a distinct but coherent card treatment.
- [ ] Timed offers are real or explicitly authorized demo data and use one authoritative end time.
- [ ] Countdown badges are live, compact, visually restrained, and shorter/smaller on mobile.
- [ ] Expired offers resolve cleanly without negative time, stale badges, or wrong prices.
- [ ] Old and new prices plus the countdown appear consistently on product pages, cards, merchandising rails, and search results.

## 10. Search, content, and trust

- [ ] Search returns the correct product, image, selected price, discount state, and compact promotion badge.
- [ ] Search results link to real product routes and do not expose duplicate or stale records.
- [ ] When editorial content is in scope, each post has original copy and art, metadata, alt text, related links, and a working article URL.
- [ ] Article URLs never fall back silently to the homepage.
- [ ] Demonstration reviews are labeled as samples and excluded from real rating totals.
- [ ] No fabricated trust claim, policy, delivery promise, sustainability claim, or contact detail is presented as fact.

## 11. Responsive, accessibility, and performance quality

- [ ] Local and production builds were checked at 1440, 1024, 768, and 390 CSS pixels.
- [ ] No horizontal overflow, clipped text/control, broken image, sticky overlap, carousel scrollbar, or off-screen dialog exists.
- [ ] Touch targets are at least 44×44 CSS pixels where practical.
- [ ] Keyboard users can reach navigation, filters, swatches, galleries, size guide, carousels, and purchase actions.
- [ ] Focus is visible; dialogs trap and restore focus appropriately; controls have useful accessible names.
- [ ] Color is never the only carrier of selection, price, or error state.
- [ ] Image dimensions and layout-matched skeletons prevent avoidable layout shifts.
- [ ] First-paint, loading, empty, error, expired-promotion, and no-results states are intentional and usable.
- [ ] No visible control is dead or decorative unless it is clearly non-interactive.

## 12. Security and deployment

- [ ] No secret, token, client secret, private API key, credential, raw connector response, or `.env` is committed or shipped to the browser.
- [ ] Browser authentication uses public Authorization Code + PKCE.
- [ ] Build and relevant lint, type, test, and repository-specific checks pass, with any accepted pre-existing warning documented.
- [ ] Production serves the tested generated assets and the expected commit/version.
- [ ] `npm run build` and `npm run check` pass on the repointed clone, not only on the Fashioni source shop.
- [ ] Existing Git-connected deployment was reused when healthy; unavailable interactive CLI auth was not mistaken for a failed deployment.
- [ ] Live home, category, product, cart, article, search, OAuth callback, asset, 404, and refresh behavior are verified.
- [ ] Preferred custom domain resolves, or a working provider URL and exact domain blocker are reported.

## 13. Final handoff

- [ ] Documentation includes accurate setup, checks, deployment steps, live URL, and fresh desktop/mobile production screenshots.
- [ ] Final report includes repository URL, commit hash, deployment/version id, live URL, product/category/post/tag counts, and validation summary.
- [ ] Remaining merchant-owned facts or approvals are listed explicitly without disguising them as completed work.
- [ ] The site remains running at the delivered local or production URL until the user asks to stop it.
