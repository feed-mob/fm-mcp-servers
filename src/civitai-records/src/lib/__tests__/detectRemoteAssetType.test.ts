import { describe, it } from 'node:test';
import assert from 'node:assert';
import { detectRemoteAssetType } from '../detectRemoteAssetType.js';

describe('detectRemoteAssetType', () => {
  it('should detect image from URL extension (fallback)', async () => {
    const result = await detectRemoteAssetType(
      'https://example.com/photo.jpg',
      { skipRemote: true } // Force fallback to URL-based detection
    );
    
    assert.strictEqual(result.assetType, 'image');
    assert.strictEqual(result.ext, 'jpg');
    assert.strictEqual(result.from, 'extension');
  });

  it('should detect video from URL extension (fallback)', async () => {
    const result = await detectRemoteAssetType(
      'https://example.com/video.mp4',
      { skipRemote: true }
    );
    
    assert.strictEqual(result.assetType, 'video');
    assert.strictEqual(result.ext, 'mp4');
    assert.strictEqual(result.from, 'extension');
  });

  it('should detect image from CDN path pattern (fallback)', async () => {
    const result = await detectRemoteAssetType(
      'https://cdn.example.com/images/abc123',
      { skipRemote: true }
    );
    
    assert.strictEqual(result.assetType, 'image');
    assert.strictEqual(result.from, 'extension');
  });

  it('should detect video from CDN path pattern (fallback)', async () => {
    const result = await detectRemoteAssetType(
      'https://cdn.example.com/videos/xyz789',
      { skipRemote: true }
    );
    
    assert.strictEqual(result.assetType, 'video');
    assert.strictEqual(result.from, 'extension');
  });

  it('should return null for unknown URL (fallback)', async () => {
    const result = await detectRemoteAssetType(
      'https://example.com/unknown',
      { skipRemote: true }
    );
    
    assert.strictEqual(result.assetType, null);
    assert.strictEqual(result.from, 'fallback');
  });

  it('should handle various image extensions', async () => {
    const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    
    for (const ext of extensions) {
      const result = await detectRemoteAssetType(
        `https://example.com/file.${ext}`,
        { skipRemote: true }
      );
      
      assert.strictEqual(result.assetType, 'image', `Failed for .${ext}`);
      assert.strictEqual(result.ext, ext);
    }
  });

  it('should handle various video extensions', async () => {
    const extensions = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
    
    for (const ext of extensions) {
      const result = await detectRemoteAssetType(
        `https://example.com/file.${ext}`,
        { skipRemote: true }
      );
      
      assert.strictEqual(result.assetType, 'video', `Failed for .${ext}`);
      assert.strictEqual(result.ext, ext);
    }
  });
});
