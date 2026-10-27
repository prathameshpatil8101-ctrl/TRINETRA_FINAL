import { AnimatePresence, motion } from "motion/react"
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  CircleDot,
  Crosshair,
  Database,
  Download,
  FileJson,
  FileText,
  Focus,
  History as HistoryIcon,
  Image as ImageIcon,
  Layers3,
  Maximize2,
  Menu,
  Network,
  PanelLeftClose,
  Printer,
  Radar,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  Waves,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import {
  type ChangeEvent,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  analyzeImage,
  getApiBaseUrl,
  getCustomApiBaseUrl,
  getDefaultApiBaseUrl,
  setCustomApiBaseUrl,
  getHealth,
} from "./services/api"
import ProductExperience from "./components/ProductExperience"
import type {
  AnalysisResponse,
  Detection,
  HealthResponse,
  HistoryRecord,
  MissionMetadata,
  ReviewDecision,
} from "./types/trinetra"

const SonarScene = lazy(() => import("./three/OceanWorld"))
const CategoryVisualization = lazy(
  () => import("./three/CategoryVisualization"),
)

type Page = "command" | "analysis" | "review" | "history" | "reports" | "settings"
type ProcessingState = "idle" | "uploading" | "processing" | "detecting" | "assessing" | "complete"

const EMPTY_MISSION: MissionMetadata = {
  missionId: "",
  surveyLocation: "",
  latitude: "",
  longitude: "",
  depth: "",
  date: "",
  time: "",
  operator: "",
  notes: "",
}

const NAV_ITEMS: { id: Page; label: string; icon: typeof Radar }[] = [
  { id: "command", label: "Command Center", icon: Radar },
  { id: "analysis", label: "Sonar Analysis", icon: ScanLine },
  { id: "review", label: "Review Queue", icon: ShieldCheck },
  { id: "history", label: "Analysis History", icon: HistoryIcon },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: SettingsIcon },
]

const pretty = (value: string) =>
  value
    .split("_")
    .join(" ")
    .replace("KNOWN LIKE LOW CONFIDENCE", "KNOWN-LIKE — LOW CONFIDENCE")
const percent = (value: number) => `${(value * 100).toFixed(2)}%`
const statusTone = (status: string) =>
  status === "ANOMALY_CANDIDATE"
    ? "anomaly"
    : status === "REVIEW_REQUIRED"
      ? "review"
      : "known"
const reviewKey = (recordId: string, detectionId: number) =>
  `${recordId}:${detectionId}`

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: ReactNode
  variant?: "primary" | "ghost" | "outline" | "danger"
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}

function Label({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`tech-label ${className}`}>{children}</div>
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`panel ${className}`}>{children}</section>
}

function StatusPill({
  status,
  children,
}: {
  status: string
  children?: ReactNode
}) {
  return (
    <span className={`status-pill status-pill--${statusTone(status)}`}>
      <i />
      {children || pretty(status)}
    </span>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  )
}

function Header({
  health,
  checking,
  onRetry,
  onMenu,
}: {
  health: HealthResponse | null
  checking: boolean
  onRetry: () => void
  onMenu: () => void
}) {
  const connected = health?.status === "ok"
  const aiReady =
    health?.model === "loaded" && health?.anomaly_engine === "loaded"
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <Button
          variant="ghost"
          className="mobile-menu"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </Button>
        <div className="brand-mark">
          <Crosshair size={19} />
          <span />
        </div>
        <div>
          <strong>TRINETRA</strong>
          <small>Underwater Intelligence System</small>
        </div>
      </div>
      <div className="system-strip">
        <div className={connected ? "sys ok" : "sys offline"}>
          <i />
          <span>{checking ? "Connecting" : connected ? "System Online" : health ? "System not ready" : "Backend Offline"}</span>
        </div>
        <div className="sys-detail">
          <Network size={14} />
          <span>Backend</span>
          <b>{checking ? "Checking" : connected ? "Connected" : "Offline"}</b>
        </div>
        <div className="sys-detail">
          <Activity size={14} />
          <span>AI</span>
          <b>{checking ? "Checking" : aiReady ? "Ready" : "Unavailable"}</b>
        </div>
        {!connected && (
          <Button variant="ghost" onClick={onRetry}>
            <RefreshCw size={14} /> Reconnect
          </Button>
        )}
      </div>
    </header>
  )
}

function Sidebar({
  page,
  open,
  setPage,
  onClose,
}: {
  page: Page
  open: boolean
  setPage: (page: Page) => void
  onClose: () => void
}) {
  return (
    <>
      {open && <div className="nav-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <nav>
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => {
                  setPage(item.id)
                  onClose()
                }}
              >
                <span className="nav-index">0{index + 1}</span>
                <Icon size={17} />
                <span>{item.label}</span>
                <ChevronRight size={14} />
              </button>
            )
          })}
        </nav>
        <div className="sidebar-foot">
          <Waves size={19} />
          <div>
            <span>TRINETRA CORE</span>
            <small>Decision-support interface</small>
          </div>
        </div>
      </aside>
    </>
  )
}

function Summary({ result }: { result: AnalysisResponse }) {
  const items = [
    ["Objects Detected", result.detection_count, "neutral"],
    ["Known Like", result.known_like_count, "known"],
    ["Review Required", result.review_required_count, "review"],
    ["Anomaly Candidates", result.anomaly_candidate_count, "anomaly"],
  ]
  return (
    <div className="summary-grid">
      {items.map(([label, value, tone]) => (
        <div className={`summary-cell summary-cell--${tone}`} key={label}>
          <Label>{label}</Label>
          <motion.strong
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {value}
          </motion.strong>
          <span />
        </div>
      ))}
    </div>
  )
}

function CommandCenter({
  result,
  selectedId,
  setSelectedId,
  setPage,
  health,
}: {
  result: AnalysisResponse | null
  selectedId?: number
  setSelectedId: (id: number) => void
  setPage: (page: Page) => void
  health: HealthResponse | null
}) {
  const selected =
    result?.detections.find((item) => item.detection_id === selectedId) ||
    result?.detections[0]
  return (
    <div className="command-layout">
      <div className="scene-stage">
        <Suspense
          fallback={
            <div className="scene-loading">
              <Radar size={26} />
              <span>INITIALIZING SONAR ENVIRONMENT</span>
            </div>
          }
        >
          <SonarScene
            detections={result?.detections || []}
            selectedId={selected?.detection_id}
            onSelect={setSelectedId}
          />
        </Suspense>
        <div className="scene-vignette" />
        <div className="scene-heading">
          <Label>AI-powered underwater intelligence</Label>
          <div className="display-title">
            DETECT<span>.</span> ASSESS<span>.</span>
            <br />
            PRIORITIZE<span>.</span>
          </div>
          <p>
            Sonar detection, visual assessment and human-guided anomaly review.
          </p>
          <Button onClick={() => setPage("analysis")}>
            <ScanLine size={17} /> Analyze Sonar Image <ArrowRight size={16} />
          </Button>
        </div>
        <div className="depth-scale">
          <span>000 M</span>
          <span>120 M</span>
          <span>240 M</span>
          <span>360 M</span>
        </div>
        <div className="scene-caption">
          <CircleDot size={14} />
          <span>TACTICAL VISUALIZATION</span>
          <b>
            Detection markers represent analysis items, not geographic position
          </b>
        </div>
      </div>
      <div className="intel-rail">
        <div className="rail-title">
          <div>
            <Label>Live intelligence</Label>
            <strong>{result ? "Analysis active" : "Awaiting input"}</strong>
          </div>
          <Activity size={18} />
        </div>
        {result ? (
          <>
            <Summary result={result} />
            {selected && (
              <DetectionBrief
                detection={selected}
                onInspect={() => setPage("analysis")}
              />
            )}
          </>
        ) : (
          <div className="empty-intel">
            <div className="orbital-icon">
              <Radar size={28} />
            </div>
            <strong>No analysis loaded</strong>
            <p>
              Submit a sonar image to activate detection markers and
              intelligence evidence.
            </p>
          </div>
        )}
        <div className="service-readout">
          <Label>System readiness</Label>
          <Readout
            label="Backend service"
            value={health ? "CONNECTED" : "OFFLINE"}
            ok={!!health}
          />
          <Readout
            label="YOLOv8 model"
            value={health?.model || "UNAVAILABLE"}
            ok={health?.model === "loaded"}
          />
          <Readout
            label="Anomaly engine"
            value={health?.anomaly_engine || "UNAVAILABLE"}
            ok={health?.anomaly_engine === "loaded"}
          />
        </div>
      </div>
      <div className="activity-dock">
        <span className="signal">
          <i />
          <i />
          <i />
          <i />
        </span>
        <div>
          <Label>Analysis channel</Label>
          <strong>
            {result
              ? `${result.image.filename} // ${result.detection_count} detections`
              : "Secure channel ready for sonar image"}
          </strong>
        </div>
        <span className="dock-time">
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          LOCAL
        </span>
      </div>
    </div>
  )
}

function Readout({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div className="readout">
      <span>{label}</span>
      <b className={ok ? "text-ok" : "text-dim"}>{value.toUpperCase()}</b>
    </div>
  )
}

function DetectionBrief({
  detection,
  onInspect,
}: {
  detection: Detection
  onInspect: () => void
}) {
  return (
    <div className={`brief brief--${statusTone(detection.status)}`}>
      <div className="brief-top">
        <Label>
          Selected detection //{" "}
          {String(detection.detection_id).padStart(2, "0")}
        </Label>
        <StatusPill status={detection.status} />
      </div>
      <strong className="object-name">{pretty(detection.yolo_class)}</strong>
      <div className="brief-metrics">
        <div>
          <span>YOLO confidence</span>
          <b>{percent(detection.yolo_confidence)}</b>
        </div>
        <div>
          <span>Feature similarity</span>
          <b>{percent(detection.feature_similarity)}</b>
        </div>
      </div>
      <div className="agreement">
        <span>Model agreement</span>
        <b>{detection.models_agree ? "YES" : "NO"}</b>
      </div>
      <Button variant="outline" onClick={onInspect}>
        Inspect evidence <ArrowRight size={15} />
      </Button>
    </div>
  )
}

function UploadZone({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void
  disabled: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const acceptFile = (file?: File) => file && onFile(file)
  return (
    <div
      className={`upload-zone ${dragging ? "dragging" : ""} ${
        disabled ? "disabled" : ""
      }`}
      onDragOver={(event: DragEvent) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event: DragEvent) => {
        event.preventDefault()
        setDragging(false)
        acceptFile(event.dataTransfer.files[0])
      }}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        hidden
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          acceptFile(event.target.files?.[0])
        }
      />
      <div className="upload-rings">
        <span />
        <span />
        <Upload size={27} />
      </div>
      <Label>Sonar input channel</Label>
      <strong>DROP SONAR IMAGE</strong>
      <p>or select an image from your system</p>
      <span className="format-list">
        JPG <i /> JPEG <i /> PNG
      </span>
    </div>
  )
}

function ImageViewer({
  original,
  annotated,
  filename,
}: {
  original: string
  annotated: string
  filename: string
}) {
  const [mode, setMode] = useState<"original" | "annotated">("annotated")
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number } | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const reset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }
  return (
    <div className="image-viewer" ref={viewerRef}>
      <div className="viewer-top">
        <div>
          <Label>Sonar image viewer</Label>
          <strong>{filename}</strong>
        </div>
        <div className="segmented">
          <Button
            variant={mode === "original" ? "primary" : "ghost"}
            disabled={!original}
            title={!original ? "Original image not retained in this older record" : "View original image"}
            onClick={() => setMode("original")}
          >
            Original
          </Button>
          <Button
            variant={mode === "annotated" ? "primary" : "ghost"}
            onClick={() => setMode("annotated")}
          >
            Annotated
          </Button>
        </div>
      </div>
      <div
        className="image-viewport"
        onMouseDown={(event: ReactMouseEvent) => {
          drag.current = {
            x: event.clientX - position.x,
            y: event.clientY - position.y,
          }
        }}
        onMouseMove={(event: ReactMouseEvent) =>
          drag.current &&
          setPosition({
            x: event.clientX - drag.current.x,
            y: event.clientY - drag.current.y,
          })
        }
        onMouseUp={() => {
          drag.current = null
        }}
        onMouseLeave={() => {
          drag.current = null
        }}
      >
        <img
          src={mode === "annotated" ? annotated : original}
          alt={`${mode} sonar analysis`}
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
        />
        <div className="viewport-grid" />
        <div className="image-mode">
          <i /> {mode.toUpperCase()} SOURCE
        </div>
      </div>
      <div className="viewer-controls">
        <Button
          variant="ghost"
          onClick={() => setScale((value) => Math.min(4, value + 0.25))}
          aria-label="Zoom in"
        >
          <ZoomIn size={16} />
        </Button>
        <span>{Math.round(scale * 100)}%</span>
        <Button
          variant="ghost"
          onClick={() => setScale((value) => Math.max(0.5, value - 0.25))}
          aria-label="Zoom out"
        >
          <ZoomOut size={16} />
        </Button>
        <Button variant="ghost" onClick={reset}>
          <Focus size={16} /> Fit
        </Button>
        <Button variant="ghost" onClick={reset}>
          <RotateCcw size={16} /> Reset
        </Button>
        <Button
          variant="ghost"
          onClick={() => viewerRef.current?.requestFullscreen()}
        >
          <Maximize2 size={16} /> Fullscreen
        </Button>
      </div>
    </div>
  )
}

function SimilarityScale({ detection }: { detection: Detection }) {
  const current = Math.max(0, Math.min(100, detection.feature_similarity * 100))
  const p05 = Math.max(0, Math.min(100, detection.class_baseline_p05 * 100))
  const p10 = Math.max(0, Math.min(100, detection.class_baseline_p10 * 100))
  return (
    <div className="similarity">
      <div className="similarity-head">
        <div>
          <Label>Reference-bank similarity</Label>
          <strong>{percent(detection.feature_similarity)}</strong>
        </div>
        <span>{pretty(detection.similarity_status)}</span>
      </div>
      <div className="scale-labels">
        <span>LOW</span>
        <span>REFERENCE BASELINE</span>
        <span>HIGH</span>
      </div>
      <div className="scale-track">
        <i className="baseline baseline--p05" style={{ left: `${p05}%` }}>
          <b>P05</b>
        </i>
        <i className="baseline baseline--p10" style={{ left: `${p10}%` }}>
          <b>P10</b>
        </i>
        <motion.i
          className="current-value"
          initial={{ left: "0%" }}
          animate={{ left: `${current}%` }}
        >
          <b>CURRENT</b>
        </motion.i>
      </div>
      <div className="scale-values">
        <span>0%</span>
        <span>P05 {percent(detection.class_baseline_p05)}</span>
        <span>P10 {percent(detection.class_baseline_p10)}</span>
        <span>100%</span>
      </div>
    </div>
  )
}

function EvidenceFlow({ detection }: { detection: Detection }) {
  const steps = [
    [
      "AI Detection",
      pretty(detection.yolo_class),
      percent(detection.yolo_confidence),
    ],
    [
      "Feature Analysis",
      "Feature similarity",
      percent(detection.feature_similarity),
    ],
    [
      "Reference Match",
      pretty(detection.feature_nearest_class),
      pretty(detection.similarity_status),
    ],
    [
      "Model Agreement",
      detection.models_agree ? "YES" : "NO",
      "Detector / reference comparison",
    ],
    [
      "TRINETRA Assessment",
      pretty(detection.status),
      detection.human_verification_required
        ? "VERIFY REQUIRED"
        : "ASSESSMENT COMPLETE",
    ],
  ]
  return (
    <Panel className="evidence-panel">
      <div className="panel-heading">
        <div>
          <Label>AI evidence</Label>
          <strong>From detection to assessment</strong>
        </div>
        <Network size={19} />
      </div>
      <div className="evidence-flow">
        {steps.map(([label, title, meta], index) => (
          <div className="evidence-step" key={label}>
            <span className="step-number">0{index + 1}</span>
            <div>
              <Label>{label}</Label>
              <strong>{title}</strong>
              <small>{meta}</small>
            </div>
            {index < steps.length - 1 && (
              <span className="flow-line">
                <i />
              </span>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}

function CropView({
  src,
  detection,
  image,
}: {
  src: string
  detection: Detection
  image: AnalysisResponse["image"]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !src) return
    const source = new Image()
    source.onload = () => {
      const [x1, y1, x2, y2] = detection.bbox
      const width = Math.max(1, x2 - x1)
      const height = Math.max(1, y2 - y1)
      canvas.width = 520
      canvas.height = 300
      canvas
        .getContext("2d")
        ?.drawImage(
          source,
          x1,
          y1,
          width,
          height,
          0,
          0,
          canvas.width,
          canvas.height,
        )
    }
    source.src = src
  }, [src, detection, image])
  return <canvas className="crop-canvas" ref={canvasRef} />
}

function DetectionDetail({
  detection,
  original,
  image,
  recordId,
  decision,
  onDecision,
}: {
  detection: Detection
  original: string
  image: AnalysisResponse["image"]
  recordId: string
  decision?: ReviewDecision
  onDecision: (key: string, value: ReviewDecision) => void
}) {
  const needsReview =
    detection.status === "REVIEW_REQUIRED" ||
    detection.status === "ANOMALY_CANDIDATE"
  return (
    <div className="detail-stack">
      <div
        className={`assessment-banner assessment-banner--${statusTone(detection.status)}`}
      >
        <div>
          <Label>AI assessment · TRINETRA status</Label>
          <strong>{pretty(detection.status)}</strong>
        </div>
        <div>
          <span>Priority</span>
          <b>
            {detection.status === "ANOMALY_CANDIDATE"
              ? "HIGH ATTENTION"
              : detection.status === "REVIEW_REQUIRED"
                ? "REVIEW"
                : "NORMAL"}
          </b>
        </div>
      </div>
      {detection.status === "ANOMALY_CANDIDATE" && (
        <div className="anomaly-note">
          <AlertTriangle size={19} />
          <div>
            <strong>LOW VISUAL SIMILARITY · HUMAN VERIFICATION REQUIRED</strong>
            <p>
              This finding has low visual similarity to the known reference
              bank. It is an anomaly candidate, not a confirmed unknown object.
            </p>
          </div>
        </div>
      )}
      <EvidenceFlow detection={detection} />
      <Panel>
        <SimilarityScale detection={detection} />
      </Panel>
      <div className="visual-pair">
        <Panel>
          <div className="panel-heading">
            <div>
              <Label>Detected region</Label>
              <strong>Bounding-box crop</strong>
            </div>
            <Box size={18} />
          </div>
          <CropView src={original} detection={detection} image={image} />
        </Panel>
        <Panel>
          <div className="panel-heading">
            <div>
              <Label>Category visualization</Label>
              <strong>{pretty(detection.yolo_class)}</strong>
            </div>
            <Layers3 size={18} />
          </div>
          <div className="category-canvas">
            <Suspense
              fallback={
                <div className="category-loading">
                  LOADING CATEGORY VISUALIZATION
                </div>
              }
            >
              <CategoryVisualization category={detection.yolo_class} />
            </Suspense>
          </div>
        </Panel>
      </div>
      <Panel>
        <div className="panel-heading">
          <div>
            <Label>Detection intelligence</Label>
            <strong>Evidence fields</strong>
          </div>
          <Database size={18} />
        </div>
        <div className="data-grid">
          <DataPoint
            label="Detection ID"
            value={`#${detection.detection_id}`}
          />
          <DataPoint label="YOLO class" value={pretty(detection.yolo_class)} />
          <DataPoint
            label="YOLO confidence"
            value={percent(detection.yolo_confidence)}
          />
          <DataPoint
            label="Nearest reference"
            value={pretty(detection.feature_nearest_class)}
          />
          <DataPoint
            label="Feature similarity"
            value={percent(detection.feature_similarity)}
          />
          <DataPoint
            label="Model agreement"
            value={detection.models_agree ? "YES" : "NO"}
          />
          <DataPoint
            label="P05 baseline"
            value={percent(detection.class_baseline_p05)}
          />
          <DataPoint
            label="P10 baseline"
            value={percent(detection.class_baseline_p10)}
          />
          <DataPoint
            label="Similarity status"
            value={pretty(detection.similarity_status)}
          />
          <DataPoint
            label="Bounding box"
            value={detection.bbox.map((item) => item.toFixed(1)).join(", ")}
          />
        </div>
      </Panel>
      {needsReview && (
        <Panel className="verification-panel">
          <div className="panel-heading">
            <div>
              <Label>Human verification</Label>
              <strong>Operator decision required</strong>
            </div>
            <ShieldCheck size={19} />
          </div>
          <p>
            These local review actions record an operator decision only. They do
            not modify or retrain the AI model.
          </p>
          {decision && (
            <div className="decision-recorded">
              <Check size={16} /> Current decision: {pretty(decision)}
            </div>
          )}
          <div className="decision-actions">
            <Button
              variant="outline"
              onClick={() =>
                onDecision(
                  reviewKey(recordId, detection.detection_id),
                  "CONFIRMED_KNOWN",
                )
              }
            >
              Confirm as known
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                onDecision(
                  reviewKey(recordId, detection.detection_id),
                  "UNDER_REVIEW",
                )
              }
            >
              Keep under review
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                onDecision(
                  reviewKey(recordId, detection.detection_id),
                  "CONFIRMED_ANOMALY_CANDIDATE",
                )
              }
            >
              Confirm anomaly candidate
            </Button>
          </div>
        </Panel>
      )}
    </div>
  )
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="data-point">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}

function DetectionList({
  detections,
  selectedId,
  onSelect,
}: {
  detections: Detection[]
  selectedId?: number
  onSelect: (id: number) => void
}) {
  return (
    <div className="detection-list">
      {detections.map((detection) => (
        <button
          key={detection.detection_id}
          className={`detection-card ${
            selectedId === detection.detection_id ? "selected" : ""
          }`}
          onClick={() => onSelect(detection.detection_id)}
        >
          <span
            className={`detection-index detection-index--${statusTone(detection.status)}`}
          >
            {String(detection.detection_id).padStart(2, "0")}
          </span>
          <div className="detection-main">
            <Label>YOLO class</Label>
            <strong>{pretty(detection.yolo_class)}</strong>
            <StatusPill status={detection.status} />
          </div>
          <div className="detection-stat">
            <span>Confidence</span>
            <b>{percent(detection.yolo_confidence)}</b>
          </div>
          <div className="detection-stat">
            <span>Similarity</span>
            <b>{percent(detection.feature_similarity)}</b>
          </div>
          <div className="detection-stat">
            <span>Nearest reference</span>
            <b>{pretty(detection.feature_nearest_class)}</b>
          </div>
          <ChevronRight size={18} />
        </button>
      ))}
    </div>
  )
}

function MissionForm({
  mission,
  setMission,
}: {
  mission: MissionMetadata
  setMission: (mission: MissionMetadata) => void
}) {
  const update = (key: keyof MissionMetadata, value: string) =>
    setMission({ ...mission, [key]: value })
  return (
    <Panel className="mission-panel">
      <div className="panel-heading">
        <div>
          <Label>Mission / survey metadata</Label>
          <strong>Operator-provided survey metadata</strong>
        </div>
        <SlidersHorizontal size={18} />
      </div>
      <p className="panel-note">
        Coordinates are entered by the operator and are not extracted
        automatically from the sonar image.
      </p>
      <div className="form-grid">
        <Field
          label="Mission ID"
          value={mission.missionId}
          onChange={(v) => update("missionId", v)}
          placeholder="NOT PROVIDED"
        />
        <Field
          label="Survey Location"
          value={mission.surveyLocation}
          onChange={(v) => update("surveyLocation", v)}
          placeholder="NOT PROVIDED"
        />
        <Field
          label="Latitude"
          value={mission.latitude}
          onChange={(v) => update("latitude", v)}
          placeholder="NOT PROVIDED"
        />
        <Field
          label="Longitude"
          value={mission.longitude}
          onChange={(v) => update("longitude", v)}
          placeholder="NOT PROVIDED"
        />
        <Field
          label="Depth"
          value={mission.depth}
          onChange={(v) => update("depth", v)}
          placeholder="NOT PROVIDED"
        />
        <Field
          label="Operator"
          value={mission.operator}
          onChange={(v) => update("operator", v)}
          placeholder="NOT PROVIDED"
        />
        <Field
          label="Date"
          value={mission.date}
          onChange={(v) => update("date", v)}
          placeholder="YYYY-MM-DD"
        />
        <Field
          label="Time"
          value={mission.time}
          onChange={(v) => update("time", v)}
          placeholder="HH:MM"
        />
        <div className="full-field">
          <Field
            label="Notes"
            value={mission.notes}
            onChange={(v) => update("notes", v)}
            placeholder="Operator notes"
            multiline
          />
        </div>
      </div>
    </Panel>
  )
}

function AnalysisPage({
  connected,
  result,
  original,
  selectedId,
  setSelectedId,
  processing,
  processLabel,
  error,
  onFile,
  recordId,
  reviews,
  onDecision,
  mission,
  setMission,
  onReset,
}: {
  connected: boolean
  result: AnalysisResponse | null
  original: string
  selectedId?: number
  setSelectedId: (id: number) => void
  processing: ProcessingState
  processLabel: string
  error: string
  onFile: (file: File) => void
  recordId: string
  reviews: Record<string, ReviewDecision>
  onDecision: (key: string, value: ReviewDecision) => void
  mission: MissionMetadata
  setMission: (mission: MissionMetadata) => void
  onReset: () => void
}) {
  const selected =
    result?.detections.find((item) => item.detection_id === selectedId) ||
    result?.detections[0]
  if (!result) {
    return (
      <PageShell
        eyebrow="Acquisition workspace"
        title="SONAR ANALYSIS"
        icon={<ScanLine />}
      >
        <div className="analysis-empty">
          <div className="empty-ocean" aria-hidden="true"><Suspense fallback={null}><SonarScene detections={[]} onSelect={() => {}} /></Suspense></div>
          <div className="empty-introduction"><Label>No active analysis</Label><h2>Discovery starts here.</h2><p>Upload a sonar image to begin detection.</p></div>
          <UploadZone
            onFile={onFile}
            disabled={!connected || processing !== "idle"}
          />
          <div className="analysis-guidance">
            <Label>Analysis sequence</Label>
            {[
              "Image acquisition",
              "YOLO detection",
              "Feature embedding",
              "Reference comparison",
              "TRINETRA assessment",
            ].map((item, i) => (
              <div key={item}>
                <span>0{i + 1}</span>
                <b>{item}</b>
              </div>
            ))}
          </div>
        </div>
        {processing !== "idle" && processing !== "complete" && (
          <ProcessingOverlay
            label={processLabel}
            slow={processLabel.includes("still")}
          />
        )}
        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <div>
              <strong>ANALYSIS UNAVAILABLE</strong>
              <span>{error}</span>
            </div>
          </div>
        )}
        {!connected && (
          <div className="offline-notice">
            <Network size={19} />
            <div>
              <strong>BACKEND OFFLINE</strong>
              <p>
                Analysis is unavailable until the TRINETRA API connection is
                restored.
              </p>
            </div>
          </div>
        )}
      </PageShell>
    )
  }
  return (
    <PageShell
      eyebrow="Completed analysis"
      title="INTELLIGENCE WORKSPACE"
      icon={<ScanLine />}
    >
      <div className="new-scan-row">
        <Button onClick={onReset}>
          <RotateCcw size={14} /> New Scan
        </Button>
      </div>
      <Summary result={result} />
      <div className="analysis-workspace">
        <ImageViewer
          original={original}
          annotated={result.annotated_image}
          filename={result.image.filename}
        />
        <div className="workspace-side">
          <div className="panel-heading">
            <div>
              <Label>TRINETRA intelligence</Label>
              <strong>
                {selected
                  ? `Detection #${selected.detection_id}`
                  : "Analysis result"}
              </strong>
            </div>
            <Radar size={18} />
          </div>
          {selected ? (
            <DetectionBrief
              detection={selected}
              onInspect={() =>
                document
                  .getElementById("detection-detail")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            />
          ) : (
            <div className="no-detection">
              <Search size={28} />
              <strong>NO OBJECTS DETECTED</strong>
              <p>
                TRINETRA did not identify objects above the detector threshold in this image.
              </p>
            </div>
          )}
        </div>
      </div>
      {result.detections.length > 0 && (
        <>
          <div className="section-head">
            <div>
              <Label>Detection register</Label>
              <strong>
                {result.detections.length} evidence item
                {result.detections.length === 1 ? "" : "s"}
              </strong>
            </div>
          </div>
          <DetectionList
            detections={result.detections}
            selectedId={selected?.detection_id}
            onSelect={setSelectedId}
          />
        </>
      )}
      {selected && (
        <div id="detection-detail">
          <Panel className="spatial-evidence"><div className="panel-heading"><div><Label>Detection visualization</Label><strong>Explore the findings in context</strong></div><span>Illustrative layout · not geographic coordinates</span></div><div className="spatial-canvas"><Suspense fallback={null}><SonarScene detections={result.detections} selectedId={selected.detection_id} onSelect={setSelectedId} /></Suspense><div className="spatial-selection"><StatusPill status={selected.status} /><strong>#{selected.detection_id} · {pretty(selected.yolo_class)}</strong><span>Click a marker to focus the camera.</span></div></div></Panel>
          <DetectionDetail
            key={selected.detection_id}
            detection={selected}
            original={original}
            image={result.image}
            recordId={recordId}
            decision={reviews[reviewKey(recordId, selected.detection_id)]}
            onDecision={onDecision}
          />
        </div>
      )}
      <MissionForm mission={mission} setMission={setMission} />
    </PageShell>
  )
}

function ProcessingOverlay({ label, slow }: { label: string; slow: boolean }) {
  return (
    <div className="processing">
      <div className="processing-sonar">
        <i />
        <i />
        <Radar size={28} />
      </div>
      <Label>TRINETRA processing pipeline</Label>
      <strong>{label}</strong>
      {slow && (
        <p>
          Analysis is taking longer than usual. The request is still active.
        </p>
      )}
    </div>
  )
}

function PageShell({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <motion.div
      className="page-shell"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="page-title">
        <div>
          <Label>{eyebrow}</Label>
          <h1>{title}</h1>
        </div>
        <span>{icon}</span>
      </div>
      {children}
    </motion.div>
  )
}

function ReviewQueue({
  history,
  reviews,
  onDecision,
  onInspect,
}: {
  history: HistoryRecord[]
  reviews: Record<string, ReviewDecision>
  onDecision: (key: string, value: ReviewDecision) => void
  onInspect: (record: HistoryRecord, detection: Detection) => void
}) {
  const items = history.flatMap((record) =>
    record.result.detections
      .filter(
        (d) =>
          d.status === "REVIEW_REQUIRED" || d.status === "ANOMALY_CANDIDATE",
      )
      .map((detection) => ({ record, detection })),
  )
  return (
    <PageShell
      eyebrow="Human verification"
      title="REVIEW QUEUE"
      icon={<ShieldCheck />}
    >
      {!items.length ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="NO ITEMS REQUIRE REVIEW"
          text="Review-required and anomaly-candidate detections from real analyses will appear here."
        />
      ) : (
        <div className="queue-list">
          {items.map(({ record, detection }) => {
            const key = reviewKey(record.id, detection.detection_id)
            return (
              <Panel
                key={key}
                className={`queue-item queue-item--${statusTone(detection.status)}`}
              >
                <div className="queue-id">
                  <CropView src={record.originalImage || record.result.annotated_image} detection={detection} image={record.result.image} />
                  <span>#{detection.detection_id}</span>
                  <small>{record.filename}</small>
                </div>
                <div>
                  <Label>Detected class</Label>
                  <strong>{pretty(detection.yolo_class)}</strong>
                </div>
                <DataPoint
                  label="Confidence"
                  value={percent(detection.yolo_confidence)}
                />
                <DataPoint
                  label="Similarity"
                  value={percent(detection.feature_similarity)}
                />
                <div>
                  <StatusPill status={detection.status} />
                  {reviews[key] && (
                    <small className="review-state">
                      Decision: {pretty(reviews[key])}
                    </small>
                  )}
                </div>
                <div className="queue-actions">
                  <Button
                    variant="ghost"
                    onClick={() => onInspect(record, detection)}
                  >
                    Inspect
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onDecision(key, "CONFIRMED_KNOWN")}
                  >
                    Known
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onDecision(key, "UNDER_REVIEW")}
                  >
                    Keep under review
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() =>
                      onDecision(key, "CONFIRMED_ANOMALY_CANDIDATE")
                    }
                  >
                    Confirm anomaly candidate
                  </Button>
                </div>
              </Panel>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}

function HistoryPage({
  history,
  onOpen,
}: {
  history: HistoryRecord[]
  onOpen: (record: HistoryRecord) => void
}) {
  return (
    <PageShell
      eyebrow="Local mission archive"
      title="ANALYSIS HISTORY"
      icon={<Archive />}
    >
      {!history.length ? (
        <EmptyState
          icon={<HistoryIcon />}
          title="NO ANALYSIS HISTORY"
          text="Completed analyses will be stored locally on this device."
        />
      ) : (
        <div className="history-list">
          {history.map((record) => (
            <button
              key={record.id}
              className="history-row"
              onClick={() => onOpen(record)}
            >
              <div className="history-icon">
                <ImageIcon size={20} />
              </div>
              <div className="history-name">
                <strong>{record.filename}</strong>
                <span>{new Date(record.timestamp).toLocaleString()}</span>
              </div>
              <DataPoint
                label="Detected"
                value={String(record.result.detection_count)}
              />
              <DataPoint
                label="Known"
                value={String(record.result.known_like_count)}
              />
              <DataPoint
                label="Review"
                value={String(record.result.review_required_count)}
              />
              <DataPoint
                label="Anomaly"
                value={String(record.result.anomaly_candidate_count)}
              />
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      )}
    </PageShell>
  )
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: ReactNode
  title: string
  text: string
}) {
  return (
    <div className="large-empty">
      <span>{icon}</span>
      <Label>Awaiting mission data</Label>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  )
}

function ReportsPage({
  record,
  original,
  reviews,
  onExportJSON,
  onExportCSV,
}: {
  record: HistoryRecord | null
  original: string
  reviews: Record<string, ReviewDecision>
  onExportJSON: () => void
  onExportCSV: () => void
}) {
  if (!record)
    return (
      <PageShell
        eyebrow="Structured output"
        title="REPORTS"
        icon={<FileText />}
      >
        <EmptyState
          icon={<FileText />}
          title="NO REPORT AVAILABLE"
          text="Complete or open an analysis to generate a structured detection report."
        />
      </PageShell>
    )
  const result = record.result
  return (
    <PageShell
      eyebrow="Structured output"
      title="DETECTION REPORT"
      icon={<FileText />}
    >
      <div className="report-actions">
        <Button onClick={() => window.print()}>
          <Printer size={16} /> Export PDF / Print
        </Button>
        <Button variant="outline" onClick={onExportJSON}>
          <FileJson size={16} /> Export JSON
        </Button>
        <Button variant="outline" onClick={onExportCSV}>
          <Download size={16} /> Export CSV
        </Button>
      </div>
      <article className="report-sheet">
        <div className="report-header">
          <div className="brand-mark">
            <Crosshair size={20} />
            <span />
          </div>
          <div>
            <Label>TRINETRA</Label>
            <h2>STRUCTURED DETECTION REPORT</h2>
            <p>AI-generated assessment for human review.</p>
          </div>
          <div className="report-code">
            <span>REPORT ID</span>
            <b>{record.id.slice(-10).toUpperCase()}</b>
          </div>
        </div>
        <div className="report-meta">
          <DataPoint
            label="Analysis timestamp"
            value={new Date(record.timestamp).toLocaleString()}
          />
          <DataPoint label="Image filename" value={result.image.filename} />
          <DataPoint
            label="Image dimensions"
            value={`${result.image.width} × ${result.image.height}`}
          />
          <DataPoint
            label="Mission ID"
            value={record.mission.missionId || "NOT PROVIDED"}
          />
          <DataPoint
            label="Survey location"
            value={record.mission.surveyLocation || "NOT PROVIDED"}
          />
          <DataPoint
            label="Operator"
            value={record.mission.operator || "NOT PROVIDED"}
          />
          <DataPoint label="Latitude (operator-provided)" value={record.mission.latitude || "NOT PROVIDED"} />
          <DataPoint label="Longitude (operator-provided)" value={record.mission.longitude || "NOT PROVIDED"} />
          <DataPoint label="Depth (operator-provided)" value={record.mission.depth || "NOT PROVIDED"} />
          <DataPoint label="Survey date / time" value={`${record.mission.date} ${record.mission.time}`.trim() || "NOT PROVIDED"} />
          <DataPoint label="Operator notes" value={record.mission.notes || "NOT PROVIDED"} />
        </div>
        <Summary result={result} />
        <div className="report-images">
          {original && (
            <figure>
              <img src={original} alt="Original sonar" />
              <figcaption>Original sonar image</figcaption>
            </figure>
          )}
          <figure>
            <img src={result.annotated_image} alt="Annotated sonar" />
            <figcaption>Backend-annotated analysis</figcaption>
          </figure>
        </div>
        <div className="report-detections">
          {result.detections.map((detection) => (
            <div key={detection.detection_id} className="report-detection">
              {original && <CropView src={original} detection={detection} image={result.image} />}
              <div>
                <Label>Detection #{detection.detection_id}</Label>
                <strong>{pretty(detection.yolo_class)}</strong>
              </div>
              <StatusPill status={detection.status} />
              <DataPoint
                label="YOLO confidence"
                value={percent(detection.yolo_confidence)}
              />
              <DataPoint
                label="Feature similarity"
                value={percent(detection.feature_similarity)}
              />
              <DataPoint
                label="Reference match"
                value={pretty(detection.feature_nearest_class)}
              />
              <DataPoint
                label="Model agreement"
                value={detection.models_agree ? "YES" : "NO"}
              />
              <DataPoint label="Bounding box" value={detection.bbox.join(", ")} />
              <DataPoint label="P05 baseline" value={percent(detection.class_baseline_p05)} />
              <DataPoint label="P10 baseline" value={percent(detection.class_baseline_p10)} />
              <DataPoint label="Similarity status" value={pretty(detection.similarity_status)} />
              <DataPoint
                label="Human verification"
                value={
                  reviews[reviewKey(record.id, detection.detection_id)]
                    ? pretty(
                        reviews[reviewKey(record.id, detection.detection_id)],
                      )
                    : detection.human_verification_required
                      ? "REQUIRED"
                      : "NOT REQUIRED"
                }
              />
            </div>
          ))}
        </div>
        <div className="report-disclaimer">
          <AlertTriangle size={17} />
          <span>
            AI-generated assessment for human review. Anomaly candidates are not
            confirmed unknown objects.
          </span>
        </div>
      </article>
    </PageShell>
  )
}

function SettingsPage({
  health,
  checking,
  onRetry,
  effects,
  setEffects,
  intensity,
  setIntensity,
  clearHistory,
}: {
  health: HealthResponse | null
  checking: boolean
  onRetry: () => void
  effects: boolean
  setEffects: (v: boolean) => void
  intensity: string
  setIntensity: (v: string) => void
  clearHistory: () => void
}) {
  const [customUrl, setCustomUrl] = useState(() => getCustomApiBaseUrl() || "")
  const [urlStatus, setUrlStatus] = useState("")

  const handleSaveUrl = () => {
    setCustomApiBaseUrl(customUrl)
    setUrlStatus("Backend URL saved! Testing connection...")
    setTimeout(() => setUrlStatus(""), 4000)
    onRetry()
  }

  const handleResetUrl = () => {
    setCustomApiBaseUrl(null)
    setCustomUrl("")
    setUrlStatus("Reset to default URL. Testing connection...")
    setTimeout(() => setUrlStatus(""), 4000)
    onRetry()
  }

  return (
    <PageShell
      eyebrow="Interface configuration"
      title="SETTINGS"
      icon={<SettingsIcon />}
    >
      <div className="settings-grid">
        <Panel>
          <div className="panel-heading">
            <div>
              <Label>System</Label>
              <strong>Backend connection</strong>
            </div>
            <Network size={18} />
          </div>
          <DataPoint label="Active Backend URL" value={getApiBaseUrl()} />
          <Readout
            label="Connection status"
            value={checking ? "CONNECTING / WAKING UP..." : health ? "CONNECTED" : "OFFLINE"}
            ok={!!health}
          />
          <div style={{ marginTop: 14 }}>
            <Field
              label="Backend URL (Render / Production / Custom)"
              value={customUrl}
              onChange={setCustomUrl}
              placeholder={getDefaultApiBaseUrl()}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Button variant="primary" onClick={handleSaveUrl}>
                Save & Connect
              </Button>
              {customUrl && (
                <Button variant="outline" onClick={handleResetUrl}>
                  Reset
                </Button>
              )}
            </div>
            {urlStatus && (
              <small style={{ color: "var(--cyan)", display: "block", marginTop: 6, fontSize: "11px" }}>
                {urlStatus}
              </small>
            )}
          </div>
          <Button variant="outline" onClick={onRetry} style={{ marginTop: 12 }}>
            <RefreshCw size={15} /> Retry connection
          </Button>
        </Panel>
        <Panel>
          <div className="panel-heading">
            <div>
              <Label>Model</Label>
              <strong>AI services</strong>
            </div>
            <Activity size={18} />
          </div>
          <Readout
            label="YOLOv8"
            value={health?.model || "UNAVAILABLE"}
            ok={health?.model === "loaded"}
          />
          <Readout
            label="TRINETRA anomaly engine"
            value={health?.anomaly_engine || "UNAVAILABLE"}
            ok={health?.anomaly_engine === "loaded"}
          />
        </Panel>
        <Panel>
          <div className="panel-heading">
            <div>
              <Label>Interface</Label>
              <strong>Visual performance</strong>
            </div>
            <SlidersHorizontal size={18} />
          </div>
          <label className="toggle-row">
            <span>
              <b>3D effects</b>
              <small>Animated sonar sweep and particles</small>
            </span>
            <input
              type="checkbox"
              checked={effects}
              onChange={(e) => setEffects(e.target.checked)}
            />
            <i />
          </label>
          <label className="field">
            <span>Animation intensity</span>
            <select
              value={intensity}
              onChange={(e) => setIntensity(e.target.value)}
            >
              <option value="reduced">Reduced</option>
              <option value="balanced">Balanced</option>
              <option value="full">Full</option>
            </select>
          </label>
        </Panel>
        <Panel>
          <div className="panel-heading">
            <div>
              <Label>Data</Label>
              <strong>Local storage</strong>
            </div>
            <Database size={18} />
          </div>
          <p className="panel-note">
            History and human verification decisions are stored only in this
            browser.
          </p>
          <Button variant="danger" onClick={clearHistory}>
            <X size={15} /> Clear local history
          </Button>
        </Panel>
      </div>
    </PageShell>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>("command")
  const [menuOpen, setMenuOpen] = useState(false)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [checking, setChecking] = useState(true)
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [original, setOriginal] = useState("")
  const [selectedId, setSelectedId] = useState<number>()
  const [processing, setProcessing] = useState<ProcessingState>("idle")
  const [processLabel, setProcessLabel] = useState("UPLOADING")
  const [error, setError] = useState("")
  const [recordId, setRecordId] = useState("")
  const [mission, setMission] = useState<MissionMetadata>(EMPTY_MISSION)
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("trinetra-history") || "[]")
    } catch {
      return []
    }
  })
  const [reviews, setReviews] = useState<Record<string, ReviewDecision>>(() => {
    try {
      return JSON.parse(localStorage.getItem("trinetra-reviews") || "{}")
    } catch {
      return {}
    }
  })
  const [effects, setEffects] = useState(
    () => localStorage.getItem("trinetra-effects") !== "false",
  )
  const [intensity, setIntensity] = useState(
    () => localStorage.getItem("trinetra-intensity") || "balanced",
  )

  const currentRecord = useMemo(
    () =>
      result
        ? {
            id: recordId,
            timestamp:
              history.find((item) => item.id === recordId)?.timestamp ||
              new Date().toISOString(),
            filename: result.image.filename,
            result,
            mission,
            originalImage: original || undefined,
          }
        : null,
    [result, recordId, mission, history, original],
  )

  const checkHealth = useCallback(async () => {
    setChecking(true)
    try {
      setHealth(await getHealth(AbortSignal.timeout(45000)))
    } catch {
      setHealth(null)
    } finally {
      setChecking(false)
    }
  }, [])
  useEffect(() => {
    checkHealth()
    const timer = window.setInterval(checkHealth, 30000)
    return () => window.clearInterval(timer)
  }, [checkHealth])
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }) }, [page])
  useEffect(() => {
    localStorage.setItem("trinetra-reviews", JSON.stringify(reviews))
  }, [reviews])
  useEffect(() => {
    localStorage.setItem("trinetra-effects", String(effects))
  }, [effects])
  useEffect(() => {
    localStorage.setItem("trinetra-intensity", intensity)
  }, [intensity])
  useEffect(() => {
    if (!recordId || !result) return
    setHistory((items) => {
      const next = items.map((item) =>
        item.id === recordId ? { ...item, mission } : item,
      )
      try {
        localStorage.setItem("trinetra-history", JSON.stringify(next))
      } catch {
        /* storage may be full because annotated images are data URLs */
      }
      return next
    })
  }, [mission, recordId, result])

  const handleNewScan = () => {
    setResult(null)
    setSelectedId(undefined)
    setRecordId("")
    setError("")
    setProcessing("idle")
    setOriginal((previous) => {
      if (previous.startsWith("blob:")) URL.revokeObjectURL(previous)
      return ""
    })
  }

  const handleFile = async (file: File) => {
    setError("")
    if (!file || file.size === 0) {
      setError("The selected file is empty.")
      return
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Invalid file. Select a JPG, JPEG or PNG sonar image.")
      return
    }
    if (!health) {
      setError("Backend offline. Analysis is unavailable.")
      return
    }
    const objectUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error("Could not read image"))
      reader.readAsDataURL(file)
    }).catch(() => "")
    if (!objectUrl) { setError("Could not read the selected image."); return }
    setOriginal((previous) => {
      if (previous.startsWith("blob:")) URL.revokeObjectURL(previous)
      return objectUrl
    })
    setProcessing("uploading")
    setProcessLabel("UPLOADING")
    setPage("analysis")
    const phases = ["PROCESSING", "DETECTING", "ASSESSING"]
    let phase = 0
    const phaseTimer = window.setInterval(() => {
      setProcessLabel(phases[Math.min(phase, phases.length - 1)])
      phase += 1
    }, 1800)
    const slowTimer = window.setTimeout(
      () => setProcessLabel("ASSESSING — still processing"),
      15000,
    )
    try {
      const data = await analyzeImage(file)
      const id = `tri-${Date.now()}`
      const record: HistoryRecord = {
        id,
        timestamp: new Date().toISOString(),
        filename: data.image.filename,
        result: data,
        mission,
        originalImage: objectUrl,
      }
      setResult(data)
      setSelectedId(data.detections[0]?.detection_id)
      setRecordId(id)
      setProcessing("complete")
      setProcessLabel("COMPLETE")
      setHistory((items) => {
        const next = [record, ...items].slice(0, 12)
        try {
          localStorage.setItem("trinetra-history", JSON.stringify(next))
        } catch {
          /* keep current session available if browser quota is exceeded */
        }
        return next
      })
    } catch (caught) {
      setProcessing("idle")
      setError(
        caught instanceof Error
          ? caught.message
          : "Analysis failed due to an unexpected network error.",
      )
    } finally {
      clearInterval(phaseTimer)
      clearTimeout(slowTimer)
    }
  }

  const setDecision = (key: string, value: ReviewDecision) =>
    setReviews((items) => ({ ...items, [key]: value }))
  const openRecord = (record: HistoryRecord, detection?: Detection) => {
    setResult(record.result)
    setRecordId(record.id)
    setMission(record.mission || EMPTY_MISSION)
    setOriginal(record.originalImage || "")
    setSelectedId(
      detection?.detection_id || record.result.detections[0]?.detection_id,
    )
    setPage("analysis")
  }
  const download = (content: string, type: string, name: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }))
    const link = document.createElement("a")
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  }
  const exportJSON = () =>
    currentRecord &&
    download(
      JSON.stringify(
        { ...currentRecord, human_verification: Object.fromEntries(Object.entries(reviews).filter(([key]) => key.startsWith(`${currentRecord.id}:`))) },
        null,
        2,
      ),
      "application/json",
      `${currentRecord.filename}-trinetra.json`,
    )
  const exportCSV = () => {
    if (!currentRecord) return
    const head = [
      "detection_id",
      "yolo_class",
      "yolo_confidence",
      "bbox",
      "feature_nearest_class",
      "feature_similarity",
      "p05",
      "p10",
      "models_agree",
      "similarity_status",
      "status",
      "human_verification_required",
      "human_verification",
    ]
    const rows = currentRecord.result.detections.map((d) =>
      [
        d.detection_id,
        d.yolo_class,
        d.yolo_confidence,
        JSON.stringify(d.bbox),
        d.feature_nearest_class,
        d.feature_similarity,
        d.class_baseline_p05,
        d.class_baseline_p10,
        d.models_agree,
        d.similarity_status,
        d.status,
        d.human_verification_required,
        reviews[reviewKey(currentRecord.id, d.detection_id)] ||
          (d.human_verification_required ? "REQUIRED" : "NOT_REQUIRED"),
      ]
        .map((value) => `"${String(value).split('"').join('""')}"`)
        .join(","),
    )
    download(
      [head.join(","), ...rows].join("\n"),
      "text/csv",
      `${currentRecord.filename}-detections.csv`,
    )
  }
  const clearHistory = () => {
    setHistory([])
    setResult(null)
    setRecordId("")
    localStorage.removeItem("trinetra-history")
  }

  return (
    <div className={`app-shell effects--${effects ? intensity : "reduced"}`}>
      {page === "command" ? <ProductExperience onAnalyze={() => setPage("analysis")} effects={effects && intensity !== "reduced"} /> : <>
      <Header
        health={health}
        checking={checking}
        onRetry={checkHealth}
        onMenu={() => setMenuOpen(true)}
      />
      <Sidebar
        page={page}
        open={menuOpen}
        setPage={setPage}
        onClose={() => setMenuOpen(false)}
      />
      <main className={`content content--${page}`}>
        <AnimatePresence mode="wait">
          {page === "analysis" && (
            <AnalysisPage
              key="analysis"
              connected={!!health}
              result={result}
              original={original}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              processing={processing}
              processLabel={processLabel}
              error={error}
              onFile={handleFile}
              recordId={recordId}
              reviews={reviews}
              onDecision={setDecision}
              mission={mission}
              setMission={setMission}
              onReset={handleNewScan}
            />
          )}
          {page === "review" && (
            <ReviewQueue
              key="review"
              history={history}
              reviews={reviews}
              onDecision={setDecision}
              onInspect={openRecord}
            />
          )}
          {page === "history" && (
            <HistoryPage key="history" history={history} onOpen={openRecord} />
          )}
          {page === "reports" && (
            <ReportsPage
              key="reports"
              record={currentRecord}
              original={original}
              reviews={reviews}
              onExportJSON={exportJSON}
              onExportCSV={exportCSV}
            />
          )}
          {page === "settings" && (
            <SettingsPage
              key="settings"
              health={health}
              checking={checking}
              onRetry={checkHealth}
              effects={effects}
              setEffects={setEffects}
              intensity={intensity}
              setIntensity={setIntensity}
              clearHistory={clearHistory}
            />
          )}
        </AnimatePresence>
      </main>
      </>}
    </div>
  )
}