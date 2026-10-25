import { Buffer } from 'buffer';

// Wire protocol: newline-delimited JSON messages.
// Large payloads are split into chunks and sent as separate messages so the
// UI stays responsive and progress can be reported per chunk.

export const CHUNK_SIZE = 256 * 1024; // 256 KB per chunk
export const PORT = 47923;
export const SERVICE_TYPE = '_share-transfer._tcp';

export const MessageType = {
  HELLO: 'hello',
  OFFER: 'offer', // sender describes a file before sending bytes
  CHUNK: 'chunk', // base64 chunk of the file
  DONE: 'done', // all chunks sent
  ACK: 'ack', // receiver confirms a complete file
  ERROR: 'error',
};

export function encode(message) {
  return JSON.stringify(message) + '\n';
}

// Accumulates incoming bytes and yields complete messages.
// Works on raw bytes: a newline byte (0x0A) never occurs inside a multi-byte
// UTF-8 character, so splitting on it is safe even when TCP splits a
// character across two packets. Decoding happens per complete line only.
export function createDecoder(onMessage) {
  let pending = Buffer.alloc(0);
  return (chunk) => {
    pending = Buffer.concat([pending, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf8')]);
    let index;
    while ((index = pending.indexOf(0x0a)) !== -1) {
      const line = pending.subarray(0, index).toString('utf8');
      pending = pending.subarray(index + 1);
      if (line.trim().length === 0) continue;
      try {
        onMessage(JSON.parse(line));
      } catch (e) {
        onMessage({ type: MessageType.ERROR, error: 'Malformed message' });
      }
    }
  };
}

export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
