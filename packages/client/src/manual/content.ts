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
<p>Sulk is a real-time squad game played against the ship itself. You command a
handful of Terminator marines (slow, armoured, lethal from the front) through
corridors crawling with genestealers: fast, clawed, and very interested in your
back. The computer plays the swarm. Nobody waits for you.</p>
<p>Each mission gives you one objective. Read it in the panel on the right, then
read it again. Everything else is a resource you will run out of: every door,
every point of ammunition, every second.</p>`,
  },
  {
    id: 'deployment',
    title: 'Deployment',
    html: `
<p>Every mission opens with a <strong>deployment phase</strong>: your squad waits in
reserve and the marked squares (an <strong>&#x2715;</strong> on each free one) are yours to
fill. Marching order matters more than anything you do in the first cycle. Whoever stands at
the front meets the swarm first, and a heavy flamer on point is a corpse holding your
best weapon.</p>
<ul>
<li><strong>Place:</strong> click an &#x2715; square to deploy the next marine of that
squad, or click a marine's roster card first to place that marine specifically.
Each deployment area belongs to one squad; marines never deploy into another
squad's area.</li>
<li><strong>Rotate:</strong> a placed marine starts facing the way the mission expects
him to walk; <strong>A</strong> and <strong>D</strong> spin him for free while
deployment lasts.</li>
<li><strong>Rearrange:</strong> click a placed marine to lift him back into reserve
and put him somewhere else.</li>
<li><strong>AUTO DEPLOY</strong> fills the remaining squares in a sensible battle
order: a storm bolter on point, the sergeant behind him, a heavy weapon third,
the rest at the back.</li>
</ul>
<p>The phase runs on its own clock: <strong>90 seconds per squad</strong>. When it
expires, or when you press START (or Enter), any marines still in reserve deploy
automatically and the mission begins; the game clock starts with it. Esc pauses
here just like in play. Once the mission starts, every deployment control
disappears.</p>`,
  },
  {
    id: 'the-turn',
    title: 'How the clock works',
    html: `
<p>There are no turns. The game runs on a fixed clock: a <strong>tick</strong> every
quarter second, forty ticks to a <strong>cycle</strong> (ten seconds). Everything the
old game did once a turn (reinforcements, the counters and limits of the special
missions) now happens once a cycle, each at its own moment inside it. The HUD
shows the cycle and the seconds into it.</p>
<ul>
<li><strong>The swarm never stops.</strong> Every genestealer and blip with action points
acts every tick. Marines on overwatch fire reaction shots at every move they see,
at most one every half second.</li>
<li><strong>Your marines think for themselves.</strong> A marine you are not steering
unjams, shoots what he can see, turns to meet a threat, closes a door a stealer is
looking through, and otherwise goes on overwatch. He never opens a door and never
wanders toward the objective: that is your job. Steer one and his own judgement
steps aside for two seconds.</li>
<li><strong>Esc pauses.</strong> The clock stops, the board stays readable, and no key
reaches the game until you resume. A hidden browser tab pauses on its own.</li>
<li><strong>Space is the command pause.</strong> The clock stops while you give orders,
and the command time on the HUD runs down as you think.</li>
</ul>`,
  },
  {
    id: 'ap-pause',
    title: 'Action points and command time',
    html: `
<p>Every marine holds up to <strong>4 action points (AP)</strong> and gets one back
<strong>every second</strong>; genestealers and blips hold <strong>6</strong> and get one
back every half second. A full pool banks nothing: spend, and the next point takes
a whole second to arrive. Nothing is ever lost at a boundary.</p>
<p>Thinking has a price of its own: <strong>command time</strong>, a pool of seconds
shown as a bar on the HUD. <strong>Space</strong> stops the clock and the pool runs
down while it is held. The cap is <strong>10 seconds plus 10 per living
sergeant</strong>, and it refills at <strong>1 second per cycle plus 1 per
sergeant</strong>, so a squad with its sergeant thinks for 20 seconds and takes 100
seconds of play to fill again. Orders given during a pause still take their normal
time to reach the squad: the pause buys you the thinking, not the relay. The pool is
one pool for the whole force while the relay is per squad. Below one second the
pause will not open at all.</p>`,
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
centre and is blocked by missing squares, by burning squares (you can see the flames,
not through them), and by any closed door the line crosses. Marines block sight as well;
genestealers and blips do not, so a marine sees the whole column charging down a
corridor. A <em>shot</em> still stops at the first body in its path: you can count the
pack, but only the front rank is in your sights.</p>
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
<p>Overwatch persists until the marine acts or his weapon jams, and it fires at most
one reaction shot every half second. It is how corridors are held; it is also how
bolters jam at the worst possible moment. The heavy flamer cannot overwatch.</p>`,
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
whenever the sight line opens, even when another stealer stands between. Stealers that
do not fit on free squares are lost.</p>
<p>Blips are radar returns. They show on the board only while a <strong>sergeant</strong>
lives to run the scanner; lose the sergeants and the blips vanish from the map until
they convert into stealers you can see.</p>
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
and every blast burns out one cycle after it was lit. Fire is a scalpel, not a
wall.</p>
<p>In Cleanse and Burn, a square that has burned once stays <em>cleansed</em> for the
objective even after the flames die.</p>`,
  },
  {
    id: 'winning',
    title: 'Winning and losing',
    html: `
<p>Each mission names its own victory rule: burn a room, hold a room, reach an exit,
kill thirty, survive sixteen cycles. The mission list below states each one. Two things
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
