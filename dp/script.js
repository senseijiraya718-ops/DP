/* =====================================================================
   LOVE LETTER WEBSITE — script.js
   Pure vanilla JavaScript. No libraries, no backend.

   SECTIONS
   1.  CONFIG    → password, your name, messages          (CUSTOMIZE)
   2.  QUESTIONS → the 10 quiz questions + correct answers (CUSTOMIZE)
   3.  LETTER    → the love letter text                    (CUSTOMIZE)
   4.  Hearts    → floating 3D hearts + particles (canvas animation)
   5.  App logic → password, quiz, reveal, letter

   NOTE ON SECURITY: this is a fun front-end "secret entrance" only.
   Anyone who opens the page source can see the password and answers.
   It is NOT real authentication.
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. CONFIG  ← change the password, your name and the messages here
   --------------------------------------------------------------------- */
const CONFIG = {
  password: "2625",                         // ← the secret password
  yourName: "SHRI",                         // ← your name, shown at the end of the letter

  wrongPasswordMessage: "Hmm... that's not it, baby 😭❤️ Try again.",
  wrongAnswerMessage:   "Nope 😭 Try again, you know me better than this ❤️",
  pickAnswerMessage:    "Pick an answer first, my love ❤️",

  revealLine: "You got them all right...",  // first line of the reveal
};


/* ---------------------------------------------------------------------
   2. QUESTIONS  ← edit questions, options and answers here
   Each question has 4 options (A, B, C, D). `correct` is the letter of
   the right option. The correct answer is never shown to the player.
   --------------------------------------------------------------------- */
const QUESTIONS = [
  {
    question: "What is my favorite thing about you?",
    options: ["Your smile", "Your eyes", "Your personality", "Everything about you"],
    correct: "B",
  },
  {
    question: "When did we go on our first date?",
    options: ["July 1", "March 26", "May 31", "June 3"],
    correct: "D",
  },
  {
    question: "What makes me happiest?",
    options: ["Money", "Food", "Spending time with you", "Sleeping"],
    correct: "B",
  },
  {
    question: "Where did we first meet?",
    options: ["Near my house", "Happy Street", "Retro Cafe", "Red Door Cafe"],
    correct: "A",
  },
  {
    question: "If I could choose one place to be right now, where would I be?",
    options: ["At my home", "At your home", "Kodaikanal", "Aanaikatti"],
    correct: "C",
  },
  {
    question: "When did we first kiss?",
    options: ["May 31", "March 25", "June 3", "June 15"],
    correct: "D",
  },
  {
    question: "What is something I could never get tired of?",
    options: ["Watching movies", "Sleeping", "Talking to you", "Eating"],
    correct: "D",
  },
  {
    question: "What are you to me?",
    options: ["My best friend", "My favorite person", "My safe place", "All of the above"],
    correct: "D",
  },
  {
    question: "Would I choose you again?",
    options: ["Yes", "No", "Maybe", "Obviously yes ❤️"],
    correct: "D",
  },
  {
    question: "Do you know how much I love you?",
    options: ["A little", "More than anything", "Not really", "I'm still figuring it out"],
    correct: "B",
  },
];


/* ---------------------------------------------------------------------
   3. LETTER  ← replace this with your own personal letter
   - Every item in `paragraphs` becomes one paragraph.
   - A plain string = normal paragraph.
   - { text: "...", style: "emphasis" } = centered, glowing line.
   - Use "\n" inside a string for a line break.
   - Your name comes from CONFIG.yourName and is added after `signOff`.
   --------------------------------------------------------------------- */
const LETTER = {
  greeting: "To the person who means the world to me,",

  paragraphs: [
    "I don't think words will ever be enough to explain how much you mean to me. Somehow, you became such an important part of my life, and now I can't imagine my days without you.",

    "Your smile, your voice, your presence, and even the little things you do have a way of making my world feel better.",

    "I don't need a perfect relationship. I just want something real with you. I want the silly conversations, the random moments, the laughter, the arguments that we overcome, the memories we create, and all the little moments in between.",

    "If I had to choose you all over again, I would.",

    "And if you ever wonder how much I love you, just remember this:",

    { text: "You are not just someone I love.", style: "emphasis" },
    { text: "You are someone I choose.",        style: "emphasis" },
    { text: "Again and again.",                 style: "emphasis" },
    { text: "Every single time.",               style: "emphasis" },
  ],

  signOff: "Forever yours,",
};


/* =====================================================================
   4. HEARTS — floating 3D hearts + glowing particles on a <canvas>
   Hearts have depth (small/slow = far, big/fast = near), flip as they
   rise, and shift slightly with the mouse for a parallax 3D feel.
   You normally don't need to edit this section.
   Colors: change HEART_COLORS. Amount: change the counts in resize().
   ===================================================================== */
const Hearts = (() => {
  const canvas = document.getElementById("heartsCanvas");
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Heart outline (24×24 box)
  const SHAPE = new Path2D(
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
  );
  const HEART_COLORS = ["#ff5c7f", "#e0284c", "#ffb3c4", "#b3123a"];

  let W = 0, H = 0, dpr = 1;
  let hearts = [], dust = [], bursts = [];
  let boost = 1, targetBoost = 1;           // speed multiplier (raised during the reveal)
  let mx = 0, my = 0, smx = 0, smy = 0;     // mouse position (-0.5 … 0.5), raw and smoothed
  let last = 0;

  const rand = (a, b) => a + Math.random() * (b - a);

  // Pre-draw glowing glossy heart sprites once (much faster than redrawing every frame)
  function makeHeartSprite(color) {
    const S = 96, c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d");
    g.translate(S / 2, S / 2);
    g.scale((S * 0.7) / 24, (S * 0.7) / 24);
    g.translate(-12, -12);
    g.shadowColor = color;
    g.shadowBlur = 14;
    g.fillStyle = color;
    g.fill(SHAPE);
    g.shadowBlur = 0;
    g.globalCompositeOperation = "source-atop";   // glossy highlight only on the heart
    const grad = g.createLinearGradient(3, 3, 18, 20);
    grad.addColorStop(0, "rgba(255,255,255,0.55)");
    grad.addColorStop(0.5, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.25)");
    g.fillStyle = grad;
    g.fill(SHAPE);
    return c;
  }
  function makeDustSprite() {
    const S = 32, c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, "rgba(255,230,238,1)");
    grad.addColorStop(0.35, "rgba(255,120,160,0.55)");
    grad.addColorStop(1, "rgba(255,60,110,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    return c;
  }
  const sprites = HEART_COLORS.map(makeHeartSprite);
  const dustSprite = makeDustSprite();

  function spawnHeart(initial) {
    const z = rand(0.2, 1);                         // depth: 0.2 = far, 1 = near
    const size = 16 + 70 * z * z;
    return {
      x: rand(0, W),
      y: initial ? rand(0, H) : H + size,
      z, size,
      vy: 14 + 46 * z,                              // rise speed (px/s)
      amp: rand(8, 28), freq: rand(0.3, 0.9), phase: rand(0, 6.28),   // sideways sway
      spin: rand(0.4, 1.1), spinPhase: rand(0, 6.28),                 // 3D flip speed
      tilt: rand(-0.35, 0.35),
      alpha: z > 0.85 ? 0.22 : 0.22 + 0.5 * z,     // very near hearts are soft "bokeh"
      sprite: sprites[Math.floor(Math.random() * sprites.length)],
      t: 0,
    };
  }
  function spawnDust(initial) {
    return {
      x: rand(0, W),
      y: initial ? rand(0, H) : H + 10,
      r: rand(0.4, 1.6),
      vy: rand(4, 16),
      tw: rand(0, 6.28),
      twSpeed: rand(0.8, 2.2),
    };
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // How many hearts / particles (fewer on phones and for reduced motion)
    const small = W < 600;
    const heartCount = reduceMotion ? 8 : small ? 22 : 40;
    const dustCount  = reduceMotion ? 20 : small ? 40 : 80;
    while (hearts.length < heartCount) hearts.push(spawnHeart(true));
    hearts.length = heartCount;
    while (dust.length < dustCount) dust.push(spawnDust(true));
    dust.length = dustCount;
  }

  // Fireworks of hearts from a point (used on unlock and during the reveal)
  function burst(x = W / 2, y = H / 2, n = 30) {
    if (reduceMotion) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(120, 420);
      const max = rand(2.2, 4);
      bursts.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 70,
        size: rand(16, 44),
        life: max, max,
        tilt: rand(-0.5, 0.5),
        spin: rand(1, 3), t: 0,
        sprite: sprites[Math.floor(Math.random() * sprites.length)],
      });
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    boost += (targetBoost - boost) * Math.min(1, dt * 2);
    smx += (mx - smx) * Math.min(1, dt * 3);
    smy += (my - smy) * Math.min(1, dt * 3);

    ctx.clearRect(0, 0, W, H);

    // Glowing dust
    for (const d of dust) {
      d.y -= d.vy * dt * boost;
      d.tw += d.twSpeed * dt;
      if (d.y < -10) Object.assign(d, spawnDust(false), { x: rand(0, W) });
      const a = 0.15 + 0.45 * (0.5 + 0.5 * Math.sin(d.tw));
      const s = d.r * 12;
      ctx.globalAlpha = a;
      ctx.drawImage(dustSprite, d.x - s / 2 + smx * 20, d.y - s / 2 + smy * 12, s, s);
    }

    // Floating hearts
    for (const h of hearts) {
      h.t += dt;
      h.y -= h.vy * dt * boost;
      if (h.y < -h.size) Object.assign(h, spawnHeart(false));
      const px = h.x + Math.sin(h.t * h.freq + h.phase) * h.amp + smx * h.z * 60;
      const py = h.y + smy * h.z * 36;
      const flip = reduceMotion ? 1 : Math.max(0.28, Math.abs(Math.cos(h.t * h.spin + h.spinPhase)));
      ctx.globalAlpha = h.alpha;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(h.tilt);
      ctx.scale(flip, 1);
      ctx.drawImage(h.sprite, -h.size / 2, -h.size / 2, h.size, h.size);
      ctx.restore();
    }

    // Burst hearts
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.t += dt;
      b.life -= dt;
      if (b.life <= 0) { bursts.splice(i, 1); continue; }
      b.vx *= 1 - Math.min(1, 1.2 * dt);
      b.vy = b.vy * (1 - Math.min(1, 0.9 * dt)) - 25 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const flip = Math.max(0.28, Math.abs(Math.cos(b.t * b.spin)));
      ctx.globalAlpha = Math.min(1, (b.life / b.max) * 1.6) * 0.95;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.tilt);
      ctx.scale(flip, 1);
      ctx.drawImage(b.sprite, -b.size / 2, -b.size / 2, b.size, b.size);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (e) => {
    mx = e.clientX / W - 0.5;
    my = e.clientY / H - 0.5;
  });

  resize();
  requestAnimationFrame(frame);

  return {
    burst,
    setBoost: (v) => { targetBoost = reduceMotion ? 1 : v; },
  };
})();


/* =====================================================================
   5. APP LOGIC
   ===================================================================== */
(() => {
  "use strict";

  /* ---------- small helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const LETTERS = ["A", "B", "C", "D"];

  function setMsg(el, text, isError = false) {
    el.textContent = text;
    el.classList.toggle("is-error", isError);
  }
  function shake(el) {
    el.classList.remove("shake");
    void el.offsetWidth;               // restart the animation
    el.classList.add("shake");
  }

  /* ---------- screen switching (fade out → fade in) ---------- */
  async function goTo(id, { skipLeave = false } = {}) {
    const current = document.querySelector(".screen.is-active");
    if (current && !skipLeave) {
      current.classList.add("leaving");
      await sleep(550);
    }
    if (current) current.classList.remove("is-active", "leaving");

    const next = $(id);
    next.classList.add("is-active");
    window.scrollTo(0, 0);
    const focusTarget = next.querySelector("[data-autofocus]");
    if (focusTarget && !focusTarget.hidden) focusTarget.focus({ preventScroll: true });
  }

  /* ---------- 3D tilt + light that follows the mouse on cards ---------- */
  document.querySelectorAll("[data-tilt]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--ry", (px * 9).toFixed(2) + "deg");
      el.style.setProperty("--rx", (-py * 7).toFixed(2) + "deg");
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  });


  /* =================================================================
     STEP 0 — PASSWORD
     ================================================================= */
  const pwInput  = $("pw-input");
  const pwField  = $("pw-field");
  const pwMsg    = $("pw-msg");
  const pwToggle = $("pw-toggle");
  const pwCard   = $("pw-card");
  const pwHeart  = $("pw-heart");
  let pwLocked = false;

  function tryUnlock() {
    if (pwLocked) return;

    if (pwInput.value.trim() === CONFIG.password) {
      pwLocked = true;
      setMsg(pwMsg, "");
      playUnlock();
    } else {
      pwInput.value = "";                                  // clear the wrong password
      setMsg(pwMsg, CONFIG.wrongPasswordMessage, true);    // cute error, screen stays
      shake(pwField);
      pwInput.focus();
    }
  }

  async function playUnlock() {
    pwInput.blur();
    pwHeart.classList.add("unlock");
    pwCard.classList.add("unlocking");
    const r = pwHeart.getBoundingClientRect();
    Hearts.burst(r.left + r.width / 2, r.top + r.height / 2, 36);
    await sleep(1150);
    await goTo("screen-welcome", { skipLeave: true });
  }

  $("pw-submit").addEventListener("click", tryUnlock);
  pwInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryUnlock();                    // Enter key submits
  });
  pwInput.addEventListener("input", () => setMsg(pwMsg, ""));

  // Show / hide password
  pwToggle.addEventListener("click", () => {
    const show = pwInput.type === "password";
    pwInput.type = show ? "text" : "password";
    pwToggle.classList.toggle("is-visible", show);
    pwToggle.setAttribute("aria-pressed", String(show));
    pwToggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    pwInput.focus();
  });

  // Focus the box on desktop (on phones this would pop the keyboard before they're ready)
  if (window.matchMedia("(pointer: fine)").matches) {
    setTimeout(() => pwInput.focus({ preventScroll: true }), 700);
  }


  /* =================================================================
     STEP 1 — WELCOME
     ================================================================= */
  $("start-btn").addEventListener("click", async () => {
    current = 0;
    selected = null;
    renderQuestion(false);
    await goTo("screen-quiz");
  });


  /* =================================================================
     STEP 2 — QUIZ
     ================================================================= */
  const quizBody     = $("quiz-body");
  const questionText = $("question-text");
  const optionsEl    = $("options");
  const quizMsg      = $("quiz-msg");
  const nextBtn      = $("next-btn");
  const progressText = $("progress-text");
  const progressFill = $("progress-fill");
  const progressBar  = $("progress-bar");

  let current  = 0;      // index of the current question
  let selected = null;   // index (0-3) of the chosen option, or null
  let busy     = false;  // blocks clicks during animations

  function renderQuestion(animate = true) {
    const q = QUESTIONS[current];
    const n = current + 1;
    const total = QUESTIONS.length;

    progressText.textContent = `Question ${n} of ${total} ❤️`;
    progressFill.style.width = (n / total) * 100 + "%";
    progressBar.setAttribute("aria-valuemax", total);
    progressBar.setAttribute("aria-valuenow", n);

    questionText.textContent = q.question;
    nextBtn.textContent = n === total ? "Finish ❤️" : "Next ❤️";
    setMsg(quizMsg, "");
    selected = null;

    optionsEl.innerHTML = "";
    q.options.forEach((text, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      btn.setAttribute("aria-pressed", "false");

      const key = document.createElement("span");
      key.className = "opt-key";
      key.textContent = LETTERS[i];

      const label = document.createElement("span");
      label.textContent = text;

      btn.append(key, label);
      btn.addEventListener("click", () => selectOption(i));
      optionsEl.appendChild(btn);
    });

    if (animate) {
      quizBody.classList.remove("swap");
      void quizBody.offsetWidth;
      quizBody.classList.add("swap");
    }
  }

  function selectOption(i) {
    if (busy) return;
    selected = i;
    [...optionsEl.children].forEach((el, idx) =>
      el.setAttribute("aria-pressed", String(idx === i))
    );
    setMsg(quizMsg, "");
  }

  async function onNext() {
    if (busy) return;

    // 1) must pick something
    if (selected === null) {
      setMsg(quizMsg, CONFIG.pickAnswerMessage, true);
      shake(nextBtn);
      return;
    }

    const q = QUESTIONS[current];
    const chosen = optionsEl.children[selected];

    // 2) wrong answer → can't continue, correct answer is NOT revealed
    if (LETTERS[selected] !== q.correct) {
      busy = true;
      setMsg(quizMsg, CONFIG.wrongAnswerMessage, true);
      chosen.classList.add("is-wrong");
      shake(quizBody);
      await sleep(650);
      chosen.classList.remove("is-wrong");
      chosen.setAttribute("aria-pressed", "false");
      selected = null;
      busy = false;
      return;
    }

    // 3) correct answer → glow, then move on
    busy = true;
    chosen.classList.add("is-correct");
    Hearts.burst(undefined, undefined, 6);
    await sleep(600);

    if (current === QUESTIONS.length - 1) {
      await startReveal();
    } else {
      current++;
      renderQuestion(true);
    }
    busy = false;
  }
  nextBtn.addEventListener("click", onNext);


  /* =================================================================
     STEP 3 — "I LOVE YOU" REVEAL
     ================================================================= */
  const revealLine = $("reveal-line");
  const revealBig  = $("reveal-big");
  const letterBtn  = $("letter-btn");

  // Types text one character at a time
  async function typeText(el, text, speed = 75) {
    el.textContent = "";
    el.classList.add("cursor");
    for (const ch of text) {
      el.textContent += ch;
      await sleep(speed);
    }
  }

  // Builds "I  LOVE  YOU  ❤️" as animated letters
  function buildBigText() {
    revealBig.innerHTML = "";
    let i = 0;
    ["I", "LOVE", "YOU", "❤️"].forEach((word) => {
      const w = document.createElement("span");
      w.className = "word";
      [...word].forEach((ch) => {
        const s = document.createElement("span");
        s.className = "ch";
        s.textContent = ch;
        s.style.setProperty("--i", i++);
        w.appendChild(s);
      });
      revealBig.appendChild(w);
    });
  }

  async function startReveal() {
    await goTo("screen-reveal");
    document.body.classList.add("dimmed");     // darken the screen
    Hearts.setBoost(2.4);                       // hearts rise faster

    revealLine.classList.remove("fade-out");
    revealBig.hidden = true;
    letterBtn.hidden = true;

    await typeText(revealLine, CONFIG.revealLine);  // "You got them all right..."
    Hearts.burst(undefined, undefined, 26);
    await sleep(1600);                              // wait ~1.5 seconds

    revealLine.classList.add("fade-out");
    await sleep(750);
    revealLine.hidden = true;

    buildBigText();                                 // "I LOVE YOU ❤️"
    revealBig.hidden = false;
    Hearts.burst(undefined, undefined, 60);
    await sleep(1900);
    revealBig.classList.add("pulse");
    Hearts.burst(undefined, undefined, 40);

    await sleep(900);
    letterBtn.hidden = false;
    letterBtn.focus({ preventScroll: true });
  }


  /* =================================================================
     STEP 4 — LOVE LETTER
     ================================================================= */
  const letterBody = $("letter-body");

  function buildLetter() {
    letterBody.innerHTML = "";
    let n = 0;                                      // controls the fade-in order

    const add = (text, className) => {
      const p = document.createElement("p");
      if (className) p.className = className;
      p.textContent = text;
      p.style.setProperty("--n", n++);
      letterBody.appendChild(p);
      return p;
    };

    add(LETTER.greeting, "greeting");

    LETTER.paragraphs.forEach((item) => {
      if (typeof item === "string") add(item);
      else add(item.text, item.style === "emphasis" ? "emphasis" : "");
    });

    // Sign-off + your name
    const sign = add(LETTER.signOff, "signoff");
    sign.appendChild(document.createElement("br"));
    const sig = document.createElement("span");
    sig.className = "sig";
    sig.textContent = `${CONFIG.yourName} ❤️`;
    sign.appendChild(sig);
  }

  letterBtn.addEventListener("click", async () => {
    letterBtn.disabled = true;
    buildLetter();
    document.body.classList.remove("dimmed");
    Hearts.setBoost(1);
    await goTo("screen-letter");
  });

})();
