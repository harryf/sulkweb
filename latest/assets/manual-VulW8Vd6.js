import{P as D}from"./missionMeta-D1RQb5UN.js";/* empty css               */import{b as N,a as I,K as G,S as R,j as Y,m as E}from"./keyboardHelp-CyTFSahn.js";const T=[{text:"You hear them in the walls long before the tracker pings. By the time it pings, the walls are the least of your problems.",attribution:"Brother Aldous, after the third sweep of the Sin of Ophelia"},{text:"The blip said one contact. The corridor said otherwise.",attribution:"Sergeant Kine, sole survivor, deck 12"},{text:"Overwatch is a prayer you load into a gun. Say it facing the right way.",attribution:"Brother Mordecai, gunnery sermon"},{text:"Six shots in the flamer. Count them like heartbeats, because that is what they are.",attribution:"Brother Ash, flame-bearer, final transmission"},{text:"I watched a claw open a bulkhead like a ration tin. We do not talk about corridor seven.",attribution:"Brother Severin, debriefing fragment"},{text:"The clock is not your enemy. The clock is the only honest thing on this ship.",attribution:"Sergeant Voss, to a fresh squad"}],O=[{id:"what-is-this",title:"What is this?",html:`
<p>Sulk is a turn-based squad game played against the ship itself. You command a
handful of Terminator marines (slow, armoured, lethal from the front) through
corridors crawling with genestealers: fast, clawed, and very interested in your
back. The computer plays the swarm. You play the clock.</p>
<p>Each mission gives you one objective. Read it in the panel on the right, then
read it again. Everything else is a resource you will run out of: every door,
every point of ammunition, every second.</p>`},{id:"deployment",title:"Deployment",html:`
<p>Every mission opens with a <strong>deployment phase</strong>: your squad waits in
reserve and the marked squares (an <strong>&#x2715;</strong> on each free one) are yours to
fill. Marching order matters more than anything you do on turn 1. Whoever stands at
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
expires, or when you press DONE (or Enter), any marines still in reserve deploy
automatically and the mission begins. Esc pauses here just like in play. Once the
mission starts, every deployment control disappears.</p>`},{id:"the-turn",title:"How a turn works",html:`
<ol>
<li><strong>Your phase.</strong> Act with any marines in any order, spending action
points and command points, under a real-time clock of <strong>120 seconds, plus 30
for each living sergeant</strong>. End the phase with the DONE button or Enter, or the
clock ends it for you.</li>
<li><strong>The swarm's phase.</strong> New blips spawn at entry points, then every
genestealer and blip acts. Marines on overwatch fire reaction shots throughout.</li>
<li><strong>End phase.</strong> Victory is checked, flames burn out, the turn counter
advances, everyone's action points refresh, and a fresh command-point pool is rolled.</li>
</ol>`},{id:"ap-cp",title:"Action points and command points",html:`
<p>Every marine gets <strong>4 action points (AP)</strong> a turn; genestealers and
blips get <strong>6</strong>. Unspent AP is lost: there is no saving up.</p>
<p>Each turn also rolls a <strong>d6 of command points (CP)</strong>, shown on the
roster. During your phase, 1 CP buys <strong>+1 AP for any living marine</strong>, as
often as the pool lasts. The unspent remainder is discarded at the end of the turn:
spend it or lose it.</p>`},{id:"moving",title:"Moving",html:`
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
move through or out of them.</p>`},{id:"seeing",title:"Seeing and lines of sight",html:`
<p>A piece <strong>sees</strong> its front 180°. It can <strong>shoot</strong> into its
front 90° cone (targets exactly on the 45° edge count). Line of sight runs centre to
centre and is blocked by missing squares, by other pieces, by burning squares (you can
see the flames, not through them), and by any closed door the line crosses.</p>
<p>Weapon range is the larger of the horizontal and vertical distance. Hold
<strong>L</strong> with a marine selected to see exactly what he sees.</p>`},{id:"shooting",title:"The storm bolter",html:`
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
destroyed on any 6, permanently.</p>`},{id:"overwatch",title:"Overwatch",html:`
<p>For <strong>2 AP</strong>, a bolter-family marine braces and fires a free reaction
shot at <strong>every</strong> stealer-side action he can see in his fire arc within
<strong>range 12</strong>: every step, every turn, every door.</p>
<p>Overwatch persists across turns until the marine acts or his weapon jams. It is how
corridors are held; it is also how bolters jam at the worst possible moment. The heavy
flamer cannot overwatch.</p>`},{id:"flamer",title:"The heavy flamer",html:`
<p>The mission-winner and the mission-clock, in one weapon.</p>
<ul>
<li><strong>Shot</strong>: 2 AP and 1 ammo. Targets a <em>square</em> (fire arc, sight,
range 12) and floods its entire board section with fire, stopped only by closed doors.</li>
<li><strong>Ammo 6</strong> (mission 6 cuts it to 4). No reloads.</li>
<li>Everything standing in the flames dies on a d6 roll of <strong>2+</strong>, marines
included. Aim accordingly.</li>
<li><strong>Self-destruct</strong>: 1 AP, needs ammo, pressed twice to confirm. Kills
everything in the flamer's own section outright, himself included.</li>
</ul>`},{id:"cannon",title:"The assault cannon and the chain fist",html:`
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
</ul>`},{id:"close-combat",title:"Close combat",html:`
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
face-on rolls three dice against one. Never let them arrive.</p>`},{id:"doors",title:"Doors",html:`
<p>Doors sit on the edges between squares. Closed, they block movement, sight, flame,
and overwatch. Operating one costs 1 AP and reaches the edge ahead of you (or any door
edge touching the three squares ahead). The swarm opens doors on contact; it never
closes them.</p>
<p>Destruction is permanent: a cut chain fist, an aimed bolter 6, an aimed cannon 5+, or
cannon autofire. A destroyed door can never close again, which is sometimes exactly
what you want, and sometimes how the swarm gets in.</p>`},{id:"blips",title:"Blips",html:`
<p>The scanner does not show genestealers. It shows <em>contacts</em>, blips, and a
blip hides <strong>1 to 3</strong> of them, drawn from the original counter mix (about
two per blip on average).</p>
<p>Blips slide any direction for 1 AP but may never voluntarily enter a square a marine
sees, or any square adjacent to a marine. The moment a marine <em>does</em> see one, it
converts: the hidden stealers spill onto the board immediately, mid-phase, mid-move,
whenever the sight line opens. Stealers that do not fit on free squares are lost.</p>
<p>A blip killed while still a blip (flamed, or raked by autofire) counts its full
hidden value toward kill quotas. Letting one convert first means killing them one at a
time instead.</p>`},{id:"auspex",title:"The auspex (mini-map radar)",html:`
<p>The mini-map in the top right is your squad's auspex. Marines show as steady
<strong>red dots</strong>. The swarm shows only when the scanner sweeps: a pulse ring
spreads from each living <strong>sergeant</strong> in time with the tracker ping, and
contacts light up as the wavefront passes them. The closer the swarm gets, the faster
the ping, and the faster the sweep.</p>
<p>Genestealers return a <strong>solid green blob</strong>; blips return a fainter,
blurrier smear (the scanner cannot tell a real contact from a sensor ghost, and neither
can you). Lose both sergeants and the auspex goes dark: the red dots stay, the swarm
vanishes from the scope.</p>
<p>Click anywhere on the mini-map to swing the main view to that point.</p>`},{id:"flames",title:"Flames",html:`
<p>Fire floods outward through a board section from the target square, stopped only by
closed doors. Anything standing in it dies on a 2+. Burning squares cannot be entered,
and all flames go out in the end phase of the same turn. Fire is a scalpel, not a
wall.</p>
<p>In Cleanse and Burn, a square that has burned once stays <em>cleansed</em> for the
objective even after the flames die.</p>`},{id:"winning",title:"Winning and losing",html:`
<p>Each mission names its own victory rule: burn a room, hold a room, reach an exit,
kill thirty, survive sixteen turns. The mission list below states each one. Two things
are true in every mission:</p>
<ul>
<li>A wiped squad is a defeat.</li>
<li>The objective, not the body count, is the mission. Genestealer reinforcements are
unlimited in most missions; you cannot shoot your way to a draw.</li>
</ul>`}],F=`
<p>Click a marine (or his roster card) to select him, then drive him with the keys.
The movement circle sits under your left hand: <strong>Q W E</strong> over
<strong>A D</strong> over <strong>Z X C</strong>, with <strong>S</strong>
(the door key) at its centre.</p>`,t=16,d={corridor:"#3a3a40",room:"#2b3340",grid:"#17171c",door:"#d08030",entry:"#e04040",exit:"#40c040",deploy:"#5aa0e8",objective:"#e8c840",ducting:"#e8e840",cat:"#e8e8e8",download:"#40c8c8"};function v(e){return N[I[e]]}function P(e,s,r,a,x){const{dc:n,dr:i}=v(r),l=(e+1)*t+t/2,h=(s+1)*t+t/2,c=l-n*t*.35,w=h-i*t*.35,u=l+n*t*.3,f=h+i*t*.3,y=-i,q=n,L=`${u+y*t*.32},${f+q*t*.32}`,M=`${u-y*t*.32},${f-q*t*.32}`;return`<polygon class="${x}" points="${c},${w} ${L} ${M}" fill="${a}"/>`}function W(e){const s=(e.width+2)*t,r=(e.height+2)*t,a=[];a.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${r}" role="img" aria-label="Map of ${e.name}">`),a.push(`<rect width="${s}" height="${r}" fill="#0d0d0d"/>`);for(const n of e.squares){const i=(n.x+1)*t,l=(n.y+1)*t;a.push(`<rect class="sq-${n.kind}" x="${i}" y="${l}" width="${t}" height="${t}" fill="${d[n.kind]}" stroke="${d.grid}" stroke-width="1"/>`)}for(const n of e.squares){if(!n.doorFacing)continue;const{dc:i,dr:l}=v(n.doorFacing),h=(n.x+1)*t+t/2,c=(n.y+1)*t+t/2,w=h+i*t/2,u=c+l*t/2,f=-l,y=i;a.push(`<line class="door" x1="${w-f*t*.45}" y1="${u-y*t*.45}" x2="${w+f*t*.45}" y2="${u+y*t*.45}" stroke="${d.door}" stroke-width="3"/>`)}for(const n of e.marineDeployment??[]){const i=(n.x+1)*t+t/2,l=(n.y+1)*t+t/2;a.push(`<circle class="deploy" cx="${i}" cy="${l}" r="${t*.3}" fill="${d.deploy}"/>`)}for(const n of e.entryPoints??[]){const i=n.facing??"up",{dc:l,dr:h}=v(i);a.push(P(n.x+l,n.y+h,i,d.entry,"entry"))}for(const n of e.exitPoints??[]){const i=n.facing??"up",{dc:l,dr:h}=v(i),c={up:"down",down:"up",left:"right",right:"left"};a.push(P(n.x+l,n.y+h,c[i],d.exit,"exit"))}const x=[...e.objectivePoint?[e.objectivePoint]:[],...e.objectivePoints??[],...e.downloadPoint?[e.downloadPoint]:[]];for(const n of x){const i=(n.x+1)*t+t/2,l=(n.y+1)*t+t/2,h=t*.38,c=e.downloadPoint===n?d.download:d.objective;a.push(`<polygon class="objective" points="${i},${l-h} ${i+h},${l} ${i},${l+h} ${i-h},${l}" fill="${c}"/>`)}for(const n of e.ductingSquares??[]){const i=(n.x+1)*t,l=(n.y+1)*t;a.push(`<rect class="ducting" x="${i+2}" y="${l+2}" width="${t-4}" height="${t-4}" fill="none" stroke="${d.ducting}" stroke-width="2"/>`)}if(e.catStart){const n=(e.catStart.x+1)*t+t/2,i=(e.catStart.y+1)*t+t/2;a.push(`<circle class="cat" cx="${n}" cy="${i}" r="${t*.25}" fill="none" stroke="${d.cat}" stroke-width="2"/>`)}return a.push("</svg>"),a.join("")}const H=[{swatch:`<svg viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" fill="${d.corridor}"/></svg>`,label:"Corridor square"},{swatch:`<svg viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" fill="${d.room}"/></svg>`,label:"Room square"},{swatch:`<svg viewBox="0 0 16 16"><line x1="2" y1="8" x2="14" y2="8" stroke="${d.door}" stroke-width="3"/></svg>`,label:"Door"},{swatch:`<svg viewBox="0 0 16 16"><polygon points="8,3 3,13 13,13" fill="${d.entry}"/></svg>`,label:"Genestealer entry point"},{swatch:`<svg viewBox="0 0 16 16"><polygon points="8,13 3,3 13,3" fill="${d.exit}"/></svg>`,label:"Marine exit"},{swatch:`<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" fill="${d.deploy}"/></svg>`,label:"Marine deployment square"},{swatch:`<svg viewBox="0 0 16 16"><polygon points="8,2 14,8 8,14 2,8" fill="${d.objective}"/></svg>`,label:"Objective square"},{swatch:`<svg viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" fill="none" stroke="${d.ducting}" stroke-width="2"/></svg>`,label:"Ducting (mission 6)"},{swatch:`<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="4" fill="none" stroke="${d.cat}" stroke-width="2"/></svg>`,label:"C.A.T. start (Rescue)"}],K={debug_1:"Kill everything, or reach the exit.",space_hulk_1:"Flame the Launch Control square. You lose the moment no living flamer has ammo.",space_hulk_2:"Kill 30 (blips count their hidden value), or blockade every entry point.",space_hulk_3:"Carry the C.A.T. out through an exit. Damaged = draw; destroyed = defeat.",space_hulk_4:"Burn both Gene Banks. You lose the moment no living flamer has ammo.",space_hulk_5:"Get 5 marines out through the exits. Fewer than 5 alive-plus-escaped = defeat.",space_hulk_6:"Survive to the end of turn 16. Lost ducting or a flamed control room = defeat.",beta_1:"Get any one marine out through the far exit.",beta_2:"Hold the Data Room with a sergeant for 4 quiet end phases. Both sergeants dead = defeat."},p=document.getElementById("manual");function o(e,s,r){const a=document.createElement(e);return s&&(a.className=s),r!==void 0&&(a.innerHTML=r),a}const b=o("header","manual-header");b.appendChild(o("h1",void 0,"SULK"));b.appendChild(o("p","manual-subtitle","Field manual: everything the ship will not tell you"));const A=o("a","back-link","&larr; Back to the game");A.href="./";A.id="back-to-game";b.appendChild(A);p.appendChild(b);const j=o("nav","manual-toc"),k=o("ul");for(const e of O)k.appendChild(o("li",void 0,`<a href="#${e.id}">${e.title}</a>`));k.appendChild(o("li",void 0,'<a href="#controls">Controls</a>'));k.appendChild(o("li",void 0,'<a href="#missions">The missions</a>'));j.appendChild(k);p.appendChild(j);const U=["what-is-this","ap-cp","shooting","flamer","doors","flames"];let S=0;for(const e of O){const s=o("section");if(s.id=e.id,s.appendChild(o("h2",void 0,e.title)),s.insertAdjacentHTML("beforeend",e.html),p.appendChild(s),U.includes(e.id)&&S<T.length){const r=T[S++],a=o("blockquote","marine-quote");a.appendChild(o("p",void 0,`&ldquo;${r.text}&rdquo;`)),a.appendChild(o("footer",void 0,`&mdash; ${r.attribution}`)),p.appendChild(a)}}const g=o("section");g.id="controls";g.appendChild(o("h2",void 0,"Controls"));g.insertAdjacentHTML("beforeend",F);const $=o("div","key-rose");for(const e of G){const s=o("div","key-row");s.style.paddingLeft=`${e.offset*3}em`;for(const r of e.caps){const a=o("div",r.label?"keycap":"keycap unbound");a.appendChild(o("span","key-letter",r.key)),a.appendChild(o("span","key-label",r.label??"")),r.sub&&a.appendChild(o("span","key-sub",`(${r.sub})`)),s.appendChild(a)}$.appendChild(s)}const B=o("div","key-row specials");for(const e of R){const s=o("div","keycap wide");s.appendChild(o("span","key-letter",e.key)),s.appendChild(o("span","key-label",e.label??"")),B.appendChild(s)}$.appendChild(B);g.appendChild($);const _=o("ul","key-notes");for(const e of Y)_.appendChild(o("li",void 0,e));g.appendChild(_);p.appendChild(g);const m=o("section");m.id="missions";m.appendChild(o("h2",void 0,"The missions"));m.appendChild(o("p",void 0,"Every map below is drawn from the same mission data the game plays: squares, doors, entry points, and objectives exactly where you will find them."));const C=o("div","map-legend");C.id="map-legend";for(const e of H){const s=o("span","legend-item");s.insertAdjacentHTML("beforeend",e.swatch),s.appendChild(o("span",void 0,e.label)),C.appendChild(s)}m.appendChild(C);const V=[...D,{key:"debug_1",name:E.debug_1.name,tagline:"The training scenario: one marine, a trickle of blips. Not on the mission select; start it with ?mission=debug_1.",squad:"1 storm bolter"}];for(const e of V){const s=o("article","mission-entry");s.id=`mission-${e.key}`,s.appendChild(o("h3",void 0,e.name)),s.appendChild(o("p","mission-tagline",e.tagline));const r=o("ul","mission-facts");r.appendChild(o("li",void 0,`<strong>Objective:</strong> ${K[e.key]??""}`)),r.appendChild(o("li",void 0,`<strong>Squad:</strong> ${e.squad}`)),s.appendChild(r);const a=o("div","mission-map");a.innerHTML=W(E[e.key]),s.appendChild(a),m.appendChild(s)}p.appendChild(m);const Q=o("footer","manual-footer",'A fan recreation of Toby Woodwark&rsquo;s <em>Sulk</em> (2003) &middot; <a href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0</a> &middot; Space Hulk is a trademark of Games Workshop; this project is unaffiliated and claims no rights over Games Workshop&rsquo;s intellectual property. &middot; <a id="credits-link" href="credits.html">Audio credits</a> &middot; <span id="app-version">latest-69b8bb0</span>');p.appendChild(Q);
