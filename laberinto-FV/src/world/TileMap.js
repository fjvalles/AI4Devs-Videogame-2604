// Grid lógico. Array plano Uint8 = barato y rápido. Conversión mundo<->celda
// y queries de colisión contra muros.

import { TILE } from "../config.js";
import { T, tileProps } from "./tiles.js";

export class TileMap {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.tiles = new Uint8Array(cols * rows).fill(T.WALL);
  }

  get widthPx() { return this.cols * TILE; }
  get heightPx() { return this.rows * TILE; }

  inBounds(col, row) {
    return col >= 0 && row >= 0 && col < this.cols && row < this.rows;
  }

  idx(col, row) { return row * this.cols + col; }

  get(col, row) {
    if (!this.inBounds(col, row)) return T.WALL;
    return this.tiles[this.idx(col, row)];
  }

  set(col, row, id) {
    if (this.inBounds(col, row)) this.tiles[this.idx(col, row)] = id;
  }

  // Conversión de coords mundo (px) a celda
  colAt(x) { return Math.floor(x / TILE); }
  rowAt(y) { return Math.floor(y / TILE); }

  tileAtWorld(x, y) { return this.get(this.colAt(x), this.rowAt(y)); }

  isWallWorld(x, y) { return !tileProps(this.tileAtWorld(x, y)).walkable; }

  // ¿Algún tile no-walkable solapa el AABB [x±r, y±r]? (círculo aprox. por bbox)
  blockedBox(x, y, r, hasKey = true) {
    const c0 = this.colAt(x - r), c1 = this.colAt(x + r);
    const r0 = this.rowAt(y - r), r1 = this.rowAt(y + r);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const id = this.get(col, row);
        if (id === T.EXIT && !hasKey) return true;
        if (!tileProps(id).walkable) return true;
      }
    }
    return false;
  }

  centerOf(col, row) {
    return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
  }
}
