import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Home, PlusCircle, Users, RefreshCw, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, XCircle, Clock, Ban, ChevronRight,
  Loader2, Table2, BarChart3, Search, X, Wallet, Target, Percent, Activity
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

/* ============================================================================
   CONFIGURACIÓN
   ============================================================================
   API_URL: URL /exec de tu Google Apps Script ya desplegada.
   USE_MOCK: mientras el backend no tenga la columna "Deporte" ni maneje el
   estado "ANULADA", deja esto en true para trabajar 100% funcional con datos
   de prueba. Cuando actualices Code.gs (ver notas al final del archivo),
   cambia a false.
   ============================================================================ */
const API_URL = "https://script.google.com/macros/s/AKfycbxbUfvvWD-QVGnLOAD7sEYol7e9X58dlXNIbL0Nm-TlG5s3ncZPgjHidWXFxaLI1LtC/exec";
const USE_MOCK = false;

/* ============================================================================
   CONSTANTES DE DOMINIO
   ============================================================================ */
const CASAS = ["Betplay", "Stake", "Bwin", "Rushbet"];
const DEPORTES = ["Fútbol", "Baloncesto", "Béisbol", "Tenis", "NFL", "MMA", "Esports", "Otro"];
const TIPSTERS_DEFAULT = [
  "Roi Canal Gratuito", "El Profesor", "Vision Deportes", "Sharpods", "Filtraciones",
  "Betlive", "Griko", "Santiago Gambler", "Enigmario", "Propias",
];
const MONTO_INICIAL_POR_CASA = 100000; // COP, banca inicial asumida por casa

// Índices EXACTOS de columnas tal como los devuelve la matriz de Apps Script
const COL = {
  ID: 0, FECHA: 1, TIPSTER: 2, CASA: 3, PARTIDO: 4, DEPORTE: 5,
  ID_PARTIDO_API: 6, MERCADO: 7, CUOTA: 8, MONTO: 9, ESTADO: 10,
  BENEFICIO: 11, CUOTA_CIERRE: 12, CLV: 13, MES: 14,
};

/* ============================================================================
   MOCK DATA — matriz cruda tal como la entregaría Apps Script (array de arrays)
   Índices: [ID, Fecha, Tipster, Casa, Partido, Deporte, ID_Partido_API,
             Mercado, Cuota, Monto, Estado, Beneficio, Cuota_Cierre, CLV, Mes]
   ============================================================================ */
const MOCK_BETS_MATRIX = [
  ["AP-1001", "2026-07-02", "El Profesor", "Bwin", "Real Madrid vs Barcelona", "Fútbol", "8841021", "Más de 2.5 goles", 1.85, 100000, "GANADA", 85000, 1.72, "SI", "2026-07"],
  ["AP-1002", "2026-07-03", "Roi Canal Gratuito", "Betplay", "Lakers vs Celtics", "Baloncesto", "8841099", "Hándicap -4.5", 1.90, 120000, "PERDIDA", -120000, 1.95, "NO", "2026-07"],
  ["AP-1003", "2026-07-03", "Sharpods", "Stake", "Yankees vs Red Sox", "Béisbol", "8841102", "Total carreras Más de 8.5", 2.05, 80000, "GANADA", 84000, 1.88, "SI", "2026-07"],
  ["AP-1004", "2026-07-04", "Vision Deportes", "Rushbet", "Nadal vs Alcaraz", "Tenis", "8841150", "Ganador del partido", 1.65, 150000, "PERDIDA", -150000, 1.60, "NO", "2026-07"],
  ["AP-1005", "2026-07-05", "Filtraciones", "Bwin", "Chiefs vs Bills", "NFL", "8841201", "Hándicap +3", 1.95, 100000, "GANADA", 95000, 1.80, "SI", "2026-07"],
  ["AP-1006", "2026-07-06", "Betlive", "Betplay", "River Plate vs Boca Juniors", "Fútbol", "8841233", "Doble oportunidad 1X", 1.45, 200000, "PERDIDA", -200000, 1.50, "NO", "2026-07"],
  ["AP-1007", "2026-07-07", "Griko", "Stake", "McGregor vs Poirier", "MMA", "8841260", "Gana por KO", 2.40, 90000, "ANULADA", 0, "", "", "2026-07"],
  ["AP-1008", "2026-07-08", "Santiago Gambler", "Rushbet", "T1 vs Gen.G", "Esports", "8841299", "Mapa 1 - T1", 1.75, 110000, "GANADA", 82500, 1.65, "SI", "2026-07"],
  ["AP-1009", "2026-07-09", "Enigmario", "Bwin", "Millonarios vs Nacional", "Fútbol", "8841320", "Ambos anotan", 1.95, 130000, "GANADA", 123500, 1.82, "SI", "2026-07"],
  ["AP-1010", "2026-07-10", "Propias", "Betplay", "Warriors vs Suns", "Baloncesto", "8841360", "Total Más de 224.5", 1.87, 100000, "PERDIDA", -100000, 1.90, "NO", "2026-07"],
  ["AP-1011", "2026-07-11", "El Profesor", "Stake", "PSG vs Marsella", "Fútbol", "8841390", "Más de 3.5 goles", 2.40, 90000, "GANADA", 126000, 2.10, "SI", "2026-07"],
  ["AP-1012", "2026-07-12", "Roi Canal Gratuito", "Rushbet", "Junior vs América", "Fútbol", "8841410", "Hándicap -1", 2.10, 80000, "PERDIDA", -80000, 2.05, "NO", "2026-07"],
  ["AP-1013", "2026-07-13", "Vision Deportes", "Bwin", "Djokovic vs Sinner", "Tenis", "8841440", "Total games Más de 21.5", 1.90, 120000, "GANADA", 108000, 1.78, "SI", "2026-07"],
  ["AP-1014", "2026-07-14", "Sharpods", "Betplay", "Dodgers vs Padres", "Béisbol", "8841470", "Línea de dinero visitante", 2.20, 70000, "ANULADA", 0, "", "", "2026-07"],
  ["AP-1015", "2026-07-15", "Filtraciones", "Stake", "Eagles vs Cowboys", "NFL", "8841500", "Total Más de 47.5", 1.90, 110000, "PERDIDA", -110000, 1.95, "NO", "2026-07"],
  ["AP-1016", "2026-07-16", "Betlive", "Rushbet", "Nacional vs Junior", "Fútbol", "8841530", "Más de 2.5 goles", 1.80, 140000, "GANADA", 112000, 1.70, "SI", "2026-07"],
  ["AP-1017", "2026-07-17", "Griko", "Bwin", "Real Madrid vs Atlético", "Fútbol", "8841560", "Empate", 3.20, 60000, "PERDIDA", -60000, 3.10, "NO", "2026-07"],
  ["AP-1018", "2026-07-18", "Santiago Gambler", "Betplay", "Fnatic vs G2", "Esports", "8841590", "Mapa 2 - G2", 1.95, 90000, "GANADA", 85500, 1.85, "SI", "2026-07"],
  ["AP-1019", "2026-07-18", "Enigmario", "Stake", "Heat vs Bucks", "Baloncesto", "8841610", "Hándicap +5.5", 1.90, 100000, "PENDIENTE", 0, "", "", "2026-07"],
  ["AP-1020", "2026-07-19", "Propias", "Rushbet", "Alcaraz vs Zverev", "Tenis", "8841640", "Ganador del partido", 1.55, 160000, "GANADA", 88000, 1.48, "SI", "2026-07"],
  ["AP-1021", "2026-07-19", "El Profesor", "Bwin", "Cardinals vs Cubs", "Béisbol", "8841670", "Total carreras Menos de 8.5", 1.85, 90000, "PENDIENTE", 0, "", "", "2026-07"],
  ["AP-1022", "2026-07-20", "Roi Canal Gratuito", "Betplay", "Bengals vs Ravens", "NFL", "8841700", "Hándicap -2.5", 1.95, 100000, "PENDIENTE", 0, "", "", "2026-07"],
  ["AP-1023", "2026-07-20", "Vision Deportes", "Stake", "Boca Juniors vs Independiente", "Fútbol", "8841730", "Ambos anotan", 1.75, 120000, "GANADA", 90000, 1.68, "SI", "2026-07"],
  ["AP-1024", "2026-07-21", "Griko", "Rushbet", "Liverpool vs Man City", "Fútbol", "8841760", "Más de 2.5 goles", 1.90, 110000, "PENDIENTE", 0, "", "", "2026-07"],
];

// Auditoría de tipsters simulada EXACTAMENTE con las cabeceras de la hoja real,
// para validar que el parseo por nombre de columna funcione sin depender de camelCase.
const MOCK_TIPSTERS_SHEET_ROWS = [
  { "Tipster": "Roi Canal Gratuito", "Total Apuestas": 3, "Total Invertido": 300000, "Beneficio Neto": -95000, "Yield %": -31.7, "Acierto (%)": 33.3, "Estatus": "EN OBSERVACIÓN" },
  { "Tipster": "El Profesor", "Total Apuestas": 3, "Total Invertido": 280000, "Beneficio Neto": 296500, "Yield %": 105.9, "Acierto (%)": 66.7, "Estatus": "RENTABLE" },
  { "Tipster": "Vision Deportes", "Total Apuestas": 3, "Total Invertido": 390000, "Beneficio Neto": -42000, "Yield %": -10.8, "Acierto (%)": 66.7, "Estatus": "EN OBSERVACIÓN" },
  { "Tipster": "Sharpods", "Total Apuestas": 2, "Total Invertido": 80000, "Beneficio Neto": 84000, "Yield %": 105.0, "Acierto (%)": 100, "Estatus": "RENTABLE" },
  { "Tipster": "Filtraciones", "Total Apuestas": 2, "Total Invertido": 210000, "Beneficio Neto": -15000, "Yield %": -7.1, "Acierto (%)": 50, "Estatus": "EN OBSERVACIÓN" },
  { "Tipster": "Betlive", "Total Apuestas": 2, "Total Invertido": 340000, "Beneficio Neto": -88000, "Yield %": -25.9, "Acierto (%)": 50, "Estatus": "NO RECOMENDADO" },
  { "Tipster": "Griko", "Total Apuestas": 3, "Total Invertido": 150000, "Beneficio Neto": -60000, "Yield %": -40.0, "Acierto (%)": 0, "Estatus": "NO RECOMENDADO" },
  { "Tipster": "Santiago Gambler", "Total Apuestas": 2, "Total Invertido": 200000, "Beneficio Neto": 168000, "Yield %": 84.0, "Acierto (%)": 100, "Estatus": "RENTABLE" },
  { "Tipster": "Enigmario", "Total Apuestas": 2, "Total Invertido": 230000, "Beneficio Neto": 123500, "Yield %": 53.7, "Acierto (%)": 50, "Estatus": "EVALUANDO" },
  { "Tipster": "Propias", "Total Apuestas": 3, "Total Invertido": 360000, "Beneficio Neto": -12000, "Yield %": -3.3, "Acierto (%)": 66.7, "Estatus": "EVALUANDO" },
];

/* ============================================================================
   HELPERS DE FORMATO
   ============================================================================ */
// Moneda COMPLETA — nunca abreviar con K/M, en ninguna pestaña.
const fmtCOP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);

// Solo dígitos con separador de miles (para ejes de gráfico, sin símbolo $ ni K/M)
const fmtNumEje = (n) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n || 0);

const toNumber = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};

// Normaliza claves de objeto (quita espacios, paréntesis, %, mayúsculas) para
// poder hacer match sin importar la forma exacta en que llegue la cabecera.
const normalizeKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");

function pickField(raw, candidates) {
  if (!raw || typeof raw !== "object") return undefined;
  const map = {};
  Object.keys(raw).forEach((k) => { map[normalizeKey(k)] = raw[k]; });
  for (const c of candidates) {
    const nk = normalizeKey(c);
    if (map[nk] !== undefined && map[nk] !== null && map[nk] !== "") return map[nk];
  }
  return undefined;
}

// Normaliza estado: PUSH / VOID / NULA → ANULADA. Nunca confunde ANULADA con PENDIENTE.
function normalizeEstado(raw) {
  const e = String(raw || "").trim().toUpperCase();
  if (["ANULADA", "PUSH", "VOID", "NULA", "ANULADO"].includes(e)) return "ANULADA";
  if (["GANADA", "PERDIDA", "PENDIENTE"].includes(e)) return e;
  return e || "PENDIENTE";
}

// Convierte una fila-matriz cruda (array por índice) en un objeto de apuesta.
function rowToBet(row) {
  return {
    id: row[COL.ID],
    fecha: row[COL.FECHA],
    tipster: row[COL.TIPSTER],
    casa: row[COL.CASA],
    partido: row[COL.PARTIDO],
    deporte: row[COL.DEPORTE] || "Otro",
    idPartidoApi: row[COL.ID_PARTIDO_API] || "",
    mercado: row[COL.MERCADO],
    cuota: toNumber(row[COL.CUOTA]),
    monto: toNumber(row[COL.MONTO]),
    estado: normalizeEstado(row[COL.ESTADO]),
    beneficio: toNumber(row[COL.BENEFICIO]),
    cuotaCierre: row[COL.CUOTA_CIERRE] ? toNumber(row[COL.CUOTA_CIERRE]) : null,
    clv: row[COL.CLV] || "",
    mes: row[COL.MES] || "",
  };
}

// Acepta también apuestas que ya llegan como objeto (compatibilidad hacia adelante).
function normalizeBetRow(raw) {
  if (Array.isArray(raw)) return rowToBet(raw);
  return {
    id: pickField(raw, ["id", "ID_Apuesta"]),
    fecha: pickField(raw, ["fecha", "Fecha"]),
    tipster: pickField(raw, ["tipster", "Tipster"]),
    casa: pickField(raw, ["casa", "Casa"]),
    partido: pickField(raw, ["partido", "Partido"]),
    deporte: pickField(raw, ["deporte", "Deporte"]) || "Otro",
    idPartidoApi: pickField(raw, ["idPartidoApi", "ID_Partido_API", "Id_Partido_API"]) || "",
    mercado: pickField(raw, ["mercado", "Mercado"]),
    cuota: toNumber(pickField(raw, ["cuota", "Cuota"])),
    monto: toNumber(pickField(raw, ["monto", "Monto_Apostado"])),
    estado: normalizeEstado(pickField(raw, ["estado", "Estado"])),
    beneficio: toNumber(pickField(raw, ["beneficio", "Beneficio_Neto"])),
    cuotaCierre: toNumber(pickField(raw, ["cuotaCierre", "Cuota_Cierre"])) || null,
    clv: pickField(raw, ["clv", "CLV_Valor"]) || "",
    mes: pickField(raw, ["mes", "Mes"]) || "",
  };
}

// Auditoría de tipsters — acepta las cabeceras EXACTAS de la hoja, sin importar
// espacios/mayúsculas, y sin descartar filas solo porque falte una clave camelCase.
function normalizeTipster(raw) {
  return {
    tipster: pickField(raw, ["tipster", "Tipster"]) || "",
    totalApuestas: toNumber(pickField(raw, ["totalApuestas", "Total Apuestas"])),
    totalInvertido: toNumber(pickField(raw, ["totalInvertido", "Total Invertido"])),
    beneficioNeto: toNumber(pickField(raw, ["beneficioNeto", "Beneficio Neto"])),
    yieldPct: toNumber(pickField(raw, ["yieldPct", "Yield %", "Yield"])),
    aciertoPct: toNumber(pickField(raw, ["aciertoPct", "Acierto (%)", "Acierto"])),
    estatus: pickField(raw, ["estatus", "Estatus"]) || "EVALUANDO",
  };
}

// Clasifica el texto de Estatus (puede venir como RENTABLE, NO RENTABLE,
// EVALUANDO, EN OBSERVACIÓN, NO RECOMENDADO, etc.) en positivo/negativo/neutro.
function classifyEstatus(estatus) {
  const e = normalizeKey(estatus);
  if (e.includes("no") && (e.includes("rentable") || e.includes("recomendado"))) return "negativo";
  if (e.includes("rentable")) return "positivo";
  return "neutro";
}

/* ============================================================================
   CAPA DE API
   ============================================================================ */
async function apiGet(action) {
  try {
    const res = await fetch(`${API_URL}?action=${action}`);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} al llamar action=${action}` };
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { return { ok: false, error: "Respuesta no válida del backend (¿implementación desactualizada?)." }; }
  } catch (err) {
    return { ok: false, error: `No se pudo conectar con la API: ${err.message}` };
  }
}

async function apiPost(action, payload) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} al enviar action=${action}` };
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { return { ok: false, error: "Respuesta no válida del backend al enviar los datos." }; }
  } catch (err) {
    return { ok: false, error: `No se pudo conectar con la API: ${err.message}` };
  }
}

async function fetchBets() {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true, apuestas: MOCK_BETS_MATRIX.map(rowToBet) };
  }
  const res = await apiGet("bets");
  if (!res.ok) return res;
  const raw = res.apuestas || res.bets || res.data || [];
  return { ok: true, apuestas: raw.map(normalizeBetRow) };
}

async function fetchTipstersAudit() {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true, tipsters: MOCK_TIPSTERS_SHEET_ROWS.map(normalizeTipster) };
  }
  const res = await apiGet("tipsters");
  if (!res.ok) return res;
  const raw = res.tipsters || res.data || res.rows || [];
  return { ok: true, tipsters: raw.map(normalizeTipster).filter((t) => t.tipster && String(t.tipster).trim() !== "") };
}

async function fetchMetaTipsters() {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 150));
    return { ok: true, tipsters: TIPSTERS_DEFAULT, casas: CASAS };
  }
  const res = await apiGet("meta");
  if (res.ok && Array.isArray(res.tipsters) && res.tipsters.length > 0) return res;
  return { ok: true, tipsters: TIPSTERS_DEFAULT, casas: CASAS };
}

/* ============================================================================
   PRIMITIVOS DE UI
   ============================================================================ */
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

const ESTADO_CONFIG = {
  GANADA: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", Icon: CheckCircle2, label: "GANADA" },
  PERDIDA: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30", Icon: XCircle, label: "PERDIDA" },
  PENDIENTE: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", Icon: Clock, label: "PENDIENTE" },
  ANULADA: { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30", Icon: Ban, label: "ANULADA" },
};

function EstadoBadge({ estado }) {
  const conf = ESTADO_CONFIG[estado] || ESTADO_CONFIG.PENDIENTE;
  const { Icon } = conf;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${conf.bg} ${conf.text} ${conf.border}`}>
      <Icon size={12} strokeWidth={2.5} />
      {conf.label}
    </span>
  );
}

function EstatusTipsterBadge({ estatus }) {
  const clase = classifyEstatus(estatus);
  const map = {
    positivo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    negativo: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    neutro: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${map[clase]}`}>
      {estatus}
    </span>
  );
}

function BeneficioTexto({ valor, className = "" }) {
  const positivo = valor > 0, negativo = valor < 0;
  const color = positivo ? "text-emerald-400" : negativo ? "text-rose-400" : "text-slate-400";
  return (
    <span className={`font-mono tabular-nums whitespace-nowrap ${color} ${className}`}>
      {positivo ? "+" : ""}{fmtCOP(valor)}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, colorClass = "text-slate-50", sub }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        <Icon size={14} />
        <p className="text-[11px] font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className={`font-mono text-xl font-bold tabular-nums whitespace-nowrap ${colorClass}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
    </Card>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs text-slate-100 shadow-2xl">
      {message}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertTriangle className="text-amber-400" size={28} />
      <p className="text-sm text-slate-300">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200">
          Reintentar
        </button>
      )}
    </div>
  );
}

function LoadingState({ text }) {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Loader2 className="animate-spin" size={26} />
      <p className="text-sm">{text}</p>
    </div>
  );
}

/* ============================================================================
   HEADER SUPERIOR
   ============================================================================ */
function Header({ onActualizar, actualizando }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-9 w-9 rounded-lg border border-slate-800 bg-slate-900 object-cover"
            onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
          />
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-bold tracking-tight text-slate-50 sm:text-lg">
              Banca Apuestas <span className="text-emerald-400"></span>
            </h1>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
              v2.0
            </span>
          </div>
        </div>
        <button
          onClick={onActualizar}
          disabled={actualizando}
          className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 hover:border-amber-500"
        >
          {actualizando ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          <span className="hidden sm:inline">Actualizar Resultados</span>
        </button>
      </div>
    </header>
  );
}

/* ============================================================================
   NAVEGACIÓN POR PESTAÑAS
   ============================================================================ */
function TabNav({ tab, setTab }) {
  const tabs = [
    { id: "dashboard", label: "Inicio", Icon: Home },
    { id: "tipsters", label: "Auditoría Tipsters", Icon: Users },
    { id: "historial", label: "Historial y Registro", Icon: Table2 },
    { id: "analytics", label: "Dashboard", Icon: BarChart3 },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
      <div className="flex gap-2 overflow-x-auto pb-3">
        {tabs.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                active
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
   PESTAÑA 1 — INICIO / DASHBOARD
   ============================================================================ */
function DashboardTab({ bets }) {
  const montoInicialTotal = CASAS.length * MONTO_INICIAL_POR_CASA;

  const resueltas = useMemo(() => bets.filter((b) => b.estado === "GANADA" || b.estado === "PERDIDA"), [bets]);
  const pendientes = useMemo(() => bets.filter((b) => b.estado === "PENDIENTE"), [bets]);

  const beneficioTotal = useMemo(() => bets.reduce((a, b) => a + (b.estado !== "PENDIENTE" ? b.beneficio : 0), 0), [bets]);
  const bancaActual = montoInicialTotal + beneficioTotal;

  const totalInvertidoResueltas = resueltas.reduce((a, b) => a + b.monto, 0);
  const beneficioResueltas = resueltas.reduce((a, b) => a + b.beneficio, 0);
  const yieldPct = totalInvertidoResueltas > 0 ? (beneficioResueltas / totalInvertidoResueltas) * 100 : 0;
  const aciertoPct = resueltas.length > 0 ? (resueltas.filter((b) => b.estado === "GANADA").length / resueltas.length) * 100 : 0;

  const chartData = useMemo(() => {
    const ordenadas = [...bets]
      .filter((b) => b.estado !== "PENDIENTE")
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    let acc = montoInicialTotal;
    return ordenadas.map((b) => {
      acc += b.beneficio;
      return { fecha: b.fecha, banca: Math.round(acc) };
    });
  }, [bets, montoInicialTotal]);

  const ultimas = useMemo(
    () => [...bets].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5),
    [bets]
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard icon={Wallet} label="Banca Actual" value={fmtCOP(bancaActual)} />
        <KpiCard icon={TrendingUp} label="Beneficio Total" value={fmtCOP(beneficioTotal)} colorClass={beneficioTotal >= 0 ? "text-emerald-400" : "text-rose-400"} />
        <KpiCard icon={Percent} label="Yield %" value={`${yieldPct >= 0 ? "+" : ""}${yieldPct.toFixed(1)}%`} colorClass={yieldPct >= 0 ? "text-emerald-400" : "text-rose-400"} />
        <KpiCard icon={Target} label="Acierto (Win Rate)" value={`${aciertoPct.toFixed(1)}%`} />
        <KpiCard icon={Activity} label="Apuestas Activas" value={String(pendientes.length)} sub="Solo PENDIENTE" />
      </div>

      <Card className="p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Evolución del Bankroll</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="bancaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={fmtNumEje} width={70} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(v) => [fmtCOP(v), "Banca"]}
              />
              <Area type="monotone" dataKey="banca" stroke="#34d399" strokeWidth={2} fill="url(#bancaFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Historial reciente</p>
          <ChevronRight size={14} className="text-slate-600" />
        </div>
        <Card className="divide-y divide-slate-800">
          {ultimas.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-200">{b.partido}</p>
                <p className="truncate text-[11px] text-slate-500">{b.tipster} · {b.casa} · {b.deporte} · {b.mercado}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <EstadoBadge estado={b.estado} />
                <BeneficioTexto valor={b.beneficio} className="text-[11px]" />
              </div>
            </div>
          ))}
          {ultimas.length === 0 && <p className="p-4 text-center text-sm text-slate-500">Aún no hay apuestas registradas.</p>}
        </Card>
      </div>
    </div>
  );
}

/* ============================================================================
   PESTAÑA 2 — AUDITORÍA DE TIPSTERS
   ============================================================================ */
function TipstersTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchTipstersAudit();
    if (res.ok) setData(res);
    else setError(res.error || "No se pudo cargar la auditoría de tipsters.");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const ranking = useMemo(() => {
    if (!data) return [];
    return [...data.tipsters].sort((a, b) => b.beneficioNeto - a.beneficioNeto);
  }, [data]);

  if (loading) return <LoadingState text="Cargando auditoría de tipsters…" />;
  if (error || !data) return <ErrorState message={error || "No se pudieron cargar los datos."} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-base font-semibold text-slate-100">Auditoría de Tipsters</h2>
        <p className="mt-0.5 text-xs text-slate-500">Rentabilidad real por fuente de pick, ordenada de mayor a menor beneficio.</p>
      </div>

      {/* Si la API devolvió filas, SIEMPRE se renderizan — nunca se muestra el
          mensaje vacío mientras ranking.length > 0. */}
      {ranking.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ranking.map((t, i) => {
            const positivo = t.beneficioNeto >= 0;
            return (
              <Card key={t.tipster || i} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 font-mono text-xs font-bold text-slate-300">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{t.tipster}</p>
                      <EstatusTipsterBadge estatus={t.estatus} />
                    </div>
                  </div>
                </div>

                <div className="mt-3.5">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Beneficio Neto</p>
                  <p className={`font-mono text-lg font-bold tabular-nums whitespace-nowrap ${positivo ? "text-emerald-400" : "text-rose-400"}`}>
                    {positivo ? "+" : ""}{fmtCOP(t.beneficioNeto)}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-slate-950/50 p-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Apuestas</p>
                    <p className="font-mono text-sm font-semibold text-slate-200">{t.totalApuestas}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Invertido</p>
                    <p className="font-mono text-[13px] font-semibold text-slate-200 whitespace-nowrap">{fmtCOP(t.totalInvertido)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Yield</p>
                    <p className={`font-mono text-sm font-semibold ${t.yieldPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {t.yieldPct >= 0 ? "+" : ""}{t.yieldPct}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Acierto</p>
                    <p className="font-mono text-sm font-semibold text-slate-200">{t.aciertoPct}%</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-6 text-center text-sm text-slate-500">
          Aún no hay tipsters registrados en la auditoría.
        </Card>
      )}
    </div>
  );
}

/* ============================================================================
   PESTAÑA 3 — HISTORIAL COMPLETO Y REGISTRO
   ============================================================================ */
function NuevaApuestaForm({ tipstersDisponibles, onClose, onCreated }) {
  const [form, setForm] = useState({
    tipster: "", casa: "", partido: "", deporte: "", mercado: "", cuota: "", monto: "", idPartidoApi: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valido = form.tipster && form.casa && form.partido && form.deporte && form.cuota && form.monto;

  const submit = async (e) => {
    e.preventDefault();
    if (!valido) return;
    setSubmitting(true);
    setStatus(null);

    const payload = {
      tipster: form.tipster,
      casa: form.casa,
      partido: form.partido,
      deporte: form.deporte,
      mercado: form.mercado,
      cuota: parseFloat(form.cuota),
      monto: parseFloat(form.monto),
      idPartidoApi: form.idPartidoApi,
    };

    let res;
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      res = { ok: true, id: `AP-${Date.now().toString().slice(-6)}` };
    } else {
      res = await apiPost("newBet", payload);
    }

    setSubmitting(false);
    if (res.ok) {
      setStatus({ ok: true, msg: "Apuesta registrada correctamente." });
      onCreated({ ...payload, id: res.id || `AP-${Date.now()}`, estado: "PENDIENTE", beneficio: 0, fecha: new Date().toISOString().slice(0, 10), cuotaCierre: null, clv: "", mes: new Date().toISOString().slice(0, 7) });
      setForm({ tipster: "", casa: "", partido: "", deporte: "", mercado: "", cuota: "", monto: "", idPartidoApi: "" });
    } else {
      setStatus({ ok: false, msg: res.error || "Error al registrar la apuesta." });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const inputCls =
    "w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40";
  const labelCls = "mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500";

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-100">Nueva Apuesta</p>
        <button onClick={onClose} className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-slate-200">
          <X size={14} />
        </button>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Tipster</label>
          <select value={form.tipster} onChange={set("tipster")} className={inputCls}>
            <option value="">Selecciona</option>
            {TIPSTERS_DEFAULT.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Casa</label>
          <select value={form.casa} onChange={set("casa")} className={inputCls}>
            <option value="">Selecciona</option>
            {CASAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Deporte</label>
          <select value={form.deporte} onChange={set("deporte")} className={inputCls}>
            <option value="">Selecciona</option>
            {DEPORTES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>ID Partido API <span className="normal-case text-slate-600">(opcional)</span></label>
          <input type="text" value={form.idPartidoApi} onChange={set("idPartidoApi")} className={`${inputCls} font-mono`} placeholder="Ej. 8841021" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Partido / Evento</label>
          <input type="text" value={form.partido} onChange={set("partido")} className={inputCls} placeholder="Ej. Millonarios vs Nacional" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Mercado</label>
          <input type="text" value={form.mercado} onChange={set("mercado")} className={inputCls} placeholder="Ej. Más de 2.5 goles" />
        </div>
        <div>
          <label className={labelCls}>Cuota</label>
          <input type="number" step="0.01" value={form.cuota} onChange={set("cuota")} className={`${inputCls} font-mono`} placeholder="1.85" />
        </div>
        <div>
          <label className={labelCls}>Monto (COP)</label>
          <input type="number" value={form.monto} onChange={set("monto")} className={`${inputCls} font-mono`} placeholder="100000" />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={!valido || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold tracking-wide text-slate-950 shadow-lg shadow-emerald-500/20 transition active:scale-[0.98] disabled:opacity-40"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
            REGISTRAR APUESTA
          </button>
        </div>

        {status && (
          <div className={`sm:col-span-2 rounded-lg border px-3 py-2 text-center text-xs ${status.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-rose-500/30 bg-rose-500/10 text-rose-400"}`}>
            {status.msg}
          </div>
        )}
      </form>
    </Card>
  );
}

function HistorialTab({ bets, onBetCreated }) {
  const [meta, setMeta] = useState({ tipsters: TIPSTERS_DEFAULT, casas: CASAS });
  const [showForm, setShowForm] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [fEstado, setFEstado] = useState("Todos");
  const [fTipster, setFTipster] = useState("Todos");
  const [fCasa, setFCasa] = useState("Todos");
  const [fDeporte, setFDeporte] = useState("Todos");

  useEffect(() => {
    (async () => {
      const res = await fetchMetaTipsters();
      if (res.ok) setMeta(res);
    })();
  }, []);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return bets.filter((b) => {
      if (fEstado !== "Todos" && b.estado !== fEstado) return false;
      if (fTipster !== "Todos" && b.tipster !== fTipster) return false;
      if (fCasa !== "Todos" && b.casa !== fCasa) return false;
      if (fDeporte !== "Todos" && b.deporte !== fDeporte) return false;
      if (q) {
        const texto = `${b.partido} ${b.mercado} ${b.tipster}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [bets, busqueda, fEstado, fTipster, fCasa, fDeporte]);

  const selectCls = "rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-2 text-xs text-slate-300 outline-none focus:border-emerald-500/50";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Historial Completo y Registro</h2>
          <p className="mt-0.5 text-xs text-slate-500">{filtradas.length} de {bets.length} apuestas</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20"
        >
          <PlusCircle size={14} />
          {showForm ? "Ocultar formulario" : "Nueva Apuesta"}
        </button>
      </div>

      {showForm && (
        <NuevaApuestaForm
          tipstersDisponibles={meta.tipsters}
          onClose={() => setShowForm(false)}
          onCreated={(bet) => { onBetCreated(bet); setShowForm(false); }}
        />
      )}

      {/* Búsqueda y filtros */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar partido, mercado o tipster…"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/70 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-emerald-500/50"
            />
          </div>
          <select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className={selectCls}>
            {["Todos", "GANADA", "PERDIDA", "PENDIENTE", "ANULADA"].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={fTipster} onChange={(e) => setFTipster(e.target.value)} className={selectCls}>
            <option value="Todos">Todos los tipsters</option>
            {meta.tipsters.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={fCasa} onChange={(e) => setFCasa(e.target.value)} className={selectCls}>
            <option value="Todos">Todas las casas</option>
            {CASAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={fDeporte} onChange={(e) => setFDeporte(e.target.value)} className={selectCls}>
            <option value="Todos">Todos los deportes</option>
            {DEPORTES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2.5">Fecha</th>
              <th className="px-3 py-2.5">Tipster</th>
              <th className="px-3 py-2.5">Casa</th>
              <th className="px-3 py-2.5">Deporte</th>
              <th className="px-3 py-2.5">Partido</th>
              <th className="px-3 py-2.5">Mercado</th>
              <th className="px-3 py-2.5 text-right">Cuota</th>
              <th className="px-3 py-2.5 text-right">Monto</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5 text-right">Beneficio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {filtradas.map((b) => (
              <tr key={b.id} className="text-slate-300 hover:bg-slate-800/30">
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{b.fecha}</td>
                <td className="px-3 py-2.5">{b.tipster}</td>
                <td className="px-3 py-2.5">{b.casa}</td>
                <td className="px-3 py-2.5">{b.deporte}</td>
                <td className="max-w-[180px] truncate px-3 py-2.5">{b.partido}</td>
                <td className="max-w-[160px] truncate px-3 py-2.5 text-slate-400">{b.mercado}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono">{b.cuota.toFixed(2)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono">{fmtCOP(b.monto)}</td>
                <td className="whitespace-nowrap px-3 py-2.5"><EstadoBadge estado={b.estado} /></td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right"><BeneficioTexto valor={b.beneficio} /></td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-slate-500">Ninguna apuesta coincide con los filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ============================================================================
   PESTAÑA 4 — ANALYTICS & RENDIMIENTO
   ============================================================================ */
function AnalyticsTab({ bets }) {
  const resueltas = useMemo(() => bets.filter((b) => b.estado !== "PENDIENTE"), [bets]);

  const porCasa = useMemo(() => {
    const map = {};
    CASAS.forEach((c) => { map[c] = { casa: c, beneficio: 0, invertido: 0 }; });
    resueltas.forEach((b) => {
      if (!map[b.casa]) map[b.casa] = { casa: b.casa, beneficio: 0, invertido: 0 };
      map[b.casa].beneficio += b.beneficio;
      map[b.casa].invertido += b.monto;
    });
    return Object.values(map);
  }, [resueltas]);

  const porDeporte = useMemo(() => {
    const map = {};
    resueltas.forEach((b) => {
      if (!map[b.deporte]) map[b.deporte] = { deporte: b.deporte, beneficio: 0 };
      map[b.deporte].beneficio += b.beneficio;
    });
    return Object.values(map).sort((a, b) => b.beneficio - a.beneficio);
  }, [resueltas]);

  const clv = useMemo(() => {
    const conCierre = bets.filter((b) => b.cuotaCierre !== null && b.cuotaCierre !== undefined && b.cuotaCierre > 0);
    const positivos = conCierre.filter((b) => (b.clv ? String(b.clv).toUpperCase() === "SI" : b.cuota > b.cuotaCierre));
    const pct = conCierre.length > 0 ? (positivos.length / conCierre.length) * 100 : 0;
    return { total: conCierre.length, positivos: positivos.length, pct };
  }, [bets]);

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h2 className="text-base font-semibold text-slate-100">Analisis &amp; Rendimiento</h2>
        <p className="mt-0.5 text-xs text-slate-500">Desglose de beneficio por casa, por deporte, y análisis de valor de cierre (CLV).</p>
      </div>

      <Card className="p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Beneficio Neto por Casa de Apuestas</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porCasa} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="casa" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={fmtNumEje} width={70} />
              <Tooltip
  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12, color: "#ffffff" }}
  itemStyle={{ color: "#ffffff" }}
  labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
  formatter={(v) => [fmtCOP(v), "Beneficio"]}
/>
              <Bar dataKey="beneficio" radius={[6, 6, 0, 0]}>
                {porCasa.map((entry, idx) => (
                  <Cell key={idx} fill={entry.beneficio >= 0 ? "#34d399" : "#fb7185"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Beneficio Neto Acumulado por Deporte</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porDeporte} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="deporte" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={fmtNumEje} width={70} />
              <Tooltip
  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12, color: "#ffffff" }}
  itemStyle={{ color: "#ffffff" }}
  labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
  formatter={(v) => [fmtCOP(v), "Beneficio"]}
/>
              <Bar dataKey="beneficio" radius={[6, 6, 0, 0]}>
                {porDeporte.map((entry, idx) => (
                  <Cell key={idx} fill={entry.beneficio >= 0 ? "#34d399" : "#fb7185"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Análisis de Valor de Cierre (CLV)</p>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-emerald-500/30 font-mono text-sm font-bold text-emerald-400">
            {clv.pct.toFixed(0)}%
          </div>
          <div className="text-xs text-slate-400">
            <p>
              <span className="font-semibold text-slate-200">{clv.positivos}</span> de{" "}
              <span className="font-semibold text-slate-200">{clv.total}</span> apuestas con cuota de cierre registrada
              tuvieron una cuota apostada superior a la cuota de cierre (valor positivo).
            </p>
            <p className="mt-1 text-slate-500">Apuestas sin Cuota_Cierre registrada no se incluyen en este cálculo.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================================
   APP RAÍZ
   ============================================================================ */
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [bets, setBets] = useState([]);
  const [loadingBets, setLoadingBets] = useState(true);
  const [errorBets, setErrorBets] = useState(null);
  const [actualizando, setActualizando] = useState(false);
  const [toast, setToast] = useState(null);

  const loadBets = useCallback(async () => {
    setLoadingBets(true);
    setErrorBets(null);
    const res = await fetchBets();
    if (res.ok) setBets(res.apuestas);
    else setErrorBets(res.error || "No se pudieron cargar las apuestas.");
    setLoadingBets(false);
  }, []);

  useEffect(() => { loadBets(); }, [loadBets]);

  const handleActualizar = async () => {
    setActualizando(true);
    if (!USE_MOCK) await apiPost("checkPending", {});
    await new Promise((r) => setTimeout(r, USE_MOCK ? 400 : 0));
    await loadBets();
    setActualizando(false);
    setToast("Resultados verificados.");
    setTimeout(() => setToast(null), 2500);
  };

  const handleBetCreated = (bet) => {
    setBets((prev) => [bet, ...prev]);
    setToast("Apuesta registrada.");
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" translate="no">
      <Header onActualizar={handleActualizar} actualizando={actualizando} />
      <TabNav tab={tab} setTab={setTab} />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-1 sm:px-6">
        {USE_MOCK && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-400">
            <AlertTriangle size={13} />
            Modo demo con datos simulados (incluye columna Deporte y estado ANULADA). Cuando tu Code.gs soporte
            ambos, cambia <code className="rounded bg-slate-900 px-1">USE_MOCK</code> a <code className="rounded bg-slate-900 px-1">false</code>.
          </div>
        )}

        {loadingBets && <LoadingState text="Cargando apuestas…" />}
        {!loadingBets && errorBets && <ErrorState message={errorBets} onRetry={loadBets} />}

        {!loadingBets && !errorBets && (
          <>
            {tab === "dashboard" && <DashboardTab bets={bets} />}
            {tab === "tipsters" && <TipstersTab />}
            {tab === "historial" && <HistorialTab bets={bets} onBetCreated={handleBetCreated} />}
            {tab === "analytics" && <AnalyticsTab bets={bets} />}
          </>
        )}
      </main>

      <Toast message={toast} />
    </div>
  );
}

/* ============================================================================
   NOTAS PARA ACTUALIZAR Code.gs (backend) Y HABILITAR USE_MOCK = false
   ============================================================================
   1. Agrega la columna "Deporte" en HISTORICO_APUESTAS (por ejemplo entre
      Partido e ID_Partido_API) y actualiza los índices COL_HIST en Code.gs.
   2. En registrarApuesta_(), acepta y guarda p.deporte.
   3. En liquidarApuesta_(), acepta el estado "ANULADA" además de GANADA/
      PERDIDA, dejando Beneficio_Neto = 0 y excluyendo esas filas del cálculo
      de Yield/Acierto en recalcAuditoriaTipsters_().
   4. Expón una acción GET "bets" que devuelva TODAS las apuestas (no solo
      un resumen) para alimentar la pestaña de Historial con filtros.
   ============================================================================ */
