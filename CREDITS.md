# Audio Credits

Sulk Web is a non-profit fan recreation of Toby Woodwark's Sulk (2003). The
processed audio set under `packages/client/public/assets/audio/` is committed
and ships with the deployed site at <https://harryf.github.io/sulkweb/>, with
full per-source attribution on the site's [audio credits page](https://harryf.github.io/sulkweb/credits.html)
(generated from `packages/client/src/audio/audioManifest.ts`, the same
manifest `bun scripts/fetchAudio.ts` downloads from and the game plays from).

**Licensing posture, stated plainly:** the ambient music is used under the
Music of 40K channel's explicit non-profit-with-credit terms (quoted below);
the short film/game SFX cuts (Aliens, 1986; Alien: Isolation, 2014) carry no
grant and are shipped as brief, attributed excerpts in a free fan work. The
underlying works belong to their composers, publishers, and studios. This is
a good-faith fan-project posture, not a clean chain of title — if you are a
rights holder and want anything credited differently or removed, open an
issue and it will be resolved promptly. If you fork this project for anything
beyond a non-profit fan game, clear or replace every fetched asset first.

## Ambient mission music — Music of 40K

The per-mission ambient soundtrack is used with thanks under the
[Music of 40K](https://www.youtube.com/@Musicof40K) channel's non-profit-use
terms ("You can use my soundscapes for non-profit projects… just be sure to
credit Music of 40K and include a link to the soundscape you used"). The
channel curates existing music; the underlying works belong to their composers
— support the artists.

Source playlist: [Space Hulk Ambient Music](https://www.youtube.com/playlist?list=PLyLLeKcxw24V5T-4J8D5KEXpvbTVIRwoh)

| Mission | Soundscape | Original work | Composer/Artist |
|---|---|---|---|
| space_hulk_1 | [The Labyrinth](https://www.youtube.com/watch?v=8ynKLhVbR6w) | Silent Hill 2 | Akira Yamaoka |
| space_hulk_2 | [Evil Malaise](https://www.youtube.com/watch?v=bgpbT5ytvcA) | Resident Evil 4 | Misao Senbongi |
| space_hulk_3 | [Industrial Junk](https://www.youtube.com/watch?v=XqPpt3mjggw) | Fallout | Mark Morgan |
| space_hulk_4 | [Dungeon 3](https://www.youtube.com/watch?v=CZZiw-q-wLY) | Fallout 3 | Inon Zur |
| space_hulk_5 | [Cemetery](https://www.youtube.com/watch?v=PMbn1Tgk7nw) | Divinity (demo) | Project Divinity |
| space_hulk_6 | [The Judgement of Carrion](https://www.youtube.com/watch?v=Rp0SLehlHq8) | WH40K: Dawn of War II – Chaos Rising | Doyle W. Donehoo |
| beta_1 | [Underground](https://www.youtube.com/watch?v=RfQVMlvGVfc) | Resident Evil | Shusaku Uchiyama |
| beta_2 | [Lab Entrance](https://www.youtube.com/watch?v=T8Hk9wyKLxg) | Resident Evil | Shusaku Uchiyama |
| debug_1 | [Eerie Ambience](https://www.youtube.com/watch?v=lRTLBmF-6AU) | Five Nights at Freddy's | (uncredited) |

In-game credit: the roster panel footer links the channel.

## Sound effects

**Original Sulk 0.29 sound set** (`packages/client/public/assets/sounds/`,
committed): public domain per the game's `SOUNDS_INFO`, except three TLK Games
GPL2 button sounds which this port does not use. These voice the marines:
bolter fallback, flamer, assault cannon, close combat, movement, jam, death
scream, chain fist, doors, self-destruct. (One caveat inherited from upstream:
the original author's source comment marks `assault_cannon_burst.wav` as
"legally dodgy", so its provenance may not be as clean as SOUNDS_INFO implies.)

**Derived cuts** (fetched, gitignored):

- Storm-bolter fire — cut from
  [Aliens Pulse Rifle Sound Effect](https://www.youtube.com/watch?v=uz0UkvGU2qE)
  (uploaded by MuTtLeYiSm; M41A pulse rifle from *Aliens*, 1986, 20th Century Fox).
- Motion tracker ping — cut from
  [Aliens Motion Tracker sound FX clean](https://www.youtube.com/watch?v=VancAKcmO6s)
  (uploaded by thatSFXguy; *Aliens*, 1986).
- Genestealer movement/attack/death voices — segmented from
  [Alien: Isolation – Alien Sounds](https://www.youtube.com/watch?v=qiyXFQKheOU)
  (uploaded by Bradley Cypser; *Alien: Isolation*, 2014, Creative Assembly/SEGA).
  Segment cut points + role classification live in
  `packages/client/src/audio/alienSegments.ts`.
