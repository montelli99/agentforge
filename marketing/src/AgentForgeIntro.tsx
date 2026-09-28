import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const AgentForgeIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" });
  const rise = interpolate(frame, [0, 30], [42, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#0d0f17", color: "#f5f3ff", fontFamily: "Arial, sans-serif", justifyContent: "center", padding: 140 }}>
      <div style={{ opacity, transform: `translateY(${rise}px)` }}>
        <div style={{ color: "#b89cff", fontSize: 28, letterSpacing: 8, fontWeight: 700 }}>AGENTFORGE</div>
        <div style={{ fontSize: 92, lineHeight: 1.03, fontWeight: 700, maxWidth: 1180, marginTop: 34 }}>Turn agent work into an accountable operating system.</div>
        <div style={{ color: "#b8b5c5", fontSize: 34, lineHeight: 1.35, maxWidth: 960, marginTop: 36 }}>Memory, workflows, approvals, evidence, and channel control in one open source workspace.</div>
      </div>
    </AbsoluteFill>
  );
};
