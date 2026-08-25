# Blog — standing instruction

**This runs automatically for every shop this repo is imported into. Nobody should have to ask for it.**

When you are set up on a new shop and the Selldone MCP connector is available, do the following without being prompted.

---

## 1. Work out what the shop sells

Read the catalogue and infer the sector — do not ask.

```
selldone_category_list
selldone_product_list   dir="*", products_only=true, with_category=true
```

Categories are the strongest signal, product names second. A shop with *Men's Classic*, *Heritage & Leather* and *Haute Horlogerie* is a watch shop. One with *Outerwear*, *Knitwear* and *Footwear* is clothing. One with *Brake Pads* and *Suspension* is car parts.

State the sector you concluded, and the categories you concluded it from, before writing anything. If the catalogue is empty or genuinely ambiguous, that is the only case where you stop and ask.

## 2. Delete the default posts

Whatever seed or placeholder posts exist in the shop's blog, remove them. They are template filler and never relate to the shop.

**Before deleting, assert `selldone_current_connection` returns the shop you intend.** More than one connector may be loaded. Deletion is irreversible.

List what you are about to delete and how many, then delete. Report the count.

## 3. Create four blog categories

Before writing, create four categories that fit the sector, and assign exactly one post to each. One category per post, four categories, four posts.

Derive them from what the sector actually divides into:

| Sector | Categories |
|---|---|
| Watches | Lifestyle · Care & Servicing · Collecting · Guides |
| Clothing | Style · Fabric & Care · Sustainability · Guides |
| Car parts | Maintenance · Installation · Performance · Guides |
| Jewellery | Style · Care · Gemstones · Guides |

The pattern is: one about *living with it*, one about *maintaining it*, one about *the subject itself in depth*, and one *practical guide*. Adapt the names to the sector; do not reuse a watch category on a clothing shop.

## 4. Write four posts for that sector

Four posts, each **600–900 words**, written for someone who is deciding what to buy — not for search engines.

Cover these four angles, adapted to the sector:

| # | Angle | Watch shop | Clothing shop | Car parts shop |
|---|---|---|---|---|
| 1 | **How to choose** | Movement types and what they mean day to day | Fit and fabric weight by season | Matching a part to your exact model |
| 2 | **Care and longevity** | Servicing intervals, water resistance | Washing, storage, repairs | Installation intervals, wear signs |
| 3 | **Materials or mechanics** | Case metals, crystal, strap leather | Cotton, wool, synthetics compared | OEM vs aftermarket, materials |
| 4 | **Buying guide for beginners** | A first mechanical watch | Building a capsule wardrobe | First-time DIY repairs |

**How to write them:**

- Concrete and specific. Real trade-offs, real numbers where they exist.
- No superlatives, no "ultimate guide", no "in today's fast-paced world".
- Reference the shop's actual categories and product types where it fits naturally. Do not name individual products or quote prices — both go stale.
- Do not invent facts about the shop: no founding dates, no staff, no awards, no claims about where things are made. Write about the *subject*, not about the business.
- Write in the same language as the shop's existing content.
- Each post needs a title under 60 characters and a one-sentence excerpt.
- **Set a publication date on every post.** Do not leave them all stamped with today, which makes the blog look generated in one sitting. Spread them across the last three to four months, oldest first in the order written, a few weeks apart. Use plausible weekdays.
- **Assign the post its category** from step 3. One category each.

## 5. One image per post

Each post needs a **landscape 16:9 image, 1600×900**.

**If you have an image generation tool, use it.** Then upload each image to Selldone and attach it to its post.

**If you do not have one, say so plainly and stop there.** Do not download images from the internet, do not reuse a product photo as an article header, and do not leave a broken image reference. Instead, output a short brief for each of the four — subject, framing, lighting — so a human can produce them and drop them in.

Style guidance when you can generate them: photographic, natural light, shallow depth of field, muted colour. Show the subject in use or being worked on rather than isolated on white — product shots already do that job elsewhere on the site.

## 6. Publish and verify

Publish all four, then confirm:

- exactly four posts exist, the defaults are gone
- exactly four categories exist, one post assigned to each
- each has a title, excerpt, body, image, category and a publication date
- the four dates are spread over months, not all identical
- `/blog` lists all four and each links to a working `/article` page
- no post names a product or quotes a price
- no `{{TOKEN}}` or placeholder text survives anywhere

Report the four titles, their categories and dates, and the sector you inferred.

---

## Why this exists

The blog is the one part of a storefront that is always empty on day one and always looks empty. Four solid posts make a demo shop look like a business instead of a template, and they cost nothing to generate once the catalogue is known.

Writing them per sector rather than generically is the whole point — a clothing shop with articles about watch movements is worse than no blog at all.

---

## Known limitation on this platform

**Publication dates cannot be backdated through the API.** `created_at` is ignored
by `api.articles.shop_blog.upsert`, and a past `schedule_at` fires immediately,
clears itself, and resets `created_at` to the moment it fired. Step 4's date
spreading therefore has to be done at creation time by scheduling **forward**, or
set in the dashboard. Verified 14 August 2026 — if you are reading this later,
re-test before assuming it still holds.
