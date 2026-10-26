# GlowMatch — Project Brief

> This file is the source of truth for the GlowMatch project. Read it fully before doing any work.
> Place it in the root of the `glowmatch` repository so Claude Code loads it automatically.

---

## 1. What we are building

**GlowMatch** is a production cosmetics e-commerce website for the Pakistani market.

Its signature feature (Phase 2) is an **AI skin and scalp analyzer**: the customer opens their phone camera on the site, takes a photo, and GlowMatch suggests products and a routine that match their skin or scalp.

The project is built in two phases:

- **Phase 1 — The website (current focus).** A complete, production-grade online shop with no AI. It must work and sell on its own.
- **Phase 2 — The AI features.** Camera capture, skin/scalp analysis, and personalised recommendations, plugged into the existing site.

**This goes directly into production with real customers and real orders.** Everything must be production-grade from the first commit: CI/CD, tests, database safety, monitoring, and security. No prototype shortcuts.

---

## 2. Working with the developer

- The developer (Musa) works on **Windows** and uses **PowerShell**. Give Windows/PowerShell commands.
- **Explain step by step, like a teacher.** Assume no prior background with each tool. Introduce one concept at a time, explain *why* before *how*, and confirm the step worked before moving to the next one. Do not hand over a compressed checklist.
- Follow the build order in section 9. Finish and verify each step before starting the next.

---

## 3. Phase 1 — Website features

### Customer-facing pages
- **Home:** hero banner, featured products, "shop by concern" (e.g. acne, dry skin, dandruff, hair fall).
- **Shop:** all products with filters for category (face, hair, body), skin type, concern, and price.
- **Product page:** photos, price, ingredients, "best for" tags (skin types and concerns), how to use, stock status.
- **Cart + checkout:**
  - **Cash on Delivery** first (main payment method in Pakistan).
  - **"Order on WhatsApp"** button as an alternative.
  - Online payments (cards, JazzCash, Easypaisa via a gateway) come later.
- **About** and **Contact** pages.
- **Legal pages:** privacy policy, terms of service, and returns/refunds policy (payment gateways require these, and Phase 2's photo handling must be described in the privacy policy).
- **SEO basics:** page titles and descriptions, sitemap, product structured data.
- A placeholder **"Analyze my skin"** button, wired to the AI feature in Phase 2.
- Mobile-first design — most customers will be on phones.

### Admin panel
- Add, edit, and archive products; manage prices, stock, and images.
- View and manage orders (status: new → confirmed → shipped → delivered / cancelled).
- Login with **two-factor authentication**.
- **Roles:** owner and staff, with different permissions.
- **Audit log** of who changed prices, stock, or orders, and when.

### Product data model (initial sketch)
Every product must be tagged so that the Phase 2 recommender can match it:
- name, slug, brand, category (face / hair / body), description, how to use
- price, stock quantity, images
- suitable skin types (oily, dry, combination, normal, sensitive)
- concerns addressed (acne, dark spots, uneven tone, dryness, oiliness, dullness, dandruff, hair fall, etc.)
- key ingredients
- active / archived flag
- *To decide before Step 4:* whether products need **variants** (e.g. the same serum in 30ml and 50ml with different prices and stock).

### Order data model (initial sketch)
- customer name, phone (Pakistani format, e.g. `+92 3XX XXXXXXX`, validated with Zod), address, city, optional email and notes
- order items: product, quantity, and a **snapshot of the name and unit price at the time of purchase** (later price changes must never alter past orders)
- subtotal, shipping fee, total
- payment method (COD / WhatsApp; online later) and status (new → confirmed → shipped → delivered / cancelled)
- timestamps for each status change

### Business rules
- **Money:** store all amounts as **integers in whole PKR**. Never use floating-point numbers for money.
- **Stock:** decrement stock inside the **same database transaction** that creates the order, so two customers can never buy the last unit. Restore stock when an order is cancelled.
- **Fake COD orders:** every new order is **confirmed by phone call or WhatsApp** before moving from `new` to `confirmed`. Add per-phone-number limits on top of general rate limiting.

---

## 4. Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js** (App Router) with **TypeScript** |
| Styling | **Tailwind CSS** |
| Database | **PostgreSQL** hosted on **Neon** |
| ORM / migrations | **Prisma** |
| Validation | **Zod** (all inputs validated on the server) |
| Hosting | **Vercel** |
| Source control + CI | **GitHub** + **GitHub Actions** |
| Errors | **Sentry** |
| Uptime + logs | **Better Stack** (or equivalent) |
| Performance | **Vercel Speed Insights** |
| Rate limiting | Upstash Redis (or equivalent) |
| Backups storage | **Cloudflare R2** |

Repository and project name: **`glowmatch`**.

---

## 5. Environments

Four stages, each with its **own separate database** so testing never touches real customer data:

```
Local (developer laptop)  →  Preview (every pull request)  →  Staging  →  Production
```

- Use **Neon database branches** to give each preview deployment a throwaway copy of the database.
- *To decide in Step 3:* how **staging** is deployed (e.g. a long-lived `staging` branch with its own Vercel environment and Neon branch).
- Secrets live only in Vercel / GitHub environment settings. **Never commit secrets.** Provide a `.env.example` with placeholder values.

---

## 6. Development pipeline (CI/CD)

- `main` is a **protected branch**. Code reaches it only through pull requests that pass all checks.
  - Note: GitHub branch protection on a **private** repository requires a paid GitHub plan (Pro or Team). Free accounts only get it on public repositories.
- Every pull request runs, in GitHub Actions:
  1. **Lint** (ESLint) and **type check** (TypeScript)
  2. **Unit tests** (Vitest) — prices, cart totals, stock logic, order rules
  3. **End-to-end tests** (Playwright) — browse, add to cart, checkout, admin login. These need a real database in CI (a Postgres service container in GitHub Actions or a throwaway Neon branch — decide in Step 3).
  4. **Migration check** — Prisma migrations apply cleanly to a fresh database
  5. **Build**
  6. **Preview deployment** on Vercel with its own link
- On merge to `main`: run `prisma migrate deploy` **before** the new code goes live, then deploy to production. On Vercel this needs a deliberate setup — e.g. a GitHub Actions job that runs the migration against production and then triggers the Vercel production deploy. Document the chosen approach in Step 3.
- Migrations must be **backward-compatible** (expand first, contract later) so a rollback never breaks the database.
- **Rollback:** use Vercel's instant rollback to the previous deployment.
- **Dependabot** for vulnerable dependencies and **GitHub secret scanning** enabled.

---

## 7. Database maintenance

- **All** schema changes go through Prisma migrations. Nobody edits the production database by hand.
- **Point-in-time restore** enabled on Neon (paid plan) to rewind to any moment.
- **Nightly backup** (`pg_dump`) to Cloudflare R2, kept separately from Neon.
- **Monthly restore test** — restore a backup into a scratch database and verify it. Document the procedure.
- **Connection pooling** enabled.
- Proper **indexes** on frequently filtered columns (category, skin type, concern, price, order status).
- The application connects with a **least-privilege database user**.

---

## 8. Monitoring, alerts, and security

### Monitoring
- **Sentry** for frontend and server errors, with source maps.
- **Uptime checks** every minute on the home page, checkout, and a `/api/health` endpoint (which also checks the database). Alert by email/phone.
- **Centralised, searchable logs.**
- **Vercel Speed Insights** for real-user page speed on phones.
- **Business alerts**, e.g. checkout error rate above normal, or no orders in 12 hours (make thresholds configurable — early on, quiet periods are normal and would cause false alarms).

### Security
- Admin login with **2FA** and **role-based access** (owner vs staff).
- **Server-side validation** of every input with Zod.
- **Rate limiting** on checkout, login, and any public form.
- Security headers (including a Content Security Policy), HTTPS only.
- **Audit log** for admin actions.
- Customer phone numbers and addresses are **private data**, visible only to admin roles.

### Cost note
Production-grade hosting is not free. Vercel's free Hobby plan is for non-commercial use, so the shop needs **Vercel Pro**; a private repo with branch protection needs **GitHub Pro or Team**; and Neon's paid plan is needed for point-in-time restore. Expect a modest monthly bill for hosting, database, and monitoring.

---

## 9. Build order

1. **Tools + GitHub repo** — check Node.js (v20+), Git, and VS Code on Windows; create the `glowmatch` repo; protect `main`.
2. **Next.js project skeleton** — TypeScript, Tailwind, ESLint, Vitest, Playwright set up.
3. **CI pipeline** — GitHub Actions workflow running all PR checks; Vercel previews connected.
4. **Database** — Neon + Prisma, environments, first migration with the product data model.
5. **Product catalog + shop pages** — home, shop with filters, product page.
6. **Cart + Cash on Delivery checkout** — plus "Order on WhatsApp."
7. **Admin panel** — auth with 2FA, roles, product and order management, audit log.
8. **Monitoring, backups, alerts** — Sentry, uptime, logs, nightly backups, restore test, business alerts.
9. **Go-live checklist** — then Phase 2 (AI).

---

## 10. Phase 2 — AI skin and scalp analyzer (later, do not build yet)

Design notes to keep in mind so Phase 1 leaves room for it.

### How it will work
1. Customer taps **"Analyze my skin"** (or scalp) on their phone.
2. The browser opens the camera and guides them: face centred, good light, no filter.
3. **MediaPipe face detection** runs in the browser first to reject blurry, dark, or badly framed photos before upload.
4. The photo goes to a **vision AI model (Claude's vision API)**, which returns structured JSON, e.g. skin type, visible concerns, and a confidence level.
5. A **short quiz** fills gaps a photo can't show: sensitivity, allergies, current routine, budget.
6. The site matches the result against the tagged product catalog and shows a **morning and night routine** of 3–5 products, each with a one-line reason.

### Rules for the AI feature
- **Privacy:** analyse the photo, then delete it. Do not store face images. State this clearly on the page.
- **Not a doctor:** describe cosmetic concerns only — never diagnose. If the analysis suggests something like severe acne, a changing mole, patchy hair loss, or a rash, recommend seeing a dermatologist instead of selling a product.
- **Skin-tone accuracy:** test across a full range of Pakistani skin tones before launch, and show users the confidence of each result.
- **Scope:** start with **face and scalp only**. No body photos in the first version.
- **No fairness or whitening framing** anywhere in the product, copy, or recommendations.

### Phase 2 build order
1. Quiz-only recommendations (rule-based, no AI)
2. Camera capture with framing and lighting checks
3. AI skin analysis → recommendations
4. Scalp analysis
5. Customer accounts to track skin over time

---

## 11. Open decisions

Each decision is listed with the build step it must be settled **before**.

| Decision | Settle before | Notes |
|---|---|---|
| **One shop or many brands?** | Step 4 | Does GlowMatch sell its own stock, or recommend products from many brands? Affects product, inventory, and order models. The `brand` field is included either way. |
| **Product variants** (sizes) | Step 4 | See product data model. |
| **GitHub plan** (public repo vs paid private) | Step 1 | Needed for branch protection on `main`. |
| **Staging deployment + E2E test database + migrate-before-deploy approach** | Step 3 | See sections 5 and 6. |
| **Product image storage** | Step 5 | Cloudflare R2 or Vercel Blob. |
| **Shipping fees** | Step 6 | Flat rate, by city, or free above a threshold. Courier partner (e.g. TCS, Leopards, PostEx). |
| **Languages** | Step 5 | English only, or English + Urdu. |
| **Admin auth library + 2FA method** | Step 7 | e.g. Auth.js or Better Auth with TOTP authenticator apps. |
| **Order notifications** | Step 7 | Email, SMS, or WhatsApp to the admin and customer; which email provider. |
| **Analytics** | Step 9 | Privacy-friendly analytics for traffic and conversion. |
| **Domain** | Step 9 | Check availability and an IPO Pakistan trademark search for "GlowMatch". |
| **Online payment gateway** | After COD is live | Cards, JazzCash, Easypaisa. |
