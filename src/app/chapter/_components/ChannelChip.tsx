// Channel chip + path renderer (ported from primitives.jsx).

import React from "react";
import { CHANNELS, ChannelKey } from "./mockdata";

export function ChannelChip({ ch, bare = false }: { ch: ChannelKey; bare?: boolean }) {
  const c = CHANNELS[ch];
  if (!c) return null;
  return (
    <span className={`cchip ${bare ? "bare" : ""}`}>
      <span className="dot" style={{ background: c.color }}></span>
      {c.name}
    </span>
  );
}

export type PathMode = "set" | "collapsed" | "raw";

export function PathRender({
  channels, mode = "set", gaps,
}: {
  channels: ChannelKey[]; mode?: PathMode; gaps?: number[];
}) {
  if (mode === "set") {
    return (
      <span className="path-seq">
        {channels.map((c, i) => (
          <React.Fragment key={i}>
            <ChannelChip ch={c} />
            {i < channels.length - 1 && <span style={{ color: "var(--ink-4)", fontSize: 11 }}>+</span>}
          </React.Fragment>
        ))}
      </span>
    );
  }
  if (mode === "collapsed") {
    return (
      <span className="path-seq">
        {channels.map((c, i) => (
          <React.Fragment key={i}>
            <ChannelChip ch={c} />
            {i < channels.length - 1 && (
              <>
                <span className="arrow">→</span>
                {gaps && gaps[i] > 0 && <span className="gap">{gaps[i]} steps</span>}
                {gaps && gaps[i] > 0 && <span className="arrow">→</span>}
              </>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  }
  return (
    <span className="path-seq">
      {channels.map((c, i) => (
        <React.Fragment key={i}>
          <ChannelChip ch={c} />
          {i < channels.length - 1 && <span className="arrow">→</span>}
        </React.Fragment>
      ))}
    </span>
  );
}
