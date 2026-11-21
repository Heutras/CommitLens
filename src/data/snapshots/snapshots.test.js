import { describe, expect, it } from 'vitest';
import { EXAMPLE_REPOSITORIES } from '../exampleRepositories.js';
import { defaultExample, examples, findExample } from './index.js';

const SECTIONS = ['repository', 'languages', 'contributors', 'commitActivity', 'commits'];

describe('example snapshots', () => {
  it('has one snapshot per example, in display order, with vitejs/vite first', () => {
    expect(examples.map((example) => example.fullName)).toEqual(
      EXAMPLE_REPOSITORIES.map((entry) => entry.fullName),
    );
    expect(defaultExample.fullName).toBe('vitejs/vite');
  });

  it.each(EXAMPLE_REPOSITORIES.map((entry) => [entry.fullName]))(
    '%s has a capture date and either data or a recorded error for every section',
    (fullName) => {
      const example = findExample(fullName);
      expect(Number.isNaN(Date.parse(example.capturedAt))).toBe(false);
      for (const key of SECTIONS) {
        const record = example.sections[key];
        expect('data' in record || 'error' in record, `${fullName} ${key}`).toBe(true);
        if ('error' in record) expect(record.error.kind).toEqual(expect.any(String));
      }
      expect(example.sections.repository.data.fullName.toLowerCase()).toBe(fullName.toLowerCase());
    },
  );

  it('keeps the default example complete, because the landing illustrations use it', () => {
    for (const key of SECTIONS) expect(defaultExample.sections[key]).toHaveProperty('data');
  });

  it('finds examples case-insensitively', () => {
    expect(findExample('VITEJS/Vite')).toBe(defaultExample);
    expect(findExample('acme/rocket')).toBeNull();
  });
});
