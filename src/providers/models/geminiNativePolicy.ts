/** Native-worker policy: only the host broker may receive effects.
 * Not a replacement for process isolation or the broker's own authorization.
 * Keep separate from the planner's deny-everything policy.
 */
export const geminiNativeBrokerPolicy = `[[rule]]
toolName = "*"
decision = "deny"
priority = 998

[[rule]]
toolName = "*"
mcpName = "*"
decision = "deny"
priority = 998

[[rule]]
toolName = "dispatch"
mcpName = "agentforge-broker"
decision = "allow"
priority = 999
`;
