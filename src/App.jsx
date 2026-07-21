import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Home, PlusCircle, Users, RefreshCw, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, XCircle, Clock, ChevronRight, Wallet,
  Loader2, Landmark
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

/* ============================================================================
   CONFIGURACIÓN — pega aquí la URL /exec de tu Google Apps Script
   ============================================================================ */
const API_URL = "https://script.google.com/macros/s/AKfycbxbUfvvWD-QVGnLOAD7sEYol7e9X58dlXNIbL0Nm-TlG5s3ncZPgjHidWXFxaLI1LtC/exec";
const USE_MOCK = false; // conectado a Google Sheets en vivo

/* ============================================================================
   DATOS DE DEMOSTRACIÓN (se usan mientras USE_MOCK = true)
   ============================================================================ */
const MOCK_DASHBOARD = {
  ok: true,
  banca: {
    saldoTotal: 4820000,
    gananciaGlobal: 820000,
    rendimientoMesPct: 6.4,
    drawdownPct: 4.2,
    rachaPerdidas: 1,
    semaforo: "VERDE",
  },
  casas: [
    { casa: "Betplay", montoInicial: 1000000, gananciaPerdida: 240000, saldoActual: 1240000 },
    { casa: "Stake", montoInicial: 1000000, gananciaPerdida: -80000, saldoActual: 920000 },
    { casa: "Bwin", montoInicial: 1000000, gananciaPerdida: 410000, saldoActual: 1410000 },
    { casa: "Rushbet", montoInicial: 1000000, gananciaPerdida: 250000, saldoActual: 1250000 },
  ],
  chart: Array.from({ length: 14 }).map((_, i) => ({
    fecha: `07-${String(i + 1).padStart(2, "0")}`,
    banca: Math.round(4000000 + i * 55000 + Math.sin(i / 2) * 90000),
  })),
  ultimasApuestas: [
    { id: "AP-001", fecha: "2026-07-19", tipster: "Carlos V.", casa: "Bwin", partido: "Millonarios vs Nacional", mercado: "Más de 2.5 goles", cuota: 1.85, monto: 100000, estado: "GANADA", beneficio: 85000 },
    { id: "AP-002", fecha: "2026-07-19", tipster: "Sofía R.", casa: "Stake", partido: "River vs Boca", mercado: "Doble oportunidad 1X", cuota: 1.45, monto: 150000, estado: "PERDIDA", beneficio: -150000 },
    { id: "AP-003", fecha: "2026-07-18", tipster: "Carlos V.", casa: "Betplay", partido: "Real Madrid vs Barcelona", mercado: "Ambos anotan", cuota: 1.95, monto: 120000, estado: "GANADA", beneficio: 114000 },
    { id: "AP-004", fecha: "2026-07-18", tipster: "Andrés M.", casa: "Rushbet", partido: "Junior vs América", mercado: "Hándicap -1", cuota: 2.1, monto: 80000, estado: "PENDIENTE", beneficio: 0 },
    { id: "AP-005", fecha: "2026-07-17", tipster: "Sofía R.", casa: "Bwin", partido: "PSG vs Marsella", mercado: "Más de 3.5 goles", cuota: 2.4, monto: 90000, estado: "GANADA", beneficio: 126000 },
  ],
};

const MOCK_TIPSTERS = {
  ok: true,
  tipsters: [
    { tipster: "Carlos V.", totalApuestas: 48, totalInvertido: 4200000, beneficioNeto: 610000, yieldPct: 14.5, aciertoPct: 58, estatus: "RENTABLE" },
    { tipster: "Sofía R.", totalApuestas: 31, totalInvertido: 2850000, beneficioNeto: 95000, yieldPct: 3.3, aciertoPct: 51, estatus: "RENTABLE" },
    { tipster: "Andrés M.", totalApuestas: 12, totalInvertido: 960000, beneficioNeto: -40000, yieldPct: -4.1, aciertoPct: 42, estatus: "EVALUANDO" },
    { tipster: "Daniel P.", totalApuestas: 26, totalInvertido: 2100000, beneficioNeto: -310000, yieldPct: -14.7, aciertoPct: 38, estatus: "NO RENTABLE" },
  ],
};

const MOCK_META = { ok: true, tipsters: ["Carlos V.", "Sofía R.", "Andrés M.", "Daniel P."], casas: ["Betplay", "Stake", "Bwin", "Rushbet"] };

/* ============================================================================
   HELPERS
   ============================================================================ */
const fmtCOP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);

const fmtCOPShort = (n) => {
  const abs = Math.abs(n || 0);
  if (abs >= 1000000) return (n / 1000000).toFixed(2) + "M";
  if (abs >= 1000) return (n / 1000).toFixed(0) + "K";
  return String(n);
};

async function apiGet(action) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 350));
    if (action === "dashboard") return MOCK_DASHBOARD;
    if (action === "tipsters") return MOCK_TIPSTERS;
    if (action === "meta") return MOCK_META;
    return { ok: false, error: "mock" };
  }
  try {
    const res = await fetch(`${API_URL}?action=${action}`);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} al llamar action=${action}` };
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      // El backend no devolvió JSON (ej. página de error de Apps Script / login)
      return { ok: false, error: "Respuesta no válida del backend (¿implementación desactualizada o sin acceso público?)." };
    }
  } catch (err) {
    return { ok: false, error: `No se pudo conectar con la API: ${err.message}` };
  }
}

async function apiPost(action, payload) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true, mensaje: "Simulado en modo demo (USE_MOCK=true)." };
  }
  try {
    // text/plain evita el preflight CORS que Apps Script no maneja bien
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} al enviar action=${action}` };
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: false, error: "Respuesta no válida del backend al enviar los datos." };
    }
  } catch (err) {
    return { ok: false, error: `No se pudo conectar con la API: ${err.message}` };
  }
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

function EstadoBadge({ estado }) {
  const map = {
    GANADA: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", Icon: CheckCircle2, label: "GANADA" },
    PERDIDA: { cls: "bg-red-500/15 text-red-400 border-red-500/30", Icon: XCircle, label: "PERDIDA" },
    PENDIENTE: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", Icon: Clock, label: "PENDIENTE" },
  };
  const conf = map[estado] || map.PENDIENTE;
  const { Icon } = conf;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${conf.cls}`}>
      <Icon size={12} strokeWidth={2.5} />
      {conf.label}
    </span>
  );
}

function EstatusTipsterBadge({ estatus }) {
  const map = {
    RENTABLE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    "NO RENTABLE": "bg-red-500/15 text-red-400 border-red-500/30",
    EVALUANDO: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${map[estatus] || map.EVALUANDO}`}>
      {estatus}
    </span>
  );
}

function Semaforo({ nivel, drawdown, racha }) {
  const conf = {
    VERDE: { color: "bg-emerald-400", ring: "ring-emerald-400/30", label: "Estable", text: "text-emerald-400" },
    AMARILLO: { color: "bg-amber-400", ring: "ring-amber-400/30", label: "Cuidado", text: "text-amber-400" },
    ROJO: { color: "bg-red-400", ring: "ring-red-400/30", label: "Reducir stake", text: "text-red-400" },
  }[nivel] || { color: "bg-slate-400", ring: "ring-slate-400/30", label: "—", text: "text-slate-400" };

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`relative flex h-3 w-3 items-center justify-center`}>
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${conf.color} opacity-40`} />
          <span className={`relative inline-flex h-3 w-3 rounded-full ${conf.color} ring-4 ${conf.ring}`} />
        </span>
        <div>
          <p className={`text-sm font-semibold ${conf.text}`}>{conf.label}</p>
          <p className="text-[11px] text-slate-500">Semáforo de riesgo / stake</p>
        </div>
      </div>
      <div className="text-right text-[11px] text-slate-500">
        <p>Drawdown: <span className="font-mono text-slate-300">{drawdown?.toFixed(1)}%</span></p>
        <p>Racha negativa: <span className="font-mono text-slate-300">{racha}</span></p>
      </div>
    </div>
  );
}

/* ============================================================================
   PANTALLA 1 — DASHBOARD
   ============================================================================ */
function Dashboard({ onGoNewBet }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiGet("dashboard");
    if (res.ok) setData(res);
    else setError(res.error || "No se pudo cargar el dashboard.");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async () => {
    setUpdating(true);
    const res = await apiPost("checkPending", {});
    await load();
    setUpdating(false);
    setToast(res.ok ? "Resultados verificados." : "No se pudo actualizar.");
    setTimeout(() => setToast(null), 2500);
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="animate-spin" size={28} />
        <p className="text-sm">Cargando banca…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertTriangle className="text-amber-400" size={28} />
        <p className="text-sm text-slate-300">{error || "No se pudieron cargar los datos."}</p>
        <button onClick={load} className="mt-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200">
          Reintentar
        </button>
      </div>
    );
  }

  const { banca, casas, chart, ultimasApuestas } = data;
  const positivo = banca.gananciaGlobal >= 0;

  return (
    <div className="space-y-5 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">LEDGER</p>
          <h1 className="text-lg font-semibold text-slate-100">Panel de Banca</h1>
        </div>
        <button
          onClick={load}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 active:scale-95"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Tarjeta principal de banca */}
      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Saldo total actual</p>
        <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-slate-50">{fmtCOP(banca.saldoTotal)}</p>

        <div className="mt-4 flex items-center gap-4">
          <div className={`flex items-center gap-1 text-sm font-semibold ${positivo ? "text-emerald-400" : "text-red-400"}`}>
            {positivo ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {fmtCOP(banca.gananciaGlobal)}
          </div>
          <span className="text-slate-700">•</span>
          <div className="text-sm text-slate-400">
            Mes: <span className={banca.rendimientoMesPct >= 0 ? "text-emerald-400" : "text-red-400"}>
              {banca.rendimientoMesPct >= 0 ? "+" : ""}{banca.rendimientoMesPct}%
            </span>
          </div>
        </div>

        <div className="mt-4">
          <Semaforo nivel={banca.semaforo} drawdown={banca.drawdownPct} racha={banca.rachaPerdidas} />
        </div>
      </Card>

      {/* Casas de apuestas */}
      <div>
        <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-500">Casas de apuestas</p>
        <div className="grid grid-cols-2 gap-3">
          {casas.map((c) => {
            const pos = c.gananciaPerdida >= 0;
            return (
              <Card key={c.casa} className="p-3.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                    <Landmark size={14} />
                  </span>
                  <p className="text-sm font-medium text-slate-200">{c.casa}</p>
                </div>
                <p className="font-mono text-[15px] font-semibold tabular-nums text-slate-50 whitespace-nowrap">{fmtCOP(c.saldoActual)}</p>
                <p className={`text-[11px] font-medium whitespace-nowrap ${pos ? "text-emerald-400" : "text-red-400"}`}>
                  {pos ? "+" : ""}{fmtCOP(c.gananciaPerdida)}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Gráfico de rendimiento */}
      <Card className="p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Evolución de la banca</p>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="bancaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtCOPShort} width={44} />
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

      {/* Historial reciente */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Historial reciente</p>
          <ChevronRight size={14} className="text-slate-600" />
        </div>
        <Card className="divide-y divide-slate-800">
          {ultimasApuestas.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-200">{b.partido}</p>
                <p className="truncate text-[11px] text-slate-500">{b.tipster} · {b.casa} · {b.mercado}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <EstadoBadge estado={b.estado} />
                <span className={`font-mono text-[11px] tabular-nums ${b.beneficio > 0 ? "text-emerald-400" : b.beneficio < 0 ? "text-red-400" : "text-slate-500"}`}>
                  {b.beneficio !== 0 ? (b.beneficio > 0 ? "+" : "") + fmtCOPShort(b.beneficio) : "—"}
                </span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Botón flotante: actualizar resultados */}
      <div className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2">
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-60"
        >
          {updating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Actualizar Resultados
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-40 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   PANTALLA 2 — NUEVA APUESTA
   ============================================================================ */
function NuevaApuesta({ onSuccess }) {
  const [meta, setMeta] = useState({ tipsters: [], casas: [] });
  const [form, setForm] = useState({
    tipster: "", casa: "", partido: "", mercado: "", cuota: "", monto: "", idPartidoApi: "",
  });
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // {ok, msg}

  useEffect(() => {
    (async () => {
      const res = await apiGet("meta");
      if (res.ok) setMeta(res);
      else setMetaError(res.error || "No se pudo cargar la lista de tipsters/casas.");
      setLoadingMeta(false);
    })();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const valido = form.tipster && form.casa && form.partido && form.cuota && form.monto;

  const submit = async (e) => {
    e.preventDefault();
    if (!valido) return;
    setSubmitting(true);
    setStatus(null);
    const res = await apiPost("newBet", {
      tipster: form.tipster,
      casa: form.casa,
      partido: form.partido,
      mercado: form.mercado,
      cuota: parseFloat(form.cuota),
      monto: parseFloat(form.monto),
      idPartidoApi: form.idPartidoApi,
    });
    setSubmitting(false);
    if (res.ok) {
      setStatus({ ok: true, msg: "Apuesta registrada." });
      setForm({ tipster: "", casa: "", partido: "", mercado: "", cuota: "", monto: "", idPartidoApi: "" });
      onSuccess && onSuccess();
    } else {
      setStatus({ ok: false, msg: res.error || "Error al registrar." });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const inputCls =
    "w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3.5 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40";
  const labelCls = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500";

  return (
    <div className="space-y-5 pb-24">
      <div className="px-1 pt-1">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">LEDGER</p>
        <h1 className="text-lg font-semibold text-slate-100">Nueva Apuesta</h1>
        <p className="mt-0.5 text-xs text-slate-500">Registra tu pick en segundos.</p>
      </div>

      {metaError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
          <AlertTriangle size={13} />
          {metaError}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <Card className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipster</label>
              <select value={form.tipster} onChange={set("tipster")} className={inputCls} disabled={loadingMeta}>
                <option value="">Selecciona</option>
                {meta.tipsters.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Casa</label>
              <select value={form.casa} onChange={set("casa")} className={inputCls}>
                <option value="">Selecciona</option>
                {meta.casas.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Partido / Evento</label>
            <input type="text" placeholder="Ej. Millonarios vs Nacional" value={form.partido} onChange={set("partido")} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Mercado</label>
            <input type="text" placeholder="Ej. Más de 2.5 goles" value={form.mercado} onChange={set("mercado")} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Cuota</label>
              <input type="number" step="0.01" placeholder="1.85" value={form.cuota} onChange={set("cuota")} className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls}>Monto (COP)</label>
              <input type="number" placeholder="100000" value={form.monto} onChange={set("monto")} className={`${inputCls} font-mono`} />
            </div>
          </div>

          <div>
            <label className={labelCls}>ID Partido API <span className="normal-case text-slate-600">(opcional)</span></label>
            <input type="text" placeholder="Ej. 4821093" value={form.idPartidoApi} onChange={set("idPartidoApi")} className={`${inputCls} font-mono`} />
          </div>
        </Card>

        <button
          type="submit"
          disabled={!valido || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold tracking-wide text-slate-950 shadow-lg shadow-emerald-500/20 transition active:scale-[0.98] disabled:opacity-40"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
          REGISTRAR APUESTA
        </button>

        {status && (
          <div className={`rounded-lg border px-3 py-2.5 text-center text-sm ${status.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
            {status.msg}
          </div>
        )}
      </form>
    </div>
  );
}

/* ============================================================================
   NORMALIZADOR — AUDITORIA_TIPSTERS puede llegar con las cabeceras exactas
   de la hoja ("Tipster", "Beneficio Neto", "Yield %", etc.) en vez de claves
   camelCase. Esta función acepta ambos formatos de forma segura.
   ============================================================================ */
const toNumber = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};

function normalizeTipster(raw) {
  return {
    tipster: raw.tipster ?? raw["Tipster"] ?? "",
    totalApuestas: toNumber(raw.totalApuestas ?? raw["Total Apuestas"]),
    totalInvertido: toNumber(raw.totalInvertido ?? raw["Total Invertido"]),
    beneficioNeto: toNumber(raw.beneficioNeto ?? raw["Beneficio Neto"]),
    yieldPct: toNumber(raw.yieldPct ?? raw["Yield %"]),
    aciertoPct: toNumber(raw.aciertoPct ?? raw["Acierto (%)"]),
    estatus: raw.estatus ?? raw["Estatus"] ?? "EVALUANDO",
  };
}

/* ============================================================================
   PANTALLA 3 — TIPSTERS & CASAS
   ============================================================================ */
function TipstersCasas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiGet("tipsters");
    if (res.ok) setData(res);
    else setError(res.error || "No se pudo cargar la auditoría de tipsters.");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const ranking = useMemo(() => {
    if (!data) return [];
    return data.tipsters
      .map(normalizeTipster)
      .filter((t) => t.tipster && String(t.tipster).trim() !== "")
      .sort((a, b) => b.beneficioNeto - a.beneficioNeto);
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="animate-spin" size={28} />
        <p className="text-sm">Cargando auditoría…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertTriangle className="text-amber-400" size={28} />
        <p className="text-sm text-slate-300">{error || "No se pudieron cargar los datos."}</p>
        <button onClick={load} className="mt-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="px-1 pt-1">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">LEDGER</p>
        <h1 className="text-lg font-semibold text-slate-100">Tipsters &amp; Casas</h1>
        <p className="mt-0.5 text-xs text-slate-500">Auditoría de rentabilidad por fuente de pick.</p>
      </div>

      <div className="space-y-3">
        {ranking.map((t, i) => {
          const positivo = t.beneficioNeto >= 0;
          return (
            <Card key={t.tipster} className="p-4">
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
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Beneficio Neto</p>
                  <p className={`font-mono text-base font-bold tabular-nums whitespace-nowrap ${positivo ? "text-emerald-400" : "text-red-400"}`}>
                    {positivo ? "+" : ""}{fmtCOP(t.beneficioNeto)}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 grid grid-cols-4 gap-2 rounded-xl bg-slate-950/50 p-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Apuestas</p>
                  <p className="font-mono text-sm font-semibold text-slate-200">{t.totalApuestas}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Invertido</p>
                  <p className="font-mono text-sm font-semibold text-slate-200">{fmtCOPShort(t.totalInvertido)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Yield</p>
                  <p className={`font-mono text-sm font-semibold ${t.yieldPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
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

        {ranking.length === 0 && (
          <Card className="p-6 text-center text-sm text-slate-500">
            Aún no hay tipsters registrados en la auditoría.
          </Card>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   APP RAÍZ — navegación inferior
   ============================================================================ */
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    { id: "dashboard", label: "Inicio", Icon: Home },
    { id: "nueva", label: "Nueva Apuesta", Icon: PlusCircle },
    { id: "tipsters", label: "Tipsters", Icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-md px-4 pt-4">
        {USE_MOCK && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-400">
            <AlertTriangle size={13} />
            Modo demo con datos simulados. Configura API_URL y USE_MOCK=false para conectar tu Google Sheets.
          </div>
        )}

        {tab === "dashboard" && <Dashboard key={refreshKey} onGoNewBet={() => setTab("nueva")} />}
        {tab === "nueva" && <NuevaApuesta onSuccess={() => setRefreshKey((k) => k + 1)} />}
        {tab === "tipsters" && <TipstersCasas />}
      </div>

      {/* Barra de navegación inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-around py-2">
          {tabs.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex flex-col items-center gap-1 px-4 py-1.5"
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} className={active ? "text-emerald-400" : "text-slate-500"} />
                <span className={`text-[10px] font-medium ${active ? "text-emerald-400" : "text-slate-500"}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
