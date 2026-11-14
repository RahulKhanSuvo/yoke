# Yoke AI Coding Agent

Yoke is a desktop AI coding agent application built with **Electron**, **Solid.js**, **TypeScript**, and the **Vercel AI SDK**.

## Key Architecture & Features

- **Multi-Provider AI Support:** Integrates with Anthropic, OpenAI, Google Gemini, and OpenRouter with support for extended reasoning/thinking budgets.
- **Agent Loop & Tools:** Executes tasks autonomously using secure, structured tools:
  - `bash`: Run shell commands with human-in-the-loop approval.
  - `read` / `write` / `edit`: File inspection and modification.
  - `glob` / `grep`: Codebase navigation and search.
- **Secure Human-in-the-Loop:** Every sensitive action (like running shell commands) requires explicit user authorization via approval prompts.
- **Built-in Terminal:** Integrated terminal powered by `node-pty` and `@xterm/xterm`.
- **Local Persistence:** Uses SQLite (via Drizzle ORM) for session history and project state management.
