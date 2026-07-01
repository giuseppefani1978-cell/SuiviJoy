(function () {
  function getJoyData() {
    const possibleKeys = ["joyData", "suiviJoyData", "donneesJoy", "data"];
    for (const key of possibleKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }

    if (Array.isArray(window.joyData)) return window.joyData;
    if (Array.isArray(window.data)) return window.data;

    return [];
  }

  function avg(arr, key) {
    const vals = arr.map(x => Number(x[key])).filter(x => !isNaN(x));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  function scoreCorrige(jour) {
    const positif = [
      jour.appetit,
      jour.hydratation,
      jour.mobilite,
      jour.hygiene,
      jour.environnement,
      jour.interactions,
      jour.plaisir,
      jour.bonheur
    ];

    const douleurInversee = 10 - Number(jour.douleur || 0);
    const anxieteInversee = 10 - Number(jour.anxiete || 0);

    const valeurs = [...positif, douleurInversee, anxieteInversee]
      .map(Number)
      .filter(x => !isNaN(x));

    return valeurs.length
      ? valeurs.reduce((a, b) => a + b, 0) / valeurs.length
      : null;
  }

  function tendance(data) {
    if (data.length < 4) return "Pas encore assez de données pour une vraie tendance.";

    const derniers = data.slice(-7);
    const precedents = data.slice(-14, -7);

    const scoreDerniers = avg(derniers.map(j => ({ score: scoreCorrige(j) })), "score");
    const scorePrecedents = precedents.length
      ? avg(precedents.map(j => ({ score: scoreCorrige(j) })), "score")
      : null;

    if (scorePrecedents === null) {
      return `Score corrigé moyen récent : ${scoreDerniers.toFixed(2)}/10.`;
    }

    const diff = scoreDerniers - scorePrecedents;

    if (diff > 0.25) return `Tendance plutôt positive : +${diff.toFixed(2)} point sur la période récente.`;
    if (diff < -0.25) return `Tendance plutôt négative : ${diff.toFixed(2)} point sur la période récente.`;
    return `Tendance globalement stable : variation de ${diff.toFixed(2)} point.`;
  }

  function alertes(data) {
    const last = data[data.length - 1];
    if (!last) return [];

    const alerts = [];

    if (Number(last.mobilite) < 4.5) alerts.push("Mobilité basse aujourd’hui.");
    if (Number(last.appetit) < 5) alerts.push("Appétit faible aujourd’hui.");
    if (Number(last.plaisir) <= 4) alerts.push("Plaisir très limité aujourd’hui.");
    if (Number(last.anxiete) >= 8) alerts.push("Anxiété/confusion élevée aujourd’hui.");
    if (Number(last.douleur) >= 8) alerts.push("Douleur/inconfort élevé aujourd’hui.");

    return alerts;
  }

  function analyseJoy() {
    const data = getJoyData();
    if (!data.length) return "Aucune donnée Joy trouvée.";

    const last = data[data.length - 1];
    const score = scoreCorrige(last);
    const moy7 = data.slice(-7).map(scoreCorrige).filter(x => x !== null);
    const moyenne7 = moy7.reduce((a, b) => a + b, 0) / moy7.length;

    const a = alertes(data);

    let html = `
      <div class="card">
        <h2>Analyse automatique Joy</h2>
        <p><strong>Dernière date :</strong> ${last.date || "non renseignée"}</p>
        <p><strong>Score corrigé du jour :</strong> ${score ? score.toFixed(2) : "n/a"}/10</p>
        <p><strong>Moyenne corrigée 7 jours :</strong> ${moyenne7 ? moyenne7.toFixed(2) : "n/a"}/10</p>
        <p><strong>Tendance :</strong> ${tendance(data)}</p>
    `;

    if (a.length) {
      html += `<p><strong>Points de vigilance :</strong></p><ul>`;
      a.forEach(x => html += `<li>${x}</li>`);
      html += `</ul>`;
    } else {
      html += `<p><strong>Points de vigilance :</strong> aucun signal rouge aujourd’hui.</p>`;
    }

    html += `
        <button id="copyJoyJsonBtn">Copier le JSON pour ChatGPT</button>
      </div>
    `;

    return html;
  }

  function injectJoyAI() {
    const container = document.createElement("div");
    container.id = "joy-ai-agent";
    container.innerHTML = analyseJoy();

    const historique = Array.from(document.querySelectorAll("h2"))
      .find(h => h.textContent.toLowerCase().includes("historique"));

    if (historique) {
      historique.parentNode.insertBefore(container, historique);
    } else {
      document.body.appendChild(container);
    }

    const btn = document.getElementById("copyJoyJsonBtn");
    if (btn) {
      btn.addEventListener("click", async () => {
        const data = getJoyData();
        const json = JSON.stringify(data, null, 2);
        try {
          await navigator.clipboard.writeText(json);
          btn.textContent = "JSON copié ✅";
        } catch (e) {
          alert(json);
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", injectJoyAI);
})();