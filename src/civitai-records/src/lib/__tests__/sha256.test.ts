import { createHash } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ReadableStream } from 'node:stream/web';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sha256, sha256FromFile, sha256FromUrl } from '../sha256.js';

function expectHashFor(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

test('sha256FromFile hashes local files without reading everything into memory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sha256-'));
  const filePath = join(dir, 'payload.txt');
  const body = 'civitai-records-test';
  await writeFile(filePath, body, { encoding: 'utf8' });

  const result = await sha256FromFile(filePath);

  assert.equal(result, expectHashFor(body));
});

test('sha256FromUrl streams response bodies to produce a digest', async () => {
  const payload = 'remote-hash-fixture';
  const originalFetch = globalThis.fetch;
  const url = 'https://example.com/file.bin';

  globalThis.fetch = (async (input) => {
    assert.equal(String(input), url);

    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });

    return {
      ok: true,
      status: 200,
      body: readable,
    } as Awaited<ReturnType<typeof fetch>>;
  }) as typeof fetch;

  try {
    const result = await sha256FromUrl(url);
    assert.equal(result, expectHashFor(payload));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sha256 chooses URL hashing for http(s) resources and file hashing otherwise', async () => {
  const payload = 'dispatch-check';
  const originalFetch = globalThis.fetch;
  const url = 'https://feedmob.example/resource';

  let fetchInvocations = 0;

  globalThis.fetch = (async () => {
    fetchInvocations += 1;

    return {
      ok: true,
      status: 200,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(payload));
          controller.close();
        },
      }),
    } as Awaited<ReturnType<typeof fetch>>;
  }) as typeof fetch;

  const dir = await mkdtemp(join(tmpdir(), 'sha256-dispatch-'));
  const filePath = join(dir, 'payload.txt');
  await writeFile(filePath, payload, { encoding: 'utf8' });

  try {
    const remoteResult = await sha256(url);
    assert.equal(remoteResult, expectHashFor(payload));
    assert.equal(fetchInvocations, 1, 'expected fetch to be used for remote URLs');

    const localResult = await sha256(filePath);
    assert.equal(localResult, expectHashFor(payload));
    assert.equal(fetchInvocations, 1, 'expected fetch not to run for local files');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
