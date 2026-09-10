"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CircleAlert, Heart, ShieldCheck } from "lucide-react";
import { CATEGORY_LABELS, Category, Subcategory } from "../../lib/categories";

type ListingDetail = {
  id: string;
  title: string;
  desc?: string;
  price: number;
  originalPrice?: number;
  brand?: string;
  model?: string;
  yearPurchased?: string;
  specs?: Record<string, string>;
  conditionDetails?: Record<string, unknown>;
  category: Category;
  subcategory?: Subcategory;
  publish?: boolean;
  images: string[];
};

/**
 * The two selling flows store `conditionDetails` differently: the agent writes
 * a tier plus written assessments, the manual wizard writes a set of checkbox
 * flags. This tells them apart so the page can render whichever it was given.
 */
const isAgentCondition = (details?: Record<string, unknown>) =>
  Boolean(details && typeof details.tier === "string");

/** "battery_health" -> "Battery health" */
const toLabel = (key: string) =>
  key.replace(/[_-]+/g, " ").replace(/^./, (character) => character.toUpperCase());

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6001";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiUrl}/listings/${id}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 404 ? "This listing no longer exists." : "Unable to load this listing.");
        return response.json() as Promise<ListingDetail>;
      })
      .then(setListing)
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load this listing.");
      });
    return () => controller.abort();
  }, [apiUrl, id]);

  if (error) {
    return <main className="site-shell detail-page"><BackLink /><p className="listing-state error-state">{error}</p></main>;
  }
  if (!listing) {
    return <main className="site-shell detail-page"><BackLink /><div className="detail-layout"><div className="detail-gallery"><div className="detail-hero skeleton-block" /></div><div className="detail-panel"><div className="skeleton-line wide" /><div className="skeleton-line" /><div className="skeleton-line short" /></div></div></main>;
  }

  const specs = Object.entries(listing.specs ?? {}).filter(([, value]) => String(value).trim());
  const details = listing.conditionDetails ?? {};
  const agentCondition = isAgentCondition(details);
  // `conditionDetails` is a free-form record, so narrow before rendering.
  const text = (key: string) => (typeof details[key] === "string" ? (details[key] as string) : "");
  // Manual listings store the aspects the seller ticked as `true`.
  const flagged = agentCondition ? [] : Object.entries(details).filter(([, value]) => value === true).map(([key]) => toLabel(key));
  const unverifiable = Array.isArray(details.unverifiable_claims) ? (details.unverifiable_claims as string[]) : [];
  const meta = [listing.brand, listing.model, listing.subcategory, listing.yearPurchased && `Bought ${listing.yearPurchased}`].filter(Boolean);

  return (
    <main className="site-shell detail-page">
      <BackLink />

      <div className="detail-layout">
        <div className="detail-gallery">
          {listing.images.length > 0 ? (
            <>
              <div className="detail-hero"><img src={listing.images[active]} alt={`${listing.title} — photo ${active + 1}`} /></div>
              {listing.images.length > 1 && (
                <div className="detail-thumbs">
                  {listing.images.map((url, index) => (
                    <button key={url} className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`View photo ${index + 1}`}>
                      <img src={url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="detail-hero listing-placeholder"><span>{CATEGORY_LABELS[listing.category]}</span></div>
          )}
        </div>

        <div className="detail-panel">
          <p className="eyebrow">{CATEGORY_LABELS[listing.category]}{listing.subcategory ? ` · ${listing.subcategory}` : ""}</p>
          <h1>{listing.title}</h1>

          <div className="price-row detail-price">
            <strong>₹{listing.price.toLocaleString("en-IN")}</strong>
            {listing.originalPrice && (
              <>
                <del>₹{listing.originalPrice.toLocaleString("en-IN")}</del>
                <span className="detail-saving">{Math.round((1 - listing.price / listing.originalPrice) * 100)}% off new</span>
              </>
            )}
          </div>

          {meta.length > 0 && <div className="detail-meta">{meta.map((item) => <span key={String(item)}>{item}</span>)}</div>}

          {listing.publish === false && (
            <div className="verdict-banner">
              <CircleAlert size={18} />
              <div><strong>Held for review</strong><p>The agent could not verify everything in this listing against its photos, so a person is checking it before it goes live.</p></div>
            </div>
          )}

          <div className="detail-actions">
            <button className="submit-button" type="button">Contact seller</button>
            <button className="ghost-button" type="button"><Heart size={16} /> Save</button>
          </div>

          {listing.desc && <div className="detail-section"><h2>About this item</h2><p>{listing.desc}</p></div>}

          {specs.length > 0 && (
            <div className="detail-section">
              <h2>Specifications</h2>
              <dl className="spec-list">{specs.map(([key, value]) => <div key={key}><dt>{toLabel(key)}</dt><dd>{String(value)}</dd></div>)}</dl>
            </div>
          )}

          {agentCondition && (
            <div className="detail-section">
              <h2>Condition · {text("tier")}</h2>
              {text("visual_condition") && <p><strong>Looks like:</strong> {text("visual_condition")}</p>}
              {text("functional_condition") && <p><strong>Works like:</strong> {text("functional_condition")}</p>}
              {text("reasoning") && <p className="detail-note">{text("reasoning")}</p>}
            </div>
          )}

          {flagged.length > 0 && (
            <div className="detail-section">
              <h2>Seller noted</h2>
              <ul className="plain-list">{flagged.map((aspect) => <li key={aspect}>{aspect}</li>)}</ul>
            </div>
          )}

          {unverifiable.length > 0 && (
            <div className="detail-section">
              <h2>Seller&apos;s word, not verified</h2>
              <ul className="plain-list">{unverifiable.map((claim) => <li key={claim}>{claim}</li>)}</ul>
            </div>
          )}

          <p className="detail-trust"><ShieldCheck size={15} /> Every listing is checked against its photos before it reaches you.</p>
        </div>
      </div>
    </main>
  );
}

function BackLink() {
  return <Link className="detail-back" href="/"><ArrowLeft size={16} /> Back to listings</Link>;
}
