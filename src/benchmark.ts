import { SemanticMemory } from "./semanticMemory.js";
import { MemoryContextOptimizer } from "./memoryContextOptimizer.js";
import { RealEmbeddingProvider } from "./embeddingAdapter.js";

function generateRepoContext(fileCount: number): string {
  const files: string[] = [];
  for (let i = 0; i < fileCount; i++) {
    files.push(`
// File: src/components/component${i}.tsx
import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Component${i}Props {
  id: string;
  initialData?: any;
  onSave?: (data: FormData) => void;
  onError?: (error: Error) => void;
}

export function Component${i}({ id, initialData, onSave, onError }: Component${i}Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const { data, error, refetch } = useQuery({
    queryKey: ['component${i}', id],
    queryFn: async () => {
      const response = await fetch(\`/api/component${i}/\${id}\`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(\`/api/component${i}/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to save');
      return response.json();
    },
    onSuccess: (data) => {
      onSave?.(data);
      refetch();
    },
    onError: (error) => {
      onError?.(error as Error);
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      name: '',
      email: '',
      message: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await mutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return <div>Error loading component${i}</div>;
  }

  return (
    <div className="component-container">
      <h2>Component ${i}</h2>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <input {...form.register('name')} placeholder="Name" />
        <input {...form.register('email')} placeholder="Email" />
        <textarea {...form.register('message')} placeholder="Message" />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}
`);
  }
  return files.join('\n');
}

function generateConversationHistory(turns: number): string {
  const messages: string[] = [];
  const topics = [
    "How do I implement authentication?",
    "Can you show me how to use React hooks?",
    "What's the best way to handle state management?",
    "How do I optimize performance?",
    "Can you explain error handling patterns?",
    "How do I set up testing?",
    "What's the proper way to handle forms?",
    "How do I implement routing?",
    "Can you show me database integration?",
    "How do I handle file uploads?",
  ];

  for (let i = 0; i < turns; i++) {
    const topic = topics[i % topics.length];
    messages.push(`User: ${topic}`);
    messages.push(`Assistant: Here's how to ${topic.toLowerCase().replace('?', '')}...\n\n[Detailed technical response with code examples spanning 200-500 tokens]`);
  }

  return messages.join('\n\n');
}

function generateRAGPayload(chunks: number): string {
  const ragChunks: string[] = [];
  for (let i = 0; i < chunks; i++) {
    ragChunks.push(`
[RAG Chunk ${i + 1}]
Source: documentation.md (page ${i + 1})
Relevance: ${(0.95 - i * 0.02).toFixed(2)}

This section covers important concepts about ${['authentication', 'authorization', 'data modeling', 'API design', 'error handling', 'caching', 'performance', 'security'][i % 8]}.

Key points:
1. Always validate input data on both client and server sides
2. Use proper error boundaries and try-catch blocks
3. Implement rate limiting for API endpoints
4. Use database transactions for data consistency
5. Cache frequently accessed data with appropriate TTL
6. Log all security-relevant events for audit trails
7. Use HTTPS everywhere and implement HSTS
8. Regularly rotate secrets and API keys

Code example:
\`\`\`typescript
// Best practice implementation
const config = {
  validateInput: true,
  enableCaching: true,
  cacheTTL: 3600,
  rateLimit: 100,
  logLevel: 'info',
};
\`\`\`
`);
  }
  return ragChunks.join('\n');
}

async function runBenchmark() {
  console.log('=== AgentForge Token Elimination Benchmark ===\n');

  const provider = new RealEmbeddingProvider({ provider: 'none', fallbackToHash: true });
  await provider.initialize();

  const memory = new SemanticMemory(provider, 10000, 0.85);
  const optimizer = new MemoryContextOptimizer({
    memory: memory,
    memoryBypass: true,
    memoryBypassThreshold: 0.92,
    largeContextElimination: true,
  });

  // Benchmark 1: 25k token repo context
  console.log('--- Benchmark 1: 25k Token Repo Context ---');
  const repoContext = generateRepoContext(50);
  const repoTokens = Math.ceil(repoContext.length / 4);
  console.log(`Original: ${repoTokens} tokens`);

  await memory.store({
    prompt: 'Help me understand this codebase',
    response: 'This is a React application with TypeScript, using Next.js, React Query, and Zod for form validation. The codebase follows a component-based architecture with proper error handling and data fetching patterns.',
    tenantId: 'benchmark',
    modelFamily: 'anthropic',
    tokenCount: repoTokens,
  });

  const repoResult1 = optimizer.eliminateLargeContext({
    content: repoContext,
    contentType: 'repo_context',
    tokenCount: repoTokens,
  });
  console.log(`First call - Eliminated: ${repoResult1.eliminated}`);

  const repoResult2 = optimizer.eliminateLargeContext({
    content: repoContext,
    contentType: 'repo_context',
    tokenCount: repoTokens,
  });
  console.log(`Second call - Eliminated: ${repoResult2.eliminated}`);
  console.log(`Tokens saved: ${repoResult2.eliminatedTokens}`);
  console.log(`Optimized: ${repoResult2.eliminatedTokens > 0 ? Math.ceil(repoResult2.replacedWith.length / 4) : repoTokens} tokens\n`);

  // Benchmark 2: 50k token conversation history
  console.log('--- Benchmark 2: 50k Token Conversation History ---');
  const conversation = generateConversationHistory(100);
  const conversationTokens = Math.ceil(conversation.length / 4);
  console.log(`Original: ${conversationTokens} tokens`);

  await memory.store({
    prompt: 'Continue our conversation about the project',
    response: 'Based on our previous discussion, we covered authentication, hooks, state management, performance, error handling, testing, forms, routing, database integration, and file uploads. What would you like to explore next?',
    tenantId: 'benchmark',
    modelFamily: 'anthropic',
    tokenCount: conversationTokens,
  });

  const convResult1 = optimizer.eliminateLargeContext({
    content: conversation,
    contentType: 'conversation_history',
    tokenCount: conversationTokens,
  });
  console.log(`First call - Eliminated: ${convResult1.eliminated}`);

  const convResult2 = optimizer.eliminateLargeContext({
    content: conversation,
    contentType: 'conversation_history',
    tokenCount: conversationTokens,
  });
  console.log(`Second call - Eliminated: ${convResult2.eliminated}`);
  console.log(`Tokens saved: ${convResult2.eliminatedTokens}`);
  console.log(`Optimized: ${convResult2.eliminatedTokens > 0 ? Math.ceil(convResult2.replacedWith.length / 4) : conversationTokens} tokens\n`);

  // Benchmark 3: 10k token RAG payload
  console.log('--- Benchmark 3: 10k Token RAG Payload ---');
  const ragPayload = generateRAGPayload(20);
  const ragTokens = Math.ceil(ragPayload.length / 4);
  console.log(`Original: ${ragTokens} tokens`);

  await memory.store({
    prompt: 'What are the best practices for this project?',
    response: 'Key best practices include: input validation, error boundaries, rate limiting, database transactions, caching with TTL, security logging, HTTPS/HSTS, and secret rotation.',
    tenantId: 'benchmark',
    modelFamily: 'anthropic',
    tokenCount: ragTokens,
  });

  const ragResult1 = optimizer.eliminateLargeContext({
    content: ragPayload,
    contentType: 'rag_context',
    tokenCount: ragTokens,
  });
  console.log(`First call - Eliminated: ${ragResult1.eliminated}`);

  const ragResult2 = optimizer.eliminateLargeContext({
    content: ragPayload,
    contentType: 'rag_context',
    tokenCount: ragTokens,
  });
  console.log(`Second call - Eliminated: ${ragResult2.eliminated}`);
  console.log(`Tokens saved: ${ragResult2.eliminatedTokens}`);
  console.log(`Optimized: ${ragResult2.eliminatedTokens > 0 ? Math.ceil(ragResult2.replacedWith.length / 4) : ragTokens} tokens\n`);

  // Benchmark 4: Memory bypass on large prompts
  console.log('--- Benchmark 4: Memory Bypass on Large Prompts ---');
  const largePrompt = `Help me optimize this code:\n\n${generateRepoContext(10)}`;
  const largePromptTokens = Math.ceil(largePrompt.length / 4);
  console.log(`Original prompt: ${largePromptTokens} tokens`);

  const bypassResult = await optimizer.checkBypass({
    prompt: 'Help me optimize this code',
    tenantId: 'benchmark',
    estimatedInputTokens: largePromptTokens + 2000,
    estimatedOutputTokens: 1000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  });
  console.log(`Bypassed: ${bypassResult.bypassed}`);
  console.log(`Tokens avoided: ${bypassResult.tokensAvoided}`);
  console.log(`Cost avoided: $${bypassResult.estimatedCostAvoidedUsd.toFixed(4)}\n`);

  // Summary
  console.log('=== Summary ===');
  const totalTokensSaved = repoResult2.eliminatedTokens + convResult2.eliminatedTokens + ragResult2.eliminatedTokens;
  console.log(`Total tokens eliminated from context: ${totalTokensSaved}`);
  console.log(`Memory bypass tokens avoided: ${bypassResult.tokensAvoided}`);
  console.log(`Grand total tokens prevented: ${totalTokensSaved + bypassResult.tokensAvoided}`);
}

runBenchmark().catch(console.error);
