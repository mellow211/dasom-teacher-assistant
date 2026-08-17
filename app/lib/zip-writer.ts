const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; date: number } {
  const time = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() >> 1) & 0x1f);
  const dosDate = (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f);
  return { time, date: dosDate };
}

class ByteWriter {
  private chunks: number[] = [];
  u8(v: number) { this.chunks.push(v & 0xff); }
  u16(v: number) { this.u8(v); this.u8(v >>> 8); }
  u32(v: number) { this.u16(v); this.u16(v >>> 16); }
  bytes(b: Uint8Array) { for (let i = 0; i < b.length; i++) this.chunks.push(b[i]); }
  get length() { return this.chunks.length; }
  toUint8Array(): Uint8Array<ArrayBuffer> { return new Uint8Array(this.chunks); }
}

export type ZipEntryInput = { name: string; data: Uint8Array };

/** Minimal ZIP writer. Every entry is stored uncompressed (method 0), which every
 * conforming ZIP reader (including HWPX/OCF-based readers) must support, so this
 * avoids needing a DEFLATE implementation. */
export function buildZip(entries: ZipEntryInput[]): Uint8Array {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(new Date());
  const out = new ByteWriter();
  const central: { nameBytes: Uint8Array; crc: number; size: number; offset: number }[] = [];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const offset = out.length;
    out.u32(0x04034b50);
    out.u16(20);
    out.u16(0);
    out.u16(0);
    out.u16(time);
    out.u16(date);
    out.u32(crc);
    out.u32(entry.data.length);
    out.u32(entry.data.length);
    out.u16(nameBytes.length);
    out.u16(0);
    out.bytes(nameBytes);
    out.bytes(entry.data);
    central.push({ nameBytes, crc, size: entry.data.length, offset });
  }

  const centralStart = out.length;
  for (const c of central) {
    out.u32(0x02014b50);
    out.u16(20);
    out.u16(20);
    out.u16(0);
    out.u16(0);
    out.u16(time);
    out.u16(date);
    out.u32(c.crc);
    out.u32(c.size);
    out.u32(c.size);
    out.u16(c.nameBytes.length);
    out.u16(0);
    out.u16(0);
    out.u16(0);
    out.u16(0);
    out.u32(0);
    out.u32(c.offset);
    out.bytes(c.nameBytes);
  }
  const centralSize = out.length - centralStart;

  out.u32(0x06054b50);
  out.u16(0);
  out.u16(0);
  out.u16(central.length);
  out.u16(central.length);
  out.u32(centralSize);
  out.u32(centralStart);
  out.u16(0);

  return out.toUint8Array();
}
