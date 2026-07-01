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
    return (
      (10 - Number(j.douleur || 0)) * Math.abs(WEIGHTS.douleur) +
      (10 - Number(j.anxiete || 0)) * Math.abs(WEIGHTS.anxiete) +
      Number(j.mobilite || 0) * WEIGHTS.mobilite +
      Number(j.appetit || 0) * WEIGHTS.appetit +
      Number(j.plaisir || 0) * WEIGHTS.plaisir +
      Number(j.bonheur || 0) * WEIGHTS.bonheur +
      Number(j.interactions || 0) * WEIGHTS.interactions +
      Number(j.environnement || 0) * WEIGHTS.environnement +
      Number(j.hydratation || 0) * WEIGHTS.hydratation +
      Number(j.hygiene || 0) * WEIGHTS.hygiene
    );
  }

  function avg(a) {
    return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  }

  function slope(values) {
    const n = values.length;
    if (n < 3) return 0;

    const mx = (n - 1) / 2;
    const my = avg(values);
    let num = 0;
    let den = 0;

    values.forEach((y, x) => {
      num += (x - mx) * (y - my);
      den += (x - mx) ** 2;
    });

    return den ? num / den : 0;
  }

  function forecast(scores, days) {
    const recent = scores.slice(-14);
    const trend = slope(recent);
    const last = scores[scores.length - 1];
    return Math.max(0, Math.min(10, last + trend * days));
  }

  function stars(v) {
    const n = Math.max(1, Math.min(5, Math.round(v / 2)));
    return "⭐".repeat(n) + "☆".repeat(5 - n);
  }

  function status(v) {
    if (v >= 6.2) return "Stable / plutôt favorable";
    if (v >= 5.0) return "Fragile mais acceptable";
    if (v >= 4.2) return "Zone de vigilance";
    return "Zone préoccupante";
  }

  function confidence(daysCount) {
    if (daysCount >= 60) return "forte 🟢";
    if (daysCount >= 30) return "moyenne 🟡";
    return "limitée 🔴";
  }

  function riskLevel(f30, lastScore) {
    if (f30 < 4.5) return "élevé 🔴";
    if (f30 < 5.1 || f30 < lastScore - 0.5) return "modéré 🟡";
    return "contenu 🟢";
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
    if (Number(last.mobilite) < 4.5) alerts.push("mobilité basse");
    if (Number(last.plaisir) <= 4.5) alerts.push("plaisir limité");
    if (Number(last.appetit) < 5) alerts.push("appétit faible");
    if (Number(last.anxiete) >= 8) alerts.push("anxiété/confusion élevée");
    if (Number(last.douleur) >= 8) alerts.push("douleur élevée");

    const existing = document.getElementById("joy-ai-agent");
    if (existing) existing.remove();

    const box = document.createElement("div");
    box.id = "joy-ai-agent";
    box.className = "card";

    box.innerHTML = `
      <h2>Assistant Joy</h2>

      <p><strong>Dernière date :</strong> ${last.date || "non renseignée"}</p>

      <p><strong>État actuel :</strong><br>
      ${status(lastScore)} ${stars(lastScore)}</p>

      <p><strong>Score pondéré du jour :</strong><br>
      ${lastScore.toFixed(2)}/10</p>

      <p><strong>Moyenne 7 jours :</strong><br>
      ${m7.toFixed(2)}/10 ${stars(m7)}</p>

      <h3>Prévision prudente</h3>

      <p><strong>Dans 7 jours :</strong><br>
      ${f7.toFixed(2)}/10 ${stars(f7)}</p>

      <p><strong>Fin juillet / début août :</strong><br>
      ${f30.toFixed(2)} à ${f45.toFixed(2)}/10 ${stars((f30 + f45) / 2)}</p>

      <p><strong>Risque de période difficile :</strong><br>
      ${riskLevel(f30, lastScore)}</p>

      <p><strong>Confiance du modèle :</strong><br>
      ${confidence(data.length)} — ${data.length} jours de données</p>

      <h3>Lecture automatique</h3>

      <p>
        ${alerts.length
          ? "Points de vigilance : " + alerts.join(", ") + "."
          : "Pas de signal rouge aujourd’hui."}
      </p>

      <p>
        ${f30 < lastScore - 0.4
          ? "La tendance prévisionnelle est légèrement défavorable."
          : "La tendance prévisionnelle reste globalement stable à court terme."}
      </p>

      <button id="copyJoyPrompt">Copier analyse pour ChatGPT</button>
    `;

    const target = [...document.querySelectorAll("h2")]
      .find(h => h.textContent.toLowerCase().includes("historique"));

    if (target) target.parentNode.insertBefore(box, target);
    else document.body.appendChild(box);

    document.getElementById("copyJoyPrompt").onclick = async () => {
      const txt =
        "Analyse ces données Joy et actualise la prévision fin juillet / début août :\n\n" +
        JSON.stringify(data, null, 2);

      await navigator.clipboard.writeText(txt);
      document.getElementById("copyJoyPrompt").textContent = "Copié ✅";
    };
  }

  document.addEventListener("DOMContentLoaded", render);
})();