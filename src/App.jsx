import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

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
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} className={className}
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={iconPaths[name]} />
    </svg>
  );
}

function Card({ children, className = "" }) {
  return <div className={`card ${className}`}>{children}</div>;
}

function Button({ children, onClick, variant = "primary", className = "", type = "button", ariaLabel }) {
  return (
    <button type={type} aria-label={ariaLabel} onClick={onClick} className={`button ${variant} ${className}`}>
      {children}
    </button>
  );
}

function getSavedTasks() {
  try {
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

export default function App() {
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
      window.localStorage.setItem("personal-maintenance-tasks", JSON.stringify(tasks));
    } catch {
      // App still works for the current session.
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
    setTasks((current) => current.map((task) => task.id === id ? { ...task, complete: !task.complete } : task));
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
      setTasks((current) => current.map((task) => task.id === editingId ? { ...task, ...cleanedTask } : task));
    } else {
      setTasks((current) => [{ id: Date.now(), ...cleanedTask, complete: false }, ...current]);
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
    <div className="app-shell">
      <div className="app-container">
        <header className="header">
          <div className="header-row">
            <div>
              <p className="eyebrow">Personal PWA</p>
              <h1>Maintenance Tracker</h1>
            </div>
            <div className="header-icon">
              <Icon name="wrench" size={24} />
            </div>
          </div>
          <p className="subtext">Track equipment, work orders, status, time estimates, and completion from your phone.</p>
        </header>

        <section className="stats-grid">
          <Card><p className="label">Open</p><p className="stat">{openCount}</p></Card>
          <Card><p className="label">High</p><p className="stat">{highCount}</p></Card>
          <Card><p className="label">Done</p><p className="stat">{completeCount}</p></Card>
        </section>

        <section className="controls">
          <div className="search-box">
            <Icon name="search" size={18} className="muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search equipment, WO, status..." />
          </div>

          <div className="stacked-filters">
            <select value={filters.completion} onChange={(event) => setFilters({ ...filters, completion: event.target.value })}>
              <option>Open</option>
              <option>Complete</option>
              <option>All</option>
            </select>

            <select value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}>
              <option>All</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <select value={filters.equipment} onChange={(event) => setFilters({ ...filters, equipment: event.target.value })}>
              {equipmentOptions.map((equipment) => (
                <option key={equipment}>{equipment}</option>
              ))}
            </select>
          </div>

          <div className="active-filters">
            <span className="active-filter dark">{filters.completion}</span>
            {filters.priority !== "All" && <span className="active-filter">{filters.priority}</span>}
            {filters.equipment !== "All" && <span className="active-filter">{filters.equipment}</span>}
            <button onClick={() => setFilters({ completion: "Open", priority: "All", equipment: "All" })}>Reset</button>
          </div>
        </section>

        <section className="worksheet">
          <Card>
            <div className="card-title-row">
              <Icon name="table" size={20} />
              <div>
                <h2>Excel Worksheet</h2>
                <p className="small-muted">Export, edit in Excel, save as CSV, then import back.</p>
              </div>
            </div>

            <div className="button-grid">
              <Button onClick={exportTasks} variant="outline"><Icon name="download" size={16} /> Export</Button>
              <Button onClick={exportBlankTemplate} variant="outline">Template</Button>
              <Button onClick={() => fileInputRef.current?.click()} variant="outline"><Icon name="upload" size={16} /> Import</Button>
            </div>

            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={importWorksheet} />
            {importMessage && <p className="message">{importMessage}</p>}
          </Card>
        </section>

        {showForm && (
          <Card className="form-card">
            <div className="card-title-row">
              <Icon name="clipboard" size={20} />
              <h2>{editingId ? "Edit Task" : "Add Task"}</h2>
            </div>

            <input value={form.equipment} onChange={(event) => setForm({ ...form, equipment: event.target.value })} placeholder="Equipment, e.g. Stacker 47" />
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Task description" />
            <input value={form.workOrder} onChange={(event) => setForm({ ...form, workOrder: event.target.value })} placeholder="Work Order" />

            <div className="two-col">
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option>Investigation Needed</option>
                <option>Operating</option>
                <option>Bypassed</option>
                <option>In Progress</option>
                <option>Waiting Parts</option>
              </select>
              <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>

            <input value={form.estimatedTime} onChange={(event) => setForm({ ...form, estimatedTime: event.target.value })} placeholder="Estimated Time" />
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" rows={3} />

            <div className="two-col">
              <Button onClick={saveTask}>Save</Button>
              <Button onClick={resetForm} variant="outline">Cancel</Button>
            </div>
          </Card>
        )}

        <main className="task-list">
          {filteredTasks.length === 0 && (
            <Card className="empty">
              <p className="empty-title">No tasks found</p>
              <p className="small-muted">Try a different search or filter, or add a new task.</p>
            </Card>
          )}

          {filteredTasks.map((task) => (
            <Card key={task.id}>
              <div className="task-header">
                <div>
                  <p className="equipment">{task.equipment}</p>
                  <h2 className={task.complete ? "complete-title" : ""}>{task.title}</h2>
                </div>
                <button onClick={() => toggleComplete(task.id)} className="icon-button" aria-label={task.complete ? "Mark task open" : "Mark task complete"}>
                  {task.complete ? <Icon name="checkCircle" size={26} /> : <Icon name="circle" size={26} />}
                </button>
              </div>

              <div className="details-grid">
                <div><p>Work Order</p><strong>{task.workOrder}</strong></div>
                <div><p>Status</p><strong>{task.status}</strong></div>
                <div><p>Priority</p><strong>{task.priority}</strong></div>
                <div><p>Est. Time</p><strong>{task.estimatedTime}</strong></div>
              </div>

              <div className="action-row">
                <Button onClick={() => editTask(task)} variant="outline"><Icon name="pencil" size={16} /> Edit</Button>
                <Button onClick={() => deleteTask(task.id)} variant="outline"><Icon name="trash" size={16} /> Delete</Button>
              </div>

              {task.notes && <p className="notes">{task.notes}</p>}
            </Card>
          ))}
        </main>
      </div>

      <div className="bottom-bar">
        <div className="bottom-inner">
          <Button onClick={startNewTask} className="add-button"><Icon name="plus" size={20} /> Add Task</Button>
          <Button onClick={exportTasks} variant="outline" ariaLabel="Export tasks to CSV"><Icon name="download" size={20} /></Button>
        </div>
      </div>
    </div>
  );
}
