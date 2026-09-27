# Security Policy

## 1. Supported Versions

| Version | Supported |
| :--- | :--- |
| `0.1.0-alpha` (vNext) | :white_check_mark: |
| Legacy Prototypes | :x: |

---

## 2. Reporting a Vulnerability

We take the security of AgentForge seriously. If you believe you have found a security vulnerability in AgentForge (e.g. sandbox escape, privilege escalation, secret leakage, or authority bypass):

- **Do NOT open a public GitHub issue.**
- Submit reports through GitHub Private Vulnerability Reporting if it is enabled for the repository. No verified security mailbox is configured here; do not use a placeholder address.

Please provide:
1. Clear description of the vulnerability and attack vector.
2. Steps to reproduce or proof-of-concept payload.
3. Impact assessment (e.g. filesystem escape, unauthorized external message).

Maintainers should acknowledge reports and coordinate disclosure after a patch is verified. No response-time commitment is currently configured.

---

## 3. Core Security Principles

- **Execution Contract Checks**: `ContractEnforcer` implements selected path, authority-flag, command-pattern, and spend checks. It is not a universal enforcement layer for every server, provider, filesystem, or network effect; actions without mediation are outside that guarantee.
- **Localhost Default**: The AgentForge Web UI and REST API default to `127.0.0.1` binding to prevent unauthorized exposure over local networks.
- **Web/API Identity Boundary**: The default control plane binds to `127.0.0.1` for a single local operator. Set `AGENTFORGE_AUTH_STRICT=1` to require an authenticated caller for API routes. In strict mode, a signed-in session, a stored API key, or a valid `AGENTFORGE_API_TOKEN` deployment bearer can establish identity; the deployment bearer represents the local deployment owner and is not a multi-user account system. A non-loopback `AGENTFORGE_HOST` fails to start unless `AGENTFORGE_API_TOKEN` is configured, and API requests must send that token as a bearer credential. Host and Origin checks remain request protections, not authentication. Do not expose the service to a LAN, reverse proxy, or the internet until a deployment has TLS, a reviewed authorization policy, session lifecycle controls, and its own audit/monitoring plan.
- **Secret Handling**: Do not commit credentials or include them in fixtures or reports. Complete secret-provider isolation and end-to-end export/log redaction have not been verified; do not treat secret isolation as a universal guarantee.
- **Package Review**: A package manifest and permission declaration are not a runtime sandbox. `pack inspect-archive` validates ZIP headers, applies bounded in-memory decompression, checks CRCs, and compares the file inventory without writing files. It does not install, authenticate publishers, or isolate execution; review and test those paths before treating a package as safe to run.
