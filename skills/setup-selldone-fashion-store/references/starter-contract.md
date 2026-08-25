# Fashioni v2 Starter Contract

Read this reference whenever a project is new, still uses Digini/Watchino, or may not contain the current Fashioni storefront source.

## Required source

```text
Repository: https://github.com/alireza-selldone/selldone-fashioni.git
Ref:        main
Manifest:   starter.manifest.json
Minimum:    starterVersion 2
```

Do not recreate the design from screenshots or copy only the skill files. The project must receive the tracked application source from the repository.

## Empty project

Run the skill's helper from the skill directory:

```text
python scripts/bootstrap_fashioni_starter.py <project-directory>
```

The target must be empty, although an otherwise empty initialized `.git` directory is allowed. The helper:

1. clones the latest requested ref into a temporary directory;
2. validates `starter.manifest.json` and all required/forbidden markers;
3. exports only Git-tracked files, so local screenshots, `.env`, caches, and temporary product references are excluded;
4. writes `.starter-provenance.json` with the source commit;
5. initializes Git when needed and sets Fashioni as `upstream`, never `origin`.

After bootstrap:

```text
npm install
npm run setup -- --shop-id <id> --handle <handle> --name <name> --domain <domain>
npm run build:pages
npm run build
npm run check
```

Add `--oauth-client-id` and `--oauth-app-name` only when the new shop's public OAuth application exists. Setup must never retain Fashioni's OAuth client for another shop.

## Existing non-empty project

Do not run the empty-target helper with a force flag. Instead:

1. preserve the worktree and history;
2. add or fetch the Fashioni repository as `upstream`;
3. compare the existing implementation with the latest tracked `main`;
4. migrate the v2 storefront architecture and behavior deliberately;
5. create `.starter-provenance.json` from the imported commit;
6. run the same marker checks, setup, build, and acceptance suite.

## V2 evidence

The manifest and source must prove at least these behaviors exist:

- dynamic Trending and distinct Best Sellers sections driven by Selldone Survey tags;
- live compact timed-sale badges and old/new pricing on cards, PDP, and search;
- product-card and PDP color swatches with deterministic variant images;
- a responsive size-guide bottom sheet;
- mouse-drag and touch-swipe merchandising rails;
- a compact shared header without first-paint layout swapping;
- a centered primary navigation group beginning with All Products, without a Shop by Product top-level item;
- a live Brands hover/focus menu and searchable A–Z directory whose links open truly filtered listings;
- taxonomy guards that keep UI headings out of Selldone categories and reject hierarchy cycles;
- no fixed ruler, tick ruler, progress rail, or reserved side gutter.

If any marker is absent, stop the bootstrap and update from the starter. Do not compensate by claiming the checklist is complete.
