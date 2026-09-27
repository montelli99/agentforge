import { describe, expect, it } from "vitest";
import { SlackMirrorProvider } from "./slackMirror.js";

describe("Slack mirror provider", () => {
  it("normalizes inbound events without requiring a live Slack account", async () => {
    const provider = new SlackMirrorProvider();
    const events: string[] = [];
    provider.onEvent(async event => { events.push(`${event.provider}:${event.eventType}:${event.payload.text}`); });
    await provider.ingestEvent({ eventId: "evt-1", teamId: "team-test", channelId: "chan-test", userId: "user-test", text: "hello" });
    expect(events).toEqual(["slack:message:hello"]);
  });

  it("records outbound messages only in the sandbox adapter", async () => {
    const provider = new SlackMirrorProvider();
    const sent = await provider.sendMessage({ canonicalChannelId: "chan-test", text: "test" });
    expect(sent.externalMessageId).toMatch(/^slack-msg-/);
    expect(provider.getSentMessages()).toHaveLength(1);
  });

  it("reports the adapter boundary instead of implying live Slack connectivity", () => {
    const readiness = new SlackMirrorProvider().readiness();
    expect(readiness.status).toBe("sandbox");
    expect(readiness.missing).toContain("live provider acceptance");
  });
});
