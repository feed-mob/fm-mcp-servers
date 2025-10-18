import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import type { BinaryLike } from 'node:crypto';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:']);

async function digestStream(stream: NodeJS.ReadableStream): Promise<string> {
  const hash = createHash('sha256');

  for await (const chunk of stream) {
    hash.update(chunk as BinaryLike);
  }

  return hash.digest('hex');
}

export async function sha256FromFile(filePath: string): Promise<string> {
  const stream = createReadStream(filePath);

  try {
    return await digestStream(stream);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to calculate SHA-256 for file "${filePath}": ${message}`);
  }
}

export async function sha256FromUrl(input: string): Promise<string> {
  type FetchResponse = Awaited<ReturnType<typeof fetch>>;
  let response: FetchResponse;

  try {
    response = await fetch(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch "${input}" while calculating SHA-256: ${message}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to download "${input}" (status ${response.status})`);
  }

  if (!response.body) {
    throw new Error(`Response for "${input}" does not contain a readable body.`);
  }

  const stream = Readable.fromWeb(response.body as unknown as WebReadableStream<Uint8Array>);

  try {
    return await digestStream(stream);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to calculate SHA-256 for remote resource "${input}": ${message}`);
  }
}

export async function sha256(resource: string): Promise<string> {
  if (isHttpUrl(resource)) {
    return sha256FromUrl(resource);
  }

  return sha256FromFile(resource);
}

function isHttpUrl(resource: string): boolean {
  try {
    const { protocol } = new URL(resource);
    return SUPPORTED_PROTOCOLS.has(protocol);
  } catch (_error) {
    return false;
  }
}
