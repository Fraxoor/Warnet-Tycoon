# 🎮 Warnet Tycoon

[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r187-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![React Three Fiber](https://img.shields.io/badge/R3F-9.8-black?logo=react)](https://docs.pmnd.rs/react-three-fiber/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-5.1-4338CA)](https://zustand-demo.pmnd.rs/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.49-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

> **An isometric 3D Indonesian Internet Cafe (Warung Internet / Warnet) management tycoon game.**  
> Start with **Rp 5.000.000**, two humble Pentium 4 rigs, and a tiny rented storefront. Upgrade your hardware, hire autonomous staff, serve hot Indomie and cold drinks, weather power outages, and expand into a multi-branch nationwide esports gaming empire!

---

## 📑 Table of Contents

- [Overview & Lore](#-overview--lore)
- [Key Features](#-key-features)
  - [1. 3D Isometric Neighborhood Simulation](#1-3d-isometric-neighborhood-simulation)
  - [2. Hardware Progression & Rig Customization](#2-hardware-progression--rig-customization)
  - [3. Deep Tycoon Economy & Operating Costs](#3-deep-tycoon-economy--operating-costs)
  - [4. Customer Archetypes & Autonomous AI](#4-customer-archetypes--autonomous-ai)
  - [5. Staff Management & Automation](#5-staff-management--automation)
  - [6. Room Expansion & Multi-Branch Network](#6-room-expansion--multi-branch-network)
  - [7. Procedural Web Audio Engine](#7-procedural-web-audio-engine)
  - [8. Global Cloud Leaderboard & Security](#8-global-cloud-leaderboard--security)
  - [9. Dual-Tier Persistence](#9-dual-tier-persistence)
- [Controls & Hotkeys](#-controls--hotkeys)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Development Server](#development-server)
  - [Production Build](#production-build)
  - [Running Tests & Typechecks](#running-tests--typechecks)
- [Configuration & Supabase Setup](#-configuration--supabase-setup)
- [Game Mechanics Reference](#-game-mechanics-reference)
  - [PC Tiers & Specifications](#pc-tiers--specifications)
  - [Expansion Stages](#expansion-stages)
  - [Customer Demographics](#customer-demographics)
- [Contributing](#-contributing)
- [License](#-license)

---

## ☕ Overview & Lore

In the late 2000s and 2010s across Indonesia, the local **Warnet** was more than an internet cafe—it was the beating heart of gaming culture, after-school hangouts, late-night *Paket Malam* grinds, and frantic LAN battles in *Counter-Strike*, *Point Blank*, *Lost Saga*, and *Dota*.

**Warnet Tycoon** recreates this nostalgic experience in an interactive isometric 3D world:
- Start with **Rp 5.000.000** in savings and two outdated Tier 1 rigs inside a dusty shop.
- Manage **real-time customer flows**: students searching for cheap browsing, office workers needing urgent printouts, and hardcore gamers craving 240Hz monitors.
- Balance **electricity bills** based on actual wattages, upgrade ISP bandwidth from 1 Mbps ADSL to 1 Gbps Dedicated Fiber, and handle spontaneous **PLN power blackouts** with emergency generator rentals.
- Grow your reputation, decorate with RGB neon signs, unlock higher floors, and open branch franchises in Bandung, Surabaya, Yogyakarta, and Jakarta.

---

## ✨ Key Features

### 1. 3D Isometric Neighborhood Simulation
- **React Three Fiber & Three.js Engine**: Custom low-poly 3D models and procedural canvas textures (*keramik* floor tiles, warnet posters, street tarmac, shop signs).
- **Day / Night Lighting Cycle**: Dynamic sunlight, golden-hour sunset, and vibrant interior neon glow at night.
- **Dynamic Weather System**: Sunny, overcast, and realistic rainy weather complete with falling raindrops, street puddle reflections, and synthesized rain audio.
- **Living Neighborhood**: Indonesian street with passing motorbikes, pedestrians in batik/casual wear, and street lamps.
- **Optimized Software WebGL Pacing**: Automatic detection of SwiftShader / software rendering environments with GPU sync fencing to prevent frame freezes on lower-end devices.

### 2. Hardware Progression & Rig Customization
Build your dream gaming center across 4 distinct hardware tiers:
- **Tier 1 — Office PC**: Pentium 4 / Celeron, 1GB RAM, Integrated VGA (Rp 4.000/hour).
- **Tier 2 — Gaming PC**: Core i3, 8GB RAM, GTX 750 Ti 2GB (Rp 7.000/hour).
- **Tier 3 — High-End Gaming PC**: Ryzen 5 Hexa-Core, 16GB RAM, RTX 3060 12GB (Rp 12.000/hour).
- **Tier 4 — Tournament Rig**: Core i9 / Ryzen 9, 32GB RAM, RTX 4080 Super 16GB, 240Hz monitor (Rp 18.000/hour).

Customize individual stations with modular desks (Basic Wood, RGB Gaming, Esports Arena, VIP Acoustic Booth) and chairs (Plastic Stool, Swivel Office Chair, Racing Gaming Chair, Pro Esports Chair).

### 3. Deep Tycoon Economy & Operating Costs
- **Electricity Wattage Simulation**: Every PC (180W to 580W), air conditioning unit (900W), drink fridge (220W), and printer (90W) draws power. High power consumption directly increases your daily PLN electricity bill.
- **Internet Service Providers (ISP)**:
  - `ADSL 1M` (Rp 150.000/day) $\rightarrow$ `Broadband 10M` $\rightarrow$ `Fiber 50M` $\rightarrow$ `Fiber 200M` $\rightarrow$ `Dedicated 1G` (Rp 1.450.000/day).
  - Insufficient bandwidth slows down gaming sessions and lowers customer satisfaction.
- **Ancillary Revenue Streams**:
  - 🍜 **Snack Racks**: Instant noodles (Indomie) and snacks.
  - 🥤 **Drink Fridge**: Chilled teas, sodas, and energy drinks.
  - 🖨️ **Printing Services**: Per-page document printing for students and office workers.
  - ⭐ **VIP Memberships**: Recurring monthly memberships for loyal regulars.
  - 🏆 **Local Tournaments**: Host weekend competitions with cash prizes and massive reputation boosts.
- **Dynamic Peak Hours**: 17:00 to 21:00 brings a 1.5× surge of customers leaving school and offices.
- **Adjustable Pricing Multiplier**: Tune your hourly rate between 0.7× (budget promo) and 1.5× (premium rates).
- **Competitor Intelligence**: Monitor rival warnets in your district (market share, pricing, reputation wars).

### 4. Customer Archetypes & Autonomous AI
Customers enter your shop with distinct budgets, time limits, and hardware requirements:
1. **Student**: Budget-conscious, stays 1.5–4 hours, buys snacks, needs Tier 1+ PC.
2. **Casual User**: Quick browsing and social media, stays 1–2.5 hours, needs Tier 1+ PC.
3. **Office Worker**: Short visits, heavy printer usage, high budget, needs Tier 1+ PC.
4. **Hardcore Gamer**: Long sessions (2.5–5 hours), high snack/drink demand, demands Tier 2+ PC.
5. **Competitive Player**: Esports tournaments, demands Tier 3+ PC with high refresh rate, generous budget.

Customers feature full **A\* grid pathfinding**, line up at the cashier counter, leave reviews with star ratings, and can become loyal regulars.

### 5. Staff Management & Automation
Hire, train, and manage specialized personnel to automate shop operations:
- 🧑‍💼 **Cashier**: Processes customer payments and manages cashier queues.
- 🔧 **Technician**: Autonomously inspects and repairs broken or degraded PC stations.
- 🧹 **Cleaner**: Sweeps litter, empties trash bins, and maintains shop hygiene.
- 👮 **Security**: Prevents rowdy customer incidents and deters equipment tampering.
- Upgrade staff skill levels (1 to 5) and manage daily payroll.

### 6. Room Expansion & Multi-Branch Network
- **Architectural Expansions**:
  1. *Starter Room* (8×8 ground floor)
  2. *Backroom* (expanded PC bays & storage)
  3. *Esports Wing* (dedicated competitive gaming booths)
  4. *VIP Lounge* (high-margin luxury suites)
  5. *Empire Hall* (massive tournament hall)
  6. *Second Floor Loft* (multi-story floor with elevated stairs)
- **Nationwide Franchise Network**:
  - Expand beyond your flagship store by acquiring passive branches in **Kemang (South Jakarta)**, **Dago (Bandung)**, **Gubeng (Surabaya)**, and **Sleman (Yogyakarta)**.

### 7. Procedural Web Audio Engine
**Zero external audio files required!** All sound effects and background ambiances are procedurally synthesized using the browser's native **Web Audio API**:
- **AC & PC Fan Humming**: Filtered white noise with lowpass biquad filters matching active PC counts.
- **Rain Ambiance**: Bandpassed noise generating atmospheric rainfall.
- **Lo-Fi Nostalgic Chord Progression**: Gentle warm electric piano chord shifts (`Cmaj7`, `Am7`, `Fmaj7`, `G6`).
- **Mechanical Keystrokes & Clicks**: Micro-sine bursts mimicking clicky switches and mouse clicks.
- **Cashier Chime & UI Alerts**: Crisp tonal feedback for transactions and notifications.

### 8. Global Cloud Leaderboard & Security
- **Supabase Integration**: Top 50 global leaderboard with username/password authentication — no Google account required.
- **Username & Password Auth**: Register with a unique username, password, and cafe name. No email verification needed.
- **Cloud Saves**: 3 cloud save slots (in addition to 3 local slots + autosave) backed by Supabase PostgreSQL.
- **Zero-PII Architecture**: Row-Level Security policies ensure players can only read/write their own data.
- **Anti-Tampering RLS Rules**: Server-enforced immutable user IDs, boundary checks on scores, and authenticated-only writes.

### 9. Dual-Tier Persistence
- **Primary Storage**: Browser **IndexedDB** (`warnet_tycoon_db`) storing full game snapshots.
- **Automatic Fallback**: Seamless fallback to `localStorage` if IndexedDB is blocked or running in incognito mode.
- **Local Slots**: Automatic periodic autosave plus 3 dedicated manual save slots.
- **Cloud Slots**: 3 additional cloud save slots synchronized via Supabase (requires login).

---

## 🎮 Controls & Hotkeys

| Action | Control / Hotkey | Description |
| :--- | :--- | :--- |
| **Orbit Camera** | Left Mouse Drag / Touch Drag | Rotate view around the cafe |
| **Pan Camera** | Right Mouse Drag / WASD / Arrow Keys | Move camera focal point across the shop |
| **Zoom In / Out** | Mouse Wheel / Pinch Gesture | Adjust camera zoom level |
| **Reset Camera** | Camera Button (Top HUD) | Center view back to shop origin |
| **Toggle Dock Menu** | <kbd>H</kbd> | Expand or collapse the bottom dock |
| **Pause / Resume** | <kbd>Esc</kbd> or <kbd>P</kbd> | Pause or resume simulation speed |
| **Rotate Placed Item** | <kbd>R</kbd> or Rotate Button | Rotate active item by 90° before placing |
| **Cancel Build Mode** | <kbd>Esc</kbd> | Clear currently selected item from cursor |
| **Inspect Object** | Click on Object | View stats, repair condition, or upgrade |

---

## 🛠️ Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) | React 19 concurrent rendering and hooks |
| **3D Graphics** | [Three.js](https://threejs.org/) & [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber/) | Isometric 3D rendering with custom procedural textures |
| **3D Helpers** | [@react-three/drei](https://github.com/pmndrs/drei) | OrbitControls, camera rigs, and math utilities |
| **State Management** | [Zustand 5](https://github.com/pmndrs/zustand) | Centralized immutable game state store |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Next-generation utility-first styling with `@tailwindcss/vite` |
| **Icons & Animations**| [Lucide React](https://lucide.dev/) & [Motion](https://motion.dev/) | Clean HUD icons and smooth modal transitions |
| **Audio** | Web Audio API | Pure synthesized procedural sound engine |
| **Backend & Cloud** | [Supabase](https://supabase.com/) | PostgreSQL database, Row-Level Security & username/password auth |
| **Build Tool** | [Vite 8](https://vitejs.dev/) | Lightning-fast HMR and ESM bundling |
| **Type System** | [TypeScript 7](https://www.typescriptlang.org/) | End-to-end type safety for models, state, and rules |

---

## 📂 Project Architecture

```
Warnet-Tycoon/
├── .env.example                # Environment variables template (copy to .env.local)
├── index.html                  # HTML entrypoint
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite configuration with Tailwind CSS & React plugins
└── src/
    ├── main.tsx                # Application bootstrap
    ├── App.tsx                 # Main layout, keyboard shortcuts, modal orchestrator
    ├── index.css               # Global Tailwind CSS definitions
    ├── audio/
    │   └── soundEngine.ts      # Web Audio API procedural sound engine
    ├── components/
    │   ├── BottomDock.tsx      # Bottom drawer navigation dock
    │   ├── DrawerPanels.tsx    # Build, Computers, Staff, Finance, Upgrades, Stats, Save tabs
    │   ├── ErrorBoundary.tsx   # React crash boundary with recovery UI
    │   ├── LeaderboardPanel.tsx# Global Supabase leaderboard & username/password auth modal
    │   ├── Modals.tsx          # Random event decisions & daily status settlement dialogs
    │   ├── ObjectInspector.tsx # Floating inspector for placed furniture/computers
    │   ├── TitleScreen.tsx     # Animated 3D title screen & save slot selector
    │   └── TopHud.tsx          # Top bar (date, clock, speed, balance, rating, weather)
    ├── firebase/
    │   └── leaderboardUtils.ts # Score calculation, sanitization, and ID validation (pure utils)
    ├── supabase/
    │   ├── supabase.ts         # Supabase client initialization & username helpers
    │   ├── leaderboard.ts      # Supabase leaderboard & cloud save API functions
    │   └── SupabaseProvider.tsx# React context for auth, leaderboard, and cloud saves
    ├── scene/
    │   ├── WarnetScene.tsx     # R3F Canvas, OrbitControls, and day/night loop
    │   ├── WarnetBuilding.tsx  # Isometric shop walls, floor tiles, stairs, roof, and fans
    │   ├── NeighborhoodWorld.tsx# Street, road traffic, pedestrians, and rain particle system
    │   ├── textures.ts         # Procedural canvas textures (keramik, street, posters)
    │   └── models/
    │       ├── CharacterModels.tsx # Procedural avatars for customers and staff
    │       └── FurnitureModels.tsx # Desks, chairs, PCs, ACs, fridges, counters, decor
    ├── simulation/
    │   ├── catalog.ts          # Items catalog, PC specs, staff roles, expansions, events
    │   ├── economy.ts          # Currency formatting, power consumption, P&L calculations
    │   ├── engine.ts           # Core simulation loop: customer spawns, tasks, end-of-day
    │   ├── engine.test.ts      # Simulation unit tests
    │   └── grid.ts             # 2D/3D tile grid, occupancy, and A* pathfinding
    ├── storage/
    │   └── saveSystem.ts       # IndexedDB and localStorage dual-tier save manager
    ├── store/
    │   └── gameStore.ts        # Zustand store coordinating simulation and UI
    └── types/
        └── game.ts             # Unified TypeScript definitions
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0 or higher) or [Bun](https://bun.sh/)
- `npm`, `pnpm`, or `bun` package manager

### Installation
Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/Fraxoor/Warnet-Tycoon.git
cd Warnet-Tycoon

# Install dependencies using bun (or npm install)
bun install
```

### Development Server
Start the local Vite development server:

```bash
bun run dev
# or: npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

### Production Build
Create an optimized production build:

```bash
bun run build
```

Preview the production build locally:

```bash
bun run preview
```

### Running Tests & Typechecks
Run TypeScript typechecks:

```bash
bun run lint
```

Execute simulation engine unit tests with Node's built-in test runner:

```bash
node --import tsx src/simulation/engine.test.ts
```

---

## 🔐 Configuration & Supabase Setup

The app uses **Supabase** for authentication, global leaderboard, and cloud saves.

### Environment Variables
Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
```

Then fill in your Supabase project credentials:

```env
# Supabase (required for auth, leaderboard, and cloud saves)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_..."

# Optional Gemini AI API key
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Base URL where the application is deployed
APP_URL="http://localhost:3000"
```

> **Note:** Only the `VITE_SUPABASE_ANON_KEY` (publishable key) is used in the browser client. Never commit secret keys to source control.

### Supabase Database Schema
The app requires three tables in your Supabase project:

| Table | Purpose |
| :--- | :--- |
| `public.profiles` | Player username and cafe name (auto-created on signup) |
| `public.leaderboard` | Global top 50 scores (write-own, read-all) |
| `public.game_saves` | Cloud save slots (owner-only read/write) |

Row-Level Security is enabled on all tables with the following policies:
- **Leaderboard**: Anyone can read; authenticated users can only upsert/delete their own row.
- **Game Saves**: Authenticated users can only read/write/delete their own saves.
- **Profiles**: Authenticated users can only read/update their own profile.

### CI/CD Secrets
For GitHub Actions deployment, set these secrets in your repo settings:

| Secret | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase publishable (anon) key |
| `GEMINI_API_KEY` | (Optional) Gemini AI API key |
| `APP_URL` | Deployed app URL |

---

## 📊 Game Mechanics Reference

### PC Tiers & Specifications

| Tier | Model Name | CPU & GPU | RAM | Watts | Hourly Fee | Hardware Cost |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **1** | Office PC | Pentium 4 / Integrated VGA | 1 GB | 180W | Rp 4.000 | Rp 1.200.000 |
| **2** | Gaming PC | Core i3 / GTX 750 Ti 2GB | 8 GB | 280W | Rp 7.000 | Rp 2.600.000 |
| **3** | High-End Rig | Ryzen 5 / RTX 3060 12GB | 16 GB | 420W | Rp 12.000 | Rp 5.200.000 |
| **4** | Tournament PC | Core i9 / RTX 4080 Super | 32 GB | 580W | Rp 18.000 | Rp 9.500.000 |

### Expansion Stages

| Stage | Title | Requirements | Reward Cash |
| :---: | :--- | :--- | :---: |
| **1** | Rented Shophouse | Starting conditions (2 PCs) | — |
| **2** | Neighborhood Warnet | 6 PCs, 3.2★ Reputation, 1 Staff | Rp 1.500.000 |
| **3** | Cyber Cafe | 12 PCs, 3.8★ Reputation, 2 Staff, Backroom | Rp 4.000.000 |
| **4** | Esports Arena | 18 PCs, 4.2★ Reputation, 3 Staff, Esports Wing | Rp 10.000.000 |
| **5** | Warnet Empire | 24 PCs, 4.6★ Reputation, 4 Staff, VIP Lounge | Rp 25.000.000 |

### Customer Demographics

| Archetype | Minimum PC Tier | Budget Range | Typical Duration | Demands |
| :--- | :---: | :---: | :---: | :--- |
| **Student** | Tier 1 | Rp 15.000 – Rp 45.000 | 1.5 – 4.0 hours | Snacks, affordable rates |
| **Casual User** | Tier 1 | Rp 12.000 – Rp 30.000 | 1.0 – 2.5 hours | Clean desks, quick sessions |
| **Office Worker** | Tier 1 | Rp 25.000 – Rp 60.000 | 1.0 – 2.0 hours | Fast printing, cold drinks |
| **Hardcore Gamer**| Tier 2 | Rp 40.000 – Rp 120.000 | 2.5 – 5.0 hours | Good GPUs, AC cooling, snacks |
| **Competitive Pro**| Tier 3 | Rp 80.000 – Rp 220.000 | 3.0 – 6.0 hours | 240Hz monitors, fiber internet |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/EpicFeature`).
3. Commit your Changes (`git commit -m 'Add some EpicFeature'`).
4. Push to the Branch (`git push origin feature/EpicFeature`).
5. Open a Pull Request.

---

## 🎨 3D Asset Credits

Selected interior props use models from **Kenney's Furniture Kit**:
- Desk chair, computer keyboard, computer mouse
- Waiting bench, potted plant, and trash can

NPCs use rigged character models and animation clips from **Kenney's Mini Characters**. Twelve character variants are selected deterministically for customers and staff; staff roles retain a small color-coded identifier.

Both packs are published by [Kenney](https://kenney.nl/assets/furniture-kit) and [Kenney Mini Characters](https://kenney.nl/assets/mini-characters) under **Creative Commons CC0**. Attribution is not required; this project credits the source as a courtesy. Runtime GLB files are served from the [Kenney asset mirror](https://github.com/Hidencod/tge-assets), which catalogs the packs as Kenney / CC0-1.0.

The models are loaded on demand through jsDelivr, so the first load of each character variant requires an internet connection.

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

*Built with ❤️ for Indonesian internet cafe nostalgia.*
