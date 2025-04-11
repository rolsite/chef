import { describe, expect, test } from 'vitest';
import type { Message } from '@ai-sdk/react';
import { serializeMessageForConvex } from './useStoreMessageHistory';

describe('serializeMessageForConvex', () => {
  test('removes file content from bolt actions while preserving tags', () => {
    debugger;
    const message: Message = {
      id: 'test',
      role: 'user',
      content: '',
      parts: [
        {
          type: 'text',
          text: 'Here is a file:\n<boltArtifact id="some-app" title="Some App"><boltAction type="file" filePath="test.ts">\nconst x = 1;\n</boltAction></boltArtifact>\nAnd some more text',
        },
      ],
      createdAt: new Date(),
    };

    const serialized = serializeMessageForConvex(message);

    expect(serialized.parts?.[0]).toEqual({
      type: 'text',
      text: 'Here is a file:\n<boltArtifact id="some-app" title="Some App"><boltAction type="file" filePath="test.ts"></boltAction></boltArtifact>\nAnd some more text',
    });
  });

  test('preserves non-text parts', () => {
    const message: Message = {
      id: 'test',
      role: 'user',
      content: '',
      parts: [
        {
          type: 'text',
          text: 'some content',
        },
      ],
      createdAt: new Date(),
    };

    const serialized = serializeMessageForConvex(message);

    expect(serialized.parts?.[0]).toEqual({
      type: 'text',
      text: 'some content',
    });
  });
});
