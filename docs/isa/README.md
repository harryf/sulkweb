# ISA Archives

The root [ISA.md](../../ISA.md) is the project's system of record. To keep it small enough to read in one pass, completed run records (criteria, verification evidence, decisions) are archived here verbatim, grouped by the part of the codebase they cover. **Before changing an area, read its archive**: the criteria are the tests that area must keep passing, and the evidence shows how each was verified.

Two things to know:

1. **ISC IDs are stable and unique across all files.** An ID lives in exactly one place (root or one archive) and is never renumbered. Deferred or dropped items in archives are pointed to from the root ISA's index.
2. **Archives are verbatim records.** Text is preserved exactly as written at the time, including punctuation now banned for new writing (em dashes). Do not edit archives except to append when the root ISA rotates a completed run out.

| File | Covers |
|---|---|
| [engine-core.md](engine-core.md) | Movement, combat, shooting, doors, LOS, blips, kill-reveals |
| [missions.md](missions.md) | Mission transcription, map fidelity, victory conditions |
| [stealer-ai.md](stealer-ai.md) | Hive AI (pin/blood/zigzag, waves, charging), autopilot |
| [client-ui.md](client-ui.md) | HUD, roster, minimap radar, keyboard input, motion, home page, manual |
| [audio.md](audio.md) | Music, SFX, motion tracker, fades |
| [releases-infra.md](releases-infra.md) | CI, GitHub Pages deploys, release hygiene |
| [docs-meta.md](docs-meta.md) | Documentation and repo meta work |
| [decisions-log.md](decisions-log.md) | Chronological archive of older Decisions entries |
| [changelog-log.md](changelog-log.md) | The conjecture/refutation/learning trail |

The rotation protocol (what moves here, and when) is documented in the root ISA's Criteria section under "How this file stays small".
