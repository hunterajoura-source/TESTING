window.APD14 = window.APD14 || {};

(function (NS) {
  const GLITCH_CHARSET = '!<>-_\\/[]{}=+*^?#0123456789アイウエオカキクケコサシスセソタチツテト';

  let audioCtx = null;
  let soundOn = true;
  try {
    soundOn = localStorage.getItem('apd14_sound') !== 'off';
  } catch (err) {
    soundOn = true;
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function randomGlitchChar() {
    return GLITCH_CHARSET[Math.floor(Math.random() * GLITCH_CHARSET.length)];
  }

  function scrambleReveal(el, finalText, opts) {
    opts = opts || {};
    if (!el) return;
    const duration = opts.duration || 700;

    if (prefersReducedMotion()) {
      el.textContent = finalText;
      if (typeof opts.onDone === 'function') opts.onDone();
      return;
    }

    const len = finalText.length;
    const revealAt = new Array(len);
    for (let i = 0; i < len; i++) {
      revealAt[i] = (i / Math.max(len, 1)) * duration * 0.55 + Math.random() * duration * 0.45;
    }

    const start = performance.now();

    function frame(now) {
      const elapsed = now - start;
      let out = '';
      let done = true;
      for (let i = 0; i < len; i++) {
        const ch = finalText[i];
        if (ch === ' ') {
          out += ' ';
          continue;
        }
        if (elapsed >= revealAt[i]) {
          out += ch;
        } else {
          out += randomGlitchChar();
          done = false;
        }
      }
      el.textContent = out;
      if (!done) {
        requestAnimationFrame(frame);
      } else if (typeof opts.onDone === 'function') {
        opts.onDone();
      }
    }

    requestAnimationFrame(frame);
  }

  function ensureAudioCtx() {
    if (!soundOn) return null;
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        audioCtx = new AC();
      } catch (err) {
        return null;
      }
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function () {});
    }
    return audioCtx;
  }

  function tone(ctx, freq, dur, type) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.03);
  }

  function beep(kind) {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    try {
      if (kind === 'key') tone(ctx, 640 + Math.random() * 80, 0.028, 'square');
      else if (kind === 'move') tone(ctx, 480, 0.035, 'square');
      else if (kind === 'confirm') tone(ctx, 720, 0.09, 'square');
      else if (kind === 'deny') tone(ctx, 150, 0.22, 'sawtooth');
      else if (kind === 'boot') tone(ctx, 220, 0.5, 'sine');
      else if (kind === 'open') tone(ctx, 560, 0.05, 'triangle');
    } catch (err) {
      return;
    }
  }

  function setSoundEnabled(on) {
    soundOn = !!on;
    try {
      localStorage.setItem('apd14_sound', soundOn ? 'on' : 'off');
    } catch (err) {
      return;
    }
  }

  function isSoundEnabled() {
    return soundOn;
  }

  NS.fx = {
    scrambleReveal,
    prefersReducedMotion,
    beep,
    setSoundEnabled,
    isSoundEnabled
  };
})(window.APD14);
