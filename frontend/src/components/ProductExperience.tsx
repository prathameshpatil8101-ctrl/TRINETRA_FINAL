import { lazy, Suspense, useEffect, useRef } from "react"
import { motion, useReducedMotion } from "motion/react"
import { ArrowUpRight, ArrowDown, ScanLine, Crosshair, Check, ChevronRight, FileText } from "lucide-react"

const OceanWorld = lazy(() => import("../three/OceanWorld"))

export default function ProductExperience({ onAnalyze, effects = true }: { onAnalyze: () => void; effects?: boolean }) {
  const progress = useRef(0)
  const reducedMotion = useReducedMotion()
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".product-experience main > section"))
    let frame = 0
    const update = () => {
      frame = 0
      const position = window.scrollY + window.innerHeight * .35
      let stage = 0
      sections.forEach((section, index) => {
        if (position >= section.offsetTop) stage = index + Math.min(1, (position - section.offsetTop) / Math.max(1, section.offsetHeight))
      })
      progress.current = Math.min(1, stage / 6)
    }
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update) }
    update()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule, { passive: true })
    return () => {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      window.cancelAnimationFrame(frame)
    }
  }, [])
  const reveal = { initial: { opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 35 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .2 }, transition: { duration: .8 } }
  const cta = <button className="ocean-cta" onClick={onAnalyze}><ScanLine size={17} /> Analyze sonar image <ArrowUpRight size={18} /></button>
  return <div className="product-experience">
    <div className="product-world" aria-hidden="true"><Suspense fallback={<div className="ocean-fallback" />}><OceanWorld progress={progress} enabled={effects && !reducedMotion} /></Suspense></div>
    <div className="product-shade" />
    <header className="product-nav">
      <a className="product-brand" href="#surface"><Crosshair size={27} strokeWidth={1.3} />TRINETRA<span>Underwater intelligence</span></a>
      <nav aria-label="Product navigation"><a href="#detect">Technology</a><a href="#human">Human in the loop</a><button onClick={onAnalyze}>Open workspace <ArrowUpRight size={15} /></button></nav>
    </header>
    <main>
      <section id="surface" className="product-hero">
        <motion.div {...reveal} className="hero-copy">
          <div className="product-eyebrow"><span /> Underwater intelligence system</div>
          <h1>Detect.<br />Assess.<br /><span>Prioritize.</span></h1>
          <p>AI-powered sonar intelligence for detecting, assessing and prioritizing underwater objects and potential anomalies.</p>
          <div className="hero-actions">{cta}<a className="explore-link" href="#detect">Explore TRINETRA <ArrowDown size={15} /></a></div>
        </motion.div>
        <div className="world-caption"><span className="caption-line" /><span>See beyond the visible.<small>Procedural environment · not analysis data</small></span></div>
        <div className="hero-bottom"><span>Built for discovery. Designed for decisions.</span><a href="#detect">Scroll to descend <ArrowDown size={14} /></a></div>
      </section>
      <section id="detect" className="story-section story-detect">
        <motion.div {...reveal} className="story-copy"><span className="story-number">01 / DETECT</span><h2>The unseen.<br /><span>Made visible.</span></h2><p>Identify objects hidden within complex underwater sonar imagery. Start with an image. Let detection bring the evidence into focus.</p><div className="technology-line"><ScanLine size={22} /><div>YOLOv8<small>Object detection</small></div></div></motion.div>
        <motion.div {...reveal} className="detection-outline"><span>SONAR SCANNING</span><div /><p>Detection begins with your image.<br />No simulated results. No invented findings.</p></motion.div>
      </section>
      <section id="assess" className="story-section story-assess">
        <motion.div {...reveal} className="story-copy"><span className="story-number">02 / ASSESS</span><h2>More evidence.<br /><span>Less assumption.</span></h2><p>A detection is a starting point, not a conclusion. TRINETRA pairs detector classification with visual feature similarity and reference comparison.</p></motion.div>
        <motion.div {...reveal} className="product-evidence"><span className="evidence-caption">AI EVIDENCE / WORKFLOW</span>{["Object detected", "YOLO classification", "Feature analysis", "Reference match", "Model agreement", "TRINETRA assessment"].map((step, index) => <div className="product-evidence-step" key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong><ChevronRight size={16} /></div>)}<p>Evidence pipeline, not a literal neural-network visualization. Values appear only after a real analysis.</p></motion.div>
      </section>
      <section id="prioritize" className="story-section story-prioritize">
        <motion.div {...reveal} className="story-copy"><span className="story-number">03 / PRIORITIZE</span><h2>Focus on what<br /><span>needs you.</span></h2><p>Surface uncertain findings for human verification. Clear assessment states help operators decide where to look next.</p></motion.div>
        <motion.div {...reveal} className="semantic-list">{[["known", "Known like", "Consistent with known references."], ["review", "Review required", "Uncertainty needs a closer look."], ["anomaly", "Anomaly candidate", "A candidate for review. Never a confirmed unknown or autonomous threat identification."]].map(([tone, title, description]) => <div className={`semantic-item ${tone}`} key={tone}><i /><div><h3>{title}</h3><p>{description}</p></div></div>)}<small>Assessment categories · not live detections</small></motion.div>
      </section>
      <section id="human" className="story-section story-human">
        <motion.div {...reveal} className="story-copy"><span className="story-number">04 / HUMAN VERIFICATION</span><h2>Intelligence assists.<br /><span>You decide.</span></h2><p>AI assessment and human verification remain distinct. The final operational judgment belongs to the operator—not the model.</p></motion.div>
        <motion.div {...reveal} className="human-preview"><div className="human-preview-top"><Crosshair size={22} /><span>AI assessment <ArrowDown size={16} /></span></div><h3>Human verification</h3><p>Review the crop. Compare the evidence.<br />Record your decision.</p>{["Confirm as known", "Keep under review", "Confirm anomaly candidate"].map(label => <div className="decision-preview" key={label}><Check size={15} />{label}</div>)}<button onClick={onAnalyze}>Enter analysis workspace <ArrowUpRight size={16} /></button><small>Decisions are stored locally. They do not modify the AI model.</small></motion.div>
      </section>
      <section id="report" className="story-section story-report">
        <motion.div {...reveal} className="story-copy"><span className="story-number">05 / REPORT</span><h2>From discovery<br /><span>to a clear record.</span></h2><p>Your mission context. The model’s evidence. Your verification. One structured report with a traceable separation between AI findings and human decisions.</p><div className="export-formats">PDF / PRINT <span>JSON</span> CSV</div></motion.div>
        <motion.div {...reveal} className="report-preview"><div className="report-preview-brand"><Crosshair size={20} />TRINETRA<FileText size={20} /></div><h3>Structured<br />detection report</h3><span>REPORT CONTENTS</span>{["Operator-provided mission information", "Analysis & detection summary", "AI evidence & image crops", "Human verification", "Original & annotated images"].map((label, index) => <div key={label}><span>0{index + 1}</span>{label}</div>)}<p>Generated from your analysis. No report data is shown before upload.</p></motion.div>
      </section>
      <section className="product-final"><motion.div {...reveal}><Crosshair size={38} strokeWidth={1} /><span>TRINETRA / UNDERWATER INTELLIGENCE SYSTEM</span><h2>A deeper perspective.<br /><em>A clearer decision.</em></h2><p>Detect. Assess. Prioritize.</p>{cta}</motion.div></section>
    </main>
    <footer className="product-footer"><strong>TRINETRA</strong><span>AI-powered intelligence. Human-led decisions.</span><a href="#surface">Back to the surface ↑</a></footer>
  </div>
}
