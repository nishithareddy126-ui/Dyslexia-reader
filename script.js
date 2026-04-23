
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

// --- Adaptive Tracking Variables ---
let startTime = null;
let simplifyClicks = 0;
let speedChanges = 0;
let lastSpeed = manualSpeed;

// 🔹 Display text with highlight
// function displayText() {
//   let result = "";
//   for (let i = 0; i < words.length; i++) {
//     if (i === index) {
//       result += "<span class='highlight'>" + words[i] + "</span> ";
//     } else {
//       result += words[i] + " ";
//     }
//   }
//   document.getElementById("output").innerHTML = result;
// }
function displayText() {
  let result = "";
  let currentIndex = 0;

  // Split words into paragraphs based on newline or sentence breaks
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
  if (words.length === 0) return alert("No text!");

  clearTimeout(interval);
  index = 0;
  startTime = Date.now(); // start adaptive timer

  function loop() {
    if (index < words.length) {
      displayText();
      let speed = useManualSpeed ? manualSpeed : words[index].length * 50;
      index++;
      interval = setTimeout(loop, speed);
    } else {
      finishReading(); // when text ends, log behavior
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
      let speed = useManualSpeed ? manualSpeed : words[index].length * 50;
      index++;
      interval = setTimeout(loop, speed);
    } else {
      finishReading();
    }
  }
  loop();
}

// 🔹 Speech controls
function startSpeech() {
  let text = document.getElementById("output").innerText;
  if (!text) return;

  speech = new SpeechSynthesisUtterance(text);

  let selected = document.getElementById("voiceSelect").value;
  if (voices[selected]) speech.voice = voices[selected];
  // Reset index for highlighting
  words = text.split(/\s+/);
  index = 0;
  displayText();

  // 🔹 Sync highlight with spoken words
  speech.onboundary = function(event) {
    if (event.name === "word") {
      // Find which word is being spoken
      index++;
      displayText();
    }
  };


  speechSynthesis.speak(speech);
}

function stopSpeech() {
  speechSynthesis.cancel();
}

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

// 🔹 Speed control (adaptive tracking)
document.getElementById("speedRange").addEventListener("input", function () {
  manualSpeed = parseInt(this.value);
  document.getElementById("speedValue").innerText = manualSpeed + " ms";
  useManualSpeed = true;

  if (manualSpeed !== lastSpeed) {
    speedChanges++;
    lastSpeed = manualSpeed;
  }
});

// 🔹 Local Simplification (fallback dictionary)
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

// 🔹 API Simplification (adaptive level)
// async function simplifyTextAPI() {
//   const text = localStorage.getItem("inputText") || "";

//   if (!text) return alert("Enter text!");

//   try {
//     // Ask backend for adaptive difficulty
//     const diffRes = await fetch("http://127.0.0.1:8000/api/getDifficulty");
//     const diffData = await diffRes.json();
//     const level = diffData.level || "medium";

//     const response = await fetch("http://127.0.0.1:8000/api/simplify/", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ text, level })
//     });

//     const data = await response.json();
//     let simplified = data.simplified || text;

//     words = simplified.split(/\s+/);
//     index = 0;
//     displayText();
//     document.getElementById("output").innerText = simplified;

//   } catch (err) {
//     alert("Error connecting to API: " + err.message);
//   }
// }
async function simplifyTextAPI() {
  const text = localStorage.getItem("inputText") || "";
  if (!text) return alert("Enter text!");

  try {
    // Ask backend for adaptive difficulty
    const diffRes = await fetch("http://127.0.0.1:8000/api/getDifficulty");
    const diffData = await diffRes.json();
    const level = diffData.level || "medium";

    // 🔹 Apply adaptive styles
    const outputDiv = document.getElementById("output");
    outputDiv.classList.remove("easy-mode", "medium-mode", "hard-mode");
    outputDiv.classList.add(level + "-mode");

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
    outputDiv.innerText = simplified;

  } catch (err) {
    alert("Error connecting to API: " + err.message);
  }
}


// 🔹 Track simplify clicks
document.getElementById("simplifyBtn")?.addEventListener("click", () => {
  simplifyClicks++;
});

// 🔹 Finish reading → send behavior
function finishReading() {
  const elapsed = (Date.now() - startTime) / 1000;

  sendUserBehavior({
    readingTime: elapsed,
    simplifyClicks,
    speedChanges
  });

  // reset counters
  simplifyClicks = 0;
  speedChanges = 0;
}

// 🔹 Send behavior to backend
function sendUserBehavior(data) {
  fetch("/api/behavior", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(response => console.log("Behavior logged:", response))
  .catch(err => console.error("Error:", err));
}
