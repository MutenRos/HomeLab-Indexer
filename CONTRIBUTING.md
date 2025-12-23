# Contributing to HomeLab Indexer

Thank you for considering contributing to HomeLab Indexer! We appreciate your time and effort.

## Getting Started

1. **Fork the repository** and clone your fork locally
2. **Install dependencies**: `npm install`
3. **Run in development mode**: `npm run dev`
4. **Read the documentation**: Check [README.md](README.md), [FIRST_RUN.md](FIRST_RUN.md), and [docs/](docs/)

## Development Workflow

### Branch Strategy

- `main` - stable, production-ready code (local-first deployment)
- `docker-support` - Docker/Compose setup (optional deployment mode)
- `feature/*` - new features
- `fix/*` - bug fixes
- `docs/*` - documentation updates

### Making Changes

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes following our code standards
3. Write or update tests as needed
4. Run linting and formatting: `npm run lint && npm run format`
5. Test your changes: `npm run test`
6. Commit with clear messages: `git commit -m "feat: add feature X"`
7. Push and open a Pull Request

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style/formatting (no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add service discovery for HTTP endpoints
fix: resolve scanner crash on Windows with Spanish locale
docs: update API documentation for /devices endpoint
```

## Code Standards

### TypeScript

- Use strict mode (`strict: true` in tsconfig.json)
- Prefer explicit types over `any`
- Document public APIs with JSDoc comments
- Follow ESLint rules (see `.eslintrc.json`)

### Formatting

- Use Prettier with project config (`.prettierrc.json`)
- 2-space indentation
- Single quotes for strings
- Semicolons required

### Testing

- Write unit tests for business logic
- Add integration tests for API endpoints
- Aim for >70% code coverage on new features
- Use Jest with TypeScript (`ts-jest`)

## Project Structure

```
apps/
├── api/         # Express REST API
├── ui/          # React dashboard
└── scanner/     # Network scanning service

packages/
└── shared/      # Shared types and DTOs

infra/
└── migrations/  # Database migrations
```

## Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Include tests for new functionality
- Update documentation as needed
- Ensure CI checks pass (lint, test, build)
- Link related issues in PR description

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Search existing issues before creating a new one
- Provide clear reproduction steps for bugs
- Include environment details (OS, Node version, etc.)

## Questions?

Open a discussion or issue on GitHub—we're happy to help!

---

Thank you for contributing to HomeLab Indexer! 🎉
