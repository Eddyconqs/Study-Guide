"use client";

import { useEffect, useMemo, useState } from "react";

type Assessment = { id: number; name: string; weight: number; grade: number | null; expectedGrade: number | null };
type Course = { id: number; name: string; code: string; credits: number; assessments: Assessment[] };

const initialCourses: Course[] = [
  { id: 1, name: "Calculus", code: "MAT-201", credits: 3, assessments: [
    { id: 1, name: "Quiz 1", weight: 10, grade: 82, expectedGrade: 82 },
    { id: 2, name: "Midterm", weight: 25, grade: 76, expectedGrade: 76 },
    { id: 3, name: "Assignment", weight: 15, grade: 91, expectedGrade: 91 },
    { id: 4, name: "Final exam", weight: 50, grade: null, expectedGrade: 82 },
  ] },
  { id: 2, name: "Physics", code: "PHY-101", credits: 3, assessments: [
    { id: 1, name: "Lab", weight: 20, grade: 88, expectedGrade: 88 },
    { id: 2, name: "Midterm", weight: 30, grade: 79, expectedGrade: 79 },
    { id: 3, name: "Final exam", weight: 50, grade: null, expectedGrade: 82 },
  ] },
];

function parseNumber(value: string, fallback: number | null = null) {
  if (value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : fallback;
}

function courseStats(course: Course) {
  const completed = course.assessments.filter((item) => item.grade !== null);
  const completedWeight = completed.reduce((sum, item) => sum + item.weight, 0);
  const earned = completed.reduce((sum, item) => sum + (item.grade ?? 0) * item.weight / 100, 0);
  const current = completedWeight ? earned / (completedWeight / 100) : 0;
  const projected = course.assessments.reduce((sum, item) => sum + (item.grade ?? item.expectedGrade ?? current) * item.weight / 100, 0);
  return { completedWeight, remainingWeight: 100 - completedWeight, current, projected };
}

export default function AcademicDashboard() {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [target, setTarget] = useState(80);
  const [activeCourseId, setActiveCourseId] = useState(1);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("academic-courses");
    const savedTarget = window.localStorage.getItem("academic-target");
    if (saved) {
      try { setCourses(JSON.parse(saved)); } catch { window.localStorage.removeItem("academic-courses"); }
    }
    if (savedTarget) setTarget(parseNumber(savedTarget, 80) ?? 80);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("academic-courses", JSON.stringify(courses));
    window.localStorage.setItem("academic-target", String(target));
  }, [courses, target, hydrated]);

  const stats = useMemo(() => courses.map((course) => ({ course, stats: courseStats(course) })), [courses]);
  const weightedAverage = useMemo(() => {
    const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
    return totalCredits ? courses.reduce((sum, course) => sum + courseStats(course).projected * course.credits, 0) / totalCredits : 0;
  }, [courses]);
  const activeCourse = courses.find((course) => course.id === activeCourseId) ?? courses[0];
  const activeStats = activeCourse ? courseStats(activeCourse) : null;
  const remainingTarget = activeStats && activeStats.remainingWeight > 0
    ? (target - activeStats.current * activeStats.completedWeight / 100) / (activeStats.remainingWeight / 100)
    : null;

  function updateCourse(courseId: number, patch: Partial<Course>) {
    setCourses((current) => current.map((course) => course.id === courseId ? { ...course, ...patch } : course));
  }

  function updateAssessment(courseId: number, assessmentId: number, patch: Partial<Assessment>) {
    setCourses((current) => current.map((course) => course.id === courseId ? {
      ...course,
      assessments: course.assessments.map((assessment) => assessment.id === assessmentId ? { ...assessment, ...patch } : assessment),
    } : course));
  }

  function addCourse() {
    const id = Date.now();
    const course: Course = { id, name: "New course", code: "COURSE-000", credits: 3, assessments: [{ id, name: "Final assessment", weight: 100, grade: null, expectedGrade: 75 }] };
    setCourses((current) => [...current, course]);
    setActiveCourseId(id);
  }

  function addAssessment(courseId: number) {
    const id = Date.now();
    setCourses((current) => current.map((course) => course.id === courseId ? { ...course, assessments: [...course.assessments, { id, name: "New assessment", weight: 0, grade: null, expectedGrade: 75 }] } : course));
  }

  function deleteAssessment(courseId: number, assessmentId: number) {
    setCourses((current) => current.map((course) => course.id === courseId ? { ...course, assessments: course.assessments.filter((assessment) => assessment.id !== assessmentId) } : course));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><p className="mb-2 text-sm font-medium text-cyan-300">Academic Command Center</p><h1 className="text-3xl font-semibold tracking-tight">Understand your grades. Plan your next move.</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Track assessments, expected grades, weighted averages and targets. Your data is saved in this browser.</p></div>
          <button onClick={addCourse} className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">+ Add course</button>
        </header>

        <section className="grid gap-4 md:grid-cols-3"><Metric label="Projected average" value={`${weightedAverage.toFixed(1)}%`} detail="Credit-weighted" /><Metric label="Target average" value={`${target.toFixed(1)}%`} detail="Set in planner" /><Metric label="Courses tracked" value={`${courses.length}`} detail="This semester" /></section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
          <div className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Courses</h2><span className="text-xs text-slate-500">Click to edit</span></div>{stats.map(({ course, stats: itemStats }) => <button key={course.id} onClick={() => setActiveCourseId(course.id)} className={`w-full rounded-2xl border p-4 text-left transition ${activeCourseId === course.id ? "border-cyan-400/70 bg-cyan-400/10" : "border-slate-800 bg-slate-900 hover:border-slate-700"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{course.name}</p><p className="mt-1 text-xs text-slate-500">{course.code} · {course.credits} credits</p></div><span className="text-lg font-semibold">{itemStats.projected.toFixed(1)}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, itemStats.projected)}%` }} /></div><div className="mt-2 flex justify-between text-xs text-slate-500"><span>Current: {itemStats.current.toFixed(1)}%</span><span>{itemStats.completedWeight}% complete</span></div></button>)}</div>

          {activeCourse && activeStats && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between"><div><input value={activeCourse.name} onChange={(event) => updateCourse(activeCourse.id, { name: event.target.value })} className="w-full bg-transparent text-xl font-semibold outline-none" /><p className="mt-1 text-sm text-slate-500">{activeCourse.code} · {activeCourse.credits} credits</p></div><div className="text-left sm:text-right"><p className="text-xs text-slate-500">Projected final</p><p className="text-3xl font-semibold text-cyan-300">{activeStats.projected.toFixed(1)}%</p></div></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3"><MiniMetric label="Current" value={`${activeStats.current.toFixed(1)}%`} /><MiniMetric label="Completed" value={`${activeStats.completedWeight}%`} /><MiniMetric label="Remaining" value={`${activeStats.remainingWeight}%`} /></div>
            <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3">Assessment</th><th className="pb-3">Weight</th><th className="pb-3">Actual</th><th className="pb-3">Expected</th><th className="pb-3 text-right">Contribution</th><th /></tr></thead><tbody className="divide-y divide-slate-800">{activeCourse.assessments.map((assessment) => <tr key={assessment.id}><td className="py-3 pr-3"><input value={assessment.name} onChange={(event) => updateAssessment(activeCourse.id, assessment.id, { name: event.target.value })} className="w-full rounded-lg border border-transparent bg-slate-950/60 px-2 py-1.5 outline-none focus:border-cyan-400" /></td><td className="py-3 pr-3"><input type="number" min="0" max="100" value={assessment.weight} onChange={(event) => updateAssessment(activeCourse.id, assessment.id, { weight: parseNumber(event.target.value, 0) ?? 0 })} className="w-20 rounded-lg border border-transparent bg-slate-950/60 px-2 py-1.5 outline-none focus:border-cyan-400" /></td><td className="py-3 pr-3"><input type="number" min="0" max="100" placeholder="—" value={assessment.grade ?? ""} onChange={(event) => updateAssessment(activeCourse.id, assessment.id, { grade: parseNumber(event.target.value) })} className="w-20 rounded-lg border border-transparent bg-slate-950/60 px-2 py-1.5 outline-none placeholder:text-slate-600 focus:border-cyan-400" /></td><td className="py-3 pr-3"><input type="number" min="0" max="100" value={assessment.expectedGrade ?? ""} onChange={(event) => updateAssessment(activeCourse.id, assessment.id, { expectedGrade: parseNumber(event.target.value) })} className="w-20 rounded-lg border border-transparent bg-slate-950/60 px-2 py-1.5 outline-none focus:border-cyan-400" /></td><td className="py-3 text-right text-slate-300">{((assessment.grade ?? assessment.expectedGrade ?? activeStats.current) * assessment.weight / 100).toFixed(1)}%</td><td className="py-3 pl-3"><button onClick={() => deleteAssessment(activeCourse.id, assessment.id)} className="text-xs text-rose-300 hover:text-rose-200">Delete</button></td></tr>)}</tbody></table></div>
            <button onClick={() => addAssessment(activeCourse.id)} className="mt-4 text-sm font-medium text-cyan-300 hover:text-cyan-200">+ Add assessment</button>
            <div className="mt-6 grid gap-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 md:grid-cols-2"><div><p className="text-sm font-medium">Target grade planner</p><p className="mt-1 text-xs text-slate-400">What do you need on the remaining work?</p><div className="mt-3 flex items-center gap-2"><input type="number" min="0" max="100" value={target} onChange={(event) => setTarget(parseNumber(event.target.value, 0) ?? 0)} className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-cyan-400" /><span className="text-slate-400">%</span></div></div><div className="md:text-right"><p className="text-sm text-slate-400">Required remaining grade</p><p className={`mt-1 text-3xl font-semibold ${remainingTarget !== null && remainingTarget > 100 ? "text-rose-300" : "text-emerald-300"}`}>{remainingTarget === null ? "—" : `${remainingTarget.toFixed(1)}%`}</p><p className="mt-1 text-xs text-slate-500">{remainingTarget !== null && remainingTarget > 100 ? "This target is currently mathematically out of reach." : "Based on completed weights and your target."}</p></div></div>
          </div>}
        </section>
        <footer className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100/80"><span className="font-medium text-amber-200">MVP note:</span> Confirm extracted grades before they affect your averages. Browser storage is convenient for this personal MVP; add authentication and encrypted cloud storage before using sensitive academic records across devices.</footer>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>; }
function MiniMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-950/60 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>; }
