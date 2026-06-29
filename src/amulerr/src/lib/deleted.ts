import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DELETED_HASHES_FILE = path.join(os.tmpdir(), 'deleted_hashes.json');

const deletedHashes = new Set<string>();

// Load initially on startup
try {
  if (fs.existsSync(DELETED_HASHES_FILE)) {
    const data = JSON.parse(fs.readFileSync(DELETED_HASHES_FILE, 'utf-8'));
    if (Array.isArray(data)) {
      data.forEach((h: string) => deletedHashes.add(h.toUpperCase()));
    }
  }
} catch (err: any) {
  console.error('Failed to load deleted hashes:', err.message);
}

export function isHashDeleted(hash: string): boolean {
  return deletedHashes.has(hash.toUpperCase());
}

export function addDeletedHash(hash: string) {
  const upper = hash.toUpperCase();
  if (!deletedHashes.has(upper)) {
    deletedHashes.add(upper);
    saveDeletedHashes();
  }
}

function saveDeletedHashes() {
  try {
    fs.writeFileSync(DELETED_HASHES_FILE, JSON.stringify(Array.from(deletedHashes)), 'utf-8');
  } catch (err: any) {
    console.error('Failed to save deleted hashes:', err.message);
  }
}
