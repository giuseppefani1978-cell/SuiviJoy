(function () {
  const WEIGHTS = {
    douleur: -0.18,
    anxiete: -0.14,
    mobilite: 0.18,
    appetit: 0.14,
    plaisir: 0.14,
    bonheur: 0.12,
    interactions: 0.08,
    environnement: 0.06,
    hydratation: 0.04,
    hygiene: 0.02
  };

  function getData() {
    for (const k of Object.keys(localStorage)) {
      try {
        const v = JSON.parse(localStorage.getItem(k));
        if (Array.isArray(v) && v[0]?.date && "mobilite" in v[0]) return v;
      } catch {}
    }
    return Array.isArray(window.data) ? window.data : [];
  }

  function score(j) {
    let s = 0;
    s += (10 - Number(j.douleur || 0)) * Math.abs(WEIGHTS.douleur);
    s += (10 - Number(j.anxiete || 0)) * Math.abs(WEIGHTS.anxiete);
    s += Number(j.mobilite || 0) * WEIGHTS.mobilite;
    s += Number(j.appetit || 0) * WEIGHTS.appetit;
    s += Number(j.plaisir || 0) * WEIGHTS.plaisir;
    s += Number(j.bonheur || 0) * WEIGHTS.bonheur;
    s += Number(j.interactions || 0) * WEIGHTS.interactions;
    s += Number(j.environnement || 0) * WEIGHTS.environnement;
    s += Number(j.hydratation || 0) * WEIGHTS.hydratation;
    s += Number(j.hygiene || 0) * WEIGHTS.hygiene;
    return s;
  }

  function avg(a) {
    return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  }

  function slope(values) {
    const n = values.length;
    if (n < 3) return 0;
    const mx = (n - 1) / 2;
    const my = avg(values);
    let num = 0, den = 0;
    values.forEach((y, x) => {
      num += (x - mx) * (y - my);
      den += (x - mx) ** 2;
    });
    return den ? num / den : 0;
  }

  function forecast(scores, days) {
    const recent = scores.slice(-14);
    const s = slope(recent);
    const last = scores[scores.length - 1];
    return Math.max(0, Math.min(10, last + s * days));
  }

  function status(v) {
    if (v >= 6.2) return "Stable / plutôt favorable";
    if (v >= 5.0) return "Fragile mais acceptable";
    if (v >= 4.2) return "Zone de vigilance";
    return "Zone préoccupante";
  }

  function render() {
    const data = getData().sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!data.length) return;

    const scores = data.map(score);
    const last = data[data.length - 1];
    const lastScore = score(last);
    const m7 = avg(scores.slice(-7));
    const f7 = forecast(scores, 7);
    const f30 = forecast(scores, 30);
    const f45 = forecast(scores, 45);

    const alerts = [];
    if (last.mobilite < 4.5) alerts.push("mobilité basse");
    if (last.plaisir <= 4.5) alerts.push("plaisir limité");
    if (last.appetit < 5) alerts.push("appétit faible");
    if (last.anxiete >= 8) alerts.push("anxiété/confusion élevée");
    if (last.douleur >= 8) alerts.push("douleur élevée");

    const box = document.createElement("div");
    box.className = "card";
    box.innerHTML = `
      <h2>Assistant Joy</h2>
      <p><strong>État actuel :</strong> ${status(lastScore)}</p>
      <p><strong>Score pondéré du jour :</strong> ${lastScore.toFixed(2)}/10</p>
      <p><strong>Moyenne 7 jours :</strong> ${m7.toFixed(2)}/10</p>

      <h3>Prévision prudente</h3>
      <p><strong>Dans 7 jours :</strong> ${f7.toFixed(2)}/10</p>
      <p><strong>Fin juillet / début août :</strong> ${f30.toFixed(2)} à ${f45.toFixed(2)}/10</p>
      <p><em>Confiance limitée : seulement ${data.length} jours de données.</em></p>

      <h3>Lecture automatique</h3>
      <p>${alerts.length ? "Points de vigilance : " + alerts.join(", ") + "." : "Pas de signal rouge aujourd’hui."}</p>
      <p>${f30 < lastScore - 0.4 ? "Tendance légèrement défavorable." : "Tendance globalement stable à court terme."}</p>

      <button id="copyJoyPrompt">Copier analyse pour ChatGPT</button>
    `;

    const target = [...document.querySelectorAll("h2")]
      .find(h => h.textContent.toLowerCase().includes("graphique"));

    if (target) target.parentNode.insertBefore(box, target);
    else document.body.appendChild(box);

    document.getElementById("copyJoyPrompt").onclick = async () => {
      const txt = "Analyse ces données Joy et actualise la prévision fin juillet / début août :\n\n" +
        JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(txt);
      document.getElementById("copyJoyPrompt").textContent = "Copié ✅";
    };
  }

  document.addEventListener("DOMContentLoaded", render);
})();