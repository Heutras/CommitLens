import { describe, expect, it } from 'vitest';
import { parseRepoInput } from './parseRepoInput.js';

describe('parseRepoInput', () => {
  it.each([
    ['facebook/react'],
    ['  facebook/react  '],
    ['github.com/facebook/react'],
    ['www.github.com/facebook/react'],
    ['https://github.com/facebook/react'],
    ['http://github.com/facebook/react/'],
    ['https://github.com/facebook/react.git'],
    ['https://github.com/facebook/react/tree/main/packages'],
    ['https://github.com/facebook/react?tab=readme#top'],
    ['HTTPS://GitHub.com/facebook/react'],
  ])('accepts %j', (input) => {
    expect(parseRepoInput(input)).toEqual({
      ok: true,
      owner: 'facebook',
      repo: 'react',
      fullName: 'facebook/react',
    });
  });

  it('keeps names with dots, dashes and underscores', () => {
    expect(parseRepoInput('socketio/socket.io')).toMatchObject({ ok: true, repo: 'socket.io' });
    expect(parseRepoInput('some-org/my_repo-2')).toMatchObject({ ok: true, owner: 'some-org' });
  });

  it.each([
    ['', /Enter a repository/],
    ['   ', /Enter a repository/],
    ['react', /owner\/repository/],
    ['https://github.com/facebook', /owner\/repository/],
    ['https://gitlab.com/facebook/react', /Only github\.com/],
    ['bitbucket.org/facebook/react', /Only github\.com/],
    ['-bad/react', /not a valid GitHub user/],
    ['bad--name/react', /not a valid GitHub user/],
    ['a'.repeat(40) + '/react', /not a valid GitHub user/],
    ['facebook/re act', /not a valid repository/],
    ['facebook/..', /not a valid repository/],
  ])('rejects %j with a helpful message', (input, message) => {
    const result = parseRepoInput(input);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(message);
  });
});
