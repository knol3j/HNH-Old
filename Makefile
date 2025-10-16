# Simple project Makefile

# Lint using ESLint – assumes a .eslintrc.json at the repo root
lint:
	@echo "Running ESLint..."
	@npm run lint

# Auto‑fix lint errors where possible
lint-fix:
	@echo "Running ESLint with --fix..."
	@npm run lint -- --fix

# Run tests (Jest)
test:
	@npm test

