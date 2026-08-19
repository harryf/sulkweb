/**
 * Field-manual copy. Every rule number here is transcribed from
 * docs/rules-reference.md (itself read from the engine source) — if the two
 * ever disagree, the engine wins and BOTH files need updating.
 *
 * The quotes are original fiction written for this fan project.
 */

export interface ManualSection {
  id: string;
  title: string;
  /** Body HTML (this is a web page renderer — tables and lists are the point). */
  html: string;
}

export interface MarineQuote {
  text: string;
  attribution: string;
}

export const QUOTES: MarineQuote[] = [
  {
    text: 'You hear them in the walls long before the tracker pings. By the time it pings, the walls are the least of your problems.',
    attribution: 'Brother Aldous, after the third sweep of the Sin of Ophelia',
  },
  {
    text: 'The blip said one contact. The corridor said otherwise.',
    attribution: 'Sergeant Kine, sole survivor, deck 12',
  },
  {
    text: 'Overwatch is a prayer you load into a gun. Say it facing the right way.',
    attribution: 'Brother Mordecai, gunnery sermon',
  },
  {
    text: 'Six shots in the flamer. Count them like heartbeats, because that is what they are.',
    attribution: 'Brother Ash, flame-bearer, final transmission',
  },
  {
    text: 'I watched a claw open a bulkhead like a ration tin. We do not talk about corridor seven.',
    attribution: 'Brother Severin, debriefing fragment',
  },
  {
    text: 'The clock is not your enemy. The clock is the only honest thing on this ship.',
    attribution: 'Sergeant Voss, to a fresh squad',
  },
];

export const SECTIONS: ManualSection[] = [
  {
    id: 'what-is-this',
    title: 'What is this?',
    html: `
<p>Sulk is a turn-based squad game played against the ship itself. You command a
handful of Terminator marines (slow, armoured, lethal from the front) through
corridors crawling with genestealers: fast, clawed, and very interested in your
back. The computer plays the swarm. You play the clock.</p>
<p>Each mission gives you one objective. Read it in the panel on the right, then
read it again. Everything else is a resource you will run out of: every door,
every point of ammunition, every second.</p>`,
  },
  {
    id: 'the-turn',
    title: 'How a turn works',
    html: `
<ol>
<li><strong>Your phase.</strong> Act with any marines in any order, spending action
points and command points, under a real-time clock of <strong>120 seconds, plus 30
for each living sergeant</strong>. End the phase with the DONE button or Enter, or the
clock ends it for you.</li>
<li><strong>The swarm's phase.</strong> New blips spawn at entry points, then every
genestealer and blip acts. Marines on overwatch fire reaction shots throughout.</li>
<li><strong>End phase.</strong> Victory is checked, flames burn out, the turn counter
advances, everyone's action points refresh, and a fresh command-point pool is rolled.</li>
</ol>`,
  },
  {
    id: 'ap-cp',
    title: 'Action points and command points',
    html: `
<p>Every marine gets <strong>4 action points (AP)</strong> a turn; genestealers and
blips get <strong>6</strong>. Unspent AP is lost: there is no saving up.</p>
<p>Each turn also rolls a <strong>d6 of command points (CP)</strong>, shown on the
roster. During your phase, 1 CP buys <strong>+1 AP for any living marine</strong>, as
often as the pool lasts. The unspent remainder is discarded at the end of the turn:
spend it or lose it.</p>`,
  },
  {
    id: 'moving',
    title: 'Moving',
    html: `
<p>Movement costs depend on where you are going <em>relative to your facing</em>.
Marines are armoured statues: turning is cheap, walking backward is not, and
side-stepping is impossible.</p>
<table>
<thead><tr><th>Move</th><th>Marine</th><th>Genestealer</th><th>Blip</th></tr></thead>
<tbody>
<tr><td>Forward / forward-diagonal</td><td>1 AP</td><td>1 AP</td><td>1 AP</td></tr>
<tr><td>Side-step</td><td>—</td><td>1 AP</td><td>1 AP</td></tr>
<tr><td>Backward / backward-diagonal</td><td>2 AP</td><td>2 AP</td><td>1 AP</td></tr>
<tr><td>Turn 90°</td><td>1 AP</td><td>free*</td><td>free</td></tr>
<tr><td>About-face</td><td>2 AP</td><td>1 AP</td><td>free</td></tr>
</tbody>
</table>
<p class="fine">*A genestealer repeating the same 90° turn twice in a row pays 1 AP the
second time.</p>
<p>Diagonal moves keep your current facing. Occupied squares are solid. Burning squares
cannot be entered, unless you are already standing in flames, in which case you may
move through or out of them.</p>`,
  },
  {
    id: 'seeing',
    title: 'Seeing and lines of sight',
    html: `
<p>A piece <strong>sees</strong> its front 180°. It can <strong>shoot</strong> into its
front 90° cone (targets exactly on the 45° edge count). Line of sight runs centre to
centre and is blocked by missing squares, by other pieces, by burning squares (you can
see the flames, not through them), and by any closed door the line crosses.</p>
<p>Weapon range is the larger of the horizontal and vertical distance. Hold
<strong>L</strong> with a marine selected to see exactly what he sees.</p>`,
  },
  {
    id: 'shooting',
    title: 'The storm bolter',
    html: `
<p>The squad's standard weapon. Unlimited ammunition, range limited only by sight.</p>
<ul>
<li><strong>Aimed shot</strong>: 1 AP, two dice, the target dies on any 6.</li>
<li><strong>Sustained fire</strong>: each consecutive aimed miss at the same target adds
+1 to both dice next time, up to +4. Kill, switch targets, move, turn, or touch a door
and the bonus resets.</li>
<li><strong>Move-and-shoot</strong>: every move earns one free shot (0 AP). Any other
action forfeits it.</li>
<li><strong>Jams</strong>: aimed shots never jam. Overwatch shots jam on any double,
which drops overwatch. Clearing a jam costs 1 AP.</li>
</ul>
<p>A marine standing at a closed door can always shoot the door point-blank: two dice,
destroyed on any 6, permanently.</p>`,
  },
  {
    id: 'overwatch',
    title: 'Overwatch',
    html: `
<p>For <strong>2 AP</strong>, a bolter-family marine braces and fires a free reaction
shot at <strong>every</strong> stealer-side action he can see in his fire arc within
<strong>range 12</strong>: every step, every turn, every door.</p>
<p>Overwatch persists across turns until the marine acts or his weapon jams. It is how
corridors are held; it is also how bolters jam at the worst possible moment. The heavy
flamer cannot overwatch.</p>`,
  },
  {
    id: 'flamer',
    title: 'The heavy flamer',
    html: `
<p>The mission-winner and the mission-clock, in one weapon.</p>
<ul>
<li><strong>Shot</strong>: 2 AP and 1 ammo. Targets a <em>square</em> (fire arc, sight,
range 12) and floods its entire board section with fire, stopped only by closed doors.</li>
<li><strong>Ammo 6</strong> (mission 6 cuts it to 4). No reloads.</li>
<li>Everything standing in the flames dies on a d6 roll of <strong>2+</strong>, marines
included. Aim accordingly.</li>
<li><strong>Self-destruct</strong>: 1 AP, needs ammo, pressed twice to confirm. Kills
everything in the flamer's own section outright, himself included.</li>
</ul>`,
  },
  {
    id: 'cannon',
    title: 'The assault cannon and the chain fist',
    html: `
<p>Two specialists appear in the Download mission:</p>
<ul>
<li><strong>Assault cannon</strong>: 1 AP and 1 round for three dice, kill on 5+;
sustained fire lowers the requirement per miss. A 10-round drum plus one 4 AP reload.
<strong>Autofire</strong> (2 AP, 5 rounds) rakes <em>everything</em> visible in the arc
(stealers, doors, and any battle-brother unlucky enough to stand in it), killing on 3+,
and sweeps again after every kill. After 10 shots fired, a triple wrecks the gun,
kills the gunner with it, and endangers everyone adjacent.</li>
<li><strong>Chain fist</strong>: a storm-bolter terminator whose blade cuts the door
directly ahead apart for 1 AP. No roll. No appeal.</li>
</ul>`,
  },
  {
    id: 'close-combat',
    title: 'Close combat',
    html: `
<p>Attacking costs 1 AP and the target must be directly ahead. A genestealer rolls
<strong>3 dice</strong> against prey in its front 180° (2 from the side or behind); a
marine rolls <strong>1</strong>; sergeants add +1 to every die. Highest single die
wins.</p>
<ul>
<li>Attacker higher: the defender dies, whichever way it was facing.</li>
<li>Defender higher: the attacker dies only if the defender could strike back
(attacker directly ahead); otherwise the defender just spins to face its attacker.</li>
<li>Draw: both live; the defender spins to face the attacker.</li>
</ul>
<p>The power-sword sergeant <strong>parries</strong>: when he would lose (or tie against
an unbeatable score), his opponent's best die is forced to be rerolled. The new result stands, even if it is worse for
him.</p>
<p class="fine">The arithmetic is simple and cruel: a genestealer meeting a marine
face-on rolls three dice against one. Never let them arrive.</p>`,
  },
  {
    id: 'doors',
    title: 'Doors',
    html: `
<p>Doors sit on the edges between squares. Closed, they block movement, sight, flame,
and overwatch. Operating one costs 1 AP and reaches the edge ahead of you (or any door
edge touching the three squares ahead). The swarm opens doors on contact; it never
closes them.</p>
<p>Destruction is permanent: a cut chain fist, an aimed bolter 6, an aimed cannon 5+, or
cannon autofire. A destroyed door can never close again, which is sometimes exactly
what you want, and sometimes how the swarm gets in.</p>`,
  },
  {
    id: 'blips',
    title: 'Blips',
    html: `
<p>The scanner does not show genestealers. It shows <em>contacts</em>, blips, and a
blip hides <strong>1 to 3</strong> of them, drawn from the original counter mix (about
two per blip on average).</p>
<p>Blips slide any direction for 1 AP but may never voluntarily enter a square a marine
sees, or any square adjacent to a marine. The moment a marine <em>does</em> see one, it
converts: the hidden stealers spill onto the board immediately, mid-phase, mid-move,
whenever the sight line opens. Stealers that do not fit on free squares are lost.</p>
<p>A blip killed while still a blip (flamed, or raked by autofire) counts its full
hidden value toward kill quotas. Letting one convert first means killing them one at a
time instead.</p>`,
  },
  {
    id: 'auspex',
    title: 'The auspex (mini-map radar)',
    html: `
<p>The mini-map in the top right is your squad's auspex. Marines show as steady
<strong>red dots</strong>. The swarm shows only when the scanner sweeps: a pulse ring
spreads from each living <strong>sergeant</strong> in time with the tracker ping, and
contacts light up as the wavefront passes them. The closer the swarm gets, the faster
the ping, and the faster the sweep.</p>
<p>Genestealers return a <strong>solid green blob</strong>; blips return a fainter,
blurrier smear (the scanner cannot tell a real contact from a sensor ghost, and neither
can you). Lose both sergeants and the auspex goes dark: the red dots stay, the swarm
vanishes from the scope.</p>
<p>Click anywhere on the mini-map to swing the main view to that point.</p>`,
  },
  {
    id: 'flames',
    title: 'Flames',
    html: `
<p>Fire floods outward through a board section from the target square, stopped only by
closed doors. Anything standing in it dies on a 2+. Burning squares cannot be entered,
and all flames go out in the end phase of the same turn. Fire is a scalpel, not a
wall.</p>
<p>In Cleanse and Burn, a square that has burned once stays <em>cleansed</em> for the
objective even after the flames die.</p>`,
  },
  {
    id: 'winning',
    title: 'Winning and losing',
    html: `
<p>Each mission names its own victory rule: burn a room, hold a room, reach an exit,
kill thirty, survive sixteen turns. The mission list below states each one. Two things
are true in every mission:</p>
<ul>
<li>A wiped squad is a defeat.</li>
<li>The objective, not the body count, is the mission. Genestealer reinforcements are
unlimited in most missions; you cannot shoot your way to a draw.</li>
</ul>`,
  },
];

/** Controls-section intro (the key rose itself renders from keyboardHelp.ts). */
export const CONTROLS_INTRO = `
<p>Click a marine (or his roster card) to select him, then drive him with the keys.
The movement circle sits under your left hand: <strong>Q W E</strong> over
<strong>A D</strong> over <strong>Z X C</strong>, with <strong>S</strong>
(the door key) at its centre.</p>`;
