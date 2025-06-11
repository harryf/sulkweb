# Sulk Web

This project is a web-based port of the classic turn-based strategy game, [Sulk](https://sulk.sourceforge.net/), originally built with Pygame. It uses Phaser 3 and TypeScript for a modern, fast, and maintainable implementation.



## Project Structure

The repository is organized as a monorepo with the following high-level structure:

```
/sulk-web/
├─ packages/
│  ├─ engine/          # Pure rules & AI (no Phaser)
│  └─ client/          # Phaser front-end (Vite + TypeScript)
├─ assets/             # Game assets (images, sounds, fonts, themes)
├─ missions/           # JSON/YAML mission files
└─ docs/               # Original game documentation & design notes
```

-   **`packages/client`**: This is the main front-end application built with [Phaser 3](https://phaser.io/). It handles rendering, user input, and communication with the game engine. It's set up with [Vite](https://vitejs.dev/) for a fast development experience.

-   **`packages/engine`**: This package contains the core game logic, including rules, piece definitions, AI, and state management. It is written in pure TypeScript to remain decoupled from the presentation layer, which allows it to be run in different environments (browser, server, etc.).

-   **`assets`**: Contains all static game assets. The `themes/` subdirectory allows for easy skinning of the game's appearance.

-   **`missions`**: Will contain the game's mission files, converted from their original Python format to JSON or YAML for easy parsing by the engine.

-   **`docs`**: Contains the original design documents and manuals for the game.

## Getting Started

To get the client application running for development:

1.  **Navigate to the client directory:**
    ```bash
    cd packages/client
    ```

2.  **Install dependencies:**
    This project uses `pnpm` for package management.
    ```bash
    pnpm install
    ```

3.  **Run the development server:**
    ```bash
    pnpm run dev
    ```

This will start a local development server, and you can view the application in your browser at the URL provided (usually `http://localhost:5173`).

### Run milestone 0

```bash
pnpm i
pnpm --filter ./packages/client dev      # open localhost:5173
pnpm --filter ./packages/client test     # unit
pnpm --filter ./packages/client e2e      # browser integration
