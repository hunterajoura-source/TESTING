window.APD14 = window.APD14 || {};

(function (NS) {
  const TIPS = [
    'Clearance is a privilege, not a right.',
    'Not all anomalies are hostile. Not all Foundation actions are justified.',
    'Redacted does not mean forgotten.',
    'When in doubt, request Level 2 authorization.',
    'Every folder you add to /Directories becomes a directory here automatically.',
    'Secure. Contain. Protect.'
  ];

  const PHASES = [
    'MOUNTING ARCHIVE',
    'VERIFYING CLEARANCE DATABASE',
    'DECRYPTING INDEX',
    'ESTABLISHING SECURE CHANNEL',
    'SYNCHRONIZING RECORDS'
  ];

  function el(id) {
    return document.getElementById(id);
  }

  function progressBar(pct, width) {
    width = width || 28;
    const filled = Math.round((pct / 100) * width);
    return '[' + '\u2588'.repeat(filled) + '\u00b7'.repeat(Math.max(0, width - filled)) + ']';
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function run(onComplete) {
    const introEl = el('intro');
    introEl.hidden = false;
    introEl.classList.remove('view-fade-in');
    void introEl.offsetWidth;
    introEl.classList.add('view-fade-in');
    el('app').hidden = true;

    const track = el('progress-track');
    const phaseEl = el('progress-phase');
    const tipEl = el('intro-tip');
    const timerEl = el('intro-elapsed');
    const logo1 = el('logo-line-1');
    const logo2 = el('logo-line-2');
    const logoDesig = el('logo-designation');

    let finished = false;
    let phaseIdx = -1;
    let tipIdx = 0;
    const startTime = performance.now();
    const duration = NS.fx.prefersReducedMotion() ? 500 : 4200;

    logo1.textContent = '';
    logo2.textContent = '';
    logoDesig.textContent = '';
    NS.fx.scrambleReveal(logo1, 'S.C.P FOUNDATION', { duration: 900 });
    setTimeout(function () {
      NS.fx.scrambleReveal(logo2, 'APD-14', { duration: 900 });
    }, 250);
    setTimeout(function () {
      NS.fx.scrambleReveal(logoDesig, 'ANOMALOUS PROPERTIES DIVISION', { duration: 700 });
    }, 550);

    tipEl.textContent = TIPS[0];
    const tipIv = setInterval(function () {
      tipIdx = (tipIdx + 1) % TIPS.length;
      tipEl.textContent = TIPS[tipIdx];
    }, 1600);

    const timerIv = setInterval(function () {
      const elapsedSec = (performance.now() - startTime) / 1000;
      const mm = pad2(Math.floor(elapsedSec / 60));
      const ss = pad2(Math.floor(elapsedSec % 60));
      timerEl.textContent = '(' + mm + ':' + ss + ') ELAPSED';
    }, 100);

    function finish() {
      if (finished) return;
      finished = true;
      clearInterval(tipIv);
      clearInterval(timerIv);
      introEl.removeEventListener('click', finish);
      document.removeEventListener('keydown', onKey);
      NS.fx.beep('boot');
      if (typeof onComplete === 'function') onComplete();
    }

    function onKey(e) {
      if (e.key === 'Tab') return;
      finish();
    }

    function frame(now) {
      if (finished) return;
      const elapsed = now - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      track.textContent = progressBar(pct);
      const newPhaseIdx = Math.min(PHASES.length - 1, Math.floor((pct / 100) * PHASES.length));
      if (newPhaseIdx !== phaseIdx) {
        phaseIdx = newPhaseIdx;
        phaseEl.textContent = PHASES[phaseIdx];
      }
      if (pct >= 100) {
        setTimeout(finish, 350);
        return;
      }
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    introEl.addEventListener('click', finish);
    document.addEventListener('keydown', onKey);
  }

  NS.intro = { run };
})(window.APD14);
