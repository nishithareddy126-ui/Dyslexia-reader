// --- Registration ---
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const user = {
      name,
      email,
      password,
      preferences: { fontSize: "18px", bgColor: "#ffffff", lineSpacing: "1.6" }
    };

    localStorage.setItem(email, JSON.stringify(user));
    window.location.href = "index.html";
  });
}

// --- Login ---
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const storedUser = JSON.parse(localStorage.getItem(email));

    if (!storedUser) { alert("User not found!"); return; }
    if (storedUser.password !== password) { alert("Incorrect password!"); return; }

    localStorage.setItem("currentUser", email);
    window.location.href = "dashboard.html";
  });
}

// --- Reading + Speech Variables ---
let words = [];
let index = 0;
let interval;
let manualSpeed = 300;
let useManualSpeed = false;

let speech = new SpeechSynthesisUtterance();
let voices = [];
let isSpeaking = false;

// --- Adaptive Tracking Variables ---
let startTime = null;
let simplifyClicks = 0;
let speedChanges = 0;
let lastSpeed = manualSpeed;

// --- NEW TRACKING VARIABLES ---
let pauseCount = 0;
let lastActivityTime = null;
let totalWords = 0;
let readingFinished = false;

// --- Mode Toggle State (AI Mode vs Manual Mode) ---
var isManualMode = false;

let currentLevel = "medium";

// 🔹 Display text with highlight
function displayText() {
  let result = "";
  let currentIndex = 0;

  let paragraphs = words.join(" ").split(/\n+/);

  paragraphs.forEach(paragraph => {
    let paraWords = paragraph.split(" ");
    let paraHTML = "";

    paraWords.forEach(word => {
      if (currentIndex === index) {
        paraHTML += "<span class='highlight'>" + word + "</span> ";
      } else {
        paraHTML += word + " ";
      }
      currentIndex++;
    });

    result += "<p>" + paraHTML.trim() + "</p>";
  });

  document.getElementById("output").innerHTML = result;
}


// 🔹 Reading controls
function startReading() {
  if (isSpeaking) {
    alert("Stop speech first!");
    return;
  }

  if (words.length === 0) return alert("No text!");

  clearTimeout(interval);
  index = 0;

  // 🔥 TRACKING START
  startTime = Date.now();
  lastActivityTime = Date.now();
  pauseCount = 0;
  totalWords = words.length;
  readingFinished = false;

  function loop() {
    if (index < words.length) {
      displayText();
      if (!isManualMode) {
        applyAdaptiveStyles(currentLevel);
        updateUIInfo(currentLevel);
      }

      let speed = useManualSpeed ? manualSpeed : words[index].length * 50;
      index++;

      lastActivityTime = Date.now();

      interval = setTimeout(loop, speed);
    } else {
      finishReading();
    }
  }

  loop();
}

function pauseReading() {
  clearTimeout(interval);
  speechSynthesis.pause();
}
function resumeReading() {
  speechSynthesis.resume();

function loop() {
    if (index < words.length) {
      displayText();

      // 🔥 ADD THESE 2 LINES
      if (!isManualMode) {
        applyAdaptiveStyles(currentLevel);
        updateUIInfo(currentLevel);
      }

      let speed = useManualSpeed ? manualSpeed : words[index].length * 50;
      index++;

      interval = setTimeout(loop, speed);
    } else {
      finishReading();
    }
  }

  loop();
}

// 🔹 Highlight function
function highlightWord(i) {
  document.querySelectorAll(".highlight").forEach(el => {
    el.classList.remove("highlight");
  });

  let current = document.getElementById("w" + i);
  if (current) current.classList.add("highlight");
}


// 🔹 Speech controls
function startSpeech() {
  let text = document.getElementById("output").innerText;
  if (!text) return;

  isSpeaking = true;

  speech = new SpeechSynthesisUtterance(text);

  let selected = document.getElementById("voiceSelect").value;
  if (voices[selected]) speech.voice = voices[selected];

  // 🔥 FIXED SPEED
  speech.rate = (manualSpeed - 100) / 250 + 0.5;

  renderWordsOnce(text);

  index = 0;
  highlightWord(index);

  speech.onboundary = function (event) {
    if (event.name === "word") {
      let charIndex = event.charIndex;
      let textUpToNow = speech.text.substring(0, charIndex);
      index = textUpToNow.split(/\s+/).length - 1;
      highlightWord(index);
    }
  };

  speech.onend = () => {
    isSpeaking = false;
  };

  speechSynthesis.speak(speech);
}

function stopSpeech() {
  speechSynthesis.cancel();
  isSpeaking = false;
}

function renderWordsOnce(text) {
  const output = document.getElementById("output");

  let splitWords = text.split(/\s+/);

  output.innerHTML = splitWords.map((word, i) => {
    return `<span id="w${i}">${word}</span>`;
  }).join(" ");

  words = splitWords;
}


// 🔹 Pause detection
function detectPause() {
  if (!startTime || readingFinished) return;

  let now = Date.now();

  if (now - lastActivityTime > 3000) {
    pauseCount++;
    lastActivityTime = now;
  }
}

setInterval(detectPause, 1000);
setInterval(async () => {
  if (!startTime || readingFinished) return;

  try {
    // send behavior automatically
    await fetch("http://127.0.0.1:8000/api/behavior", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        readingTime: (Date.now() - startTime) / 1000,
        simplifyClicks,
        speedChanges
      })
    });

    // get updated level
    const res = await fetch("http://127.0.0.1:8000/api/getDifficulty");
    const data = await res.json();
    const level = data.level || "medium";
    currentLevel = level;

    // update UI LIVE
    if (!isManualMode) {
      applyAdaptiveStyles(level);
      updateUIInfo(level);

      document.getElementById("modeLabel").innerText =
        "Mode: " + level.toUpperCase();
    }

  } catch (err) {
    console.error("Auto adapt error:", err);
  }

}, 5000); // every 5 seconds


// 🔹 Load voices
function loadVoices() {
  voices = speechSynthesis.getVoices();
  let select = document.getElementById("voiceSelect");
  select.innerHTML = "";

  voices.forEach((v, i) => {
    let opt = document.createElement("option");
    opt.value = i;
    opt.text = v.name;
    select.appendChild(opt);
  });
}
speechSynthesis.onvoiceschanged = loadVoices;


// 🔹 Speed control
document.getElementById("speedRange").addEventListener("input", function () {
  manualSpeed = parseInt(this.value);
  document.getElementById("speedValue").innerText = manualSpeed + " ms";
  useManualSpeed = true;

  speedChanges++;
  lastSpeed = manualSpeed;

  // applyAdaptiveStyles(level);
  // updateUIInfo(level);
  updateAdaptInfo();
});


// 🔹 Simplification (UNCHANGED)
function simplifyLocalBtn() {
  let text = localStorage.getItem("inputText") || "";
  if (!text) return alert("Enter text!");

  let result = simplifyTextLocal(text);

  words = result.split(/\s+/);
  index = 0;
  displayText();
  document.getElementById("output").innerText = result;
}

const dict = {
  "utilize": "use",
  "commence": "start",
  "terminate": "end"
};

function simplifyTextLocal(text) {
  return text.split(" ").map(w => dict[w.toLowerCase()] || w).join(" ");
}

function toggleSimplify() {
  let text = localStorage.getItem("inputText") || "";
  if (!text) return;

  let result = document.getElementById("simplifyToggle").checked
    ? simplifyTextLocal(text)
    : text;

  words = result.split(/\s+/);
  index = 0;
  displayText();
}


// 🔹 API Simplification (UNCHANGED)
async function simplifyTextAPI() {
  const text = localStorage.getItem("inputText") || "";
  if (!text) return alert("Enter text!");

  try {
    simplifyClicks++;

    // 🔥 STEP 1: Send behavior FIRST
    await fetch("http://127.0.0.1:8000/api/behavior", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        readingTime: 6,   // keep fixed for testing
        simplifyClicks,
        speedChanges
      })
    });

    // 🔥 STEP 2: Get updated difficulty
    const diffRes = await fetch("http://127.0.0.1:8000/api/getDifficulty");
    const diffData = await diffRes.json();
    const level = diffData.level || "medium";
    currentLevel = level;

    console.log("LEVEL FROM BACKEND:", level);
    console.log("Clicks:", simplifyClicks, "Speed:", speedChanges);

    // 🔥 STEP 3: Update UI immediately
    document.getElementById("modeLabel").innerText =
      "Mode: " + level.toUpperCase();

    document.getElementById("adaptInfo").innerText =
      "Clicks: " + simplifyClicks + " | Speed Changes: " + speedChanges;

    // 🔥 STEP 4: Now call simplify API with CORRECT level
    const response = await fetch("http://127.0.0.1:8000/api/simplify/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, level })
    });

    const data = await response.json();
    let simplified = data.simplified || text;

    words = simplified.split(/\s+/);
    index = 0;

    displayText();
    if (!isManualMode) {
      applyAdaptiveStyles(currentLevel);
      updateUIInfo(currentLevel);
    }
  } catch (err) {
    alert("Error connecting to API: " + err.message);
  }
}


// 🔹 Finish reading (UPDATED)
function finishReading() {
  readingFinished = true;

  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const minutes = elapsedSeconds / 60;

  let wpm = Math.round(totalWords / minutes);

  console.log("WPM:", wpm);
  console.log("Pauses:", pauseCount);

  const stats = document.getElementById("readingStats");
  if (stats) {
    stats.innerText = `Speed: ${wpm} WPM | Pauses: ${pauseCount}`;
  }

  localStorage.setItem("readingStats", JSON.stringify({
    wpm,
    time: elapsedSeconds,
    pauses: pauseCount
  }));

  sendUserBehavior({
    readingTime: elapsedSeconds,
    simplifyClicks,
    speedChanges
  });

  simplifyClicks = 0;
  speedChanges = 0;
}


// 🔹 Adaptive UI (UNCHANGED)
function applyAdaptiveStyles(level) {
  const outputDiv = document.getElementById("output");
  if (!outputDiv) return;

  outputDiv.classList.remove("easy-mode", "medium-mode", "hard-mode");

  if (level === "easy") {
    outputDiv.classList.add("easy-mode");
  } else if (level === "medium") {
    outputDiv.classList.add("medium-mode");
  } else {
    outputDiv.classList.add("hard-mode");
  }

  console.log("Applied LEVEL:", level);
  console.log("Classes:", outputDiv.className);
}

function updateUIInfo(level) {
  const uiAdapt = document.getElementById("uiAdapt");
  if (!uiAdapt) return;

  if (level === "easy") {
    uiAdapt.innerText = "UI adjusted: Larger text + more spacing for easier reading";
  } else if (level === "medium") {
    uiAdapt.innerText = "UI adjusted: Balanced reading mode";
  } else {
    uiAdapt.innerText = "UI adjusted: Compact text for faster reading";
  }
}
function updateAdaptInfo() {
  const adaptInfo = document.getElementById("adaptInfo");
  if (!adaptInfo) return;
  adaptInfo.innerText = "Simplify Clicks: " + simplifyClicks + " | Speed Adjustments: " + speedChanges;
}

document.addEventListener("DOMContentLoaded", function () {
  const defaultLevel = "medium"; // safe default
  applyAdaptiveStyles(defaultLevel);
  updateUIInfo(defaultLevel);
});


// 🔹 Mode Toggle — switches between AI Mode and Manual Mode
function toggleMode() {
  var output = document.getElementById("output");
  var btn    = document.getElementById("modeToggleBtn");
  if (!output || !btn) return;

  isManualMode = !isManualMode;

  if (isManualMode) {
    // ── Manual Mode ──────────────────────────────
    // Strip AI classes so they don't fight user inline styles
    output.classList.remove("easy-mode", "medium-mode", "hard-mode");
    applyUserPreferences(); // apply saved font/spacing/color
    document.getElementById("modeLabel").innerText = "Mode: MANUAL";
    btn.innerText = "Switch to AI Mode";
    btn.classList.replace("btn-outline-warning", "btn-warning");
  } else {
    // ── AI Mode ───────────────────────────────────
    // Clear inline styles so AI CSS classes take full control again
    output.style.fontSize        = "";
    output.style.lineHeight      = "";
    output.style.backgroundColor = "";
    applyAdaptiveStyles(currentLevel);
    updateUIInfo(currentLevel);
    document.getElementById("modeLabel").innerText = "Mode: AI";
    btn.innerText = "Switch to Manual Mode";
    btn.classList.replace("btn-warning", "btn-outline-warning");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  var toggleBtn = document.getElementById("modeToggleBtn");
  if (toggleBtn) toggleBtn.addEventListener("click", toggleMode);
});


// 🔹 Backend send (UNCHANGED)
function sendUserBehavior(data) {
  fetch("http://127.0.0.1:8000/api/behavior", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(response => console.log("Behavior logged:", response))
    .catch(err => console.error("Error:", err));
}


// ============================================================
// ⚙️  SETTINGS PANEL — safe additions below, nothing above modified
// ============================================================

(function () {
  // --- Default values ---
  var SP_DEFAULTS = { fontSize: 22, lineSpacing: 1.8, bgColor: "#ffffff" };

  // --- Load saved values (or defaults) from localStorage ---
  function loadPrefs() {
    return {
      fontSize:    parseFloat(localStorage.getItem("sp_fontSize"))    || SP_DEFAULTS.fontSize,
      lineSpacing: parseFloat(localStorage.getItem("sp_lineSpacing")) || SP_DEFAULTS.lineSpacing,
      bgColor:     localStorage.getItem("sp_bgColor")                 || SP_DEFAULTS.bgColor
    };
  }

  // --- Save a single pref to localStorage ---
  function savePref(key, value) {
    localStorage.setItem("sp_" + key, value);
  }

  // --- applyUserPreferences: apply ONLY to #output via inline styles ---
  // IMPORTANT: background-color is always ours; font-size / line-height are
  // written as inline styles but the AI CSS classes use !important so they
  // dominate during active adaptive reading — the two systems stack safely.
  window.applyUserPreferences = function () {
    var output = document.getElementById("output");
    if (!output) return;

    var prefs = loadPrefs();

    // Only background-color is guaranteed to always show (AI classes never set it).
    // font-size and line-height as inline style — AI !important CSS wins when active.
    output.style.backgroundColor = prefs.bgColor;
    output.style.fontSize        = prefs.fontSize    + "px";
    output.style.lineHeight      = prefs.lineSpacing;
  };

  // --- Sync slider track fill colour (visual polish) ---
  function syncSliderFill(slider) {
    var min = parseFloat(slider.min);
    var max = parseFloat(slider.max);
    var val = parseFloat(slider.value);
    var pct = ((val - min) / (max - min)) * 100;
    slider.style.background =
      "linear-gradient(to right, #4f46e5 " + pct + "%, #e5e7eb " + pct + "%)";
  }

  // --- Initialise the panel controls from saved prefs ---
  function initPanelControls() {
    var prefs = loadPrefs();

    var fsSlider  = document.getElementById("sp-font-size");
    var lsSlider  = document.getElementById("sp-line-spacing");
    var bgPicker  = document.getElementById("sp-bg-color");
    var fsVal     = document.getElementById("sp-font-size-val");
    var lsVal     = document.getElementById("sp-line-spacing-val");

    if (!fsSlider || !lsSlider || !bgPicker) return; // not on output page

    fsSlider.value  = prefs.fontSize;
    lsSlider.value  = prefs.lineSpacing;
    bgPicker.value  = prefs.bgColor;
    fsVal.textContent = prefs.fontSize + "px";
    lsVal.textContent = parseFloat(prefs.lineSpacing).toFixed(1);

    syncSliderFill(fsSlider);
    syncSliderFill(lsSlider);
  }

  // --- Panel toggle logic ---
  function openPanel() {
    var panel = document.getElementById("settings-panel");
    if (panel) {
      initPanelControls();
      panel.classList.add("open");
    }
  }

  function closePanel() {
    var panel = document.getElementById("settings-panel");
    if (panel) panel.classList.remove("open");
  }

  // --- Wire up everything once DOM is ready ---
  document.addEventListener("DOMContentLoaded", function () {
    var btn        = document.getElementById("settings-btn");
    var panel      = document.getElementById("settings-panel");
    var closeBtn   = document.getElementById("settings-close");
    var fsSlider   = document.getElementById("sp-font-size");
    var lsSlider   = document.getElementById("sp-line-spacing");
    var bgPicker   = document.getElementById("sp-bg-color");
    var fsVal      = document.getElementById("sp-font-size-val");
    var lsVal      = document.getElementById("sp-line-spacing-val");
    var resetBtn   = document.getElementById("sp-reset-btn");
    var presets    = document.querySelectorAll(".sp-preset");

    if (!btn || !panel) return; // settings panel not present on this page

    // Toggle panel open/close
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      panel.classList.contains("open") ? closePanel() : openPanel();
    });

    // Close button inside panel
    if (closeBtn) closeBtn.addEventListener("click", closePanel);

    // Close when clicking outside panel and button
    document.addEventListener("click", function (e) {
      if (panel.classList.contains("open") &&
          !panel.contains(e.target) &&
          e.target !== btn) {
        closePanel();
      }
    });

    // Font Size slider — Step 6: only active in Manual Mode
    if (fsSlider) {
      fsSlider.addEventListener("input", function () {
        if (!isManualMode) return;
        var val = parseFloat(this.value);
        fsVal.textContent = val + "px";
        savePref("fontSize", val);
        syncSliderFill(this);
        applyUserPreferences();
      });
    }

    // Line Spacing slider — Step 6: only active in Manual Mode
    if (lsSlider) {
      lsSlider.addEventListener("input", function () {
        if (!isManualMode) return;
        var val = parseFloat(this.value);
        lsVal.textContent = val.toFixed(1);
        savePref("lineSpacing", val);
        syncSliderFill(this);
        applyUserPreferences();
      });
    }

    // Background color picker — Step 6: only active in Manual Mode
    if (bgPicker) {
      bgPicker.addEventListener("input", function () {
        if (!isManualMode) return;
        savePref("bgColor", this.value);
        applyUserPreferences();
      });
    }

    // Color presets — Step 6: only active in Manual Mode
    presets.forEach(function (preset) {
      preset.addEventListener("click", function () {
        if (!isManualMode) return;
        var color = this.getAttribute("data-color");
        if (bgPicker) bgPicker.value = color;
        savePref("bgColor", color);
        applyUserPreferences();
      });
    });

    // Reset to defaults — Step 6: only active in Manual Mode
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (!isManualMode) return;
        savePref("fontSize",    SP_DEFAULTS.fontSize);
        savePref("lineSpacing", SP_DEFAULTS.lineSpacing);
        savePref("bgColor",     SP_DEFAULTS.bgColor);
        initPanelControls();
        applyUserPreferences();
      });
    }

    // Apply saved preferences on load only if already in manual mode
    if (isManualMode) applyUserPreferences();
  });

  // --- Patch displayText so preferences are re-applied after every call ---
  // We wrap it ONLY to call applyUserPreferences() after the original runs.
  // The original function body is untouched.
  var _originalDisplayText = window.displayText;
  if (typeof _originalDisplayText === "function") {
    window.displayText = function () {
      _originalDisplayText.apply(this, arguments);
      if (isManualMode) applyUserPreferences(); // only reapply in Manual Mode
    };
  }

})(); // end IIFE — no global scope pollution