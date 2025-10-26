let currentUser = { type: null, id: null };
let adminLogged = false;

// Storage helpers
function getAllContestsDB() {
  let data = localStorage.getItem("allContestsDB");
  if (!data) return {};
  try { return JSON.parse(data); } catch { return {}; }
}
function setAllContestsDB(db) {
  localStorage.setItem("allContestsDB", JSON.stringify(db));
}
function getAdminsDB() {
  let data = localStorage.getItem("adminsDB");
  if (!data) return {};
  try { return JSON.parse(data); } catch { return {}; }
}
function setAdminsDB(db) {
  localStorage.setItem("adminsDB", JSON.stringify(db));
}
function getPwdDB(key) {
  let data = localStorage.getItem(key + "_pwds");
  if (!data) return {};
  try { return JSON.parse(data); } catch { return {}; }
}
function setPwdDB(key, db) {
  localStorage.setItem(key + "_pwds", JSON.stringify(db));
}
function showPage(pageId) {
  [
    "homeSection",
    "loginSection",
    "adminContestSection",
    "voteSection",
    "adminResultSection",
    "helpSection",
    "aboutSection"
  ].forEach(x => document.getElementById(x).classList.add('hide'));
  document.getElementById(pageId).classList.remove('hide');
  document.getElementById('navLogout').classList.add('hide');
  if (["voteSection", "adminContestSection", "adminResultSection"].includes(pageId))
    document.getElementById('navLogout').classList.remove('hide');
  if (pageId === "adminContestSection") showUserTable();
}
showPage("homeSection");
function parseRollList(str) {
  return Array.from(new Set(
    str.replace(/[\n\r\t]/g, " ")
      .split(/[ ,]+/g)
      .map(x => x.trim().toUpperCase())
      .filter(x => x.length > 0)
  ));
}
// Admin login
function adminLogin() {
  let user = document.getElementById("adminUserEntry").value.trim();
  let pass = document.getElementById("adminPwdEntry").value.trim();
  let admins = getAdminsDB();
  if (admins[user]) {
    if (admins[user] === pass) {
      adminLogged = true;
      currentUser = { type: "admin", id: user };
      sessionStorage.setItem("activeAdmin", user);
      document.getElementById("adminLoginBox").classList.add("hide");
      document.getElementById("adminContestBox").classList.remove("hide");
      showAdminContests();
      showPastContests();
    } else {
      alert("Invalid password for this admin.");
    }
  } else {
    admins[user] = pass;
    setAdminsDB(admins);
    adminLogged = true;
    currentUser = { type: "admin", id: user };
    sessionStorage.setItem("activeAdmin", user);
    document.getElementById("adminLoginBox").classList.add("hide");
    document.getElementById("adminContestBox").classList.remove("hide");
    showAdminContests();
    showPastContests();
  }
}
function showAdminContests() {
  let contests = getAllContestsDB();
  let out = "<b>Your KK Evoting Contests:</b><br>";
  let adminId = sessionStorage.getItem("activeAdmin");
  if (contests[adminId]) {
    Object.keys(contests[adminId]).forEach((name) => {
      out += `<div>
        <b>${name}</b>
        <button onclick="loadAdminContest('${name}')">View/Edit</button>
      </div>`;
    });
  } else {
    out += "<div>No contests found. Create one!</div>";
  }
  document.getElementById("userTableBox").innerHTML = out;
}
function activateContest() {
  if (!adminLogged) { alert("Login as admin first."); return; }
  let name = document.getElementById("activeContestName").value.trim();
  let cands = document.getElementById("candidateNames").value.trim()
    .split(",").map(x => x.trim()).filter(x => x.length > 0);
  let rolls = parseRollList(document.getElementById("rollList").value);
  let startTime = document.getElementById("voteStartTime").value;
  let endTime = document.getElementById("voteEndTime").value;
  
  if(name.length < 1) { alert("Enter contest name."); return; }
  if(cands.length < 2) { alert("Please enter at least 2 candidates."); return; }
  if(rolls.length < 1) { alert("Please enter valid roll numbers."); return; }
  if(!startTime || !endTime){ alert("Please set both voting start and end time."); return; }
  if(new Date(startTime) >= new Date(endTime)){ alert("Start time must be before end time."); return; }

  let contest = {
    candidates: cands,
    isActive: true,
    voters: rolls,
    votes: Object.fromEntries(cands.map(c => [c, 0])),
    votedUsers: [],
    contestName: name,
    voteStartTime: startTime,
    voteEndTime: endTime
  };

  let contests = getAllContestsDB();
  let adminId = sessionStorage.getItem("activeAdmin");
  if (!contests[adminId]) contests[adminId] = {};
  contests[adminId][name] = contest;
  setAllContestsDB(contests);
  setPwdDB(name, {});
  sessionStorage.setItem("activeContestName", name);
  alert(`Contest "${name}" activated with voting from ${startTime} to ${endTime}.`);
  showAdminContests();
}
function loadAdminContest(name) {
  sessionStorage.setItem("activeContestName", name);
  let contests = getAllContestsDB();
  let adminId = sessionStorage.getItem("activeAdmin");
  let c = contests[adminId][name];
  document.getElementById("activeContestName").value = c.contestName;
  document.getElementById("candidateNames").value = c.candidates.join(", ");
  document.getElementById("rollList").value = c.voters.join("\n");
  document.getElementById("voteStartTime").value = c.voteStartTime;
  document.getElementById("voteEndTime").value = c.voteEndTime;
  showUserTable();
}
function showUserTable() {
  let adminId = sessionStorage.getItem("activeAdmin");
  let name = sessionStorage.getItem("activeContestName");
  let contests = getAllContestsDB();
  let c = contests[adminId]?.[name];
  let out = "";
  if (c && c.voters) {
    out += `<div class='note' style='margin:5px 0 8px 4px;'>Eligible Roll Numbers for "${name}":</div>`;
    out += "<table class='userListTbl'><tr><th>Voter ID</th></tr>";
    c.voters.forEach(r => { out += `<tr><td>${r}</td></tr>`; });
    out += `</table>`;
  }
  document.getElementById("userTableBox").innerHTML = out;
}
// Voter login
function voterLogin() {
  let contestName = document.getElementById("contestNameEntry").value.trim();
  let roll = document.getElementById("userRoll").value.trim().toUpperCase();
  let pwd = document.getElementById("userPwd").value;

  let contests = getAllContestsDB();
  let foundContest = null, foundAdmin = null;
  for(let admin in contests) {
    if(contests[admin][contestName]) {
      foundContest = contests[admin][contestName];
      foundAdmin = admin;
      break;
    }
  }
  if(!foundContest) {
    alert("Contest not found.");
    return;
  }

  let now = new Date();
  if(now < new Date(foundContest.voteStartTime)){
    alert("Voting has not started yet for this contest.");
    return;
  }
  if(now > new Date(foundContest.voteEndTime)){
    alert("Voting has ended for this contest.");
    return;
  }

  let pwdDB = getPwdDB(contestName);
  if(!foundContest.voters.includes(roll)) { alert("Roll/Voter ID not eligible."); return; }

  if(!(roll in pwdDB)) {
    if(!pwd || pwd.length < 1) { alert("Choose any password."); return; }
    pwdDB[roll] = pwd; 
    setPwdDB(contestName, pwdDB);
    currentUser = {type:"voter", id:roll, contest:contestName, admin:foundAdmin};
    loadCandidateOptions(contestName, foundAdmin);
    showPage("voteSection");
    document.getElementById("userLabel").innerText = `Registered & logged in as: ${roll} (Contest: ${contestName})`;
    document.getElementById("voteMsg").innerText = "";
    document.getElementById("changePwdBtn").classList.remove('hide');
  } else {
    if(pwdDB[roll] !== pwd) {
      alert("Incorrect password.");
      return;
    }
    currentUser = {type:"voter", id:roll, contest:contestName, admin:foundAdmin};
    loadCandidateOptions(contestName, foundAdmin);
    showPage("voteSection");
    document.getElementById("userLabel").innerText = `Welcome: ${roll} (Contest: ${contestName})`;
    document.getElementById("voteMsg").innerText = "";
    document.getElementById("changePwdBtn").classList.remove('hide');
  }
  document.getElementById("pwdChangeArea").classList.add('hide');
}
function loadCandidateOptions(name, adminId) {
  let contests = getAllContestsDB();
  let c = contests[adminId][name];
  let sel = document.getElementById("candidateSelect");
  sel.innerHTML = '<option value="">-- Select Candidate --</option>';
  (c?.candidates || []).forEach(n => {
    let opt = document.createElement("option");
    opt.value = n; opt.textContent = n;
    sel.appendChild(opt);
  });
}
function castVote() {
  if (!currentUser || currentUser.type !== 'voter') { alert("Login first."); return; }
  let opt = document.getElementById("candidateSelect").value;
  let contests = getAllContestsDB();
  let c = contests[currentUser.admin][currentUser.contest];
  if (!c || !c.isActive) { alert("Contest ended."); return; }
  if (c.votedUsers.includes(currentUser.id)) {
    document.getElementById("voteMsg").innerText = "You have already voted!";
    document.getElementById("changePwdBtn").classList.add('hide');
    return;
  }
  if (!opt) { alert("Select a candidate!"); return; }
  c.votes[opt] = (c.votes[opt] || 0) + 1;
  c.votedUsers.push(currentUser.id);
  contests[currentUser.admin][currentUser.contest] = c;
  setAllContestsDB(contests);
  document.getElementById("voteMsg").innerText = "✅ Vote recorded. Thank you!";
  document.getElementById("changePwdBtn").classList.add('hide');
}
function showPwdChange() {
  let c = getAllContestsDB()[currentUser.admin][currentUser.contest];
  let pwdDB = getPwdDB(currentUser.contest);
  if (!currentUser || !c || !c.isActive) return;
  if (c.votedUsers.includes(currentUser.id)) {
    document.getElementById("pwdChangeArea").innerHTML = "<div class='note'>Already voted; password cannot be changed.</div>";
    document.getElementById("pwdChangeArea").classList.remove('hide'); return;
  }
  document.getElementById("pwdChangeArea").innerHTML =
    "<h3>Change Password</h3>" +
    "<input id='newPwdBox' placeholder='New Password' type='password'/><br>" +
    "<button onclick='doChangePwd()'>Submit New Password</button>" +
    "<div style='margin-top:7px;font-size:14px;'>Password should be at least 1 character.</div>";
  document.getElementById("pwdChangeArea").classList.remove('hide');
}
function doChangePwd() {
  let newPwd = document.getElementById("newPwdBox").value;
  if (!newPwd || newPwd.length < 1) { alert("Password must be at least 1 character."); return; }
  let pwdDB = getPwdDB(currentUser.contest);
  pwdDB[currentUser.id] = newPwd;
  setPwdDB(currentUser.contest, pwdDB);
  alert("Password updated.");
  document.getElementById("pwdChangeArea").classList.add('hide');
}
function showResultsIfAdmin() {
  if (!adminLogged) return;
  renderChart();
  showPage("adminResultSection");
}
function renderChart() {
  let name = sessionStorage.getItem("activeContestName");
  let adminId = sessionStorage.getItem("activeAdmin");
  let contests = getAllContestsDB();
  let c = contests[adminId][name];
  let data = (c?.candidates || []).map(n => c.votes[n] || 0);
  let ctx = document.getElementById("resultChart").getContext("2d");
  ctx.clearRect(0, 0, 700, 300);
  if (window.resultPie) window.resultPie.destroy();
  window.resultPie = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: (c?.candidates || []),
      datasets: [{
        data,
        backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#f8b400', '#e83e8c', '#343a40', '#20c997']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" }, title: { display: false } }
    }
  });
  showVoteSummary();
  showPastResults();
}
function endContest() {
  if (!adminLogged) return;
  let name = sessionStorage.getItem("activeContestName");
  let adminId = sessionStorage.getItem("activeAdmin");
  let contests = getAllContestsDB();
  if (!contests[adminId]?.[name]) return;
  if (!confirm("End & finish the contest? This will save votes and disable voting.")) return;
  contests[adminId][name].isActive = false;
  setAllContestsDB(contests);
  showPastContests();
  showPage("adminContestSection");
}
function showPastContests() {
  let contests = getAllContestsDB();
  let out = "<h3>Past/Completed Contests:</h3>";
  let adminId = sessionStorage.getItem("activeAdmin");
  if (contests[adminId]) {
    Object.keys(contests[adminId]).forEach(name => {
      let c = contests[adminId][name];
      if (!c.isActive) {
        out += `<div>
          <b>${name}</b> <button onclick="showPastResult('${name}')">View Results</button>
        </div>`;
      }
    });
    if (out.indexOf("button") === -1) { out += "<div>No completed contests yet.</div>"; }
  }
  document.getElementById("pastContests").innerHTML = out;
}
function showPastResult(name) {
  let adminId = sessionStorage.getItem("activeAdmin");
  let contests = getAllContestsDB();
  let c = contests[adminId][name];
  let voteData = Object.entries(c.votes)
    .map(([cand, count]) => `<tr><td>${cand}</td><td>${count}</td></tr>`)
    .join('');
  let out = `<h3>Results: ${name}</h3>
    <table style="width:100%;border-collapse:collapse;"><tr><th>Candidate</th><th>Votes</th></tr>${voteData}</table>`;
  document.getElementById("pastContests").innerHTML = out;
}
function showVoteSummary() {
  let name = sessionStorage.getItem("activeContestName");
  let adminId = sessionStorage.getItem("activeAdmin");
  if (!adminId || !name) { document.getElementById("voteSummary").innerHTML = ''; return; }
  let contests = getAllContestsDB();
  let c = contests[adminId][name];
  let voteData = Object.entries(c.votes)
    .map(([cand, count]) => `<tr><td>${cand}</td><td>${count}</td></tr>`)
    .join('');
  let out = `<table style="width:100%;border-collapse:collapse;"><tr><th>Candidate</th><th>Votes</th></tr>${voteData}</table>`;
  document.getElementById("voteSummary").innerHTML = out;
}
function showPastResults() {
  let contests = getAllContestsDB();
  let adminId = sessionStorage.getItem("activeAdmin");
  let out = "<b>Past Contest Results:</b>";
  if (contests[adminId]) {
    Object.keys(contests[adminId]).forEach(name => {
      let c = contests[adminId][name];
      if (!c.isActive && c.votes) {
        let voteData = Object.entries(c.votes)
          .map(([cand, count]) => `<tr><td>${cand}</td><td>${count}</td></tr>`)
          .join('');
        out += `<div><b>${name}</b>
          <table style="width:100%;border-collapse:collapse;"><tr><th>Candidate</th><th>Votes</th></tr>${voteData}</table></div>`;
      }
    });
  }
  document.getElementById("pastResults").innerHTML = out;
}
function logout() {
  currentUser = { type: null, id: null };
  adminLogged = false;
  sessionStorage.removeItem("activeAdmin");
  sessionStorage.removeItem("activeContestName");
  document.getElementById("adminLoginBox").classList.remove("hide");
  document.getElementById("adminContestBox").classList.add("hide");
  showPage("homeSection");
}
