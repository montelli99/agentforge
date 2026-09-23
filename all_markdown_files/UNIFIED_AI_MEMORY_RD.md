# AgentForge — Unified AI Memory R&D
### Architectural Research Document: Commodity PC / 32GB Mini-PC Local AI Workload Optimization

> **Status:** Future R&D Concept (Section 37 of Master Specification). Preserved for dedicated hardware investigation; non-blocking for v0.1 core platform release.

---

## 1. Executive Summary & Problem Statement

Modern frontier AI models require substantial memory bandwidth and VRAM. Commodity desktop PCs and 32GB mini-PCs (such as AMD Ryzen APUs with Radeon 780M/890M, Intel Core Ultra with Arc iGPUs, or Apple Silicon unified architectures) offer high aggregate system RAM (32GB–64GB) at low cost, but standard LLM runtimes either:
1. Fail to allocate models exceeding dedicated VRAM limits (OOM crashes).
2. Thrash system swap when KV caches expand.
3. Waste memory through redundant context duplication across multiple concurrent local agents.

The **AgentForge Unified AI Memory Architecture** investigates runtime memory management that intelligently pools, budgets, and pages system RAM across local generative models, decision classifiers, and agent contexts.

---

## 2. Core Architectural Pillars

### 2.1 Shared iGPU Memory & Dynamic RAM Allocation
- **UMA (Unified Memory Architecture)**: On modern APUs/SoCs, system RAM is physically shared between the CPU and GPU.
- **Dynamic GTT/VRAM Sizing**: Instead of fixing BIOS VRAM allocation at 4GB or 8GB, leverage OS-level graphics memory virtualization (Vulkan memory allocator / DirectX memory budget / Linux drm/amdgpu driver) to allocate up to 80% of system RAM (e.g., 25GB out of 32GB) dynamically when inference begins.

### 2.2 Layered Memory Budgeting
```
+--------------------------------------------------------------------------+
|                       TOTAL SYSTEM RAM (32 GB)                           |
+--------------------------------------------------------------------------+
| OS & AgentForge Core   |  Weights Cache   |   KV Cache    | Context Swaps|
| (4 GB Reserved)        |  (16 GB GGUF)    |   (8 GB Paged)| (4 GB Head)  |
+--------------------------------------------------------------------------+
```
- **OS & Execution Guardrails**: 4 GB reserved strictly for OS background tasks, Git worktrees, and compilation processes.
- **Quantized Weight Buffers**: Models loaded in 4-bit (GGUF Q4_K_M / Q8_0) with memory-mapped (`mmap`) weights to allow zero-copy sharing across processes.
- **Paged KV Cache**: Dynamic chunked KV allocation (similar to vLLM PagedAttention) preventing contiguous allocation fragmentation.

### 2.3 Tiered Tensor Placement
- **Hybrid Compute Pipeline**:
  - Attention layers and compute-heavy matrix multiplications mapped to iGPU / NPU compute units via Vulkan / DirectML / ROCm / oneAPI.
  - Non-critical feed-forward or embeddings layers evaluated on multi-core CPU SIMD (AVX-512 / AVX2).
  - Offload inactive agent models to compressed RAM (ZRAM/lz4) or fast NVMe buffers with sub-100ms reload times.

### 2.4 Predictive Paging & Memory Pressure Handling
- **Agent Activation Anticipation**: When the `ModelRouter` or `JevDecisionProvider` predicts an incoming coding task requiring Tier 3 (33B model), start asynchronous background warm-up of tensor weights while Tier 1 is parsing the intent.
- **Proactive KV Eviction**: Evict attention tokens outside the contract's sliding window or compress historical messages into dense semantic embeddings stored in SQLite/disk.

---

## 3. Supported & Targeted Compute Backends

| Backend | Hardware Target | Status / Strategy |
|---|---|---|
| **Vulkan Kompute / llama.cpp** | Cross-platform (AMD, Intel, Nvidia, Qualcomm) | Primary local fallback for commodity Windows/Linux systems |
| **DirectML** | Windows 11 on AMD Radeon / Intel Arc / Qualcomm Snapdragon | Native Windows GPU hardware acceleration without proprietary CUDA locks |
| **oneAPI / Level Zero** | Intel Core Ultra / Arc Discrete GPUs | Optimized SYCL kernels for Intel XMX matrix engines |
| **ROCm / HIP** | AMD Radeon 7000/8000 series & Ryzen AI APUs | High-throughput Linux inference stack |
| **Metal** | Apple M-series chips | Native Unified Memory gold standard reference |

---

## 4. Benchmark & Validation Methodology

The future 32GB mini-PC testbed will measure:
1. **Time to First Token (TTFT)** under 70% and 90% memory saturation.
2. **Tokens per Second (TPS)** across concurrent agent executions.
3. **KV Cache Thrash Resistance**: Sustaining 16k context without triggering OS swap.
4. **Context Switching Latency**: Time to switch active weights between Tier 2 (8B) and Tier 3 (33B) within shared RAM.

---

## 5. Summary & Relation to AgentForge Control Plane

The Unified AI Memory layer is an execution provider candidate (`ComputeProvider` / `StorageProvider`). It will plug into AgentForge through standard interfaces without altering the canonical workspace, execution contracts, or approval state machines.
