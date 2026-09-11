import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import AgentFlowDiagram from "./AgentFlowDiagram";

export const metadata: Metadata = {
  title: "Docs | Circle",
  description: "How Circle's listing agent turns photos and seller data into a verified marketplace listing.",
};

export default function DocsPage() {
  return (
    <div className="docs-shell theme-light">
      <main className="docs-page">
        <Link className="docs-back" href="/"><ArrowLeft size={16} /> Back to Circle</Link>

        <div className="docs-hero">
          <p className="eyebrow">Engineering docs</p>
          <h1>How the listing agent works</h1>
          <p>
            One agent turns a seller&apos;s photos and raw claims into a marketplace listing, then checks
            its own work against the same photos before anything goes live. This page traces that path:
            where a request enters, what a draft is actually built from, and the rule that decides
            whether a person needs to look at it.
          </p>
        </div>

        <section className="docs-section">
          <h2>One request, start to finish</h2>
          <p>
            Both entry points end at <code>AgentService.runListing()</code>, which handles exactly one
            listing: it fetches the photos, runs a drafting pass and a verification pass, and hands
            everything to <code>assemble()</code> for the verdict. Tools never pass results to each other
            through the model — they share one <code>RunContext</code> per listing.
          </p>

          <figure className="docs-figure">
            <div className="docs-figure-scroll"><AgentFlowDiagram /></div>
            <figcaption>
              The CLI reaches <code>runListing()</code> through <code>run()</code>&apos;s worker pool
              (<code>AGENT_CONCURRENCY</code>, default 3); the HTTP endpoint sends one submission per request.
              The chips in <code>RunContext</code> show which pass writes each field. Pass B only runs when Pass A
              left a draft, and every path — a thrown error included — still ends in <code>assemble()</code>,
              which can escalate a listing the reviewer approved but never publish one it didn&apos;t.
            </figcaption>
          </figure>

          <div className="docs-steps">
            <div className="docs-step"><span>Step 1</span><p><code>ImageFetcher.fetchAll()</code> downloads every URL once, rejects non-images and anything under 2KB, and caches by URL for the process.</p></div>
            <div className="docs-step"><span>Step 2</span><p>Pass A drafts without the photos attached — it sees them only through <code>analyze_images</code> — fixes the seller&apos;s category and subcategory if the photos show otherwise, and self-corrects against <code>checkDraft()</code> up to 3 times.</p></div>
            <div className="docs-step"><span>Step 3</span><p>Pass B gets the finished draft and the raw photos cold, with none of Pass A&apos;s reasoning, so it can contradict it.</p></div>
          </div>
        </section>

        <section className="docs-section">
          <h2>What <code>checkDraft()</code> actually checks</h2>
          <p>
            Every rule here is arithmetic or a string comparison — no model judgement. That&apos;s deliberate: these
            rules can miss a violation, but they can never invent one, and they still hold when a single misleading
            photo fools both passes into agreeing with each other.
          </p>

          <div className="docs-grid">
            <div className="docs-card blocking">
              <h4>Blocking — forces human review</h4>
              <ul>
                <li>No usable image loaded, or an image looks like a stock/catalogue photo</li>
                <li>Zero specifications, or an image-sourced spec citing no image / an unusable one</li>
                <li>A spec traced to a detail vision marked illegible</li>
                <li>A spec-shaped token in the title (&ldquo;16GB&rdquo;) missing from specifications</li>
                <li>Original MRP with no source, or not above the asking price</li>
                <li>A seller-written disclosure the draft never accounts for, or one it invented</li>
                <li>A disclosed defect the draft marks &ldquo;omitted&rdquo;</li>
                <li>&ldquo;Brand New&rdquo;/&ldquo;Like New&rdquo; tier against visible damage or a disclosed defect</li>
                <li>Observed brand in the photos disagreeing with the seller&apos;s claimed brand</li>
                <li>A subcategory that doesn&apos;t belong to the chosen category</li>
              </ul>
            </div>
            <div className="docs-card warning">
              <h4>Warning — logged, doesn&apos;t force escalation</h4>
              <ul>
                <li>A specification with confidence below 0.4</li>
                <li>A spec that cites an image, but vision analysis never reported that detail</li>
                <li>Original MRP sourced from model knowledge rather than a web result — only when the web search fails or finds nothing</li>
                <li>The draft moves the listing out of the seller&apos;s category, or changes a subcategory the seller picked — Pass B then checks the move against the photos</li>
                <li>Description under 80 characters</li>
              </ul>
            </div>
          </div>

          <div className="docs-note">
            <strong>Sourcing discipline:</strong> every specification the draft publishes carries one of three
            sources — <code>image</code> (must name the photo it&apos;s read from), <code>lookup</code> (from{" "}
            <code>product_lookup</code>&apos;s web search), or <code>seller</code> (asserted, uncorroborated). A spec that fits none of the
            three doesn&apos;t go in the listing at all — omitting an unsure spec is the correct move, never a
            mark against the draft.
          </div>
        </section>

        <section className="docs-section">
          <h2>What it logs</h2>
          <p>
            Every step logs when it succeeds and when it doesn&apos;t, and every line carries the listing id, so one{" "}
            <code>grep</code> follows a single listing through both passes. A plain log means it worked, a warning
            means it took the cautious path (a rejected draft, an unverified MRP, an escalation), and an error means
            something actually broke.
          </p>
          <table className="docs-table">
            <thead>
              <tr><th>Step</th><th>On success</th><th>Warning / error</th></tr>
            </thead>
            <tbody>
              <tr><td>runListing()</td><td>Started, with category and image count; how many images loaded.</td><td>Warning if some images failed to load, error if none did. A pass that throws is logged with its name and stack trace.</td></tr>
              <tr><td>Each pass</td><td>Started on which model; completed, with time and tokens.</td><td>Error if it hits its turn limit or stops without calling a submit tool.</td></tr>
              <tr><td>analyze_images</td><td>How many images it read; the brand it saw, observation and damage counts.</td><td>Warning if there was no usable image; error if the vision call failed.</td></tr>
              <tr><td>product_lookup</td><td>The product searched; the match, MRP and number of web sources.</td><td>Error if the web search failed and it fell back; warning when the MRP came from model knowledge.</td></tr>
              <tr><td>submit_draft</td><td>Accepted, on which attempt, with any warning codes.</td><td>Warning for each rejected attempt with its blocking codes; error when still blocking after 3 attempts and escalated.</td></tr>
              <tr><td>check_draft</td><td>Blocking codes (or none) and the warning count.</td><td>—</td></tr>
              <tr><td>submit_review</td><td>Verdict, findings, contradicted claims and omissions.</td><td>Warning if the review came back the wrong shape.</td></tr>
              <tr><td>Verdict</td><td><code>auto_publish</code>, with total time and tokens.</td><td>Warning for human review, with the escalation reasons; error if no draft was produced.</td></tr>
              <tr><td>generate() (HTTP)</td><td>The request; saved, and whether it was published or held.</td><td>Error if the agent returned no draft (the 503) or the save failed.</td></tr>
            </tbody>
          </table>
          <div className="docs-note">
            <strong>Why tools log their own failures:</strong> the Agents SDK catches an error thrown inside a tool
            and hands the model a generic &ldquo;an error occurred&rdquo; message instead of raising it. If the tool
            didn&apos;t log it first, a failed vision or search call would leave nothing in the logs.
          </div>
        </section>

        <section className="docs-section">
          <h2>Run it yourself</h2>
          <p>The CLI boots only the agent module — no database, no HTTP port, just <code>OPENAI_API_KEY</code>, which also covers the web search.</p>
          <pre className="docs-code">{`# every listing in the file, AGENT_CONCURRENCY at a time (default 3)
npm run agent -- --input data/listings.json --output output/results.json

# just a few listings, while iterating on prompts
npm run agent -- --only 1,4`}</pre>
          <div className="docs-note">
            The CLI writes one array to <code>output/results.json</code>, an entry per listing. The HTTP path
            (<code>POST /listings/generate</code>) is what sellers hit: one submission per request through the
            same <code>runListing()</code>, saved as a <code>Listing</code> under the agent&apos;s category, whose <code>publish</code> mirrors
            the verdict — or a 503 with nothing saved if no draft came back.
          </div>
        </section>

        <section className="docs-section">
          <h2>File map</h2>
          <table className="docs-table">
            <thead>
              <tr><th>File</th><th>Role</th></tr>
            </thead>
            <tbody>
              <tr><td>agent.service.ts</td><td><code>runListing()</code>: one listing — fetch images, Pass A, Pass B if a draft exists, <code>assemble()</code>. <code>run()</code>: the CLI&apos;s bounded worker pool over many listings.</td></tr>
              <tr><td>agent.config.ts</td><td>Model names and concurrency from env; warns when both passes share one model.</td></tr>
              <tr><td>agent-runner.ts</td><td>Wraps the <code>@openai/agents</code> SDK loop; defines the <code>toolUseBehavior</code> exit condition read once per turn.</td></tr>
              <tr><td>tools.ts</td><td>The five tools: <code>analyze_images</code>, <code>product_lookup</code>, <code>submit_draft</code>, <code>check_draft</code>, <code>submit_review</code>.</td></tr>
              <tr><td>draft-checker.ts</td><td><code>checkDraft()</code> — the deterministic rule engine — plus <code>hasBlocking</code>/<code>summarize</code>.</td></tr>
              <tr><td>schemas.ts</td><td>Every Zod schema: tool outputs, the draft shape, the review shape.</td></tr>
              <tr><td>prompts/pass-prompts.ts</td><td>System prompts and seed-message builders for both passes.</td></tr>
              <tr><td>image-fetcher.ts</td><td>Downloads and validates listing images once per URL per process.</td></tr>
              <tr><td>llm/llm.service.ts</td><td><code>generateObject()</code> for one-shot structured calls like vision, and <code>generateObjectWithWebSearch()</code> — OpenAI&apos;s hosted web search on the Responses API — for <code>product_lookup</code>. If the search fails or finds nothing, the MRP is marked as model knowledge.</td></tr>
              <tr><td>listings.service.ts</td><td><code>generate()</code> — the HTTP handler that calls the agent and persists the result.</td></tr>
              <tr><td>scripts/run-agent.ts</td><td>CLI entrypoint: standalone Nest context, no database; <code>--only</code> filters, output is one array.</td></tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
