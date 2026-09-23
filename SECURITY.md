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
- **Web/API Identity Boundary**: This vNext build is a localhost, single-user development control plane with no Web/API login or authenticated user identity. Host and Origin checks are local-request protections, not authentication. Although `AGENTFORGE_HOST` can override the bind address, do not expose the service to a LAN, reverse proxy, or the internet; this build has not established the authentication, authorization, TLS, session, and audit controls needed for remote multi-user use.
- **Secret Handling**: Do not commit credentials or include them in fixtures or reports. Complete secret-provider isolation and end-to-end export/log redaction have not been verified; do not treat secret isolation as a universal guarantee.
- **Package Review**: A package manifest and permission declaration are not a runtime sandbox. `pack inspect-archive` validates ZIP headers, applies bounded in-memory decompression, checks CRCs, and compares the file inventory without writing files. It does not install, authenticate publishers, or isolate execution; review and test those paths before treating a package as safe to run.
