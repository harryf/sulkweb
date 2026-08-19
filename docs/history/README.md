# How Sulk Web Was Built

This folder is the project's archaeology: the source material and the working documents from the original build, kept as history. Nothing here is maintained — for current documentation see [the docs folder](../).

## The short version

Sulk Web is an AI-built port. The process, start to finish:

1. **Study the original.** The open-source Pygame game [Sulk](https://sulk.sourceforge.net/) by Toby Woodwark was analyzed file by file — game loop, piece classes, mission scripts, movemaps, dice — to understand what a faithful port had to reproduce.
2. **Write the plan as prompts.** The port was specified as a nine-milestone roadmap (M0 "Hello Board" through M8 hygiene), each milestone written as a self-contained prompt with deliverables and verification criteria, then handed to an AI coding assistant milestone by milestone.
3. **Build against the spec.** Each milestone became engine code plus tests before the next started. After M8 the same method continued past the original roadmap: mission transcription from the Pygame sources, the full audio set, the exotic beta_2 armoury, and the deployment phase — tracked from then on in the project ISA ([ISA.md](../../ISA.md)) rather than prompt files.

## What's in this folder

| File | What it is |
|---|---|
| [prompts/](prompts/) | The original milestone specs: [the M0–M8 roadmap](<prompts/Sulk Web Roadmap.md>), per-milestone build prompts, [project/tooling conventions](prompts/PROJECT_AND_TOOLING.md), and [the game-setup brief](<prompts/Game Setup.md>) |
| [OVERVIEW_PYGAME_VERSION.md](OVERVIEW_PYGAME_VERSION.md) | The first AI session sizing up the Pygame codebase for porting |
| [Analysis Sulk Pygame *.html](<Analysis Sulk Pygame 20ff66b4122080e38c6ee1eac91cf306.html>) | Deep analysis of the original Pygame engine (Notion export) |
| [Sulk Game Data *.html](<Sulk Game Data 20ff66b41220808fa056ee38fe91a8d4.html>) | Catalog of the original game's data files (Notion export) |
| [SULK Manual Combined.pdf](<SULK Manual Combined.pdf>) | The original Sulk manual — the canonical rules source the port was verified against |

The current, verified state of what got built is in [docs/status.md](../status.md); the complete decision-by-decision record is the project ISA at the repo root.
