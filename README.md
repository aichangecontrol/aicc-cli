# AICC CLI

The AICC CLI validates AI Change Control specs and produces normalized plans.
It is the reference validator for the open AICC specification.

## Install

```bash
npm install
```

## Usage

```bash
npm run build
node dist/index.js validate ../aicc-spec/examples/minimal.yaml
node dist/index.js plan ../aicc-spec/examples/minimal.yaml
```

## Examples

Validate a spec:

```bash
node dist/index.js validate ../aicc-spec/examples/pr_safe_change.yaml
```

Generate a normalized plan:

```bash
node dist/index.js plan ../aicc-spec/examples/migration_requires_approval.yaml
```

## Relationship to aicc-spec

This CLI validates against `../aicc-spec/schema.json` and enforces the semantic
rules documented in `../aicc-spec/spec.md`.
