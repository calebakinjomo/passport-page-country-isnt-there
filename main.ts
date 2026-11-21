// The Passport Page of a Country That Isn't There
// An invented passport spread for the Republic of Kestrelia — a small
// island nation in the southern Atlantic, a seabird sanctuary.
// Drawn entirely in code: a data page (portrait, fields, machine-readable
// zone) and a visa page (arrival/departure stamps, a visa condition and a
// sanctuary-levy fee stamp). Writes one 1024x1024 PNG to
// $MAKEFUN_OUTPUT_DIR/entry.png (or /output/entry.png when unset).
// Node 22+ standard library only. No clock, no randomness, no files read
// at run time — two runs produce byte-identical output.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- font
// A hand-drawn 5x7 bitmap font. Each glyph is 7 rows of 5 cells,
// '#' = ink, '.' = empty. Uppercase, digits and common punctuation.

const GLYPHS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#..##", "#.#.#", "##..#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".....", ".##..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."],
  "'": ["..#..", "..#..", "..#..", ".....", ".....", ".....", "....."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  "%": ["#...#", "#..#.", "...#.", "..#..", ".#...", ".#..#", "#...#"],
  $: ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  '"': [".#.#.", ".#.#.", ".#.#.", ".....", ".....", ".....", "....."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "*": [".....", ".#.#.", "..#..", "#####", "..#..", ".#.#.", "....."],
  "<": ["....#", "...#.", "..#..", ".#...", "..#..", "...#.", "....#"],
  ">": ["#....", ".#...", "..#..", "...#.", "..#..", ".#...", "#...."],
};

// ------------------------------------------------------------- palette
type RGB = [number, number, number];
const PAPER: RGB = [247, 243, 232];
const DESK: RGB = [214, 208, 194];
const INK: RGB = [22, 22, 22];
const BLUE: RGB = [38, 68, 108];
const RED: RGB = [172, 32, 32];
const GREY: RGB = [118, 112, 98];
const PANEL: RGB = [238, 231, 214];
const MRZPANEL: RGB = [228, 232, 238];
const WHITE: RGB = [255, 255, 255];
const PHOTOBG: RGB = [206, 214, 224];
const SKIN: RGB = [214, 182, 152];
const HAIR: RGB = [58, 44, 34];
const JACKET: RGB = [52, 72, 104];
const WAVE: RGB = [232, 226, 208];

// ------------------------------------------------------------- canvas
class Canvas {
  readonly w = W;
  readonly h = H;
  private px = new Uint8Array(W * H * 3);

  constructor() {
    this.fill(DESK);
  }

  fill(c: RGB): void {
    for (let i = 0; i < W * H; i++) {
      this.px[i * 3] = c[0];
      this.px[i * 3 + 1] = c[1];
      this.px[i * 3 + 2] = c[2];
    }
  }

  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
  }

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
    }
  }

  frame(x: number, y: number, w: number, h: number, c: RGB, thick = 1): void {
    this.rect(x, y, w, thick, c);
    this.rect(x, y + h - thick, w, thick, c);
    this.rect(x, y, thick, h, c);
    this.rect(x + w - thick, y, thick, h, c);
  }

  hline(x: number, y: number, w: number, c: RGB, thick = 1): void {
    this.rect(x, y, w, thick, c);
  }

  vline(x: number, y: number, h: number, c: RGB, thick = 1): void {
    this.rect(x, y, thick, h, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.set(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  disc(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) this.set(cx + x, cy + y, c);
      }
    }
  }

  ring(cx: number, cy: number, r: number, c: RGB, thick = 2): void {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      for (let t = 0; t < thick; t++) {
        this.set(
          Math.round(cx + (r - t) * Math.cos(rad)),
          Math.round(cy + (r - t) * Math.sin(rad)),
          c,
        );
      }
    }
  }

  triangle(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    c: RGB,
  ): void {
    const minY = Math.min(y0, y1, y2);
    const maxY = Math.max(y0, y1, y2);
    const edge = (
      ax: number,
      ay: number,
      bx: number,
      by: number,
      y: number,
    ): number => {
      if (ay === by) return ax;
      return ax + ((bx - ax) * (y - ay)) / (by - ay);
    };
    for (let y = minY; y <= maxY; y++) {
      const xs = [
        edge(x0, y0, x1, y1, y),
        edge(x1, y1, x2, y2, y),
        edge(x2, y2, x0, y0, y),
      ].sort((a, b) => a - b);
      for (let x = Math.round(xs[0]); x <= Math.round(xs[2]); x++) {
        this.set(x, y, c);
      }
    }
  }

  // A faint security wave across a page, like a guilloche.
  wave(x0: number, x1: number, baseY: number, amp: number, c: RGB): void {
    for (let x = x0; x <= x1; x += 2) {
      const y = baseY + Math.round(amp * Math.sin((x - x0) / 42));
      this.set(x, y, c);
      this.set(x + 1, y, c);
    }
  }
}

// -------------------------------------------------------------- text
function glyphWidth(scale: number, gap: number): number {
  return 5 * scale + gap;
}

function textWidth(text: string, scale: number, gap?: number): number {
  const g = gap === undefined ? scale : gap;
  if (text.length === 0) return 0;
  return text.length * glyphWidth(scale, g) - g;
}

function drawChar(
  cv: Canvas,
  ch: string,
  x: number,
  y: number,
  scale: number,
  c: RGB,
): void {
  const g = GLYPHS[ch] ?? GLYPHS["?"];
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === "#") {
        cv.rect(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}

function drawText(
  cv: Canvas,
  text: string,
  x: number,
  y: number,
  scale: number,
  c: RGB,
  gap?: number,
): number {
  const g = gap === undefined ? scale : gap;
  let cx = x;
  for (const ch of text) {
    drawChar(cv, ch, cx, y, scale, c);
    cx += glyphWidth(scale, g);
  }
  return cx - x - g;
}

function drawTextCentred(
  cv: Canvas,
  text: string,
  cx: number,
  y: number,
  scale: number,
  c: RGB,
  gap?: number,
): void {
  const w = textWidth(text, scale, gap);
  drawText(cv, text, cx - Math.floor(w / 2), y, scale, c, gap);
}

// Greedy word wrap to a maximum pixel width. Returns the lines.
function wrapText(
  text: string,
  maxWidth: number,
  scale: number,
  gap?: number,
): string[] {
  const g = gap === undefined ? scale : gap;
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const trial = cur === "" ? word : cur + " " + word;
    if (textWidth(trial, scale, g) <= maxWidth || cur === "") {
      cur = trial;
    } else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- png
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(
    crc32(Buffer.concat([Buffer.from(type, "ascii"), data])),
    8 + data.length,
  );
  return out;
}

function encodePng(cv: Canvas): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  const px = (cv as unknown as { px: Uint8Array }).px;
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(
      raw,
      y * (1 + W * 3) + 1,
    );
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------- machine-readable zone
// ICAO 9303 check digit: weights 7,3,1 repeating; A=10 .. Z=35, '<'=0.
function checkDigit(s: string): string {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    let v: number;
    if (ch >= "0" && ch <= "9") v = ch.charCodeAt(0) - 48;
    else if (ch >= "A" && ch <= "Z") v = ch.charCodeAt(0) - 55;
    else v = 0; // '<' and anything else
    sum += v * weights[i % 3];
  }
  return String(sum % 10);
}

function mrzLines(): [string, string] {
  const line1 =
    "P<KSTMARA<<ELLISON<VANE" + "<".repeat(21);
  const docNo = "KST048217";
  const d1 = checkDigit(docNo);
  const dob = "880312";
  const d2 = checkDigit(dob);
  const exp = "340613";
  const d3 = checkDigit(exp);
  const personal = "<".repeat(14);
  const body =
    docNo + d1 + "KST" + dob + d2 + "F" + exp + d3 + personal + "<";
  const finalCheck = checkDigit(body);
  const line2 = body + finalCheck;
  return [line1, line2];
}

// ------------------------------------------------------- illustrations
// A small shield with a kestrel: the arms of Kestrelia.
// Drawn as a blue outline on the paper, so the bird inside reads clearly.
function drawShield(cv: Canvas, cx: number, top: number): void {
  const w = 46;
  const h = 52;
  const x0 = cx - Math.floor(w / 2);
  const x1 = x0 + w - 1;
  const midY = top + 34;
  // Shield outline: straight top and sides, pointed bottom.
  cv.hline(x0, top, w, BLUE, 2);
  cv.vline(x0, top, 34, BLUE, 2);
  cv.vline(x1, top, 34, BLUE, 2);
  cv.line(x0, midY, cx, top + h, BLUE);
  cv.line(x1, midY, cx, top + h, BLUE);
  cv.line(x0 + 1, midY, cx, top + h - 1, BLUE);
  cv.line(x1 - 1, midY, cx, top + h - 1, BLUE);
  // The kestrel: a small bird in flight — swept wings, body, tail.
  const by = top + 22;
  cv.line(cx - 13, by - 5, cx + 13, by - 5, INK);
  cv.line(cx - 13, by - 5, cx - 2, by + 1, INK);
  cv.line(cx + 13, by - 5, cx + 2, by + 1, INK);
  cv.line(cx - 2, by + 1, cx + 2, by + 1, INK);
  cv.line(cx, by + 1, cx + 6, by + 7, INK);
  cv.disc(cx - 14, by - 6, 2, INK);
  // A small star above the bird.
  cv.disc(cx, top + 9, 2, RED);
}

// A stylised passport portrait: head and shoulders, windswept hair,
// the seabird researcher of Port Kestrel.
function drawPortrait(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, PHOTOBG);
  const cx = x + Math.floor(w / 2);
  // Shoulders and jacket.
  cv.triangle(cx - 62, y + h, cx + 62, y + h, cx, y + 118, JACKET);
  // Shirt V at the neck.
  cv.triangle(cx - 14, y + 132, cx + 14, y + 132, cx, y + 158, WHITE);
  // Neck.
  cv.rect(cx - 11, y + 96, 22, 26, SKIN);
  // Hair behind the head, shoulder length.
  cv.disc(cx, y + 62, 40, HAIR);
  cv.rect(cx - 40, y + 62, 14, 62, HAIR);
  cv.rect(cx + 26, y + 62, 14, 62, HAIR);
  // Face.
  cv.disc(cx, y + 70, 31, SKIN);
  // Eyes, brows, nose, mouth.
  cv.disc(cx - 13, y + 66, 3, INK);
  cv.disc(cx + 13, y + 66, 3, INK);
  cv.hline(cx - 18, y + 58, 10, INK, 2);
  cv.hline(cx + 8, y + 58, 10, INK, 2);
  cv.vline(cx, y + 70, 10, INK, 2);
  cv.hline(cx - 8, y + 90, 16, INK, 2);
}

// One entry/exit stamp: a bordered box with country, kind and date.
function drawStamp(
  cv: Canvas,
  x: number,
  y: number,
  w: number,
  h: number,
  country: string,
  kind: string,
  date: string,
  c: RGB,
): void {
  cv.frame(x, y, w, h, c, 2);
  cv.frame(x + 5, y + 5, w - 10, h - 10, c, 1);
  const cx = x + Math.floor(w / 2);
  drawTextCentred(cv, country, cx, y + 14, 2, c);
  drawTextCentred(cv, kind, cx, y + 38, 1, c);
  drawTextCentred(cv, date, cx, y + 58, 2, c);
  // Small circle with a star, the officer's mark.
  cv.ring(x + w - 26, y + h - 24, 11, c, 2);
  cv.disc(x + w - 26, y + h - 24, 2, c);
}

// A circular fee stamp, slightly rotated in spirit by its offset text.
function drawFeeStamp(cv: Canvas, cx: number, cy: number, r: number): void {
  cv.ring(cx, cy, r, RED, 3);
  cv.ring(cx, cy, r - 8, RED, 1);
  drawTextCentred(cv, "SANCTUARY", cx, cy - 26, 1, RED);
  drawTextCentred(cv, "LEVY", cx, cy - 12, 2, RED);
  drawTextCentred(cv, "12 KRD", cx, cy + 6, 2, RED);
  drawTextCentred(cv, "PAID", cx, cy + 24, 2, RED);
}

// One data field: small grey label above a larger ink value.
function field(
  cv: Canvas,
  x: number,
  y: number,
  label: string,
  value: string,
): void {
  drawText(cv, label, x, y, 1, GREY);
  drawText(cv, value, x, y + 9, 2, INK);
}

// ------------------------------------------------------------ layout
function main(): void {
  const cv = new Canvas();

  // ---- the spread: cream paper on a desk, centre fold
  cv.rect(20, 20, 984, 984, PAPER);
  cv.frame(20, 20, 984, 984, INK, 2);
  cv.vline(512, 22, 980, [210, 204, 188], 2);
  // Faint security waves on both pages.
  cv.wave(44, 496, 700, 3, WAVE);
  cv.wave(44, 496, 760, 3, WAVE);
  cv.wave(528, 980, 700, 3, WAVE);
  cv.wave(528, 980, 760, 3, WAVE);

  // ============================================ LEFT PAGE: data page
  drawShield(cv, 272, 40);
  drawTextCentred(cv, "REPUBLIC OF KESTRELIA", 272, 104, 3, INK);
  drawTextCentred(cv, "PASSPORT", 272, 130, 4, BLUE);
  cv.hline(48, 162, 448, INK, 2);
  cv.hline(48, 166, 448, RED, 1);

  // Portrait, left.
  cv.frame(56, 182, 150, 200, INK, 2);
  drawPortrait(cv, 58, 184, 146, 196);

  // Fields to the right of the portrait.
  let fy = 186;
  field(cv, 224, fy, "SURNAME", "VANE");
  fy += 38;
  field(cv, 224, fy, "GIVEN NAMES", "MARA ELLISON");
  fy += 38;
  field(cv, 224, fy, "NATIONALITY", "KESTRELIAN");
  fy += 38;
  field(cv, 224, fy, "DATE OF BIRTH", "12 MAR 1988");
  fy += 38;
  field(cv, 224, fy, "PLACE OF BIRTH", "PORT KESTREL");
  fy += 38;
  field(cv, 224, fy, "SEX", "F");

  // Fields in two columns below the portrait.
  const rowY = 412;
  field(cv, 56, rowY, "DATE OF ISSUE", "14 JUN 2024");
  field(cv, 280, rowY, "DATE OF EXPIRY", "13 JUN 2034");
  field(cv, 56, rowY + 48, "PASSPORT NO.", "KST 048217");
  field(cv, 280, rowY + 48, "AUTHORITY", "PORT KESTREL");
  field(cv, 56, rowY + 96, "HEIGHT", "168 CM");
  field(cv, 280, rowY + 96, "EYES", "BROWN");
  field(cv, 56, rowY + 144, "OCCUPATION", "SEABIRD RESEARCHER");

  // Bearer signature.
  cv.line(56, 640, 150, 632, INK);
  cv.line(150, 632, 210, 640, INK);
  cv.line(210, 640, 260, 630, INK);
  cv.line(260, 630, 320, 638, INK);
  cv.hline(56, 646, 280, INK, 1);
  drawText(cv, "SIGNATURE OF BEARER", 56, 654, 1, GREY);

  // A note of the island's character, in the space below.
  drawText(cv, "HOLDER IS A RESIDENT OF THE", 56, 700, 1, GREY);
  drawText(cv, "KESTREL SANCTUARY, PORT KESTREL.", 56, 712, 1, GREY);

  // Machine-readable zone at the foot of the data page.
  const [mrz1, mrz2] = mrzLines();
  cv.rect(44, 872, 452, 96, MRZPANEL);
  cv.frame(44, 872, 452, 96, BLUE, 1);
  drawText(cv, mrz1, 52, 892, 2, INK, 0);
  drawText(cv, mrz2, 52, 922, 2, INK, 0);

  // =========================================== RIGHT PAGE: visa page
  drawTextCentred(cv, "VISAS", 752, 104, 4, INK);
  drawTextCentred(cv, "ENDORSEMENTS AND OBSERVATIONS", 752, 140, 1, GREY);
  cv.hline(528, 162, 452, INK, 2);
  cv.hline(528, 166, 452, RED, 1);

  // Three pairs of arrival / departure stamps, all after the issue
  // date of 14 JUN 2024, from the island's three neighbours.
  const stampW = 216;
  const stampH = 96;
  const rows: Array<[string, string, string, string, string, string]> = [
    ["ALMARIN", "ARRIVAL", "02 SEP 2024", "ALMARIN", "DEPARTURE", "09 SEP 2024"],
    ["TESSARO", "ARRIVAL", "21 JAN 2025", "TESSARO", "DEPARTURE", "30 JAN 2025"],
    ["VELDMARK", "ARRIVAL", "11 MAY 2025", "VELDMARK", "DEPARTURE", "18 MAY 2025"],
  ];
  let sy = 190;
  for (const [c1, k1, d1, c2, k2, d2] of rows) {
    drawStamp(cv, 524, sy, stampW, stampH, c1, k1, d1, BLUE);
    drawStamp(cv, 764, sy, stampW, stampH, c2, k2, d2, RED);
    sy += 116;
  }

  // Visa condition: the telling detail — a seabird sanctuary island.
  const condY = 560;
  cv.frame(524, condY, 456, 122, INK, 2);
  drawText(cv, "VISA CONDITION", 540, condY + 14, 2, RED);
  const condLines = wrapText(
    "NO NIGHT LANDINGS - KESTREL ROOSTING SEASON, 1 APR - 30 SEP. " +
      "HOLDERS MUST REGISTER WITH THE SANCTUARY OFFICE ON ARRIVAL.",
    424,
    2,
  );
  let cy = condY + 42;
  for (const line of condLines) {
    drawText(cv, line, 540, cy, 2, INK);
    cy += 20;
  }

  // Sanctuary-levy fee stamp, bottom right of the visa page.
  drawFeeStamp(cv, 872, 768, 58);

  // A line of the island's law, at the foot of the visa page.
  drawTextCentred(
    cv,
    "THIS PASSPORT REMAINS THE PROPERTY OF",
    752,
    900,
    1,
    GREY,
  );
  drawTextCentred(cv, "THE REPUBLIC OF KESTRELIA", 752, 912, 1, GREY);
  drawTextCentred(cv, "LOST OR STOLEN PASSPORTS MUST BE", 752, 936, 1, GREY);
  drawTextCentred(cv, "REPORTED TO THE NEAREST CONSULATE.", 752, 948, 1, GREY);

  const png = encodePng(cv);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
}

main();
