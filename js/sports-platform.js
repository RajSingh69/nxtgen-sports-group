import {
  auth,
  db,
  isSportsPlatformFirebaseConfigured,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "./sports-platform-firebase-app.js";

const roles = ["athlete", "guardian", "coach", "manager", "organisation", "moderator", "admin"];
const managementRoles = new Set(["coach", "manager", "moderator", "admin", "organisation"]);
const adminRoles = new Set(["admin", "moderator"]);
const sportLevels = ["grassroots", "academy", "school/college", "semi-professional", "professional", "other"];
const statusOptions = ["active", "inactive"];
const goalCategories = ["sporting", "physical", "nutrition", "mindset", "education", "personal", "life skills", "other"];
const managementNav = ["Dashboard", "Athletes", "Teams", "Organisations", "Development", "Reviews", "Safeguarding", "Reports", "Users", "Settings"];
const profileSections = ["overview", "sport", "physical", "nutrition", "wellbeing", "goals", "personal", "education", "reviews", "notes", "relationships"];

const app = document.querySelector("[data-sports-app]");
const loginForm = document.querySelector("[data-sports-login-form]");
const resetButton = document.querySelector("[data-sports-reset]");
const signOutButton = document.querySelector("[data-sports-sign-out]");
const message = document.querySelector("[data-sports-message]");
const mount = document.querySelector("[data-sports-mount]");
const userBadge = document.querySelector("[data-sports-user]");
let currentUserProfile = null;
let currentAthlete = null;
let accessibleAthletes = [];
let route = document.body.dataset.platformRoute || "app";

const setMessage = (text, tone = "info") => {
  if (!message) return;
  message.textContent = text;
  message.dataset.tone = tone;
  message.hidden = !text;
};
const friendlyError = error => ({
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/network-request-failed": "Unable to reach Firebase. Check your connection and try again.",
  "permission-denied": "Your account does not have permission to access that data."
}[error?.code] || "Unable to complete that request. Please try again.");
const handleError = (error, fallback) => { console.error("NXT Gen Sports Platform error", error); setMessage(fallback || friendlyError(error), "error"); };
const configuredGuard = () => {
  if (isSportsPlatformFirebaseConfigured) return true;
  app?.classList.add("is-config-missing");
  setMessage("Sports Platform Firebase configuration is required before sign-in can be used.", "error");
  if (mount) mount.innerHTML = `<section class="sports-empty"><h2>Firebase configuration required</h2><p>Add the Sports Platform Firebase web configuration before using the app.</p></section>`;
  return false;
};
const escapeHtml = value => String(value ?? "").replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
const clean = (value, max = 200) => String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
const displayName = profile => profile?.displayName || [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || auth?.currentUser?.email || "NXT Gen user";
const roleLabel = role => String(role || "").replaceAll("_", " ");
const ageFromDob = dob => {
  if (!dob) return "Not set";
  const birth = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "Not set";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return `${age} (${age < 18 ? "minor" : "adult"})`;
};
const slugId = text => clean(text, 80).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "athlete";
const getParam = name => new URLSearchParams(window.location.search).get(name);

const getUserProfile = async user => {
  const snap = await getDoc(doc(db, "users", user.uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};
const getOwnedAthlete = async profile => {
  if (profile?.role !== "athlete" || !profile.athleteId) return null;
  const snap = await getDoc(doc(db, "athletes", profile.athleteId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};
const queryByRelationship = async (collectionName, field, uid) => {
  const snap = await getDocs(query(collection(db, collectionName), where(field, "==", uid), where("active", "==", true), limit(80)));
  return snap.docs.map(item => ({ id: item.id, ...item.data() }));
};
const loadAccessibleAthletes = async profile => {
  if (!profile) return [];
  if (profile.role === "admin") {
    const snap = await getDocs(query(collection(db, "athletes"), orderBy("updatedAt", "desc"), limit(120)));
    return snap.docs.map(item => ({ id: item.id, ...item.data() }));
  }
  if (profile.role === "athlete") return currentAthlete ? [currentAthlete] : [];
  const relationshipCollections = [];
  if (profile.role === "guardian") relationshipCollections.push(["guardianAthleteLinks", "guardianUid"]);
  if (profile.role === "coach") relationshipCollections.push(["athleteCoachAssignments", "coachUid"]);
  if (profile.role === "manager") relationshipCollections.push(["athleteManagerAssignments", "managerUid"]);
  const links = (await Promise.all(relationshipCollections.map(([name, field]) => queryByRelationship(name, field, profile.id)))).flat();
  const athletes = await Promise.all([...new Set(links.map(item => item.athleteId).filter(Boolean))].map(async athleteId => {
    const snap = await getDoc(doc(db, "athletes", athleteId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }));
  return athletes.filter(Boolean);
};
const countCollection = async name => (await getCountFromServer(collection(db, name))).data().count;
const loadRecords = async (name, athleteId, dateField = "createdAt") => {
  const snap = await getDocs(query(collection(db, name), where("athleteId", "==", athleteId), orderBy(dateField, "desc"), limit(50)));
  return snap.docs.map(item => ({ id: item.id, ...item.data() }));
};
const loadProfileData = async athleteId => ({
  goals: await loadRecords("athleteGoals", athleteId),
  reviews: await loadRecords("athleteReviews", athleteId, "reviewDate"),
  notes: await loadRecords("athleteNotes", athleteId),
  physical: await loadRecords("athletePhysicalRecords", athleteId),
  nutrition: await loadRecords("athleteNutritionRecords", athleteId),
  wellbeing: await loadRecords("athleteWellbeingCheckins", athleteId),
  development: await loadRecords("athleteDevelopmentRecords", athleteId),
  personal: await loadRecords("athletePersonalDevelopmentRecords", athleteId),
  education: await loadRecords("athleteEducationRecords", athleteId),
  coachLinks: await getDocs(query(collection(db, "athleteCoachAssignments"), where("athleteId", "==", athleteId), where("active", "==", true), limit(20))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))),
  managerLinks: await getDocs(query(collection(db, "athleteManagerAssignments"), where("athleteId", "==", athleteId), where("active", "==", true), limit(20))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))),
  guardianLinks: await getDocs(query(collection(db, "guardianAthleteLinks"), where("athleteId", "==", athleteId), where("active", "==", true), limit(20))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })))
});

const renderShellHeader = () => {
  if (!userBadge || !currentUserProfile) return;
  userBadge.innerHTML = `<strong>${escapeHtml(displayName(currentUserProfile))}</strong><span>${escapeHtml(roleLabel(currentUserProfile.role))}</span>`;
};
const renderManagementDashboard = async () => {
  const counts = currentUserProfile.role === "admin" ? {
    athletes: await countCollection("athletes"), teams: await countCollection("teams"), organisations: await countCollection("organisations"), reports: await countCollection("safeguardingReports")
  } : { athletes: accessibleAthletes.length, teams: "-", organisations: "-", reports: "-" };
  mount.innerHTML = `<section class="sports-hero-panel compact"><div><p class="eyebrow">Management dashboard</p><h1>NXT Gen Sports Platform</h1><p>Private athlete-management foundation with relationship-based access.</p></div></section><nav class="sports-app-nav">${managementNav.filter(item => currentUserProfile.role === "admin" || !["Users", "Settings"].includes(item)).map(item => `<a href="/sports-admin/${item === "Dashboard" ? "" : item.toLowerCase() + "/"}">${item}</a>`).join("")}</nav><section class="sports-metrics"><article><span>Total athletes</span><strong>${counts.athletes}</strong></article><article><span>Teams</span><strong>${counts.teams}</strong></article><article><span>Organisations</span><strong>${counts.organisations}</strong></article><article><span>Open safeguarding reports</span><strong>${counts.reports}</strong></article></section>${renderAthleteDirectory()}`;
};
const renderAthleteDashboard = () => {
  const athlete = currentAthlete;
  mount.innerHTML = `<section class="sports-hero-panel"><div><p class="eyebrow">Athlete dashboard</p><h1>${escapeHtml(athlete?.displayName || displayName(currentUserProfile))}</h1><p>Whole-person development foundation for sport, wellbeing, learning and long-term progression.</p></div><dl><div><dt>Sport</dt><dd>${escapeHtml(athlete?.sport || "Not set")}</dd></div><div><dt>Age</dt><dd>${escapeHtml(ageFromDob(athlete?.dateOfBirth))}</dd></div><div><dt>Status</dt><dd>${escapeHtml(athlete?.status || "Active")}</dd></div></dl></section><section class="sports-section-grid">${["Overview","My Development","Sport / Performance","Physical","Nutrition","Mindset & Wellbeing","Personal Development","Education & Life Skills","NXT Gen Social"].map(title => `<article><h2>${title}</h2><p>No ${title.toLowerCase()} data yet.</p></article>`).join("")}</section>`;
};

const renderAthleteDirectory = () => {
  const sportOptions = [...new Set(accessibleAthletes.map(a => a.sport).filter(Boolean))];
  const teamOptions = [...new Set(accessibleAthletes.map(a => a.currentTeam || a.academy).filter(Boolean))];
  return `<section class="sports-panel" id="athletes"><div class="sports-panel-head"><h2>Private athlete directory</h2><span>${accessibleAthletes.length}</span></div>${currentUserProfile?.role === "admin" ? renderAthleteCreateForm() : ""}<div class="sports-filter-row"><input data-athlete-search placeholder="Search name"><select data-athlete-sport><option value="">All sports</option>${sportOptions.map(v => `<option>${escapeHtml(v)}</option>`).join("")}</select><select data-athlete-team><option value="">All teams</option>${teamOptions.map(v => `<option>${escapeHtml(v)}</option>`).join("")}</select><select data-athlete-status><option value="">All statuses</option>${statusOptions.map(v => `<option>${v}</option>`).join("")}</select></div><div class="athlete-directory" data-athlete-directory>${accessibleAthletes.length ? accessibleAthletes.map(renderAthleteCard).join("") : `<p class="sports-empty-line">No athletes available for your current role assignments.</p>`}</div></section>`;
};
const renderAthleteCard = athlete => `<article class="athlete-row" data-athlete-name="${escapeHtml((athlete.displayName || "").toLowerCase())}" data-athlete-sport="${escapeHtml(athlete.sport || "")}" data-athlete-team="${escapeHtml(athlete.currentTeam || athlete.academy || "")}" data-athlete-status="${escapeHtml(athlete.status || "active")}"><div><strong>${escapeHtml(athlete.displayName || `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim() || athlete.id)}</strong><span>${escapeHtml(ageFromDob(athlete.dateOfBirth))} / ${escapeHtml(athlete.sport || "Sport not set")} / ${escapeHtml(athlete.primaryPosition || "Position not set")}</span></div><div><span>${escapeHtml(athlete.currentTeam || athlete.academy || "Team not set")}</span><span>${escapeHtml(athlete.country || "Country not set")} / ${escapeHtml(athlete.currentLevel || "Level not set")}</span></div><a href="/sports-admin/athletes/profile/?id=${encodeURIComponent(athlete.id)}">Open profile</a></article>`;
const renderAthleteCreateForm = () => `<details class="sports-create-panel"><summary>Create athlete</summary><form data-athlete-create-form class="athlete-create-form"><h3>Personal</h3><label>First name<input name="firstName" required maxlength="80"></label><label>Last name<input name="lastName" required maxlength="80"></label><label>Display name<input name="displayName" maxlength="140"></label><label>Date of birth<input name="dateOfBirth" type="date" required></label><label>Gender<select name="gender"><option value="">Prefer not to say</option><option>female</option><option>male</option><option>non-binary</option><option>self-described</option></select></label><label>Country<input name="country" maxlength="80"></label><label>City / region<input name="city" maxlength="120"></label><label>Profile photo URL<input name="profilePhoto" type="url" maxlength="500"></label><label>Status<select name="status"><option value="active">Active</option><option value="inactive">Inactive</option></select></label><h3>Sport</h3><label>Sport<input name="sport" required maxlength="80"></label><label>Primary position<input name="primaryPosition" maxlength="80"></label><label>Secondary position<input name="secondaryPosition" maxlength="80"></label><label>Current level<select name="currentLevel">${sportLevels.map(v => `<option value="${v}">${v}</option>`).join("")}</select></label><label>Current team / academy<input name="currentTeam" maxlength="140"></label><label>Dominant foot / hand<input name="dominantSide" maxlength="80"></label><label>Squad number<input name="squadNumber" type="number" min="0" max="999"></label><label class="full">Playing experience<textarea name="playingExperience" maxlength="1200"></textarea></label><label class="full">Athlete goals<textarea name="athleteGoals" maxlength="1200"></textarea></label><button class="sports-button" type="submit">Create athlete</button></form></details>`;

const formValue = (form, name, max = 400) => clean(new FormData(form).get(name), max);
const createAthlete = async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const firstName = formValue(form, "firstName", 80);
  const lastName = formValue(form, "lastName", 80);
  if (!firstName || !lastName || !formValue(form, "dateOfBirth", 20) || !formValue(form, "sport", 80)) return setMessage("First name, last name, date of birth and sport are required.", "error");
  const athleteId = `${slugId(`${firstName}-${lastName}`)}-${Date.now().toString(36)}`;
  const payload = {
    firstName, lastName,
    displayName: formValue(form, "displayName", 140) || `${firstName} ${lastName}`,
    dateOfBirth: formValue(form, "dateOfBirth", 20), gender: formValue(form, "gender", 40), country: formValue(form, "country", 80), city: formValue(form, "city", 120), profilePhoto: formValue(form, "profilePhoto", 500), status: formValue(form, "status", 20) || "active",
    sport: formValue(form, "sport", 80), primaryPosition: formValue(form, "primaryPosition", 80), secondaryPositions: [formValue(form, "secondaryPosition", 80)].filter(Boolean), currentLevel: formValue(form, "currentLevel", 80), currentTeam: formValue(form, "currentTeam", 140), academy: formValue(form, "currentTeam", 140), dominantSide: formValue(form, "dominantSide", 80), squadNumber: Number(new FormData(form).get("squadNumber")) || null, playingExperience: formValue(form, "playingExperience", 1200), athleteGoals: formValue(form, "athleteGoals", 1200), createdBy: auth.currentUser.uid, joinedAt: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  };
  await setDoc(doc(db, "athletes", athleteId), payload);
  setMessage("Athlete created.", "success");
  accessibleAthletes = await loadAccessibleAthletes(currentUserProfile);
  await renderRoute();
};

const bindDirectory = () => {
  document.querySelector("[data-athlete-create-form]")?.addEventListener("submit", event => createAthlete(event).catch(error => handleError(error, "Unable to create athlete.")));
  const filters = ["[data-athlete-search]", "[data-athlete-sport]", "[data-athlete-team]", "[data-athlete-status]"].map(sel => document.querySelector(sel));
  const apply = () => {
    const [search, sport, team, status] = filters.map(input => (input?.value || "").trim().toLowerCase());
    document.querySelectorAll("[data-athlete-name]").forEach(row => {
      row.hidden = Boolean((search && !row.dataset.athleteName.includes(search)) || (sport && row.dataset.athleteSport.toLowerCase() !== sport) || (team && row.dataset.athleteTeam.toLowerCase() !== team) || (status && row.dataset.athleteStatus.toLowerCase() !== status));
    });
  };
  filters.forEach(input => input?.addEventListener("input", apply));
  filters.forEach(input => input?.addEventListener("change", apply));
};

const renderAthleteProfile = async () => {
  const athleteId = getParam("id") || getParam("athlete") || accessibleAthletes[0]?.id;
  const athlete = accessibleAthletes.find(item => item.id === athleteId) || accessibleAthletes[0];
  if (!athlete) { mount.innerHTML = `<section class="sports-empty"><h1>Athlete profile</h1><p>No accessible athlete selected.</p></section>`; return; }
  const data = await loadProfileData(athlete.id);
  mount.innerHTML = `<section class="athlete-profile-header"><img src="${escapeHtml(athlete.profilePhoto || "")}" alt="" onerror="this.hidden=true"><div><p class="eyebrow">Central development profile</p><h1>${escapeHtml(athlete.displayName || athlete.id)}</h1><p>${escapeHtml(athlete.sport || "Sport not set")} / ${escapeHtml(athlete.primaryPosition || "Position not set")} / ${escapeHtml(athlete.currentTeam || "Team not set")}</p></div><dl><div><dt>Age</dt><dd>${escapeHtml(ageFromDob(athlete.dateOfBirth))}</dd></div><div><dt>Country</dt><dd>${escapeHtml(athlete.country || "Not set")}</dd></div><div><dt>Level</dt><dd>${escapeHtml(athlete.currentLevel || "Not set")}</dd></div><div><dt>Status</dt><dd>${escapeHtml(athlete.status || "active")}</dd></div></dl></section><nav class="athlete-profile-nav">${profileSections.map((s,i) => `<button type="button" data-profile-section="${s}" class="${i===0 ? "is-active" : ""}">${s.replaceAll("-", " ")}</button>`).join("")}</nav><section class="athlete-profile-sections">${renderProfileSections(athlete, data)}</section>`;
  bindProfileForms(athlete.id);
};
const empty = text => `<p class="sports-empty-line">${text}</p>`;
const renderItems = (items, fields) => items.length ? items.map(item => `<article>${fields.map(f => `<p><strong>${f[0]}</strong><br>${escapeHtml(item[f[1]] || "-")}</p>`).join("")}</article>`).join("") : empty("No records yet.");
const recordForm = (type, title, fields) => currentUserProfile.role === "admin" ? `<form class="record-form" data-record-form="${type}"><h3>${title}</h3>${fields.map(f => f[2] === "textarea" ? `<label>${f[0]}<textarea name="${f[1]}" maxlength="1400"></textarea></label>` : `<label>${f[0]}<input name="${f[1]}" type="${f[2] || "text"}" maxlength="300"></label>`).join("")}<button class="sports-button" type="submit">Add record</button></form>` : "";
const renderProfileSections = (athlete, data) => `<div data-section-panel="overview" class="is-active"><div class="overview-grid">${["current development status","current goals","latest review","upcoming review","physical status","wellbeing status","nutrition status","recent activity","assigned coach","assigned manager","guardian"].map(label => `<article><span>${label}</span><p>${label === "current goals" ? escapeHtml(athlete.athleteGoals || "No goals recorded yet.") : "No data yet."}</p></article>`).join("")}</div></div><div data-section-panel="sport">${recordForm("athleteDevelopmentRecords","Sport & performance",[["Strengths","strengths","textarea"],["Development areas","developmentAreas","textarea"],["Technical goals","technicalGoals","textarea"],["Tactical goals","tacticalGoals","textarea"],["Training focus","trainingFocus","textarea"],["Coach observations","coachObservations","textarea"]])}<div class="record-list">${renderItems(data.development, [["Training focus","trainingFocus"],["Coach observations","coachObservations"]])}</div></div><div data-section-panel="physical">${recordForm("athletePhysicalRecords","Physical development",[["Height","height"],["Weight","weight"],["Fitness observations","fitnessObservations","textarea"],["Strength","strength"],["Speed","speed"],["Endurance","endurance"],["Mobility","mobility"],["Recovery","recovery"],["Sleep","sleep"],["Injury status","injuryStatus"],["Injury/recovery notes","injuryNotes","textarea"]])}<div class="record-list">${renderItems(data.physical, [["Fitness","fitnessObservations"],["Recovery","recovery"],["Injury status","injuryStatus"]])}</div></div><div data-section-panel="nutrition">${recordForm("athleteNutritionRecords","Nutrition",[["Nutrition goals","nutritionGoals","textarea"],["Hydration","hydration"],["Meal habits","mealHabits","textarea"],["Dietary requirements","dietaryRequirements","textarea"],["General notes","nutritionNotes","textarea"]])}<div class="record-list">${renderItems(data.nutrition, [["Goals","nutritionGoals"],["Hydration","hydration"]])}</div></div><div data-section-panel="wellbeing">${recordForm("athleteWellbeingCheckins","Mental wellbeing check-in",[["Wellbeing check-in","wellbeingCheckin"],["Stress level","stressLevel"],["Confidence","confidence"],["Motivation","motivation"],["General mood","generalMood"],["Athlete comments","athleteComments","textarea"],["Support notes","supportNotes","textarea"]])}<div class="record-list">${renderItems(data.wellbeing, [["Mood","generalMood"],["Confidence","confidence"],["Support notes","supportNotes"]])}</div></div><div data-section-panel="goals">${recordForm("athleteGoals","Mindset & goals",[["Title","title"],["Description","description","textarea"],["Category","category"],["Target date","targetDate","date"],["Status","status"],["Progress","progress"]])}<div class="record-list">${renderItems(data.goals, [["Title","title"],["Category","category"],["Status","status"],["Progress","progress"]])}</div></div><div data-section-panel="personal">${recordForm("athletePersonalDevelopmentRecords","Personal / spiritual development",[["Personal values","personalValues","textarea"],["Discipline","discipline","textarea"],["Resilience","resilience","textarea"],["Purpose","purpose","textarea"],["Reflection","reflection","textarea"],["Community","community","textarea"],["Optional spirituality/faith notes","spiritualityNotes","textarea"]])}<div class="record-list">${renderItems(data.personal, [["Values","personalValues"],["Purpose","purpose"],["Reflection","reflection"]])}</div></div><div data-section-panel="education">${recordForm("athleteEducationRecords","Education & life skills",[["Education status","educationStatus"],["Academic goals","academicGoals","textarea"],["Career interests","careerInterests","textarea"],["Communication skills","communicationSkills","textarea"],["Leadership","leadership","textarea"],["Financial literacy","financialLiteracy","textarea"],["Digital skills","digitalSkills","textarea"],["Employability","employability","textarea"],["Other life skills","otherLifeSkills","textarea"]])}<div class="record-list">${renderItems(data.education, [["Education status","educationStatus"],["Academic goals","academicGoals"],["Digital skills","digitalSkills"]])}</div></div><div data-section-panel="reviews">${recordForm("athleteReviews","Review",[["Review date","reviewDate","date"],["Review type","reviewType"],["Summary","summary","textarea"],["Achievements","achievements","textarea"],["Concerns","concerns","textarea"],["Next actions","nextActions","textarea"],["Next review date","nextReviewDate","date"]])}<div class="record-list">${renderItems(data.reviews, [["Review date","reviewDate"],["Summary","summary"],["Next actions","nextActions"]])}</div></div><div data-section-panel="notes">${recordForm("athleteNotes","Internal note",[["Category","category"],["Note","note","textarea"]])}<div class="record-list">${renderItems(data.notes, [["Category","category"],["Note","note"]])}</div></div><div data-section-panel="relationships"><div class="relationship-grid"><article><h3>Guardians</h3>${data.guardianLinks.length ? data.guardianLinks.map(l => `<p>${escapeHtml(l.guardianUid)} / ${escapeHtml(l.relationshipType || "guardian")}</p>`).join("") : empty("No guardians linked.")}</article><article><h3>Coaches</h3>${data.coachLinks.length ? data.coachLinks.map(l => `<p>${escapeHtml(l.coachUid)}</p>`).join("") : empty("No coaches assigned.")}</article><article><h3>Managers</h3>${data.managerLinks.length ? data.managerLinks.map(l => `<p>${escapeHtml(l.managerUid)}</p>`).join("") : empty("No managers assigned.")}</article></div>${currentUserProfile.role === "admin" ? `<form class="relationship-form" data-assignment-form><h3>Create assignment</h3><label>Type<select name="type"><option value="coach">Coach</option><option value="manager">Manager</option></select></label><label>User UID<input name="uid" required></label><button class="sports-button" type="submit">Create assignment</button></form>` : ""}</div>`;
const bindProfileForms = athleteId => {
  document.querySelectorAll("[data-profile-section]").forEach(button => button.addEventListener("click", () => { document.querySelectorAll("[data-profile-section]").forEach(b => b.classList.toggle("is-active", b === button)); document.querySelectorAll("[data-section-panel]").forEach(panel => panel.classList.toggle("is-active", panel.dataset.sectionPanel === button.dataset.profileSection)); }));
  document.querySelectorAll("[data-record-form]").forEach(form => form.addEventListener("submit", event => addRecord(event, athleteId).catch(error => handleError(error, "Unable to add record."))));
  document.querySelector("[data-assignment-form]")?.addEventListener("submit", event => addAssignment(event, athleteId).catch(error => handleError(error, "Unable to create assignment.")));
};
const addRecord = async (event, athleteId) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  Object.keys(data).forEach(key => data[key] = clean(data[key], 1400));
  data.athleteId = athleteId; data.authorUid = auth.currentUser.uid; data.authorName = displayName(currentUserProfile); data.createdAt = serverTimestamp(); data.updatedAt = serverTimestamp();
  if (form.dataset.recordForm === "athleteReviews" && !data.reviewDate) data.reviewDate = new Date().toISOString().slice(0, 10);
  await addDoc(collection(db, form.dataset.recordForm), data);
  setMessage("Record added.", "success");
  await renderAthleteProfile();
};
const addAssignment = async (event, athleteId) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const uid = clean(data.get("uid"), 160); const type = data.get("type");
  const collectionName = type === "coach" ? "athleteCoachAssignments" : "athleteManagerAssignments";
  const uidField = type === "coach" ? "coachUid" : "managerUid";
  await setDoc(doc(db, collectionName, `${uid}_${athleteId}`), { athleteId, [uidField]: uid, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: auth.currentUser.uid });
  setMessage("Assignment created.", "success");
  await renderAthleteProfile();
};

const renderSafeguarding = async () => {
  if (!adminRoles.has(currentUserProfile.role)) { mount.innerHTML = `<section class="sports-empty"><h1>Safeguarding</h1><p>You do not have access to safeguarding reports.</p></section>`; return; }
  const reports = await getDocs(query(collection(db, "safeguardingReports"), where("status", "in", ["new", "open", "triage"]), orderBy("updatedAt", "desc"), limit(40)));
  mount.innerHTML = `<section class="sports-panel"><div class="sports-panel-head"><h1>Safeguarding reports</h1><span>${reports.size}</span></div>${reports.empty ? `<p class="sports-empty-line">No open safeguarding reports.</p>` : reports.docs.map(item => `<article class="athlete-row"><div><strong>${escapeHtml(item.data().category)}</strong><span>${escapeHtml(item.data().priority || "standard")}</span></div><span>${escapeHtml(item.data().status)}</span></article>`).join("")}</section>`;
};
const renderRoute = async () => {
  renderShellHeader();
  if (route === "login" || !currentUserProfile) return;
  if (route === "admin-athlete-profile" || route === "admin-athletes") route === "admin-athlete-profile" ? await renderAthleteProfile() : (mount.innerHTML = renderAthleteDirectory(), bindDirectory());
  else if (route === "admin-safeguarding") await renderSafeguarding();
  else if (managementRoles.has(currentUserProfile.role) || route.startsWith("admin")) { await renderManagementDashboard(); bindDirectory(); }
  else renderAthleteDashboard();
};

loginForm?.addEventListener("submit", async event => { event.preventDefault(); if (!configuredGuard()) return; const submit = loginForm.querySelector("button[type='submit']"); submit.disabled = true; setMessage("Signing in..."); try { const data = new FormData(loginForm); await signInWithEmailAndPassword(auth, data.get("email"), data.get("password")); } catch (error) { handleError(error); } finally { submit.disabled = false; } });
resetButton?.addEventListener("click", async () => { if (!configuredGuard()) return; const email = loginForm?.elements.email.value; if (!email) return setMessage("Enter your email first.", "error"); try { await sendPasswordResetEmail(auth, email); setMessage("Password reset email sent if the account exists.", "success"); } catch (error) { handleError(error, "Unable to send password reset email."); } });
signOutButton?.addEventListener("click", () => signOut(auth));
const init = () => { if (!configuredGuard()) return; onAuthStateChanged(auth, async user => { try { if (!user) { currentUserProfile = null; currentAthlete = null; accessibleAthletes = []; if (route !== "login") window.location.href = "/sports-platform/login/"; return; } currentUserProfile = await getUserProfile(user); if (!currentUserProfile || currentUserProfile.active !== true || !roles.includes(currentUserProfile.role)) { await signOut(auth); setMessage("This account is not active for the NXT Gen Sports Platform.", "error"); return; } currentAthlete = await getOwnedAthlete(currentUserProfile); accessibleAthletes = await loadAccessibleAthletes(currentUserProfile); if (route === "login") { window.location.href = managementRoles.has(currentUserProfile.role) ? "/sports-admin/" : "/sports-platform/"; return; } await renderRoute(); } catch (error) { handleError(error); } }); };
init();