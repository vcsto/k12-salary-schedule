document.getElementById("back-btn").addEventListener("click", () => {
    window.location.href = "index.html";
  });
  
  const params = new URLSearchParams(window.location.search);
  const districtId = params.get("districtId") || params.get("districtid");
  const district = params.get("district");
  
  console.log("districtId from URL:", districtId);
  
  const mainTitle = document.querySelector(".title-main");
  const subTitle = document.querySelector(".title-sub");
  
  const chartCanvas = document.getElementById("earnings-chart");
  const chartContainer = document.getElementById("chart-container");
  const yearSlider = document.getElementById("year-slider");
  const yearSliderValue = document.getElementById("year-slider-value");
  
  const table = document.getElementById("salary-table");
  const tableWrapper = document.getElementById("table-wrapper");
  const buttonRow = document.getElementById("button-row");
  const calculator = document.getElementById("calculator");
  
  const yearInput = document.getElementById("calc-step");
  const creditInput = document.getElementById("calc-credits");
  const calcBtn = document.getElementById("calc-btn");
  const result = document.getElementById("calc-result");
  const degreeInputs = document.querySelectorAll("input[name='degree']");

  const calcStepLabel = document.querySelector("label[for='calc-step']");

  
  // Degree pills we conditionally show/hide
  const doctorateInput = document.getElementById("degree-doctorate");
  const doctorateLabel = document.querySelector("label[for='degree-doctorate']");
  
  const maedsInput = document.getElementById("degree-maeds");
  const maedsLabel = document.querySelector("label[for='degree-maeds']");
  
  const drspInput = document.getElementById("degree-drsp");
  const drspLabel = document.querySelector("label[for='degree-drsp']");
  
  setVisible(drspInput, false);
  setVisible(drspLabel, false);
  
  if (districtId === "mn_roseville_623") {
    setVisible(drspInput, true);
    setVisible(drspLabel, true);
  }
  
  const phdInput = document.getElementById("degree-phd");
  const phdLabel = document.querySelector("label[for='degree-phd']");

  const toggleA = document.getElementById("toggle-a");
const toggleB = document.getElementById("toggle-b");

const scheduleInfoA = document.getElementById("schedule-info");
const scheduleInfoB = document.getElementById("schedule-info-b");

function updateScheduleInfo() {
  if (toggleA.checked) {
    scheduleInfoA.classList.add("visible");
    scheduleInfoB.classList.remove("visible");
  } else if (toggleB.checked) {
    scheduleInfoA.classList.remove("visible");
    scheduleInfoB.classList.add("visible");
  }
}

// Initial state
updateScheduleInfo();

// Listen for changes
toggleA.addEventListener("change", updateScheduleInfo);
toggleB.addEventListener("change", updateScheduleInfo);



  
  function setVisible(el, visible) {
    if (!el) return;
    el.style.display = visible ? "" : "none";
  }
  
  // default: hide special options
  setVisible(doctorateInput, false);
  setVisible(doctorateLabel, false);
  setVisible(maedsInput, false);
  setVisible(maedsLabel, false);
  setVisible(phdInput, false);
  setVisible(phdLabel, false);
  
  // show only when needed
  if (districtId === "mi_walled_lake") {
    setVisible(doctorateInput, true);
    setVisible(doctorateLabel, true);
  }
  
  if (districtId === "ne_norfolk_590002") {
    setVisible(maedsInput, true);
    setVisible(maedsLabel, true);
    setVisible(phdInput, true);
    setVisible(phdLabel, true);
  }
  
  // Title split
  if (district && mainTitle && subTitle) {
    const words = district.split(" ");
    if (words.length > 3) {
      const mid = Math.ceil(words.length / 2);
      mainTitle.textContent = words.slice(0, mid).join(" ");
      subTitle.textContent = words.slice(mid).join(" ");
    } else {
      mainTitle.textContent = district;
      subTitle.textContent = "";
    }
  }
  
  function formatCurrency(n) {
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    });
  }
  
  const DEFAULT_LANES = [
    { key: "B", label: "B" },
    { key: "B24", label: "B+24" },
    { key: "M", label: "M" },
    { key: "M15", label: "M+15" },
    { key: "M30", label: "M+30" },
    { key: "M45", label: "M+45" },
    { key: "M60", label: "M+60" }
  ];
  
  let SCHEDULES = {};
  let activeScheduleKey = null;
  
  let currentStartYear = null; // (acts as "starting step index" for alpha schedules)
  let currentLanesForChart = [];
  let sliderAnimationId = null;
  
  let prevValues = null;
  let currentValues = null;
  let animFrame = null;
  let animStartTime = null;
  
  let barHitboxes = [];
  
  function getActiveSchedule() {
    return SCHEDULES[activeScheduleKey];
  }
  
  // ---------- NEW: support letter-based steps (A, B, C...) ----------
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  
  function isAlphaSchedule(schedule) {
    if (!schedule) return false;
    if (schedule.stepMode === "alpha" || schedule.stepInputType === "alpha") return true;
  
    const leftKey = schedule.leftKey || "step";
    const first = schedule?.rows?.[0]?.[leftKey];
  
    if (typeof first === "string") {
      const s = first.trim().toUpperCase();
      if (s && !/^\d+$/.test(s) && /^[A-Z]+$/.test(s)) return true;
    }
  
    return false;
  }
  
  function stepInputToIndex(rawInput) {
    const schedule = getActiveSchedule();
    const rows = schedule?.rows || [];
    const leftKey = schedule?.leftKey || "step";
  
    const s = String(rawInput || "").trim().toUpperCase();
    if (!s) return null;
  
    // If user typed a number, treat as 1-based index
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
  
    // Single letter -> A=1, B=2, ...
    if (/^[A-Z]$/.test(s)) {
      const idx = ALPHABET.indexOf(s);
      return idx >= 0 ? idx + 1 : null;
    }
  
    // If schedule uses multi-char codes (rare), match row values
    const idxInRows = rows.findIndex((r) => String(r?.[leftKey] ?? "").trim().toUpperCase() === s);
    if (idxInRows >= 0) return idxInRows + 1;
  
    return null;
  }
  
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  // ---------------------------------------------------------------
  
  function yearToStep(year) {
    const schedule = getActiveSchedule();
    if (!schedule) return 1;
  
    // NEW: alpha schedules use row order directly (step index)
    if (isAlphaSchedule(schedule)) {
      const rowsLen = schedule.rows?.length || 1;
      const idx = clamp(Number(year) || 1, 1, rowsLen);
      return idx;
    }
  
    const ranges = schedule.yearRanges || [];
    for (let i = 0; i < ranges.length; i++) {
      const label = ranges[i];
  
      if (label.includes("-")) {
        const [a, b] = label.split("-");
        const start = parseInt(a, 10);
        const end = parseInt(b, 10);
        if (year >= start && year <= end) return i + 1;
      } else {
        const single = parseInt(label, 10);
        if (year === single) return i + 1;
      }
    }
  
    return ranges.length || 1;
  }
  
  function getSalaryForYearAndLane(year, laneKey) {
  const schedule = getActiveSchedule();
  if (!schedule) return 0;

  const stepNum = yearToStep(year);
  const index = Math.min(stepNum - 1, (schedule.rows?.length || 1) - 1);
  const rows = schedule.rows || [];

  // Walk backward from the requested row until we find a real number.
  // If the lane has never had a number yet, return 0.
  for (let i = index; i >= 0; i--) {
    const v = rows[i]?.[laneKey];

    if (v === null || v === undefined || v === "") continue;

    const num = Number(v);
    if (Number.isFinite(num)) return num;
  }

  return 0;
}

  
  function sumForLane(startYear, numYears, laneKey) {
    let total = 0;
    for (let i = 0; i < numYears; i++) {
      total += getSalaryForYearAndLane(startYear + i, laneKey);
    }
    return total;
  }
  
  function getUserLaneKey(degree, credits) {
    const c = Number(credits) || 0;
  
    if (districtId === "ne_norfolk_590002") {
      if (degree === "phd") return "PHD";
      if (degree === "maeds") return "MA+MA/EDS";
  
      if (degree === "bachelors") {
        if (c >= 27) return "BA+27";
        if (c >= 18) return "BA+18";
        if (c >= 9) return "BA+9";
        return "BA";
      }
  
      if (degree === "masters") {
        if (c >= 45) return "MA+45";
        if (c >= 36) return "MA+36";
        if (c >= 27) return "MA+27";
        if (c >= 18) return "MA+18";
        if (c >= 9) return "MA+9";
        return "MA";
      }
  
      return "BA";
    }
  
    if (districtId === "mi_walled_lake") {
      if (degree === "bachelors") return "BA";
      if (degree === "masters") return c < 30 ? "MA" : "MA30";
      if (degree === "doctorate") return "PHD";
      return "BA";
    }
  
    if (districtId === "mn_roseville_623") {
      if (degree === "bachelors") {
        if (c >= 60) return "BA45";
        if (c >= 45) return "BA30";
        if (c >= 30) return "BA15";
        if (c >= 15) return "BA00";
        return "BA60";
      }
  
      if (degree === "masters") {
        if (c >= 60) return "MA45";
        if (c >= 45) return "MA30";
        if (c >= 30) return "MA15";
        if (c >= 15) return "MA00";
        return "MA60";
      }
    }
  
    // default PA mapping
    if (degree === "bachelors") {
      return c < 24 ? "B" : "B24";
    }
  
    if (degree === "masters") {
      if (c < 15) return "M";
      if (c < 30) return "M15";
      if (c < 45) return "M30";
      if (c < 60) return "M45";
      return "M60";
    }
  
    return "B";
  }
  
  async function loadSchedulesAndInit() {
    const id = districtId || "pa_south_western";
  
    try {
      const state = id.split("_")[0];   // "mn"
      const res = await fetch(`schedules/${state}/${id}.json`);

      if (!res.ok) {
        console.error("Failed to load schedules JSON for", id, res.status);
        return;
      }
  
      const data = await res.json();
      SCHEDULES = data.schedules || {};
  
      const keys = Object.keys(SCHEDULES);
      if (!keys.length) return;
  
      activeScheduleKey = keys[0];
  
      initDistrictUI();
    } catch (err) {
      console.error("Error loading schedules JSON:", err);
    }
  }

  function updateCalcStepLabel(hideYearsColumn) {
    if (!calcStepLabel) return;
  
    calcStepLabel.textContent = hideYearsColumn
      ? "What step are you at?"
      : "What year are you at?";
  }
  
  
  function initDistrictUI() {
    if (!buttonRow || !tableWrapper || !calculator) return;
  
    const keys = Object.keys(SCHEDULES);
    if (!keys.length) return;
  
    buttonRow.innerHTML = "";
  
    const hasMultipleSchedules = keys.length > 1;
  
    if (hasMultipleSchedules) {
      keys.forEach((key, index) => {
        const schedule = SCHEDULES[key];
  
        const btn = document.createElement("button");
        btn.className = "year-btn";
        btn.dataset.key = key;
        btn.textContent = schedule.buttonText || key;
  
        if (index === 0) btn.classList.add("active");
  
        btn.addEventListener("click", () => {
          const all = buttonRow.querySelectorAll("button");
          all.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
  
          activeScheduleKey = key;
  
          buildTable(table, activeScheduleKey);
  
          result.innerHTML = "";
          result.classList.remove("visible");
          chartContainer.classList.remove("visible");
          currentStartYear = null;
          currentLanesForChart = [];
          prevValues = null;
          currentValues = null;
  
          // NEW: re-validate calculator (alpha schedules change rules)
          validateCalculator();
        });
  
        buttonRow.appendChild(btn);
      });
  
      buttonRow.style.display = "flex";
    } else {
      buttonRow.style.display = "none";
      activeScheduleKey = keys[0];
    }
  
    tableWrapper.style.display = "flex";
    calculator.style.display = "block";
  
    buildTable(table, activeScheduleKey);
  
    requestAnimationFrame(() => {
      tableWrapper.classList.add("visible");
      calculator.classList.add("visible");
    });
  
    // NEW: validate once schedules are known
    validateCalculator();
  }
  
  function buildTable(tableElement, scheduleKey) {
    const schedule = SCHEDULES[scheduleKey];
    if (!schedule) return;
  
    const rows = schedule.rows || [];
    const lanes =
      schedule.lanes && schedule.lanes.length ? schedule.lanes : DEFAULT_LANES;
  
      const hideYearsColumn =
      districtId === "ne_norfolk_590002" ||
      districtId === "mn_roseville_623" ||
      districtId === "mn_annadale_876" ||
      districtId === "mn_bloomington_271" ||
      districtId === "mn_anokahennepin_11" ||
      districtId === "mn_easterncarver_112" ||
      districtId === "mn_osseo_279" ||
      districtId === "mn_becker_726" ||
      districtId === "mn_belleplain_716" ||
      districtId === "mn_bemidji_31" ||
      districtId === "mn_biglake_727" ||
      districtId === "mn_brainerd_181" || 
      districtId === "mn_brooklyncenter_266" || 
      districtId === "mn_byron_531" || 
      districtId === "mn_caledonia_299" ||
      districtId === "mn_central_108" || 
      districtId === "mn_columbiaheights_13" || 
      districtId === "mn_delano_879" || 
      districtId === "mn_eastgrandforks_595" || 
      districtId === "wi_milton" ||
      districtId === "mn_fergusfalls_544" ||  
      districtId === "mn_forestlake_831" || 
      districtId === "mn_fridley_14" || 
      districtId === "mn_glencoesilverlake_2859" || 
      districtId === "mn_hastings_200" || 
      districtId === "mn_hawley_150" || 
      districtId === "mn_hopkins_270" ||
      districtId === "mn_rockridge_2909" ||
      districtId === "mn_chisago_2144";

    
    updateCalcStepLabel(hideYearsColumn);
    
  
    // allow custom left column (ex: Performance Increment)
    const leftLabel = schedule.leftLabel || "Step";
    const leftKey = schedule.leftKey || "step";
  
    const cols = (hideYearsColumn ? 1 : 2) + lanes.length;
  
    tableElement.innerHTML = "";
  
    const colGroup = document.createElement("colgroup");
    colGroup.innerHTML =
      `<col class="col-step">` +
      (hideYearsColumn ? "" : `<col class="col-years">`) +
      lanes.map(() => `<col class="col-salary">`).join("");
    tableElement.appendChild(colGroup);
  
    const headerRow = document.createElement("tr");
    const headerCell = document.createElement("td");
    headerCell.colSpan = cols;
    headerCell.className = "full-width-header";
    headerCell.textContent = schedule.title;
    headerRow.appendChild(headerCell);
    tableElement.appendChild(headerRow);
  
    // --- NEW: optional 2-row credit header like (Qtr Cr / Sem Cr) ---
if (Array.isArray(schedule.headerRows) && schedule.headerRows.length) {
  schedule.headerRows.forEach((hr) => {
    const tr = document.createElement("tr");
    tr.classList.add("degree-header-row", "credit-header-row");

    const leftTd = document.createElement("td");
    leftTd.textContent = hr.left || "";
    tr.appendChild(leftTd);

    // no Years column for these districts (you already hide it via hideYearsColumn)
    lanes.forEach((lane, i) => {
      const td = document.createElement("td");
      const label = Array.isArray(hr.lanes) ? hr.lanes[i] : "";
      td.textContent = label || "";
      tr.appendChild(td);
    });

    tableElement.appendChild(tr);
  });
} else {
  // --- existing single header row fallback ---
  const labelRow = document.createElement("tr");
  labelRow.classList.add("degree-header-row");

  const leftTd = document.createElement("td");
  if (String(leftLabel).toLowerCase() === "performance increment") {
    leftTd.innerHTML = "Performance<br>Increment";
  } else {
    leftTd.textContent = leftLabel;
  }
  labelRow.appendChild(leftTd);

  if (!hideYearsColumn) {
    const yearsTd = document.createElement("td");
    yearsTd.textContent = "Years";
    labelRow.appendChild(yearsTd);
  }

  lanes.forEach((lane) => {
    const td = document.createElement("td");
    if (Array.isArray(lane.headerLines) && lane.headerLines.length) {
      td.innerHTML = lane.headerLines.map(x => String(x)).join("<br>");
    } else {
      td.textContent = lane.label;
    }
    labelRow.appendChild(td);
  });

  tableElement.appendChild(labelRow);
}

  
    rows.forEach((row) => {
      const tr = document.createElement("tr");
  
      const stepCell = document.createElement("td");
      stepCell.textContent = row[leftKey] ?? "";
      stepCell.classList.add("key-col");
      tr.appendChild(stepCell);
  
      if (!hideYearsColumn) {
        const yearsCell = document.createElement("td");
        yearsCell.textContent = row.years ?? "";
        yearsCell.classList.add("key-col");
        tr.appendChild(yearsCell);
      }
  
      lanes.forEach((lane) => {
        const td = document.createElement("td");
        const raw = row[lane.key];
  
        if (raw === null || raw === undefined || raw === "") {
          td.textContent = "";
        } else {
          td.textContent = formatCurrency(Number(raw));
        }
  
        tr.appendChild(td);
      });
  
      tableElement.appendChild(tr);
    });
  }
  
  function validateCalculator() {
    const degreeSelected = Array.from(degreeInputs).some((r) => r.checked);
  
    const schedule = getActiveSchedule();
    const rowsLen = schedule?.rows?.length || 30;
    const alpha = isAlphaSchedule(schedule);
  
    const yearStr = yearInput.value.trim();
    const stepIndex = alpha ? stepInputToIndex(yearStr) : Number(yearStr);
  
    let yearValid = false;
    if (alpha) {
      yearValid = stepIndex !== null && stepIndex >= 1 && stepIndex <= rowsLen;
    } else {
      const year = Number(yearStr);
      yearValid = /^\d+$/.test(yearStr) && year >= 1 && year <= 30;
    }
  
    const creditsStr = creditInput.value.trim();
    const credits = Number(creditsStr);
    const creditsValid = /^\d+$/.test(creditsStr) && credits >= 0;
  
    if (degreeSelected && yearValid && creditsValid) {
      calcBtn.disabled = false;
      calcBtn.classList.add("enabled");
    } else {
      calcBtn.disabled = true;
      calcBtn.classList.remove("enabled");
    }
  }
  
  degreeInputs.forEach((r) => r.addEventListener("change", validateCalculator));
  yearInput.addEventListener("input", validateCalculator);
  creditInput.addEventListener("input", validateCalculator);
  
  if (yearSlider && yearSliderValue) yearSliderValue.textContent = yearSlider.value;
  
  calcBtn.addEventListener("click", () => {
    if (calcBtn.disabled) return;
  
    const schedule = getActiveSchedule() || {};
    const alpha = isAlphaSchedule(schedule);
    const rowsLen = schedule?.rows?.length || 30;
  
    const rawStep = yearInput.value.trim();
    const startIndex = alpha ? stepInputToIndex(rawStep) : Number(rawStep);
  
    if (!startIndex || startIndex < 1) return;
  
    const safeStart = alpha ? clamp(startIndex, 1, rowsLen) : startIndex;
  
    const selectedDegreeInput = Array.from(degreeInputs).find((r) => r.checked);
    const selectedDegree = selectedDegreeInput ? selectedDegreeInput.value : "bachelors";
    const credits = Number(creditInput.value) || 0;
  
    const userLaneKey = getUserLaneKey(selectedDegree, credits);
  
    const lanesForSchedule =
      schedule.lanes && schedule.lanes.length ? schedule.lanes : DEFAULT_LANES;
  
    const startLaneIndex = lanesForSchedule.findIndex((l) => l.key === userLaneKey);
    const lanesToShow = startLaneIndex === -1 ? lanesForSchedule : lanesForSchedule.slice(startLaneIndex);
  
    const horizons = [1, 5, 10, 20, 30];
  
    const startLabel = alpha ? String(rawStep).trim().toUpperCase() : String(safeStart);
  
    let html = `
      <div class="calc-result-title">
        Earnings starting at ${alpha ? "Step" : "Year"} ${startLabel}
      </div>
      <div class="calc-result-wrapper">
        <table class="calc-result-table">
          <tr>
            <th>Lane</th>
            ${horizons.map((h) => `<th>${h === 1 ? "1 Year" : h + " Years"}</th>`).join("")}
          </tr>
    `;
  
    lanesToShow.forEach((lane) => {
      html += `<tr><td>${lane.label}</td>`;
      horizons.forEach((h) => {
        const total =
          h === 1
            ? getSalaryForYearAndLane(safeStart, lane.key)
            : sumForLane(safeStart, h, lane.key);
        html += `<td>${formatCurrency(total)}</td>`;
      });
      html += `</tr>`;
    });
  
    html += `
        </table>
      </div>
    `;
  
    result.innerHTML = html;
  
    result.classList.remove("visible");
    void result.offsetWidth;
    result.classList.add("visible");
  
    currentStartYear = safeStart;
    currentLanesForChart = lanesToShow;
  
    chartContainer.classList.remove("visible");
    void chartContainer.offsetWidth;
    chartContainer.classList.add("visible");
  
    updateChartFromSlider();
  });
  
  if (yearSlider) {
    yearSlider.addEventListener("input", () => {
      if (yearSliderValue) yearSliderValue.textContent = yearSlider.value;
  
      if (sliderAnimationId !== null) cancelAnimationFrame(sliderAnimationId);
  
      sliderAnimationId = requestAnimationFrame(() => {
        sliderAnimationId = null;
        updateChartFromSlider();
      });
    });
  
    yearSlider.addEventListener("change", () => {
      updateChartFromSlider();
    });
  }
  
  function updateChartFromSlider() {
    if (!currentStartYear || !currentLanesForChart.length || !yearSlider) return;
  
    const numYears = Number(yearSlider.value) || 1;
  
    const newValues = currentLanesForChart.map((l) =>
      numYears === 1
        ? getSalaryForYearAndLane(currentStartYear, l.key)
        : sumForLane(currentStartYear, numYears, l.key)
    );
  
    if (!currentValues) {
      currentValues = newValues;
      drawEarningsChart(currentLanesForChart.map((l) => l.label), newValues);
      return;
    }
  
    if (animFrame) cancelAnimationFrame(animFrame);
  
    const startValues = currentValues.slice();
    animStartTime = performance.now();
    const DURATION = 300;
  
    function animate(now) {
      const progress = Math.min((now - animStartTime) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
  
      currentValues = startValues.map(
        (start, i) => start + (newValues[i] - start) * eased
      );
  
      drawEarningsChart(currentLanesForChart.map((l) => l.label), currentValues);
  
      if (progress < 1) {
        animFrame = requestAnimationFrame(animate);
      } else {
        currentValues = newValues;
      }
    }
  
    animFrame = requestAnimationFrame(animate);
  }
  
  function ensureChartSize() {
    if (!chartCanvas) return 1;
  
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = 720;
    const displayHeight = 550;
  
    const neededWidth = Math.floor(displayWidth * dpr);
    const neededHeight = Math.floor(displayHeight * dpr);
  
    if (chartCanvas.width !== neededWidth || chartCanvas.height !== neededHeight) {
      chartCanvas.width = neededWidth;
      chartCanvas.height = neededHeight;
    }
  
    return dpr;
  }
  
  function drawEarningsChart(labels, values) {
    if (!chartCanvas || !labels.length || !values.length) return;
  
    const dpr = ensureChartSize();
    const ctx = chartCanvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
    const w = chartCanvas.width / dpr;
    const h = chartCanvas.height / dpr;
  
    ctx.clearRect(0, 0, w, h);
  
    const n = labels.length;
  
    const manyBars = n >= 9;
    const tooManyBars = n >= 12;
  
    const valueFont = tooManyBars ? 9 : manyBars ? 11 : 14;
    const labelFont = tooManyBars ? 12 : manyBars ? 13 : 16;
  
    const rotateLabels = manyBars;
    const labelAngle = rotateLabels ? -Math.PI / 6 : 0;
  
    const valueEvery = 1;
    const labelEvery = tooManyBars ? 1 : 1;
  
    const paddingLeft = 80;
    const paddingRight = 85;
    const titleY = 30;
    const paddingTop = 80;
  
    const paddingBottom = rotateLabels ? 95 : 55;
  
    const usableW = w - paddingLeft - paddingRight;
    const usableH = h - paddingTop - paddingBottom;
    const xAxisRight = w - 60;
  
    const minVal = 0;
const maxVal = 3500000;   // fixed top like your screenshot
const range = maxVal - minVal || 1;

function yPos(v) {
  return paddingTop + usableH - (usableH * (v - minVal)) / range;
}

// include the big lines you want
const gridValues = [500000, 1000000, 1500000, 2000000, 2500000, 3000000, 3500000];

  
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1;
    ctx.font = "12px Georgia, serif";
    ctx.fillStyle = "#000";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
  
    gridValues.forEach((v) => {
      const y = yPos(v);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(xAxisRight, y);
      ctx.stroke();
      ctx.fillText(formatCurrency(v), paddingLeft - 10, y);
    });
  
    const groupStep = usableW / n;
    const barWidth = groupStep * 0.6;
  
    function xCenter(i) {
      return paddingLeft + 10 + groupStep * (i + 0.5);
    }
  
    const baseY = yPos(0);
  
    const barColors = [
      "#5e32a899",
      "#f2dc6f99",
      "#9132a899",
      "#facd0799",
      "#a8329c99",
      "#e3de4d99",
      "#a8326f99",
      "#5e32a899",
      "#f2dc6f99",
      "#9132a899",
      "#facd0799",
      "#a8329c99"
    ];
  
    barHitboxes = [];
  
    labels.forEach((_, i) => {
      const value = values[i];
      const xC = xCenter(i);
      const x = xC - barWidth / 2;
      const topY = yPos(value);
      const height = Math.max(0, baseY - topY);
  
      ctx.fillStyle = barColors[i % barColors.length];
      ctx.beginPath();
      ctx.rect(x, topY, barWidth, height);
      ctx.fill();
  
      barHitboxes.push({
        x,
        y: topY - 25,
        width: barWidth,
        height: height + 40,
        value: Math.round(value)
      });
    });
  
    ctx.fillStyle = "#000";
    ctx.font = `${valueFont}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
  
    values.forEach((val, i) => {
      if (valueEvery > 1 && i % valueEvery !== 0) return;
  
      const xC = xCenter(i);
      const topY = yPos(val);
      const y = Math.max(paddingTop + 12, topY - 10);
      ctx.fillText(formatCurrency(Math.round(val)), xC, y);
    });
  
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, baseY);
    ctx.lineTo(xAxisRight, baseY);
    ctx.stroke();
  
    ctx.fillStyle = "#000";
    ctx.font = "bold 24px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Total Earnings", paddingLeft + usableW / 2, titleY);
  
    ctx.fillStyle = "#000";
    ctx.font = `${labelFont}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
  
    labels.forEach((lab, i) => {
      if (labelEvery > 1 && i % labelEvery !== 0) return;
  
      const x = xCenter(i);
      const y = baseY + 14;
  
      ctx.save();
      ctx.translate(x, y);
      if (rotateLabels) {
        ctx.rotate(labelAngle);
        ctx.textAlign = "right";
        ctx.fillText(lab, 0, 0);
      } else {
        ctx.fillText(lab, 0, 0);
      }
      ctx.restore();
    });
  }
  
  if (chartCanvas) {
    chartCanvas.style.cursor = "pointer";
    chartCanvas.addEventListener("click", (e) => {
      const rect = chartCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
  
      const hit = barHitboxes.find(
        (b) =>
          clickX >= b.x &&
          clickX <= b.x + b.width &&
          clickY >= b.y &&
          clickY <= b.y + b.height
      );
  
      if (!hit) return;
  
      const text = formatCurrency(hit.value);
  
      navigator.clipboard.writeText(text).catch(() => {
        const t = document.createElement("textarea");
        t.value = text;
        t.style.position = "fixed";
        t.style.left = "-9999px";
        document.body.appendChild(t);
        t.select();
        document.execCommand("copy");
        document.body.removeChild(t);
      });
    });
  }
  
  validateCalculator();
  loadSchedulesAndInit();
  