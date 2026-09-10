"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { ArrowRight, Bell, ChevronDown, Heart, ImagePlus, Menu, Moon, PencilLine, Search, ShieldCheck, Sparkles, Sun, UserRound, X } from "lucide-react";
import GenerateModal from "./components/GenerateModal";
import { CATEGORY_LABELS, CATEGORY_SUBCATEGORIES, Category, Subcategory } from "./lib/categories";
import { getCategoryHints, toFieldKey } from "./lib/category-spec-hints";
import { uploadImages } from "./lib/upload";

type Mode = "signup" | "login";
/** Which selling surface is open: the chooser, or one of the two flows. */
type SellView = "choose" | "create" | "generate";
type Theme = "light" | "dark";
type AuthUser = { id: string; email: string; fullName: string; role: string };
const ALL_LISTINGS = "All listings" as const;
const browseFilters = [ALL_LISTINGS, ...Object.values(Category)] as const;
type Listing = { id: string; title: string; desc?: string; price: number; originalPrice?: number; category: Category; subcategory?: Subcategory; brand?: string; model?: string; image?: string | null };
type ListingsResponse = { items: Listing[]; page: number; limit: number; total: number; totalPages: number };

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  const [sellView, setSellView] = useState<SellView | null>(null);
  const [mode, setMode] = useState<Mode>("signup");
  const [category, setCategory] = useState<typeof ALL_LISTINGS | Category>(ALL_LISTINGS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listingError, setListingError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [theme, setTheme] = useState<Theme>(() => (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"));
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6001";
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("circle-theme", next); } catch { /* storage unavailable */ }
  };
  useEffect(() => {
    fetch(`${apiUrl}/auth/me`, { credentials: "include" })
      .then((response) => response.ok ? response.json() as Promise<{ user: AuthUser }> : null)
      .then((data) => { if (data) setCurrentUser(data.user); })
      .catch(() => undefined);
  }, [apiUrl]);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), limit: "6" });
    if (category !== ALL_LISTINGS) params.set("category", category);
    fetch(`${apiUrl}/listings?${params}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Unable to load listings"); return response.json() as Promise<ListingsResponse>; })
      .then((data) => { setListings(data.items); setTotalPages(data.totalPages || 1); })
      .catch((error: unknown) => { if (error instanceof DOMException && error.name === "AbortError") return; setListingError("Listings could not be loaded right now."); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [apiUrl, category, page, refreshTick]);
  const selectCategory = (item: typeof ALL_LISTINGS | Category) => { setLoading(true); setListingError(""); setCategory(item); setPage(1); };
  const changePage = (nextPage: number) => { setLoading(true); setListingError(""); setPage(nextPage); };
  const openAuth = (nextMode: Mode) => { setMode(nextMode); setAuthOpen(true); };
  const openSell = () => { if (currentUser) setSellView("choose"); else openAuth("signup"); };
  const logout = async () => { await fetch(`${apiUrl}/auth/logout`, { method: "POST", credentials: "include" }); setCurrentUser(null); };
  const closeSell = () => setSellView(null);
  const onListingCreated = () => { closeSell(); setCategory(ALL_LISTINGS); setPage(1); setLoading(true); setRefreshTick((tick) => tick + 1); };

  return <main className="site-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">C</span> circle</a><div className="desktop-nav"><a href="#listings">Browse</a><a href="#categories">Categories <ChevronDown size={14} /></a><button className="text-nav-button" onClick={openSell}>Sell with Circle</button></div><div className="nav-actions"><button className="theme-toggle" aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"} onClick={toggleTheme} suppressHydrationWarning>{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</button><button className="icon-button" aria-label="Notifications"><Bell size={19} /></button>{currentUser ? <div className="user-menu"><span className="user-greeting"><span className="user-avatar">{currentUser.fullName.charAt(0).toUpperCase()}</span>{currentUser.fullName}</span><button className="logout-button" onClick={logout}>Log out</button></div> : <button className="signin-button" onClick={() => openAuth("login")}><UserRound size={17} /> Sign in</button>}<button className="menu-button" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button></div></header>
    {menuOpen && <nav className="mobile-menu"><a href="#listings" onClick={() => setMenuOpen(false)}>Browse listings</a><a href="#categories" onClick={() => setMenuOpen(false)}>Categories</a><button onClick={() => { openSell(); setMenuOpen(false); }}>Sell an item</button><button onClick={() => { openAuth("signup"); setMenuOpen(false); }}>Create account</button></nav>}
    <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow"><Sparkles size={15} /> Better things, already loved</p><h1>Find your next <em>favorite</em> thing.</h1><p className="hero-subtitle">Quality pre-owned goods, thoughtfully checked and ready for a second life.</p><div className="searchbar"><Search size={19} /><input placeholder="Search for furniture, electronics, and more" aria-label="Search listings" /><button aria-label="Search"><ArrowRight size={19} /></button></div><div className="hero-trust"><ShieldCheck size={17} /><span>Every item is reviewed before it reaches you</span></div></div><div className="hero-art"><div className="hero-note"><span>Curated for you</span><strong>Small upgrades.<br />Big difference.</strong></div></div></section>
    <section className="category-strip" id="categories"><div className="section-label">Explore</div><div className="category-tabs">{browseFilters.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => selectCategory(item)}>{item === ALL_LISTINGS ? item : CATEGORY_LABELS[item]}</button>)}</div></section>
    <section className="listings-section" id="listings"><div className="section-heading"><div><p className="eyebrow">Freshly listed</p><h2>Good finds, great stories.</h2></div><button className="text-button" onClick={() => selectCategory(ALL_LISTINGS)}>View all <ArrowRight size={16} /></button></div>{loading ? <ListingSkeletons /> : listingError ? <p className="listing-state error-state">{listingError}</p> : listings.length === 0 ? <p className="listing-state">No listings found in this category.</p> : <><div className="listing-grid">{listings.map((item) => <article className="listing-card" key={item.id}><div className={item.image ? "listing-image" : "listing-image listing-placeholder"}>{item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <span>{item.category}</span>}<button className="heart-button" aria-label={`Save ${item.title}`}><Heart size={18} /></button></div><div className="listing-info"><h3>{item.title}</h3><p>{[item.brand, item.model, item.subcategory].filter(Boolean).join(" · ") || item.desc || "Quality pre-owned item"}</p><div className="price-row"><strong>₹{item.price.toLocaleString("en-IN")}</strong>{item.originalPrice && <del>₹{item.originalPrice.toLocaleString("en-IN")}</del>}</div></div></article>)}</div><div className="pagination"><button disabled={page === 1} onClick={() => changePage(page - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => changePage(page + 1)}>Next</button></div></>}</section>
    <section className="seller-band" id="sell"><div><p className="eyebrow">Have something good?</p><h2>Give it a second life.</h2></div><button className="dark-button" onClick={openSell}>Start selling <ArrowRight size={17} /></button></section>
    <footer><a className="brand" href="#top"><span className="brand-mark">C</span> circle</a><p>Pre-loved, properly considered.</p><span>© 2026 Circle</span></footer>
    {authOpen && <AuthModal mode={mode} setMode={setMode} onAuthenticated={setCurrentUser} onClose={() => setAuthOpen(false)} />}
    {sellView === "choose" && <SellChoice onPick={setSellView} onClose={closeSell} />}
    {sellView === "create" && <SellModal apiUrl={apiUrl} onCreated={onListingCreated} onClose={closeSell} />}
    {sellView === "generate" && <GenerateModal apiUrl={apiUrl} onDone={onListingCreated} onClose={closeSell} />}
  </main>;
}

function ListingSkeletons() {
  return <div className="listing-grid" aria-label="Loading listings">{Array.from({ length: 6 }, (_, index) => <article className="listing-card skeleton-card" key={index}><div className="listing-image skeleton-block" /><div className="listing-info"><div className="skeleton-line wide" /><div className="skeleton-line" /><div className="skeleton-line short" /></div></article>)}</div>;
}

function AuthModal({ mode, setMode, onAuthenticated, onClose }: { mode: Mode; setMode: (mode: Mode) => void; onAuthenticated: (user: AuthUser) => void; onClose: () => void }) {
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6001";
  const formik = useFormik({ initialValues: { fullName: "", email: "", password: "" }, validate: (values) => { const errors: Record<string, string> = {}; if (mode === "signup" && !values.fullName.trim()) errors.fullName = "Your name is required"; if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "Enter a valid email"; if (values.password.length < 8) errors.password = "Use at least 8 characters"; return errors; }, onSubmit: async (values, helpers) => { setMessage(""); setError(""); try { const payload = mode === "signup" ? values : { email: values.email, password: values.password }; const response = await fetch(`${apiUrl}/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) }); const body = await response.json(); if (!response.ok) throw new Error(body.message ?? "Unable to complete request"); if (mode === "signup") { setOtpEmail(values.email); setOtpStep(true); setMessage("We sent a verification code to your email."); } else { onAuthenticated(body.user); onClose(); } } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to complete request"); } finally { helpers.setSubmitting(false); } } });
  const otpFormik = useFormik({ initialValues: { otp: "" }, validate: (values) => values.otp.length === 6 && /^\d+$/.test(values.otp) ? {} : { otp: "Enter the 6-digit code" }, onSubmit: async (values, helpers) => { setMessage(""); setError(""); try { const response = await fetch(`${apiUrl}/auth/verify-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email: otpEmail, otp: values.otp }) }); const body = await response.json(); if (!response.ok) throw new Error(body.message ?? "Invalid verification code"); onAuthenticated(body.user); onClose(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to verify code"); } finally { helpers.setSubmitting(false); } } });
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="auth-modal"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button><div className="auth-intro"><span className="brand-mark">C</span><p className="eyebrow">Welcome to Circle</p><h2>{otpStep ? "One small step." : mode === "signup" ? "Make room for good things." : "Welcome back."}</h2><p>{otpStep ? "Verify your email to finish creating your account." : mode === "signup" ? "Join a thoughtful community of buyers and sellers." : "Your saved finds are waiting."}</p></div><div className="auth-form">{!otpStep && <div className="auth-switch"><button type="button" className={mode === "signup" ? "selected" : ""} onClick={() => { setMode("signup"); setError(""); }}>Create account</button><button type="button" className={mode === "login" ? "selected" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button></div>}{otpStep ? <form onSubmit={otpFormik.handleSubmit}><p className="form-intro">Enter the 6-digit code sent to <strong>{otpEmail}</strong>.</p><label>Verification code<input name="otp" inputMode="numeric" maxLength={6} value={otpFormik.values.otp} onChange={otpFormik.handleChange} onBlur={otpFormik.handleBlur} placeholder="000000" />{otpFormik.touched.otp && otpFormik.errors.otp && <small>{otpFormik.errors.otp}</small>}</label><button className="submit-button" type="submit" disabled={otpFormik.isSubmitting}>{otpFormik.isSubmitting ? "Verifying..." : "Verify email"} <ArrowRight size={17} /></button></form> : <form onSubmit={formik.handleSubmit}>{mode === "signup" && <label>Full name<input name="fullName" value={formik.values.fullName} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="Your name" />{formik.touched.fullName && formik.errors.fullName && <small>{formik.errors.fullName}</small>}</label>}<label>Email address<input type="email" name="email" value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="you@example.com" />{formik.touched.email && formik.errors.email && <small>{formik.errors.email}</small>}</label><label>Password<input type="password" name="password" value={formik.values.password} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="At least 8 characters" />{formik.touched.password && formik.errors.password && <small>{formik.errors.password}</small>}</label><button className="submit-button" type="submit" disabled={formik.isSubmitting}>{formik.isSubmitting ? "Please wait..." : mode === "signup" ? "Continue with email" : "Sign in"} <ArrowRight size={17} /></button></form>}{message && <p className="form-success">{message}</p>}{error && <p className="form-error">{error}</p>}<p className="form-note">By continuing, you agree to Circle&apos;s terms and privacy policy.</p></div></div></div>;
}

/**
 * The fork between the two selling flows. Both save a listing; they differ in
 * who writes it and whether anything checks the result.
 */
function SellChoice({ onPick, onClose }: { onPick: (view: SellView) => void; onClose: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="sell-modal">
    <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
    <div className="sell-intro"><p className="eyebrow">Sell with Circle</p><h2>How would you like to list?</h2><p>Both end up in the same place. One you write yourself, one the agent writes and then checks against your photos.</p></div>
    <div className="sell-choice">
      <button type="button" onClick={() => onPick("create")}>
        <span className="sell-choice-icon"><PencilLine size={19} /></span>
        <strong>Create listing</strong>
        <p>Fill in the details yourself, step by step. Every word is yours.</p>
        <span className="sell-choice-go">Write it myself <ArrowRight size={15} /></span>
      </button>
      <button type="button" className="featured" onClick={() => onPick("generate")}>
        <span className="sell-choice-icon"><Sparkles size={19} /></span>
        <strong>Generate listing</strong>
        <p>Add photos and a few basics. The agent reads the photos, writes the listing, then verifies its own draft before anything goes live.</p>
        <span className="sell-choice-go">Use the agent <ArrowRight size={15} /></span>
      </button>
    </div>
  </div></div>;
}

const sellCategories = Object.values(Category);
const SELL_STEPS = ["Basics", "Specs & condition", "Photos", "Review"] as const;

function SellModal({ apiUrl, onCreated, onClose }: { apiUrl: string; onCreated: () => void; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState("");
  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  const [conditionValues, setConditionValues] = useState<Record<string, boolean>>({});

  const imagePreviews = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
  useEffect(() => () => imagePreviews.forEach((url) => URL.revokeObjectURL(url)), [imagePreviews]);

  const addImages = (fileList: FileList | null) => {
    if (!fileList) return;
    const next = [...images, ...Array.from(fileList)].slice(0, 10);
    setImages(next);
  };
  const removeImage = (index: number) => setImages(images.filter((_, i) => i !== index));

  const formik = useFormik({
    initialValues: { title: "", category: sellCategories[0], subcategory: "" as Subcategory | "", brand: "", model: "", yearPurchased: "", price: "", originalPrice: "", desc: "" },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.title.trim()) errors.title = "Title is required";
      if (!values.category) errors.category = "Choose a category";
      if (!values.price || Number(values.price) <= 0) errors.price = "Enter a valid price";
      return errors;
    },
    onSubmit: async (values, helpers) => {
      setError("");
      try {
        const imageUrls = await uploadImages(apiUrl, images, setProgress);
        setProgress("Publishing listing...");
        const specs = Object.fromEntries(Object.entries(specValues).filter(([, value]) => value.trim()));
        const payload = {
          title: values.title.trim(),
          category: values.category,
          price: Number(values.price),
          ...(values.subcategory && { subcategory: values.subcategory }),
          ...(values.brand.trim() && { brand: values.brand.trim() }),
          ...(values.model.trim() && { model: values.model.trim() }),
          ...(values.yearPurchased.trim() && { yearPurchased: values.yearPurchased.trim() }),
          ...(values.originalPrice && { originalPrice: Number(values.originalPrice) }),
          ...(values.desc.trim() && { desc: values.desc.trim() }),
          ...(Object.keys(specs).length > 0 && { specs }),
          ...(Object.keys(conditionValues).length > 0 && { conditionDetails: conditionValues }),
          ...(imageUrls.length > 0 && { imageUrls }),
        };
        const response = await fetch(`${apiUrl}/listings`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message ?? "Unable to create listing");
        onCreated();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to create listing");
      } finally {
        setProgress("");
        helpers.setSubmitting(false);
        setSubmitting(false);
      }
    },
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => { setSubmitting(true); formik.handleSubmit(event); };
  const changeCategory = (event: React.ChangeEvent<HTMLSelectElement>) => {
    formik.setFieldValue("category", event.target.value as Category);
    formik.setFieldValue("subcategory", "");
    setSpecValues({});
    setConditionValues({});
  };
  const changeSubcategory = (event: React.ChangeEvent<HTMLSelectElement>) => {
    formik.setFieldValue("subcategory", event.target.value);
    setSpecValues({});
    setConditionValues({});
  };
  const hints = getCategoryHints(formik.values.category, formik.values.subcategory);
  const setSpecValue = (key: string, value: string) => setSpecValues((prev) => ({ ...prev, [key]: value }));
  const toggleConditionValue = (key: string) => setConditionValues((prev) => ({ ...prev, [key]: !prev[key] }));

  const goNext = async () => {
    if (step === 0) {
      const errors = await formik.validateForm();
      formik.setTouched({ ...formik.touched, title: true, category: true, price: true });
      if (errors.title || errors.category || errors.price) return;
    }
    setStep((current) => Math.min(current + 1, SELL_STEPS.length - 1));
  };
  const goBack = () => setStep((current) => Math.max(current - 1, 0));

  const reviewRows: [string, string][] = [
    ["Title", formik.values.title || "—"],
    ["Category", `${CATEGORY_LABELS[formik.values.category]}${formik.values.subcategory ? ` · ${formik.values.subcategory}` : ""}`],
    ["Brand / Model", [formik.values.brand, formik.values.model].filter(Boolean).join(" · ") || "—"],
    ["Price", formik.values.price ? `₹${Number(formik.values.price).toLocaleString("en-IN")}` : "—"],
    ...(formik.values.originalPrice ? [["Original price", `₹${Number(formik.values.originalPrice).toLocaleString("en-IN")}`] as [string, string]] : []),
    ...(formik.values.yearPurchased ? [["Year purchased", formik.values.yearPurchased] as [string, string]] : []),
  ];
  const filledSpecs = Object.entries(specValues).filter(([, value]) => value.trim());
  const checkedConditions = hints.conditionAspects.filter((aspect) => conditionValues[toFieldKey(aspect)]);

  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="sell-modal">
    <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
    <div className="sell-intro"><p className="eyebrow">Sell with Circle</p><h2>List your item.</h2><p>Add a few details and photos to get your item in front of buyers.</p></div>
    <div className="wizard-steps">{SELL_STEPS.map((label, index) => <div className={`wizard-step${index === step ? " active" : ""}${index < step ? " done" : ""}`} key={label}><span className="wizard-step-dot">{index + 1}</span><span className="wizard-step-label">{label}</span></div>)}</div>
    <div className="sell-form"><form onSubmit={submit}>

      {step === 0 && <div className="wizard-panel">
        <label>Title<input name="title" value={formik.values.title} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="e.g. Samsung Galaxy S22" />{formik.touched.title && formik.errors.title && <small>{formik.errors.title}</small>}</label>
        <div className="sell-row">
          <label>Category<select name="category" value={formik.values.category} onChange={changeCategory}>{sellCategories.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>)}</select></label>
          <label>Subcategory<select name="subcategory" value={formik.values.subcategory} onChange={changeSubcategory}><option value="">Optional</option>{CATEGORY_SUBCATEGORIES[formik.values.category].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
        <div className="sell-row">
          <label>Brand<input name="brand" value={formik.values.brand} onChange={formik.handleChange} placeholder="Optional" /></label>
          <label>Model<input name="model" value={formik.values.model} onChange={formik.handleChange} placeholder="Optional" /></label>
        </div>
        <div className="sell-row">
          <label>Price (₹)<input name="price" type="number" min="0" value={formik.values.price} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="0" />{formik.touched.price && formik.errors.price && <small>{formik.errors.price}</small>}</label>
          <label>Original price (₹)<input name="originalPrice" type="number" min="0" value={formik.values.originalPrice} onChange={formik.handleChange} placeholder="Optional" /></label>
        </div>
        <label>Year purchased<input name="yearPurchased" value={formik.values.yearPurchased} onChange={formik.handleChange} placeholder="Optional" /></label>
        <label>Description<textarea name="desc" rows={3} value={formik.values.desc} onChange={formik.handleChange} placeholder="Condition, reason for selling, anything a buyer should know" /></label>
      </div>}

      {step === 1 && <div className="wizard-panel">
        {hints.specKeys.length > 0 ? <fieldset className="sell-fieldset"><legend>Specifications</legend>{hints.specKeys.map((key) => { const fieldKey = toFieldKey(key); return <label key={fieldKey}>{key}<input value={specValues[fieldKey] ?? ""} onChange={(event) => setSpecValue(fieldKey, event.target.value)} placeholder="Optional" /></label>; })}</fieldset> : <p className="wizard-hint">Pick a subcategory on the first step to see suggested specification fields.</p>}
        <fieldset className="sell-fieldset"><legend>Condition details</legend>{hints.conditionAspects.map((aspect) => { const fieldKey = toFieldKey(aspect); return <label key={fieldKey} className="checkbox-label"><input type="checkbox" checked={Boolean(conditionValues[fieldKey])} onChange={() => toggleConditionValue(fieldKey)} />{aspect}</label>; })}</fieldset>
      </div>}

      {step === 2 && <div className="wizard-panel">
        <label>Photos<label className="upload-dropzone"><ImagePlus size={18} /><span>Add up to 10 photos</span><input type="file" accept="image/png,image/jpeg,image/webp,image/avif" multiple hidden onChange={(event) => { addImages(event.target.files); event.target.value = ""; }} /></label></label>
        {images.length > 0 ? <div className="upload-grid">{images.map((file, index) => <div className="upload-tile" key={`${file.name}-${index}`}><img src={imagePreviews[index]} alt={file.name} /><button type="button" className="upload-tile-remove" onClick={() => removeImage(index)} aria-label={`Remove ${file.name}`}><X size={13} /></button>{index === 0 && <span className="upload-tile-cover">Cover</span>}</div>)}</div> : <p className="wizard-hint">Listings with clear photos get more views. The first photo becomes the cover image.</p>}
      </div>}

      {step === 3 && <div className="wizard-panel">
        <div className="review-card">
          {images[0] && <img className="review-cover" src={imagePreviews[0]} alt="Cover" />}
          <dl className="review-list">{reviewRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </div>
        {filledSpecs.length > 0 && <div className="review-tags"><span className="review-tags-label">Specs</span>{filledSpecs.map(([key, value]) => <span className="review-tag" key={key}>{value}</span>)}</div>}
        {checkedConditions.length > 0 && <div className="review-tags"><span className="review-tags-label">Flagged</span>{checkedConditions.map((aspect) => <span className="review-tag" key={aspect}>{aspect}</span>)}</div>}
        {images.length > 1 && <p className="wizard-hint">{images.length} photos will be uploaded.</p>}
      </div>}

      <div className="wizard-actions">
        {step > 0 && <button type="button" className="ghost-button" onClick={goBack}>Back</button>}
        {step < SELL_STEPS.length - 1 && <button type="button" className="submit-button" onClick={goNext}>Continue <ArrowRight size={17} /></button>}
        {step === SELL_STEPS.length - 1 && <button className="submit-button" type="submit" disabled={submitting}>{submitting ? (progress || "Publishing...") : "Publish listing"} <ArrowRight size={17} /></button>}
      </div>
      {error && <p className="form-error">{error}</p>}
    </form></div>
  </div></div>;
}
