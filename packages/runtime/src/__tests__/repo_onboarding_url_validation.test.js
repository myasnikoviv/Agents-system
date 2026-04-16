"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chainProjectRoutes_1 = require("../../server/routes/chainProjectRoutes");
describe('repo onboarding URL validation', () => {
    it('accepts HTTPS and SSH repository URLs', () => {
        expect((0, chainProjectRoutes_1.isRepositoryUrlValid)('https://github.com/org/repo.git')).toBe(true);
        expect((0, chainProjectRoutes_1.isRepositoryUrlValid)('http://gitlab.local/group/repo')).toBe(true);
        expect((0, chainProjectRoutes_1.isRepositoryUrlValid)('git@github.com:org/repo.git')).toBe(true);
    });
    it('rejects non-repository paths', () => {
        expect((0, chainProjectRoutes_1.isRepositoryUrlValid)('/Users/me/project')).toBe(false);
        expect((0, chainProjectRoutes_1.isRepositoryUrlValid)('')).toBe(false);
    });
});
