import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(body));
  return Buffer.concat([len, body, crc]);
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function icon(size, { inset = 0, radius = 0.22, bg = '#1E6B48', fg = '#FFFFFF' } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const [br, bgc, bb] = hex(bg);
  const [fr, fg2, fb] = hex(fg);
  const r = radius * size;
  const put = (x, y, c) => {
    const i = (y * size + x) * 4;
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
  };
  const inRounded = (x, y) => {
    if (radius <= 0) return true;
    const cx = Math.min(Math.max(x, r), size - r);
    const cy = Math.min(Math.max(y, r), size - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };
  // fondo
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inRounded(x + 0.5, y + 0.5)) put(x, y, [br, bgc, bb]);
      else { const i = (y * size + x) * 4; buf[i + 3] = 0; }
    }
  }
  // barra con discos, centrada y escalada por `inset` (zona segura maskable)
  const s = 1 - inset * 2;
  const rect = (x0, y0, x1, y1) => {
    const X0 = Math.round((inset + x0 * s) * size), X1 = Math.round((inset + x1 * s) * size);
    const Y0 = Math.round((inset + y0 * s) * size), Y1 = Math.round((inset + y1 * s) * size);
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) put(x, y, [fr, fg2, fb]);
  };
  rect(0.10, 0.455, 0.90, 0.545);          // barra
  rect(0.10, 0.30, 0.19, 0.70);            // disco externo izq
  rect(0.22, 0.22, 0.32, 0.78);            // disco interno izq
  rect(0.81, 0.30, 0.90, 0.70);            // disco externo der
  rect(0.68, 0.22, 0.78, 0.78);            // disco interno der
  return png(size, size, buf);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/pwa-192.png', icon(192));
writeFileSync('public/pwa-512.png', icon(512));
writeFileSync('public/pwa-maskable-512.png', icon(512, { inset: 0.14, radius: 0 }));
writeFileSync('public/apple-touch-icon.png', icon(180, { radius: 0 }));
console.log('iconos generados');
