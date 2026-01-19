<div align="center">
  <img src="public/imgs/logo.png" alt="PR Bro Logo" width="500" />

  > This code was made with 100% AI slop and should not be taken siriously. I didn't even turned on the computer
</div>

PR Bro is a workout tracker for the modern lifter. It combines a minimal, high-contrast aesthetic with powerful tracking features and a touch of "bro" culture (featuring a cinematic 3D Panda). Built with performance and user experience in mind, it helps you track your lifts, manage routine groups, and hit those PRs.

## 🚀 Tech Stack

- **Framework:** [Astro](https://astro.build/) (Hybrid Rendering)
- **UI:** [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **3D:** [React Three Fiber](https://r3f.docs.pmnd.rs/) (Drei + Fiber)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Package Manager:** [pnpm](https://pnpm.io/)

## 🛠️ Prerequisites

Before you start, ensure you have:

1. **Node.js** (v18+ recommended)
2. **pnpm** installed
3. A **PostgreSQL** database ready.

## 🏁 Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/your-username/pr-bro.git
cd pr-bro
pnpm install
```

### 2. Environment Setup

Create a `.env` file in the root directory and add your database connection string:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pr_bro_db?schema=public"
```

### 3. Database Migration & Seeding

Initialize your database schema and seed it with default exercises and routines (Push/Pull/Legs).

```bash
# Run migrations
pnpm db:mig

# Seed the database (Exercises + Default Routines)
pnpm db:seed
```

> **Note:** The seed script is non-destructive. It skips existing exercises if you run it multiple times.

### 4. Run Locally

Start the development server:

```bash
pnpm dev
# or
npm run dev
```

The app will be running at `http://localhost:4321`.

## 📦 Building for Production

To create an optimized production build:

```bash
pnpm build
```

To run the production build locally:

```bash
pnpm start:prod
```

## 🐳 Docker (Optional)

You can containerize the application using the provided `Dockerfile`.

**Build the image:**

```bash
docker build -t pr-bro .
```

**Run the container:**

```bash
docker run -p 4321:4321 -e DATABASE_URL="postgresql://user:password@host.docker.internal:5432/pr_bro_db" pr-bro
```

*(Ensure your container can access your Postgres instance).*

## 📜 License

MIT
