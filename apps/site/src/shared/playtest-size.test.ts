import { expect, test } from 'vitest';
import { gunzipBase64, gzipBase64 } from './playtest.ts';

test('stops a compressed snapshot once its decoded bytes exceed the limit', async () => {
  const packed = await gzipBase64('é'.repeat(1024));
  await expect(gunzipBase64(packed, 2048)).resolves.toBe('é'.repeat(1024));
  await expect(gunzipBase64(packed, 2047)).rejects.toThrow(/too large.*Keep the original file/);
});
