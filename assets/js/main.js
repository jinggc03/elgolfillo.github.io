document.querySelectorAll("[data-switcher]").forEach((group) => {
  const buttons = [...group.querySelectorAll("[data-choice]")];
  const panels = [...group.querySelectorAll("[data-panel]")];
  const edges = [...group.querySelectorAll("[data-connection]")];
  const walk = group.querySelector("[data-walk]");
  const status = group.querySelector("[data-walk-status]");
  const route = buttons.map((button) => button.dataset.choice);
  const names = buttons.map(
    (button) => button.querySelector("strong").textContent,
  );
  let step = -1;
  const select = (key) => {
    buttons.forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.choice === key),
      ),
    );
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== key;
    });
    edges.forEach((edge) => {
      const active = edge.dataset.connection.split(" ").includes(key);
      edge.classList.toggle("is-active", active);
      edge.classList.remove("route-flash");
      if (active && step >= 0)
        requestAnimationFrame(() => edge.classList.add("route-flash"));
    });
  };
  buttons.forEach((button) => {
    button.disabled = false;
    button.addEventListener("click", () => {
      step = -1;
      walk.textContent = group.dataset.start + " ↗";
      status.textContent = group.dataset.free;
      select(button.dataset.choice);
    });
  });
  walk.disabled = false;
  walk.addEventListener("click", () => {
    step = (step + 1) % route.length;
    select(route[step]);
    status.textContent = `${String(step + 1).padStart(2, "0")} / ${String(route.length).padStart(2, "0")} · ${names[step]}`;
    walk.textContent =
      step === route.length - 1
        ? group.dataset.restart + " ↗"
        : group.dataset.next + names[step + 1] + " →";
  });
  select("agents");
  group.classList.add("is-ready");
});
