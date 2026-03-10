const STORAGE_KEYS = {
  submissions: "cnhs_leadership_award_submissions_v1",
  auth: "cnhs_admin_auth_v1",
};

const DEFAULT_AUTH = {
  username: "admin",
  password: "CNHS-Leadership2026!",
  resetKey: "CNHS-RESET-2026",
};

const nominationView = document.getElementById("nominationView");
const adminLoginView = document.getElementById("adminLoginView");
const adminDashboardView = document.getElementById("adminDashboardView");
const logoutBtn = document.getElementById("logoutBtn");

const showNominationBtn = document.getElementById("showNominationBtn");
const showAdminBtn = document.getElementById("showAdminBtn");

const nominationForm = document.getElementById("nominationForm");
const formMessage = document.getElementById("formMessage");
const attachmentNote = document.getElementById("attachmentNote");

const raterType = document.getElementById("raterType");
const gradeLevel = document.getElementById("gradeLevel");
const nomineePeriod = document.getElementById("nomineePeriod");
const attachmentsInput = document.getElementById("attachments");
const nomineeNameInput = document.getElementById("nomineeName");

const scoreFields = [
  { id: "leadershipInitiative", label: "leadershipInitiativeVal" },
  { id: "influenceMotivation", label: "influenceMotivationVal" },
  {
    id: "responsibilityAccountability",
    label: "responsibilityAccountabilityVal",
  },
  { id: "teamworkCollaboration", label: "teamworkCollaborationVal" },
  {
    id: "schoolCommunityContribution",
    label: "schoolCommunityContributionVal",
  },
];

function ensureAuthSeed() {
  if (!localStorage.getItem(STORAGE_KEYS.auth)) {
    localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(DEFAULT_AUTH));
  }
  if (!localStorage.getItem(STORAGE_KEYS.submissions)) {
    localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify([]));
  }
}

function getAuth() {
  return JSON.parse(
    localStorage.getItem(STORAGE_KEYS.auth) || JSON.stringify(DEFAULT_AUTH),
  );
}

function getSubmissions() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.submissions) || "[]");
}

function saveSubmissions(data) {
  localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(data));
}

function setView(view) {
  nominationView.classList.add("hidden");
  adminLoginView.classList.add("hidden");
  adminDashboardView.classList.add("hidden");
  logoutBtn.classList.add("hidden");

  if (view === "nomination") {
    nominationView.classList.remove("hidden");
  }
  if (view === "login") {
    adminLoginView.classList.remove("hidden");
  }
  if (view === "dashboard") {
    adminDashboardView.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
  }
}

function showMessage(target, type, message) {
  target.innerHTML = `<div class="${type}">${message}</div>`;
}

function normalizeNomineeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function updateEligiblePeriod() {
  const level = gradeLevel.value;
  if (level === "10")
    nomineePeriod.value = "Eligible accomplishments: Grade 7 to Grade 10";
  else if (level === "12")
    nomineePeriod.value = "Eligible accomplishments: Grade 11 to Grade 12";
  else nomineePeriod.value = "";
}

function toggleRaterFields() {
  const adviserFields = document.querySelectorAll(".adviser-only");
  const peerFields = document.querySelectorAll(".peer-only");
  adviserFields.forEach((el) => el.classList.add("hidden"));
  peerFields.forEach((el) => el.classList.add("hidden"));

  if (raterType.value === "adviser")
    adviserFields.forEach((el) => el.classList.remove("hidden"));
  if (raterType.value === "peer")
    peerFields.forEach((el) => el.classList.remove("hidden"));
}

function updateScorePreview() {
  scoreFields.forEach((field) => {
    const input = document.getElementById(field.id);
    const label = document.getElementById(field.label);
    label.textContent = input.value;
  });

  const leadership =
    +document.getElementById("leadershipInitiative").value || 0;
  const influence = +document.getElementById("influenceMotivation").value || 0;
  const responsibility =
    +document.getElementById("responsibilityAccountability").value || 0;
  const teamwork = +document.getElementById("teamworkCollaboration").value || 0;
  const contribution =
    +document.getElementById("schoolCommunityContribution").value || 0;

  const weighted =
    leadership * 0.25 +
    influence * 0.25 +
    responsibility * 0.2 +
    teamwork * 0.15 +
    contribution * 0.15;
  document.getElementById("weightedPreview").textContent =
    `${weighted.toFixed(2)}%`;
  return weighted;
}

function validateNameFormat(name) {
  const clean = normalizeNomineeName(name);
  const pattern = /^[A-Z .'-]+,\s[A-Z .'-]+(\s[A-Z]\.)?$/;
  return pattern.test(clean);
}

attachmentsInput.addEventListener("change", () => {
  const count = attachmentsInput.files.length;
  if (count > 5) {
    attachmentsInput.value = "";
    attachmentNote.textContent = "Only up to 5 files are allowed.";
  } else {
    attachmentNote.textContent = count ? `${count} file(s) selected.` : "";
  }
});

scoreFields.forEach((field) =>
  document
    .getElementById(field.id)
    .addEventListener("input", updateScorePreview),
);
gradeLevel.addEventListener("change", updateEligiblePeriod);
raterType.addEventListener("change", toggleRaterFields);

nominationForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMessage.innerHTML = "";

  const nomineeName = normalizeNomineeName(nomineeNameInput.value);
  nomineeNameInput.value = nomineeName;

  if (!validateNameFormat(nomineeName)) {
    showMessage(
      formMessage,
      "error",
      "Nominee name must be in CAPITAL LETTERS and follow this format: SURNAME, GIVEN NAME, MI",
    );
    return;
  }

  if (attachmentsInput.files.length > 5) {
    showMessage(formMessage, "error", "Only 5 attachments are allowed.");
    return;
  }

  const type = raterType.value;
  if (!type) {
    showMessage(
      formMessage,
      "error",
      "Please select either Adviser Rating / Nomination or Peer Rating.",
    );
    return;
  }

  const submissions = getSubmissions();
  const existingPeerCount = submissions.filter(
    (s) => s.nomineeName === nomineeName && s.raterType === "peer",
  ).length;
  if (type === "peer" && existingPeerCount >= 5) {
    showMessage(
      formMessage,
      "error",
      "This nominee already has 5 peer ratings. No additional peer entry can be accepted.",
    );
    return;
  }

  const fileList = Array.from(attachmentsInput.files || []).map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type || "unknown",
  }));

  const payload = {
    id: crypto.randomUUID(),
    submittedAt: new Date().toLocaleString(),
    nomineeName,
    gradeLevel: document.getElementById("gradeLevel").value,
    section: document.getElementById("section").value.trim(),
    positionHeld: document.getElementById("positionHeld").value.trim(),
    organization: document.getElementById("organization").value.trim(),
    schoolYear: document.getElementById("schoolYear").value.trim(),
    accomplishmentPeriod: document.getElementById("nomineePeriod").value.trim(),
    raterType: type,
    adviserName: document.getElementById("adviserName").value.trim(),
    adviserRecommendation: document.getElementById("adviserRecommendation")
      .value,
    adviserRemarks: document.getElementById("adviserRemarks").value.trim(),
    peerName: document.getElementById("peerName").value.trim(),
    peerRelationship: document.getElementById("peerRelationship").value.trim(),
    peerRemarks: document.getElementById("peerRemarks").value.trim(),
    projects: document.getElementById("projects").value.trim(),
    accomplishments: document.getElementById("accomplishments").value.trim(),
    motivationNarrative: document
      .getElementById("motivationNarrative")
      .value.trim(),
    communityContribution: document
      .getElementById("communityContribution")
      .value.trim(),
    leadershipInitiative: +document.getElementById("leadershipInitiative")
      .value,
    influenceMotivation: +document.getElementById("influenceMotivation").value,
    responsibilityAccountability: +document.getElementById(
      "responsibilityAccountability",
    ).value,
    teamworkCollaboration: +document.getElementById("teamworkCollaboration")
      .value,
    schoolCommunityContribution: +document.getElementById(
      "schoolCommunityContribution",
    ).value,
    weightedScore: updateScorePreview(),
    attachments: fileList,
  };

  submissions.push(payload);
  saveSubmissions(submissions);
  nominationForm.reset();
  nomineePeriod.value = "";
  toggleRaterFields();
  updateScorePreview();
  attachmentNote.textContent = "";
  showMessage(
    formMessage,
    "success",
    "Submission saved successfully. The admin dashboard can review the summarized results securely.",
  );
});

document.getElementById("resetFormBtn").addEventListener("click", () => {
  formMessage.innerHTML = "";
  nomineePeriod.value = "";
  attachmentNote.textContent = "";
  toggleRaterFields();
  updateScorePreview();
});

showNominationBtn.addEventListener("click", () => setView("nomination"));
showAdminBtn.addEventListener("click", () => setView("login"));
logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("cnhs_admin_logged_in");
  setView("login");
});

document.getElementById("toggleResetBtn").addEventListener("click", () => {
  document.getElementById("resetCard").classList.toggle("hidden");
});

document.getElementById("loginBtn").addEventListener("click", () => {
  const username = document.getElementById("adminUsername").value.trim();
  const password = document.getElementById("adminPassword").value;
  const auth = getAuth();

  if (username === auth.username && password === auth.password) {
    sessionStorage.setItem("cnhs_admin_logged_in", "true");
    showMessage(
      document.getElementById("loginMessage"),
      "success",
      "Login successful. Opening secure admin dashboard.",
    );
    renderDashboard();
    setView("dashboard");
  } else {
    showMessage(
      document.getElementById("loginMessage"),
      "error",
      "Invalid username or password.",
    );
  }
});

document.getElementById("resetPasswordBtn").addEventListener("click", () => {
  const username = document.getElementById("resetUsername").value.trim();
  const resetKey = document.getElementById("resetKey").value;
  const newPassword = document.getElementById("newPassword").value;
  const auth = getAuth();

  if (username !== auth.username || resetKey !== auth.resetKey) {
    showMessage(
      document.getElementById("resetMessage"),
      "error",
      "Invalid username or reset key.",
    );
    return;
  }
  if (!newPassword || newPassword.length < 8) {
    showMessage(
      document.getElementById("resetMessage"),
      "error",
      "New password must be at least 8 characters long.",
    );
    return;
  }
  localStorage.setItem(
    STORAGE_KEYS.auth,
    JSON.stringify({ ...auth, password: newPassword }),
  );
  showMessage(
    document.getElementById("resetMessage"),
    "success",
    "Admin password updated successfully.",
  );
});

function groupSubmissions(submissions) {
  const map = new Map();

  submissions.forEach((item) => {
    const key = item.nomineeName;
    if (!map.has(key)) {
      map.set(key, {
        nomineeName: item.nomineeName,
        gradeLevel: item.gradeLevel,
        section: item.section,
        entries: 0,
        peerCount: 0,
        adviserCount: 0,
        leadershipInitiative: 0,
        influenceMotivation: 0,
        responsibilityAccountability: 0,
        teamworkCollaboration: 0,
        schoolCommunityContribution: 0,
        weightedScore: 0,
        attachmentCount: 0,
      });
    }

    const row = map.get(key);
    row.entries += 1;
    row.peerCount += item.raterType === "peer" ? 1 : 0;
    row.adviserCount += item.raterType === "adviser" ? 1 : 0;
    row.leadershipInitiative += item.leadershipInitiative;
    row.influenceMotivation += item.influenceMotivation;
    row.responsibilityAccountability += item.responsibilityAccountability;
    row.teamworkCollaboration += item.teamworkCollaboration;
    row.schoolCommunityContribution += item.schoolCommunityContribution;
    row.weightedScore += item.weightedScore;
    row.attachmentCount += (item.attachments || []).length;
  });

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      avgLeadershipInitiative: row.leadershipInitiative / row.entries,
      avgInfluenceMotivation: row.influenceMotivation / row.entries,
      avgResponsibilityAccountability:
        row.responsibilityAccountability / row.entries,
      avgTeamworkCollaboration: row.teamworkCollaboration / row.entries,
      avgSchoolCommunityContribution:
        row.schoolCommunityContribution / row.entries,
      avgWeightedScore: row.weightedScore / row.entries,
    }))
    .sort((a, b) => b.avgWeightedScore - a.avgWeightedScore);
}

function renderDashboard() {
  const submissions = getSubmissions();
  const grouped = groupSubmissions(submissions);

  document.getElementById("metricNominees").textContent = grouped.length;
  document.getElementById("metricSubmissions").textContent = submissions.length;
  document.getElementById("metricPeer").textContent = submissions.filter(
    (s) => s.raterType === "peer",
  ).length;
  document.getElementById("metricAdviser").textContent = submissions.filter(
    (s) => s.raterType === "adviser",
  ).length;

  const summaryBody = document.getElementById("summaryTableBody");
  const detailBody = document.getElementById("detailTableBody");
  summaryBody.innerHTML = "";
  detailBody.innerHTML = "";

  if (!grouped.length) {
    summaryBody.innerHTML =
      '<tr><td colspan="14" class="muted">No data yet.</td></tr>';
  } else {
    grouped.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${row.nomineeName}</strong></td>
            <td>${row.gradeLevel || ""}</td>
            <td>${row.section || ""}</td>
            <td>${row.entries}</td>
            <td>${row.peerCount}</td>
            <td>${row.adviserCount}</td>
            <td>${row.avgLeadershipInitiative.toFixed(2)}%</td>
            <td>${row.avgInfluenceMotivation.toFixed(2)}%</td>
            <td>${row.avgResponsibilityAccountability.toFixed(2)}%</td>
            <td>${row.avgTeamworkCollaboration.toFixed(2)}%</td>
            <td>${row.avgSchoolCommunityContribution.toFixed(2)}%</td>
            <td><strong>${row.avgWeightedScore.toFixed(2)}%</strong></td>
            <td>${row.attachmentCount}</td>
          `;
      summaryBody.appendChild(tr);
    });
  }

  if (!submissions.length) {
    detailBody.innerHTML =
      '<tr><td colspan="7" class="muted">No submission log yet.</td></tr>';
  } else {
    submissions
      .slice()
      .reverse()
      .forEach((item) => {
        const rater =
          item.raterType === "adviser"
            ? item.adviserName || "Adviser"
            : item.peerName || "Peer";
        const recommendation =
          item.raterType === "adviser"
            ? item.adviserRecommendation || "-"
            : item.peerRelationship || "-";
        const typeClass =
          item.raterType === "adviser" ? "pill-adviser" : "pill-peer";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.submittedAt}</td>
            <td><strong>${item.nomineeName}</strong></td>
            <td><span class="pill ${typeClass}">${item.raterType}</span></td>
            <td>${rater}</td>
            <td>${Number(item.weightedScore).toFixed(2)}%</td>
            <td>${recommendation}</td>
            <td>${(item.attachments || []).length}</td>
          `;
        detailBody.appendChild(tr);
      });
  }
}

document
  .getElementById("refreshDashboardBtn")
  .addEventListener("click", renderDashboard);

document.getElementById("downloadJsonBtn").addEventListener("click", () => {
  const data = {
    exportedAt: new Date().toISOString(),
    submissions: getSubmissions(),
    summary: groupSubmissions(getSubmissions()),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cnhs-leadership-award-backup.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("clearAllDataBtn").addEventListener("click", () => {
  const ok = confirm(
    "This will permanently clear all locally stored submissions in this browser. Continue?",
  );
  if (!ok) return;
  saveSubmissions([]);
  renderDashboard();
});

ensureAuthSeed();
updateEligiblePeriod();
toggleRaterFields();
updateScorePreview();

if (sessionStorage.getItem("cnhs_admin_logged_in") === "true") {
  renderDashboard();
  setView("dashboard");
} else {
  setView("nomination");
}
