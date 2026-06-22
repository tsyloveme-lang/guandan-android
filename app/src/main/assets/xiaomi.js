document.getElementById("closeHelpBottom").addEventListener("click", () => {
  document.getElementById("helpDialog").close();
});

document.addEventListener("contextmenu", event => event.preventDefault());

let lastBack = 0;
window.addEventListener("popstate", () => {
  const now = Date.now();
  if (now - lastBack < 1600) return;
  lastBack = now;
});
