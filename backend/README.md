
---

## Continuous Integration (CI)

This project uses **GitHub Actions** for CI/CD. Every push and pull request to `main` or `develop` runs the following checks:
- Lint (ESLint, fail on error)
- Unit and integration tests
- Full coverage check (90% statements, 70% branches, 80% functions, 90% lines)
- Security audit (fail on high/critical vulnerabilities)
- Coverage upload to Codecov

**How to contribute:**
- Push or PR to `main`/`develop` and wait for CI to pass
- Fix any errors before merging
- See `.github/workflows/ci.yml` for details

---
