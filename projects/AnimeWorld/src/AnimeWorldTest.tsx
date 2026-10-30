import { AbsoluteFill } from "remotion";
import { RealSpinePlayer } from "./spine/RealSpinePlayer";

export const AnimeWorldTest: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f0f1a",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 550,
          top: 130,
          width: 820,
          height: 820,
        }}
      >
        <RealSpinePlayer size={820} />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 24,
          width: "100%",
          textAlign: "center",
          color: "#8a8a9a",
          fontSize: 22,
          fontFamily: "sans-serif",
        }}
      >
        AnimeWorld skeleton smoke test
      </div>
    </AbsoluteFill>
  );
};
