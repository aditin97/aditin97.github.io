(function () {
  "use strict";

  // ── State ──────────────────────────────────────
  let guests = [];          // [{ id, name, table: null | tableId }]
  let tables = [];          // [{ id, name }]
  let tableCounter = 0;
  let draggedId = null;

  // ── DOM refs ───────────────────────────────────
  const uploadArea      = document.getElementById("upload-area");
  const fileInput       = document.getElementById("file-input");
  const uploadSection   = document.getElementById("upload-section");
  const workspace       = document.getElementById("workspace");
  const guestsContainer = document.getElementById("guests-container");
  const guestCount      = document.getElementById("guest-count");
  const searchInput     = document.getElementById("search-input");
  const tablesGrid      = document.getElementById("tables-grid");
  const addTableBtn     = document.getElementById("add-table-btn");
  const exportBtn       = document.getElementById("export-btn");

  // ── File Upload ────────────────────────────────
  uploadArea.addEventListener("click", () => fileInput.click());

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("drag-over");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("drag-over");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  // ── Parse Excel ────────────────────────────────
  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      guests = [];
      let id = 0;
      rows.forEach((row) => {
        row.forEach((cell) => {
          const name = String(cell).trim();
          if (name && name.toLowerCase() !== "name" && name.toLowerCase() !== "guest" && name.toLowerCase() !== "guests") {
            guests.push({ id: id++, name, table: null });
          }
        });
      });

      if (guests.length === 0) {
        alert("No guest names found in the file. Make sure your Excel has names in it!");
        return;
      }

      // Start with 3 default tables
      tables = [];
      tableCounter = 0;
      for (let i = 0; i < 3; i++) addTable();

      uploadSection.style.display = "none";
      workspace.classList.remove("hidden");
      renderAll();
    };
    reader.readAsArrayBuffer(file);
  }

  // ── Tables ─────────────────────────────────────
  function addTable() {
    tableCounter++;
    tables.push({ id: "table-" + tableCounter, name: "Table " + tableCounter });
  }

  addTableBtn.addEventListener("click", () => {
    addTable();
    renderTables();
  });

  function removeTable(tableId) {
    guests.forEach((g) => {
      if (g.table === tableId) g.table = null;
    });
    tables = tables.filter((t) => t.id !== tableId);
    renderAll();
  }

  // ── Rendering ──────────────────────────────────
  function renderAll() {
    renderGuestList();
    renderTables();
  }

  function renderGuestList() {
    const query = searchInput.value.toLowerCase();
    const unassigned = guests.filter((g) => g.table === null);
    const filtered = query
      ? unassigned.filter((g) => g.name.toLowerCase().includes(query))
      : unassigned;

    guestsContainer.innerHTML = "";
    filtered.forEach((g) => {
      guestsContainer.appendChild(createGuestCard(g));
    });

    guestCount.textContent = unassigned.length;
  }

  function renderTables() {
    tablesGrid.innerHTML = "";
    tables.forEach((t) => {
      const card = document.createElement("div");
      card.className = "table-card";
      card.dataset.table = t.id;

      const seated = guests.filter((g) => g.table === t.id);

      // Header
      const header = document.createElement("div");
      header.className = "table-header";

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = t.name;
      nameInput.placeholder = "Table name";
      nameInput.addEventListener("input", (e) => {
        t.name = e.target.value;
      });

      const countSpan = document.createElement("span");
      countSpan.className = "table-count";
      countSpan.textContent = seated.length + " seated";

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-table-btn";
      removeBtn.textContent = "✕";
      removeBtn.title = "Remove table";
      removeBtn.addEventListener("click", () => removeTable(t.id));

      header.append(nameInput, countSpan, removeBtn);

      // Seats drop zone
      const seats = document.createElement("div");
      seats.className = "table-seats drop-zone";
      seats.dataset.table = t.id;

      if (seated.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-msg";
        empty.textContent = "Drop guests here 💐";
        seats.appendChild(empty);
      } else {
        seated.forEach((g) => {
          seats.appendChild(createGuestCard(g));
        });
      }

      // Drop zone events
      seats.addEventListener("dragover", handleDragOver);
      seats.addEventListener("dragenter", handleDragEnter);
      seats.addEventListener("dragleave", handleDragLeave);
      seats.addEventListener("drop", handleDrop);

      card.append(header, seats);
      tablesGrid.appendChild(card);
    });
  }

  function createGuestCard(guest) {
    const card = document.createElement("div");
    card.className = "guest-card";
    card.textContent = guest.name;
    card.draggable = true;
    card.dataset.guestId = guest.id;

    card.addEventListener("dragstart", (e) => {
      draggedId = guest.id;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      draggedId = null;
    });

    return card;
  }

  // ── Drag & Drop Handlers ───────────────────────
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDragEnter(e) {
    e.preventDefault();
    const zone = e.currentTarget;
    zone.closest(".table-card")?.classList.add("drop-hover");
    if (zone.id === "guests-container") zone.classList.add("drop-hover");
  }

  function handleDragLeave(e) {
    const zone = e.currentTarget;
    if (!zone.contains(e.relatedTarget)) {
      zone.closest(".table-card")?.classList.remove("drop-hover");
      if (zone.id === "guests-container") zone.classList.remove("drop-hover");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const zone = e.currentTarget;
    zone.closest(".table-card")?.classList.remove("drop-hover");
    if (zone.id === "guests-container") zone.classList.remove("drop-hover");

    if (draggedId === null) return;

    const targetTable = zone.dataset.table;
    const guest = guests.find((g) => g.id === Number(draggedId));
    if (!guest) return;

    guest.table = targetTable === "unassigned" ? null : targetTable;
    renderAll();
  }

  // Guest list is also a drop zone (to unassign)
  guestsContainer.addEventListener("dragover", handleDragOver);
  guestsContainer.addEventListener("dragenter", handleDragEnter);
  guestsContainer.addEventListener("dragleave", handleDragLeave);
  guestsContainer.addEventListener("drop", handleDrop);

  // ── Export to Excel ────────────────────────────
  exportBtn.addEventListener("click", exportToExcel);

  function exportToExcel() {
    const rows = [["Guest Name", "Table"]];

    tables.forEach((t) => {
      const seated = guests.filter((g) => g.table === t.id);
      seated.forEach((g) => {
        rows.push([g.name, t.name]);
      });
    });

    const unassigned = guests.filter((g) => g.table === null);
    unassigned.forEach((g) => {
      rows.push([g.name, "Unassigned"]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 30 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Seating Chart");
    XLSX.writeFile(wb, "seating-chart.xlsx");
  }

  // ── Search ─────────────────────────────────────
  searchInput.addEventListener("input", renderGuestList);
})();
