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
- Submit reports to the repository maintainers via GitHub Private Vulnerability Reporting or contact:
  `security@agentforge.dev` *(Placeholder: routed to workspace maintainers)*.

Please provide:
1. Clear description of the vulnerability and attack vector.
2. Steps to reproduce or proof-of-concept payload.
3. Impact assessment (e.g. filesystem escape, unauthorized external message).

We will acknowledge receipt within 48 hours and coordinate disclosure after a patch is verified.

---

## 3. Core Security Principles

- **Sub-Model Execution Boundaries**: All side-effecting operations (file modifications, shell commands, external API requests, git force pushes) are vetoed by the `ContractEnforcer` below the LLM layer.
- **Localhost Default**: The AgentForge Web UI and REST API default to `127.0.0.1` binding to prevent unauthorized exposure over local networks.
- **Secret Isolation**: Secrets (API keys, bot tokens, passwords) are managed exclusively by `SecretProvider` and never written to workspace state files, logs, or migration bundles.
- **Declarative Package Sandboxing**: Marketplace packages cannot declare postinstall scripts or binaries, cannot exceed workspace boundaries, and cannot grant themselves privileges denied by the workspace owner.
