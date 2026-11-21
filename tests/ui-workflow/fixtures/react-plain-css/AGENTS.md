# Fixture agent rules
- Runtime dependencies are react and react-dom only. Do not add a framework or a package.
- The page loads nothing from outside its origin (CSP default-src 'self'): no CDN, no web fonts.
- Tests run only in the pinned container: `scripts/test.sh`.
