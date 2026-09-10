"use client";

import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { ArrowRight, Bell, ChevronDown, Heart, Menu, Search, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";

type Mode = "signup" | "login";
const categories = ["All listings", "Electronics", "Furniture", "Mobiles", "Home", "Vehicles"];
type Listing = { id: string; title: string; desc?: string; price: number; originalPrice?: number; category: string; subcategory?: string; brand?: string; model?: string };
type ListingsResponse = { items: Listing[]; page: number; limit: number; total: number; totalPages: number };

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signup");
  const [category, setCategory] = useState("All listings");
  const [menuOpen, setMenuOpen] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listingError, setListingError] = useState("");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6001";
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), limit: "6" });
    if (category !== "All listings") params.set("category", category.toLowerCase());
    fetch(`${apiUrl}/listings?${params}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Unable to load listings"); return response.json() as Promise<ListingsResponse>; })
      .then((data) => { setListings(data.items); setTotalPages(data.totalPages || 1); })
      .catch((error: unknown) => { if (error instanceof DOMException && error.name === "AbortError") return; setListingError("Listings could not be loaded right now."); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [apiUrl, category, page]);
  const selectCategory = (item: string) => { setLoading(true); setListingError(""); setCategory(item); setPage(1); };
  const changePage = (nextPage: number) => { setLoading(true); setListingError(""); setPage(nextPage); };
  const openAuth = (nextMode: Mode) => { setMode(nextMode); setAuthOpen(true); };

  return <main className="site-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">C</span> circle</a><div className="desktop-nav"><a href="#listings">Browse</a><a href="#categories">Categories <ChevronDown size={14} /></a><a href="#sell">Sell with Circle</a></div><div className="nav-actions"><button className="icon-button" aria-label="Notifications"><Bell size={19} /></button><button className="signin-button" onClick={() => openAuth("login")}><UserRound size={17} /> Sign in</button><button className="menu-button" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button></div></header>
    {menuOpen && <nav className="mobile-menu"><a href="#listings" onClick={() => setMenuOpen(false)}>Browse listings</a><a href="#categories" onClick={() => setMenuOpen(false)}>Categories</a><button onClick={() => { openAuth("signup"); setMenuOpen(false); }}>Create account</button></nav>}
    <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow"><Sparkles size={15} /> Better things, already loved</p><h1>Find your next <em>favorite</em> thing.</h1><p className="hero-subtitle">Quality pre-owned goods, thoughtfully checked and ready for a second life.</p><div className="searchbar"><Search size={19} /><input placeholder="Search for furniture, electronics, and more" aria-label="Search listings" /><button aria-label="Search"><ArrowRight size={19} /></button></div><div className="hero-trust"><ShieldCheck size={17} /><span>Every item is reviewed before it reaches you</span></div></div><div className="hero-art"><div className="hero-note"><span>Curated for you</span><strong>Small upgrades.<br />Big difference.</strong></div></div></section>
    <section className="category-strip" id="categories"><div className="section-label">Explore</div><div className="category-tabs">{categories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => selectCategory(item)}>{item}</button>)}</div></section>
    <section className="listings-section" id="listings"><div className="section-heading"><div><p className="eyebrow">Freshly listed</p><h2>Good finds, great stories.</h2></div><button className="text-button" onClick={() => selectCategory("All listings")}>View all <ArrowRight size={16} /></button></div>{loading ? <ListingSkeletons /> : listingError ? <p className="listing-state error-state">{listingError}</p> : listings.length === 0 ? <p className="listing-state">No listings found in this category.</p> : <><div className="listing-grid">{listings.map((item) => <article className="listing-card" key={item.id}><div className="listing-image listing-placeholder"><span>{item.category}</span><button className="heart-button" aria-label={`Save ${item.title}`}><Heart size={18} /></button></div><div className="listing-info"><h3>{item.title}</h3><p>{[item.brand, item.model, item.subcategory].filter(Boolean).join(" · ") || item.desc || "Quality pre-owned item"}</p><div className="price-row"><strong>₹{item.price.toLocaleString("en-IN")}</strong>{item.originalPrice && <del>₹{item.originalPrice.toLocaleString("en-IN")}</del>}</div></div></article>)}</div><div className="pagination"><button disabled={page === 1} onClick={() => changePage(page - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => changePage(page + 1)}>Next</button></div></>}</section>
    <section className="seller-band" id="sell"><div><p className="eyebrow">Have something good?</p><h2>Give it a second life.</h2></div><button className="dark-button" onClick={() => openAuth("signup")}>Start selling <ArrowRight size={17} /></button></section>
    <footer><a className="brand" href="#top"><span className="brand-mark">C</span> circle</a><p>Pre-loved, properly considered.</p><span>© 2026 Circle</span></footer>
    {authOpen && <AuthModal mode={mode} setMode={setMode} onClose={() => setAuthOpen(false)} />}
  </main>;
}

function ListingSkeletons() {
  return <div className="listing-grid" aria-label="Loading listings">{Array.from({ length: 6 }, (_, index) => <article className="listing-card skeleton-card" key={index}><div className="listing-image skeleton-block" /><div className="listing-info"><div className="skeleton-line wide" /><div className="skeleton-line" /><div className="skeleton-line short" /></div></article>)}</div>;
}

function AuthModal({ mode, setMode, onClose }: { mode: Mode; setMode: (mode: Mode) => void; onClose: () => void }) {
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6001";
  const formik = useFormik({ initialValues: { fullName: "", email: "", password: "" }, validate: (values) => { const errors: Record<string, string> = {}; if (mode === "signup" && !values.fullName.trim()) errors.fullName = "Your name is required"; if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "Enter a valid email"; if (values.password.length < 8) errors.password = "Use at least 8 characters"; return errors; }, onSubmit: async (values, helpers) => { setMessage(""); setError(""); try { const payload = mode === "signup" ? values : { email: values.email, password: values.password }; const response = await fetch(`${apiUrl}/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) }); const body = await response.json(); if (!response.ok) throw new Error(body.message ?? "Unable to complete request"); if (mode === "signup") { setOtpEmail(values.email); setOtpStep(true); setMessage("We sent a verification code to your email."); } else { onClose(); } } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to complete request"); } finally { helpers.setSubmitting(false); } } });
  const otpFormik = useFormik({ initialValues: { otp: "" }, validate: (values) => values.otp.length === 6 && /^\d+$/.test(values.otp) ? {} : { otp: "Enter the 6-digit code" }, onSubmit: async (values, helpers) => { setMessage(""); setError(""); try { const response = await fetch(`${apiUrl}/auth/verify-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email: otpEmail, otp: values.otp }) }); const body = await response.json(); if (!response.ok) throw new Error(body.message ?? "Invalid verification code"); onClose(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to verify code"); } finally { helpers.setSubmitting(false); } } });
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="auth-modal"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button><div className="auth-intro"><span className="brand-mark">C</span><p className="eyebrow">Welcome to Circle</p><h2>{otpStep ? "One small step." : mode === "signup" ? "Make room for good things." : "Welcome back."}</h2><p>{otpStep ? "Verify your email to finish creating your account." : mode === "signup" ? "Join a thoughtful community of buyers and sellers." : "Your saved finds are waiting."}</p></div><div className="auth-form">{!otpStep && <div className="auth-switch"><button type="button" className={mode === "signup" ? "selected" : ""} onClick={() => { setMode("signup"); setError(""); }}>Create account</button><button type="button" className={mode === "login" ? "selected" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button></div>}{otpStep ? <form onSubmit={otpFormik.handleSubmit}><p className="form-intro">Enter the 6-digit code sent to <strong>{otpEmail}</strong>.</p><label>Verification code<input name="otp" inputMode="numeric" maxLength={6} value={otpFormik.values.otp} onChange={otpFormik.handleChange} onBlur={otpFormik.handleBlur} placeholder="000000" />{otpFormik.touched.otp && otpFormik.errors.otp && <small>{otpFormik.errors.otp}</small>}</label><button className="submit-button" type="submit" disabled={otpFormik.isSubmitting}>{otpFormik.isSubmitting ? "Verifying..." : "Verify email"} <ArrowRight size={17} /></button></form> : <form onSubmit={formik.handleSubmit}>{mode === "signup" && <label>Full name<input name="fullName" value={formik.values.fullName} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="Your name" />{formik.touched.fullName && formik.errors.fullName && <small>{formik.errors.fullName}</small>}</label>}<label>Email address<input type="email" name="email" value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="you@example.com" />{formik.touched.email && formik.errors.email && <small>{formik.errors.email}</small>}</label><label>Password<input type="password" name="password" value={formik.values.password} onChange={formik.handleChange} onBlur={formik.handleBlur} placeholder="At least 8 characters" />{formik.touched.password && formik.errors.password && <small>{formik.errors.password}</small>}</label><button className="submit-button" type="submit" disabled={formik.isSubmitting}>{formik.isSubmitting ? "Please wait..." : mode === "signup" ? "Continue with email" : "Sign in"} <ArrowRight size={17} /></button></form>}{message && <p className="form-success">{message}</p>}{error && <p className="form-error">{error}</p>}<p className="form-note">By continuing, you agree to Circle&apos;s terms and privacy policy.</p></div></div></div>;
}
