// Generación procedural: colocar salas (rechazo por solape) + conectar centros
// por árbol de expansión mínima (MST) con corredores en L. MST garantiza que
// todas las salas son alcanzables => inicio y escaleras siempre conectados.

import { WORLD, MAZE } from "../config.js";
import { TileMap } from "./TileMap.js";
import { T, TERRAIN_WEIGHTS } from "./tiles.js";

export function generateMaze(rng) {
  const map = new TileMap(WORLD.cols, WORLD.rows);
  const rooms = placeRooms(map, rng);

  carveRooms(map, rooms);
  connectRooms(map, rooms, rng);

  // Inicio en la primera sala; escaleras en la sala más lejana.
  const spawnRoom = rooms[0];
  const exitRoom = farthestRoom(rooms, spawnRoom);

  const spawn = roomCenter(spawnRoom);
  const exit = roomCenter(exitRoom);

  // Pinta terreno sobre el suelo ANTES de marcar las escaleras (no las pisa).
  paintTerrain(map, rng, spawn, exit);
  paintStrategicIce(map, exitRoom, exit);
  map.set(exit.col, exit.row, T.EXIT);

  return {
    map,
    rooms,
    spawnRoom,
    exitRoom,
    spawnPoint: map.centerOf(spawn.col, spawn.row),
    exitPoint: map.centerOf(exit.col, exit.row),
  };
}

function placeRooms(map, rng) {
  const rooms = [];
  for (let i = 0; i < MAZE.roomAttempts; i++) {
    const w = rng.int(MAZE.roomMin, MAZE.roomMax);
    const h = rng.int(MAZE.roomMin, MAZE.roomMax);
    const x = rng.int(1, map.cols - w - 1);
    const y = rng.int(1, map.rows - h - 1);
    const room = { x, y, w, h };
    if (!rooms.some((r) => overlaps(r, room, 1))) rooms.push(room);
  }
  return rooms;
}

function overlaps(a, b, pad) {
  return (
    a.x - pad < b.x + b.w &&
    a.x + a.w + pad > b.x &&
    a.y - pad < b.y + b.h &&
    a.y + a.h + pad > b.y
  );
}

function carveRooms(map, rooms) {
  for (const r of rooms) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) map.set(x, y, T.FLOOR);
    }
  }
}

function roomCenter(r) {
  return { col: Math.floor(r.x + r.w / 2), row: Math.floor(r.y + r.h / 2) };
}

// MST sobre centros de sala (Prim) + corredores en L. Aristas extra => loops.
function connectRooms(map, rooms, rng) {
  if (rooms.length < 2) return;
  const centers = rooms.map(roomCenter);
  const inTree = new Set([0]);
  const edges = [];

  while (inTree.size < rooms.length) {
    let best = null;
    for (const a of inTree) {
      for (let b = 0; b < rooms.length; b++) {
        if (inTree.has(b)) continue;
        const d = dist2(centers[a], centers[b]);
        if (!best || d < best.d) best = { a, b, d };
      }
    }
    edges.push([best.a, best.b]);
    inTree.add(best.b);
  }

  // Aristas extra aleatorias (loops para mejor exploración)
  const extra = Math.floor(rooms.length * MAZE.extraEdges);
  for (let i = 0; i < extra; i++) {
    const a = rng.int(0, rooms.length - 1);
    const b = rng.int(0, rooms.length - 1);
    if (a !== b) edges.push([a, b]);
  }

  for (const [a, b] of edges) carveCorridor(map, centers[a], centers[b], rng);
}

function carveCorridor(map, from, to, rng) {
  // L: primero horizontal o vertical (aleatorio), luego el otro tramo
  if (rng.chance(0.5)) {
    hLine(map, from.col, to.col, from.row);
    vLine(map, from.row, to.row, to.col);
  } else {
    vLine(map, from.row, to.row, from.col);
    hLine(map, from.col, to.col, to.row);
  }
}

function hLine(map, c0, c1, row) {
  const [a, b] = c0 < c1 ? [c0, c1] : [c1, c0];
  for (let c = a; c <= b; c++) if (map.get(c, row) === T.WALL) map.set(c, row, T.FLOOR);
}
function vLine(map, r0, r1, col) {
  const [a, b] = r0 < r1 ? [r0, r1] : [r1, r0];
  for (let r = a; r <= b; r++) if (map.get(col, r) === T.WALL) map.set(col, r, T.FLOOR);
}

function farthestRoom(rooms, from) {
  const c0 = roomCenter(from);
  let best = rooms[0], bestD = -1;
  for (const r of rooms) {
    const d = dist2(roomCenter(r), c0);
    if (d > bestD) { bestD = d; best = r; }
  }
  return best;
}

function dist2(a, b) {
  const dx = a.col - b.col, dy = a.row - b.row;
  return dx * dx + dy * dy;
}

// Manchas de terreno por random-walk sobre tiles de suelo. Nunca sobre el
// área segura del inicio ni sobre el tile de las escaleras.
function paintTerrain(map, rng, spawn, exit) {
  const safe = MAZE.spawnSafeTiles;
  for (let i = 0; i < MAZE.terrainPatches; i++) {
    const id = weightedPick(rng, TERRAIN_WEIGHTS);
    // Punto de inicio: un tile de suelo aleatorio
    let col, row, tries = 0;
    do {
      col = rng.int(1, map.cols - 2);
      row = rng.int(1, map.rows - 2);
      tries++;
    } while (map.get(col, row) !== T.FLOOR && tries < 40);
    if (map.get(col, row) !== T.FLOOR) continue;

    for (let s = 0; s < MAZE.patchSize; s++) {
      const nearSpawn = Math.abs(col - spawn.col) <= safe && Math.abs(row - spawn.row) <= safe;
      const isExit = col === exit.col && row === exit.row;
      if (map.get(col, row) === T.FLOOR && !nearSpawn && !isExit) {
        map.set(col, row, id);
      }
      // paso aleatorio en 4-vecindad, manteniéndose en suelo/terreno (no muro)
      const dir = rng.int(0, 3);
      const nc = col + (dir === 0 ? 1 : dir === 1 ? -1 : 0);
      const nr = row + (dir === 2 ? 1 : dir === 3 ? -1 : 0);
      if (map.inBounds(nc, nr) && map.get(nc, nr) !== T.WALL) { col = nc; row = nr; }
    }
  }
}

function paintStrategicIce(map, exitRoom, exit) {
  const lanes = [
    { dc: 1, dr: 0 },
    { dc: -1, dr: 0 },
    { dc: 0, dr: 1 },
    { dc: 0, dr: -1 },
  ];
  for (const lane of lanes) {
    for (let step = 1; step <= 2; step++) {
      const col = exit.col + lane.dc * step;
      const row = exit.row + lane.dr * step;
      if (!insideRoom(col, row, exitRoom)) continue;
      if (map.get(col, row) !== T.EXIT && map.get(col, row) !== T.WALL) map.set(col, row, T.ICE);
    }
  }
}

function insideRoom(col, row, room) {
  return col >= room.x && row >= room.y && col < room.x + room.w && row < room.y + room.h;
}

function weightedPick(rng, items) {
  const total = items.reduce((s, it) => s + it.w, 0);
  let r = rng() * total;
  for (const it of items) { if ((r -= it.w) < 0) return it.id; }
  return items[0].id;
}
