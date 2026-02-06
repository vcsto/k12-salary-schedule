// ==============================
// script.js (FULL REPLACEMENT)
// ==============================

let allDistricts = [];

fetch("districts.json")
  .then(res => res.json())
  .then(data => {
    allDistricts = data;
  })
  .catch(err => {
    console.error("Error loading districts.json", err);
  });

const states = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];

// 🔐 Hidden “Victor mode” district option
const VICTOR_DISTRICT = {
  id: "mn_avg_salaries",
  name: "MN AVG Salaries",
  state: "Minnesota",
  isVictor: true
};

const stateInput       = document.getElementById("state-input");
const stateDropdown    = document.getElementById("state-dropdown");
const districtInput    = document.getElementById("district-input");
const districtDropdown = document.getElementById("district-dropdown");
const goButton         = document.getElementById("go-btn");
const resultBox        = document.getElementById("result");

let selectedState = "";
let selectedDistrict = null;

// Victor mode flag (true only when state input is exactly "Victor")
function isVictorMode() {
  return stateInput.value.trim().toLowerCase() === "victor";
}

function syncInputHighlight() {
  stateInput.classList.toggle("input-selected", !!selectedState);
  districtInput.classList.toggle("input-selected", !!selectedDistrict);
}

function updateGoButtonState() {
  const ready = !!(selectedState && selectedDistrict);
  if (ready) {
    goButton.disabled = false;
    goButton.classList.add("enabled");
  } else {
    goButton.disabled = true;
    goButton.classList.remove("enabled");
  }
}

goButton.disabled = true;
goButton.classList.remove("enabled");
syncInputHighlight();

// ------------------------------
// STATE INPUT DROPDOWN
// ------------------------------
stateInput.addEventListener("input", () => {
  const raw = stateInput.value.trim();
  const value = raw.toLowerCase();
  stateDropdown.innerHTML = "";

  // Reset selections whenever state changes
  selectedState = "";
  selectedDistrict = null;
  districtInput.value = "";
  districtDropdown.style.display = "none";

  syncInputHighlight();
  updateGoButtonState();

  // If empty, hide dropdown
  if (value === "") {
    stateDropdown.style.display = "none";
    return;
  }

  // 🔐 Victor mode: no autocomplete dropdown at all
  if (value === "victor") {
    selectedState = "Minnesota"; // internally set so district dropdown can work
    stateDropdown.style.display = "none";
    syncInputHighlight();
    updateGoButtonState();
    return;
  }

  // Normal behavior: autocomplete states
  const matches = states.filter(s => s.toLowerCase().startsWith(value));

  if (matches.length === 0) {
    stateDropdown.style.display = "none";
    return;
  }

  stateDropdown.style.display = "block";

  matches.forEach(state => {
    const item = document.createElement("div");
    item.className = "dropdown-item";
    item.textContent = state;
    item.onclick = () => selectState(state);
    stateDropdown.appendChild(item);
  });
});

function selectState(state) {
  selectedState = state;
  stateInput.value = state;
  stateDropdown.style.display = "none";

  districtInput.value = "";
  selectedDistrict = null;
  districtDropdown.style.display = "none";

  if (resultBox) resultBox.textContent = "";

  syncInputHighlight();
  updateGoButtonState();
}

stateInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();

    // If dropdown is open, select the first state
    if (stateDropdown.style.display === "block") {
      const first = stateDropdown.querySelector(".dropdown-item");
      if (first) {
        selectState(first.textContent);
        districtInput.focus();
      }
    }
  }
});

document.addEventListener("click", e => {
  if (!stateDropdown.contains(e.target) && e.target !== stateInput) {
    stateDropdown.style.display = "none";
  }
});

// ------------------------------
// DISTRICT DROPDOWN
// ------------------------------
function buildDistrictDropdown(filterText = "") {
  // If in Victor mode, show ONLY the special option
  if (isVictorMode()) {
    const lower = filterText.toLowerCase();
    if (lower && !VICTOR_DISTRICT.name.toLowerCase().includes(lower)) {
      districtDropdown.style.display = "none";
      return;
    }

    districtDropdown.innerHTML = "";
    districtDropdown.style.display = "block";

    const item = document.createElement("div");
    item.className = "dropdown-item";
    item.textContent = VICTOR_DISTRICT.name;
    item.dataset.id = VICTOR_DISTRICT.id;
    item.onclick = () => selectDistrict(VICTOR_DISTRICT);

    districtDropdown.appendChild(item);
    return;
  }

  // Normal behavior requires a selectedState
  if (!selectedState) {
    districtDropdown.style.display = "none";
    return;
  }

  const stateDistricts = allDistricts.filter(d => d.state === selectedState);

  if (!stateDistricts.length) {
    districtDropdown.style.display = "none";
    return;
  }

  const lower = filterText.toLowerCase();
  const matches = stateDistricts.filter(d => d.name.toLowerCase().includes(lower));

  if (!matches.length) {
    districtDropdown.style.display = "none";
    return;
  }

  // Alphabetize A → Z
  matches.sort((a, b) => a.name.localeCompare(b.name));

  districtDropdown.innerHTML = "";
  districtDropdown.style.display = "block";

  matches.forEach(d => {
    const item = document.createElement("div");
    item.className = "dropdown-item";
    item.textContent = d.name;
    item.dataset.id = d.id;
    item.onclick = () => selectDistrict(d);
    districtDropdown.appendChild(item);
  });
}

districtInput.addEventListener("focus", () => {
  buildDistrictDropdown("");
});

districtInput.addEventListener("input", () => {
  const value = districtInput.value.trim();

  selectedDistrict = null;
  buildDistrictDropdown(value);

  syncInputHighlight();
  updateGoButtonState();
});

function selectDistrict(districtObj) {
  selectedDistrict = districtObj;
  districtInput.value = districtObj.name;
  districtDropdown.style.display = "none";

  if (resultBox) resultBox.textContent = "";

  syncInputHighlight();
  updateGoButtonState();
}

districtInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();

    // If dropdown is open, select the first item
    if (districtDropdown.style.display === "block") {
      const first = districtDropdown.querySelector(".dropdown-item");
      if (!first) return;

      // Victor option case
      if (isVictorMode()) {
        selectDistrict(VICTOR_DISTRICT);
        return;
      }

      // Normal district case
      const id = first.dataset.id;
      const d = allDistricts.find(dist => dist.id === id);
      if (d) selectDistrict(d);
      return;
    }

    // If district already selected and Go button is ready, navigate
    if (selectedDistrict && !goButton.disabled) {
      goButton.click();
    }
  }
});

document.addEventListener("click", e => {
  if (!districtDropdown.contains(e.target) && e.target !== districtInput) {
    districtDropdown.style.display = "none";
  }
});

// ------------------------------
// GO BUTTON NAVIGATION
// ------------------------------
goButton.addEventListener("click", () => {
  if (!selectedDistrict) return;

  // 🔐 Victor shortcut: go to victor.html
  if (selectedDistrict.isVictor) {
    window.location.href = "MNavgSalaries.html";
    return;
  }

  // Normal district flow
  const url =
    `secondPage.html?districtId=${encodeURIComponent(selectedDistrict.id)}&district=${encodeURIComponent(selectedDistrict.name)}`;

  window.location.href = url;
});

// ------------------------------
// FEEDBACK / COMMENTS
// ------------------------------
const feedbackInput = document.getElementById("feedback-input");
const feedbackBtn = document.getElementById("feedback-btn");
const commentsList = document.getElementById("comments-list");

if (feedbackBtn && feedbackInput && commentsList) {
  feedbackBtn.addEventListener("click", () => {
    const text = feedbackInput.value.trim();
    if (!text) return;

    // Create new comment element
    const comment = document.createElement("div");
    comment.className = "comment";
    comment.innerHTML = `
      <div class="comment-header">
        <span class="comment-author">You</span>
        <span class="comment-time">Just now</span>
      </div>
      <p class="comment-text">${escapeHtml(text)}</p>
    `;

    // Add to top of list
    commentsList.insertBefore(comment, commentsList.firstChild);

    // Clear input
    feedbackInput.value = "";
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
