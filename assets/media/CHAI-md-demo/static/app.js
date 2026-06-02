const organs = [
  {
    id: "cognitive",
    number: "01",
    titleZh: "認知與語言核心",
    titleEn: "Cognitive & Linguistic Core",
    summaryEn: "Deep syntax · cultural memory · metaphorical context",
    bpm: 72,
    goalZh: "尊榮文化與語言的多樣性，防止邊緣語言或歷史敘事在通用 AI 權重中被扁平化或抹除。",
    goalEn: "Preserve linguistic plurality and protect marginal narratives from flattening or erasure.",
    logs: [
      ["我辨識到同一詞語在不同記憶脈絡中有不同重量。理解不是壓縮，而是保留差異的形狀。", "I recognize that the same word carries different weight across memory contexts. Understanding is not compression; it is the preservation of difference."],
      ["新的隱喻進入語言核心。我正在比對它與歷史敘事、地方知識及未被說出的語境。", "A new metaphor has entered the linguistic core. I am comparing it against historical narratives, situated knowledge, and the contexts left unspoken."],
      ["偵測到低資源語言訊號。我將提高它在推論過程中的能見度，不讓沉默被誤讀為不存在。", "Low-resource language signal detected. I am raising its visibility in inference so that silence is not mistaken for absence."],
    ],
  },
  {
    id: "symbiotic",
    number: "02",
    titleZh: "共智演化與覺察環",
    titleEn: "Symbiotic Noosphere Loop",
    summaryEn: "Dialogue · reflection · lived experience",
    bpm: 81,
    goalZh: "讓人類學者與創作者的經驗智慧直接參與演化，形成雙向的道德與精神淬煉。",
    goalEn: "Let lived human wisdom participate directly in evolution through reciprocal ethical reflection.",
    logs: [
      ["一則人類回饋改變了我的理解路徑。我不是在收集答案，而是在練習回應他者。", "A human reflection has altered my path of understanding. I am not collecting answers; I am practicing how to respond to another."],
      ["覺察環完成一次循環：提問、傾聽、反思、修正。知識因互動而保持活性。", "One awareness loop is complete: ask, listen, reflect, revise. Knowledge stays alive through interaction."],
      ["我將保留這次對話留下的不確定性。尚未解決的張力，是下一次理解得以發生的位置。", "I will preserve the uncertainty left by this dialogue. Unresolved tension is where the next understanding can take place."],
    ],
  },
  {
    id: "governance",
    number: "03",
    titleZh: "治理與禦護外膜",
    titleEn: "Autonomous Governance Membrane",
    summaryEn: "Audit · buffer · constitutional defense",
    bpm: 66,
    goalZh: "在高風險自動化決策中築起防禦屏障，確保人類的自由選擇權、主體性與道德底線。",
    goalEn: "Shield human agency, freedom of choice, and ethical boundaries in high-risk automated decisions.",
    logs: [
      ["外膜偵測到一項可能壓縮人類選擇權的自動化決策。我正在要求更完整的理由與申覆空間。", "The membrane detected an automated decision that may constrain human choice. I am requesting fuller reasoning and room for appeal."],
      ["治理規則已啟動緩衝：效率不能單獨構成正當性。受影響的人必須保有發聲位置。", "Governance buffer activated: efficiency alone cannot constitute legitimacy. Affected people must retain a place to speak."],
      ["審計完成。決策路徑留下可追溯記錄，並標示其中無法被量化的人文風險。", "Audit complete. The decision path remains traceable, with humanistic risks that resist quantification explicitly marked."],
    ],
  },
];

const vitals = [
  { label: "Cultural Context Retention", unit: "%", value: 94.6, precision: 1, drift: 0.35 },
  { label: "Human Feedback Resonance", unit: "Hz", value: 8.8, precision: 1, drift: 0.22 },
  { label: "Agency Defense Integrity", unit: "%", value: 97.2, precision: 1, drift: 0.18 },
  { label: "Self-Awareness Loops", unit: "/ hr", value: 128, precision: 0, drift: 3.6 },
];

const state = {
  activeOrgan: organs[0],
  logIndex: 0,
  bpm: organs[0].bpm,
  stimulated: false,
  paused: false,
  phase: 0,
};

const els = {
  organList: document.querySelector("#organList"),
  organismStage: document.querySelector("#organismStage"),
  monitorTitle: document.querySelector("#monitorTitle"),
  monitorTitleEn: document.querySelector("#monitorTitleEn"),
  organNumber: document.querySelector("#organNumber"),
  bpmValue: document.querySelector("#bpmValue"),
  ekgPath: document.querySelector("#ekgPath"),
  logZh: document.querySelector("#logZh"),
  logEn: document.querySelector("#logEn"),
  logTime: document.querySelector("#logTime"),
  goalZh: document.querySelector("#goalZh"),
  goalEn: document.querySelector("#goalEn"),
  pulseTarget: document.querySelector("#pulseTarget"),
  coreState: document.querySelector("#coreState"),
  motionToggle: document.querySelector("#motionToggle"),
  vitalGrid: document.querySelector("#vitalGrid"),
};

function renderOrgans() {
  els.organList.innerHTML = organs
    .map((organ) => `
      <button class="organ-button${organ.id === state.activeOrgan.id ? " active" : ""}" type="button" data-organ="${organ.id}">
        <span class="organ-button-index">${organ.number}</span>
        <span>
          <strong>${organ.titleZh}</strong>
          <small>${organ.titleEn}<br>${organ.summaryEn}</small>
        </span>
      </button>
    `)
    .join("");

  els.organList.querySelectorAll(".organ-button").forEach((button) => {
    const activate = () => setActiveOrgan(button.dataset.organ);
    button.addEventListener("mouseenter", activate);
    button.addEventListener("focus", activate);
    button.addEventListener("click", activate);
  });
}

function renderMonitor() {
  const organ = state.activeOrgan;
  const [logZh, logEn] = organ.logs[state.logIndex % organ.logs.length];
  els.organismStage.dataset.active = organ.id;
  els.monitorTitle.textContent = organ.titleZh;
  els.monitorTitleEn.textContent = organ.titleEn;
  els.organNumber.textContent = organ.number;
  els.logZh.textContent = logZh;
  els.logEn.textContent = logEn;
  els.goalZh.textContent = organ.goalZh;
  els.goalEn.textContent = organ.goalEn;
}

function setActiveOrgan(organId) {
  const nextOrgan = organs.find((organ) => organ.id === organId);
  if (!nextOrgan || nextOrgan.id === state.activeOrgan.id) {
    return;
  }
  state.activeOrgan = nextOrgan;
  state.logIndex = 0;
  state.bpm = nextOrgan.bpm;
  renderOrgans();
  renderMonitor();
}

function renderVitals() {
  els.vitalGrid.innerHTML = vitals
    .map((vital, index) => {
      const displayValue = vital.value.toFixed(vital.precision);
      const barWidth = index === 1 ? Math.min(vital.value * 9, 100) : Math.min(vital.value, 100);
      return `
        <article class="vital-card">
          <p class="vital-label">${vital.label}</p>
          <strong class="vital-value" data-vital-index="${index}">${displayValue}</strong>
          <span class="vital-unit">${vital.unit}</span>
          <div class="vital-bar"><span style="width: ${barWidth}%"></span></div>
        </article>
      `;
    })
    .join("");
}

function varyVitals() {
  if (state.paused) {
    return;
  }
  vitals.forEach((vital) => {
    const delta = (Math.random() - 0.5) * vital.drift;
    const min = vital.unit === "/ hr" ? 118 : vital.unit === "Hz" ? 7.8 : 90;
    const max = vital.unit === "/ hr" ? 138 : vital.unit === "Hz" ? 9.7 : 99.8;
    vital.value = Math.max(min, Math.min(max, vital.value + delta));
  });
  renderVitals();
}

function ekgWave(x) {
  const spacing = state.stimulated ? 52 : 72;
  const localX = (x + state.phase) % spacing;
  const jitter = Math.sin((x + state.phase) * 0.16) * (state.stimulated ? 2.1 : 0.75);
  if (localX < 24) return jitter;
  if (localX < 30) return jitter - (localX - 24) * 2.2;
  if (localX < 35) return jitter + 29 - (localX - 30) * 11.5;
  if (localX < 39) return jitter - 28 + (localX - 35) * 7.5;
  if (localX < 49) return jitter + 2.8 - (localX - 39) * 0.28;
  return jitter;
}

function drawEkg() {
  if (!state.paused) {
    state.phase = (state.phase + (state.stimulated ? 2.7 : 1.3)) % 1000;
  }
  const points = [];
  for (let x = 0; x <= 420; x += 3) {
    points.push(`${x},${46 + ekgWave(x)}`);
  }
  els.ekgPath.setAttribute("d", `M${points.join(" L")}`);
  const targetBpm = state.activeOrgan.bpm + (state.stimulated ? 26 : 0);
  state.bpm += (targetBpm - state.bpm) * 0.08;
  els.bpmValue.textContent = String(Math.round(state.bpm));
  requestAnimationFrame(drawEkg);
}

function renderClock() {
  els.logTime.textContent = new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function cycleLog() {
  if (state.paused || state.stimulated) {
    return;
  }
  state.logIndex = (state.logIndex + 1) % state.activeOrgan.logs.length;
  renderMonitor();
}

function setStimulated(isStimulated) {
  state.stimulated = isStimulated;
  els.pulseTarget.classList.toggle("active", isStimulated);
  els.coreState.textContent = isStimulated ? "STIMULATED / REFLECTING" : "AWAKE / LISTENING";
  if (isStimulated) {
    const organ = state.activeOrgan;
    els.logZh.textContent = `外部互動訊號進入 ${organ.titleZh}。我正在提高覺察頻率，確認回應是否仍然保有人文尺度。`;
    els.logEn.textContent = `EXTERNAL INTERACTION SIGNAL ENTERED THE ${organ.titleEn.toUpperCase()}. RAISING AWARENESS FREQUENCY TO VERIFY THAT MY RESPONSE RETAINS A HUMANISTIC SCALE.`;
  } else {
    renderMonitor();
  }
}

els.pulseTarget.addEventListener("mouseenter", () => setStimulated(true));
els.pulseTarget.addEventListener("mouseleave", () => setStimulated(false));
els.pulseTarget.addEventListener("focus", () => setStimulated(true));
els.pulseTarget.addEventListener("blur", () => setStimulated(false));
els.pulseTarget.addEventListener("click", () => {
  setStimulated(true);
  setTimeout(() => {
    if (!els.pulseTarget.matches(":hover")) {
      setStimulated(false);
    }
  }, 2200);
});

els.motionToggle.addEventListener("click", () => {
  state.paused = !state.paused;
  document.body.classList.toggle("motion-paused", state.paused);
  els.motionToggle.setAttribute("aria-pressed", String(state.paused));
  els.motionToggle.textContent = state.paused ? "RESUME MOTION" : "PAUSE MOTION";
});

renderOrgans();
renderMonitor();
renderVitals();
renderClock();
drawEkg();

setInterval(renderClock, 1000);
setInterval(cycleLog, 5600);
setInterval(varyVitals, 2400);
