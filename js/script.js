import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------------- FIREBASE ---------------- */

const firebaseConfig = {
  apiKey: "AIzaSyDLebjG2CVFWKMMbOj4JpdaFsSI6Qx4FlI",
  authDomain: "cnhs-leadership-award.firebaseapp.com",
  projectId: "cnhs-leadership-award",
  storageBucket: "cnhs-leadership-award.firebasestorage.app",
  messagingSenderId: "496591251903",
  appId: "1:496591251903:web:fb4719ac99d09c7a6e590a",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------------- AUTH ---------------- */

const STORAGE_KEYS = {
  auth: "cnhs_admin_auth_v1",
};

const DEFAULT_AUTH = {
  username: "admin",
  password: "CNHS-Leadership2026!",
  resetKey: "CNHS-RESET-2026",
};

function ensureAuthSeed() {
  if (!localStorage.getItem(STORAGE_KEYS.auth)) {
    localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(DEFAULT_AUTH));
  }
}

function getAuth() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.auth));
}

/* ---------------- FIRESTORE ---------------- */

async function saveSubmission(payload) {
  await addDoc(collection(db, "submissions"), payload);
}

async function getSubmissions() {
  const snapshot = await getDocs(collection(db, "submissions"));
  const data = [];

  snapshot.forEach((d) => {
    data.push({ id: d.id, ...d.data() });
  });

  return data;
}

async function deleteAllSubmissions() {
  const snapshot = await getDocs(collection(db, "submissions"));

  for (const item of snapshot.docs) {
    await deleteDoc(doc(db, "submissions", item.id));
  }
}

/* ---------------- UTILITIES ---------------- */

function normalizeNomineeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function validateNameFormat(name) {
  const pattern = /^[A-Z .'-]+,\s[A-Z .'-]+(\s[A-Z]\.)?$/;
  return pattern.test(name);
}

/* ---------------- MAIN ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- ELEMENTS ---------- */

  const nominationView = document.getElementById("nominationView");
  const adminLoginView = document.getElementById("adminLoginView");
  const adminDashboardView = document.getElementById("adminDashboardView");

  const showNominationBtn = document.getElementById("showNominationBtn");
  const showAdminBtn = document.getElementById("showAdminBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const nominationForm = document.getElementById("nominationForm");
  const formMessage = document.getElementById("formMessage");

  const raterType = document.getElementById("raterType");
  const gradeLevel = document.getElementById("gradeLevel");
  const nomineePeriod = document.getElementById("nomineePeriod");

  const attachmentsInput = document.getElementById("attachments");
  const attachmentNote = document.getElementById("attachmentNote");

  const nomineeNameInput = document.getElementById("nomineeName");

  /* ---------- VIEW CONTROL ---------- */

  function setView(view) {
    nominationView.classList.add("hidden");
    adminLoginView.classList.add("hidden");
    adminDashboardView.classList.add("hidden");
    logoutBtn.classList.add("hidden");

    if (view === "nomination") nominationView.classList.remove("hidden");

    if (view === "login") adminLoginView.classList.remove("hidden");

    if (view === "dashboard") {
      adminDashboardView.classList.remove("hidden");
      logoutBtn.classList.remove("hidden");
    }
  }

  /* ---------- NAVIGATION ---------- */

  showNominationBtn.addEventListener("click", () => setView("nomination"));

  showAdminBtn.addEventListener("click", () => setView("login"));

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("admin");
    setView("login");
  });

  /* ---------- PERIOD ---------- */

  function updateEligiblePeriod() {
    if (gradeLevel.value === "10")
      nomineePeriod.value = "Eligible accomplishments: Grade 7 to Grade 10";
    else if (gradeLevel.value === "12")
      nomineePeriod.value = "Eligible accomplishments: Grade 11 to Grade 12";
    else nomineePeriod.value = "";
  }

  gradeLevel.addEventListener("change", updateEligiblePeriod);

  /* ---------- SCORE PREVIEW ---------- */

  const scoreFields = [
    "leadershipInitiative",
    "influenceMotivation",
    "responsibilityAccountability",
    "teamworkCollaboration",
    "schoolCommunityContribution",
  ];

  function updateScorePreview() {
    scoreFields.forEach((id) => {
      document.getElementById(id + "Val").textContent =
        document.getElementById(id).value;
    });

    const leadership =
      +document.getElementById("leadershipInitiative").value || 0;

    const influence =
      +document.getElementById("influenceMotivation").value || 0;

    const responsibility =
      +document.getElementById("responsibilityAccountability").value || 0;

    const teamwork =
      +document.getElementById("teamworkCollaboration").value || 0;

    const contribution =
      +document.getElementById("schoolCommunityContribution").value || 0;

    const weighted =
      leadership * 0.25 +
      influence * 0.25 +
      responsibility * 0.2 +
      teamwork * 0.15 +
      contribution * 0.15;

    document.getElementById("weightedPreview").textContent =
      weighted.toFixed(2) + "%";

    return weighted;
  }

  scoreFields.forEach((id) =>
    document.getElementById(id).addEventListener("input", updateScorePreview),
  );

  /* ---------- ATTACHMENTS ---------- */

  attachmentsInput.addEventListener("change", () => {
    const count = attachmentsInput.files.length;

    if (count > 5) {
      attachmentsInput.value = "";
      attachmentNote.textContent = "Only up to 5 files are allowed.";
    } else {
      attachmentNote.textContent = count ? `${count} file(s) selected.` : "";
    }
  });

  /* ---------- FORM SUBMIT ---------- */

  nominationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nomineeName = normalizeNomineeName(nomineeNameInput.value);

    nomineeNameInput.value = nomineeName;

    if (!validateNameFormat(nomineeName)) {
      alert("Use format: SURNAME, GIVEN NAME, MI");
      return;
    }

    const rater = raterType.value;

    if (!rater) {
      alert("Select rater type.");
      return;
    }

    const submissions = await getSubmissions();

    const peerCount = submissions.filter(
      (s) => s.nomineeName === nomineeName && s.raterType === "peer",
    ).length;

    if (rater === "peer" && peerCount >= 5) {
      alert("This nominee already has 5 peer ratings.");
      return;
    }

    const payload = {
      submittedAt: new Date().toLocaleString(),

      nomineeName,

      gradeLevel: gradeLevel.value,

      section: document.getElementById("section").value,

      raterType: rater,

      adviserName: document.getElementById("adviserName").value,

      peerName: document.getElementById("peerName").value,

      leadershipInitiative: +document.getElementById("leadershipInitiative")
        .value,

      influenceMotivation: +document.getElementById("influenceMotivation")
        .value,

      responsibilityAccountability: +document.getElementById(
        "responsibilityAccountability",
      ).value,

      teamworkCollaboration: +document.getElementById("teamworkCollaboration")
        .value,

      schoolCommunityContribution: +document.getElementById(
        "schoolCommunityContribution",
      ).value,

      weightedScore: updateScorePreview(),

      attachments: Array.from(attachmentsInput.files).map((f) => ({
        name: f.name,
        size: f.size,
      })),
    };

    await saveSubmission(payload);

    nominationForm.reset();

    updateScorePreview();

    alert("Submission saved successfully.");
  });

  /* ---------- GROUPING ---------- */

  function groupSubmissions(submissions) {
    const map = new Map();

    submissions.forEach((item) => {
      if (!map.has(item.nomineeName)) {
        map.set(item.nomineeName, {
          nomineeName: item.nomineeName,
          gradeLevel: item.gradeLevel,
          section: item.section,
          entries: 0,
          peerCount: 0,
          adviserCount: 0,
          weightedTotal: 0,
          attachmentCount: 0,
        });
      }

      const row = map.get(item.nomineeName);

      row.entries++;

      if (item.raterType === "peer") row.peerCount++;

      if (item.raterType === "adviser") row.adviserCount++;

      row.weightedTotal += Number(item.weightedScore);

      row.attachmentCount += (item.attachments || []).length;
    });

    return Array.from(map.values()).map((row) => ({
      ...row,
      avgScore: row.weightedTotal / row.entries,
    }));
  }

  /* ---------- DASHBOARD ---------- */

  async function renderDashboard() {
    const submissions = await getSubmissions();

    const grouped = groupSubmissions(submissions);

    document.getElementById("metricNominees").textContent = grouped.length;

    document.getElementById("metricSubmissions").textContent =
      submissions.length;

    document.getElementById("metricPeer").textContent = submissions.filter(
      (s) => s.raterType === "peer",
    ).length;

    document.getElementById("metricAdviser").textContent = submissions.filter(
      (s) => s.raterType === "adviser",
    ).length;

    const summaryBody = document.getElementById("summaryTableBody");

    summaryBody.innerHTML = "";

    grouped
      .sort((a, b) => b.avgScore - a.avgScore)
      .forEach((row, index) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${row.nomineeName}</td>
        <td>${row.gradeLevel}</td>
        <td>${row.section}</td>
        <td>${row.entries}</td>
        <td>${row.peerCount}</td>
        <td>${row.adviserCount}</td>
        <td>${row.avgScore.toFixed(2)}%</td>
        <td>${row.attachmentCount}</td>
        `;

        summaryBody.appendChild(tr);
      });
  }

  /* ---------- ADMIN LOGIN ---------- */

  document.getElementById("loginBtn").addEventListener("click", async () => {
    const username = document.getElementById("adminUsername").value;

    const password = document.getElementById("adminPassword").value;

    const auth = getAuth();

    if (username === auth.username && password === auth.password) {
      sessionStorage.setItem("admin", "true");

      await renderDashboard();

      setView("dashboard");
    } else {
      alert("Invalid login");
    }
  });

  /* ---------- EXPORT JSON ---------- */

  document
    .getElementById("downloadJsonBtn")
    .addEventListener("click", async () => {
      const submissions = await getSubmissions();

      const data = {
        exportedAt: new Date().toISOString(),
        submissions,
        summary: groupSubmissions(submissions),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = "leadership-award-backup.json";

      a.click();
    });

  /* ---------- CLEAR DATABASE ---------- */

  document
    .getElementById("clearAllDataBtn")
    .addEventListener("click", async () => {
      const ok = confirm("Delete ALL submissions?");

      if (!ok) return;

      await deleteAllSubmissions();

      renderDashboard();
    });

  /* ---------- INIT ---------- */

  ensureAuthSeed();

  updateEligiblePeriod();

  updateScorePreview();

  if (sessionStorage.getItem("admin") === "true") {
    renderDashboard();
    setView("dashboard");
  } else {
    setView("nomination");
  }
});
