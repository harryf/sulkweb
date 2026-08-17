/**
 * Single source of truth for every audio asset: what it is, where it came
 * from, and who to credit. `scripts/fetchAudio.ts` consumes this to download
 * and process the files; the game consumes it for mission→track lookup; the
 * credits surfaces (CREDITS.md, HUD link) are generated from it.
 *
 * The audio binaries themselves are NOT committed — they are fetched locally
 * with `pnpm fetch-audio` (yt-dlp + ffmpeg). See CREDITS.md for licensing.
 */

export interface MusicTrack {
  /** Registered mission name this track scores. */
  mission: string;
  videoId: string;
  /** Track title as uploaded (also the video title's first segment). */
  title: string;
  /** Underlying work + composer, from the video description's credits block. */
  album: string;
  artist: string;
}

/** One distinct playlist track per registered mission (finale gets the epic). */
export const MUSIC_TRACKS: MusicTrack[] = [
  { mission: 'space_hulk_1', videoId: '8ynKLhVbR6w', title: 'The Labyrinth', album: 'Silent Hill 2', artist: 'Akira Yamaoka' },
  { mission: 'space_hulk_2', videoId: 'bgpbT5ytvcA', title: 'Evil Malaise', album: 'Resident Evil 4', artist: 'Misao Senbongi' },
  { mission: 'space_hulk_3', videoId: 'XqPpt3mjggw', title: 'Industrial Junk', album: 'Fallout', artist: 'Mark Morgan' },
  { mission: 'space_hulk_4', videoId: 'CZZiw-q-wLY', title: 'Dungeon 3', album: 'Fallout 3', artist: 'Inon Zur' },
  { mission: 'space_hulk_5', videoId: 'PMbn1Tgk7nw', title: 'Cemetery', album: 'Divinity (demo)', artist: 'Project Divinity' },
  { mission: 'space_hulk_6', videoId: 'Rp0SLehlHq8', title: 'The Judgement of Carrion', album: 'Warhammer 40,000: Dawn of War II - Chaos Rising', artist: 'Doyle W. Donehoo' },
  { mission: 'beta_1', videoId: 'RfQVMlvGVfc', title: 'Underground', album: 'Resident Evil', artist: 'Shusaku Uchiyama' },
  { mission: 'beta_2', videoId: 'T8Hk9wyKLxg', title: 'Lab Entrance', album: 'Resident Evil', artist: 'Shusaku Uchiyama' },
  { mission: 'debug_1', videoId: 'lRTLBmF-6AU', title: 'Eerie Ambience', album: "Five Nights at Freddy's", artist: 'unknown' },
];

export const trackForMission = (mission: string): MusicTrack | undefined =>
  MUSIC_TRACKS.find(t => t.mission === mission);

export const musicUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;
/** Served path of a mission's processed music file (OGG Vorbis, loudnormed). */
export const musicFile = (mission: string) => `assets/audio/music/${mission}.ogg`;

/** YouTube-sourced SFX raw material (cut/processed by fetchAudio.ts). */
export const SFX_SOURCES = [
  {
    id: 'pulse_rifle', videoId: 'uz0UkvGU2qE', uploader: 'MuTtLeYiSm',
    what: 'Aliens (1986) M41A pulse rifle burst → storm-bolter fire',
  },
  {
    id: 'motion_tracker', videoId: 'VancAKcmO6s', uploader: 'thatSFXguy',
    what: 'Aliens motion tracker ping → proximity tracker',
  },
  {
    id: 'alien', videoId: 'qiyXFQKheOU', uploader: 'Bradley Cypser',
    what: 'Alien: Isolation alien vocalisations → genestealer movement/attack/death',
  },
] as const;

// The original Sulk 0.29 wav set (public domain per its SOUNDS_INFO) lives in
// assets/sounds/ and is committed; AudioManager.queueLoads owns that inventory.

/**
 * Alien segment classification lives in `alienSegments.ts` (committed data,
 * hand-editable): fetchAudio.ts cuts qiyXFQKheOU into numbered wavs on
 * silence boundaries; that table assigns each segment a game role. Labels are
 * heuristic (duration + loudness envelope) — `guess: true` marks segments a
 * human should confirm by ear, then flip the flag.
 */
export type AlienRole = 'stealer_move' | 'stealer_attack' | 'stealer_death' | 'stealer_door' | 'ambience' | 'unused';
export interface AlienSegment {
  /** Output wav name under assets/audio/alien/. */
  file: string;
  /** Cut window in the source video (seconds). */
  start: number;
  secs: number;
  role: AlienRole;
  /** True until a human has confirmed the role by ear. */
  guess: boolean;
  note: string;
}
