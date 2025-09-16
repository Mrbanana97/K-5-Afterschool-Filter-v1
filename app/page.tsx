"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Sidebar from "./components/Sidebar";
import { IconCalendar, IconFilter, IconSearch, IconSort } from "./components/icons";

// Types
export type Grade = "K" | 1 | 2 | 3 | 4 | 5;
export type SubClass = "A" | "B" | "C" | "D";
export type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

export type Activity = {
  name: string;
  when: "afterschool" | "in-class" | "lunch" | "before-school";
  day?: Weekday;
};

export type Student = {
  id: string;
  first: string;
  last: string;
  grade: Grade;
  subClass: SubClass;
  activities: Activity[];
};

// App snapshot for save/load
type AppSnapshot = {
  students: Student[];
  activities: string[];
  activityColors?: Record<string, string>;
};

// Seed data
const initialStudents: Student[] = [
  { id: "S001", first: "Ava", last: "Nguyen", grade: "K", subClass: "A", activities: [
    { name: "Lego Builders", when: "afterschool", day: "Monday" },
    { name: "Reading Buddies", when: "in-class" },
  ]},
  { id: "S002", first: "Ben", last: "Ortiz", grade: 1, subClass: "B", activities: [
    { name: "Soccer Club", when: "afterschool", day: "Wednesday" },
    { name: "Math Lab", when: "lunch" },
  ]},
  { id: "S003", first: "Chloe", last: "Singh", grade: 2, subClass: "C", activities: [
    { name: "Drama Crew", when: "afterschool", day: "Thursday" },
    { name: "Choir", when: "afterschool", day: "Friday" },
  ]},
];

// Utils
function fullName(s: Student) { return `${s.first} ${s.last}`.trim(); }
function parseName(raw: string): { first: string; last: string } | null {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return null;
  if (t.includes(",")) { const [l,f] = t.split(",").map(s=>s.trim()); if (f && l) return { first: f, last: l }; }
  const parts = t.split(" ");
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0,-1).join(" "), last: parts.slice(-1)[0] };
}

function exportFilteredTable() {
  const element = document.getElementById("results-table");
  if (!element) return;
  const w = window.open("", "", "width=900,height=650");
  if (!w) return;
  w.document.write("<html><head><title>Filtered Results</title><style>body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px;text-align:left} thead{background:#f3f4f6}</style></head><body>");
  w.document.write(element.outerHTML);
  w.document.write("</body></html>");
  w.document.close();
  w.print();
}

function downloadImportTemplate() {
  const headers = ["Last Name", "First Name", "Grade", "Subclass"]; // CSV columns
  const sampleRow = ["Doe", "John", "1", "A"]; // example row
  const csv = [headers.join(","), sampleRow.join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lila_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AfterschoolFilterPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [students, setStudents] = useState<Student[]>(() => {
    if (typeof window === "undefined") return initialStudents;
    try {
      const raw = window.localStorage.getItem("students");
      return raw ? JSON.parse(raw) : initialStudents;
    } catch {
      return initialStudents;
    }
  });
  const [activities, setActivities] = useState<string[]>(() => {
    if (typeof window === "undefined") return Array.from(new Set(initialStudents.flatMap(s => s.activities.filter(a=>a.when==="afterschool").map(a=>a.name))));
    try {
      const raw = window.localStorage.getItem("activities");
      return raw ? JSON.parse(raw) : Array.from(new Set(initialStudents.flatMap(s => s.activities.filter(a=>a.when==="afterschool").map(a=>a.name))));
    } catch {
      return Array.from(new Set(initialStudents.flatMap(s => s.activities.filter(a=>a.when==="afterschool").map(a=>a.name))));
    }
  });
  // Optional color mapping per activity name
  const [activityColors, setActivityColors] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem("activityColors");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [newActivity, setNewActivity] = useState("");
  const [newActivityColor, setNewActivityColor] = useState<string>("#6366F1");
  const [view, setView] = useState<"filter" | "manage" | "import" | "activities">("filter");
  const [openPopover, setOpenPopover] = useState<null | "grade" | "sub" | "activity" | "day" | "sort">(null);

  // filters (Filter & Print)
  const [query, setQuery] = useState("");
  const [grades, setGrades] = useState<Grade[]>(["K",1,2,3,4,5]);
  const [subclasses, setSubclasses] = useState<SubClass[]>(["A","B","C","D"]);
  const [activityName, setActivityName] = useState("");
  const [day, setDay] = useState<Weekday | "">("");
  const [sortBy, setSortBy] = useState<"name"|"grade"|"subClass">("name");

  // manage tab
  const [mSearch, setMSearch] = useState("");
  const [mGrade, setMGrade] = useState<Grade | "">("");
  const [mSub, setMSub] = useState<SubClass | "">("");
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<Weekday | "">("");

  // import tab
  type ImportRow = { id: string; first: string; last: string; grade?: Grade | ""; sub?: SubClass | ""; activity: string; day: Weekday | "" };
  const [importGrade, setImportGrade] = useState<Grade | "">("");
  const [importSub, setImportSub] = useState<SubClass | "">("");
  const [namesText, setNamesText] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
    if (lines.length === 0) { alert("Empty CSV"); return; }
    const header = lines[0].split(",").map((h: string) => h.trim().toLowerCase());
    const idx = {
      last: header.findIndex((h: string) => h.includes("last")),
      first: header.findIndex((h: string) => h.includes("first")),
      grade: header.findIndex((h: string) => h.startsWith("grade") || h === "class"),
      sub: header.findIndex((h: string) => h.includes("sub")),
    };
    const hasHeader = Object.values(idx).some(i => i >= 0);
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const parsed: ImportRow[] = [];
    dataLines.forEach((line: string, i: number) => {
      const cells = line.split(",").map((c: string) => c.trim().replace(/^"|"$/g, ""));
      const last = cells[idx.last >= 0 ? idx.last : 0] || "";
      const first = cells[idx.first >= 0 ? idx.first : 1] || "";
      const gRaw = cells[idx.grade >= 0 ? idx.grade : 2] || "";
      const sRaw = cells[idx.sub >= 0 ? idx.sub : 3] || "";
      let g: Grade | "" = "";
      const gNorm = gRaw.toString().trim().toUpperCase();
      if (gNorm === "K") g = "K";
      else {
        const n = parseInt(gNorm, 10);
        if ([1,2,3,4,5].includes(n)) g = n as Grade;
      }
      let sub: SubClass | "" = "";
      const sNorm = sRaw.toString().trim().toUpperCase();
      if (["A","B","C","D"].includes(sNorm)) sub = sNorm as SubClass;
      if (!first && !last) return;
      parsed.push({ id: `CSV-${Date.now()}-${i+1}`, first, last, grade: g, sub, activity: "", day: "" });
    });
    if (!parsed.length) { alert("No valid rows found in CSV"); return; }
    setRows(parsed);
    e.target.value = "";
  }

  // effects
  useEffect(()=>{ if (typeof window !== "undefined") window.localStorage.setItem("students", JSON.stringify(students)); },[students]);
  useEffect(()=>{ if (typeof window !== "undefined") window.localStorage.setItem("activities", JSON.stringify(activities)); },[activities]);
  useEffect(()=>{ if (typeof window !== "undefined") window.localStorage.setItem("activityColors", JSON.stringify(activityColors)); },[activityColors]);

  function downloadSnapshot() {
    const snapshot: AppSnapshot = { students, activities, activityColors };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lila_afterschool_snapshot_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportSnapshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text) as AppSnapshot;
      if (!Array.isArray(json.students) || !Array.isArray(json.activities)) { alert("Invalid snapshot file"); return; }
      setStudents(json.students);
      setActivities(json.activities);
      if (json.activityColors) setActivityColors(json.activityColors);
      alert("Data imported successfully.");
  } catch {
      alert("Failed to import file. Make sure it's a valid snapshot JSON.");
    } finally {
      e.target.value = "";
    }
  }

  // computed
  const afterschoolOnly = useMemo(() => students.map((s: Student) => ({
    ...s,
    activities: s.activities.filter((a: Activity) => a.when === "afterschool"),
  })), [students]);
  const activitiesCatalog = useMemo(() => {
    const set = new Set<string>(activities);
    afterschoolOnly.forEach((s: Student) => s.activities.forEach((a: Activity) => set.add(a.name)));
    return Array.from(set).sort((a: string, b: string) => a.localeCompare(b));
  }, [activities, afterschoolOnly]);

  const gradeOptions: Grade[] = ["K",1,2,3,4,5];
  const subclassOptions: SubClass[] = ["A","B","C","D"];
  const dayOptions: Weekday[] = ["Monday","Tuesday","Wednesday","Thursday","Friday"];

  function toggleMulti<T>(list: T[], value: T) { return list.includes(value) ? list.filter(v=>v!==value) : [...list, value]; }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows: Array<Student & { activities: Activity[] }> = afterschoolOnly
      .filter((s: Student) => grades.includes(s.grade))
      .filter((s: Student) => subclasses.includes(s.subClass))
      .filter((s: Student) => q ? (`${s.first} ${s.last}`.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)) : true)
      .map((s: Student) => ({
        ...s,
        activities: s.activities.filter((a: Activity) => {
          if (activityName && a.name !== activityName) return false;
          if (day && a.day !== day) return false;
          return true;
        }),
      }))
      .filter((s: Student) => s.activities.length > 0);
    switch (sortBy) {
      case "name": rows.sort((a: Student, b: Student) => fullName(a).localeCompare(fullName(b))); break;
      case "grade": { const order: Record<Grade, number> = { K: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }; rows.sort((a: Student, b: Student) => order[a.grade] - order[b.grade] || a.subClass.localeCompare(b.subClass) || fullName(a).localeCompare(fullName(b))); break; }
      case "subClass": rows.sort((a: Student, b: Student) => a.subClass.localeCompare(b.subClass) || fullName(a).localeCompare(fullName(b))); break;
    }
    return rows;
  }, [afterschoolOnly, grades, subclasses, query, activityName, sortBy, day]);

  function removeActivityFromStudent(id: string, name: string, d?: Weekday) {
    setStudents(prev=>prev.map(s=> s.id!==id ? s : ({...s, activities: s.activities.filter(a=>!(a.when==="afterschool" && a.name===name && (d ? a.day===d : true)))})));
  }

  function assignActivityToStudent(id: string) {
    if (!selectedActivity.trim()) { alert("Select an activity first."); return; }
    setStudents(prev=>prev.map(s=>{
      if (s.id!==id) return s; const exists = s.activities.some(a=>a.when==="afterschool" && a.name===selectedActivity && (!selectedDay || a.day===selectedDay));
      if (exists) return s; return { ...s, activities: [...s.activities, { name: selectedActivity, when: "afterschool", day: selectedDay || undefined }] };
    }));
  }

  function deleteStudent(id: string) {
    if (!confirm("Delete this student? This cannot be undone.")) return;
    setStudents(prev => prev.filter(s => s.id !== id));
  }

  function clearAllStudents() {
    if (!confirm("Clear ALL students? This cannot be undone.")) return;
    setStudents([]);
  }

  function previewClass() {
    if (!importGrade) { alert("Choose a grade (e.g., K, 1…)"); return; }
    if (!importSub) { alert("Choose a subclass (A/B/C)"); return; }
    const raw = namesText.trim(); if (!raw) { alert("Paste the class list (one per line or comma-separated)"); return; }
    const tokens = raw.split(/\r?\n|,|;|\t/).map(t=>t.trim()).filter(Boolean);
    if (!tokens.length) { alert("No names detected"); return; }
    const next: ImportRow[] = tokens.map((tok,i)=>{ const p = parseName(tok) || { first: tok, last: "" }; return { id: `TMP-${Date.now()}-${i+1}`, first: p.first, last: p.last, activity: "", day: "" }; });
    setRows(next);
  }

  function commitImport() {
    if (!rows.length) { alert("Nothing to import. Use Preview Class or upload CSV first."); return; }
    setStudents(prev=>{
      const byKey = new Map<string, Student>(prev.map(s=>[(`${s.grade}|${s.subClass}|${s.first.toLowerCase()}|${s.last.toLowerCase()}`), s]));
      const next = [...prev];
      rows.forEach((r,idx)=>{
        const rowGrade = (r.grade ?? importGrade) as Grade | "";
        const rowSub = (r.sub ?? importSub) as SubClass | "";
        if (!rowGrade || !rowSub) { return; }
        const key = `${rowGrade}|${rowSub}|${r.first.toLowerCase()}|${r.last.toLowerCase()}`;
        const actName = r.activity.trim(); const act = actName ? ({ name: actName, when: "afterschool", day: (r.day || undefined) } as Activity) : undefined;
        if (byKey.has(key)) {
          const s = byKey.get(key)!; s.grade = rowGrade as Grade; s.subClass = rowSub as SubClass;
          if (act) { const has = s.activities.some(a=>a.when==="afterschool" && a.name===act.name && (!act.day || a.day===act.day)); if (!has) s.activities.push(act); }
        } else {
          const id = `IMP-${Date.now()}-${idx+1}`; next.push({ id, first: r.first, last: r.last, grade: rowGrade as Grade, subClass: rowSub as SubClass, activities: act ? [act] : [] });
        }
      });
      return next;
    });
    const uniqueActs = new Set(rows.map(r=>r.activity.trim()).filter(Boolean)); if (uniqueActs.size) setActivities(prev=>Array.from(new Set([...prev, ...uniqueActs])).sort((a,b)=>a.localeCompare(b)));
    setRows([]); setNamesText(""); alert("Class imported. You can now see them in Filter & Print.");
  }

  function updateRow(id: string, patch: Partial<ImportRow>) { setRows(prev=>prev.map(r=> r.id===id ? { ...r, ...patch } : r)); }
  function deleteRow(id: string) { setRows(prev=>prev.filter(r=> r.id!==id)); }

  return (
    <>
      <main className="min-h-screen bg-gray-50 text-gray-900">
        {/* Page title header */}
        <div className="max-w-[1200px] mx-auto px-4 pt-6">
          <div className="flex items-center gap-3">
            <Image src="/LILA-logo (1).svg" alt="LILA" width={64} height={64} className="h-12 w-12 md:h-16 md:w-16" />
            <h1 className="text-xl md:text-2xl font-semibold">LILA After school Filter</h1>
          </div>
        </div>

        {/* Main two-column area (flex) */}
  <div className="max-w-[1200px] mx-auto px-4 py-6 flex gap-6 items-start w-full">
          <div className="sticky top-8 self-start shrink-0">
            <Sidebar
              current={view}
              onSelect={(v)=>setView(v)}
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(v => !v)}
            />
          </div>

          <div className="flex-1 min-w-0">
            {view === "filter" && (
              <>
                {/* Filter toolbar */}
                <div className="flex flex-wrap gap-2 items-center mb-4 relative">
                  {/* Search (moved here from top header) */}
                  <div className="relative w-full md:w-auto md:min-w-[280px]">
                    <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      value={query}
                      onChange={(e)=>setQuery(e.target.value)}
                      placeholder="Search by name or ID…"
                      className="w-full md:w-72 pl-9 pr-3 py-2 rounded-full bg-white text-gray-900 border border-gray-300 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* Grade */}
                  <div className="relative">
                    <button onClick={()=>setOpenPopover(openPopover==='grade'?null:'grade')} className="px-3 py-1.5 rounded-full bg-white text-gray-900 text-sm flex items-center gap-2 border border-gray-300 hover:border-gray-400">
                      <IconFilter /> Grade
                    </button>
                    {openPopover==='grade' && (
                      <div className="absolute z-20 mt-2 w-64 rounded-xl bg-white text-gray-900 shadow-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Grades</span>
                          <button className="text-sm text-blue-600" onClick={()=>{ setGrades(gradeOptions); }}>Clear</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {gradeOptions.map(g => (
                            <button key={String(g)} onClick={()=>setGrades(prev=>toggleMulti(prev, g))} className={`px-2 py-1 rounded-full border text-sm ${grades.includes(g)?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300'}`}>{g}</button>
                          ))}
                        </div>
                        <div className="text-right mt-3"><button className="text-sm" onClick={()=>setOpenPopover(null)}>Close</button></div>
                      </div>
                    )}
                  </div>

                  {/* Subclass */}
                  <div className="relative">
                    <button onClick={()=>setOpenPopover(openPopover==='sub'?null:'sub')} className="px-3 py-1.5 rounded-full bg-white text-gray-900 text-sm flex items-center gap-2 border border-gray-300 hover:border-gray-400">
                      <IconFilter /> Subclass
                    </button>
                    {openPopover==='sub' && (
                      <div className="absolute z-20 mt-2 w-56 rounded-xl bg-white text-gray-900 shadow-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Subclasses</span>
                          <button className="text-sm text-blue-600" onClick={()=>{ setSubclasses(["A","B","C","D"]); }}>Clear</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {subclassOptions.map(sc => (
                            <button key={sc} onClick={()=>setSubclasses(prev=>toggleMulti(prev, sc))} className={`px-2 py-1 rounded-full border text-sm ${subclasses.includes(sc)?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300'}`}>{sc}</button>
                          ))}
                        </div>
                        <div className="text-right mt-3"><button className="text-sm" onClick={()=>setOpenPopover(null)}>Close</button></div>
                      </div>
                    )}
                  </div>

                  {/* Activity */}
                  <div className="relative">
                    <button onClick={()=>setOpenPopover(openPopover==='activity'?null:'activity')} className="px-3 py-1.5 rounded-full bg-white text-gray-900 text-sm flex items-center gap-2 border border-gray-300 hover:border-gray-400">
                      <IconFilter /> Activity
                    </button>
                    {openPopover==='activity' && (
                      <div className="absolute z-20 mt-2 w-72 rounded-xl bg-white text-gray-900 shadow-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Activity</span>
                          <button className="text-sm text-blue-600" onClick={()=>{ setActivityName(""); }}>Clear</button>
                        </div>
                        <select value={activityName} onChange={(e)=>setActivityName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                          <option value="">All afterschool</option>
                          {activitiesCatalog.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <div className="text-right mt-3"><button className="text-sm" onClick={()=>setOpenPopover(null)}>Close</button></div>
                      </div>
                    )}
                  </div>

                  {/* Day */}
                  <div className="relative">
                    <button onClick={()=>setOpenPopover(openPopover==='day'?null:'day')} className="px-3 py-1.5 rounded-full bg-white text-gray-900 text-sm flex items-center gap-2 border border-gray-300 hover:border-gray-400">
                      <IconCalendar /> Day
                    </button>
                    {openPopover==='day' && (
                      <div className="absolute z-20 mt-2 w-56 rounded-xl bg-white text-gray-900 shadow-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Day</span>
                          <button className="text-sm text-blue-600" onClick={()=>{ setDay(""); }}>Clear</button>
                        </div>
                        <select value={day} onChange={(e)=>setDay(e.target.value as Weekday | "")} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                          <option value="">All days</option>
                          {dayOptions.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <div className="text-right mt-3"><button className="text-sm" onClick={()=>setOpenPopover(null)}>Close</button></div>
                      </div>
                    )}
                  </div>

                  {/* Sort */}
                  <div className="relative">
                    <button onClick={()=>setOpenPopover(openPopover==='sort'?null:'sort')} className="px-3 py-1.5 rounded-full bg-white text-gray-900 text-sm flex items-center gap-2 border border-gray-300 hover:border-gray-400">
                      <IconSort /> Sort
                    </button>
                    {openPopover==='sort' && (
                      <div className="absolute z-20 mt-2 w-56 rounded-xl bg-white text-gray-900 shadow-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Sort by</span>
                          <button className="text-sm text-blue-600" onClick={()=>{ setSortBy("name"); }}>Reset</button>
                        </div>
                        <select value={sortBy} onChange={(e)=>setSortBy(e.target.value as "name" | "grade" | "subClass")} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                          <option value="name">Name</option>
                          <option value="grade">Grade</option>
                          <option value="subClass">SubClass</option>
                        </select>
                        <div className="text-right mt-3"><button className="text-sm" onClick={()=>setOpenPopover(null)}>Close</button></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Results table */}
                <section id="results-table" className="overflow-x-auto bg-white rounded-2xl shadow border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left font-semibold px-4 py-3">ID</th>
                        <th className="text-left font-semibold px-4 py-3">Name</th>
                        <th className="text-left font-semibold px-4 py-3">Grade</th>
                        <th className="text-left font-semibold px-4 py-3">Sub</th>
                        <th className="text-left font-semibold px-4 py-3">Afterschool Activity</th>
                        <th className="text-left font-semibold px-4 py-3">Day</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.flatMap((s) => (
                        s.activities.map((a, idx) => (
                          <tr key={`${s.id}-${idx}`} className="border-t border-gray-200">
                            <td className="px-4 py-2 whitespace-nowrap">{s.id}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{fullName(s)}</td>
                            <td className="px-4 py-2">{s.grade === "K" ? "K" : s.grade}</td>
                            <td className="px-4 py-2">{s.subClass}</td>
                            <td className="px-4 py-2">
                              <span className="inline-flex items-center gap-2">
                                <span className="inline-block w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: activityColors[a.name] || '#e5e7eb', borderColor: activityColors[a.name] || '#e5e7eb' }} />
                                {a.name}
                              </span>
                            </td>
                            <td className="px-4 py-2">{a.day ?? "—"}</td>
                          </tr>
                        ))
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-gray-500">No matches. Adjust filters above.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </section>

                <div className="flex justify-end mt-4">
                  <button onClick={exportFilteredTable} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">Download / Print</button>
                </div>
              </>
            )}

            {view !== "filter" && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-700">
                {view === "manage" && (
                  <>
                    <header className="mb-6">
                      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manage Activities</h1>
                      <p className="text-sm text-gray-600 mt-1">Select an activity and day, filter the list, then assign.</p>
                    </header>

                    <section className="bg-white border border-gray-200 rounded-2xl p-4 md:p-6 mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Search</label>
                          <input value={mSearch} onChange={e=>setMSearch(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2" placeholder="Name or ID…" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Grade</label>
                          <select value={mGrade} onChange={e=>{ const v = e.target.value; if (v === "") setMGrade(""); else if (v === "K") setMGrade("K"); else setMGrade(Number(v) as Grade); }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2">
                            <option value="">All</option>
                            {gradeOptions.map(g => <option key={String(g)} value={g === "K" ? "K" : String(g)}>{g === "K" ? "K" : g}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Subclass</label>
                          <select value={mSub} onChange={e=>setMSub((e.target.value || "") as SubClass | "")} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2">
                            <option value="">All</option>
                            {subclassOptions.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div>
                          <label className="block text-sm font-medium mb-1">Activity</label>
                          <select value={selectedActivity} onChange={e => setSelectedActivity(e.target.value)} className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select activity…</option>
                            {activitiesCatalog.map(a => (<option key={a} value={a}>{a}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Day</label>
                          <select value={selectedDay} onChange={e => setSelectedDay(e.target.value as Weekday | "")} className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select day…</option>
                            {dayOptions.map(d => (<option key={d} value={d}>{d}</option>))}
                          </select>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white rounded-2xl shadow p-4 md:p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold">Students</h2>
                        <div className="flex items-center gap-2">
                          <input id="snapshot-file" type="file" accept="application/json" onChange={handleImportSnapshot} className="hidden" />
                          <button onClick={downloadSnapshot} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">Save data</button>
                          <label htmlFor="snapshot-file" className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 cursor-pointer">Load data</label>
                          <button onClick={clearAllStudents} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">Clear all students</button>
                        </div>
                      </div>
                      <div className="overflow-auto rounded-xl border border-gray-200 max-h-[32rem]">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2">Student</th>
                              <th className="text-left px-3 py-2">Grade/Sub</th>
                              <th className="text-left px-3 py-2">Current afterschool</th>
                              <th className="text-left px-3 py-2">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students
                              .filter(s=> (mGrade==="" || s.grade===mGrade) && (mSub==="" || s.subClass===mSub))
                              .filter(s=>{ const q=mSearch.trim().toLowerCase(); return q ? (`${s.first} ${s.last}`.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)) : true; })
                              .sort((a,b)=> (a.grade===b.grade? a.subClass.localeCompare(b.subClass): (a.grade==="K"?0:a.grade) - (b.grade==="K"?0:b.grade)) || fullName(a).localeCompare(fullName(b)))
                              .map(s=> (
                                <tr key={s.id} className="border-t border-gray-200">
                                  <td className="px-3 py-2 whitespace-nowrap">{fullName(s)}</td>
                                  <td className="px-3 py-2">{s.grade === "K" ? "K" : s.grade}/{s.subClass}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-2">
                                      {s.activities.filter(a => a.when === "afterschool").map((a, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border text-xs">
                                          <span className="inline-block w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: activityColors[a.name] || '#e5e7eb', borderColor: activityColors[a.name] || '#e5e7eb' }} />
                                          {a.name}{a.day ? `· ${a.day}` : ""}
                                          <button className="ml-1 text-red-600" onClick={() => removeActivityFromStudent(s.id, a.name, a.day)}>×</button>
                                        </span>
                                      ))}
                                      {s.activities.filter(a => a.when === "afterschool").length === 0 && (
                                        <span className="text-xs text-gray-500">None</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => assignActivityToStudent(s.id)} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm">Assign</button>
                                      <button onClick={() => deleteStudent(s.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm">Delete</button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </>
                )}

                {view === "import" && (
                  <>
                    <header className="mb-6">
                      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Import a Class</h1>
                      <p className="text-sm text-gray-600 mt-1">Paste students for a single class (e.g., <span className="font-medium">KA</span>, <span className="font-medium">KB</span>, <span className="font-medium">1A</span>) or upload a CSV with columns <span className="font-medium">Last Name, First Name, Grade, Subclass</span>. Then assign activities per student before adding.</p>
                    </header>

                    <section className="bg-white rounded-2xl shadow p-4 md:p-6 mb-6 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div>
                          <label className="block text-sm font-medium mb-1">Grade</label>
                          <select value={importGrade === "" ? "" : String(importGrade)} onChange={e => { const v = e.target.value; if (v === "") setImportGrade(""); else if (v === "K") setImportGrade("K"); else setImportGrade(Number(v) as Grade); }} className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select…</option>
                            {gradeOptions.map(g => (<option key={String(g)} value={g === "K" ? "K" : String(g)}>{g === "K" ? "K" : g}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Subclass</label>
                          <select value={importSub || ""} onChange={e => setImportSub(e.target.value as SubClass)} className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select…</option>
                            {subclassOptions.map(sc => (<option key={sc} value={sc}>{sc}</option>))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">Upload CSV (Last Name, First Name, Grade, Subclass)</label>
                          <input type="file" accept=".csv" onChange={handleCSVUpload} className="w-full rounded-xl border border-gray-300 px-3 py-2 bg-white" />
                          <p className="text-xs text-gray-500 mt-1">Tip: Use the &quot;Download template (CSV)&quot; button to get a sample file.</p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">Paste names (one per line or comma-separated)</label>
                          <textarea value={namesText} onChange={e => setNamesText(e.target.value)} className="w-full h-48 border rounded-xl p-3 font-mono text-sm resize-y border-gray-300" placeholder={`Ava Nguyen\nBen Ortiz\nChloe Singh`}></textarea>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-3">
                        <button onClick={downloadImportTemplate} className="px-4 py-2 rounded-lg border text-sm">Download template (CSV)</button>
                        <button onClick={previewClass} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">Preview class</button>
                      </div>
                    </section>

                    {rows.length > 0 && (
                      <section className="bg-white rounded-2xl shadow p-4 md:p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="text-lg font-semibold">Set activities for each student</h2>
                          <div className="flex items-center gap-3">
                            <button onClick={() => setRows([])} className="text-sm px-3 py-1.5 rounded-lg border">Clear list</button>
                          </div>
                        </div>

                        <datalist id="activities-suggest">
                          {activitiesCatalog.map(a => <option key={a} value={a} />)}
                        </datalist>

                        <div className="overflow-auto rounded-xl border max-h-96 border-gray-200">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                              <tr>
                                <th className="text-left px-3 py-2">First</th>
                                <th className="text-left px-3 py-2">Last</th>
                                <th className="text-left px-3 py-2">Grade</th>
                                <th className="text-left px-3 py-2">Subclass</th>
                                <th className="text-left px-3 py-2">Activity (type or pick)</th>
                                <th className="text-left px-3 py-2">Day</th>
                                <th className="text-left px-3 py-2">Remove</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map(r => (
                                <tr key={r.id} className="border-t border-gray-200">
                                  <td className="px-3 py-2"><input value={r.first} onChange={e => updateRow(r.id, { first: e.target.value })} className="w-40 rounded border px-2 py-1" /></td>
                                  <td className="px-3 py-2"><input value={r.last} onChange={e => updateRow(r.id, { last: e.target.value })} className="w-40 rounded border px-2 py-1" /></td>
                                  <td className="px-3 py-2">
                                    <select value={r.grade === undefined ? "" : r.grade === "" ? "" : String(r.grade)} onChange={e => { const v = e.target.value; if (v === "") updateRow(r.id, { grade: "" }); else if (v === "K") updateRow(r.id, { grade: "K" }); else updateRow(r.id, { grade: Number(v) as Grade }); }} className="rounded border px-2 py-1">
                                      <option value="">—</option>
                                      {gradeOptions.map(g => (<option key={String(g)} value={g === "K" ? "K" : String(g)}>{g === "K" ? "K" : g}</option>))}
                                    </select>
                                  </td>
                                  <td className="px-3 py-2">
                                    <select value={r.sub || ""} onChange={e => updateRow(r.id, { sub: (e.target.value || "") as SubClass | "" })} className="rounded border px-2 py-1">
                                      <option value="">—</option>
                                      {subclassOptions.map(sc => (<option key={sc} value={sc}>{sc}</option>))}
                                    </select>
                                  </td>
                                  <td className="px-3 py-2">
                                    <input list="activities-suggest" value={r.activity} onChange={e => updateRow(r.id, { activity: e.target.value })} placeholder="(optional)" className="w-56 rounded border px-2 py-1" />
                                    <div className="text-xs text-gray-500 mt-1">Leave blank if no afterschool.</div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <select value={r.day} onChange={e => updateRow(r.id, { day: e.target.value as Weekday | "" })} className="rounded border px-2 py-1">
                                      <option value="">—</option>
                                      {dayOptions.map(d => (<option key={d} value={d}>{d}</option>))}
                                    </select>
                                  </td>
                                  <td className="px-3 py-2"><button onClick={() => deleteRow(r.id)} className="text-sm px-3 py-1.5 rounded-lg border">Delete</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-end mt-4">
                          <button onClick={commitImport} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Add to database</button>
                        </div>
                      </section>
                    )}
                  </>
                )}

                {view === "activities" && (
                  <>
                    <header className="mb-6">
                      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Activities</h1>
                      <p className="text-sm text-gray-600 mt-1">Create and manage the list of school activities. These will be selectable or type-ahead in other tabs.</p>
                    </header>
                    <section className="bg-white rounded-2xl shadow p-4 md:p-6 mb-6 border border-gray-200">
                      <h2 className="text-lg font-semibold mb-3">Add a new activity</h2>
                      <div className="flex gap-3 items-end flex-wrap">
                        <div className="flex-1">
                          <label className="block text-sm font-medium mb-1">Activity name</label>
                          <input value={newActivity} onChange={e => setNewActivity(e.target.value)} placeholder="e.g., Yoga" className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Color</label>
                          <input type="color" value={newActivityColor} onChange={e => setNewActivityColor(e.target.value)} className="h-10 w-14 p-1 rounded border" />
                        </div>
                        <button onClick={() => { const n = newActivity.trim(); if (!n) return; setActivities(prev => prev.includes(n) ? prev : [...prev, n].sort((a,b)=>a.localeCompare(b))); setActivityColors(prev => ({ ...prev, [n]: newActivityColor })); setNewActivity(""); }} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">Add</button>
                      </div>
                    </section>
                    <section className="bg-white rounded-2xl shadow p-4 md:p-6 border border-gray-200">
                      <h2 className="text-lg font-semibold mb-3">Existing activities</h2>
                      {activitiesCatalog.length === 0 ? (
                        <p className="text-sm text-gray-600">No activities yet. Add your first above.</p>
                      ) : (
                        <ul className="divide-y rounded-xl border border-gray-200">
                          {activitiesCatalog.map(a => (
                            <li key={a} className="flex items-center justify-between p-3 gap-3">
                              <div className="flex items-center gap-3">
                                <span className="inline-block w-4 h-4 rounded border" style={{ backgroundColor: activityColors[a] || '#e5e7eb', borderColor: activityColors[a] || '#e5e7eb' }} />
                                <span>{a}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="color" value={activityColors[a] || '#e5e7eb'} onChange={e => setActivityColors(prev => ({ ...prev, [a]: e.target.value }))} className="h-8 w-10 p-1 rounded border" />
                                <button className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50" onClick={() => { setActivities(prev => prev.filter(x => x !== a)); setActivityColors(prev => { const c = { ...prev }; delete c[a]; return c; }); }}>Delete</button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
