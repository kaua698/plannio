// Aplica o tema antes de o React carregar, para não piscar: o da conta, se guardado, ou o do sistema.
(function () {
  var saved = null;
  try { saved = localStorage.getItem('plannio-theme'); } catch (e) { /* segue o sistema */ }
  var dark = saved ? saved === 'DARK' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
