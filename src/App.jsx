import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import {
  Upload, Scan, ChevronRight, ChevronLeft,
  AlertTriangle, CheckCircle, BarChart2, FileText,
  Zap, RotateCcw, Eye, Trophy, Clock, ArrowRight,
  Cpu, Key, Lock, ExternalLink
} from "lucide-react";

const PHASES = { UPLOAD: "upload", SCANNING: "scanning", REVIEW: "review", ANALYSIS: "analysis" };

function buildPGN(moves, white = "Spieler A", black = "Spieler B") {
  let pgn = `[Event "Vereinspartie"]\n[White "${white}"]\n[Black "${black}"]\n[Result "*"]\n\n`;
  moves.forEach((m, i) => {
    if (i % 2 === 0) pgn += `${Math.floor(i / 2) + 1}. `;
    pgn += `${m.san} `;
  });
  return pgn.trim();
}

function confidenceColor(c) {
  if (c >= 0.85) return "#4ade80";
  if (c >= 0.65) return "#fbbf24";
  return "#f87171";
}

function ConfidenceBadge({ value }) {
  const pct = Math.round(value * 100);
  const color = confidenceColor(value);
  return (
    <span style={{ color, border: `1px solid ${color}`, borderRadius: 4, padding: "1px 7px", fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>
      {pct}%
    </span>
  );
}

async function extractMovesWithClaude(base64Image, mediaType, apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
          {
            type: "text",
            text: `Du bist ein Schach-OCR-Spezialist. Analysiere diesen handschriftlichen Partiezettel sorgfältig.

Extrahiere:

1. Namen der Spieler (Weiß und Schwarz)
2. Alle Züge in der richtigen Reihenfolge

WICHTIG - Deutsche Notation umwandeln:

- S oder Sp → N (Springer/Knight)
- L → B (Läufer/Bishop)
- T → R (Turm/Rook)
- D → Q (Dame/Queen)
- K → K (König/King)
- Bauernzüge bleiben gleich (e4, d5, etc.)
- Schlagzüge: "Sxe5", "Lxd7" etc.
- Rochade: "0-0" → "O-O", "0-0-0" → "O-O-O"

Gib NUR dieses JSON zurück (keine Backticks, keine Erklärungen):
{
  "white": "Spielername",
  "black": "Spielername",
  "moves": [
    {"san": "d4", "raw": "d4", "confidence": 0.98},
    {"san": "Nf6", "raw": "Sf6", "confidence": 0.92}
  ]
}

Bei unleserlichen Zügen: confidence unter 0.6 und beste Schätzung als san.`
          }
        ]
      }]
    })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `API Fehler: ${response.status}`);
  }
  const data = await response.json();
  const text = data.content?.[0]?.text || "{}";
  const clean = text.replace(/`json|`/g, "").trim();
  return JSON.parse(clean);
}

const DEMO_DATA = {
  white: "Michael Baissler",
  black: "Kravczik",
  moves: [
    { san: "d4",  raw: "d4",  confidence: 0.97 },
    { san: "d5",  raw: "d5",  confidence: 0.96 },
    { san: "c4",  raw: "c4",  confidence: 0.95 },
    { san: "Nf6", raw: "Sf6", confidence: 0.92 },
    { san: "e3",  raw: "e3",  confidence: 0.98 },
    { san: "e6",  raw: "e6",  confidence: 0.97 },
    { san: "Nf3", raw: "Sf3", confidence: 0.93 },
    { san: "Nc6", raw: "Sc6", confidence: 0.89 },
    { san: "Bd3", raw: "Ld3", confidence: 0.91 },
    { san: "Nb4", raw: "Sb4", confidence: 0.62 },
    { san: "Be2", raw: "Le2", confidence: 0.94 },
    { san: "Bd7", raw: "Ld7", confidence: 0.88 },
    { san: "O-O", raw: "0-0", confidence: 0.96 },
    { san: "h6",  raw: "h6",  confidence: 0.95 },
    { san: "Bg5", raw: "Lg5", confidence: 0.55 },
  ]
};

function ApiKeyModal({ onSave, onDemo }) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!key.startsWith("sk-ant-")) {
      setError("Anthropic API Keys beginnen mit 'sk-ant-'");
      return;
    }
    onSave(key.trim());
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: "#1a1208", border: "1px solid #3a2c18", borderRadius: 20, padding: 40, maxWidth: 460, width: "100%", boxShadow: "0 25px 80px rgba(0,0,0,0.8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg, #d4a854, #8b5e1a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Key size={22} color="#1a1208" />
          </div>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#f5e6c8", margin: 0 }}>Anthropic API Key</h2>
            <p style={{ color: "#7a6a50", fontSize: 13, margin: 0 }}>Für echte Claude Vision OCR</p>
          </div>
        </div>
        <p style={{ color: "#9a8a70", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          ScoreVision nutzt Claude Vision um handschriftliche Partiezettel zu lesen. Dein API Key wird nur lokal im Browser gespeichert.
        </p>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#7a6a50", fontSize: 12, display: "block", marginBottom: 6, fontFamily: "monospace" }}>API KEY</label>
          <div style={{ position: "relative" }}>
            <input
              type={show ? "text" : "password"}
              value={key}
              onChange={e => { setKey(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              placeholder="sk-ant-api03-…"
              style={{ width: "100%", background: "#0d0b07", border: `1px solid ${error ? "#f87171" : "#3a2c18"}`, borderRadius: 10, padding: "12px 44px 12px 14px", color: "#f5e6c8", fontFamily: "monospace", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
            <button onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#5a4a30", cursor: "pointer", padding: 0 }}>
              <Eye size={16} />
            </button>
          </div>
          {error && <p style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{error}</p>}
        </div>
        <a href="https://console.anthropic.com/keys" target="_blank" rel="noreferrer" style={{ color: "#d4a854", fontSize: 13, display: "flex", alignItems: "center", gap: 5, marginBottom: 24, textDecoration: "none" }}>
          <ExternalLink size={13} /> API Key erstellen auf console.anthropic.com
        </a>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={!key} style={{ flex: 1, background: key ? "linear-gradient(135deg, #d4a854, #b8892e)" : "#2a1e0e", border: "none", borderRadius: 10, padding: "13px", color: key ? "#1a1208" : "#5a4a30", fontWeight: 700, fontSize: 14, cursor: key ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Lock size={16} /> Key speichern &amp; starten
          </button>
          <button onClick={onDemo} style={{ background: "transparent", border: "1px solid #3a2c18", borderRadius: 10, padding: "13px 18px", color: "#7a6a50", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
            Demo-Modus
          </button>
        </div>
        <p style={{ color: "#5a4a30", fontSize: 11, marginTop: 14, textAlign: "center" }}>Key wird nur in localStorage gespeichert</p>
      </div>
    </div>
  );
}

function UploadPhase({ onScan, apiKey, onChangeKey }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, padding: "40px 0" }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, color: "#f5e6c8", margin: 0 }}>Partiezettel hochladen</h2>
        <p style={{ color: "#9a8a70", marginTop: 8, fontSize: 15 }}>Claude Vision erkennt Züge automatisch — auch handschriftlich</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: apiKey ? "rgba(74,222,128,0.08)" : "rgba(251,191,36,0.08)", border: `1px solid ${apiKey ? "rgba(74,222,128,0.3)" : "rgba(251,191,36,0.3)"}`, borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>
        {apiKey ? <><CheckCircle size={14} color="#4ade80" /><span style={{ color: "#4ade80" }}>API Key aktiv — echte OCR</span></> : <><AlertTriangle size={14} color="#fbbf24" /><span style={{ color: "#fbbf24" }}>Demo-Modus (kein API Key)</span></>}
        <button onClick={onChangeKey} style={{ marginLeft: 8, background: "transparent", border: "1px solid #3a2c18", borderRadius: 5, padding: "2px 8px", color: "#7a6a50", fontSize: 12, cursor: "pointer" }}>ändern</button>
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => document.getElementById("fileInput").click()}
        style={{ width: 420, height: 280, border: `2px dashed ${dragging ? "#d4a854" : "#4a3c28"}`, borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, cursor: "pointer", background: dragging ? "rgba(212,168,84,0.06)" : "rgba(255,255,255,0.02)", transition: "all 0.2s", overflow: "hidden" }}
      >
        <input id="fileInput" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
        {preview ? <img src={preview} alt="Vorschau" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <><Upload size={40} color="#4a3c28" /><span style={{ color: "#7a6a50", fontSize: 15 }}>Foto hier ablegen</span><span style={{ color: "#5a4a30", fontSize: 13 }}>JPG, PNG, HEIC · klicken zum Auswählen</span></>}
      </div>
      {file && <p style={{ color: "#7a6a50", fontSize: 13, margin: 0 }}>{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
      <button onClick={() => onScan(file)} style={{ background: "linear-gradient(135deg, #d4a854, #b8892e)", border: "none", borderRadius: 10, padding: "14px 40px", color: "#1a1208", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(212,168,84,0.3)" }}>
        <Scan size={18} />
        {file && apiKey ? "Mit Claude Vision scannen" : file ? "Demo-Scan (kein Key)" : "Demo starten"}
      </button>
    </div>
  );
}

function ScanningPhase({ progress }) {
  const steps = [
    { label: "Bild laden & komprimieren", done: progress > 0 },
    { label: "An Claude Vision API senden", done: progress > 1, active: progress === 1 },
    { label: "Notation extrahieren & konvertieren", done: progress > 2, active: progress === 2 },
    { label: "Züge mit chess.js validieren", done: progress > 3, active: progress === 3 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, padding: "48px 0" }}>
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: "#d4a854", animation: "spin 1s linear infinite" }} />
        <div style={{ position: "absolute", inset: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><Cpu size={28} color="#d4a854" /></div>
      </div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: "#f5e6c8", margin: 0 }}>Claude Vision analysiert…</h2>
      <p style={{ color: "#7a6a50", fontSize: 14, margin: 0 }}>Das kann bei langen Partien 10–20 Sekunden dauern</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 340 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {s.done ? <CheckCircle size={16} color="#4ade80" /> : s.active ? <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #d4a854", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", flexShrink: 0 }} /> : <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #3a2c18", flexShrink: 0 }} />}
            <span style={{ color: s.done ? "#9a8a70" : s.active ? "#f5e6c8" : "#5a4a30", fontSize: 14 }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewPhase({ moves, imagePreview, white, black, onComplete }) {
  const [moveIndex, setMoveIndex] = useState(0);
  const [confirmedMoves, setConfirmedMoves] = useState([]);
  const [game, setGame] = useState(new Chess());
  const [correction, setCorrection] = useState("");
  const [correctionError, setCorrectionError] = useState("");

  const current = moves[moveIndex];
  const isIllegal = current && (() => {
    if (!current.san) return true;
    const g = new Chess(game.fen());
    try { const r = g.move(current.san); return !r; } catch { return true; }
  })();
  const isLowConf = current && current.confidence < 0.80;
  const needsReview = isLowConf || isIllegal;

  const confirmMove = (san) => {
    const g = new Chess(game.fen());
    try {
      const result = g.move(san);
      if (!result) throw new Error();
      setGame(g);
      const newConfirmed = [...confirmedMoves, { ...current, san, confirmed: true }];
      setConfirmedMoves(newConfirmed);
      setCorrectionError(""); setCorrection("");
      if (moveIndex + 1 >= moves.length) {
        onComplete(g, newConfirmed, white, black);
      } else {
        setMoveIndex(i => i + 1);
      }
    } catch { setCorrectionError("Ungültiger Zug! Notation prüfen (z.B. Re1, Nf3, O-O)"); }
  };

  const moveNum = Math.floor(moveIndex / 2) + 1;
  const isWhite = moveIndex % 2 === 0;
  const progress = (moveIndex / moves.length) * 100;

  return (
    <div style={{ display: "flex", gap: 24, width: "100%", minHeight: 540 }}>
      <div style={{ flex: 1, background: "#12100a", borderRadius: 14, border: "1px solid #2a1e0e", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#9a8a70", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><Eye size={14} /> Partiezettel</span>
          <span style={{ color: "#5a4a30", fontSize: 11, fontFamily: "monospace" }}>{white} vs {black}</span>
        </div>
        <div style={{ flex: 1, borderRadius: 8, overflow: "hidden", background: "#0a0804", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 220 }}>
          {imagePreview ? <img src={imagePreview} alt="Partiezettel" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ color: "#3a2c18", fontSize: 13 }}>Demo-Modus</span>}
        </div>
        <div style={{ borderTop: "1px solid #2a1e0e", paddingTop: 12 }}>
          <p style={{ color: "#7a6a50", fontSize: 12, margin: "0 0 8px" }}>Alle erkannten Züge</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 72, overflowY: "auto" }}>
            {moves.map((m, i) => (
              <span key={i} style={{ padding: "2px 6px", borderRadius: 4, fontSize: 11, fontFamily: "monospace", background: i === moveIndex ? "rgba(212,168,84,0.2)" : "transparent", color: i < moveIndex ? "#4a3c28" : i === moveIndex ? "#d4a854" : "#7a6a50", border: i === moveIndex ? "1px solid rgba(212,168,84,0.4)" : "1px solid transparent" }}>
                {i % 2 === 0 && <span style={{ opacity: 0.5 }}>{Math.floor(i / 2) + 1}.</span>} {m.raw}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#f5e6c8", fontFamily: "monospace", fontSize: 16, fontWeight: 700 }}>"{current?.raw}"</span>
          <ConfidenceBadge value={current?.confidence ?? 1} />
        </div>
      </div>
      <div style={{ flex: 1.1, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#9a8a70", fontSize: 13 }}>Zug {moveIndex + 1} / {moves.length}</span>
            <span style={{ color: "#d4a854", fontSize: 13, fontWeight: 600 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 4, background: "#2a1e0e", borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #b8892e, #d4a854)", borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        </div>
        <div style={{ borderRadius: 10, overflow: "hidden", border: "2px solid #2a1e0e" }}>
          <Chessboard position={game.fen()} boardWidth={340} customDarkSquareStyle={{ backgroundColor: "#4a3220" }} customLightSquareStyle={{ backgroundColor: "#e8d5b0" }} areArrowsAllowed={false} />
        </div>
        {needsReview ? (
          <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <AlertTriangle size={18} color="#fbbf24" />
              <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 14 }}>Zug {moveNum}{isWhite ? "." : "…"} – {isIllegal ? "Illegaler Zug!" : "Niedrige Konfidenz"}</span>
            </div>
            <p style={{ color: "#c4a860", fontSize: 13, margin: "0 0 12px" }}>
              {isIllegal ? `Claude erkannte "${current?.raw}" → auf dem Brett nicht möglich.` : `Claude erkannte "${current?.raw}" mit nur ${Math.round((current?.confidence ?? 0) * 100)}% Konfidenz.`}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={correction} onChange={e => { setCorrection(e.target.value); setCorrectionError(""); }} onKeyDown={e => e.key === "Enter" && confirmMove(correction || current?.san)} placeholder={`Korrektur (z.B. ${current?.san || "Re1"})`} style={{ flex: 1, background: "#1a1208", border: `1px solid ${correctionError ? "#f87171" : "#3a2c18"}`, borderRadius: 8, padding: "10px 12px", color: "#f5e6c8", fontFamily: "monospace", fontSize: 14, outline: "none" }} />
              <button onClick={() => confirmMove(correction || current?.san)} style={{ background: "#d4a854", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", color: "#1a1208", fontWeight: 700 }}><CheckCircle size={18} /></button>
            </div>
            {correctionError && <p style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{correctionError}</p>}
            {!isIllegal && <button onClick={() => confirmMove(current?.san)} style={{ marginTop: 10, background: "transparent", border: "none", color: "#7a6a50", fontSize: 12, cursor: "pointer", padding: 0 }}>Trotzdem übernehmen →</button>}
          </div>
        ) : (
          <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle size={18} color="#4ade80" />
              <span style={{ color: "#4ade80", fontWeight: 600 }}>{moveNum}{isWhite ? "." : "…"} "{current?.san}" ✓</span>
            </div>
            <button onClick={() => confirmMove(current?.san)} style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", color: "#4ade80", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              Bestätigen <ChevronRight size={16} />
            </button>
          </div>
        )}
        <button onClick={() => onComplete(game, confirmedMoves, white, black)} style={{ background: "transparent", border: "none", color: "#5a4a30", fontSize: 13, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
          <ArrowRight size={14} /> Direkt zur Analyse
        </button>
      </div>
    </div>
  );
}

function AnalysisPhase({ game, white, black, onReset }) {
  const [currentPly, setCurrentPly] = useState(0);
  const history = game.history({ verbose: true });
  const pgn = buildPGN(history.map(m => ({ san: m.san })), white, black);

  const replayFen = (() => {
    const g = new Chess();
    history.slice(0, currentPly).forEach(m => { try { g.move(m.san); } catch {} });
    return g.fen();
  })();

  return (
    <div style={{ display: "flex", gap: 24, width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ borderRadius: 10, overflow: "hidden", border: "2px solid #2a1e0e" }}>
          <Chessboard position={replayFen} boardWidth={320} customDarkSquareStyle={{ backgroundColor: "#4a3220" }} customLightSquareStyle={{ backgroundColor: "#e8d5b0" }} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={() => setCurrentPly(0)} style={{ background: "#1e1610", border: "1px solid #2a1e0e", borderRadius: 8, padding: "8px 12px", color: "#d4a854", cursor: "pointer", fontSize: 12 }}>⏮</button>
          <button onClick={() => setCurrentPly(p => Math.max(0, p - 1))} style={{ background: "#1e1610", border: "1px solid #2a1e0e", borderRadius: 8, padding: "8px 16px", color: "#d4a854", cursor: "pointer" }}><ChevronLeft size={18} /></button>
          <button onClick={() => setCurrentPly(p => Math.min(history.length, p + 1))} style={{ background: "#1e1610", border: "1px solid #2a1e0e", borderRadius: 8, padding: "8px 16px", color: "#d4a854", cursor: "pointer" }}><ChevronRight size={18} /></button>
          <button onClick={() => setCurrentPly(history.length)} style={{ background: "#1e1610", border: "1px solid #2a1e0e", borderRadius: 8, padding: "8px 12px", color: "#d4a854", cursor: "pointer", fontSize: 12 }}>⏭</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, background: "#1e1610", borderRadius: 10, padding: 14, border: "1px solid #2a1e0e", textAlign: "center" }}>
            <Trophy size={18} color="#d4a854" style={{ marginBottom: 4 }} />
            <div style={{ color: "#f5e6c8", fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>{white}</div>
            <div style={{ color: "#7a6a50", fontSize: 10 }}>Weiß</div>
          </div>
          <div style={{ flex: 1, background: "#1e1610", borderRadius: 10, padding: 14, border: "1px solid #2a1e0e", textAlign: "center" }}>
            <Clock size={18} color="#9a8a70" style={{ marginBottom: 4 }} />
            <div style={{ color: "#f5e6c8", fontSize: 20, fontWeight: 700 }}>{history.length}</div>
            <div style={{ color: "#7a6a50", fontSize: 10 }}>Züge</div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "#12100a", borderRadius: 12, border: "1px solid #2a1e0e", padding: 16, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <BarChart2 size={16} color="#9a8a70" />
            <span style={{ color: "#9a8a70", fontSize: 13, fontWeight: 600 }}>{white} vs {black}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {history.map((m, i) => {
              const isW = i % 2 === 0;
              const isActive = i === currentPly - 1;
              return (
                <span key={i} onClick={() => setCurrentPly(i + 1)} style={{ cursor: "pointer", padding: "3px 8px", borderRadius: 5, background: isActive ? "#d4a854" : "transparent", color: isActive ? "#1a1208" : "#c4a860", fontSize: 13, fontFamily: "monospace", fontWeight: isActive ? 700 : 400 }}>
                  {isW && <span style={{ color: isActive ? "#1a1208" : "#5a4a30" }}>{Math.floor(i / 2) + 1}. </span>}
                  {m.san}
                </span>
              );
            })}
          </div>
        </div>
        <div style={{ background: "#12100a", borderRadius: 12, border: "1px solid #2a1e0e", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={16} color="#9a8a70" />
              <span style={{ color: "#9a8a70", fontSize: 13, fontWeight: 600 }}>PGN Export</span>
            </div>
            <button onClick={() => navigator.clipboard?.writeText(pgn)} style={{ background: "transparent", border: "1px solid #3a2c18", borderRadius: 6, padding: "4px 12px", color: "#7a6a50", fontSize: 12, cursor: "pointer" }}>Kopieren</button>
          </div>
          <pre style={{ color: "#7a6a50", fontSize: 11, fontFamily: "monospace", background: "#0a0804", borderRadius: 6, padding: 10, margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6, maxHeight: 140, overflowY: "auto" }}>{pgn}</pre>
        </div>
        <button onClick={onReset} style={{ background: "transparent", border: "1px solid #2a1e0e", borderRadius: 8, padding: "10px 20px", color: "#5a4a30", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
          <RotateCcw size={14} /> Neue Partie scannen
        </button>
      </div>
    </div>
  );
}

export default function ChessScoreApp() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("anthropic_key") || "");
  const [showKeyModal, setShowKeyModal] = useState(() => !localStorage.getItem("anthropic_key"));
  const [phase, setPhase] = useState(PHASES.UPLOAD);
  const [scanProgress, setScanProgress] = useState(0);
  const [extractedMoves, setExtractedMoves] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [finalGame, setFinalGame] = useState(null);
  const [finalMoves, setFinalMoves] = useState([]);
  const [white, setWhite] = useState("Spieler A");
  const [black, setBlack] = useState("Spieler B");
  const [error, setError] = useState(null);

  const saveKey = (key) => { localStorage.setItem("anthropic_key", key); setApiKey(key); setShowKeyModal(false); };

  const handleScan = async (file) => {
    setPhase(PHASES.SCANNING); setError(null); setScanProgress(0);
    if (!file || !apiKey) {
      for (let i = 1; i <= 4; i++) { await new Promise(r => setTimeout(r, 600)); setScanProgress(i); }
      setWhite(DEMO_DATA.white); setBlack(DEMO_DATA.black); setExtractedMoves(DEMO_DATA.moves);
      setPhase(PHASES.REVIEW); return;
    }
    try {
      setScanProgress(1);
      const [base64, previewUrl] = await Promise.all([
        new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); }),
        new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); }),
      ]);
      setImagePreview(previewUrl); setScanProgress(2);
      const result = await extractMovesWithClaude(base64, file.type || "image/jpeg", apiKey);
      setScanProgress(3); await new Promise(r => setTimeout(r, 300)); setScanProgress(4);
      setWhite(result.white || "Spieler A"); setBlack(result.black || "Spieler B");
      setExtractedMoves(result.moves || []); setPhase(PHASES.REVIEW);
    } catch (err) { setError(`Fehler: ${err.message}`); setPhase(PHASES.UPLOAD); }
  };

  const handleReset = () => { setPhase(PHASES.UPLOAD); setFinalGame(null); setFinalMoves([]); setExtractedMoves([]); setImagePreview(null); setScanProgress(0); setError(null); };

  const phaseOrder = [PHASES.UPLOAD, PHASES.SCANNING, PHASES.REVIEW, PHASES.ANALYSIS];
  const tabLabels = [{ key: PHASES.UPLOAD, label: "Upload" }, { key: PHASES.SCANNING, label: "Scan" }, { key: PHASES.REVIEW, label: "Smart Review" }, { key: PHASES.ANALYSIS, label: "Analyse" }];
  const currentIdx = phaseOrder.indexOf(phase);

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=IBM+Plex+Mono:wght@400;600&family=Crimson+Pro:wght@400;600&display=swap'); * { box-sizing: border-box; } body { margin: 0; background: #0d0b07; } @keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } } input::placeholder { color: #4a3c28; }`}</style>
      {showKeyModal && <ApiKeyModal onSave={saveKey} onDemo={() => { setApiKey(""); setShowKeyModal(false); }} />}
      <div style={{ minHeight: "100vh", background: "#0d0b07", backgroundImage: "radial-gradient(ellipse at 20% 10%, rgba(212,168,84,0.06) 0%, transparent 50%)", fontFamily: "'Crimson Pro', Georgia, serif", color: "#f5e6c8" }}>
        <div style={{ borderBottom: "1px solid #1e1610", padding: "18px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(13,11,7,0.9)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 99 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #d4a854, #8b5e1a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>♟</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px" }}>ScoreVision</div>
              <div style={{ fontSize: 11, color: "#7a6a50", marginTop: -2, fontFamily: "'IBM Plex Mono', monospace" }}>Partiezettel · Claude Vision OCR</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            {tabLabels.map((t, i) => {
              const done = i < currentIdx; const active = i === currentIdx;
              return (
                <div key={t.key} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: active ? "rgba(212,168,84,0.15)" : "transparent", border: active ? "1px solid rgba(212,168,84,0.4)" : "1px solid transparent" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: done ? "#d4a854" : active ? "rgba(212,168,84,0.3)" : "#1e1610", border: active ? "2px solid #d4a854" : done ? "none" : "2px solid #2a1e0e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: done ? "#1a1208" : "#d4a854", fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: active ? "#d4a854" : done ? "#9a8a70" : "#3a2c18" }}>{t.label}</span>
                  </div>
                  {i < tabLabels.length - 1 && <div style={{ width: 20, height: 1, background: done ? "#d4a854" : "#1e1610" }} />}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 24px", animation: "fadeIn 0.4s ease" }}>
          {error && <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: 16, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}><AlertTriangle size={18} color="#f87171" /><span style={{ color: "#f87171", fontSize: 14 }}>{error}</span></div>}
          {phase === PHASES.UPLOAD && <UploadPhase onScan={handleScan} apiKey={apiKey} onChangeKey={() => setShowKeyModal(true)} />}
          {phase === PHASES.SCANNING && <ScanningPhase progress={scanProgress} />}
          {phase === PHASES.REVIEW && <ReviewPhase moves={extractedMoves} imagePreview={imagePreview} white={white} black={black} onComplete={(g, m, w, b) => { setFinalGame(g); setFinalMoves(m); setWhite(w); setBlack(b); setPhase(PHASES.ANALYSIS); }} />}
          {phase === PHASES.ANALYSIS && <AnalysisPhase game={finalGame} white={white} black={black} onReset={handleReset} />}
        </div>
      </div>
    </>
  );
}
