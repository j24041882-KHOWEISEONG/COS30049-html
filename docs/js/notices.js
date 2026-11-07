fetch("notices")
  .then((response) => (response.ok ? response.json() : null))
  .then((data) => {
    const link = document.getElementById("admin-link");
    if (!data || !data.unread || !link || link.getAttribute("aria-current")) return;
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = data.unread > 9 ? "9+" : String(data.unread);
    link.append(badge);
  })
  .catch(() => {});
