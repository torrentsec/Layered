# Reference fixtures

Generated with pythermalcomfort by `scripts/science/generate_fixtures.py`. Tests
import them directly, for example:

```ts
import utci from './__fixtures__/utci.json';
```

Every science module is checked against these vectors within the tolerances in
`docs/science/backlog.md`. Regenerate them only with a recorded reason.
