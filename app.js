(() => {
  const intro = document.getElementById('intro');
  const video = document.getElementById('envelopeVideo');
  const hotspot = document.getElementById('sealHotspot');
  const invitation = document.getElementById('invitation');
  const videoError = document.getElementById('videoError');
  const giftSound = document.getElementById('giftSound');
  const giftSoundFallback = document.getElementById('giftSoundFallback');
  const backgroundMusic = document.getElementById('backgroundMusic');
  const musicToggle = document.getElementById('musicToggle');

  let started = false;
  let invitationRevealed = false;
  const INTRO_EXIT_MS = 620;

  // Música de fondo: se desbloquea desde el primer toque en el sello y entra al terminar la apertura.
  let musicEnabled = true;
  let musicFadeTimer = null;

  function updateMusicToggle() {
    if (!musicToggle || !backgroundMusic) return;
    const isPlaying = !backgroundMusic.paused && musicEnabled;
    const label = musicToggle.querySelector('.music-toggle-label');
    const icon = musicToggle.querySelector('.music-toggle-icon');
    if (label) label.textContent = isPlaying ? 'APAGAR MÚSICA' : 'ACTIVAR MÚSICA';
    if (icon) icon.textContent = isPlaying ? '♫' : '♪';
    musicToggle.dataset.state = isPlaying ? 'playing' : 'paused';
    musicToggle.setAttribute('aria-pressed', String(isPlaying));
    musicToggle.setAttribute('aria-label', isPlaying ? 'Apagar música de fondo' : 'Activar música de fondo');
  }

  function startMusicSilentlyFromGesture() {
    if (!backgroundMusic || !musicEnabled) return;
    window.clearInterval(musicFadeTimer);
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0;
    backgroundMusic.currentTime = 0;
    const request = backgroundMusic.play();
    if (request && typeof request.then === 'function') {
      request.then(() => updateMusicToggle()).catch(() => {
        // Si el navegador bloquea el audio, el control permitirá activarlo con otro toque.
        musicEnabled = false;
        updateMusicToggle();
      });
    }
  }

  function fadeMusicIn() {
    if (!backgroundMusic || !musicEnabled || backgroundMusic.paused) return;
    window.clearInterval(musicFadeTimer);
    const startVolume = Math.max(0, backgroundMusic.volume);
    const targetVolume = 0.36;
    const duration = 1500;
    const step = 100;
    let elapsed = 0;
    musicFadeTimer = window.setInterval(() => {
      if (!musicEnabled || backgroundMusic.paused) {
        window.clearInterval(musicFadeTimer);
        return;
      }
      elapsed += step;
      const progress = Math.min(1, elapsed / duration);
      backgroundMusic.volume = startVolume + (targetVolume - startVolume) * progress;
      if (progress >= 1) window.clearInterval(musicFadeTimer);
    }, step);
    updateMusicToggle();
  }

  function toggleBackgroundMusic() {
    if (!backgroundMusic) return;
    if (!backgroundMusic.paused) {
      musicEnabled = false;
      window.clearInterval(musicFadeTimer);
      backgroundMusic.pause();
    } else {
      musicEnabled = true;
      backgroundMusic.volume = 0.36;
      const request = backgroundMusic.play();
      if (request && typeof request.then === 'function') {
        request.then(() => updateMusicToggle()).catch(() => updateMusicToggle());
      }
    }
    updateMusicToggle();
  }

  musicToggle?.addEventListener('click', toggleBackgroundMusic);
  updateMusicToggle();

  // El modo de revisión permite probar el contenido sin reproducir el sobre.
  if (new URLSearchParams(window.location.search).get('preview') === '1') {
    intro.hidden = true;
    invitation.hidden = false;
    invitation.classList.add('is-visible');
    document.body.classList.add('invitation-open');
    if (musicToggle) musicToggle.hidden = false;
    updateMusicToggle();
    setupScrollReveal();
    setupGiftMoment();
  }

  async function openEnvelope() {
    if (started || invitationRevealed) return;
    started = true;
    // Aprovecha el toque inicial del invitado para preparar el audio de la lluvia sin reproducirlo aún.
    primeGiftSoundFromGesture();
    startMusicSilentlyFromGesture();
    hotspot.disabled = true;
    videoError.hidden = true;

    try {
      // Silencio forzado también desde JavaScript, además del atributo muted del HTML.
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      video.defaultPlaybackRate = 1.18;
      video.playbackRate = 1.18;
      video.pause();
      video.currentTime = 0;
      const playRequest = video.play();
      if (playRequest && typeof playRequest.then === 'function') await playRequest;
      hotspot.hidden = true;
    } catch (error) {
      console.error('No se pudo iniciar la animación del sobre:', error);
      started = false;
      hotspot.disabled = false;
      hotspot.hidden = false;
      videoError.hidden = false;
    }
  }

  function revealInvitation() {
    if (invitationRevealed) return;
    invitationRevealed = true;

    // El sobre se detiene en su fotograma final abierto y vacío.
    // La invitación aparece mediante un fundido limpio, sin resplandor ni destello blanco.
    invitation.hidden = false;
    document.body.classList.add('invitation-open');
    if (musicToggle) musicToggle.hidden = false;
    if (backgroundMusic && musicEnabled && !backgroundMusic.paused) fadeMusicIn();
    updateMusicToggle();

    invitation.classList.remove('is-visible');
    void invitation.offsetWidth;
    requestAnimationFrame(() => invitation.classList.add('is-visible'));

    intro.classList.add('is-leaving');
    activatePetals();
    setupScrollReveal();
    setupGiftMoment();
    window.setTimeout(() => {
      intro.hidden = true;
      window.scrollTo({ top: 0, behavior: 'auto' });
    }, INTRO_EXIT_MS + 80);
  }

  // Pétalos fotográficos en dos modelos: rosa y marfil. Se generan una sola vez.
  function activatePetals() {
    const layer = document.getElementById('petalLayer');
    if (!layer || layer.dataset.created === 'true') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    layer.hidden = false;
    layer.dataset.created = 'true';
    const fragment = document.createDocumentFragment();
    const petalCount = 8;
    const petalAssets = [
      { src: 'assets/petalo-rosa.png', widthMin: 23, widthMax: 34, ratio: 1.20 },
      { src: 'assets/petalo-marfil.png', widthMin: 29, widthMax: 42, ratio: 1.02 }
    ];

    for (let i = 0; i < petalCount; i += 1) {
      const type = petalAssets[Math.random() > 0.48 ? 1 : 0];
      const petal = document.createElement('img');
      petal.className = 'petal';
      petal.src = type.src;
      petal.alt = '';
      petal.draggable = false;
      petal.decoding = 'async';
      const width = type.widthMin + Math.random() * (type.widthMax - type.widthMin);
      const duration = 17 + Math.random() * 14;
      const startX = Math.random() * 100;
      const midDrift = (Math.random() * 30 - 15).toFixed(1);
      const endDrift = (Math.random() * 40 - 20).toFixed(1);
      petal.style.setProperty('--start-x', `${startX.toFixed(2)}%`);
      petal.style.setProperty('--petal-width', `${width.toFixed(1)}px`);
      petal.style.setProperty('--petal-height', `${(width / type.ratio).toFixed(1)}px`);
      petal.style.setProperty('--fall-duration', `${duration.toFixed(1)}s`);
      petal.style.setProperty('--fall-delay', `${(-Math.random() * duration).toFixed(1)}s`);
      petal.style.setProperty('--drift-mid', `${midDrift}vw`);
      petal.style.setProperty('--drift-end', `${endDrift}vw`);
      petal.style.setProperty('--start-rotation', `${Math.round(Math.random() * 180)}deg`);
      petal.style.setProperty('--petal-opacity', (0.58 + Math.random() * 0.2).toFixed(2));
      fragment.appendChild(petal);
    }
    layer.appendChild(fragment);
    document.addEventListener('visibilitychange', () => {
      layer.classList.toggle('is-paused', document.hidden);
    }, { passive: true });
  }

  function setupScrollReveal() {
    const selectors = [
      '.family-section > .eyebrow', '.family-section .family-greeting > *',
      '.family-section .family-intro', '.family-section .family-group h2',
      '.family-section .family-name-row', '.family-section .family-name-ornament',
      '.family-section > .thin-divider',
      '.place-section > .eyebrow', '.place-section > h2', '.place-card',
      '.timeline-board > .eyebrow', '.timeline-board > h2', '.timeline-board > .section-intro', '.timeline-item',
      '.gift-section > *', '.gallery-section > *',
      '.coming-board > *', '.rsvp-board > *', '.closing > *'
    ];
    const targets = Array.from(document.querySelectorAll(selectors.join(',')));
    if (!targets.length) return;

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach((element) => element.classList.add('is-revealed'));
      return;
    }

    // Pequeño escalonado por sección para que el contenido no aparezca todo de golpe.
    const groups = new Map();
    targets.forEach((element) => {
      const parent = element.parentElement;
      const index = groups.get(parent) || 0;
      groups.set(parent, index + 1);
      element.classList.add('scroll-reveal');
      // En el programa, cada horario y actividad se despliega en una secuencia más perceptible.
      const revealDelay = element.classList.contains('timeline-item')
        ? Math.min(index * 105, 945)
        : Math.min(index * 65, 260);
      element.style.setProperty('--reveal-delay', `${revealDelay}ms`);
    });

    // Mantiene el observador activo: revela al entrar y reinicia al salir.
    // Así las animaciones se reproducen tanto al bajar como al volver a subir.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
        } else {
          entry.target.classList.remove('is-revealed');
        }
      });
    }, { root: null, rootMargin: '0px 0px -7% 0px', threshold: 0.08 });

    targets.forEach((element) => observer.observe(element));
  }

  // Prepara el audio durante el primer toque (apertura del sobre), sin que se escuche en ese momento.
  // Así el navegador suele permitir reproducir el efecto más tarde, cuando la urna entra en pantalla.
  function primeGiftSoundFromGesture() {
    if (!giftSound || giftSound.dataset.primed === 'true') return;
    giftSound.muted = true;
    giftSound.volume = 0;
    giftSound.currentTime = 0;
    const request = giftSound.play();
    if (request && typeof request.then === 'function') {
      request.then(() => {
        giftSound.pause();
        giftSound.currentTime = 0;
        giftSound.muted = false;
        giftSound.volume = 0.68;
        giftSound.dataset.primed = 'true';
      }).catch(() => {
        giftSound.muted = false;
        giftSound.volume = 0.68;
      });
    }
  }

  let giftMomentStarted = false;
  let giftObserver = null;

  function playGiftSound() {
    if (!giftSound) return;
    giftSound.pause();
    giftSound.currentTime = 0;
    giftSound.muted = false;
    giftSound.volume = 0.68;
    const request = giftSound.play();
    if (request && typeof request.then === 'function') {
      request.then(() => {
        if (giftSoundFallback) giftSoundFallback.hidden = true;
      }).catch((error) => {
        // Safari/iOS puede exigir un toque explícito para el sonido al llegar por scroll.
        if (giftSoundFallback) giftSoundFallback.hidden = false;
        console.info('El navegador bloqueó la reproducción automática del efecto; se ofrece un botón manual.', error);
      });
    }
  }

  function createFallingEnvelopes() {
    const stage = document.getElementById('giftArtStage');
    const layer = document.getElementById('giftEnvelopeLayer');
    if (!stage || !layer || layer.dataset.created === 'true') return;
    layer.dataset.created = 'true';

    const rect = stage.getBoundingClientRect();
    const width = rect.width || stage.clientWidth || 320;
    const height = rect.height || stage.clientHeight || (width * 1228 / 1281);
    const envelopeWidth = Math.max(38, Math.min(54, width * 0.145));
    const envelopeHeight = envelopeWidth * (909 / 1411);

    // La ranura de la urna está aproximadamente al 52.5% del ancho y 24.5% del alto.
    const slotCenterX = width * 0.525;
    const slotTop = height * 0.245 - envelopeHeight * 0.40;
    const startTop = -envelopeHeight - 26;
    const targetY = slotTop - startTop;
    const count = 7;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i += 1) {
      const wrapper = document.createElement('span');
      wrapper.className = 'falling-envelope';
      wrapper.setAttribute('aria-hidden', 'true');
      const startLeft = width * (0.12 + Math.random() * 0.72);
      const endLeft = slotCenterX - envelopeWidth / 2;
      const dx = endLeft - startLeft;
      const drift = (Math.random() * 24 - 12);
      const startRotation = (Math.random() * 26 - 13);
      const endRotation = (Math.random() * 14 - 7);
      const duration = 1.55 + Math.random() * 0.38;
      const delay = 0.10 + i * 0.30;

      wrapper.style.left = `${startLeft.toFixed(1)}px`;
      wrapper.style.top = `${startTop.toFixed(1)}px`;
      wrapper.style.width = `${envelopeWidth.toFixed(1)}px`;
      wrapper.style.setProperty('--fall-x-mid', `${(dx * 0.34 + drift).toFixed(1)}px`);
      wrapper.style.setProperty('--fall-y-mid', `${(targetY * 0.30).toFixed(1)}px`);
      wrapper.style.setProperty('--fall-x-late', `${(dx * 0.78 - drift * 0.20).toFixed(1)}px`);
      wrapper.style.setProperty('--fall-y-late', `${(targetY * 0.76).toFixed(1)}px`);
      wrapper.style.setProperty('--fall-x', `${dx.toFixed(1)}px`);
      wrapper.style.setProperty('--fall-y', `${targetY.toFixed(1)}px`);
      wrapper.style.setProperty('--start-rotation', `${startRotation.toFixed(1)}deg`);
      wrapper.style.setProperty('--end-rotation', `${endRotation.toFixed(1)}deg`);
      wrapper.style.setProperty('--fall-duration', `${duration.toFixed(2)}s`);
      wrapper.style.setProperty('--fall-delay', `${delay.toFixed(2)}s`);

      const envelope = document.createElement('img');
      envelope.src = 'assets/sobre-lluvia.png';
      envelope.alt = '';
      envelope.draggable = false;
      wrapper.appendChild(envelope);
      wrapper.addEventListener('animationend', () => wrapper.remove(), { once: true });
      fragment.appendChild(wrapper);
    }
    layer.appendChild(fragment);
  }

  function activateGiftMoment() {
    if (giftMomentStarted) return;
    const section = document.getElementById('giftSection');
    const urn = document.getElementById('giftUrn');
    if (!section || !urn) return;
    giftMomentStarted = true;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    section.classList.add('gift-rain-active');
    urn.classList.add('is-vibrating');
    createFallingEnvelopes();
    window.setTimeout(() => urn.classList.remove('is-vibrating'), 2600);
    window.setTimeout(playGiftSound, 180);
  }

  function setupGiftMoment() {
    const trigger = document.getElementById('giftArtStage');
    if (!trigger || trigger.dataset.observed === 'true' || giftMomentStarted) return;
    trigger.dataset.observed = 'true';

    if (!('IntersectionObserver' in window)) {
      activateGiftMoment();
      return;
    }

    giftObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.22) continue;
        giftObserver.disconnect();
        activateGiftMoment();
        break;
      }
    }, { threshold: [0.22, 0.35], rootMargin: '0px 0px -8% 0px' });
    giftObserver.observe(trigger);
  }

  giftSoundFallback?.addEventListener('click', () => {
    if (!giftSound) return;
    giftSound.pause();
    giftSound.currentTime = 0;
    giftSound.muted = false;
    giftSound.volume = 0.68;
    const request = giftSound.play();
    if (request && typeof request.then === 'function') {
      request.then(() => { giftSoundFallback.hidden = true; }).catch(() => {});
    }
  });

  hotspot.addEventListener('click', openEnvelope);
  // Compatibilidad táctil adicional; la bandera started evita doble reproducción.
  hotspot.addEventListener('pointerup', () => {
    if (!started) openEnvelope();
  });

  video.addEventListener('playing', () => { videoError.hidden = true; });
  // No se inicia el fundido durante la apertura: esperamos a que alcance el fotograma final elegido.
  video.addEventListener('ended', revealInvitation);
  video.addEventListener('error', () => {
    videoError.hidden = false;
    started = false;
    hotspot.disabled = false;
    hotspot.hidden = false;
  });

  // El modo ?preview=1 permite ver también los pétalos sin abrir el sobre.
  if (new URLSearchParams(window.location.search).get('preview') === '1') activatePetals();

  // Confirmación sencilla: solo pregunta si asistirá y solicita el nombre completo.
  const rsvpYes = document.getElementById('rsvpYes');
  const rsvpNo = document.getElementById('rsvpNo');
  const rsvpForm = document.getElementById('rsvpForm');
  const rsvpName = document.getElementById('rsvpName');
  const rsvpFeedback = document.getElementById('rsvpFeedback');
  const sheyllaWhatsApp = '522288560974';

  if (rsvpYes && rsvpForm && rsvpName) {
    rsvpYes.addEventListener('click', () => {
      rsvpFeedback.hidden = true;
      rsvpForm.hidden = false;
      rsvpYes.setAttribute('aria-pressed', 'true');
      rsvpNo?.setAttribute('aria-pressed', 'false');
      window.setTimeout(() => rsvpName.focus({ preventScroll: true }), 80);
    });

    rsvpForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const guestName = rsvpName.value.trim().replace(/\s+/g, ' ');
      if (guestName.split(' ').length < 2 || guestName.length < 5) {
        rsvpFeedback.textContent = 'Escribe tu nombre y apellidos para confirmar.';
        rsvpFeedback.hidden = false;
        rsvpName.focus();
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const family = params.get('familia');
      const invitee = params.get('invitado');
      const familyLine = family ? `\nInvitación dirigida a: ${family}.` : (params.get('pase') === 'personal' && invitee ? `\nPase personal para: ${invitee}.` : '');
      const message = `Hola Sheylla, soy ${guestName}.${familyLine} Confirmo mi asistencia a los XV años de Nicole Roa Barragán, el 21 de noviembre de 2026. ¡Muchas gracias por la invitación!`;
      const url = `https://wa.me/${sheyllaWhatsApp}?text=${encodeURIComponent(message)}`;
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
      rsvpFeedback.textContent = 'Se abrió WhatsApp con tu confirmación. Sheylla podrá registrar tu respuesta en el panel administrativo.';
      rsvpFeedback.hidden = false;
    });
  }

  if (rsvpNo) {
    rsvpNo.addEventListener('click', () => {
      const params = new URLSearchParams(window.location.search);
      const family = params.get('familia');
      const invitee = params.get('invitado');
      const familyLine = family ? ` Invitación dirigida a: ${family}.` : (params.get('pase') === 'personal' && invitee ? ` Pase personal para: ${invitee}.` : '');
      const message = `Hola Sheylla.${familyLine} Muchas gracias por la invitación a los XV años de Nicole. Lamentablemente no podré asistir.`;
      const url = `https://wa.me/${sheyllaWhatsApp}?text=${encodeURIComponent(message)}`;
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    });
  }

  // Cuenta regresiva hasta el inicio de la ceremonia: 21/11/2026 a las 18:00, Xalapa.
  const eventDate = new Date('2026-11-21T18:00:00-06:00').getTime();
  const $ = (id) => document.getElementById(id);
  function updateCountdown() {
    const diff = eventDate - Date.now();
    if (diff <= 0) {
      $('days').textContent = '00';
      $('hours').textContent = '00';
      $('minutes').textContent = '00';
      $('seconds').textContent = '00';
      const title = document.querySelector('.countdown-title');
      if (title) title.textContent = '¡HOY ES EL GRAN DÍA!';
      return;
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    $('days').textContent = String(days).padStart(2, '0');
    $('hours').textContent = String(hours).padStart(2, '0');
    $('minutes').textContent = String(minutes).padStart(2, '0');
    $('seconds').textContent = String(seconds).padStart(2, '0');
  }
  updateCountdown();
  window.setInterval(updateCountdown, 1000);

  // Microinteracción táctil/teclado de las tarjetas completas de ubicación.
  // El enlace completo abre Google Maps; el rótulo interior es solo visual.
  document.querySelectorAll('.location-card').forEach((card) => {
    let releaseTimer = 0;
    let pointerIsDown = false;

    const press = () => {
      window.clearTimeout(releaseTimer);
      card.classList.add('is-pressed');
    };
    const release = () => {
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(() => card.classList.remove('is-pressed'), 280);
    };

    card.addEventListener('pointerdown', () => {
      pointerIsDown = true;
      press();
    });
    card.addEventListener('pointerup', () => {
      pointerIsDown = false;
      release();
    });
    card.addEventListener('pointercancel', () => {
      pointerIsDown = false;
      window.clearTimeout(releaseTimer);
      card.classList.remove('is-pressed');
    });
    card.addEventListener('pointerleave', () => {
      if (!pointerIsDown) return;
      pointerIsDown = false;
      window.clearTimeout(releaseTimer);
      card.classList.remove('is-pressed');
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') press();
    });
    card.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') release();
    });
    card.addEventListener('blur', () => {
      window.clearTimeout(releaseTimer);
      card.classList.remove('is-pressed');
    });
  });

  // Carrusel de infancia estilo mazo 3D: tarjeta central protagonista y tarjetas en profundidad.
  const galleryCarousel = document.getElementById('galleryCarousel');
  const galleryViewport = document.getElementById('galleryViewport');
  const galleryTrack = document.getElementById('galleryTrack');
  const gallerySlides = galleryTrack ? Array.from(galleryTrack.querySelectorAll('.gallery-slide')) : [];
  const galleryPrev = document.getElementById('galleryPrev');
  const galleryNext = document.getElementById('galleryNext');
  const galleryDotsContainer = document.getElementById('galleryDots');
  let galleryDots = [];
  const galleryStatus = document.getElementById('galleryStatus');
  let galleryIndex = 0;
  let galleryTimer = null;
  let galleryIsVisible = false;
  let galleryPointerStart = null;
  let suppressGalleryClick = false;
  const deckClasses = ['is-active','is-prev','is-next','is-far-prev','is-far-next','is-back-prev','is-back-next','is-deck-hidden'];

  function circularOffset(index, current, length) {
    const forward = (index - current + length) % length;
    if (forward === 0) return 0;
    return forward <= length / 2 ? forward : forward - length;
  }

  function deckClassForOffset(offset) {
    if (offset === 0) return 'is-active';
    if (offset === -1) return 'is-prev';
    if (offset === 1) return 'is-next';
    if (offset === -2) return 'is-far-prev';
    if (offset === 2) return 'is-far-next';
    if (offset === -3) return 'is-back-prev';
    if (offset === 3) return 'is-back-next';
    return 'is-deck-hidden';
  }

  function setGallerySlide(nextIndex, restartAutoplay = true) {
    if (!gallerySlides.length || !galleryTrack) return;
    galleryIndex = (nextIndex + gallerySlides.length) % gallerySlides.length;
    gallerySlides.forEach((slide, index) => {
      deckClasses.forEach((className) => slide.classList.remove(className));
      const offset = circularOffset(index, galleryIndex, gallerySlides.length);
      const positionClass = deckClassForOffset(offset);
      slide.classList.add(positionClass);
      const active = offset === 0;
      slide.setAttribute('aria-hidden', String(Math.abs(offset) > 0));
      slide.tabIndex = active ? 0 : -1;
      slide.setAttribute('aria-current', String(active));
      const image = slide.querySelector('img');
      if (image) {
        // Carga la foto protagonista y las tarjetas próximas; el resto queda diferido.
        if (Math.abs(offset) <= 2 && galleryIsVisible) image.loading = 'eager';
        else image.loading = 'lazy';
        if (active && galleryCarousel?.classList.contains('is-visible')) {
          image.style.animation = 'none';
          void image.offsetWidth;
          image.style.animation = '';
        }
      }
    });
    galleryDots.forEach((dot, index) => {
      const active = index === galleryIndex;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', String(active));
    });
    if (galleryStatus) galleryStatus.textContent = `Fotografía ${galleryIndex + 1} de ${gallerySlides.length} · Desliza para recorrer`;
    if (restartAutoplay) restartGalleryAutoplay();
  }

  function stopGalleryAutoplay() {
    window.clearInterval(galleryTimer);
    galleryTimer = null;
  }

  function startGalleryAutoplay() {
    if (gallerySlides.length < 2 || !galleryIsVisible || document.hidden || !lightboxIsClosed()) return;
    stopGalleryAutoplay();
    galleryTimer = window.setInterval(() => setGallerySlide(galleryIndex + 1, false), 4300);
  }

  function lightboxIsClosed() {
    const box = document.getElementById('lightbox');
    return !box || box.hidden;
  }

  function restartGalleryAutoplay() {
    stopGalleryAutoplay();
    startGalleryAutoplay();
  }

  if (gallerySlides.length) {
    if (galleryDotsContainer) {
      const dotFragment = document.createDocumentFragment();
      gallerySlides.forEach((slide, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'gallery-dot';
        dot.dataset.galleryIndex = String(index);
        dot.setAttribute('aria-label', `Mostrar fotografía ${index + 1} de ${gallerySlides.length}`);
        dotFragment.appendChild(dot);
      });
      galleryDotsContainer.replaceChildren(dotFragment);
      galleryDots = Array.from(galleryDotsContainer.querySelectorAll('.gallery-dot'));
      galleryDotsContainer.addEventListener('click', (event) => {
        const dot = event.target.closest('.gallery-dot');
        if (dot && galleryDotsContainer.contains(dot)) {
          setGallerySlide(Number(dot.dataset.galleryIndex) || 0);
        }
      });
    }
    setGallerySlide(0, false);
    galleryPrev?.addEventListener('click', () => setGallerySlide(galleryIndex - 1));
    galleryNext?.addEventListener('click', () => setGallerySlide(galleryIndex + 1));

    galleryViewport?.addEventListener('pointerdown', (event) => {
      galleryPointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    }, { passive: true });
    galleryViewport?.addEventListener('pointerup', (event) => {
      if (!galleryPointerStart || galleryPointerStart.id !== event.pointerId) return;
      const dx = event.clientX - galleryPointerStart.x;
      const dy = event.clientY - galleryPointerStart.y;
      galleryPointerStart = null;
      if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 1.08) {
        suppressGalleryClick = true;
        window.setTimeout(() => { suppressGalleryClick = false; }, 450);
        setGallerySlide(galleryIndex + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });
    galleryViewport?.addEventListener('pointercancel', () => { galleryPointerStart = null; }, { passive: true });

    if ('IntersectionObserver' in window && galleryCarousel) {
      const galleryObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          galleryIsVisible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
          galleryCarousel.classList.toggle('is-visible', galleryIsVisible);
          if (galleryIsVisible) {
            gallerySlides.forEach((slide, index) => {
              const offset = circularOffset(index, galleryIndex, gallerySlides.length);
              if (Math.abs(offset) <= 2) {
                const image = slide.querySelector('img');
                if (image) image.loading = 'eager';
              }
            });
            startGalleryAutoplay();
          } else {
            stopGalleryAutoplay();
          }
        });
      }, { threshold: [0, 0.2, 0.4] });
      galleryObserver.observe(galleryCarousel);
    } else {
      galleryIsVisible = true;
      galleryCarousel?.classList.add('is-visible');
      startGalleryAutoplay();
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopGalleryAutoplay();
      else startGalleryAutoplay();
    });
  }

  // Carrusel Pre Quince: utiliza el mismo mazo 3D y conserva los 15 espacios bloqueados.
  const prexvCarousel = document.getElementById('prexvCarousel');
  const prexvViewport = document.getElementById('prexvViewport');
  const prexvTrack = document.getElementById('prexvGalleryTrack');
  const prexvSlides = prexvTrack ? Array.from(prexvTrack.querySelectorAll('.prexv-photo-slot')) : [];
  const prexvPrev = document.getElementById('prexvPrev');
  const prexvNext = document.getElementById('prexvNext');
  const prexvDotsContainer = document.getElementById('prexvDots');
  const prexvStatus = document.getElementById('prexvStatus');
  let prexvDots = [];
  let prexvIndex = 0;
  let prexvTimer = null;
  let prexvVisible = false;
  let prexvPointerStart = null;

  function setPrexvSlide(nextIndex, restartAutoplay = true) {
    if (!prexvSlides.length) return;
    prexvIndex = (nextIndex + prexvSlides.length) % prexvSlides.length;
    prexvSlides.forEach((slide, index) => {
      deckClasses.forEach((className) => slide.classList.remove(className));
      const offset = circularOffset(index, prexvIndex, prexvSlides.length);
      slide.classList.add(deckClassForOffset(offset));
      const active = offset === 0;
      slide.setAttribute('aria-hidden', String(!active));
      slide.tabIndex = active ? 0 : -1;
      const image = slide.querySelector('img');
      if (image) image.loading = Math.abs(offset) <= 2 && prexvVisible ? 'eager' : 'lazy';
    });
    prexvDots.forEach((dot, index) => {
      dot.classList.toggle('is-active', index === prexvIndex);
      dot.setAttribute('aria-current', String(index === prexvIndex));
    });
    if (prexvStatus) prexvStatus.textContent = `Espacio ${prexvIndex + 1} de ${prexvSlides.length} · Galería próximamente`;
    if (restartAutoplay) restartPrexvAutoplay();
  }

  function stopPrexvAutoplay() {
    window.clearInterval(prexvTimer);
    prexvTimer = null;
  }

  function startPrexvAutoplay() {
    if (prexvSlides.length < 2 || !prexvVisible || document.hidden) return;
    stopPrexvAutoplay();
    prexvTimer = window.setInterval(() => setPrexvSlide(prexvIndex + 1, false), 4300);
  }

  function restartPrexvAutoplay() {
    stopPrexvAutoplay();
    startPrexvAutoplay();
  }

  if (prexvSlides.length) {
    if (prexvDotsContainer) {
      const fragment = document.createDocumentFragment();
      prexvSlides.forEach((slide, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'prexv-dot';
        dot.dataset.prexvIndex = String(index);
        dot.setAttribute('aria-label', `Mostrar espacio Pre Quince ${index + 1}`);
        fragment.appendChild(dot);
      });
      prexvDotsContainer.replaceChildren(fragment);
      prexvDots = Array.from(prexvDotsContainer.querySelectorAll('.prexv-dot'));
      prexvDotsContainer.addEventListener('click', (event) => {
        const dot = event.target.closest('.prexv-dot');
        if (dot && prexvDotsContainer.contains(dot)) setPrexvSlide(Number(dot.dataset.prexvIndex) || 0);
      });
    }
    setPrexvSlide(0, false);
    prexvPrev?.addEventListener('click', () => setPrexvSlide(prexvIndex - 1));
    prexvNext?.addEventListener('click', () => setPrexvSlide(prexvIndex + 1));
    prexvViewport?.addEventListener('pointerdown', (event) => {
      prexvPointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    }, { passive: true });
    prexvViewport?.addEventListener('pointerup', (event) => {
      if (!prexvPointerStart || prexvPointerStart.id !== event.pointerId) return;
      const dx = event.clientX - prexvPointerStart.x;
      const dy = event.clientY - prexvPointerStart.y;
      prexvPointerStart = null;
      if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 1.08) {
        setPrexvSlide(prexvIndex + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });
    prexvViewport?.addEventListener('pointercancel', () => { prexvPointerStart = null; }, { passive: true });
    prexvSlides.forEach((slide, index) => {
      slide.addEventListener('click', () => {
        if (!slide.classList.contains('is-active')) setPrexvSlide(index);
      });
    });
    if ('IntersectionObserver' in window && prexvCarousel) {
      const prexvObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          prexvVisible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
          prexvCarousel.classList.toggle('is-visible', prexvVisible);
          if (prexvVisible) startPrexvAutoplay();
          else stopPrexvAutoplay();
        });
      }, { threshold: [0, 0.2, 0.4] });
      prexvObserver.observe(prexvCarousel);
    } else {
      prexvVisible = true;
      startPrexvAutoplay();
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopPrexvAutoplay();
      else startPrexvAutoplay();
    });
  }

  // Lightbox ampliado: mantiene el zoom y permite deslizar entre las fotografías.
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCounter = document.getElementById('lightboxCounter');
  const closeLightbox = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  let lightboxPointerStart = null;

  function setLightboxSlide(nextIndex) {
    if (!gallerySlides.length || !lightboxImage) return;
    setGallerySlide(nextIndex, false);
    const activeSlide = gallerySlides[galleryIndex];
    const source = activeSlide?.dataset.full || activeSlide?.querySelector('img')?.src;
    const thumbnail = activeSlide?.querySelector('img');
    if (!source) return;

    lightboxImage.style.animation = 'none';
    lightboxImage.src = source;
    lightboxImage.alt = thumbnail?.alt || `Fotografía ${galleryIndex + 1} de Nicole`;
    void lightboxImage.offsetWidth;
    lightboxImage.style.animation = '';
    if (lightboxCounter) lightboxCounter.textContent = `${galleryIndex + 1} / ${gallerySlides.length}`;
  }

  function openGallery(index) {
    if (!lightbox || !lightboxImage) return;
    stopGalleryAutoplay();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    setLightboxSlide(index);
    closeLightbox?.focus({ preventScroll: true });
  }

  gallerySlides.forEach((button, index) => {
    button.addEventListener('click', (event) => {
      if (suppressGalleryClick) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (button.classList.contains('is-active')) openGallery(index);
      else setGallerySlide(index);
    });
  });

  function navigateLightbox(direction) {
    if (!lightbox || lightbox.hidden) return;
    setLightboxSlide(galleryIndex + direction);
  }
  lightboxPrev?.addEventListener('click', () => navigateLightbox(-1));
  lightboxNext?.addEventListener('click', () => navigateLightbox(1));

  function closeGallery() {
    if (!lightbox) return;
    lightbox.hidden = true;
    if (lightboxImage) {
      lightboxImage.src = '';
      lightboxImage.style.animation = '';
    }
    document.body.style.overflow = '';
    gallerySlides[galleryIndex]?.focus({ preventScroll: true });
    startGalleryAutoplay();
  }
  closeLightbox?.addEventListener('click', closeGallery);
  lightbox?.addEventListener('click', (event) => {
    if (event.target === lightbox) closeGallery();
  });

  // Gesto horizontal en pantalla completa: deslizar a la izquierda/derecha cambia la foto.
  lightbox?.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    lightboxPointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }, { passive: true });
  lightbox?.addEventListener('pointerup', (event) => {
    if (!lightboxPointerStart || lightboxPointerStart.id !== event.pointerId) return;
    const dx = event.clientX - lightboxPointerStart.x;
    const dy = event.clientY - lightboxPointerStart.y;
    lightboxPointerStart = null;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.12) {
      navigateLightbox(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
  lightbox?.addEventListener('pointercancel', () => { lightboxPointerStart = null; }, { passive: true });

  document.addEventListener('keydown', (event) => {
    if (!lightbox || lightbox.hidden) return;
    if (event.key === 'Escape') closeGallery();
    else if (event.key === 'ArrowLeft') navigateLightbox(-1);
    else if (event.key === 'ArrowRight') navigateLightbox(1);
  });



  // La galería Pre Quince se mantiene visualmente bloqueada con 15 espacios vacíos.
  // Cuando se carguen las fotografías, se sustituirán los espacios por imágenes reales.

  // Personalización por enlace: invitación familiar (?familia=...) o pase personal (?pase=personal&invitado=...).
  // El contenido se inserta con textContent para evitar interpretar HTML.
  const familyParams = new URLSearchParams(window.location.search);
  const rawFamilyName = familyParams.get('familia');
  const rawPassType = familyParams.get('pase');
  const rawInviteeName = familyParams.get('invitado');
  const familyGreeting = document.getElementById('familyGreeting');
  const familyGreetingEyebrow = document.getElementById('familyGreetingEyebrow');
  const familyGreetingName = document.getElementById('familyGreetingName');
  const familyGreetingCopy = document.getElementById('familyGreetingCopy');
  const personalPassBadge = document.getElementById('personalPassBadge');
  const cleanInvitationName = (value) => String(value || '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 70);

  if (rawPassType === 'personal' && familyGreeting && familyGreetingName) {
    const inviteeName = cleanInvitationName(rawInviteeName);
    if (familyGreetingEyebrow) familyGreetingEyebrow.textContent = 'INVITACIÓN PERSONAL';
    familyGreetingName.textContent = inviteeName || 'Pase personal';
    if (personalPassBadge) personalPassBadge.hidden = false;
    if (familyGreetingCopy) familyGreetingCopy.textContent = 'Este pase es personal. Nos encantará compartir contigo esta celebración tan especial.';
    familyGreeting.classList.add('is-personal-pass');
    familyGreeting.hidden = false;
    document.title = `${inviteeName ? inviteeName + ' · ' : ''}Pase personal · XV años de Nicole`;
  } else if (rawFamilyName && familyGreeting && familyGreetingName) {
    const safeFamilyName = cleanInvitationName(rawFamilyName);
    if (safeFamilyName) {
      familyGreetingName.textContent = safeFamilyName;
      familyGreeting.hidden = false;
      document.title = `${safeFamilyName} · Invitación a los XV años de Nicole`;
    }
  }

  // Generador local de enlaces. No requiere Google Apps Script ni base de datos.
  // IMPORTANTE: al estar en una web estática, esta contraseña es una barrera visual,
  // no autenticación segura; puede descubrirse inspeccionando el código del navegador.
  const FAMILY_LINK_ACCESS_CODE = '12345';
  const familyAdminToggle = document.getElementById('familyAdminToggle');
  const familyAdminPanel = document.getElementById('familyAdminPanel');
  const familyPasswordStep = document.getElementById('familyPasswordStep');
  const familyGeneratorStep = document.getElementById('familyGeneratorStep');
  const familyPasswordForm = document.getElementById('familyPasswordForm');
  const familyAdminPassword = document.getElementById('familyAdminPassword');
  const familyPasswordError = document.getElementById('familyPasswordError');
  const familyLinkForm = document.getElementById('familyLinkForm');
  const familyNameInput = document.getElementById('familyNameInput');
  const invitationLinkType = document.getElementById('invitationLinkType');
  const familyNameLabel = document.getElementById('familyNameLabel');
  const familyGeneratedLinkLabel = document.getElementById('familyGeneratedLinkLabel');
  const familyLinkResult = document.getElementById('familyLinkResult');
  const familyGeneratedLink = document.getElementById('familyGeneratedLink');
  const familyCopyLink = document.getElementById('familyCopyLink');
  const familyCopyFeedback = document.getElementById('familyCopyFeedback');
  const familyNewLink = document.getElementById('familyNewLink');
  const familyPublicUrlWrap = document.getElementById('familyPublicUrlWrap');
  const familyPublicUrlInput = document.getElementById('familyPublicUrl');
  const familyPublicUrlError = document.getElementById('familyPublicUrlError');
  const FAMILY_PUBLIC_URL_STORAGE_KEY = 'nicoleXvPublicBaseUrl';
  const needsPublicBaseUrl = window.location.protocol !== 'https:';

  // Un archivo abierto desde file:// no tiene una dirección compartible.
  // En ese caso solicitamos la URL pública de GitHub Pages una sola vez.
  if (familyPublicUrlWrap) {
    familyPublicUrlWrap.hidden = !needsPublicBaseUrl;
  }
  if (needsPublicBaseUrl && familyPublicUrlInput) {
    try {
      familyPublicUrlInput.value = localStorage.getItem(FAMILY_PUBLIC_URL_STORAGE_KEY) || '';
    } catch (_) {
      // Si el navegador bloquea localStorage, el usuario aún puede pegar la URL manualmente.
    }
  }

  if (familyAdminToggle && familyAdminPanel) {
    familyAdminToggle.addEventListener('click', () => {
      const willOpen = familyAdminPanel.hidden;
      familyAdminPanel.hidden = !willOpen;
      familyAdminToggle.setAttribute('aria-expanded', String(willOpen));
      if (willOpen && familyPasswordStep && !familyPasswordStep.hidden) {
        window.setTimeout(() => familyAdminPassword?.focus({ preventScroll: true }), 80);
      }
    });
  }

  if (familyPasswordForm && familyAdminPassword && familyGeneratorStep && familyPasswordStep) {
    familyPasswordForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (familyAdminPassword.value === FAMILY_LINK_ACCESS_CODE) {
        familyPasswordError.hidden = true;
        familyPasswordStep.hidden = true;
        familyGeneratorStep.hidden = false;
        window.setTimeout(() => familyNameInput?.focus({ preventScroll: true }), 80);
      } else {
        familyPasswordError.hidden = false;
        familyAdminPassword.select();
      }
    });
  }

  function updateInvitationLinkTypeUI() {
    const personalMode = invitationLinkType?.value === 'personal';
    if (familyNameLabel) familyNameLabel.textContent = personalMode ? 'Nombre del invitado' : 'Nombre de la familia';
    if (familyNameInput) familyNameInput.placeholder = personalMode ? 'Ej. Jorge Isaac Arreola' : 'Ej. Familia Arreola';
    if (familyGeneratedLinkLabel) familyGeneratedLinkLabel.textContent = personalMode ? 'Enlace de pase personal' : 'Enlace de invitación familiar';
    const title = familyGeneratorStep?.querySelector('.family-admin-title');
    if (title) title.textContent = personalMode ? 'Crear pase personal' : 'Crear invitación por familia';
  }
  invitationLinkType?.addEventListener('change', updateInvitationLinkTypeUI);
  updateInvitationLinkTypeUI();

  if (familyLinkForm && familyNameInput && familyGeneratedLink && familyLinkResult) {
    familyLinkForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const familyName = familyNameInput.value
        .replace(/[<>]/g, '')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 70);

      if (!familyName) {
        familyNameInput.focus();
        return;
      }

      let personalizedUrl;

      if (needsPublicBaseUrl) {
        // Nunca crear ni copiar enlaces file:///C:/...: solo funcionan en esta computadora.
        const publicBaseText = familyPublicUrlInput?.value.trim() || '';
        if (!publicBaseText) {
          if (familyPublicUrlError) {
            familyPublicUrlError.textContent = 'Primero pega la dirección pública de GitHub Pages. Los enlaces file:/// o localhost no se pueden compartir.';
            familyPublicUrlError.hidden = false;
          }
          familyPublicUrlInput?.focus();
          return;
        }

        try {
          const publicBase = new URL(publicBaseText);
          if (publicBase.protocol !== 'https:') {
            throw new Error('La dirección debe comenzar con https://');
          }
          publicBase.search = '';
          publicBase.hash = '';
          publicBase.pathname = publicBase.pathname.replace(/index\.html?$/i, '');
          if (!publicBase.pathname.endsWith('/')) publicBase.pathname += '/';
          personalizedUrl = publicBase;
          try { localStorage.setItem(FAMILY_PUBLIC_URL_STORAGE_KEY, publicBase.href); } catch (_) {}
        } catch (error) {
          if (familyPublicUrlError) {
            familyPublicUrlError.textContent = 'La dirección no parece válida. Usa la URL HTTPS que muestra GitHub Pages.';
            familyPublicUrlError.hidden = false;
          }
          familyPublicUrlInput?.focus();
          return;
        }
      } else {
        // Cuando la invitación ya está publicada, toma su dirección HTTPS real.
        personalizedUrl = new URL(window.location.href);
        personalizedUrl.search = '';
        personalizedUrl.hash = '';
      }

      if (familyPublicUrlError) familyPublicUrlError.hidden = true;
      personalizedUrl.searchParams.delete('preview');
      personalizedUrl.searchParams.delete('familia');
      personalizedUrl.searchParams.delete('pase');
      personalizedUrl.searchParams.delete('invitado');
      if (invitationLinkType?.value === 'personal') {
        personalizedUrl.searchParams.set('pase', 'personal');
        personalizedUrl.searchParams.set('invitado', familyName);
      } else {
        personalizedUrl.searchParams.set('familia', familyName);
      }
      familyGeneratedLink.value = personalizedUrl.toString();
      familyLinkResult.hidden = false;
      if (familyCopyFeedback) {
        familyCopyFeedback.textContent = 'Enlace público generado. Ya puedes copiarlo y compartirlo por WhatsApp.';
      }
    });
  }

  async function copyFamilyLink() {
    if (!familyGeneratedLink) return;
    const textToCopy = familyGeneratedLink.value;
    let copied = false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
        copied = true;
      }
    } catch (error) {
      console.warn('El portapapeles moderno no estuvo disponible; se usará el método alternativo.', error);
    }

    if (!copied) {
      const helper = document.createElement('textarea');
      helper.value = textToCopy;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      helper.style.pointerEvents = 'none';
      document.body.appendChild(helper);
      helper.select();
      try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
      helper.remove();
    }

    if (familyCopyFeedback) {
      familyCopyFeedback.textContent = copied
        ? '¡Enlace copiado! Ya puedes pegarlo en WhatsApp.'
        : 'No se pudo copiar automáticamente. Mantén presionado el enlace para copiarlo.';
    }
    if (!copied) {
      familyGeneratedLink.focus();
      familyGeneratedLink.select();
    }
  }

  familyCopyLink?.addEventListener('click', copyFamilyLink);
  familyNewLink?.addEventListener('click', () => {
    if (familyNameInput) {
      familyNameInput.value = '';
      familyNameInput.focus();
    }
    if (familyLinkResult) familyLinkResult.hidden = true;
    if (familyCopyFeedback) familyCopyFeedback.textContent = '';
  });

  // Registro local: una persona por cada confirmación afirmativa.
  // Las respuestas llegan por WhatsApp y se capturan manualmente en este navegador.
  const ATTENDANCE_STORAGE_KEY = 'nicoleXvAttendanceRegister_v1';
  const attendanceForm = document.getElementById('attendanceAdminForm');
  const attendanceNameInput = document.getElementById('attendanceAdminName');
  const attendanceStatusInput = document.getElementById('attendanceAdminStatus');
  const attendanceFeedback = document.getElementById('attendanceAdminFeedback');
  const attendanceList = document.getElementById('attendanceRecordList');
  const attendanceResponses = document.getElementById('attendanceResponses');
  const attendanceGuests = document.getElementById('attendanceGuests');
  const attendanceDeclines = document.getElementById('attendanceDeclines');
  const attendanceListCount = document.getElementById('attendanceListCount');
  const attendanceExport = document.getElementById('attendanceExportTxt');
  const attendanceClear = document.getElementById('attendanceClearAll');
  let attendanceRecords = [];

  function loadAttendanceRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY) || '[]');
      attendanceRecords = Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.name === 'string') : [];
    } catch (_) {
      attendanceRecords = [];
    }
  }

  function saveAttendanceRecords() {
    try {
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendanceRecords));
      if (attendanceFeedback) attendanceFeedback.textContent = 'Registro guardado en este navegador.';
    } catch (_) {
      if (attendanceFeedback) attendanceFeedback.textContent = 'No se pudo guardar. Revisa el almacenamiento del navegador.';
    }
  }

  function renderAttendanceRecords() {
    if (!attendanceList) return;
    attendanceList.replaceChildren();
    const yesRecords = attendanceRecords.filter((item) => item.status === 'yes');
    const noRecords = attendanceRecords.filter((item) => item.status === 'no');
    // Una confirmación afirmativa equivale a una persona; no se capturan acompañantes.
    const guestTotal = yesRecords.length;
    if (attendanceResponses) attendanceResponses.textContent = String(attendanceRecords.length);
    if (attendanceGuests) attendanceGuests.textContent = String(guestTotal);
    if (attendanceDeclines) attendanceDeclines.textContent = String(noRecords.length);
    if (attendanceListCount) attendanceListCount.textContent = `${attendanceRecords.length} ${attendanceRecords.length === 1 ? 'registro' : 'registros'}`;

    if (!attendanceRecords.length) {
      const empty = document.createElement('li');
      empty.className = 'attendance-empty';
      empty.textContent = 'Todavía no hay respuestas capturadas.';
      attendanceList.appendChild(empty);
      return;
    }

    attendanceRecords.forEach((record) => {
      const item = document.createElement('li');
      item.className = 'attendance-record';
      const detail = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = record.name;
      const meta = document.createElement('small');
      meta.textContent = record.status === 'yes' ? 'Confirmó asistencia · 1 persona' : 'No podrá asistir';
      detail.append(name, meta);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Eliminar registro de ${record.name}`);
      remove.addEventListener('click', () => {
        attendanceRecords = attendanceRecords.filter((entry) => entry.id !== record.id);
        saveAttendanceRecords();
        renderAttendanceRecords();
      });
      item.append(detail, remove);
      attendanceList.appendChild(item);
    });
  }

  if (attendanceForm && attendanceNameInput && attendanceStatusInput) {
    loadAttendanceRecords();
    renderAttendanceRecords();
    attendanceForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = attendanceNameInput.value.trim().replace(/\s+/g, ' ');
      const status = attendanceStatusInput.value === 'no' ? 'no' : 'yes';
      if (name.split(' ').length < 2 || name.length < 5) {
        if (attendanceFeedback) attendanceFeedback.textContent = 'Captura el nombre completo.';
        attendanceNameInput.focus();
        return;
      }
      attendanceRecords.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        name,
        status,
        createdAt: new Date().toISOString()
      });
      saveAttendanceRecords();
      renderAttendanceRecords();
      attendanceForm.reset();
    });
  }

  attendanceExport?.addEventListener('click', () => {
    const yesRecords = attendanceRecords.filter((item) => item.status === 'yes');
    const noRecords = attendanceRecords.filter((item) => item.status === 'no');
    const lines = [
      'XV AÑOS DE NICOLE ROA BARRAGÁN',
      'CONTROL DE ASISTENCIA',
      `Respuestas registradas: ${attendanceRecords.length}`,
      `Personas que asistirán: ${yesRecords.length}`,
      `Respuestas de no asistencia: ${noRecords.length}`,
      '',
      'DETALLE:'
    ];
    attendanceRecords.forEach((item, index) => {
      const status = item.status === 'yes' ? 'Confirmó asistencia · 1 persona' : 'No podrá asistir';
      lines.push(`${index + 1}. ${item.name} — ${status}`);
    });
    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Nicole_XV_Control_de_Asistencia.txt';
    link.click();
    URL.revokeObjectURL(url);
  });

  attendanceClear?.addEventListener('click', () => {
    if (!attendanceRecords.length) return;
    if (!window.confirm('¿Deseas borrar todos los registros de asistencia guardados en este navegador?')) return;
    attendanceRecords = [];
    saveAttendanceRecords();
    renderAttendanceRecords();
    if (attendanceFeedback) attendanceFeedback.textContent = 'Se borraron los registros locales.';
  });
})();
