import { Composition, registerRoot } from "remotion";
import { AgentForgeIntro } from "./AgentForgeIntro";

export const RemotionRoot = () => (
  <Composition
    id="AgentForgeIntro"
    component={AgentForgeIntro}
    durationInFrames={180}
    fps={30}
    width={1920}
    height={1080}
  />
);

registerRoot(RemotionRoot);
