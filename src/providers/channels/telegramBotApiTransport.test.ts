import { describe, expect, it, vi } from "vitest";
import { TelegramBotApiTransport, type TelegramBotUpdate } from "./telegramBotApiTransport.js";

const token = "123456:ABCDEFGHIJKLMNOPQRST";

describe("TelegramBotApiTransport", () => {
  it("allows a loopback API endpoint for deterministic self-hosted acceptance", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const transport = new TelegramBotApiTransport({ token, apiBaseUrl: "http://127.0.0.1:4311", onUpdate: async () => undefined, fetchImpl });
    await expect(transport.sendMessage(7, "hello")).resolves.toBe(42);
    expect(calls[0]).toBe("http://127.0.0.1:4311/bot123456:ABCDEFGHIJKLMNOPQRST/sendMessage");
  });

  it("rejects non-HTTPS remote API endpoints", () => {
    expect(() => new TelegramBotApiTransport({ token, apiBaseUrl: "http://telegram.example", onUpdate: async () => undefined })).toThrow(/HTTPS/);
  });

  it("requests callback updates and stops an in-flight long poll promptly", async () => {
    let pollSignal: AbortSignal | undefined;
    const transport = new TelegramBotApiTransport({
      token,
      pollTimeoutSeconds: 50,
      fetchImpl: async (input, init) => {
        const url = String(input);
        if (url.endsWith("/getWebhookInfo")) {
          return new Response(JSON.stringify({ ok: true, result: { url: "" } }), { status: 200 });
        }
        pollSignal = init?.signal as AbortSignal | undefined;
        return await new Promise<Response>((_resolve, reject) => {
          pollSignal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
        });
      },
      onUpdate: async () => undefined,
    });
    await transport.start();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(pollSignal).toBeDefined();
    expect(transport.isHealthy()).toBe(false);
    transport.stop();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(pollSignal?.aborted).toBe(true);
    expect(transport.isRunning()).toBe(false);
    expect(transport.isHealthy()).toBe(false);
  });

  it("does not report a competing poller as a live Telegram connection", async () => {
    let polled = false;
    const transport = new TelegramBotApiTransport({ token, pollTimeoutSeconds: 0,
      fetchImpl: async input => {
        if (String(input).endsWith("/getWebhookInfo")) {
          return new Response(JSON.stringify({ ok: true, result: { url: "" } }), { status: 200 });
        }
        polled = true;
        return new Response("conflict", { status: 409 });
      },
      onUpdate: async () => undefined,
    });
    await transport.start();
    for (let attempt = 0; attempt < 10 && !transport.getLastPollFailure(); attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    expect(polled).toBe(true);
    expect(transport.getLastPollFailure()).toBe("conflict");
    expect(transport.isHealthy()).toBe(false);
    transport.stop();
  });

  it("delivers BotFather callback-button updates without advancing past a failed handler", async () => {
    const received: TelegramBotUpdate[] = [];
    let polls = 0;
    let releasePoll: (() => void) | undefined;
    const transport = new TelegramBotApiTransport({
      token,
      fetchImpl: async (input, init) => {
        const url = String(input);
        if (url.endsWith("/getWebhookInfo")) return new Response(JSON.stringify({ ok: true, result: { url: "" } }), { status: 200 });
        polls += 1;
        if (polls === 1) {
          expect(JSON.parse(String(init?.body))).toMatchObject({ allowed_updates: ["message", "callback_query"] });
          return new Response(JSON.stringify({ ok: true, result: [{ update_id: 8, callback_query: { id: "cb-1", from: { id: 7 }, data: "approve:task-1", message: { message_id: 9, chat: { id: 10 } } } }] }), { status: 200 });
        }
        return await new Promise<Response>(resolve => { releasePoll = () => resolve(new Response(JSON.stringify({ ok: true, result: [] }), { status: 200 })); });
      },
      onUpdate: async update => { received.push(update); },
    });
    await transport.start();
    for (let attempt = 0; attempt < 10 && received.length === 0; attempt += 1) await new Promise(resolve => setTimeout(resolve, 0));
    expect(received[0]?.callback_query?.data).toBe("approve:task-1");
    transport.stop();
    releasePoll?.();
  });

  it("keeps malformed or unsupported updates outside the application handler", async () => {
    const received: TelegramBotUpdate[] = [];
    let calls = 0;
    const transport = new TelegramBotApiTransport({
      token,
      pollTimeoutSeconds: 0,
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.endsWith("/getWebhookInfo")) return new Response(JSON.stringify({ ok: true, result: { url: "" } }), { status: 200 });
        calls += 1;
        if (calls === 1) {
          return new Response(JSON.stringify({ ok: true, result: [{ update_id: 4, edited_message: { ignored: true } }] }), { status: 200 });
        }
        return await new Promise<Response>(() => undefined);
      },
      onUpdate: async update => { received.push(update); },
    });
    await transport.start();
    for (let attempt = 0; attempt < 10 && calls < 2; attempt += 1) await new Promise(resolve => setTimeout(resolve, 0));
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(received).toEqual([]);
    transport.stop();
  });
});
