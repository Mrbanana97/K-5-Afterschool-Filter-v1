"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Sidebar from "./components/Sidebar";
import { IconCalendar, IconFilter, IconSearch, IconSort, IconMenu, IconActivity } from "./components/icons";

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

  // Printable window
  const w = window.open("", "", "width=900,height=650");
  if (!w) return;
  w.document.write("<html><head><title>Filtered Results</title><style>body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px;text-align:left} thead{background:#f3f4f6}</style></head><body>");
  w.document.write(element.outerHTML);
  w.document.write("</body></html>");
  w.document.close();
  w.print();

  // Also build CSV for download with Abstences (empty) column
  try {
    const rows: string[][] = [];
    const headerCells = Array.from(element.querySelectorAll('thead tr th')).map(th => th.textContent?.trim() || "");
    // Append new header if not already present
    const headers = headerCells.includes('Abstences') ? headerCells : [...headerCells, 'Abstences'];
    rows.push(headers);
    Array.from(element.querySelectorAll('tbody tr')).forEach(tr => {
      const cols = Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim().replace(/,/g,';') || "");
      if (cols.length === 0) return; // skip empty state row
      // Append blank for Abstences if needed
      if (headers.length !== cols.length) cols.push("");
      rows.push(cols);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lila_filtered_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.warn('CSV export failed', e);
  }
}

// Export a weekly sheet for a specific grade/subclass currently selected in filter controls (grades/subclasses arrays could be multi, we pick single if only one selected)
function exportWeekBySubgrade(students: Student[], activityColors: Record<string,string>, gradeFilter: Grade[] , subFilter: SubClass[]) {
  // Determine single grade + subclass (if multiple selected, abort with alert)
  const gSel = gradeFilter.length === 1 ? gradeFilter[0] : null;
  const sSel = subFilter.length === 1 ? subFilter[0] : null;
  if (!gSel || !sSel) { alert('Please filter to exactly one grade and one subclass first.'); return; }

  // Collect afterschool activities with a day
  const byDay: Record<Weekday, Array<{ student: Student; activity: Activity }>> = {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
  };
  students
    .filter(s => s.grade === gSel && s.subClass === sSel)
    .forEach(s => s.activities.filter(a => a.when === 'afterschool' && a.day).forEach(a => {
      byDay[a.day as Weekday].push({ student: s, activity: a });
    }));

  // Open printable
  const w = window.open('', '', 'width=1000,height=800');
  if (!w) return;
  w.document.write('<html><head><title>Week Export</title><style>body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;margin:16px} h2{margin-top:32px} table{border-collapse:collapse;width:100%;margin-top:8px} th,td{border:1px solid #ddd;padding:6px 8px;font-size:12px;text-align:left} thead{background:#f3f4f6} .day-block{page-break-inside:avoid;} .color-dot{display:inline-block;width:8px;height:8px;border-radius:9999px;border:1px solid #999;margin-right:4px;}</style></head><body>');
  w.document.write(`<h1 style="font-size:20px;font-weight:600;">Afterschool Activities - ${gSel === 'K' ? 'K' : gSel}${sSel}</h1>`);
  const order: Weekday[] = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  order.forEach(day => {
    const rows = byDay[day];
    w.document.write(`<div class="day-block"><h2>${day}</h2>`);
    if (rows.length === 0) {
      w.document.write('<p style="color:#666;font-size:12px;">No activities.</p></div>');
      return;
    }
    w.document.write('<table><thead><tr><th>Student</th><th>Activity</th><th>Absences</th></tr></thead><tbody>');
    rows
      .sort((a,b)=> fullName(a.student).localeCompare(fullName(b.student)) || (a.activity.name.localeCompare(b.activity.name)))
      .forEach(r => {
        const color = activityColors[r.activity.name] || '#e5e7eb';
        w.document.write(`<tr><td>${fullName(r.student)}</td><td><span class="color-dot" style="background:${color};border-color:${color}"></span>${r.activity.name}</td><td></td></tr>`);
      });
    w.document.write('</tbody></table></div>');
  });
  w.document.write('</body></html>');
  w.document.close();
  w.print();

  // Build CSV
  try {
    const csvRows: string[][] = [];
    csvRows.push(['Day','Student','Activity','Absences']);
    order.forEach(day => {
      byDay[day]
        .sort((a,b)=> fullName(a.student).localeCompare(fullName(b.student)) || a.activity.name.localeCompare(b.activity.name))
        .forEach(r => csvRows.push([day, fullName(r.student), r.activity.name, '']));
    });
    const csv = csvRows.map(r=>r.map(v=> v.replace(/,/g,';')).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `week_${gSel === 'K' ? 'K' : gSel}${sSel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch(e) { console.warn('Week CSV export failed', e); }
}

// Export all classes (every Grade x SubClass) into one document and one CSV
function exportAllWeeksBySubgrade(students: Student[], activityColors: Record<string,string>) {
  const gradesAll: Grade[] = ['K',1,2,3,4,5];
  const subsAll: SubClass[] = ['A','B','C','D'];
  const order: Weekday[] = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

  // Printable window
  const w = window.open('', '', 'width=1100,height=850');
  if (!w) return;
  w.document.write('<html><head><title>All Classes - Week Export</title><style>body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;margin:16px} h1{font-size:22px;margin:8px 0 16px} h2{margin-top:24px} table{border-collapse:collapse;width:100%;margin-top:8px} th,td{border:1px solid #ddd;padding:6px 8px;font-size:12px;text-align:left} thead{background:#f3f4f6} .page{page-break-after:always} .day-block{page-break-inside:avoid;} .color-dot{display:inline-block;width:8px;height:8px;border-radius:9999px;border:1px solid #999;margin-right:4px;}</style></head><body>');
  const csvRows: string[][] = [['Class','Day','Student','Activity','Absences']];

  gradesAll.forEach(gSel => {
    subsAll.forEach(sSel => {
      const byDay: Record<Weekday, Array<{ student: Student; activity: Activity }>> = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };
      students
        .filter(s => s.grade === gSel && s.subClass === sSel)
        .forEach(s => s.activities.filter(a => a.when === 'afterschool' && a.day).forEach(a => {
          byDay[a.day as Weekday].push({ student: s, activity: a });
        }));

      w.document.write(`<div class="page"><h1>Afterschool Activities - ${gSel === 'K' ? 'K' : gSel}${sSel}</h1>`);
      order.forEach(day => {
        const rows = byDay[day];
        w.document.write(`<div class="day-block"><h2>${day}</h2>`);
        if (rows.length === 0) { w.document.write('<p style="color:#666;font-size:12px;">No activities.</p></div>'); return; }
        w.document.write('<table><thead><tr><th>Student</th><th>Activity</th><th>Absences</th></tr></thead><tbody>');
        rows
          .sort((a,b)=> fullName(a.student).localeCompare(fullName(b.student)) || a.activity.name.localeCompare(b.activity.name))
          .forEach(r => {
            const color = activityColors[r.activity.name] || '#e5e7eb';
            w.document.write(`<tr><td>${fullName(r.student)}</td><td><span class="color-dot" style="background:${color};border-color:${color}"></span>${r.activity.name}</td><td></td></tr>`);
            csvRows.push([`${gSel === 'K' ? 'K' : gSel}${sSel}`, day, fullName(r.student), r.activity.name, '']);
          });
        w.document.write('</tbody></table></div>');
      });
      w.document.write('</div>');
    });
  });
  w.document.write('</body></html>');
  w.document.close();
  w.print();

  // Download combined CSV
  try {
    const csv = csvRows.map(r=> r.map(v=> v.replace(/,/g,';')).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all_classes_week.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch(e) { console.warn('All-classes CSV export failed', e); }
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

function downloadActivitiesTemplate() {
  const headers = ["Activity Name", "When", "Day", "Color"]; // CSV columns
  const sampleRows = [
    ["Lego Builders", "afterschool", "Monday", "#6366F1"],
    ["Soccer Club", "afterschool", "Wednesday", "#10B981"],
    ["Drama Crew", "afterschool", "Thursday", "#F59E0B"],
    ["Reading Buddies", "in-class", "", "#8B5CF6"],
    ["Math Lab", "lunch", "", "#EF4444"]
  ];
  const csv = [headers.join(","), ...sampleRows.map(row => row.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lila_activities_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AfterschoolFilterPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const [fadeClass, setFadeClass] = useState<string>("opacity-100");
  const transitionMs = 200;
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

  // Fade transition for tab changes
  function handleChangeView(v: "filter" | "manage" | "import" | "activities") {
    if (v === view) return;
    setFadeClass("opacity-0");
    setTimeout(() => {
      setView(v);
      requestAnimationFrame(() => setFadeClass("opacity-100"));
    }, transitionMs);
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

  return (
    <>
      <main className="min-h-screen bg-gray-50 text-gray-900 w-full overflow-x-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="w-full px-3 sm:px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button 
                aria-label="Open menu" 
                onClick={() => setMobileMenuOpen(true)} 
                className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] touch-manipulation shrink-0"
              >
                <IconMenu size={20} />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <Image src="/LILA-logo (1).svg" alt="LILA" width={32} height={32} className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" />
                <span className="font-semibold text-sm sm:text-base truncate">LILA Afterschool</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page title header (desktop) */}
        <div className="hidden md:block">
          <div className="w-full px-4 lg:px-6 pt-6 pb-2">
            <div className="flex items-center gap-4">
              <Image src="/LILA-logo (1).svg" alt="LILA" width={64} height={64} className="h-14 w-14 lg:h-16 lg:w-16 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">LILA After school Filter</h1>
                <p className="text-sm text-gray-600 mt-1">Manage K-5 afterschool activities and student assignments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile slide-over sidebar */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-[#0f1217] shadow-2xl transform transition-transform">
              <div className="flex flex-col h-full p-4">
                <div className="flex items-center justify-between mb-4 text-gray-100 pb-3 border-b border-white/10">
                  <div className="font-semibold text-lg">Navigation</div>
                  <button 
                    className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm transition-colors min-h-[44px] touch-manipulation" 
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <Sidebar
                    current={view}
                    onSelect={(v)=>{ handleChangeView(v); setMobileMenuOpen(false); }}
                    collapsed={false}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Flex layout: sidebar left, content right */}
        <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 flex gap-4 lg:gap-6 items-start">
          {/* Sidebar column (desktop) */}
          <div className="hidden md:block shrink-0">
            <Sidebar
              current={view}
              onSelect={(v)=>handleChangeView(v)}
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(v => !v)}
            />
          </div>

          {/* Content column */}
          <div className="flex-1 min-w-0 w-full">
            <div className={`transition-opacity duration-200 ${fadeClass}`}>
            {view === "filter" && (
              <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 md:p-6 shadow flex flex-col min-h-[calc(100dvh-10rem)]">
                {/* Filter toolbar */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 items-stretch sm:items-center mb-4 relative">
                  {/* Search (moved here from top header) */}
                  <div className="relative w-full sm:flex-1 sm:min-w-[240px] sm:max-w-sm">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      value={query}
                      onChange={(e)=>setQuery(e.target.value)}
                      placeholder="Search by name or ID…"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg sm:rounded-full bg-white text-gray-900 border border-gray-300 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>
                  
                  {/* Filter buttons row */}
                  <div className="flex flex-wrap gap-2">
                  {/* Grade */}
                  <div className="relative">
                    <button 
                      onClick={()=>setOpenPopover(openPopover==='grade'?null:'grade')} 
                      className="px-3 sm:px-4 py-2.5 rounded-lg sm:rounded-full bg-white text-gray-900 text-sm flex items-center gap-2 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px] touch-manipulation"
                      aria-label="Filter by grade"
                      aria-expanded={openPopover === 'grade'}
                    >
                      <IconFilter /> <span className="font-medium">Grade</span>
                    </button>
                    {openPopover==='grade' && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={()=>setOpenPopover(null)} />
                        <div className="absolute left-0 sm:left-auto z-20 mt-2 w-full sm:w-72 rounded-xl bg-white text-gray-900 shadow-xl ring-1 ring-black ring-opacity-5 p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold">Filter by Grade</span>
                            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium min-h-[44px] px-2 touch-manipulation" onClick={()=>{ setGrades(gradeOptions); }}>Select All</button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {gradeOptions.map(g => (
                              <button 
                                key={String(g)} 
                                onClick={()=>setGrades(prev=>toggleMulti(prev, g))} 
                                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all min-h-[44px] min-w-[44px] touch-manipulation ${grades.includes(g)?'bg-blue-600 text-white border-blue-600 shadow-sm':'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}
                                aria-pressed={grades.includes(g)}
                              >{g}</button>
                            ))}
                          </div>
                          <div className="text-right mt-4"><button className="text-sm font-medium text-gray-600 hover:text-gray-900 min-h-[44px] px-3 touch-manipulation" onClick={()=>setOpenPopover(null)}>Done</button></div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Subclass */}
                  <div className="relative">
                    <button 
                      onClick={()=>setOpenPopover(openPopover==='sub'?null:'sub')} 
                      className="px-3 sm:px-4 py-2.5 rounded-lg sm:rounded-full bg-white text-gray-900 text-sm flex items-center gap-2 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px] touch-manipulation"
                      aria-label="Filter by subclass"
                      aria-expanded={openPopover === 'sub'}
                    >
                      <IconFilter /> <span className="font-medium">Subclass</span>
                    </button>
                    {openPopover==='sub' && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={()=>setOpenPopover(null)} />
                        <div className="absolute left-0 sm:left-auto z-20 mt-2 w-full sm:w-64 rounded-xl bg-white text-gray-900 shadow-xl ring-1 ring-black ring-opacity-5 p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold">Filter by Subclass</span>
                            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium min-h-[44px] px-2 touch-manipulation" onClick={()=>{ setSubclasses(["A","B","C","D"]); }}>Select All</button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {subclassOptions.map(sc => (
                              <button 
                                key={sc} 
                                onClick={()=>setSubclasses(prev=>toggleMulti(prev, sc))} 
                                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all min-h-[44px] min-w-[44px] touch-manipulation ${subclasses.includes(sc)?'bg-blue-600 text-white border-blue-600 shadow-sm':'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}
                                aria-pressed={subclasses.includes(sc)}
                              >{sc}</button>
                            ))}
                          </div>
                          <div className="text-right mt-4"><button className="text-sm font-medium text-gray-600 hover:text-gray-900 min-h-[44px] px-3 touch-manipulation" onClick={()=>setOpenPopover(null)}>Done</button></div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Activity */}
                  <div className="relative">
                    <button 
                      onClick={()=>setOpenPopover(openPopover==='activity'?null:'activity')} 
                      className="px-3 sm:px-4 py-2.5 rounded-lg sm:rounded-full bg-white text-gray-900 text-sm flex items-center gap-2 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px] touch-manipulation"
                      aria-label="Filter by activity"
                      aria-expanded={openPopover === 'activity'}
                    >
                      <IconFilter /> <span className="font-medium">Activity</span>
                    </button>
                    {openPopover==='activity' && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={()=>setOpenPopover(null)} />
                        <div className="absolute left-0 sm:left-auto z-20 mt-2 w-full sm:w-80 rounded-xl bg-white text-gray-900 shadow-xl ring-1 ring-black ring-opacity-5 p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold">Filter by Activity</span>
                            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium min-h-[44px] px-2 touch-manipulation" onClick={()=>{ setActivityName(""); }}>Clear</button>
                          </div>
                          <select 
                            value={activityName} 
                            onChange={(e)=>setActivityName(e.target.value)} 
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                          >
                            <option value="">All afterschool</option>
                            {activitiesCatalog.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                          <div className="text-right mt-4"><button className="text-sm font-medium text-gray-600 hover:text-gray-900 min-h-[44px] px-3 touch-manipulation" onClick={()=>setOpenPopover(null)}>Done</button></div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Day */}
                  <div className="relative">
                    <button 
                      onClick={()=>setOpenPopover(openPopover==='day'?null:'day')} 
                      className="px-3 sm:px-4 py-2.5 rounded-lg sm:rounded-full bg-white text-gray-900 text-sm flex items-center gap-2 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px] touch-manipulation"
                      aria-label="Filter by day"
                      aria-expanded={openPopover === 'day'}
                    >
                      <IconCalendar /> <span className="font-medium">Day</span>
                    </button>
                    {openPopover==='day' && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={()=>setOpenPopover(null)} />
                        <div className="absolute left-0 sm:left-auto z-20 mt-2 w-full sm:w-64 rounded-xl bg-white text-gray-900 shadow-xl ring-1 ring-black ring-opacity-5 p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold">Filter by Day</span>
                            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium min-h-[44px] px-2 touch-manipulation" onClick={()=>{ setDay(""); }}>Clear</button>
                          </div>
                          <select 
                            value={day} 
                            onChange={(e)=>setDay(e.target.value as Weekday | "")} 
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                          >
                            <option value="">All days</option>
                            {dayOptions.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <div className="text-right mt-4"><button className="text-sm font-medium text-gray-600 hover:text-gray-900 min-h-[44px] px-3 touch-manipulation" onClick={()=>setOpenPopover(null)}>Done</button></div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Sort */}
                  <div className="relative">
                    <button 
                      onClick={()=>setOpenPopover(openPopover==='sort'?null:'sort')} 
                      className="px-3 sm:px-4 py-2.5 rounded-lg sm:rounded-full bg-white text-gray-900 text-sm flex items-center gap-2 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px] touch-manipulation"
                      aria-label="Sort results"
                      aria-expanded={openPopover === 'sort'}
                    >
                      <IconSort /> <span className="font-medium">Sort</span>
                    </button>
                    {openPopover==='sort' && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={()=>setOpenPopover(null)} />
                        <div className="absolute left-0 sm:left-auto z-20 mt-2 w-full sm:w-64 rounded-xl bg-white text-gray-900 shadow-xl ring-1 ring-black ring-opacity-5 p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold">Sort Results</span>
                            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium min-h-[44px] px-2 touch-manipulation" onClick={()=>{ setSortBy("name"); }}>Reset</button>
                          </div>
                          <select 
                            value={sortBy} 
                            onChange={(e)=>setSortBy(e.target.value as "name" | "grade" | "subClass")} 
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                          >
                            <option value="name">Name</option>
                            <option value="grade">Grade</option>
                            <option value="subClass">SubClass</option>
                          </select>
                          <div className="text-right mt-4"><button className="text-sm font-medium text-gray-600 hover:text-gray-900 min-h-[44px] px-3 touch-manipulation" onClick={()=>setOpenPopover(null)}>Done</button></div>
                        </div>
                      </>
                    )}
                  </div>
                  </div>
                </div>
                {/* Results table */}
                <section className="flex-1 rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="overflow-x-auto max-h-[calc(100vh-20rem)]" id="results-table">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                          <th className="text-left font-semibold px-2 sm:px-3 md:px-4 py-3 min-w-[100px]">Name</th>
                          <th className="text-left font-semibold px-2 sm:px-3 md:px-4 py-3 whitespace-nowrap w-16">Grade</th>
                          <th className="text-left font-semibold px-2 sm:px-3 md:px-4 py-3 whitespace-nowrap w-12">Sub</th>
                          <th className="text-left font-semibold px-2 sm:px-3 md:px-4 py-3 min-w-[150px]">Afterschool Activity</th>
                          <th className="text-left font-semibold px-2 sm:px-3 md:px-4 py-3 whitespace-nowrap w-24">Day</th>
                          <th className="text-left font-semibold px-2 sm:px-3 md:px-4 py-3 whitespace-nowrap w-24">Absences</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.flatMap((s) => (
                          s.activities.map((a, idx) => (
                            <tr key={`${s.id}-${idx}`} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                              <td className="px-2 sm:px-3 md:px-4 py-2.5 font-medium text-gray-900 break-words">{fullName(s)}</td>
                              <td className="px-2 sm:px-3 md:px-4 py-2.5 text-center whitespace-nowrap">{s.grade === "K" ? "K" : s.grade}</td>
                              <td className="px-2 sm:px-3 md:px-4 py-2.5 text-center whitespace-nowrap">{s.subClass}</td>
                              <td className="px-2 sm:px-3 md:px-4 py-2.5">
                                <span className="inline-flex items-center gap-1.5 sm:gap-2">
                                  <span className="inline-block w-2.5 h-2.5 rounded-full border shrink-0" style={{ backgroundColor: activityColors[a.name] || '#e5e7eb', borderColor: activityColors[a.name] || '#e5e7eb' }} />
                                  <span className="break-words">{a.name}</span>
                                </span>
                              </td>
                              <td className="px-2 sm:px-3 md:px-4 py-2.5 whitespace-nowrap">{a.day ?? "—"}</td>
                              <td className="px-2 sm:px-3 md:px-4 py-2.5 whitespace-nowrap"></td>
                            </tr>
                          ))
                        ))}
                        {filtered.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-16 text-center text-gray-500">
                              <div className="flex flex-col items-center gap-3">
                                <IconSearch size={32} className="text-gray-300" />
                                <p className="text-sm">No matches found. Try adjusting your filters.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end mt-4 pt-4 border-t border-gray-200">
                  <button 
                    onClick={exportFilteredTable} 
                    className="px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 active:bg-green-800 transition-colors shadow-sm hover:shadow min-h-[44px] touch-manipulation"
                  >
                    Download / Print (Current)
                  </button>
                  <button 
                    onClick={()=>exportWeekBySubgrade(students, activityColors, grades, subclasses)} 
                    className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm hover:shadow min-h-[44px] touch-manipulation"
                  >
                    Week Export (Per Day)
                  </button>
                  <button 
                    onClick={()=>exportAllWeeksBySubgrade(students, activityColors)} 
                    className="px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 active:bg-purple-800 transition-colors shadow-sm hover:shadow min-h-[44px] touch-manipulation"
                  >
                    Week Export (All Classes)
                  </button>
                </div>
              </div>
            )}

            {view !== "filter" && (
              <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 md:p-6 text-sm text-gray-700 flex flex-col min-h-[calc(100dvh-10rem)]">
                {view === "manage" && (
                  <>
                    <header className="mb-6">
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Manage Activities</h1>
                      <p className="text-sm text-gray-600 mt-2">Select an activity and day, filter the list, then assign.</p>
                    </header>

                    <section className="bg-gray-50 border border-gray-200 rounded-2xl p-3 sm:p-4 md:p-6 mb-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end mb-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5 text-gray-700">Search</label>
                          <input 
                            value={mSearch} 
                            onChange={e=>setMSearch(e.target.value)} 
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]" 
                            placeholder="Name or ID…" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5 text-gray-700">Grade</label>
                          <select 
                            value={mGrade} 
                            onChange={e=>{ const v = e.target.value; if (v === "") setMGrade(""); else if (v === "K") setMGrade("K"); else setMGrade(Number(v) as Grade); }} 
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                          >
                            <option value="">All</option>
                            {gradeOptions.map(g => <option key={String(g)} value={g === "K" ? "K" : String(g)}>{g === "K" ? "K" : g}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5 text-gray-700">Subclass</label>
                          <select 
                            value={mSub} 
                            onChange={e=>setMSub((e.target.value || "") as SubClass | "")} 
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                          >
                            <option value="">All</option>
                            {subclassOptions.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
                        <div>
                          <label className="block text-sm font-medium mb-1.5 text-gray-700">Activity to Assign</label>
                          <select 
                            value={selectedActivity} 
                            onChange={e => setSelectedActivity(e.target.value)} 
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                          >
                            <option value="">Select activity…</option>
                            {activitiesCatalog.map(a => (<option key={a} value={a}>{a}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5 text-gray-700">Day (Optional)</label>
                          <select 
                            value={selectedDay} 
                            onChange={e => setSelectedDay(e.target.value as Weekday | "")} 
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                          >
                            <option value="">Select day…</option>
                            {dayOptions.map(d => (<option key={d} value={d}>{d}</option>))}
                          </select>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <h2 className="text-lg font-semibold">Students</h2>
                        <div className="flex flex-wrap items-center gap-2">
                          <input id="snapshot-file" type="file" accept="application/json" onChange={handleImportSnapshot} className="hidden" />
                          <button 
                            onClick={downloadActivitiesTemplate} 
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 transition-colors min-h-[44px] touch-manipulation"
                          >
                            Download Template
                          </button>
                          <button 
                            onClick={downloadSnapshot} 
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 transition-colors min-h-[44px] touch-manipulation"
                          >
                            Save data
                          </button>
                          <label 
                            htmlFor="snapshot-file" 
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 cursor-pointer transition-colors min-h-[44px] flex items-center touch-manipulation"
                          >
                            Load data
                          </label>
                          <button 
                            onClick={clearAllStudents} 
                            className="px-3 py-2 rounded-lg border border-red-300 text-sm text-red-600 hover:bg-red-50 transition-colors min-h-[44px] touch-manipulation"
                          >
                            Clear all students
                          </button>
                        </div>
                      </div>
                      <div className="overflow-auto rounded-xl border border-gray-200 max-h-[32rem]">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                              <th className="text-left px-2 sm:px-3 md:px-4 py-3 font-semibold min-w-[100px]">Student</th>
                              <th className="text-left px-2 sm:px-3 md:px-4 py-3 font-semibold whitespace-nowrap w-20">Grade/Sub</th>
                              <th className="text-left px-2 sm:px-3 md:px-4 py-3 font-semibold min-w-[180px]">Afterschool Activities</th>
                              <th className="text-left px-2 sm:px-3 md:px-4 py-3 font-semibold min-w-[140px]">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students
                              .filter(s=> (mGrade==="" || s.grade===mGrade) && (mSub==="" || s.subClass===mSub))
                              .filter(s=>{ const q=mSearch.trim().toLowerCase(); return q ? (`${s.first} ${s.last}`.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)) : true; })
                              .sort((a,b)=> (a.grade===b.grade? a.subClass.localeCompare(b.subClass): (a.grade==="K"?0:a.grade) - (b.grade==="K"?0:b.grade)) || fullName(a).localeCompare(fullName(b)))
                              .map(s=> (
                                <tr key={s.id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                                  <td className="px-2 sm:px-3 md:px-4 py-3 font-medium break-words">{fullName(s)}</td>
                                  <td className="px-2 sm:px-3 md:px-4 py-3 text-center whitespace-nowrap">{s.grade === "K" ? "K" : s.grade}/{s.subClass}</td>
                                  <td className="px-2 sm:px-3 md:px-4 py-3">
                                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                      {s.activities.filter(a => a.when === "afterschool").map((a, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border text-xs">
                                          <span className="inline-block w-2.5 h-2.5 rounded-full border shrink-0" style={{ backgroundColor: activityColors[a.name] || '#e5e7eb', borderColor: activityColors[a.name] || '#e5e7eb' }} />
                                          <span className="break-words">{a.name}</span>{a.day ? ` · ${a.day}` : ""}
                                          <button 
                                            className="ml-1 text-red-600 hover:text-red-800 font-bold min-w-[20px] min-h-[20px] flex items-center justify-center touch-manipulation" 
                                            onClick={() => removeActivityFromStudent(s.id, a.name, a.day)}
                                            aria-label={`Remove ${a.name}`}
                                          >×</button>
                                        </span>
                                      ))}
                                      {s.activities.filter(a => a.when === "afterschool").length === 0 && (
                                        <span className="text-xs text-gray-500 italic">None</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-2 sm:px-3 md:px-4 py-3">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                      <button 
                                        onClick={() => assignActivityToStudent(s.id)} 
                                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[40px] touch-manipulation whitespace-nowrap"
                                      >
                                        Assign
                                      </button>
                                      <button 
                                        onClick={() => deleteStudent(s.id)} 
                                        className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs sm:text-sm font-medium hover:bg-red-700 active:bg-red-800 transition-colors min-h-[40px] touch-manipulation whitespace-nowrap"
                                      >
                                        Delete
                                      </button>
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
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Import a Class</h1>
                      <p className="text-sm text-gray-600 mt-2">Paste students for a single class (e.g., <span className="font-medium">KA</span>, <span className="font-medium">KB</span>, <span className="font-medium">1A</span>) or upload a CSV with columns <span className="font-medium">Last Name, First Name, Grade, Subclass</span>. Then assign activities per student before adding.</p>
                    </header>

                    <section className="bg-gray-50 rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 mb-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
                        <div>
                          <label className="block text-sm font-medium mb-1.5 text-gray-700">Grade</label>
                          <select 
                            value={importGrade === "" ? "" : String(importGrade)} 
                            onChange={e => { const v = e.target.value; if (v === "") setImportGrade(""); else if (v === "K") setImportGrade("K"); else setImportGrade(Number(v) as Grade); }} 
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                          >
                            <option value="">Select…</option>
                            {gradeOptions.map(g => (<option key={String(g)} value={g === "K" ? "K" : String(g)}>{g === "K" ? "K" : g}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5 text-gray-700">Subclass</label>
                          <select 
                            value={importSub || ""} 
                            onChange={e => setImportSub(e.target.value as SubClass)} 
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                          >
                            <option value="">Select…</option>
                            {subclassOptions.map(sc => (<option key={sc} value={sc}>{sc}</option>))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1.5 text-gray-700">Upload CSV (Last Name, First Name, Grade, Subclass)</label>
                          <input 
                            type="file" 
                            accept=".csv" 
                            onChange={handleCSVUpload} 
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 min-h-[44px]" 
                          />
                          <p className="text-xs text-gray-500 mt-2">Tip: Use the &quot;Download template (CSV)&quot; button to get a sample file.</p>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium mb-1.5 text-gray-700">Paste names (one per line or comma-separated)</label>
                          <textarea 
                            value={namesText} 
                            onChange={e => setNamesText(e.target.value)} 
                            className="w-full min-h-[200px] border rounded-lg p-3 font-mono text-sm resize-y border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            placeholder={`Ava Nguyen\nBen Ortiz\nChloe Singh`}
                          ></textarea>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4">
                        <button 
                          onClick={downloadImportTemplate} 
                          className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors min-h-[44px] touch-manipulation"
                        >
                          Download template (CSV)
                        </button>
                        <button 
                          onClick={previewClass} 
                          className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm hover:shadow min-h-[44px] touch-manipulation"
                        >
                          Preview class
                        </button>
                      </div>
                    </section>

                    {rows.length > 0 && (
                      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                          <h2 className="text-lg font-semibold">Set activities for each student</h2>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <button 
                              onClick={() => setRows([])} 
                              className="text-sm px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors min-h-[44px] touch-manipulation"
                            >
                              Clear list
                            </button>
                          </div>
                        </div>

                        <datalist id="activities-suggest">
                          {activitiesCatalog.map(a => <option key={a} value={a} />)}
                        </datalist>

                        <div className="overflow-auto rounded-xl border border-gray-200 max-h-96">
                          <table className="w-full text-xs sm:text-sm">
                            <thead className="bg-gray-100 sticky top-0 z-10">
                              <tr>
                                <th className="text-left px-2 sm:px-3 py-3 font-semibold min-w-[100px]">Student</th>
                                <th className="text-left px-2 sm:px-3 py-3 font-semibold whitespace-nowrap w-20">Grade/Sub</th>
                                <th className="text-left px-2 sm:px-3 py-3 font-semibold min-w-[180px]">Current afterschool</th>
                                <th className="text-left px-2 sm:px-3 py-3 font-semibold min-w-[140px]">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {students
                                .filter(s=> (mGrade==="" || s.grade===mGrade) && (mSub==="" || s.subClass===mSub))
                                .filter(s=>{ const q=mSearch.trim().toLowerCase(); return q ? (`${s.first} ${s.last}`.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)) : true; })
                                .sort((a,b)=> (a.grade===b.grade? a.subClass.localeCompare(b.subClass): (a.grade==="K"?0:a.grade) - (b.grade==="K"?0:b.grade)) || fullName(a).localeCompare(fullName(b)))
                                .map(s=> (
                                  <tr key={s.id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                                    <td className="px-2 sm:px-3 py-3 font-medium break-words">{fullName(s)}</td>
                                    <td className="px-2 sm:px-3 py-3 text-center whitespace-nowrap">{s.grade === "K" ? "K" : s.grade}/{s.subClass}</td>
                                    <td className="px-2 sm:px-3 py-3">
                                      <div className="flex flex-wrap gap-1.5">
                                        {s.activities.filter(a => a.when === "afterschool").map((a, idx) => (
                                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border text-xs">
                                            <span className="inline-block w-2.5 h-2.5 rounded-full border shrink-0" style={{ backgroundColor: activityColors[a.name] || '#e5e7eb', borderColor: activityColors[a.name] || '#e5e7eb' }} />
                                            <span className="break-words">{a.name}</span>{a.day ? ` · ${a.day}` : ""}
                                            <button 
                                              className="ml-1 text-red-600 hover:text-red-800 font-bold min-w-[20px] min-h-[20px] flex items-center justify-center touch-manipulation" 
                                              onClick={() => removeActivityFromStudent(s.id, a.name, a.day)}
                                              aria-label={`Remove ${a.name}`}
                                            >×</button>
                                          </span>
                                        ))}
                                        {s.activities.filter(a => a.when === "afterschool").length === 0 && (
                                          <span className="text-xs text-gray-500 italic">None</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-2 sm:px-3 py-3">
                                      <div className="flex flex-col sm:flex-row items-stretch gap-2">
                                        <button 
                                          onClick={() => assignActivityToStudent(s.id)} 
                                          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[40px] touch-manipulation whitespace-nowrap"
                                        >
                                          Assign
                                        </button>
                                        <button 
                                          onClick={() => deleteStudent(s.id)} 
                                          className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs sm:text-sm font-medium hover:bg-red-700 active:bg-red-800 transition-colors min-h-[40px] touch-manipulation whitespace-nowrap"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-end mt-4">
                          <button 
                            onClick={commitImport} 
                            className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm hover:shadow min-h-[44px] touch-manipulation"
                          >
                            Add to database
                          </button>
                        </div>
                      </section>
                    )}
                  </>
                )}

                {view === "activities" && (
                  <>
                    <header className="mb-6">
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Activities</h1>
                      <p className="text-sm text-gray-600 mt-2">Create and manage the list of school activities. These will be selectable or type-ahead in other tabs.</p>
                    </header>
                    <section className="bg-gray-50 rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 mb-6">
                      <h2 className="text-lg font-semibold mb-4">Add a new activity</h2>
                      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-sm font-medium mb-1.5 text-gray-700">Activity name</label>
                          <input 
                            value={newActivity} 
                            onChange={e => setNewActivity(e.target.value)} 
                            placeholder="e.g., Yoga" 
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5 text-gray-700">Color</label>
                          <input 
                            type="color" 
                            value={newActivityColor} 
                            onChange={e => setNewActivityColor(e.target.value)} 
                            className="h-[44px] w-full sm:w-20 p-1 rounded-lg border border-gray-300 cursor-pointer" 
                          />
                        </div>
                        <button 
                          onClick={() => { 
                            const n = newActivity.trim(); 
                            if (!n) return; 
                            setActivities(prev => prev.includes(n) ? prev : [...prev, n].sort((a,b)=>a.localeCompare(b))); 
                            setActivityColors(prev => ({ ...prev, [n]: newActivityColor })); 
                            setNewActivity(""); 
                          }} 
                          className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm hover:shadow min-h-[44px] touch-manipulation"
                        >
                          Add Activity
                        </button>
                      </div>
                    </section>
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
                      <h2 className="text-lg font-semibold mb-4">Existing activities</h2>
                      {activitiesCatalog.length === 0 ? (
                        <div className="text-center py-12">
                          <IconActivity size={40} className="mx-auto text-gray-300 mb-3" />
                          <p className="text-sm text-gray-600">No activities yet. Add your first above.</p>
                        </div>
                      ) : (
                        <ul className="divide-y rounded-xl border border-gray-200">
                          {activitiesCatalog.map(a => (
                            <li key={a} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 gap-3 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span 
                                  className="inline-block w-6 h-6 rounded-lg border-2 shrink-0" 
                                  style={{ backgroundColor: activityColors[a] || '#e5e7eb', borderColor: activityColors[a] || '#e5e7eb' }} 
                                />
                                <span className="font-medium truncate">{a}</span>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3">
                                <input 
                                  type="color" 
                                  value={activityColors[a] || '#e5e7eb'} 
                                  onChange={e => setActivityColors(prev => ({ ...prev, [a]: e.target.value }))} 
                                  className="h-10 w-16 p-1 rounded-lg border border-gray-300 cursor-pointer" 
                                  aria-label={`Color for ${a}`}
                                />
                                <button 
                                  className="text-sm px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors min-h-[40px] min-w-[80px] touch-manipulation" 
                                  onClick={() => { 
                                    if (!confirm(`Delete "${a}"? This cannot be undone.`)) return;
                                    setActivities(prev => prev.filter(x => x !== a)); 
                                    setActivityColors(prev => { const c = { ...prev }; delete c[a]; return c; }); 
                                  }}
                                >
                                  Delete
                                </button>
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
        </div>
      </main>
    </>
  );
}
