"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { ArrowRight, Camera, CircleAlert, CircleCheck, Eye, ImagePlus, ScanSearch, X } from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_SUBCATEGORIES, Category, Subcategory } from "../lib/categories";
import { uploadImages } from "../lib/upload";

type SpecSource = "image" | "lookup" | "seller";

type GeneratedPdp = {
  category_reasoning: string;
  category: Category;
  subcategory: Subcategory | null;
  title: string;
  description: string;
  original_mrp: number | null;
  specifications: { key: string; value: string; source: SpecSource; image_index: number | null; confidence: number }[];
  condition: { tier: string; visual_condition: string; functional_condition: string; reasoning: string };
  unverifiable_claims: string[];
};

type Finding = { claim: string; claimed_source: string; status: "confirmed" | "contradicted" | "unverifiable"; note: string };

export type GenerateResult = {
  id: string;
  generated_pdp: GeneratedPdp | null;
  review: {
    verdict: "auto_publish" | "human_review_needed";
    findings: Finding[];
    omissions: string[];
    notes: string;
    escalation_reasons: string[];
  };
  publish: boolean;
};

/** What each provenance tag means to a seller, in their words rather than ours. */
const SOURCE_LABEL: Record<SpecSource, string> = {
  image: "From your photo",
  lookup: "Looked up",
  seller: "Your claim",
};

/** Shown in order while the request is in flight, so the wait is legible. */
const STAGES = [
  { icon: Camera, label: "Reading your photos" },
  { icon: ScanSearch, label: "Looking up the product" },
  { icon: Eye, label: "Checking the draft against your photos" },
];

const categories = Object.values(Category);

type Filing = { category: Category; subcategory: Subcategory | "" | null };

const filingLabel = ({ category, subcategory }: Filing) =>
  subcategory ? `${CATEGORY_LABELS[category]} · ${subcategory}` : CATEGORY_LABELS[category];

export default function GenerateModal({
  apiUrl,
  onDone,
  onClose,
}: {
  apiUrl: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const [images, setImages] = useState<File[]>([]);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState("");
  const [stage, setStage] = useState(-1);

  const previews = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  // Advances the stage list on a timer. The backend runs the two passes in one
  // request, so there is no real progress to stream — this only keeps the wait
  // honest about what is happening, and stops before the last stage so it never
  // claims to have finished something it has not.
  useEffect(() => {
    if (stage < 0 || stage >= STAGES.length - 1) return;
    const timer = setTimeout(() => setStage((current) => current + 1), 9000);
    return () => clearTimeout(timer);
  }, [stage]);

  const formik = useFormik({
    initialValues: {
      title: "",
      category: categories[0],
      subcategory: "" as Subcategory | "",
      brand: "",
      model: "",
      yearPurchased: "",
      price: "",
      desc: "",
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.title.trim()) errors.title = "Tell the agent what this is";
      if (!values.price || Number(values.price) <= 0) errors.price = "Enter a valid price";
      return errors;
    },
    onSubmit: async (values, helpers) => {
      setError("");
      setStage(0);
      try {
        const imageUrls = await uploadImages(apiUrl, images, () => setStage(0));
        const response = await fetch(`${apiUrl}/listings/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: values.title.trim(),
            category: values.category,
            price: Number(values.price),
            imageUrls,
            ...(values.subcategory && { subcategory: values.subcategory }),
            ...(values.brand.trim() && { brand: values.brand.trim() }),
            ...(values.model.trim() && { model: values.model.trim() }),
            ...(values.yearPurchased.trim() && { yearPurchased: values.yearPurchased.trim() }),
            ...(values.desc.trim() && { desc: values.desc.trim() }),
          }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message ?? "The agent could not generate this listing");
        setResult(body as GenerateResult);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to generate listing");
      } finally {
        setStage(-1);
        helpers.setSubmitting(false);
      }
    },
  });

  const addImages = (fileList: FileList | null) => {
    if (fileList) setImages([...images, ...Array.from(fileList)].slice(0, 10));
  };
  const canSubmit = images.length > 0 && !formik.isSubmitting;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="sell-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>

        {result ? (
          <ResultView result={result} submitted={{ category: formik.values.category, subcategory: formik.values.subcategory }} onDone={onDone} />
        ) : formik.isSubmitting ? (
          <RunningView stage={stage} />
        ) : (
          <>
            <div className="sell-intro">
              <p className="eyebrow">Generate with Circle</p>
              <h2>Let the agent write it.</h2>
              <p>Add your photos and a few basics. The agent reads the photos, writes the listing, then checks its own work before anything goes live.</p>
            </div>

            <div className="sell-form">
              <form onSubmit={formik.handleSubmit}>
                <div className="wizard-panel">
                  <label>
                    Photos
                    <label className="upload-dropzone">
                      <ImagePlus size={18} />
                      <span>{images.length > 0 ? `${images.length} photo${images.length > 1 ? "s" : ""} added` : "Add up to 10 photos"}</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" multiple hidden onChange={(event) => { addImages(event.target.files); event.target.value = ""; }} />
                    </label>
                  </label>
                  {images.length > 0 ? (
                    <div className="upload-grid">
                      {images.map((file, index) => (
                        <div className="upload-tile" key={`${file.name}-${index}`}>
                          <img src={previews[index]} alt={file.name} />
                          <button type="button" className="upload-tile-remove" onClick={() => setImages(images.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`}><X size={13} /></button>
                          {index === 0 && <span className="upload-tile-cover">Cover</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="wizard-hint">Photos are how the agent checks its own work, so at least one is required. Clear shots of labels and any damage help most.</p>
                  )}

                  <label>
                    What is it?
                    <input name="title" value={formik.values.title} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="e.g. ASUS TUF F15 gaming laptop" />
                    {formik.touched.title && formik.errors.title && <small>{formik.errors.title}</small>}
                  </label>

                  <div className="sell-row">
                    <label>
                      Category
                      <select name="category" value={formik.values.category} onChange={(event) => { formik.setFieldValue("category", event.target.value as Category); formik.setFieldValue("subcategory", ""); }}>
                        {categories.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>)}
                      </select>
                    </label>
                    <label>
                      Subcategory
                      <select name="subcategory" value={formik.values.subcategory} onChange={formik.handleChange}>
                        <option value="">Optional</option>
                        {CATEGORY_SUBCATEGORIES[formik.values.category].map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="sell-row">
                    <label>Brand<input name="brand" value={formik.values.brand} onChange={formik.handleChange} placeholder="Optional" /></label>
                    <label>Model<input name="model" value={formik.values.model} onChange={formik.handleChange} placeholder="Optional" /></label>
                  </div>

                  <div className="sell-row">
                    <label>
                      Your price (₹)
                      <input name="price" type="number" min="0" value={formik.values.price} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="0" />
                      {formik.touched.price && formik.errors.price && <small>{formik.errors.price}</small>}
                    </label>
                    <label>Year purchased<input name="yearPurchased" value={formik.values.yearPurchased} onChange={formik.handleChange} placeholder="Optional" /></label>
                  </div>

                  <label>
                    Anything a buyer should know
                    <textarea name="desc" rows={3} value={formik.values.desc} onChange={formik.handleChange} placeholder="Scratches, repairs, what's included — the agent will not hide these, and leaving one out is what sends a listing to review" />
                  </label>
                </div>

                <div className="wizard-actions">
                  <button className="submit-button" type="submit" disabled={!canSubmit}>Generate listing <ArrowRight size={17} /></button>
                </div>
                {images.length === 0 && <p className="wizard-hint">Add at least one photo to continue.</p>}
                {error && <p className="form-error">{error}</p>}
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RunningView({ stage }: { stage: number }) {
  return (
    <>
      <div className="sell-intro">
        <p className="eyebrow">Working</p>
        <h2>Reading your photos.</h2>
        <p>This takes up to a minute. The agent writes the listing, then verifies it against your photos in a separate pass.</p>
      </div>
      <div className="agent-stages">
        {STAGES.map(({ icon: Icon, label }, index) => (
          <div className={`agent-stage${index === stage ? " active" : ""}${index < stage ? " done" : ""}`} key={label}>
            <span className="agent-stage-icon"><Icon size={16} /></span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function ResultView({ result, submitted, onDone }: { result: GenerateResult; submitted: Filing; onDone: () => void }) {
  const { review, generated_pdp: pdp } = result;
  const published = review.verdict === "auto_publish";
  const flagged = review.findings.filter((finding) => finding.status !== "confirmed");
  // Same rule as the backend's category_corrected / subcategory_corrected:
  // filling in a blank subcategory is not a move.
  const moved =
    pdp !== null &&
    (pdp.category !== submitted.category || (submitted.subcategory !== "" && pdp.subcategory !== submitted.subcategory));

  return (
    <>
      <div className="sell-intro">
        <p className="eyebrow">Generated</p>
        <h2>{published ? "Your listing is live." : "One thing needs a human."}</h2>
        <p>
          {published
            ? "The agent checked every claim against your photos and found nothing that contradicts them."
            : "The listing is saved but held back from the marketplace. Someone at Circle will look at the points below before it goes live."}
        </p>
      </div>

      <div className="sell-form">
        <div className={`verdict-banner${published ? " ok" : ""}`}>
          {published ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
          <div>
            <strong>{published ? "Published" : "Held for review"}</strong>
            <p>{review.notes}</p>
          </div>
        </div>

        {pdp && (
          <div className="wizard-panel">
            <div className="generated-block">
              <h3>{pdp.title}</h3>
              <p>{pdp.description}</p>
              {pdp.original_mrp !== null && <p className="generated-mrp">Originally ₹{pdp.original_mrp.toLocaleString("en-IN")} new</p>}
            </div>

            <div className="generated-block">
              <h4>Category · {filingLabel(pdp)}</h4>
              {moved && <p><strong>Moved from {filingLabel(submitted)}:</strong> {pdp.category_reasoning}</p>}
            </div>

            {pdp.specifications.length > 0 && (
              <div className="generated-block">
                <h4>Specifications</h4>
                <dl className="spec-list">
                  {pdp.specifications.map((spec) => (
                    <div key={spec.key}>
                      <dt>{spec.key}</dt>
                      <dd>
                        {spec.value}
                        <span className={`source-tag source-${spec.source}`}>{SOURCE_LABEL[spec.source]}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="generated-block">
              <h4>Condition · {pdp.condition.tier}</h4>
              <p><strong>Looks like:</strong> {pdp.condition.visual_condition}</p>
              <p><strong>Works like:</strong> {pdp.condition.functional_condition}</p>
            </div>

            {pdp.unverifiable_claims.length > 0 && (
              <div className="generated-block">
                <h4>Shown as your word, not verified</h4>
                <ul className="plain-list">{pdp.unverifiable_claims.map((claim) => <li key={claim}>{claim}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        {!published && (review.escalation_reasons.length > 0 || flagged.length > 0) && (
          <div className="wizard-panel">
            <div className="generated-block">
              <h4>Why it is held</h4>
              <ul className="plain-list">
                {review.escalation_reasons.map((reason) => <li key={reason}>{reason}</li>)}
                {flagged.map((finding) => (
                  <li key={finding.claim}>
                    <span className={`source-tag source-${finding.status}`}>{finding.status}</span> {finding.claim} — {finding.note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="wizard-actions">
          <button className="submit-button" type="button" onClick={onDone}>Done <ArrowRight size={17} /></button>
        </div>
      </div>
    </>
  );
}
