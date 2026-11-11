const list = document.getElementById("notice-list");
const note = document.getElementById("notice-note");
const unread = document.getElementById("notice-unread");

function formatWhen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

function render(items) {
  list.innerHTML = "";
  if (!items.length) {
    note.hidden = false;
    return;
  }
  note.hidden = true;
  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = item.seen ? "notice" : "notice fresh";
    const dot = document.createElement("span");
    dot.className = "dot";
    const body = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = item.kind === "removed" ? "Removed" : "Saved";
    const title = document.createElement("h3");
    title.textContent = item.name;
    const reason = document.createElement("p");
    reason.textContent = item.reason || "";
    const meta = document.createElement("small");
    const count = item.focus_count == null ? "" : ` · ${Number(item.focus_count).toLocaleString("en-MY")} predicted`;
    meta.textContent = `${formatWhen(item.created_at)} · ${item.focus_category} · ${item.focus_fuel}${count} · population ${Number(item.population).toLocaleString("en-MY")} · RM ${Number(item.income).toLocaleString("en-MY")}`;
    body.append(eyebrow, title, reason, meta);
    li.append(dot, body);
    list.append(li);
  });
}

async function loadNotices() {
  try {
    const response = await fetch("notices");
    if (!response.ok) throw new Error("missing");
    const payload = await response.json();
    unread.textContent = payload.unread ? String(payload.unread) : "0";
    render(payload.items);
    console.group("Admin notices");
    console.table(payload.items);
    console.groupEnd();
    if (payload.unread) await fetch("notices/read", { method: "POST" });
  } catch (error) {
    note.hidden = false;
    note.textContent = "Notices need the Python server.";
    unread.textContent = "—";
  }
}

loadNotices();
