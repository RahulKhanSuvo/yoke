<div align="center">

# ⚡ Yoke

An advanced desktop AI client built with **Electron**, **SolidJS**, **TypeScript**, and **Tailwind CSS**.

</div>

---

## 🚀 Features

- **🧠 Multi-Model AI Integration**: Powered by Vercel AI SDK supporting OpenAI, Anthropic, and Google models.
- **⚡ Lightning Fast UI**: Built with SolidJS and Kobalte UI primitives, styled with Tailwind CSS.
- **💾 Local Persistence**: SQLite database powered by `better-sqlite3` and managed with Drizzle ORM.
- **🔒 Secure Credentials**: OS-level secure storage using `keytar`.
- **🛠️ Developer Experience**: Fully typed with TypeScript and bundled via `electron-vite`.

---

## 🛠️ Tech Stack

- **Framework**: [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- **UI Library**: [SolidJS](https://www.solidjs.com/) + [Kobalte](https://kobalte.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI SDK**: [Vercel AI SDK](https://sdk.vercel.ai/)
- **Database**: [SQLite](https://www.sqlite.org/) + [Drizzle ORM](https://orm.drizzle.team/)

---

## 📦 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) or [Bun](https://bun.sh/) installed.

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/yoke.git
cd yoke
bun install
```

### Development

Run the app in development mode with hot-reloading:

```bash
bun run dev
```

### Type Checking & Linting

```bash
# Run type checks
bun run typecheck

# Lint codebase
bun run lint

# Format code
bun run format
```

---

## 📦 Building for Production

To package the application for your operating system:

```bash
# Build unpacked directory
bun run build:unpack

# Build for Windows
bun run build:win

# Build for macOS
bun run build:mac

# Build for Linux
bun run build:linux
```

---

## 📄 License

MIT
