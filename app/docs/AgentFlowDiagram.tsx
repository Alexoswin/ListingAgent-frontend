type Pt = readonly [number, number];
type Tone = "a" | "b" | "ok" | "bad";
type Writer = "fetch" | "A" | "B";

const PANEL_TOP = 200;
const PANEL_H = 416;
const PASS_W = 236;
const INNER_W = 212;

const MARKER: Record<"muted" | Tone, string> = {
  muted: "flow-mk",
  a: "flow-mk-a",
  b: "flow-mk-b",
  ok: "flow-mk-ok",
  bad: "flow-mk-bad",
};

const polyline = (points: readonly Pt[]) =>
  points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");

function Edge({ points, tone, dashed = false, arrow = true }: { points: readonly Pt[]; tone?: Tone; dashed?: boolean; arrow?: boolean }) {
  const className = ["edge", tone && `edge-${tone}`, dashed && "dashed"].filter(Boolean).join(" ");
  return <path d={polyline(points)} className={className} markerEnd={arrow ? `url(#${MARKER[tone ?? "muted"]})` : undefined} />;
}

function Label({ x, y, text, anchor = "start", mono = false }: { x: number; y: number; text: string; anchor?: "start" | "middle" | "end"; mono?: boolean }) {
  return <text x={x} y={y} fontSize={9} textAnchor={anchor} className={mono ? "lbl mono" : "lbl"}>{text}</text>;
}

function Box({ x, y, w, h, title, sub = [], mono = false, className = "" }: { x: number; y: number; w: number; h: number; title: string; sub?: readonly string[]; mono?: boolean; className?: string }) {
  const baseline = y + (h - (11 + 15 * sub.length)) / 2 + 9;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} className={`box ${className}`} />
      <text x={x + 12} y={baseline} fontSize={mono ? 10.5 : 11} className={mono ? "strong mono" : "strong"}>{title}</text>
      {sub.map((text, i) => (
        <text key={text} x={x + 12} y={baseline + 15 * (i + 1)} fontSize={9.5} className="muted">{text}</text>
      ))}
    </g>
  );
}

function Panel({ x, w, title, sub, tone }: { x: number; w: number; title: string; sub: string; tone: "neutral" | Tone }) {
  return (
    <g>
      <rect x={x} y={PANEL_TOP} width={w} height={PANEL_H} rx={10} className={`panel panel-${tone}`} />
      <text x={x + 12} y={PANEL_TOP + 22} fontSize={12.5} className={tone === "neutral" ? "strong" : `strong t-${tone}`}>{title}</text>
      <text x={x + 12} y={PANEL_TOP + 38} fontSize={10} className="muted">{sub}</text>
    </g>
  );
}

function Outcome({ x, y, w, title, sub, tone }: { x: number; y: number; w: number; title: string; sub: string; tone: Tone }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={38} rx={5} className={`box stroke-${tone}`} />
      <text x={x + w / 2} y={y + 16} fontSize={9.5} textAnchor="middle" className={`strong t-${tone}`}>{title}</text>
      <text x={x + w / 2} y={y + 29} fontSize={8.5} textAnchor="middle" className="muted">{sub}</text>
    </g>
  );
}

/** Both passes share one shape: a model turn, a tool loop, and the ways the pass can end. */
function Pass({ x, tone, title, sub, turn, tools, outcomes }: {
  x: number;
  tone: Tone;
  title: string;
  sub: string;
  turn: string;
  tools: readonly (readonly [string, string])[];
  outcomes: readonly { title: string; sub: string; tone: Tone }[];
}) {
  const inner = x + 12;
  const center = x + PASS_W / 2;
  const gap = outcomes.length > 2 ? 10 : 12;
  const width = (INNER_W - gap * (outcomes.length - 1)) / outcomes.length;

  return (
    <g>
      <Panel x={x} w={PASS_W} title={title} sub={sub} tone={tone} />
      <Box x={inner} y={254} w={INNER_W} h={44} title="Model turn" sub={[turn]} />
      <Edge points={[[inner + 60, 298], [inner + 60, 324]]} />
      <Edge points={[[inner + 152, 324], [inner + 152, 298]]} />
      <Label x={inner + 67} y={315} text="calls" />
      <Label x={inner + 145} y={315} text="results" anchor="end" />

      <rect x={inner} y={324} width={INNER_W} height={178} rx={8} className="box-soft" />
      {tools.map(([name, note], i) => (
        <Box key={name} x={inner + 10} y={334 + i * 56} w={192} h={46} title={name} sub={[note]} mono />
      ))}

      <Edge points={[[center, 502], [center, 512]]} arrow={false} />
      {outcomes.map((outcome, i) => {
        const left = inner + i * (width + gap);
        const mid = left + width / 2;
        return (
          <g key={outcome.title}>
            <Edge points={[[center, 512], [mid, 512], [mid, 522]]} />
            <Outcome x={left} y={522} w={width} {...outcome} />
          </g>
        );
      })}
    </g>
  );
}

const CHIP_W: Record<Writer, number> = { fetch: 30, A: 16, B: 16 };

function Chips({ right, baseline, writers }: { right: number; baseline: number; writers: readonly Writer[] }) {
  const placed = writers.reduceRight<{ writer: Writer; x: number }[]>((acc, writer) => {
    const edge = acc.length > 0 ? acc[0].x - 4 : right;
    return [{ writer, x: edge - CHIP_W[writer] }, ...acc];
  }, []);
  return (
    <>
      {placed.map(({ writer, x }) => (
        <g key={writer}>
          <rect x={x} y={baseline - 10} width={CHIP_W[writer]} height={14} rx={3} className={`chip chip-${writer}`} />
          <text x={x + CHIP_W[writer] / 2} y={baseline} fontSize={8.5} textAnchor="middle" className={`strong t-chip-${writer}`}>{writer}</text>
        </g>
      ))}
    </>
  );
}

const CONTEXT_FIELDS: readonly (readonly [string, readonly Writer[]])[] = [
  ["images", ["fetch"]],
  ["analysis", ["A"]],
  ["lookups[]", ["A", "B"]],
  ["draft", ["A"]],
  ["violations", ["A", "B"]],
  ["review", ["B"]],
  ["finished", ["A", "B"]],
  ["usage", ["A", "B"]],
];

const ESCALATIONS: readonly (readonly [string, string])[] = [
  ["!draft", "“No draft was produced.”"],
  ["!review", "“No review was produced.”"],
  ["hasBlocking(violations)", "lists the blocking rule codes"],
  ["contradicted finding", "lists the contradicted claims"],
  ["omissions.length > 0", "lists what the draft left out"],
];

export default function AgentFlowDiagram() {
  return (
    <svg
      className="flow"
      viewBox="0 0 1080 768"
      role="img"
      aria-label="The CLI (through run's worker pool) and POST /listings/generate both call runListing for one listing. It fetches the photos into a shared RunContext, runs Pass A to draft, runs Pass B to verify only if a draft exists, and always ends in assemble, a pure-code gate that can escalate but never publish on its own. The ListingResult goes to MongoDB for HTTP or to output/results.json for the CLI."
    >
      <defs>
        {(Object.keys(MARKER) as (keyof typeof MARKER)[]).map((tone) => (
          <marker key={tone} id={MARKER[tone]} markerWidth={8} markerHeight={8} refX={7} refY={3} orient="auto">
            <path d="M0,0 L0,6 L8,3 z" className={`mk mk-${tone}`} />
          </marker>
        ))}
      </defs>

      {/* Entry points */}
      <Box x={16} y={16} w={204} h={48} title="CLI · run-agent.ts" sub={["npm run agent --only 1,4"]} />
      <Box x={236} y={16} w={204} h={48} title="POST /listings/generate" sub={["AuthGuard · one submission"]} />
      <Box x={16} y={80} w={204} h={40} title="AgentService.run()" sub={["pool of AGENT_CONCURRENCY (3)"]} mono />
      <Box x={236} y={80} w={204} h={40} title="ListingsService.generate()" sub={["saves the result to MongoDB"]} mono />
      <rect x={16} y={140} width={424} height={36} rx={6} className="box box-strong" />
      <text x={28} y={162} fontSize={11} className="strong mono">AgentService.runListing(listing)</text>
      <text x={428} y={162} fontSize={9.5} textAnchor="end" className="muted">one listing → one RunContext</text>
      <Edge points={[[118, 64], [118, 80]]} />
      <Edge points={[[338, 64], [338, 80]]} />
      <Edge points={[[118, 120], [118, 140]]} />
      <Edge points={[[338, 120], [338, 140]]} />
      <Label x={126} y={134} text="each listing" />
      <Label x={346} y={134} text="one listing" />

      {/* External APIs, called from inside both passes */}
      <rect x={586} y={16} width={478} height={104} rx={10} className="panel panel-ext" />
      <text x={600} y={35} fontSize={11} className="strong">External APIs</text>
      <text x={1050} y={35} fontSize={9.5} textAnchor="end" className="muted">called from both passes</text>
      <Box x={600} y={46} w={218} h={60} title="OpenAI API" sub={["each model turn (Agents SDK)", "vision + lookup via generateObject()"]} />
      <g className="off">
        <Box x={832} y={46} w={218} h={60} title="Tavily / Serper · off" sub={["optional search for product_lookup", "no key set → never called"]} />
      </g>
      <Edge points={[[470, PANEL_TOP], [470, 82], [586, 82]]} dashed />
      <Edge points={[[704, PANEL_TOP], [704, 120]]} dashed />
      <Label x={528} y={76} text="calls" anchor="middle" />
      <Label x={712} y={164} text="calls" />

      {/* RunContext: the only channel between tools */}
      <Panel x={16} w={210} title="RunContext" sub="one object per listing" tone="neutral" />
      <Edge points={[[180, 176], [180, 254]]} />
      <Box x={28} y={254} w={186} h={56} title="ImageFetcher.fetchAll" sub={["GET each URL · cached", "drops non-image, < 2 KB"]} mono />
      <Edge points={[[121, 310], [121, 326]]} />
      <Label x={129} y={322} text="images[]" mono />
      <rect x={28} y={326} width={186} height={226} rx={6} className="box" />
      <text x={40} y={343} fontSize={8.5} className="muted caps">field</text>
      <text x={202} y={343} fontSize={8.5} textAnchor="end" className="muted caps">written by</text>
      <line x1={36} y1={350} x2={206} y2={350} className="rule" />
      {CONTEXT_FIELDS.map(([field, writers], i) => (
        <g key={field}>
          <text x={40} y={370 + i * 24} fontSize={10.5} className="mono">{field}</text>
          <Chips right={202} baseline={370 + i * 24} writers={writers} />
        </g>
      ))}
      <text x={28} y={580} fontSize={9.5} className="muted">tools read and write here —</text>
      <text x={28} y={594} fontSize={9.5} className="muted">nothing is retyped by a model</text>

      {/* Pass A */}
      <Edge points={[[214, 276], [266, 276]]} tone="a" />
      <Pass
        x={254}
        tone="a"
        title="Pass A — generate"
        sub="gpt-4.1-mini · ≤ 8 turns · temp 0.2"
        turn="seller JSON + hints · no photos"
        tools={[
          ["analyze_images", "vision · writes analysis"],
          ["product_lookup", "MRP via OpenAI → lookups[]"],
          ["submit_draft", "runs checkDraft() · the exit"],
        ]}
        outcomes={[
          { title: "accepted", sub: "ends pass", tone: "ok" },
          { title: "rejected", sub: "next turn", tone: "b" },
          { title: "3rd miss", sub: "kept · ends", tone: "bad" },
        ]}
      />

      {/* Does Pass B run at all? */}
      <Edge points={[[298, 560], [298, 580], [498, 580]]} />
      <Edge points={[[446, 560], [446, 580]]} arrow={false} />
      <circle cx={446} cy={580} r={2.5} className="dot" />
      <polygon points="538,550 578,580 538,610 498,580" className="box box-strong" />
      <text x={538} y={584} fontSize={10.5} textAnchor="middle" className="strong">draft?</text>
      <Edge points={[[538, 550], [538, 276], [598, 276]]} tone="b" />
      <Label x={546} y={544} text="yes" />
      <Edge points={[[538, 610], [538, 632], [836, 632], [836, 580]]} tone="bad" dashed arrow={false} />
      <Label x={548} y={646} text="no draft — stalled, out of turns, or threw" />

      {/* Pass B */}
      <Pass
        x={586}
        tone="b"
        title="Pass B — verify"
        sub="gpt-4.1 · ≤ 6 turns · fresh context"
        turn="draft + seller JSON + photos"
        tools={[
          ["check_draft", "re-runs checkDraft()"],
          ["product_lookup", "same tool, fresh call"],
          ["submit_review", "sets review · the exit"],
        ]}
        outcomes={[
          { title: "submitted", sub: "review set", tone: "ok" },
          { title: "no review", sub: "6 turns or error", tone: "bad" },
        ]}
      />
      <Edge points={[[648, 560], [648, 580], [836, 580]]} arrow={false} />
      <Edge points={[[760, 560], [760, 580]]} arrow={false} />
      <circle cx={760} cy={580} r={2.5} className="dot" />
      <circle cx={836} cy={580} r={2.5} className="dot" />
      <Edge points={[[836, 580], [836, 274], [862, 274]]} />

      {/* assemble(): the verdict */}
      <Panel x={850} w={214} title="assemble(context)" sub="pure code · no model call" tone="ok" />
      {ESCALATIONS.map(([check, reason], i) => (
        <Box key={check} x={862} y={254 + i * 46} w={190} h={40} title={check} sub={[reason]} mono className="box-warn" />
      ))}
      <rect x={862} y={494} width={190} height={40} rx={6} className="box box-strong" />
      <text x={957} y={510} fontSize={10} textAnchor="middle" className="strong">any reason, or reviewer</text>
      <text x={957} y={524} fontSize={10} textAnchor="middle" className="strong">≠ auto_publish ?</text>
      <Edge points={[[957, 534], [957, 544]]} arrow={false} />
      <Edge points={[[957, 544], [907, 544], [907, 556]]} />
      <Edge points={[[957, 544], [1007, 544], [1007, 556]]} />
      <Label x={930} y={541} text="yes" anchor="middle" />
      <Label x={984} y={541} text="no" anchor="middle" />
      <Outcome x={862} y={556} w={90} title="human review" sub="publish = false" tone="bad" />
      <Outcome x={962} y={556} w={90} title="auto_publish" sub="publish = true" tone="ok" />
      <Edge points={[[907, 594], [907, 606], [1007, 606], [1007, 594]]} arrow={false} />
      <circle cx={957} cy={606} r={2.5} className="dot" />
      <Edge points={[[957, 606], [957, 640]]} />

      {/* Where the result goes */}
      <Box x={850} y={640} w={214} h={40} title="ListingResult" sub={["generated_pdp · review · publish"]} mono />
      <Edge points={[[957, 680], [957, 712]]} />
      <Label x={965} y={700} text="CLI" />
      <Edge points={[[850, 660], [704, 660], [704, 712]]} />
      <Label x={712} y={700} text="HTTP · 503 if no draft" />
      <Box x={586} y={712} w={236} h={44} title="MongoDB" sub={["Listing + Images · publish = verdict"]} />
      <Box x={850} y={712} w={214} h={44} title="output/results.json" sub={["array · one entry per listing"]} mono />
    </svg>
  );
}
