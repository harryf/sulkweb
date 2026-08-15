/**
 * Shared parser for ORIGINAL Sulk mission sources (MISH_*.py). Purely
 * mechanical extraction — no game semantics. Used by transcribeMission.ts
 * (single-mission board patch) and migrateMissions.ts (batch drafts).
 *
 * BOARD is a tuple of section-sublists; each square is `((x, y),)` or
 * `((x, y), {TAGS})`. Dicts may carry MULTIPLE tags (`{O:1,M:None}`,
 * `{O:2,DUCTING:RIGHT}`) and quoted strings (`{COMMENT:"Gene Bank"}`) —
 * missions 4–6 use all of these, so single-tag regexes silently lose data.
 * Trailing commas inside coordinate tuples (`((29, 5,),)`) are tolerated.
 */

export interface MishSquare {
  x: number;
  y: number;
  section: number;
  /** Raw tag map, e.g. { M: 'None', DOOR: 'RIGHT', O: '1', COMMENT: 'Gene Bank' } */
  tags: Record<string, string>;
}

export interface MishSquad {
  name: string;
  /** Original piece constants in tuple order (deploy pops from the END).
   *  `extra` carries a third tuple element when present — mission 3's CAT
   *  is `(CAT, MARINETEAM, WITHSQUAD)`. */
  pieces: { type: string; team: string; extra?: string }[];
}

export interface ParsedMish {
  name?: string;
  info?: string;
  story?: string;
  flags: string[];
  blips?: { initial: number; perTurn: number };
  squads: MishSquad[];
  sections: MishSquare[][];
  squares: MishSquare[];
}

const FACING: Record<string, string> = { UP: 'up', RIGHT: 'right', DOWN: 'down', LEFT: 'left' };
export const facingOf = (dir: string): string | undefined => FACING[dir];

/** Strip python comments, preserving them inside double-quoted strings. */
function stripComments(py: string): string {
  let out = '';
  let inStr = false;
  for (let i = 0; i < py.length; i++) {
    const ch = py[i];
    if (ch === '"') inStr = !inStr;
    if (ch === '#' && !inStr) {
      while (i < py.length && py[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    out += ch;
  }
  return out;
}

/** Split dict body on commas that sit outside quoted strings. */
function splitEntries(body: string): string[] {
  const parts: string[] = [];
  let cur = '', inStr = false;
  for (const ch of body) {
    if (ch === '"') inStr = !inStr;
    if (ch === ',' && !inStr) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function parseTags(body: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const entry of splitEntries(body)) {
    const m = entry.match(/^\s*(\w+)\s*:\s*("([^"]*)"|[\w-]+)\s*$/);
    if (!m) continue;
    tags[m[1]] = m[3] !== undefined ? m[3] : m[2];
  }
  return tags;
}

/** Walk a top-level `NAME = ( ... )` tuple by paren depth; returns the inner text. */
function tupleBody(py: string, constName: string): string | undefined {
  const decl = py.match(new RegExp(`^${constName}\\s*=`, 'm'));
  if (!decl || decl.index === undefined) return undefined;
  const open = py.indexOf('(', decl.index);
  if (open < 0) return undefined;
  let depth = 0;
  for (let i = open; i < py.length; i++) {
    if (py[i] === '(') depth++;
    else if (py[i] === ')') { depth--; if (depth === 0) return py.slice(open + 1, i); }
  }
  return undefined;
}

/** One backslash-continued python string constant, whitespace-collapsed. */
function stringConst(py: string, constName: string): string | undefined {
  const m = py.match(new RegExp(`^${constName}\\s*=\\s*"([\\s\\S]*?)"`, 'm'));
  return m ? m[1].replace(/\\\s*\n/g, ' ').replace(/\s+/g, ' ').trim() : undefined;
}

export function parseMish(pySource: string): ParsedMish {
  const py = stripComments(pySource);

  // ---- BOARD: depth walk, depth-2 groups are sections ----
  const boardDecl = py.match(/^BOARD\s*=/m);
  if (!boardDecl || boardDecl.index === undefined) throw new Error('no BOARD found');
  const open = py.indexOf('(', boardDecl.index);
  const sectionBodies: string[] = [];
  let depth = 1, cur = '';
  for (let i = open + 1; i < py.length && depth > 0; i++) {
    const ch = py[i];
    if (ch === '(') {
      depth++;
      if (depth === 2) { cur = ''; continue; }
    } else if (ch === ')') {
      depth--;
      if (depth === 1) { sectionBodies.push(cur); continue; }
      if (depth === 0) break;
    }
    if (depth >= 2) cur += ch;
  }

  const sections: MishSquare[][] = sectionBodies.map((body, si) => {
    const squares: MishSquare[] = [];
    // Coordinate tuple, optionally followed by a full tag dict.
    for (const m of body.matchAll(/\(\s*(\d+)\s*,\s*(\d+)\s*,?\s*\)\s*,?\s*(?:\{([^}]*)\})?/g)) {
      squares.push({
        x: Number(m[1]), y: Number(m[2]), section: si,
        tags: m[3] ? parseTags(m[3]) : {},
      });
    }
    return squares;
  });

  // ---- MARINES: alternating "SquadName", (piece tuples) ----
  const squads: MishSquad[] = [];
  const marinesBody = tupleBody(py, 'MARINES');
  if (marinesBody) {
    // Squad names in order, then associate each with the piece tuples that
    // follow it. Tuples may have a third element (mission 3's CAT: WITHSQUAD).
    const tokens = [...marinesBody.matchAll(/"([^"]+)"|\(\s*(\w+)\s*,\s*(\w+)\s*(?:,\s*(\w+)\s*)?\)/g)];
    let squad: MishSquad | undefined;
    for (const t of tokens) {
      if (t[1] !== undefined) {
        squad = { name: t[1], pieces: [] };
        squads.push(squad);
      } else if (squad && t[2] !== undefined) {
        squad.pieces.push({ type: t[2], team: t[3], ...(t[4] ? { extra: t[4] } : {}) });
      }
    }
  }

  // ---- Simple constants ----
  const blipsM = py.match(/^BLIPS\s*=\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/m);
  const flagsBody = tupleBody(py, 'FLAGS');
  const flags = flagsBody ? [...flagsBody.matchAll(/\w+/g)].map(m => m[0]) : [];

  return {
    name: stringConst(py, 'NAME'),
    info: stringConst(py, 'INFO'),
    story: stringConst(py, 'STORY'),
    flags,
    blips: blipsM ? { initial: Number(blipsM[1]), perTurn: Number(blipsM[2]) } : undefined,
    squads,
    sections,
    squares: sections.flat(),
  };
}
