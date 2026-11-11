/*
  PSYC 402 Encoding Strategies Demo
  Static HTML/CSS/JavaScript version for GitHub Pages practice.

  IMPORTANT:
  - This version does NOT send data to a server.
  - Results can be downloaded locally as CSV files.
  - A later version can send the same data to DataPipe.
*/

const app = document.getElementById("app");

const STRATEGIES = {
  maintenance: {
    label: "Maintenance rehearsal",
    instruction:
      "As each word appears, repeat it silently to yourself for the entire time it is on the screen. Try to focus on repeating the word rather than making an image or connecting it to a personal memory."
  },
  self_reference: {
    label: "Self-reference",
    instruction:
      "As each word appears, think about how it relates to you or your own life. For example, think of a personal experience, place, person, or situation that the word brings to mind."
  },
  imagery: {
    label: "Mental imagery",
    instruction:
      "As each word appears, form a vivid mental image involving the object or idea. Make the image as clear and detailed as you can."
  }
};

// Three lists of common concrete words. The list assigned to each strategy is randomized
// so that a particular set of words is not always tied to the same encoding condition.
const WORD_LISTS = [
  ["bicycle", "candle", "garden", "mountain", "violin", "window"],
  ["blanket", "camera", "forest", "hammer", "lemon", "river"],
  ["suitcase", "ladder", "pepper", "jacket", "bridge", "wallet"]
];

const BASE_WORD_DURATION_MS = 5000;
const BASE_DISTRACTOR_SECONDS = 30;
const DISTRACTOR_STEP = 3;

function scaledDuration(baseValue, reductionPercent) {
  return Math.max(1, Math.round(baseValue * (1 - reductionPercent / 100)));
}

const state = {
  sessionId: makeSessionId(),
  sessionStart: new Date().toISOString(),
  sessionEnd: null,
  strategyOrder: shuffle(["maintenance", "self_reference", "imagery"]),
  listOrder: shuffle([0, 1, 2]),
  blocks: [],
  currentBlockIndex: 0,
  currentWordIndex: 0,
  distractorStart: null,
  distractorEntries: [],
  recallRaw: "",
  recallTokens: [],
  intrusions: [],
  scoredWords: [],
  timingReductionPercent: 10
};

// Build randomized block definitions.
state.blocks = state.strategyOrder.map((strategy, blockIndex) => {
  const listId = state.listOrder[blockIndex];
  return {
    blockPosition: blockIndex + 1,
    strategy,
    listId: listId + 1,
    words: [...WORD_LISTS[listId]]
  };
});

function makeSessionId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showWelcome() {
  app.innerHTML = `
    <h1>Encoding Strategies Memory Demo</h1>
    <p class="lead">
      This short demonstration compares three ways of encoding words:
      maintenance rehearsal, self-reference, and mental imagery.
    </p>
    <div class="notice">
      <strong>What will happen:</strong>
      <ol>
        <li>You will complete three word-learning blocks. The order of the three encoding strategies is randomized.</li>
        <li>Each block contains six words, shown one at a time.</li>
        <li>After all three blocks, you will count backward for a timed interval.</li>
        <li>Finally, you will freely recall as many of the 18 words as possible.</li>
      </ol>
    </div>

    <div class="timing-control">
      <label for="timingReduction">
        <strong>Reduce all timed presentation/exposure periods by:</strong>
        <span id="timingReductionValue">10%</span>
      </label>
      <input
        id="timingReduction"
        type="range"
        min="10"
        max="90"
        step="10"
        value="10"
        aria-describedby="timingPreview"
      />
      <div class="range-labels" aria-hidden="true">
        <span>10%</span>
        <span>90%</span>
      </div>
      <p class="muted small" id="timingPreview"></p>
    </div>

    <p class="muted small">
      Practice version: no information is transmitted anywhere. At the end, the data can be downloaded to this computer as CSV files.
    </p>
    <button id="startBtn">Begin</button>
  `;

  const slider = document.getElementById("timingReduction");
  const valueLabel = document.getElementById("timingReductionValue");
  const preview = document.getElementById("timingPreview");

  function updateTimingPreview() {
    const reduction = Number(slider.value);
    state.timingReductionPercent = reduction;
    valueLabel.textContent = `${reduction}%`;

    const wordSeconds = scaledDuration(BASE_WORD_DURATION_MS, reduction) / 1000;
    const distractorSeconds = scaledDuration(BASE_DISTRACTOR_SECONDS, reduction);

    preview.textContent =
      `Resulting timing: each word = ${wordSeconds.toFixed(1)} seconds; ` +
      `distractor task = ${distractorSeconds} seconds.`;
  }

  slider.addEventListener("input", updateTimingPreview);
  updateTimingPreview();

  document.getElementById("startBtn").addEventListener("click", showBlockInstructions);
}

function showBlockInstructions() {
  const block = state.blocks[state.currentBlockIndex];
  const strategy = STRATEGIES[block.strategy];

  app.innerHTML = `
    <h2>Block ${state.currentBlockIndex + 1} of 3</h2>
    <div class="strategy-box">
      <h3>${strategy.label}</h3>
      <p>${strategy.instruction}</p>
    </div>
    <p>Six words will appear, one at a time. Each word will remain on the screen for ${(scaledDuration(BASE_WORD_DURATION_MS, state.timingReductionPercent) / 1000).toFixed(1)} seconds.</p>
    <button id="beginBlockBtn">Begin this block</button>
  `;
  document.getElementById("beginBlockBtn").addEventListener("click", () => {
    state.currentWordIndex = 0;
    showNextWord();
  });
}

function showNextWord() {
  const block = state.blocks[state.currentBlockIndex];

  if (state.currentWordIndex >= block.words.length) {
    state.currentBlockIndex += 1;
    if (state.currentBlockIndex < state.blocks.length) {
      showBetweenBlocks();
    } else {
      showDistractorIntro();
    }
    return;
  }

  const word = block.words[state.currentWordIndex];
  app.innerHTML = `
    <div class="progress">
      Block ${state.currentBlockIndex + 1} of 3 ·
      Word ${state.currentWordIndex + 1} of ${block.words.length}
    </div>
    <div class="word">${escapeHtml(word)}</div>
    <div class="progress">Use the assigned encoding strategy.</div>
  `;

  window.setTimeout(() => {
    state.currentWordIndex += 1;
    showNextWord();
  }, scaledDuration(BASE_WORD_DURATION_MS, state.timingReductionPercent));
}

function showBetweenBlocks() {
  app.innerHTML = `
    <h2>Block complete</h2>
    <p>Take a brief pause. The next block will use a different encoding strategy.</p>
    <button id="continueBtn">Continue</button>
  `;
  document.getElementById("continueBtn").addEventListener("click", showBlockInstructions);
}

function showDistractorIntro() {
  state.distractorStart = Math.floor(Math.random() * 300) + 700;

  app.innerHTML = `
    <h2>Distractor task</h2>
    <p>
      For the next <strong>${scaledDuration(BASE_DISTRACTOR_SECONDS, state.timingReductionPercent)} seconds</strong>, count backward by
      <strong>${DISTRACTOR_STEP}s</strong> from <strong>${state.distractorStart}</strong>.
    </p>
    <p>
      Type each next number and press Enter. For example, if you started at 938,
      you would enter 935, then 932, then 929, and so on.
    </p>
    <button id="startDistractorBtn">Start timed task</button>
  `;

  document.getElementById("startDistractorBtn").addEventListener("click", runDistractor);
}

function runDistractor() {
  let secondsLeft = scaledDuration(BASE_DISTRACTOR_SECONDS, state.timingReductionPercent);

  app.innerHTML = `
    <h2>Count backward by ${DISTRACTOR_STEP}s</h2>
    <p>Starting number: <strong>${state.distractorStart}</strong></p>
    <div class="timer" id="timer">${secondsLeft}</div>
    <div class="number-entry">
      <label for="numberInput">Next number:</label>
      <input id="numberInput" type="text" inputmode="numeric" autocomplete="off" />
      <button id="submitNumberBtn">Enter</button>
    </div>
    <p class="muted small" id="entryCount">0 entries recorded</p>
  `;

  const input = document.getElementById("numberInput");
  const submit = document.getElementById("submitNumberBtn");
  const entryCount = document.getElementById("entryCount");

  function recordEntry() {
    const value = input.value.trim();
    if (value !== "") {
      state.distractorEntries.push(value);
      input.value = "";
      entryCount.textContent = `${state.distractorEntries.length} entr${state.distractorEntries.length === 1 ? "y" : "ies"} recorded`;
    }
    input.focus();
  }

  submit.addEventListener("click", recordEntry);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      recordEntry();
    }
  });

  input.focus();

  const interval = window.setInterval(() => {
    secondsLeft -= 1;
    document.getElementById("timer").textContent = secondsLeft;

    if (secondsLeft <= 0) {
      window.clearInterval(interval);
      input.disabled = true;
      submit.disabled = true;
      showRecall();
    }
  }, 1000);
}

function showRecall() {
  app.innerHTML = `
    <h2>Free recall</h2>
    <p>
      Recall as many of the words from <strong>all three blocks</strong> as you can.
      Enter the words in any order. Separate words with spaces, commas, or new lines.
    </p>
    <textarea id="recallText" aria-label="Words recalled"></textarea>
    <button id="scoreBtn">Finish and score recall</button>
  `;

  const recallText = document.getElementById("recallText");
  recallText.focus();

  document.getElementById("scoreBtn").addEventListener("click", () => {
    state.recallRaw = recallText.value;
    scoreRecall();
    showResults();
  });
}

function normalizeRecall(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s,;]+/g, " ")
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function scoreRecall() {
  const tokens = normalizeRecall(state.recallRaw);
  state.recallTokens = [...new Set(tokens)];

  const allTargets = new Set();
  state.scoredWords = [];

  state.blocks.forEach((block) => {
    block.words.forEach((word, wordIndex) => {
      allTargets.add(word);
      state.scoredWords.push({
        session_id: state.sessionId,
        block_position: block.blockPosition,
        strategy: block.strategy,
        strategy_label: STRATEGIES[block.strategy].label,
        list_id: block.listId,
        word_serial_position: wordIndex + 1,
        word,
        recalled: state.recallTokens.includes(word) ? 1 : 0
      });
    });
  });

  state.intrusions = state.recallTokens.filter((token) => !allTargets.has(token));
  state.sessionEnd = new Date().toISOString();
}

function getStrategyScore(strategy) {
  return state.scoredWords
    .filter((row) => row.strategy === strategy)
    .reduce((sum, row) => sum + row.recalled, 0);
}

function showResults() {
  const maintenance = getStrategyScore("maintenance");
  const selfRef = getStrategyScore("self_reference");
  const imagery = getStrategyScore("imagery");
  const total = maintenance + selfRef + imagery;

  app.innerHTML = `
    <h2>Results</h2>
    <p class="muted">Session ID: <code>${state.sessionId}</code></p>

    <div class="stats-grid">
      <div class="stat">
        <span class="value">${maintenance}/6</span>
        Maintenance rehearsal
      </div>
      <div class="stat">
        <span class="value">${selfRef}/6</span>
        Self-reference
      </div>
      <div class="stat">
        <span class="value">${imagery}/6</span>
        Mental imagery
      </div>
      <div class="stat">
        <span class="value">${total}/18</span>
        Total recalled
      </div>
    </div>

    <div class="result-box">
      <strong>Randomized strategy order:</strong>
      ${state.strategyOrder.map((s) => STRATEGIES[s].label).join(" → ")}
      <br />
      <strong>Distractor entries recorded:</strong> ${state.distractorEntries.length}
      <br />
      <strong>Intrusions:</strong> ${state.intrusions.length ? escapeHtml(state.intrusions.join(", ")) : "None"}
    </div>

    <p>
      This practice version keeps the data only in this browser session. Use the buttons below
      to download data files to the computer.
    </p>

    <button id="downloadSummaryBtn">Download summary CSV</button>
    <button id="downloadTrialsBtn">Download trial-level CSV</button>
    <button class="secondary" id="restartBtn">Run a new session</button>
  `;

  document.getElementById("downloadSummaryBtn").addEventListener("click", downloadSummaryCsv);
  document.getElementById("downloadTrialsBtn").addEventListener("click", downloadTrialCsv);
  document.getElementById("restartBtn").addEventListener("click", () => window.location.reload());
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

function downloadCsv(filename, rows) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadSummaryCsv() {
  const row = {
    session_id: state.sessionId,
    session_start: state.sessionStart,
    session_end: state.sessionEnd,
    strategy_order: state.strategyOrder.join("|"),
    timing_reduction_percent: state.timingReductionPercent,
    word_duration_ms: scaledDuration(BASE_WORD_DURATION_MS, state.timingReductionPercent),
    distractor_duration_seconds: scaledDuration(BASE_DISTRACTOR_SECONDS, state.timingReductionPercent),
    maintenance_list_id: state.blocks.find((b) => b.strategy === "maintenance").listId,
    self_reference_list_id: state.blocks.find((b) => b.strategy === "self_reference").listId,
    imagery_list_id: state.blocks.find((b) => b.strategy === "imagery").listId,
    recall_maintenance: getStrategyScore("maintenance"),
    recall_self_reference: getStrategyScore("self_reference"),
    recall_imagery: getStrategyScore("imagery"),
    recall_total: state.scoredWords.reduce((sum, row) => sum + row.recalled, 0),
    distractor_start: state.distractorStart,
    distractor_step: DISTRACTOR_STEP,
    distractor_entries_count: state.distractorEntries.length,
    distractor_entries: state.distractorEntries.join("|"),
    raw_recall: state.recallRaw.replaceAll("\n", " "),
    intrusions: state.intrusions.join("|")
  };

  downloadCsv(`encoding_summary_${state.sessionId}.csv`, [row]);
}

function downloadTrialCsv() {
  const order = state.strategyOrder.join("|");
  const rows = state.scoredWords.map((row) => ({
    ...row,
    strategy_order: order,
    session_start: state.sessionStart,
    session_end: state.sessionEnd,
    timing_reduction_percent: state.timingReductionPercent,
    word_duration_ms: scaledDuration(BASE_WORD_DURATION_MS, state.timingReductionPercent)
  }));

  downloadCsv(`encoding_trials_${state.sessionId}.csv`, rows);
}

showWelcome();
