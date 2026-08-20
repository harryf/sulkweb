# ISA Archive: Releases and infrastructure (CI, Pages deploy, hygiene)

> Verbatim archive of completed run records moved out of the root [ISA.md](../../ISA.md).
> Read this before changing the matching part of the codebase. ISC IDs are stable and
> unique across the whole ISA; this file is their single home now. Text is preserved
> exactly as written at the time (including pre-ban em dashes).

## Criteria (archived runs)

### M8 — Release hygiene

- [x] ISC-62: Fresh `pnpm i && pnpm build` from clean clone produces deployable `packages/client/dist`
- [x] ISC-63: `pnpm --filter ./packages/client e2e` Playwright suite passes headless
- [x] ISC-64: README updated: controls, how to run, roadmap state, milestone status truthful
- [x] ISC-65: Every milestone completed in this effort is a separate git commit with tests green at that commit

### GitHub Pages deploy (release-gated)

- [x] ISC-515: vite.config.ts sets `base: './'` so built pages work under the /sulkweb/ subpath (Read)
- [x] ISC-516: `__APP_VERSION__` injected via Vite define from `SULK_VERSION` env, `dev` fallback, with a TS declaration (Read)
- [x] ISC-517: version string visible on the homepage credits line (Playwright `#app-version`)
- [x] ISC-518: version string visible in the manual footer (Playwright)
- [x] ISC-519: `.github/workflows/deploy.yml` exists and triggers only on `v*` tag pushes plus manual dispatch (Read)
- [x] ISC-520: workflow gates deploy behind typecheck + engine and client unit suites (needs-chain in yml) (Read)
- [x] ISC-521: workflow builds with `SULK_VERSION` set from the pushed tag name (Read)
- [x] ISC-522: workflow publishes `packages/client/dist` via upload-pages-artifact + deploy-pages with pages/id-token permissions (Read)
- [x] ISC-523: Anti: no workflow trigger fires on plain pushes to main — Pages only updates from tags (Read)
- [x] ISC-524: GitHub Pages enabled on the repo with `build_type: workflow` (gh api 200)
- [x] ISC-525: repo homepage field set to https://harryf.github.io/sulkweb/ and description names the game (gh api)
- [x] ISC-526: README links to the live page near the top (Grep)
- [x] ISC-527: README documents the release process: push tag vX.Y.Z → CI gate → Pages deploy (Grep)
- [x] ISC-528: tag v0.2.0 pushed and its deploy workflow run concluded success (gh run)
- [x] ISC-529: live https://harryf.github.io/sulkweb/ returns 200 with the game HTML (curl)
- [x] ISC-530: live manual.html returns 200 (curl)
- [x] ISC-531: deployed bundle contains version string v0.2.0 and the UI shows it (curl/browser)
- [x] ISC-532: Anti: live page loads with zero console errors despite the gitignored music being absent from the deploy (browser probe)
- [x] ISC-533: local suites still green after changes (client unit + home.spec e2e) (Bash)
- [x] ISC-534: work committed with a clean tree (Bash git status)

### Audio ships with attribution (deploy v0.3.0)

- [x] ISC-535: .gitignore no longer excludes assets/audio; all fetched audio tracked (git ls-files ≥33 files)
- [x] ISC-536: credits.html is a third Vite MPA input with its own entry module (Read)
- [x] ISC-537: credits page renders one music row per MUSIC_TRACKS entry, each linking its YouTube video (e2e count 9)
- [x] ISC-538: music rows show track title, original work, artist, and mission display name (e2e spot checks)
- [x] ISC-539: SFX section lists the Sulk-original set and all SFX_SOURCES with YouTube links (e2e)
- [x] ISC-540: Music of 40K channel credit, playlist link, and non-profit terms are stated on the page (e2e)
- [x] ISC-541: homepage credits line links the audio-credits page (e2e)
- [x] ISC-542: manual footer links the audio-credits page (e2e)
- [x] ISC-543: credits page has a back-to-game link (e2e)
- [x] ISC-544: Anti: zero pageerrors on the credits page (e2e)
- [x] ISC-545: CREDITS.md rewritten to the ships-with-attribution posture (Read)
- [x] ISC-546: README no longer claims the deploy is audio-silent; links the credits page (Grep)
- [x] ISC-547: deploy.yml header comment matches the new posture (Read)
- [x] ISC-548: local gates green: client tsc, unit 43, e2e including the new credits spec (Bash)
- [x] ISC-549: tag v0.3.0 deploy run concluded success (gh run)
- [x] ISC-550: live credits.html returns 200 and contains the YouTube links (curl)
- [x] ISC-551: live assets/audio/music/space_hulk_1.ogg returns 200 (curl)
- [x] ISC-552: live game constructs AudioManager with zero console errors in real Chrome (browser)
- [x] ISC-553: work committed with a clean tree (git status)

## Verification (archived evidence)

### Pages-deploy run (2026-08-17, ISC-515..534)

- ISC-515: Read vite.config.ts — `base: './'` present; dist/index.html emits `src="./assets/main-*.js"`
- ISC-516: Read vite.config.ts define block + version.d.ts declaration; local build with SULK_VERSION=v0.0.0-local stamps both main and manual chunks (grep: 2 files)
- ISC-517/518: home.spec homepage + manual tests assert `#app-version` matches /^(dev|v\d+\.\d+(\.\d+)?(-[\w.]+)?)$/ — 9/9 then 3/3 after regex widening
- ISC-519/523: Read deploy.yml — `on: push: tags: ['v*']` only (workflow_dispatch removed per review); push of e78900d to main triggered no run (gh run list unchanged)
- ISC-520: Read deploy.yml — verify-and-build steps: engine build (tsc -b), client tsc --noEmit, `pnpm -r test`, all before upload; deploy job `needs: verify-and-build`
- ISC-521: Read deploy.yml — `env: SULK_VERSION: ${{ github.ref_name }}` on the build step (env block per review, not raw interpolation)
- ISC-522: Read deploy.yml — upload-pages-artifact path packages/client/dist; deploy-pages@v4 with pages:write + id-token:write; environment github-pages
- ISC-524: `gh api POST repos/harryf/sulkweb/pages` → build_type "workflow", html_url https://harryf.github.io/sulkweb/; plus tag-type deployment policy `v*` added to the github-pages environment
- ISC-525: `gh api repos/harryf/sulkweb` → homepage set, description "Sulk in your browser — … Play: https://harryf.github.io/sulkweb/"
- ISC-526/527: README top links the live URL; "Releases & deployment" section documents tag → gate → deploy with the corrected audio claim
- ISC-528: run 32012182040 conclusion success (verify-and-build + deploy both success; first attempt's deploy rejected by environment protection, fixed via tag policy, job re-run)
- ISC-529/530: curl live: home 200, manual.html 200
- ISC-531: deployed manual chunk contains v0.2.0 (curl+grep: 1); real-Chrome screenshot shows "· v0.2.0" in homepage credits and manual footer JS probe versionShown=true
- ISC-532: real-Chrome (Claude-in-Chrome) console after fresh load of `/` and after starting space_hulk_1: zero errors/exceptions; game fully playable (5 marines, HUD, timer, board render screenshot)
- ISC-533: client tsc clean, engine tsc build clean, client unit 43/43, home.spec 9/9 (then 3/3 targeted rerun after review fixes)
- ISC-534: commits 9d83ca9 + e78900d pushed; tree clean except ISA record (committed at LEARN)

### Audio-ship run (2026-08-17, ISC-535..553)

- ISC-535: `git ls-files packages/client/public/assets/audio | wc -l` → 33 (9 ogg, 22 alien wav, 2 sfx wav); .gitignore keeps only .audio-cache/
- ISC-536: credits.html + src/credits/{main.ts,credits.css}; vite input {main,manual,credits}; built chunk 3.5K (no Phaser — reviewer verified only type-imports touch the engine)
- ISC-537..540: credits.spec — 9 manifest-derived music rows each linking youtube.com/watch?v=<videoId>, 3 SFX rows, Music of 40K terms quote + channel/playlist links; live JS probe: musicRows 9, sfxRows 3, ytLinks 12
- ISC-541/542: credits.spec asserts #credits-link href=credits.html in home overlay and manual footer
- ISC-543/544: back-to-game navigates to /; pageerror capture 0
- ISC-545: CREDITS.md rewritten (ships-with-attribution posture; good-faith statement; takedown offer); stale "gitignored" line inside it fixed per review
- ISC-546/547: README + deploy.yml claims updated; review swept SIX more stale sites (fetchAudio.ts, architecture.md deployment section incl. stale base/CI points, CLAUDE.md invariant, development-guide ×2, asset-index.md, AudioManager comment) — all fixed in 003877c
- ISC-548: tsc clean; client unit 45/45 (2 new audioFiles set-equality guards); credits.spec 2/2; home.spec 9/9 earlier
- ISC-549: v0.3.0 run 32015294184 success; v0.3.1 run success (both jobs)
- ISC-550/551: curl live: credits.html 200, music/space_hulk_1.ogg 200, alien/alien_attack_01.wav 200
- ISC-552: real Chrome on live ?mission=space_hulk_1: AudioManager constructed, 32 audio keys in cache, hud up, zero console errors. Gotcha found: the hidden-tab RAF pause stalls PreloadScene→GameScene transition (environmental, all versions); un-stuck by manually stepping game.loop
- ISC-553: commits 6ce332c (audio + credits page) + 003877c (review fixes); tags v0.3.0, v0.3.1; tree clean except ISA record

