import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

function Card({ children, className = "" }) {
  return <div className={`card ${className}`}>{children}</div>;
}

function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

function Button({ children, onClick, variant = "primary", className = "", type = "button", size, ...props }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`button ${variant === "outline" ? "outline" : "primary"} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const blankForm = {
  equipment: "",
  title: "",
  workOrder: "",
  status: "Investigation Needed",
  priority: "Medium",
  estimatedTime: "To be determined",
  notes: "",
};

const worksheetColumns = [
  "Equipment",
  "Task",
  "Work Order",
  "Status",
  "Priority",
  "Estimated Time",
  "Notes",
  "Complete",
];

const starterTasks = [
  {
    id: 1,
    equipment: "Stacker 47",
    title: "Investigate brake bypass – Long Travel VFD1-B10",
    workOrder: "SDN88560",
    status: "Investigation Needed",
    priority: "High",
    estimatedTime: "To be determined",
    notes: "Bypassed. Confirm failure mode and next steps.",
    complete: false,
  },
  {
    id: 2,
    equipment: "Shiploader 4",
    title: "Repair holes and wear plate in corners",
    workOrder: "SDN89028",
    status: "Operating",
    priority: "Medium",
    estimatedTime: "2 shifts",
    notes: "Plan work window and materials.",
    complete: false,
  },
  {
    id: 3,
    equipment: "Conveyor 12A",
    title: "Repair rock box on lower pant leg",
    workOrder: "Not assigned",
    status: "Operating",
    priority: "Medium",
    estimatedTime: "To be determined",
    notes: "Inspect wear and confirm scope.",
    complete: false,
  },
];

const iconPaths = {
  plus: "M12 5v14M5 12h14",
  search: "M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z",
  checkCircle: "M9 12l2 2 4-5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  circle: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  wrench: "M14.7 6.3a4 4 0 0 0 5 5L11 20l-4-4 8.7-8.7ZM5 19l3-3",
  clipboard: "M9 4h6M9 4a2 2 0 0 0-2 2v1h10V6a2 2 0 0 0-2-2M7 7H5v14h14V7h-2M8 12h8M8 16h6",
  pencil: "M4 20h4l11-11-4-4L4 16v4ZM13 7l4 4",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  upload: "M12 21V9M7 14l5-5 5 5M5 3h14",
  table: "M3 5h18M3 12h18M3 19h18M8 5v14M16 5v14",
};

function Icon({ name, size = 20, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}

function getSavedTasks() {
  try {
    if (typeof window === "undefined") return starterTasks;
    const savedTasks = window.localStorage.getItem("personal-maintenance-tasks");
    const parsed = savedTasks ? JSON.parse(savedTasks) : starterTasks;
    return Array.isArray(parsed) ? parsed : starterTasks;
  } catch {
    return starterTasks;
  }
}

function escapeCsvCell(cell) {
  return `"${String(cell ?? "").replaceAll('"', '""')}"`;
}

function taskToWorksheetRow(task) {
  return [
    task.equipment,
    task.title,
    task.workOrder,
    task.status,
    task.priority,
    task.estimatedTime,
    task.notes,
    task.complete ? "Yes" : "No",
  ];
}

function buildCsv(tasks) {
  const rows = tasks.map(taskToWorksheetRow);
  return [worksheetColumns, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(header) {
  return String(header ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseYesNo(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["yes", "y", "true", "complete", "completed", "1"].includes(normalized);
}

function rowsToTasks(rows) {
  if (rows.length < 2) return [];

  const headerIndexes = rows[0].reduce((acc, header, index) => {
    acc[normalizeHeader(header)] = index;
    return acc;
  }, {});

  const getValue = (row, names, fallback = "") => {
    for (const name of names) {
      const index = headerIndexes[normalizeHeader(name)];
      if (index !== undefined) return String(row[index] ?? "").trim();
    }
    return fallback;
  };

  return rows.slice(1)
    .map((row, index) => {
      const equipment = getValue(row, ["Equipment"]);
      const title = getValue(row, ["Task", "Title", "Description"]);
      if (!equipment && !title) return null;

      return {
        id: Date.now() + index,
        equipment: equipment || "Unassigned Equipment",
        title: title || "Untitled Task",
        workOrder: getValue(row, ["Work Order", "WorkOrder", "WO"], "Not assigned") || "Not assigned",
        status: getValue(row, ["Status"], "Investigation Needed") || "Investigation Needed",
        priority: getValue(row, ["Priority"], "Medium") || "Medium",
        estimatedTime: getValue(row, ["Estimated Time", "EstimatedTime", "Est. Time"], "To be determined") || "To be determined",
        notes: getValue(row, ["Notes", "Note"]),
        complete: parseYesNo(getValue(row, ["Complete", "Completed", "Done"])),
      };
    })
    .filter(Boolean);
}

function filterTasks(tasks, query, filters) {
  return tasks.filter((task) => {
    const searchableText = `${task.equipment} ${task.title} ${task.workOrder} ${task.status}`.toLowerCase();
    const matchesQuery = searchableText.includes(query.toLowerCase());

    const matchesCompletion =
      filters.completion === "All" ||
      (filters.completion === "Open" && !task.complete) ||
      (filters.completion === "Complete" && task.complete);

    const matchesPriority =
      filters.priority === "All" || task.priority === filters.priority;

    const matchesEquipment =
      filters.equipment === "All" || task.equipment === filters.equipment;

    return matchesQuery && matchesCompletion && matchesPriority && matchesEquipment;
  });
}

function runSelfTests() {
  console.assert(escapeCsvCell('A "quoted" note') === '"A ""quoted"" note"', "CSV quotes should be escaped.");
  console.assert(buildCsv([{ equipment: "A", title: "B", workOrder: "C", status: "D", priority: "High", estimatedTime: "E", notes: "F", complete: true }]).includes('"Yes"'), "CSV should export completed tasks as Yes.");
  console.assert(parseCsv('"Equipment","Task"\n"Stacker 47","Repair, inspect"')[1][1] === "Repair, inspect", "CSV import should handle commas inside quoted cells.");
  console.assert(rowsToTasks(parseCsv(buildCsv(starterTasks))).length === starterTasks.length, "CSV round trip should preserve task count.");
  console.assert(filterTasks(starterTasks, "SDN88560", { completion: "Open", priority: "All", equipment: "All" }).length === 1, "Search should find a matching open work order.");
  console.assert(filterTasks(starterTasks, "", { completion: "All", priority: "High", equipment: "All" }).length === 1, "High filter should return high-priority tasks.");
  console.assert(filterTasks(starterTasks, "", { completion: "Open", priority: "Medium", equipment: "Shiploader 4" }).length === 1, "Stacked filters should combine completion, priority, and equipment.");
}

export default function PersonalMaintenancePWA() {
  const [tasks, setTasks] = useState(getSavedTasks);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    completion: "Open",
    priority: "All",
    equipment: "All",
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    runSelfTests();
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("personal-maintenance-tasks", JSON.stringify(tasks));
      }
    } catch {
      // If browser storage is unavailable, the app still works for the current session.
    }
  }, [tasks]);

  const equipmentOptions = useMemo(() => {
    return ["All", ...Array.from(new Set(tasks.map((task) => task.equipment))).sort()];
  }, [tasks]);

  const filteredTasks = useMemo(() => filterTasks(tasks, query, filters), [tasks, query, filters]);

  const openCount = tasks.filter((task) => !task.complete).length;
  const highCount = tasks.filter((task) => task.priority === "High" && !task.complete).length;
  const completeCount = tasks.filter((task) => task.complete).length;

  function resetForm() {
    setEditingId(null);
    setForm(blankForm);
    setShowForm(false);
  }

  function toggleComplete(id) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, complete: !task.complete } : task
      )
    );
  }

  function saveTask() {
    if (!form.equipment.trim() || !form.title.trim()) return;

    const cleanedTask = {
      equipment: form.equipment.trim(),
      title: form.title.trim(),
      workOrder: form.workOrder.trim() || "Not assigned",
      status: form.status,
      priority: form.priority,
      estimatedTime: form.estimatedTime.trim() || "To be determined",
      notes: form.notes.trim(),
    };

    if (editingId !== null) {
      setTasks((current) =>
        current.map((task) =>
          task.id === editingId ? { ...task, ...cleanedTask } : task
        )
      );
    } else {
      setTasks((current) => [
        {
          id: Date.now(),
          ...cleanedTask,
          complete: false,
        },
        ...current,
      ]);
    }

    resetForm();
  }

  function startNewTask() {
    setEditingId(null);
    setForm(blankForm);
    setShowForm(true);
  }

  function editTask(task) {
    setEditingId(task.id);
    setForm({
      equipment: task.equipment,
      title: task.title,
      workOrder: task.workOrder,
      status: task.status,
      priority: task.priority,
      estimatedTime: task.estimatedTime,
      notes: task.notes,
    });
    setShowForm(true);
  }

  function deleteTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportTasks() {
    downloadFile("maintenance_tasks_excel_template.csv", buildCsv(tasks), "text/csv;charset=utf-8;");
  }

  function exportBlankTemplate() {
    downloadFile("maintenance_tasks_blank_template.csv", buildCsv([]), "text/csv;charset=utf-8;");
  }

  function importWorksheet(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCsv(String(reader.result ?? ""));
        const importedTasks = rowsToTasks(rows);

        if (importedTasks.length === 0) {
          setImportMessage("No valid tasks found. Use the exported template column names.");
          return;
        }

        setTasks(importedTasks);
        setImportMessage(`Imported ${importedTasks.length} task${importedTasks.length === 1 ? "" : "s"}.`);
        setFilters({ completion: "All", priority: "All", equipment: "All" });
      } catch {
        setImportMessage("Import failed. Save the worksheet as CSV and try again.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-md px-4 pb-28 pt-5">
        <header className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Personal PWA</p>
              <h1 className="text-3xl font-bold tracking-tight">Maintenance Tracker</h1>
            </div>
            <div className="rounded-2xl bg-slate-950 p-3 text-white shadow-sm">
              <Icon name="wrench" size={24} />
            </div>
          </div>
          <p className="text-sm leading-5 text-slate-600">
            Track equipment, work orders, status, time estimates, and completion from your phone.
          </p>
        </header>

        <section className="mb-4 grid grid-cols-3 gap-3">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-3">
              <p className="text-xs text-slate-500">Open</p>
              <p className="text-2xl font-bold">{openCount}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-3">
              <p className="text-xs text-slate-500">High</p>
              <p className="text-2xl font-bold">{highCount}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-3">
              <p className="text-xs text-slate-500">Done</p>
              <p className="text-2xl font-bold">{completeCount}</p>
            </CardContent>
          </Card>
        </section>

        <section className="mb-4 space-y-3">
          <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
            <Icon name="search" size={18} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search equipment, WO, status..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <select
              value={filters.completion}
              onChange={(event) => setFilters({ ...filters, completion: event.target.value })}
              className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none"
            >
              <option>Open</option>
              <option>Complete</option>
              <option>All</option>
            </select>

            <select
              value={filters.priority}
              onChange={(event) => setFilters({ ...filters, priority: event.target.value })}
              className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none"
            >
              <option>All</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <select
              value={filters.equipment}
              onChange={(event) => setFilters({ ...filters, equipment: event.target.value })}
              className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none"
            >
              {equipmentOptions.map((equipment) => (
                <option key={equipment}>{equipment}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
              {filters.completion}
            </span>
            {filters.priority !== "All" && (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                {filters.priority}
              </span>
            )}
            {filters.equipment !== "All" && (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                {filters.equipment}
              </span>
            )}
            <button
              onClick={() => setFilters({ completion: "Open", priority: "All", equipment: "All" })}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm"
            >
              Reset
            </button>
          </div>
        </section>

        <section className="mb-4">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <Icon name="table" size={20} />
                <div>
                  <h2 className="text-base font-bold">Excel Worksheet</h2>
                  <p className="text-xs text-slate-500">Export, edit in Excel, save as CSV, then import back.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button onClick={exportTasks} variant="outline" className="rounded-xl text-xs">
                  <Icon name="download" size={16} className="mr-1" /> Export
                </Button>
                <Button onClick={exportBlankTemplate} variant="outline" className="rounded-xl text-xs">
                  Template
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="rounded-xl text-xs">
                  <Icon name="upload" size={16} className="mr-1" /> Import
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={importWorksheet}
              />

              {importMessage && (
                <p className="rounded-xl bg-slate-100 p-2 text-xs text-slate-600">{importMessage}</p>
              )}
            </CardContent>
          </Card>
        </section>

        {showForm && (
          <Card className="mb-4 rounded-3xl border-0 shadow-sm">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <Icon name="clipboard" size={20} />
                <h2 className="text-lg font-bold">{editingId ? "Edit Task" : "Add Task"}</h2>
              </div>

              <input
                value={form.equipment}
                onChange={(event) => setForm({ ...form, equipment: event.target.value })}
                placeholder="Equipment, e.g. Stacker 47"
                className="w-full rounded-xl bg-slate-100 px-3 py-3 text-sm outline-none"
              />
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Task description"
                className="w-full rounded-xl bg-slate-100 px-3 py-3 text-sm outline-none"
              />
              <input
                value={form.workOrder}
                onChange={(event) => setForm({ ...form, workOrder: event.target.value })}
                placeholder="Work Order"
                className="w-full rounded-xl bg-slate-100 px-3 py-3 text-sm outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value })}
                  className="rounded-xl bg-slate-100 px-3 py-3 text-sm outline-none"
                >
                  <option>Investigation Needed</option>
                  <option>Operating</option>
                  <option>Bypassed</option>
                  <option>In Progress</option>
                  <option>Waiting Parts</option>
                </select>
                <select
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                  className="rounded-xl bg-slate-100 px-3 py-3 text-sm outline-none"
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>

              <input
                value={form.estimatedTime}
                onChange={(event) => setForm({ ...form, estimatedTime: event.target.value })}
                placeholder="Estimated Time"
                className="w-full rounded-xl bg-slate-100 px-3 py-3 text-sm outline-none"
              />

              <textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Notes"
                rows={3}
                className="w-full rounded-xl bg-slate-100 px-3 py-3 text-sm outline-none"
              />

              <div className="flex gap-2">
                <Button onClick={saveTask} className="flex-1 rounded-xl">Save</Button>
                <Button onClick={resetForm} variant="outline" className="flex-1 rounded-xl">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <main className="space-y-3">
          {filteredTasks.length === 0 && (
            <Card className="rounded-3xl border-0 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-base font-semibold text-slate-700">No tasks found</p>
                <p className="mt-1 text-sm text-slate-500">Try a different search or filter, or add a new task.</p>
              </CardContent>
            </Card>
          )}

          {filteredTasks.map((task) => (
            <Card key={task.id} className="rounded-3xl border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">{task.equipment}</p>
                    <h2 className={`text-lg font-bold leading-6 ${task.complete ? "text-slate-400 line-through" : "text-slate-950"}`}>
                      {task.title}
                    </h2>
                  </div>
                  <button onClick={() => toggleComplete(task.id)} className="mt-1" aria-label={task.complete ? "Mark task open" : "Mark task complete"}>
                    {task.complete ? <Icon name="checkCircle" size={26} /> : <Icon name="circle" size={26} />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-slate-100 p-2">
                    <p className="text-xs text-slate-500">Work Order</p>
                    <p className="font-semibold">{task.workOrder}</p>
                  </div>
                  <div className="rounded-xl bg-slate-100 p-2">
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="font-semibold">{task.status}</p>
                  </div>
                  <div className="rounded-xl bg-slate-100 p-2">
                    <p className="text-xs text-slate-500">Priority</p>
                    <p className="font-semibold">{task.priority}</p>
                  </div>
                  <div className="rounded-xl bg-slate-100 p-2">
                    <p className="text-xs text-slate-500">Est. Time</p>
                    <p className="font-semibold">{task.estimatedTime}</p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => editTask(task)}
                  >
                    <Icon name="pencil" size={16} className="mr-1" /> Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Icon name="trash" size={16} className="mr-1" /> Delete
                  </Button>
                </div>

                {task.notes && (
                  <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-5 text-slate-600">
                    {task.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-3">
          <Button onClick={startNewTask} className="h-12 flex-1 rounded-2xl text-base">
            <Icon name="plus" size={20} className="mr-2" /> Add Task
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-2xl px-4"
            onClick={exportTasks}
            aria-label="Export tasks to CSV"
          >
            <Icon name="download" size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}
