# Repository Guidelines

Welcome! This concise guide describes the conventions we follow for
contributing to the **HashNHedge** codebase.

## Project Structure & Module Organization
```
hashnhedge-consolidated/
├─ src/            # Core source (if any)
├─ api/            # Express backend (routes, controllers, middleware)
├─ tests/          # Test suite mirroring the source layout
├─ assets/         # Static files (images, docs, etc.)
├─ css/            # Stylesheets
├─ js/             # Front‑end JavaScript
└─ README.md
```
* New backend code lives under **api/**, following the existing
  `controllers/`, `routes/`, and `middleware/` layout.
* Add tests under **tests/** mirroring the path of the code they
  verify (e.g. `api/server.js` → `tests/api/server.test.js`).

## Build, Test, and Development Commands
| Command | Description |
|---------|-------------|
| `npm install` | Install Node dependencies. |
| `npm run build` | Run Prisma generation and any build steps. |
| `npm test` | Execute the Jest test suite. |
| `make lint` | Run ESLint/flake8 linting. |
| `make dev` | Start the development server with hot‑reload. |

## Coding Style & Naming Conventions
* **Indentation:** 2 spaces for JavaScript/TypeScript, 4 spaces for Python.
* **Line length:** ≤ 120 characters.
* **Naming:** `camelCase` for variables/functions, `PascalCase` for classes,
  `snake_case` for Python modules.
* **Linting:** `eslint` for JS/TS, `flake8` for Python. CI enforces the
  rules.

## Testing Guidelines
* **Frameworks:** Jest for JavaScript, pytest for Python.
* **Coverage:** Aim for ≥ 80 % line coverage.
* **Naming:** Test files end with `.test.js` or `test_*.py`.
* Run tests with `npm test` (JS) or `pytest` (Python).

## Commit & Pull Request Guidelines
* **Commit messages:** Conventional Commits – e.g. `feat(api): add JWT auth`. 
* **PR description:** Summarize the change, reference issues (`Fixes #123`),
  and include screenshots if UI is affected.
* **Review process:** At least one approving review and all CI checks must
  pass before merging.

---

Feel free to open an issue for any clarification.

