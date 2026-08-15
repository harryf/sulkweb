# Audio Credits

Sulk Web is a non-profit fan recreation of Toby Woodwark's Sulk (2003), built
for **personal, local play**. None of the audio below is distributed in this
repository — every downloaded or derived file is gitignored, and
`bun scripts/fetchAudio.ts` (or `pnpm fetch-audio`) recreates the local set
from the original sources on your own machine.

**These assets are NOT cleared for redistribution.** The film SFX (Aliens,
1986) and game audio (Alien: Isolation) belong to their studios; the curated
music tracks belong to their composers/publishers, and the Music of 40K
channel's non-profit grant only covers what the channel itself can license;
downloading from YouTube is also subject to YouTube's ToS. If you publish or
distribute a build of this game, replace or clear every fetched asset first —
the committed, freely-licensed Sulk originals are the only audio that ships.

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
