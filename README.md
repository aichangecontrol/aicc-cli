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

If installed globally or linked, use the `aicc` command:

```bash
aicc validate ../aicc-spec/examples/minimal.yaml
aicc plan ../aicc-spec/examples/minimal.yaml
```

## Plan examples

```bash
aicc plan spec.yaml
aicc plan spec.yaml --json
aicc plan spec.yaml --base origin/main
```

## Exit codes

Validate:
- `0` valid
- `1` invalid spec
- `2` internal error

Plan:
- `0` plan computed, no violations
- `1` plan computed, violations found
- `2` spec invalid or environment error (missing git, bad refs)

## Examples

Validate a spec:

```bash
node dist/index.js validate ../aicc-spec/examples/pr_safe_change.yaml
```

Generate a plan summary:

```bash
node dist/index.js plan ../aicc-spec/examples/migration_requires_approval.yaml
```

## Relationship to aicc-spec

This CLI validates against `../aicc-spec/schema.json` and enforces the semantic
rules documented in `../aicc-spec/spec.md`.
