# AgentForge — Open-Source License Decision Support

**Prepared for:** Project Owner (Montelli)  
**Status:** ADVISORY MATRIX (No license applied without explicit owner decision)  

---

## 1. Overview & Strategic Context

AgentForge is built to be an **open-source, self-hostable AI workforce platform and execution control plane**.
Choosing the right software license directly determines:
- How third parties can use, fork, and embed AgentForge.
- How enterprise users and cloud hosting providers can interact with the software.
- How the marketplace ecosystem (commercial packages, private extensions) can function.
- Protection against cloud hyper-scalers re-hosting AgentForge as a proprietary SaaS without contributing back.

---

## 2. Comprehensive License Comparison Matrix

| Dimension | MIT License | Apache 2.0 | GNU AGPLv3 | Open-Core / BSL 1.1 |
| :--- | :--- | :--- | :--- | :--- |
| **Philosophy** | Maximal permissiveness. Anyone can do anything, including re-packaging as closed-source. | Permissive with explicit patent grant and trademark protections. | Strong copyleft. Guarantees source availability even over network (SaaS). | Source-available; commercial restrictions until converted to open-source. |
| **Patent Protection** | None explicit. | **Strong.** Includes express patent grant and automatic patent retaliation clause. | Express patent grant included. | Varies by commercial license agreement. |
| **Commercial SaaS Protection** | **None.** Cloud providers can host AgentForge as a paid service without sharing modifications or revenue. | **None.** Anyone can host as a commercial service without contributing improvements. | **Maximal.** Anyone hosting AgentForge over a network MUST provide full source code of all modifications. | **High.** Forbids competitive commercial hosting by third parties without a commercial agreement. |
| **Marketplace Package Compatibility** | Seamless. Third-party developers can write proprietary or closed-source packages freely. | Seamless. Independent packages can adopt proprietary, MIT, or commercial terms. | **Complex.** Packaging contracts must be carefully structured to avoid tainting proprietary enterprise plugins. | Clean separation between open core and enterprise marketplace. |
| **Enterprise Adoption Friction** | **Zero friction.** Approved by all corporate legal teams immediately. | **Very low friction.** Widely favored by enterprise IT (Kubernetes, Apache, Android). | **Moderate to High.** Many corporate legal teams forbid AGPL internal usage out of fear of source disclosure. | Moderate. Requires enterprise procurement review. |
| **Contributor Friendly** | High. Standard expectations. | High. Clear Contributor License Agreement (CLA) alignment. | Moderate. Discourages contributors who want their code usable anywhere. | Low. Often perceived as proprietary-in-disguise. |

---

## 3. Detailed Strategic Options

### Option A: Apache 2.0 (Recommended for Community & Ecosystem Growth)
- **Why it fits:**
  - Provides the permissive adoption benefits of MIT while protecting AgentForge contributors with explicit patent grants and trademark clarity.
  - Enables enterprise adoption without legal friction, while allowing third-party marketplace developers to sell proprietary skills/agents.
  - If monetization comes via hosted cloud control planes, consulting, enterprise support, and marketplace curation, Apache 2.0 maximizes developer velocity.

### Option B: GNU AGPLv3 (Recommended for Host Protection)
- **Why it fits:**
  - Prevents AWS, GCP, or competitive startups from taking AgentForge vNext, wrapping it in an auth layer, and selling it as their own proprietary SaaS.
  - Requires any cloud-hosted fork to publish all source modifications.
  - **Tradeoff:** May limit adoption in conservative real estate enterprises whose legal departments have blanket "No AGPL" policies.

### Option C: Dual Licensing (AGPLv3 Core + Commercial Enterprise)
- **Why it fits:**
  - Open-source self-hosters get AGPLv3 for free.
  - Enterprises and third-party redistributors who cannot comply with AGPL buy a commercial license.

---

## 4. Recommendation for Owner

1. **Keep repository currently unlicensed** until you finalize commercial strategy.
2. **If priority is rapid viral adoption + marketplace ecosystem**: Choose **Apache 2.0**.
3. **If priority is preventing cloud re-hosting without partnership**: Choose **AGPL-3.0** (or BSL 1.1).
