<h2 align="center">1st Place for Track 2 — <strong>United Nations x Global Food Institute</strong></h2>
<p align="center"><em>At George Hacks 2026</em></p>

# ReliefLink by Moonshot

A **blockchain-powered chain of custody** system on **Solana** that helps food aid stay transparently tracked, with **quality checks** at handoffs—including **Gemini**-assisted verification of delivery photos—so aid is more likely to reach the right communities.

---

## Inspiration

In disaster scenarios, getting food to affected communities is not only a logistics problem—it is a **coordination and trust** problem. Food is often delayed, lost, or misallocated when supply chains are fragmented and accountability between organizations is weak.

We started from a simple question:

**What if we could show that food aid actually reaches the people it is intended for?**

ReliefLink combines **hardware**, **software**, and **decentralized** systems into a transparent food distribution story—especially for vulnerable communities in crises.

---

## What it does

ReliefLink is a **Solana-verified** food distribution flow that tracks movement from origin toward destination. It gives coordinators a way to reason about **local capacity** during crises by treating stores, warehouses, and community nodes as **distribution points** you can plug into when central supply chains are slow, overloaded, or broken—we think of these as **food beacons**: local nodes you can activate when the network needs to flex in real time.

At a high level it:

- Creates **traceable** shipments and legs
- **Logs** transfers between actors (warehouse → transporter → local node)
- Requires **physical confirmation** via **hardware** at handoffs (copper-pad tap)
- Shows **real-time** status in a **Next.js** dashboard and driver UI
- Surfaces **anomalies** (delays, missed proofs, flags)
- Uses **AI** (Google **Gemini**) to **verify delivery photos** against manifests and grade condition, and to support **insights** in the product

At any moment you can ask: **Where is the food? Who has it? Is it at risk?**

---

## Tools & stack

| Area | What we use |
| --- | --- |
| **Runtime** | [Node.js](https://nodejs.org/) · [pnpm](https://pnpm.io/) |
| **Web app** | [Next.js](https://nextjs.org/) (App Router) · [React](https://react.dev/) · TypeScript |
| **UI & styling** | [shadcn/ui](https://ui.shadcn.com/) · [Tailwind CSS](https://tailwindcss.com/) |
| **Maps** | [Leaflet](https://leafletjs.com/) — **[OpenStreetMap](https://www.openstreetmap.org/)** for map data |
| **Data** | [MongoDB](https://www.mongodb.com/) · [Mongoose](https://mongoosejs.com/) |
| **Blockchain** | [Solana](https://solana.com/) testnet · [`@solana/web3.js`](https://github.com/solana-foundation/solana-web3.js) |
| **AI** | [Vercel AI SDK](https://sdk.vercel.ai/) · [Google Gemini](https://ai.google.dev/) (via [@ai-sdk/google](https://sdk.vercel.ai/providers/ai-sdk-providers/google-generative-ai)) |

**Hardware & field:** [Arduino Uno](https://www.arduino.cc/) firmware + Node USB bridge — [`hardware/arduino/README.md`](./hardware/arduino/README.md). **Warehouse announcements** use **Amazon Echo** via **Voice Monkey** or **IFTTT** (see [`.env.example`](./.env.example)).

**External services (accounts / keys, not shipped in the repo):** MongoDB Atlas, Google AI (Gemini), Solana testnet faucet, Voice Monkey / IFTTT (Echo announcements), ElevenLabs (voice API), Ollama when used for local fallback.

---

## How we built it

### Architecture

- **Frontend:** Next.js **App Router** dashboard and driver experience (real-time polling / live updates where implemented).
- **Backend:** **Next.js Route Handlers** (`src/app/api`) — not a separate Express server; same Node process as the UI.
- **Blockchain:** Solana **testnet** for immutable memos and accountability (no custom on-chain program in this repo).
- **Database:** MongoDB for shipments, legs, nodes, users, and custody state.
- **Hardware:** Arduino for physical confirmation at the dock.
- **AI:** Google **Gemini** (via Vercel AI SDK) for photo verification and supporting AI features.
- **Maps:** Leaflet + OSM-backed tiles for geographic context.

### Hardware system

- **Arduino verification:** Physical confirmation of transfers so handoffs require a **real-world** interaction, not only a click in the UI.
- **Custom tap (NFC-inspired):** A lightweight **copper-pad** “tap”—when driver and store boards connect, the circuit completes and the driver side can emit a **TAP** over USB; details in [`hardware/arduino/README.md`](./hardware/arduino/README.md).
- **Voice:** **Echo Dot** for spoken announcements (e.g. expected deliveries, transfers, risks, confirmations) via Voice Monkey / IFTTT hooks, so the system is easier to follow in fast-moving scenarios.

### System flow

1. A **shipment / leg** is created and assigned through the app.
2. Each critical step can require **physical confirmation** on the Arduino (driver ↔ store beacon).
3. The **backend** logs state, anchors memos on **Solana** where applicable, and enforces **delivery photo** proof in the driver flow.
4. The **dashboard** visualizes progress; **Gemini** grades photos against the manifest.
5. **AI** can help interpret and surface risk-style signals alongside rule-based flags.

---

## Challenges we ran into

- **Time constraints (e.g. 24h hackathon):** Balancing ambition vs. a working demo.
- **Hardware integration:** Reliable **Arduino ↔ machine ↔ API** path (USB bridge, secrets, timing).
- **Scope:** Avoiding over-engineering across **blockchain + AI + hardware**.
- **Real-world realism:** Low connectivity, stress, and messy field conditions.
- **Clarity:** Staying focused on **food access and accountability**, not tech for its own sake.

---

## Accomplishments we're proud of

- A **working end-to-end** prototype on a tight timeline.
- **Hardware + backend + frontend** integrated in one story.
- An **AI** layer for **photo verification** and interpretability.
- Alignment with **UN-style** disaster-response framing.
- Something **technically sound** and **socially grounded**.

---

## What we learned

- **Constraint-driven design** matters for real-world impact.
- **Disaster scenarios** force you to think about bad networks, limited devices, and **local** capacity—not only ideal lab conditions.
- **Accountability** is as important as **access** in food systems.
- **Simplicity** wins under pressure: a clear E2E path beat speculative features.
- **Physical confirmation** increases trust compared to purely digital handoffs.
- **AI** works well as an **interpretability / verification** layer—not only for automation.
- **Decentralized** tools (e.g. Solana) are as much **coordination and trust** as raw storage.

---

## What's next

- **Offline-first** patterns for low-connectivity regions.
- **Multi-organization** support (NGOs, locals—not only a single coordinator narrative).
- **Predictive analytics** for supply and routing where data allows.

---

## Open source we build on

Major projects and communities this app depends on include **[Next.js](https://nextjs.org/)**, **[React](https://react.dev/)**, **[Tailwind CSS](https://tailwindcss.com/)**, **[shadcn/ui](https://ui.shadcn.com/)**, **[OpenStreetMap](https://www.openstreetmap.org/)** (with **[Leaflet](https://leafletjs.com/)** for maps), **[MongoDB](https://www.mongodb.com/)** / **[Mongoose](https://mongoosejs.com/)**, **[Solana](https://solana.com/)** ([**web3.js**](https://github.com/solana-foundation/solana-web3.js)), the **[Vercel AI SDK](https://sdk.vercel.ai/)**, and **[Node.js](https://nodejs.org/)**. Smaller libraries are listed in `package.json` and `pnpm-lock.yaml`.

---

## Quick start

1. Copy [`.env.example`](./.env.example) → `.env` and fill in at least `MONGODB_URI`, Solana wallet keys for testnet, and `GOOGLE_GENERATIVE_AI_API_KEY` if you use delivery photo verification.
2. Fund the signing wallet on testnet, e.g.  
   `solana airdrop 1 <WALLET_A_PUBLIC> --url https://api.testnet.solana.com`
3. Install and run:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment

See [`.env.example`](./.env.example) for MongoDB, Gemini, Solana wallets, session/admin secrets, USB bridge `TRANSFER_SECRET`, Alexa / ElevenLabs / Ollama, and tuning (`STALE_MS`, etc.).

---

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next.js dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` / `pnpm typecheck` | ESLint · TypeScript |
| `pnpm seed` | Seed nodes (`scripts/seed-nodes.ts`) |
| `pnpm seed:users` | Seed demo MongoDB users (`scripts/seed-users.ts`) |

---

## Demo users (MongoDB)

After `MONGODB_URI` is set:

```bash
pnpm seed:users
```

| Role | Email | Default password |
| --- | --- | --- |
| Administrator | `admin@relieflink.demo` | `ReliefLink#2026` (or `RELIEFLINK_SEED_PASSWORD`) |
| Warehouse | `warehouse@relieflink.demo` | same |
| Driver | `driver@relieflink.demo` | same |

Admin UI: **`/admin/login`** → **`/admin`**. Public ledger (no login): **`/track`**. Driver PWA: **`/driver`**.

Seed nodes first where needed: `pnpm seed`.

---

## Repo layout

| Path | Contents |
| --- | --- |
| `src/app` | App Router pages & API routes |
| `src/components` | React UI (including i18n-aware shell) |
| `src/lib` | DB models, Solana memo, auth helpers |
| `hardware/arduino` | Uno sketches + USB bridge |
| `scripts` | Seed scripts |

---

## Deploy

[Vercel](https://vercel.com/) works well for the Next app: mirror `.env.example` variables in the project settings. Field machines running the USB bridge need `TRANSFER_SECRET`, optional `TRANSFER_PIN`, the deployed API base URL, and a stable `DEVICE_ID` (documented under hardware).

---

## Note on database name

The app uses the MongoDB database **`relieflink`**. Older prototypes may have used another name — migrate or re-seed if you are upgrading.
