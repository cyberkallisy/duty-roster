import React, { useState, useMemo } from "react";
import {
  Search, Plus, X, Clock, ShieldCheck, AlertTriangle, Printer,
  UserX, FileText, ChevronRight, Trash2, Users, CalendarDays, Pencil, Check
} from "lucide-react";

// ---------- time helpers ----------
const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fmt = (t) => {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
};
const overlaps = (aS, aE, bS, bE) => {
  let a1 = toMin(aS), a2 = toMin(aE);
  let b1 = toMin(bS), b2 = toMin(bE);
  if (a2 <= a1) a2 += 1440;
  if (b2 <= b1) b2 += 1440;
  return a1 < b2 && b1 < a2;
};

// ---------- static presets ----------
const FIXED_ROLES = ["IO", "MHC Staff", "MM (Malkhana) Staff", "Reader to SHO", "Naib Court Moharrir", "Duty Officer", "Beat Officer", "Other"];
const CLARITY_OPTS = ["I/C", "Assistant", "Incharge"];
const DUTY_TYPES = ["Night Duty", "SDO", "Naka", "Patrol", "Other"];
const DUTY_COLOR = {
  "Night Duty": "#3A4E76",
  "SDO": "#6B5B3A",
  "Naka": "#3F6B4F",
  "Patrol": "#7A4A3A",
  "Other": "#5B5647",
};

// ---------- seed data ----------
const seedPersonnel = [
  { id: "p1", name: "Ramesh Kumar", rank: "SI", badge: "HR-1042", status: "present", remark: "", fixed: { role: "Reader to SHO", clarity: "I/C" } },
  { id: "p2", name: "Suresh Yadav", rank: "ASI", badge: "HR-1105", status: "present", remark: "", fixed: { role: "MHC Staff", clarity: "I/C" } },
  { id: "p3", name: "Vikram Singh", rank: "HC", badge: "HR-2231", status: "present", remark: "", fixed: { role: "MHC Staff", clarity: "Assistant" } },
  { id: "p4", name: "Naresh Sharma", rank: "HC", badge: "HR-2245", status: "present", remark: "", fixed: { role: "MM (Malkhana) Staff", clarity: "I/C" } },
  { id: "p5", name: "Sandeep Malik", rank: "Ct", badge: "HR-3312", status: "present", remark: "", fixed: { role: "MM (Malkhana) Staff", clarity: "Assistant" } },
  { id: "p6", name: "Deepak Rathi", rank: "Ct", badge: "HR-3345", status: "present", remark: "", fixed: { role: "Naib Court Moharrir", clarity: "I/C" } },
  { id: "p7", name: "Anil Kumar", rank: "HC", badge: "HR-2278", status: "present", remark: "", fixed: { role: "IO", clarity: "—" } },
  { id: "p8", name: "Rajesh Kumar", rank: "Ct", badge: "HR-3401", status: "present", remark: "", fixed: null },
  { id: "p9", name: "Mahesh Chand", rank: "Ct", badge: "HR-3418", status: "leave", remark: "Approved casual leave (5 days)", fixed: null },
  { id: "p10", name: "Pooja Devi", rank: "Ct", badge: "HR-3455", status: "present", remark: "", fixed: null },
  { id: "p11", name: "Baljeet Singh", rank: "HC", badge: "HR-2290", status: "present", remark: "", fixed: null },
  { id: "p12", name: "Sunita Devi", rank: "Ct", badge: "HR-3477", status: "absent", remark: "Reported late, on the way", fixed: null },
];

const seedTemp = [
  { id: "t1", personId: "p8", type: "Night Duty", start: "22:00", end: "06:00", urgency: "Urgent" },
  { id: "t2", personId: "p11", type: "SDO", start: "09:00", end: "17:00", urgency: "Routine" },
  { id: "t3", personId: "p10", type: "Naka", start: "18:00", end: "22:00", urgency: "Routine" },
  { id: "t4", personId: "p8", type: "Naka", start: "20:00", end: "23:00", urgency: "Urgent" },
  { id: "t5", personId: "p11", type: "Patrol", start: "14:00", end: "18:00", urgency: "Routine" },
];

// ---------- small presentational bits ----------
function StatusDot({ status }) {
  const map = { present: "#3F6B4F", leave: "#948C77", absent: "#A23B2E" };
  return <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: map[status] }} />;
}

function Initial({ name }) {
  const letters = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0"
      style={{ width: 38, height: 38, background: "#1F3355", color: "#E8E2D0", fontFamily: "Rajdhani", fontWeight: 600, fontSize: 15, border: "1px solid #33486E" }}
    >
      {letters}
    </div>
  );
}

function UrgencyTag({ urgency }) {
  const urgent = urgency === "Urgent";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
      style={{
        fontFamily: "Rajdhani",
        fontWeight: 600,
        background: urgent ? "rgba(162,59,46,0.12)" : "rgba(63,107,79,0.12)",
        color: urgent ? "#A23B2E" : "#3F6B4F",
        border: `1px solid ${urgent ? "#A23B2E" : "#3F6B4F"}`,
      }}
    >
      {urgent && <AlertTriangle size={10} />}
      {urgency}
    </span>
  );
}

// ---------- timeline strip for a duty type ----------
function TimelineStrip({ entries, personName }) {
  const width = 720, height = 34, pad = 6;
  const scaleX = (min) => pad + (min / 1440) * (width - pad * 2);
  // detect per-person overlaps to hatch
  const conflictRanges = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (entries[i].personId === entries[j].personId && overlaps(entries[i].start, entries[i].end, entries[j].start, entries[j].end)) {
        let s1 = toMin(entries[i].start), e1 = toMin(entries[i].end); if (e1 <= s1) e1 += 1440;
        let s2 = toMin(entries[j].start), e2 = toMin(entries[j].end); if (e2 <= s2) e2 += 1440;
        conflictRanges.push([Math.max(s1, s2), Math.min(e1, e2)]);
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${width} ${height + 16}`} className="w-full" style={{ display: "block" }}>
      {[0, 6, 12, 18, 24].map((h) => (
        <g key={h}>
          <line x1={scaleX(h * 60)} x2={scaleX(h * 60)} y1={0} y2={height} stroke="#DDD5C0" strokeWidth="1" />
          <text x={scaleX(h * 60)} y={height + 12} fontSize="8" fill="#8A8067" fontFamily="JetBrains Mono" textAnchor="middle">
            {String(h).padStart(2, "0")}
          </text>
        </g>
      ))}
      {entries.map((e, idx) => {
        let s = toMin(e.start), en = toMin(e.end);
        if (en <= s) en += 1440;
        const x = scaleX(s), w = Math.max(scaleX(en) - scaleX(s), 3);
        const y = 3 + (idx % 3) * 0;
        return (
          <g key={e.id}>
            <rect x={x} y={4} width={w} height={height - 8} rx={2} fill={DUTY_COLOR[e.type] || "#5B5647"} opacity={e.urgency === "Urgent" ? 1 : 0.72} />
          </g>
        );
      })}
      {conflictRanges.map(([s, e], i) => (
        <rect key={i} x={scaleX(s)} y={0} width={Math.max(scaleX(e) - scaleX(s), 2)} height={height} fill="url(#hatch)" stroke="#A23B2E" strokeWidth="1" />
      ))}
      <defs>
        <pattern id="hatch" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#A23B2E" strokeWidth="2" opacity="0.55" />
        </pattern>
      </defs>
    </svg>
  );
}

// ---------- main app ----------
export default function DutyRoster() {
  const [station] = useState("City Police Station, Panipat");
  const [date, setDate] = useState("2026-07-28");
  const [rosterStatus, setRosterStatus] = useState("Draft");
  const [personnel, setPersonnel] = useState(seedPersonnel);
  const [tempDuties, setTempDuties] = useState(seedTemp);

  const [search, setSearch] = useState("");
  const [rollFilter, setRollFilter] = useState("all");
  const [tab, setTab] = useState("fixed");

  const [drawerFor, setDrawerFor] = useState(null); // personId
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const byId = (id) => personnel.find((p) => p.id === id);

  const filteredRoll = useMemo(() => {
    return personnel.filter((p) => {
      if (search && !(`${p.name} ${p.badge}`.toLowerCase().includes(search.toLowerCase()))) return false;
      if (rollFilter === "fixed") return !!p.fixed;
      if (rollFilter === "unassigned") return !p.fixed && p.status === "present";
      if (rollFilter === "leave") return p.status === "leave";
      if (rollFilter === "absent") return p.status === "absent";
      return true;
    });
  }, [personnel, search, rollFilter]);

  const assignable = personnel.filter((p) => p.status !== "leave");

  function setFixed(personId, role, clarity) {
    setPersonnel((ps) => ps.map((p) => (p.id === personId ? { ...p, fixed: { role, clarity } } : p)));
  }
  function removeFixed(personId) {
    setPersonnel((ps) => ps.map((p) => (p.id === personId ? { ...p, fixed: null } : p)));
  }
  function setAttendance(personId, status, remark) {
    setPersonnel((ps) => ps.map((p) => (p.id === personId ? { ...p, status, remark } : p)));
  }
  function addTemp(personId, type, start, end, urgency) {
    setTempDuties((td) => [...td, { id: "t" + Date.now(), personId, type, start, end, urgency }]);
  }
  function removeTemp(id) {
    setTempDuties((td) => td.filter((t) => t.id !== id));
  }
  function conflictsFor(personId, start, end, excludeId) {
    return tempDuties.filter((t) => t.personId === personId && t.id !== excludeId && overlaps(t.start, t.end, start, end));
  }

  const groupedTemp = DUTY_TYPES.filter((t) => t !== "Other").concat(
    [...new Set(tempDuties.map((t) => t.type))].filter((t) => !DUTY_TYPES.includes(t))
  ).map((type) => ({ type, entries: tempDuties.filter((t) => t.type === type) })).filter((g) => g.entries.length);

  const fixedCount = personnel.filter((p) => p.fixed).length;
  const leaveCount = personnel.filter((p) => p.status === "leave").length;
  const absentCount = personnel.filter((p) => p.status === "absent").length;

  return (
    <div className="roster-app min-h-screen w-full" style={{ background: "var(--navy-950)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Source+Sans+3:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .roster-app {
          --navy-950:#0F1B30; --navy-800:#16233D; --navy-700:#1F3355; --navy-600:#2A3E63;
          --paper:#F5F1E8; --paper-line:#DDD5C0; --ink:#1E2A22; --ink-2:#3A362B;
          --khaki:#8A7F5E; --brass:#C08A2E; --routine:#3F6B4F; --urgent:#A23B2E; --leave:#948C77;
          font-family:'Source Sans 3', sans-serif; color: var(--ink);
        }
        .roster-app .disp { font-family:'Rajdhani', sans-serif; }
        .roster-app .mono { font-family:'JetBrains Mono', monospace; }
        .ledger-card { background: var(--paper); border: 1px solid var(--paper-line); }
        .row-line { border-bottom: 1px solid var(--paper-line); }
        .btn-brass {
          background: var(--brass); color:#20180a; font-family:'Rajdhani'; font-weight:600;
          letter-spacing:.02em; border:1px solid #96691f;
        }
        .btn-brass:hover { background:#cd9838; }
        .btn-ghost { border:1px solid var(--paper-line); color: var(--ink-2); }
        .btn-ghost:hover { background: rgba(0,0,0,0.03); }
        .chip { font-family:'Rajdhani'; font-weight:600; letter-spacing:.02em; }
        .roll-row:hover { background: rgba(255,255,255,0.03); }
        .roll-row.active { background: rgba(192,138,46,0.14); }
        input, select, textarea { font-family:'Source Sans 3'; }
        input:focus, select:focus, textarea:focus { outline: 2px solid var(--brass); outline-offset: 1px; }
        ::selection { background: var(--brass); color:#20180a; }
      `}</style>

      <div className="max-w-[1360px] mx-auto p-4 md:p-6">
        {/* header / stamp */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="rounded-full flex flex-col items-center justify-center shrink-0"
              style={{
                width: 64, height: 64, border: "2px dashed var(--brass)", color: "var(--brass)",
                transform: "rotate(-6deg)", background: "rgba(192,138,46,0.06)",
              }}
            >
              <span className="disp" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>HR</span>
              <span className="disp" style={{ fontSize: 9, fontWeight: 600 }}>POLICE</span>
            </div>
            <div>
              <p className="mono" style={{ color: "#8FA1C7", fontSize: 11, letterSpacing: "0.12em" }}>NAUKRI CHITHA · DUTY ROSTER</p>
              <h1 className="disp" style={{ color: "#F2EEE1", fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{station}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2 ledger-card rounded-sm px-2.5 py-1.5">
              <CalendarDays size={15} color="#6B6455" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent mono text-sm" style={{ color: "var(--ink)" }} />
            </label>
            <button
              onClick={() => setRosterStatus((s) => (s === "Draft" ? "Finalized" : "Draft"))}
              className="disp rounded-sm px-3 py-1.5 text-sm"
              style={{
                background: rosterStatus === "Draft" ? "rgba(192,138,46,0.15)" : "rgba(63,107,79,0.18)",
                color: rosterStatus === "Draft" ? "var(--brass)" : "var(--routine)",
                border: `1px solid ${rosterStatus === "Draft" ? "var(--brass)" : "var(--routine)"}`,
                fontWeight: 700,
              }}
              title="Toggle roster status"
            >
              {rosterStatus === "Draft" ? "● Draft" : "✓ Finalized"}
            </button>
            <button onClick={() => window.print()} className="btn-ghost rounded-sm px-3 py-1.5 text-sm flex items-center gap-1.5 ledger-card">
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { label: "Total Strength", value: personnel.length, color: "#F2EEE1" },
            { label: "Fixed Duty Assigned", value: fixedCount, color: "#F2EEE1" },
            { label: "On Approved Leave", value: leaveCount, color: "#C7BDA0" },
            { label: "Marked Absent Today", value: absentCount, color: "#E39485" },
          ].map((s) => (
            <div key={s.label} className="rounded-sm px-3.5 py-2.5" style={{ background: "var(--navy-800)", border: "1px solid var(--navy-700)" }}>
              <p className="mono" style={{ fontSize: 10, color: "#8FA1C7", letterSpacing: ".08em" }}>{s.label.toUpperCase()}</p>
              <p className="disp" style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 mt-5">
          {/* nominal roll */}
          <div className="ledger-card rounded-sm flex flex-col" style={{ maxHeight: 720 }}>
            <div className="p-3 row-line">
              <p className="disp" style={{ fontWeight: 700, fontSize: 15 }}>Nominal Roll</p>
              <div className="flex items-center gap-1.5 mt-2 ledger-card rounded-sm px-2 py-1" style={{ border: "1px solid var(--paper-line)" }}>
                <Search size={14} color="#8A8067" />
                <input
                  placeholder="Search name or badge no."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-sm flex-1"
                  style={{ color: "var(--ink)" }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  ["all", "All"], ["fixed", "Fixed"], ["unassigned", "Unassigned"], ["leave", "On Leave"], ["absent", "Absent"],
                ].map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setRollFilter(k)}
                    className="chip rounded-sm px-2 py-0.5 text-[11px]"
                    style={{
                      background: rollFilter === k ? "var(--khaki)" : "transparent",
                      color: rollFilter === k ? "#FBF8F0" : "var(--ink-2)",
                      border: `1px solid ${rollFilter === k ? "var(--khaki)" : "var(--paper-line)"}`,
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredRoll.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDrawerFor(p.id)}
                  className={`roll-row w-full text-left flex items-center gap-2.5 px-3 py-2.5 row-line ${drawerFor === p.id ? "active" : ""}`}
                  style={{ opacity: p.status === "leave" ? 0.55 : 1 }}
                >
                  <Initial name={p.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={p.status} />
                      <p className="truncate" style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</p>
                    </div>
                    <p className="mono truncate" style={{ fontSize: 10.5, color: "#8A8067" }}>{p.rank} · {p.badge}</p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {p.fixed ? (
                        <span className="chip rounded-sm px-1.5 py-0.5 text-[10px]" style={{ background: "rgba(31,51,85,0.08)", border: "1px solid var(--paper-line)" }}>
                          {p.fixed.role} · {p.fixed.clarity}
                        </span>
                      ) : p.status === "leave" ? (
                        <span className="chip rounded-sm px-1.5 py-0.5 text-[10px]" style={{ color: "var(--leave)" }}>On leave</span>
                      ) : (
                        <span className="chip rounded-sm px-1.5 py-0.5 text-[10px]" style={{ color: "#8A8067" }}>No fixed duty</span>
                      )}
                      {tempDuties.filter((t) => t.personId === p.id).length > 0 && (
                        <span className="chip rounded-sm px-1.5 py-0.5 text-[10px]" style={{ background: "rgba(139,127,94,0.12)", color: "var(--khaki)" }}>
                          {tempDuties.filter((t) => t.personId === p.id).length} temp
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} color="#B9AF97" className="shrink-0" />
                </button>
              ))}
              {filteredRoll.length === 0 && <p className="p-4 text-sm" style={{ color: "#8A8067" }}>No personnel match this filter.</p>}
            </div>
          </div>

          {/* ledger main */}
          <div className="ledger-card rounded-sm">
            <div className="flex items-center gap-1 p-2 row-line">
              {[["fixed", "Fixed Duty Register", ShieldCheck], ["temp", "Temp Duty Muster", Clock]].map(([k, l, Icon]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className="disp flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm"
                  style={{
                    background: tab === k ? "var(--navy-800)" : "transparent",
                    color: tab === k ? "#F2EEE1" : "var(--ink-2)",
                    fontWeight: 600,
                  }}
                >
                  <Icon size={14} /> {l}
                </button>
              ))}
              {tab === "temp" && (
                <button
                  onClick={() => { setQuickAddOpen(true); }}
                  className="btn-brass rounded-sm px-3 py-1.5 text-sm flex items-center gap-1 ml-auto"
                >
                  <Plus size={14} /> Add Temp Duty
                </button>
              )}
            </div>

            {tab === "fixed" ? (
              <div className="p-3">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left" style={{ color: "#8A8067", fontSize: 10.5 }}>
                      <th className="mono font-normal pb-2 pl-1" style={{ width: 40 }}>क्र.</th>
                      <th className="mono font-normal pb-2">Name</th>
                      <th className="mono font-normal pb-2">Rank / Badge</th>
                      <th className="mono font-normal pb-2">Role</th>
                      <th className="mono font-normal pb-2">Clarity</th>
                      <th className="mono font-normal pb-2 text-right pr-1">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personnel.filter((p) => p.status !== "leave").map((p, i) => (
                      <tr key={p.id} className="row-line">
                        <td className="mono py-2 pl-1" style={{ color: "#8A8067" }}>{String(i + 1).padStart(2, "0")}</td>
                        <td className="py-2" style={{ fontWeight: 600 }}>{p.name}</td>
                        <td className="mono py-2" style={{ color: "#6B6455" }}>{p.rank} · {p.badge}</td>
                        <td className="py-2">{p.fixed ? p.fixed.role : <span style={{ color: "#B9AF97" }}>— Unassigned —</span>}</td>
                        <td className="py-2">{p.fixed ? p.fixed.clarity : "—"}</td>
                        <td className="py-2 text-right pr-1">
                          <button onClick={() => setDrawerFor(p.id)} className="btn-ghost rounded-sm px-2 py-1 text-xs inline-flex items-center gap-1">
                            <Pencil size={11} /> {p.fixed ? "Edit" : "Assign"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 space-y-5">
                {groupedTemp.length === 0 && <p className="text-sm p-2" style={{ color: "#8A8067" }}>No temp duties logged for this date yet.</p>}
                {groupedTemp.map((g) => (
                  <div key={g.type}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-block rounded-sm" style={{ width: 10, height: 10, background: DUTY_COLOR[g.type] || "#5B5647" }} />
                      <p className="disp" style={{ fontWeight: 700, fontSize: 14.5 }}>{g.type}</p>
                      <span className="mono text-[11px]" style={{ color: "#8A8067" }}>{g.entries.length} assigned</span>
                    </div>
                    <div className="pl-0.5 mb-2">
                      <TimelineStrip entries={g.entries} />
                    </div>
                    <div className="space-y-1.5">
                      {g.entries.map((e) => {
                        const person = byId(e.personId);
                        const conf = conflictsFor(e.personId, e.start, e.end, e.id);
                        return (
                          <div key={e.id} className="flex items-center gap-3 rounded-sm px-2.5 py-2" style={{ border: "1px solid var(--paper-line)" }}>
                            <Initial name={person.name} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p style={{ fontWeight: 600, fontSize: 13.5 }}>{person.name}</p>
                                <span className="mono text-[11px]" style={{ color: "#6B6455" }}>{person.rank} · {person.badge}</span>
                                <UrgencyTag urgency={e.urgency} />
                              </div>
                              <p className="mono text-[11.5px] mt-0.5" style={{ color: "#6B6455" }}>{fmt(e.start)} – {fmt(e.end)}</p>
                              {conf.length > 0 && (
                                <p className="text-[11px] flex items-center gap-1 mt-1" style={{ color: "var(--urgent)" }}>
                                  <AlertTriangle size={11} /> Overlaps {person.name.split(" ")[0]}'s {conf.map((c) => c.type).join(", ")} duty
                                </p>
                              )}
                            </div>
                            <button onClick={() => removeTemp(e.id)} className="btn-ghost rounded-sm p-1.5"><Trash2 size={13} /></button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* signature footer */}
            <div className="row-line" />
            <div className="p-4 flex flex-col sm:flex-row justify-between gap-3 text-xs" style={{ color: "#8A8067" }}>
              <div className="flex items-center gap-1.5"><FileText size={13} /> Prepared by: <span className="mono">_______________</span></div>
              <div className="flex items-center gap-1.5">Duty Officer signature: <span className="mono">_______________</span></div>
              <div className="mono">{date}</div>
            </div>
          </div>
        </div>
      </div>

      {drawerFor && (
        <PersonDrawer
          person={byId(drawerFor)}
          tempDuties={tempDuties.filter((t) => t.personId === drawerFor)}
          onClose={() => setDrawerFor(null)}
          onSetFixed={setFixed}
          onRemoveFixed={removeFixed}
          onSetAttendance={setAttendance}
          onAddTemp={addTemp}
          onRemoveTemp={removeTemp}
          conflictsFor={conflictsFor}
        />
      )}

      {quickAddOpen && (
        <QuickAddTempModal
          assignable={assignable}
          onClose={() => setQuickAddOpen(false)}
          onAdd={(personId, type, start, end, urgency) => { addTemp(personId, type, start, end, urgency); setQuickAddOpen(false); }}
          conflictsFor={conflictsFor}
        />
      )}
    </div>
  );
}

// ---------- person drawer ----------
function PersonDrawer({ person, tempDuties, onClose, onSetFixed, onRemoveFixed, onSetAttendance, onAddTemp, onRemoveTemp, conflictsFor }) {
  const [role, setRole] = useState(person.fixed?.role || FIXED_ROLES[0]);
  const [clarity, setClarity] = useState(person.fixed?.clarity || CLARITY_OPTS[0]);
  const [status, setStatus] = useState(person.status);
  const [remark, setRemark] = useState(person.remark);

  const [tType, setTType] = useState(DUTY_TYPES[0]);
  const [tStart, setTStart] = useState("09:00");
  const [tEnd, setTEnd] = useState("17:00");
  const [tUrgency, setTUrgency] = useState("Routine");

  const liveConflicts = conflictsFor(person.id, tStart, tEnd, null);

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0" style={{ background: "rgba(15,27,48,0.55)" }} onClick={onClose} />
      <div className="relative h-full overflow-y-auto" style={{ width: "min(440px, 100vw)", background: "var(--paper)", borderLeft: "1px solid var(--paper-line)" }}>
        <div className="flex items-center justify-between p-4 row-line" style={{ background: "var(--navy-800)" }}>
          <div className="flex items-center gap-3">
            <Initial name={person.name} />
            <div>
              <p className="disp" style={{ color: "#F2EEE1", fontWeight: 700, fontSize: 16 }}>{person.name}</p>
              <p className="mono" style={{ color: "#8FA1C7", fontSize: 11 }}>{person.rank} · {person.badge}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-sm p-1.5" style={{ color: "#C7BDA0" }}><X size={18} /></button>
        </div>

        <div className="p-4 space-y-6">
          {/* attendance */}
          <section>
            <p className="disp" style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>ATTENDANCE</p>
            <div className="flex gap-1.5 mb-2">
              {["present", "absent", "leave"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className="chip rounded-sm px-2.5 py-1 text-xs capitalize"
                  style={{
                    background: status === s ? "var(--navy-800)" : "transparent",
                    color: status === s ? "#F2EEE1" : "var(--ink-2)",
                    border: "1px solid var(--paper-line)",
                  }}
                >
                  {s === "leave" ? "On leave" : s}
                </button>
              ))}
            </div>
            {status !== "present" && (
              <input
                placeholder={status === "leave" ? 'Leave remark e.g. "Approved casual leave (5 days)"' : 'Remark e.g. "Reported late"'}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full rounded-sm px-2.5 py-1.5 text-sm"
                style={{ border: "1px solid var(--paper-line)", background: "#FBF9F3" }}
              />
            )}
            <button
              onClick={() => onSetAttendance(person.id, status, status === "present" ? "" : remark)}
              disabled={status !== "present" && !remark.trim()}
              className="btn-brass rounded-sm px-3 py-1.5 text-xs mt-2 disabled:opacity-40"
            >
              Save attendance
            </button>
            {status === "leave" && <p className="text-[11px] mt-1.5" style={{ color: "var(--leave)" }}>On leave — automatically hidden from temp duty assignment.</p>}
          </section>

          {/* fixed duty */}
          {status !== "leave" && (
            <section>
              <div className="flex items-center justify-between">
                <p className="disp" style={{ fontWeight: 700, fontSize: 13.5 }}>FIXED DUTY (ROLE)</p>
                {person.fixed && <button onClick={() => onRemoveFixed(person.id)} className="text-[11px] flex items-center gap-1" style={{ color: "var(--urgent)" }}><Trash2 size={11} /> Remove</button>}
              </div>
              <p className="text-[11px] mb-2" style={{ color: "#8A8067" }}>One fixed duty per person, doesn't change daily.</p>
              <div className="flex gap-2">
                <select value={role} onChange={(e) => setRole(e.target.value)} className="flex-1 rounded-sm px-2 py-1.5 text-sm" style={{ border: "1px solid var(--paper-line)", background: "#FBF9F3" }}>
                  {FIXED_ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
                <input
                  list="clarity-opts"
                  value={clarity}
                  onChange={(e) => setClarity(e.target.value)}
                  placeholder="Clarity"
                  className="w-28 rounded-sm px-2 py-1.5 text-sm"
                  style={{ border: "1px solid var(--paper-line)", background: "#FBF9F3" }}
                />
                <datalist id="clarity-opts">
                  {CLARITY_OPTS.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <button onClick={() => onSetFixed(person.id, role, clarity)} className="btn-brass rounded-sm px-3 py-1.5 text-xs mt-2">
                {person.fixed ? "Update fixed duty" : "Assign fixed duty"}
              </button>
            </section>
          )}

          {/* temp duties */}
          {status !== "leave" && (
            <section>
              <p className="disp" style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>TEMP DUTIES TODAY</p>
              {status === "absent" && (
                <p className="text-[11px] mb-2 flex items-center gap-1" style={{ color: "var(--urgent)" }}><UserX size={12} /> Marked absent — assigning is allowed but not recommended.</p>
              )}
              <div className="space-y-1.5 mb-3">
                {tempDuties.length === 0 && <p className="text-[12px]" style={{ color: "#8A8067" }}>No temp duties assigned.</p>}
                {tempDuties.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-sm px-2 py-1.5" style={{ border: "1px solid var(--paper-line)" }}>
                    <span className="inline-block rounded-sm" style={{ width: 8, height: 8, background: DUTY_COLOR[t.type] || "#5B5647" }} />
                    <div className="flex-1 text-xs">
                      <span style={{ fontWeight: 600 }}>{t.type}</span>{" "}
                      <span className="mono" style={{ color: "#6B6455" }}>{fmt(t.start)}–{fmt(t.end)}</span>
                    </div>
                    <UrgencyTag urgency={t.urgency} />
                    <button onClick={() => onRemoveTemp(t.id)} className="p-1"><Trash2 size={12} color="#8A8067" /></button>
                  </div>
                ))}
              </div>

              <div className="rounded-sm p-3" style={{ background: "#FBF9F3", border: "1px solid var(--paper-line)" }}>
                <p className="text-[11px] mb-2" style={{ color: "#8A8067" }}>Add a temp duty (multiple allowed if timings don't clash)</p>
                <div className="flex gap-2 mb-2">
                  <select value={tType} onChange={(e) => setTType(e.target.value)} className="flex-1 rounded-sm px-2 py-1.5 text-sm" style={{ border: "1px solid var(--paper-line)" }}>
                    {DUTY_TYPES.map((d) => <option key={d}>{d}</option>)}
                  </select>
                  <select value={tUrgency} onChange={(e) => setTUrgency(e.target.value)} className="rounded-sm px-2 py-1.5 text-sm" style={{ border: "1px solid var(--paper-line)" }}>
                    <option>Routine</option><option>Urgent</option>
                  </select>
                </div>
                <div className="flex gap-2 mb-2">
                  <input type="time" value={tStart} onChange={(e) => setTStart(e.target.value)} className="flex-1 rounded-sm px-2 py-1.5 text-sm mono" style={{ border: "1px solid var(--paper-line)" }} />
                  <input type="time" value={tEnd} onChange={(e) => setTEnd(e.target.value)} className="flex-1 rounded-sm px-2 py-1.5 text-sm mono" style={{ border: "1px solid var(--paper-line)" }} />
                </div>
                {liveConflicts.length > 0 && (
                  <p className="text-[11px] mb-2 flex items-center gap-1" style={{ color: "var(--urgent)" }}>
                    <AlertTriangle size={11} /> Clashes with existing {liveConflicts.map((c) => c.type).join(", ")} ({liveConflicts.map((c) => `${fmt(c.start)}–${fmt(c.end)}`).join(", ")})
                  </p>
                )}
                <button onClick={() => onAddTemp(person.id, tType, tStart, tEnd, tUrgency)} className="btn-brass rounded-sm px-3 py-1.5 text-xs w-full flex items-center justify-center gap-1">
                  <Plus size={13} /> {liveConflicts.length > 0 ? "Add anyway (overlap flagged)" : "Add temp duty"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- quick add temp duty (person picker first) ----------
function QuickAddTempModal({ assignable, onClose, onAdd, conflictsFor }) {
  const [personId, setPersonId] = useState(assignable[0]?.id || "");
  const [type, setType] = useState(DUTY_TYPES[0]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [urgency, setUrgency] = useState("Routine");

  const conf = personId ? conflictsFor(personId, start, end, null) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(15,27,48,0.55)" }} onClick={onClose} />
      <div className="relative rounded-sm p-5 w-full" style={{ maxWidth: 420, background: "var(--paper)", border: "1px solid var(--paper-line)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="disp" style={{ fontWeight: 700, fontSize: 15 }}>Add Temp Duty</p>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <p className="text-[11px] mb-1" style={{ color: "#8A8067" }}>Personnel on approved leave don't appear here.</p>
        <select value={personId} onChange={(e) => setPersonId(e.target.value)} className="w-full rounded-sm px-2 py-1.5 text-sm mb-2" style={{ border: "1px solid var(--paper-line)" }}>
          {assignable.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.rank} · {p.badge}{p.status === "absent" ? " (absent today)" : ""}</option>)}
        </select>
        <div className="flex gap-2 mb-2">
          <select value={type} onChange={(e) => setType(e.target.value)} className="flex-1 rounded-sm px-2 py-1.5 text-sm" style={{ border: "1px solid var(--paper-line)" }}>
            {DUTY_TYPES.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="rounded-sm px-2 py-1.5 text-sm" style={{ border: "1px solid var(--paper-line)" }}>
            <option>Routine</option><option>Urgent</option>
          </select>
        </div>
        <div className="flex gap-2 mb-2">
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="flex-1 rounded-sm px-2 py-1.5 text-sm mono" style={{ border: "1px solid var(--paper-line)" }} />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="flex-1 rounded-sm px-2 py-1.5 text-sm mono" style={{ border: "1px solid var(--paper-line)" }} />
        </div>
        {conf.length > 0 && (
          <p className="text-[11px] mb-2 flex items-center gap-1" style={{ color: "var(--urgent)" }}>
            <AlertTriangle size={11} /> Clashes with {conf.map((c) => c.type).join(", ")}
          </p>
        )}
        <button
          onClick={() => personId && onAdd(personId, type, start, end, urgency)}
          disabled={!personId}
          className="btn-brass rounded-sm px-3 py-2 text-sm w-full flex items-center justify-center gap-1 disabled:opacity-40"
        >
          <Check size={14} /> {conf.length > 0 ? "Add anyway (overlap flagged)" : "Add temp duty"}
        </button>
      </div>
    </div>
  );
}
