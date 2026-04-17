import { isRepositoryUrlValid } from '../../server/routes/chainProjectRoutes';

describe('repo onboarding URL validation', () => {
  it('accepts HTTPS and SSH repository URLs', () => {
    expect(isRepositoryUrlValid('https://github.com/org/repo.git')).toBe(true);
    expect(isRepositoryUrlValid('http://gitlab.local/group/repo')).toBe(true);
    expect(isRepositoryUrlValid('git@github.com:org/repo.git')).toBe(true);
  });

  it('rejects non-repository paths', () => {
    expect(isRepositoryUrlValid('/Users/me/project')).toBe(false);
    expect(isRepositoryUrlValid('')).toBe(false);
  });
});

