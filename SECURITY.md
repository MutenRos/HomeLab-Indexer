# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in HomeLab Indexer, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email security concerns to: [your-email@example.com] (or open a private security advisory on GitHub)
3. Provide detailed steps to reproduce the vulnerability
4. Allow reasonable time for a fix before public disclosure

## Security Considerations

HomeLab Indexer is designed for **internal homelab networks only**. It is not intended for public internet exposure.

### Best Practices

- **Network Isolation**: Run on a trusted internal network only
- **Authentication**: Enable `AUTH_ENABLED=true` in production
- **Secrets**: Use strong `AUTH_SECRET_KEY` and never commit `.env` files
- **Database**: Protect `data/indexer.db` with filesystem permissions
- **Updates**: Keep Node.js and dependencies up to date
- **HTTPS**: Use reverse proxy (nginx, Caddy) with HTTPS for UI access

### Known Limitations

- SQLite database is not encrypted at rest
- Basic JWT authentication (no refresh tokens, no rate limiting in MVP)
- No built-in RBAC (role-based access control)
- Scanner runs with privileges to execute `ping` and `arp` commands

## Disclosure Timeline

- Day 0: Vulnerability reported privately
- Day 1-3: Maintainers acknowledge and begin investigation
- Day 7-14: Fix developed and tested
- Day 14-21: Security patch released
- Day 21+: Public disclosure (if applicable)

Thank you for helping keep HomeLab Indexer secure!
