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
    const petalCount = window.matchMedia('(max-width: 700px)').matches ? 4 : 6;
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

  // Confirmación de asistencia conectada a Google Apps Script.
  const rsvpYes = document.getElementById('rsvpYes');
  const rsvpNo = document.getElementById('rsvpNo');
  const rsvpForm = document.getElementById('rsvpForm');
  const rsvpName = document.getElementById('rsvpName');
  const rsvpFeedback = document.getElementById('rsvpFeedback');
  const rsvpAttendeesWrap = document.getElementById('rsvpAttendeesWrap');
  const rsvpAttendees = document.getElementById('rsvpAttendees');
  const rsvpSubmitButton = document.getElementById('rsvpSubmitButton');
  const familyParamsForRsvp = new URLSearchParams(window.location.search);
  const RSVP_WEB_APP_URL = String(window.NICOLE_RSVP_CONFIG?.webAppUrl || '').trim();
  const DEFAULT_WHATSAPP = '522288560974';
  let rsvpStatus = 'yes';
  let activeInvitation = {
    id: familyParamsForRsvp.get('inv') || '',
    name: familyParamsForRsvp.get('familia') || '',
    type: familyParamsForRsvp.get('pase') === 'personal' ? 'personal' : 'family',
    passes: Number.parseInt(familyParamsForRsvp.get('pases') || '', 10) || (familyParamsForRsvp.get('pase') === 'personal' ? 1 : null)
  };
  let rsvpWhatsApp = DEFAULT_WHATSAPP;
  let rsvpWhatsAppMessage = 'Hola Sheylla, te comparto mi confirmación de asistencia a los XV años de Nicole.';
  function formatRsvpPhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('52')) return `+52 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    return digits ? `+${digits}` : '';
  }

  function jsonpRequest(params, timeoutMs = 12000) {
    if (!RSVP_WEB_APP_URL) return Promise.reject(new Error('Falta configurar la URL de Google Apps Script.'));
    return new Promise((resolve, reject) => {
      const callbackName = `__nicoleJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const query = new URLSearchParams({ ...params, callback: callbackName, _: String(Date.now()) });
      let settled = false;
      const cleanup = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        script.remove();
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      };
      const timer = window.setTimeout(() => { cleanup(); reject(new Error('El servicio de confirmaciones no respondió.')); }, timeoutMs);
      window[callbackName] = (data) => { cleanup(); resolve(data); };
      script.onerror = () => { cleanup(); reject(new Error('No se pudo conectar con el servicio de confirmaciones.')); };
      script.src = `${RSVP_WEB_APP_URL}${RSVP_WEB_APP_URL.includes('?') ? '&' : '?'}${query.toString()}`;
      document.head.appendChild(script);
    });
  }

  async function postRsvpData(payload) {
    if (!RSVP_WEB_APP_URL) throw new Error('El servicio de confirmaciones todavía no está configurado.');
    const body = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => body.set(key, String(value ?? '')));
    // Apps Script recibe el formulario; no se expone ninguna credencial en la URL.
    await fetch(RSVP_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString()
    });
  }

  function makeClientId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }

  function openWhatsAppConfirmation(name, status, attendees) {
    const family = activeInvitation.type === 'personal' ? '' : (activeInvitation.name || familyParamsForRsvp.get('familia') || '');
    const passes = Number(activeInvitation.passes || familyParamsForRsvp.get('pases') || 0);
    const result = status === 'yes' ? `Confirmo mi asistencia. Asistiremos ${attendees} ${attendees === 1 ? 'persona' : 'personas'}.` : 'Lamentablemente no podré asistir.';
    const message = `${rsvpWhatsAppMessage}\nNombre: ${name}.${family ? `\nInvitación: ${family}.` : ''}${passes ? `\nPases asignados: ${passes}.` : ''}\n${result}`;
    const link = document.createElement('a');
    link.href = `https://wa.me/${rsvpWhatsApp}?text=${encodeURIComponent(message)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function configureAttendeeOptions(maxPasses) {
    if (!rsvpAttendees) return;
    const max = Number.isInteger(maxPasses) && maxPasses > 0 ? Math.min(maxPasses, 30) : 0;
    rsvpAttendees.replaceChildren();
    for (let count = 1; count <= max; count += 1) {
      const option = document.createElement('option');
      option.value = String(count);
      option.textContent = `${count} ${count === 1 ? 'persona' : 'personas'}`;
      rsvpAttendees.appendChild(option);
    }
    rsvpAttendees.disabled = max === 0;
    const note = rsvpAttendeesWrap?.querySelector('.rsvp-form-note');
    if (note) note.textContent = max === 0 ? 'La persona organizadora todavía debe asignar los pases a esta invitación.' : `Puedes confirmar hasta ${max} ${max === 1 ? 'persona' : 'personas'}.`;
  }

  function showRsvpForm(status) {
    rsvpStatus = status;
    if (rsvpFeedback) rsvpFeedback.hidden = true;
    if (rsvpForm) rsvpForm.hidden = false;
    if (rsvpAttendeesWrap) rsvpAttendeesWrap.hidden = status !== 'yes';
    if (rsvpSubmitButton) rsvpSubmitButton.textContent = status === 'yes' ? 'GUARDAR Y CONTINUAR A WHATSAPP' : 'REGISTRAR QUE NO ASISTIRÉ';
    rsvpYes?.setAttribute('aria-pressed', String(status === 'yes'));
    rsvpNo?.setAttribute('aria-pressed', String(status === 'no'));
    window.setTimeout(() => rsvpName?.focus({ preventScroll: true }), 80);
  }

  async function loadRsvpPublicConfig() {
    configureAttendeeOptions(activeInvitation.passes);
    if (!RSVP_WEB_APP_URL) return;
    try {
      const invitationData = await jsonpRequest({
        action: 'getInvite',
        inv: activeInvitation.id,
        family: familyParamsForRsvp.get('familia') || '',
        passType: familyParamsForRsvp.get('pase') || ''
      });
      if (invitationData?.ok && invitationData.invite) {
        activeInvitation = invitationData.invite;
        configureAttendeeOptions(activeInvitation.passes);
        const greetingName = document.getElementById('familyGreetingName');
        const passBadge = document.getElementById('familyPassCountBadge');
        const passValue = document.getElementById('familyPassCountValue');
        const greeting = document.getElementById('familyGreeting');
        if (activeInvitation.type === 'family' && greetingName && activeInvitation.name) {
          greetingName.textContent = activeInvitation.name;
          greetingName.hidden = false;
          if (greeting) greeting.hidden = false;
          if (Number(activeInvitation.passes) > 0 && passBadge && passValue) {
            passValue.textContent = String(activeInvitation.passes);
            passBadge.hidden = false;
          } else if (passBadge) passBadge.hidden = true;
        }
      }
      const config = await jsonpRequest({ action: 'publicConfig' });
      if (config?.ok) {
        rsvpWhatsApp = String(config.settings?.whatsapp || DEFAULT_WHATSAPP).replace(/\D/g, '') || DEFAULT_WHATSAPP;
        rsvpWhatsAppMessage = String(config.settings?.message || rsvpWhatsAppMessage);
        const publicPhone = document.getElementById('rsvpContactNumber');
        if (publicPhone) publicPhone.textContent = formatRsvpPhone(rsvpWhatsApp);
      }
    } catch (error) {
      console.warn('No se pudo cargar la configuración de RSVP:', error);
    }
  }

  rsvpYes?.addEventListener('click', () => showRsvpForm('yes'));
  rsvpNo?.addEventListener('click', () => showRsvpForm('no'));

  if (rsvpForm && rsvpName) {
    rsvpForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const guestName = rsvpName.value.trim().replace(/\s+/g, ' ');
      if (guestName.split(' ').length < 2 || guestName.length < 5) {
        rsvpFeedback.textContent = 'Escribe tu nombre y apellidos para registrar tu respuesta.';
        rsvpFeedback.hidden = false;
        rsvpName.focus();
        return;
      }
      if (!activeInvitation.id && !activeInvitation.name && activeInvitation.type !== 'personal') {
        rsvpFeedback.textContent = 'No se pudo identificar esta invitación. Abre el enlace personalizado que te enviaron.';
        rsvpFeedback.hidden = false;
        return;
      }
      const attendees = rsvpStatus === 'yes' ? Number.parseInt(rsvpAttendees?.value || '0', 10) : 0;
      const maxPasses = Number(activeInvitation.passes || 0);
      if (rsvpStatus === 'yes' && maxPasses < 1) {
        rsvpFeedback.textContent = 'Esta invitación todavía no tiene pases asignados. Por favor, comunícate con la persona que te invitó.';
        rsvpFeedback.hidden = false;
        return;
      }
      if (rsvpStatus === 'yes' && (!Number.isInteger(attendees) || attendees < 1 || attendees > maxPasses)) {
        rsvpFeedback.textContent = `La cantidad de asistentes no puede superar los ${maxPasses} pases disponibles.`;
        rsvpFeedback.hidden = false;
        return;
      }
      const responseId = makeClientId();
      const data = {
        action: 'saveRsvp',
        responseId,
        invitationId: activeInvitation.id,
        legacyFamily: activeInvitation.name || familyParamsForRsvp.get('familia') || '',
        passType: activeInvitation.type,
        guestName,
        status: rsvpStatus,
        attendees
      };
      const submit = rsvpSubmitButton;
      if (submit) { submit.disabled = true; submit.textContent = 'REGISTRANDO RESPUESTA…'; }
      try {
        await postRsvpData(data);
        let saved = false;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          await new Promise(resolve => window.setTimeout(resolve, 450));
          try {
            const check = await jsonpRequest({ action: 'checkResponse', responseId });
            if (check?.ok && check.exists) { saved = true; break; }
          } catch (_) {}
        }
        if (!saved) throw new Error('No pudimos verificar que la respuesta se guardara.');
        rsvpFeedback.textContent = rsvpStatus === 'yes'
          ? `¡Gracias, ${guestName}! Tu asistencia quedó registrada para ${attendees} ${attendees === 1 ? 'persona' : 'personas'}. Ahora puedes avisar a Sheylla por WhatsApp.`
          : `Gracias, ${guestName}. Tu respuesta quedó registrada. Ahora puedes avisar a Sheylla por WhatsApp.`;
        rsvpFeedback.hidden = false;
        openWhatsAppConfirmation(guestName, rsvpStatus, attendees);
        if (submit) submit.textContent = 'RESPUESTA REGISTRADA';
      } catch (error) {
        // Respaldo para no bloquear la comunicación durante la activación o ante una caída temporal del servicio.
        openWhatsAppConfirmation(guestName, rsvpStatus, attendees);
        rsvpFeedback.textContent = `No pudimos verificar el registro automático (${error.message}). Se abrió WhatsApp para avisar a Sheylla; ella tendrá que capturar esta respuesta manualmente en el panel.`;
        rsvpFeedback.hidden = false;
        if (submit) { submit.disabled = false; submit.textContent = rsvpStatus === 'yes' ? 'REINTENTAR CONFIRMACIÓN' : 'REINTENTAR REGISTRO'; }
      }
    });
  }
  loadRsvpPublicConfig();

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

  // Carrusel Pre Quince: utiliza el mismo mazo 3D y abre las fotografías en el visor ampliado.
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
  let suppressPrexvClick = false;

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
    if (prexvStatus) prexvStatus.textContent = `Fotografía ${prexvIndex + 1} de ${prexvSlides.length} · Desliza para recorrer`;
    if (restartAutoplay) restartPrexvAutoplay();
  }

  function stopPrexvAutoplay() {
    window.clearInterval(prexvTimer);
    prexvTimer = null;
  }

  function startPrexvAutoplay() {
    if (prexvSlides.length < 2 || !prexvVisible || document.hidden || !lightboxIsClosed()) return;
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
        dot.setAttribute('aria-label', `Mostrar fotografía Pre Quince ${index + 1} de ${prexvSlides.length}`);
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
        suppressPrexvClick = true;
        window.setTimeout(() => { suppressPrexvClick = false; }, 450);
        setPrexvSlide(prexvIndex + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });
    prexvViewport?.addEventListener('pointercancel', () => { prexvPointerStart = null; }, { passive: true });
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

  // El visor ampliado sirve a ambas galerías: infancia y sesión Pre Quince.
  const lightboxSets = {
    gallery: { slides: gallerySlides, getIndex: () => galleryIndex, setSlide: setGallerySlide, stop: stopGalleryAutoplay, start: startGalleryAutoplay },
    prexv: { slides: prexvSlides, getIndex: () => prexvIndex, setSlide: setPrexvSlide, stop: stopPrexvAutoplay, start: startPrexvAutoplay }
  };
  let lightboxSet = lightboxSets.gallery;

  function setLightboxSlide(nextIndex) {
    const { slides, getIndex, setSlide } = lightboxSet;
    if (!slides.length || !lightboxImage) return;
    setSlide(nextIndex, false);
    const currentIndex = getIndex();
    const activeSlide = slides[currentIndex];
    const source = activeSlide?.dataset.full || activeSlide?.querySelector('img')?.src;
    const thumbnail = activeSlide?.querySelector('img');
    if (!source) return;

    lightboxImage.style.animation = 'none';
    lightboxImage.src = source;
    lightboxImage.alt = thumbnail?.alt || `Fotografía ${currentIndex + 1} de Nicole`;
    void lightboxImage.offsetWidth;
    lightboxImage.style.animation = '';
    if (lightboxCounter) lightboxCounter.textContent = `${currentIndex + 1} / ${slides.length}`;
  }

  function openGallery(index, setName = 'gallery') {
    if (!lightbox || !lightboxImage) return;
    lightboxSet = lightboxSets[setName] || lightboxSets.gallery;
    stopGalleryAutoplay();
    stopPrexvAutoplay();
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

  prexvSlides.forEach((button, index) => {
    button.addEventListener('click', (event) => {
      if (suppressPrexvClick) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (button.classList.contains('is-active')) openGallery(index, 'prexv');
      else setPrexvSlide(index);
    });
  });

  function navigateLightbox(direction) {
    if (!lightbox || lightbox.hidden) return;
    setLightboxSlide(lightboxSet.getIndex() + direction);
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
    lightboxSet.slides[lightboxSet.getIndex()]?.focus({ preventScroll: true });
    startGalleryAutoplay();
    startPrexvAutoplay();
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




  // Personalización por enlace: invitación familiar (?familia=...) o pase personal (?pase=personal&invitado=...).
  // El contenido se inserta con textContent para evitar interpretar HTML.
  const familyParams = new URLSearchParams(window.location.search);
  const rawFamilyName = familyParams.get('familia');
  const rawPassType = familyParams.get('pase');
  const rawInviteeName = familyParams.get('invitado');
  const rawPassCount = Number.parseInt(familyParams.get('pases') || '', 10);
  const familyGreeting = document.getElementById('familyGreeting');
  const familyGreetingEyebrow = document.getElementById('familyGreetingEyebrow');
  const familyGreetingName = document.getElementById('familyGreetingName');
  const familyGreetingCopy = document.getElementById('familyGreetingCopy');
  const personalPassBadge = document.getElementById('personalPassBadge');
  const personalPassSingle = document.getElementById('personalPassSingle');
  const familyPassCountBadge = document.getElementById('familyPassCountBadge');
  const familyPassCountValue = document.getElementById('familyPassCountValue');
  const cleanInvitationName = (value) => String(value || '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 70);

  if (rawPassType === 'personal' && familyGreeting && familyGreetingName) {
    // Pase general para los jóvenes: no se personaliza con nombre y siempre representa una persona.
    if (familyGreetingEyebrow) familyGreetingEyebrow.textContent = 'INVITACIÓN ESPECIAL';
    familyGreetingName.textContent = '';
    familyGreetingName.hidden = true;
    if (personalPassBadge) personalPassBadge.hidden = false;
    if (personalPassSingle) personalPassSingle.hidden = false;
    if (familyPassCountBadge) familyPassCountBadge.hidden = true;
    if (familyGreetingCopy) familyGreetingCopy.textContent = 'Nos encantará que formes parte de esta celebración tan especial.';
    familyGreeting.classList.add('is-personal-pass');
    familyGreeting.hidden = false;
    document.title = 'Pase personal · XV años de Nicole';
  } else if (rawFamilyName && familyGreeting && familyGreetingName) {
    const safeFamilyName = cleanInvitationName(rawFamilyName);
    if (safeFamilyName) {
      familyGreetingName.textContent = safeFamilyName;
      familyGreetingName.hidden = false;
      if (personalPassBadge) personalPassBadge.hidden = true;
      if (personalPassSingle) personalPassSingle.hidden = true;
      if (Number.isInteger(rawPassCount) && rawPassCount > 0 && rawPassCount <= 30 && familyPassCountBadge && familyPassCountValue) {
        familyPassCountValue.textContent = String(rawPassCount);
        familyPassCountBadge.hidden = false;
      } else if (familyPassCountBadge) {
        familyPassCountBadge.hidden = true;
      }
      familyGreeting.hidden = false;
      document.title = `${safeFamilyName} · Invitación a los XV años de Nicole`;
    }
  }

  // Panel administrativo conectado a Google Apps Script / Google Sheets.
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
  const familyPersonalModeNote = document.getElementById('familyPersonalModeNote');
  const familyGeneratedLinkLabel = document.getElementById('familyGeneratedLinkLabel');
  const familyLinkResult = document.getElementById('familyLinkResult');
  const familyGeneratedLink = document.getElementById('familyGeneratedLink');
  const familyCopyLink = document.getElementById('familyCopyLink');
  const familyCopyFeedback = document.getElementById('familyCopyFeedback');
  const familyNewLink = document.getElementById('familyNewLink');
  const familyPublicUrlWrap = document.getElementById('familyPublicUrlWrap');
  const familyPublicUrlInput = document.getElementById('familyPublicUrl');
  const familyPublicUrlError = document.getElementById('familyPublicUrlError');
  const familyPassCountInput = document.getElementById('familyPassCountInput');
  const familyPassCountWrap = document.getElementById('familyPassCountWrap');
  const predefinedFamilyLinks = document.getElementById('predefinedFamilyLinks');
  const predefinedFamilyLinksFeedback = document.getElementById('predefinedFamilyLinksFeedback');
  const registeredFamilyCount = document.getElementById('registeredFamilyCount');
  const attendanceForm = document.getElementById('attendanceAdminForm');
  const attendanceNameInput = document.getElementById('attendanceAdminName');
  const attendanceStatusInput = document.getElementById('attendanceAdminStatus');
  const attendanceAttendeesInput = document.getElementById('attendanceAdminAttendees');
  const attendanceFeedback = document.getElementById('attendanceAdminFeedback');
  const attendanceList = document.getElementById('attendanceRecordList');
  const attendanceResponses = document.getElementById('attendanceResponses');
  const attendanceGuests = document.getElementById('attendanceGuests');
  const attendanceDeclines = document.getElementById('attendanceDeclines');
  const attendanceListCount = document.getElementById('attendanceListCount');
  const attendanceRefresh = document.getElementById('attendanceRefresh');
  const attendanceExportPdf = document.getElementById('attendanceExportPdf');
  const attendanceClear = document.getElementById('attendanceClearAll');
  const attendanceImportLegacy = document.getElementById('attendanceImportLegacy');
  const whatsappNumberInput = document.getElementById('adminWhatsAppNumber');
  const whatsappMessageInput = document.getElementById('adminWhatsAppMessage');
  const whatsappSettingsForm = document.getElementById('adminWhatsAppSettingsForm');
  const whatsappSettingsFeedback = document.getElementById('adminWhatsAppSettingsFeedback');
  const FAMILY_PUBLIC_URL_STORAGE_KEY = 'nicoleXvPublicBaseUrl';
  const ATTENDANCE_STORAGE_KEY = 'nicoleXvAttendanceRegister_v1';
  const EXTRA_FAMILY_LINKS_STORAGE_KEY = 'nicoleXvExtraFamilyLinks_v1';
  const needsPublicBaseUrl = window.location.protocol !== 'https:';
  let adminToken = '';
  let adminData = { invites: [], responses: [], settings: {} };
  let attendanceRecords = [];
  let attendancePdfRefreshed = false;

  if (familyPublicUrlWrap) familyPublicUrlWrap.hidden = !needsPublicBaseUrl;
  if (needsPublicBaseUrl && familyPublicUrlInput) {
    try { familyPublicUrlInput.value = localStorage.getItem(FAMILY_PUBLIC_URL_STORAGE_KEY) || ''; } catch (_) {}
  }

  function getInvitationBaseUrl() {
    if (!needsPublicBaseUrl) {
      const current = new URL(window.location.href);
      current.search = ''; current.hash = '';
      current.pathname = current.pathname.replace(/index\.html?$/i, '');
      if (!current.pathname.endsWith('/')) current.pathname += '/';
      return current;
    }
    const value = familyPublicUrlInput?.value.trim() || '';
    if (!value) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return null;
      url.search = ''; url.hash = '';
      url.pathname = url.pathname.replace(/index\.html?$/i, '');
      if (!url.pathname.endsWith('/')) url.pathname += '/';
      try { localStorage.setItem(FAMILY_PUBLIC_URL_STORAGE_KEY, url.href); } catch (_) {}
      return url;
    } catch (_) { return null; }
  }

  function buildInvitationLink(record) {
    const base = getInvitationBaseUrl();
    if (!base) return '';
    const url = new URL(base.href);
    url.search = '';
    if (record.id) url.searchParams.set('inv', record.id);
    if (record.type === 'personal') {
      url.searchParams.set('pase', 'personal');
      url.searchParams.set('pases', '1');
    } else {
      url.searchParams.set('familia', record.name || '');
      if (Number(record.passes) > 0) url.searchParams.set('pases', String(record.passes));
    }
    return url.toString();
  }

  async function copyTextValue(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch (_) {}
    const helper = document.createElement('textarea');
    helper.value = text; helper.setAttribute('readonly', '');
    helper.style.position = 'fixed'; helper.style.opacity = '0'; helper.style.pointerEvents = 'none';
    document.body.appendChild(helper); helper.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) {}
    helper.remove(); return copied;
  }

  function newAdminClientId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 16)}`;
  }

  async function adminPost(payload) {
    if (!RSVP_WEB_APP_URL) throw new Error('Primero configura la URL del servicio de Google Apps Script en config.js.');
    const body = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => body.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')));
    await fetch(RSVP_WEB_APP_URL, {
      method: 'POST', mode: 'no-cors', redirect: 'follow',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString()
    });
  }

  function setAttendancePdfReady(ready) {
    attendancePdfRefreshed = Boolean(ready);
    if (attendanceExportPdf) attendanceExportPdf.disabled = !attendancePdfRefreshed;
  }

  function setAdminFeedback(message, isError = false) {
    if (!attendanceFeedback) return;
    attendanceFeedback.textContent = message;
    attendanceFeedback.dataset.state = isError ? 'error' : 'success';
  }

  function renderRegisteredFamilies() {
    if (!predefinedFamilyLinks) return;
    predefinedFamilyLinks.replaceChildren();
    const invites = adminData.invites || [];
    invites.forEach((record) => {
      const card = document.createElement('article');
      card.className = 'registered-family-card';
      const top = document.createElement('div'); top.className = 'registered-family-main';
      const name = document.createElement('strong'); name.className = 'registered-family-name';
      name.textContent = record.type === 'personal' ? 'Pase general para jóvenes' : record.name;
      top.appendChild(name);
      const passCount = Number(record.passes);
      if (passCount > 0) {
        const badge = document.createElement('span'); badge.className = 'registered-pass-badge';
        const img = document.createElement('img'); img.src = 'assets/pase-cantidad.png'; img.alt = '';
        const value = document.createElement('b'); value.textContent = String(passCount);
        badge.append(img, value); top.appendChild(badge);
      } else if (record.type !== 'personal') {
        const missing = document.createElement('span'); missing.className = 'registered-family-feedback';
        missing.textContent = 'PASES SIN ASIGNAR'; top.appendChild(missing);
      }
      card.appendChild(top);
      const url = buildInvitationLink(record);
      const input = document.createElement('input'); input.className = 'registered-family-url';
      input.type = 'text'; input.readOnly = true; input.value = url || 'Configura la URL pública de GitHub Pages';
      card.appendChild(input);
      const actions = document.createElement('div'); actions.className = 'registered-family-actions';
      const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'family-admin-primary registered-copy-button';
      copy.textContent = 'COPIAR LINK'; copy.disabled = !url;
      const feedback = document.createElement('span'); feedback.className = 'registered-family-feedback'; feedback.setAttribute('role', 'status');
      copy.addEventListener('click', async () => { const ok = await copyTextValue(url); feedback.textContent = ok ? '¡Enlace copiado!' : 'Selecciona el enlace para copiarlo.'; if (!ok) { input.focus(); input.select(); } });
      actions.append(copy, feedback);
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'family-admin-secondary registered-remove-button';
      edit.textContent = Number(record.passes) > 0 || record.type === 'personal' ? 'EDITAR' : 'ASIGNAR PASES';
      edit.addEventListener('click', async () => {
        const nextName = record.type === 'personal' ? record.name : window.prompt('Nombre de la familia o invitado:', record.name);
        if (nextName === null) return;
        const nextPassText = record.type === 'personal' ? '1' : window.prompt('¿Cuántos pases tiene asignados? (1 a 30)', String(record.passes || ''));
        if (nextPassText === null) return;
        const nextPasses = Number.parseInt(nextPassText, 10);
        if (!Number.isInteger(nextPasses) || nextPasses < 1 || nextPasses > 30) { window.alert('Escribe una cantidad de pases entre 1 y 30.'); return; }
        try {
          await adminPost({ action: 'updateInvite', token: adminToken, invitation: { id: record.id, name: String(nextName).trim(), type: record.type, passes: nextPasses } });
          await new Promise(resolve => window.setTimeout(resolve, 350)); await refreshAdminData();
          const updated = adminData.invites.find(item => item.id === record.id);
          if (!updated || Number(updated.passes) !== nextPasses) throw new Error('No se pudo verificar el cambio de pases en el registro central.');
        } catch (error) { feedback.textContent = error.message; }
      });
      actions.appendChild(edit);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'family-admin-secondary registered-remove-button';
      remove.textContent = 'QUITAR'; remove.addEventListener('click', async () => {
        if (!window.confirm(`¿Quitar el enlace de ${record.name || 'este pase'}?`)) return;
        try {
          await adminPost({ action: 'deleteInvite', token: adminToken, invitationId: record.id });
          await new Promise(resolve => window.setTimeout(resolve, 350)); await refreshAdminData();
          if (adminData.invites.some(item => item.id === record.id)) throw new Error('No se pudo verificar que se retirara el enlace.');
        } catch (error) { feedback.textContent = error.message; }
      });
      actions.appendChild(remove); card.appendChild(actions); predefinedFamilyLinks.appendChild(card);
    });
    if (registeredFamilyCount) registeredFamilyCount.textContent = `${invites.length} ${invites.length === 1 ? 'INVITACIÓN' : 'INVITACIONES'}`;
    if (predefinedFamilyLinksFeedback) predefinedFamilyLinksFeedback.textContent = needsPublicBaseUrl && !getInvitationBaseUrl()
      ? 'Pega la dirección HTTPS de GitHub Pages arriba para activar los enlaces.'
      : `${invites.length} enlaces administrados desde el registro central.`;
  }

  function renderAttendanceRecords() {
    if (!attendanceList) return;
    attendanceList.replaceChildren();
    const yesRecords = attendanceRecords.filter(record => record.status === 'yes');
    const noRecords = attendanceRecords.filter(record => record.status === 'no');
    const guestTotal = yesRecords.reduce((sum, record) => sum + (Number(record.attendees) || 1), 0);
    if (attendanceResponses) attendanceResponses.textContent = String(attendanceRecords.length);
    if (attendanceGuests) attendanceGuests.textContent = String(guestTotal);
    if (attendanceDeclines) attendanceDeclines.textContent = String(noRecords.length);
    if (attendanceListCount) attendanceListCount.textContent = `${attendanceRecords.length} ${attendanceRecords.length === 1 ? 'registro' : 'registros'}`;
    if (!attendanceRecords.length) {
      const empty = document.createElement('li'); empty.className = 'attendance-empty';
      empty.textContent = 'Todavía no hay respuestas registradas.'; attendanceList.appendChild(empty); return;
    }
    attendanceRecords.forEach(record => {
      const item = document.createElement('li'); item.className = 'attendance-record';
      const detail = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = record.guestName || record.name || 'Invitado';
      const meta = document.createElement('small');
      const count = Number(record.attendees) || 0;
      meta.textContent = record.status === 'yes' ? `Confirmó asistencia · ${count} ${count === 1 ? 'persona' : 'personas'}` : 'No podrá asistir';
      detail.append(name, meta);
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×';
      remove.setAttribute('aria-label', `Eliminar registro de ${name.textContent}`);
      remove.addEventListener('click', async () => {
        if (!window.confirm(`¿Eliminar la respuesta de ${name.textContent}?`)) return;
        try { await adminPost({ action: 'deleteResponse', token: adminToken, responseId: record.responseId || record.id }); await refreshAdminData(); setAttendancePdfReady(false); }
        catch (error) { setAdminFeedback(error.message, true); }
      });
      item.append(detail, remove); attendanceList.appendChild(item);
    });
  }

  async function refreshAdminData() {
    if (!adminToken) throw new Error('La sesión administrativa no está activa.');
    const data = await jsonpRequest({ action: 'adminData', token: adminToken });
    if (!data?.ok) throw new Error(data?.error || 'No se pudo leer el registro central.');
    adminData = data.data || { invites: [], responses: [], settings: {} };
    attendanceRecords = Array.isArray(adminData.responses) ? adminData.responses : [];
    renderRegisteredFamilies(); renderAttendanceRecords(); setAttendancePdfReady(true);
    if (whatsappNumberInput) whatsappNumberInput.value = adminData.settings?.whatsapp || '522288560974';
    if (whatsappMessageInput) whatsappMessageInput.value = adminData.settings?.message || 'Hola Sheylla, te comparto mi confirmación de asistencia a los XV años de Nicole.';
    rsvpWhatsApp = String(adminData.settings?.whatsapp || '522288560974').replace(/\D/g, '') || '522288560974';
    rsvpWhatsAppMessage = String(adminData.settings?.message || 'Hola Sheylla, te comparto mi confirmación de asistencia a los XV años de Nicole.');
    const publicPhone = document.getElementById('rsvpContactNumber');
    if (publicPhone) publicPhone.textContent = formatRsvpPhone(rsvpWhatsApp);
    return adminData;
  }

  familyPublicUrlInput?.addEventListener('input', renderRegisteredFamilies);
  familyAdminToggle?.addEventListener('click', () => {
    if (!familyAdminPanel) return;
    const opening = familyAdminPanel.hidden;
    familyAdminPanel.hidden = !opening;
    familyAdminToggle.setAttribute('aria-expanded', String(opening));
    if (opening && familyPasswordStep && !familyPasswordStep.hidden) window.setTimeout(() => familyAdminPassword?.focus({ preventScroll: true }), 80);
  });

  familyPasswordForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!RSVP_WEB_APP_URL) {
      if (familyPasswordError) { familyPasswordError.textContent = 'El servicio central aún no está configurado. Consulta el archivo CONFIGURACION_APPS_SCRIPT.txt.'; familyPasswordError.hidden = false; }
      return;
    }
    const password = familyAdminPassword?.value || '';
    const token = newAdminClientId();
    const submit = familyPasswordForm.querySelector('button[type="submit"]');
    if (submit) { submit.disabled = true; submit.textContent = 'VERIFICANDO…'; }
    try {
      await adminPost({ action: 'login', password, token });
      await new Promise(resolve => window.setTimeout(resolve, 500));
      adminToken = token;
      await refreshAdminData();
      // Migra enlaces adicionales creados anteriormente en este navegador al registro central.
      const legacyLinks = readLegacyFamilyLinks();
      const knownNames = new Set((adminData.invites || []).map(item => normalizeAdminName(item.name)));
      const missingLinks = legacyLinks.filter(item => item && item.name && !knownNames.has(normalizeAdminName(item.name)));
      if (missingLinks.length) {
        await adminPost({ action: 'importLegacyInvites', token: adminToken, invites: missingLinks });
        await new Promise(resolve => window.setTimeout(resolve, 350));
        await refreshAdminData();
      }
      if (familyPasswordError) familyPasswordError.hidden = true;
      familyPasswordStep.hidden = true; familyGeneratorStep.hidden = false;
      if (familyAdminPassword) familyAdminPassword.value = '';
      // Los registros antiguos locales permanecen disponibles para importarlos una sola vez.
      const legacy = readLegacyAttendance();
      if (attendanceImportLegacy) attendanceImportLegacy.hidden = !legacy.length;
      if (familyNameInput) window.setTimeout(() => familyNameInput.focus({ preventScroll: true }), 80);
    } catch (error) {
      adminToken = '';
      if (familyPasswordError) { familyPasswordError.textContent = error.message.includes('not authorized') || error.message.includes('sesión') ? 'La contraseña no es correcta o la sesión no se pudo validar.' : error.message; familyPasswordError.hidden = false; }
    } finally { if (submit) { submit.disabled = false; submit.textContent = 'ENTRAR'; } }
  });

  function updateInvitationLinkTypeUI() {
    const personal = invitationLinkType?.value === 'personal';
    if (familyNameLabel) familyNameLabel.hidden = personal;
    if (familyNameInput) { familyNameInput.hidden = personal; familyNameInput.required = !personal; familyNameInput.disabled = personal; if (personal) familyNameInput.value = ''; }
    if (familyPersonalModeNote) familyPersonalModeNote.hidden = !personal;
    if (familyGeneratedLinkLabel) familyGeneratedLinkLabel.textContent = personal ? 'Enlace general de pase personal · 1 pase' : 'Enlace de invitación familiar';
    if (familyPassCountWrap) familyPassCountWrap.hidden = personal;
    if (familyPassCountInput) { familyPassCountInput.required = !personal; familyPassCountInput.disabled = personal; }
    const title = familyGeneratorStep?.querySelector('.family-admin-create-title');
    if (title) title.textContent = personal ? 'Crear pase general para jóvenes' : 'Agregar otra invitación familiar';
    const button = familyLinkForm?.querySelector('button[type="submit"]');
    if (button) button.textContent = personal ? 'GENERAR PASE PARA JÓVENES' : 'GENERAR LINK';
  }
  invitationLinkType?.addEventListener('change', updateInvitationLinkTypeUI); updateInvitationLinkTypeUI();

  familyLinkForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const type = invitationLinkType?.value === 'personal' ? 'personal' : 'family';
    const name = type === 'personal' ? 'Pase personal para jóvenes' : String(familyNameInput?.value || '').replace(/[<>]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, 70);
    if (type === 'family' && (!name || name.length < 2)) { familyNameInput?.focus(); return; }
    const passes = type === 'personal' ? 1 : Number.parseInt(familyPassCountInput?.value || '', 10);
    if (type === 'family' && (!Number.isInteger(passes) || passes < 1 || passes > 30)) { familyPassCountInput?.focus(); return; }
    if (!getInvitationBaseUrl()) {
      if (familyPublicUrlError) { familyPublicUrlError.textContent = 'Configura primero una dirección HTTPS válida de GitHub Pages.'; familyPublicUrlError.hidden = false; }
      familyPublicUrlInput?.focus(); return;
    }
    const id = newAdminClientId();
    const record = { id, name, type, passes: passes || '' };
    try {
      const submit = familyLinkForm.querySelector('button[type="submit"]');
      if (submit) { submit.disabled = true; submit.textContent = 'GUARDANDO…'; }
      await adminPost({ action: 'createInvite', token: adminToken, invitation: record });
      await new Promise(resolve => window.setTimeout(resolve, 450));
      await refreshAdminData();
      if (!adminData.invites.some(item => item.id === id)) throw new Error('No se pudo verificar que la invitación se guardara en el registro central.');
      const personalizedUrl = buildInvitationLink(record);
      if (!personalizedUrl) throw new Error('No se pudo construir el enlace público.');
      familyGeneratedLink.value = personalizedUrl; familyLinkResult.hidden = false;
      if (familyCopyFeedback) familyCopyFeedback.textContent = 'Invitación guardada en el registro central. Ya puedes copiar el enlace.';
    } catch (error) {
      if (familyPublicUrlError) { familyPublicUrlError.textContent = error.message; familyPublicUrlError.hidden = false; }
    } finally {
      const submit = familyLinkForm.querySelector('button[type="submit"]');
      if (submit) { submit.disabled = false; submit.textContent = type === 'personal' ? 'GENERAR PASE PARA JÓVENES' : 'GENERAR LINK'; }
    }
  });

  familyCopyLink?.addEventListener('click', async () => {
    if (!familyGeneratedLink) return;
    const copied = await copyTextValue(familyGeneratedLink.value);
    if (familyCopyFeedback) familyCopyFeedback.textContent = copied ? '¡Enlace copiado! Ya puedes pegarlo en WhatsApp.' : 'Selecciona el enlace para copiarlo.';
    if (!copied) { familyGeneratedLink.focus(); familyGeneratedLink.select(); }
  });
  familyNewLink?.addEventListener('click', () => {
    if (familyNameInput) { familyNameInput.value = ''; if (!familyNameInput.hidden) familyNameInput.focus(); }
    if (familyPassCountInput) familyPassCountInput.value = '';
    if (familyLinkResult) familyLinkResult.hidden = true;
    if (familyCopyFeedback) familyCopyFeedback.textContent = '';
  });

  function readLegacyAttendance() {
    try {
      const rows = JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY) || '[]');
      return Array.isArray(rows) ? rows.filter(row => row && typeof row.name === 'string') : [];
    } catch (_) { return []; }
  }

  function readLegacyFamilyLinks() {
    try {
      const rows = JSON.parse(localStorage.getItem(EXTRA_FAMILY_LINKS_STORAGE_KEY) || '[]');
      return Array.isArray(rows) ? rows.filter(row => row && typeof row.name === 'string') : [];
    } catch (_) { return []; }
  }
  function normalizeAdminName(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  if (attendanceForm) {
    attendanceForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = String(attendanceNameInput?.value || '').trim().replace(/\s+/g, ' ');
      const status = attendanceStatusInput?.value === 'no' ? 'no' : 'yes';
      const attendees = status === 'yes' ? Math.max(1, Math.min(30, Number.parseInt(attendanceAttendeesInput?.value || '1', 10) || 1)) : 0;
      if (name.split(' ').length < 2 || name.length < 5) { setAdminFeedback('Captura el nombre completo.', true); attendanceNameInput?.focus(); return; }
      try {
        const responseId = newAdminClientId();
        await adminPost({ action: 'manualAdd', token: adminToken, responseId, name, status, attendees });
        await new Promise(resolve => window.setTimeout(resolve, 350));
        await refreshAdminData();
        if (!attendanceRecords.some(item => item.responseId === responseId)) throw new Error('No se pudo verificar que la respuesta se guardara.');
        setAdminFeedback('Respuesta guardada en el registro central.');
        attendanceForm.reset(); setAttendancePdfReady(false);
      } catch (error) { setAdminFeedback(error.message, true); }
    });
  }

  attendanceRefresh?.addEventListener('click', async () => {
    try {
      await refreshAdminData();
      const stamp = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
      setAdminFeedback(`Lista actualizada (${attendanceRecords.length} registros) · ${stamp}. Ya puedes descargar el PDF.`);
    } catch (error) { setAdminFeedback(error.message, true); }
  });

  whatsappSettingsForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const whatsapp = String(whatsappNumberInput?.value || '').replace(/\D/g, '');
    const message = String(whatsappMessageInput?.value || '').trim();
    if (whatsapp.length < 10 || whatsapp.length > 15) { if (whatsappSettingsFeedback) whatsappSettingsFeedback.textContent = 'Escribe el número internacional, incluyendo código de país.'; return; }
    try {
      await adminPost({ action: 'updateSettings', token: adminToken, whatsapp, message });
      await new Promise(resolve => window.setTimeout(resolve, 350));
      await refreshAdminData();
      if (String(adminData.settings?.whatsapp || '') !== whatsapp) throw new Error('No se pudo verificar el número guardado.');
      if (whatsappSettingsFeedback) whatsappSettingsFeedback.textContent = 'Configuración de WhatsApp guardada.';
    } catch (error) { if (whatsappSettingsFeedback) whatsappSettingsFeedback.textContent = error.message; }
  });

  attendanceImportLegacy?.addEventListener('click', async () => {
    const legacy = readLegacyAttendance();
    if (!legacy.length) { attendanceImportLegacy.hidden = true; return; }
    if (!window.confirm(`Se encontraron ${legacy.length} registros guardados en este navegador. ¿Importarlos al registro central?`)) return;
    try {
      await adminPost({ action: 'importLegacy', token: adminToken, records: legacy.map(row => ({
        responseId: String(row.id || newAdminClientId()), name: row.name,
        status: row.status === 'no' ? 'no' : 'yes', attendees: row.status === 'no' ? 0 : Number(row.attendees) || 1,
        createdAt: row.createdAt || new Date().toISOString()
      })) });
      await new Promise(resolve => window.setTimeout(resolve, 500));
      await refreshAdminData();
      if (attendanceImportLegacy) attendanceImportLegacy.hidden = true;
      setAdminFeedback('Los registros anteriores se importaron al sistema central. El respaldo local se conservó.');
    } catch (error) { setAdminFeedback(error.message, true); }
  });

  attendanceClear?.addEventListener('click', async () => {
    if (!attendanceRecords.length) return;
    if (!window.confirm('¿Deseas borrar TODAS las respuestas guardadas en el registro central? Esta acción no se puede deshacer.')) return;
    try {
      await adminPost({ action: 'clearResponses', token: adminToken });
      await new Promise(resolve => window.setTimeout(resolve, 400));
      await refreshAdminData();
      if (attendanceRecords.length) throw new Error('El servicio no confirmó el borrado. No se modificó la lista que ves.');
      setAdminFeedback('Se borraron las respuestas del registro central.'); setAttendancePdfReady(false);
    } catch (error) { setAdminFeedback(error.message, true); }
  });

  if (attendanceAdminStatus) attendanceAdminStatus.addEventListener('change', () => {
    if (attendanceAttendeesInput) attendanceAttendeesInput.disabled = attendanceAdminStatus.value === 'no';
  });
  if (attendanceImportLegacy) attendanceImportLegacy.hidden = true;

  // PDF autónomo: se crea en el navegador, sin librerías externas ni conexión a servicios.
  // Los textos se codifican en WinAnsi y se dibujan con las fuentes estándar de PDF.
  function makeAttendancePdf(records) {
    const pageW = 595.28;
    const pageH = 841.89;
    const yesRecords = records.filter((item) => item.status === 'yes');
    const noRecords = records.filter((item) => item.status === 'no');
    const pages = [];
    const rowsPerPage = 23;
    const pageCount = Math.max(1, Math.ceil(records.length / rowsPerPage));
    const toHex = (value) => {
      const special = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C, 'Ž': 0x8E, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B, 'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F };
      let output = '';
      for (const char of String(value ?? '')) {
        const cp = char.codePointAt(0);
        const byte = cp <= 0x7F || (cp >= 0xA0 && cp <= 0xFF) ? cp : special[char] ?? 0x3F;
        output += byte.toString(16).padStart(2, '0').toUpperCase();
      }
      return output;
    };
    const num = (n) => Number(n.toFixed(2)).toString();
    const fill = (r, g, b) => `${num(r)} ${num(g)} ${num(b)} rg\n`;
    const stroke = (r, g, b) => `${num(r)} ${num(g)} ${num(b)} RG\n`;
    const rect = (x, y, w, h, color) => `${fill(...color)}${num(x)} ${num(y)} ${num(w)} ${num(h)} re f\n`;
    const line = (x1, y1, x2, y2, color, width = 1) => `${stroke(...color)}${num(width)} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S\n`;
    const text = (value, x, y, size = 10, color = [0.10, 0.16, 0.27], font = 'F1') => `${fill(...color)}BT /${font} ${num(size)} Tf 1 0 0 1 ${num(x)} ${num(y)} Tm <${toHex(value)}> Tj ET\n`;
    const centered = (value, center, y, size = 10, color = [0.10, 0.16, 0.27], font = 'F1') => {
      const approximateWidth = String(value).length * size * (font === 'F2' ? 0.56 : 0.51);
      return text(value, center - approximateWidth / 2, y, size, color, font);
    };
    const truncate = (value, max) => {
      const clean = String(value ?? '').replace(/\s+/g, ' ').trim();
      return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
    };
    const formatWhen = (value) => {
      const date = value ? new Date(value) : null;
      if (!date || Number.isNaN(date.getTime())) return '—';
      return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    };

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      let stream = '';
      stream += rect(0, 0, pageW, pageH, [0.985, 0.974, 0.953]);
      const firstPage = pageIndex === 0;
      const headerH = firstPage ? 142 : 92;
      stream += rect(0, pageH - headerH, pageW, headerH, [0.055, 0.105, 0.19]);
      stream += rect(0, pageH - headerH, pageW, 3, [0.77, 0.59, 0.29]);
      if (firstPage) {
        stream += centered('XV AÑOS DE NICOLE ROA BARRAGÁN', pageW / 2, 785, 17, [0.98, 0.93, 0.84], 'F2');
        stream += centered('CONTROL DE ASISTENCIA', pageW / 2, 755, 11, [0.91, 0.78, 0.55], 'F2');
        const generated = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
        stream += centered(`Reporte actualizado · ${generated}`, pageW / 2, 729, 8.5, [0.91, 0.87, 0.80], 'F1');
        const cardY = 632;
        const cardW = 158;
        const gap = 9;
        const startX = 42;
        const cards = [
          { label: 'RESPUESTAS', value: records.length },
          { label: 'ASISTIRÁN', value: yesRecords.reduce((sum, record) => sum + (Number(record.attendees) || 1), 0) },
          { label: 'NO ASISTIRÁN', value: noRecords.length }
        ];
        cards.forEach((card, idx) => {
          const x = startX + idx * (cardW + gap);
          stream += rect(x, cardY, cardW, 64, [0.965, 0.946, 0.912]);
          stream += stroke(0.77, 0.59, 0.29) + `0.8 w ${x} ${cardY} ${cardW} 64 re S\n`;
          stream += centered(String(card.value), x + cardW / 2, cardY + 31, 23, [0.07, 0.14, 0.25], 'F2');
          stream += centered(card.label, x + cardW / 2, cardY + 13, 7.3, [0.55, 0.40, 0.22], 'F2');
        });
      } else {
        stream += centered('XV AÑOS DE NICOLE ROA BARRAGÁN', pageW / 2, 803, 14, [0.98, 0.93, 0.84], 'F2');
        stream += centered('CONTROL DE ASISTENCIA · CONTINUACIÓN', pageW / 2, 777, 8.5, [0.91, 0.78, 0.55], 'F2');
      }

      const tableX = 42;
      const tableW = pageW - 84;
      const tableTop = firstPage ? 604 : 738;
      const headerRowH = 25;
      stream += rect(tableX, tableTop - headerRowH, tableW, headerRowH, [0.10, 0.17, 0.29]);
      stream += text('Nº', 50, tableTop - 17, 8, [0.98, 0.93, 0.84], 'F2');
      stream += text('NOMBRE COMPLETO', 82, tableTop - 17, 8, [0.98, 0.93, 0.84], 'F2');
      stream += text('ASISTENTES', 350, tableTop - 17, 7, [0.98, 0.93, 0.84], 'F2');
      stream += text('RESPUESTA', 420, tableTop - 17, 7, [0.98, 0.93, 0.84], 'F2');
      stream += text('FECHA', 495, tableTop - 17, 7, [0.98, 0.93, 0.84], 'F2');

      const start = pageIndex * rowsPerPage;
      const pageRows = records.slice(start, start + rowsPerPage);
      if (!records.length) {
        stream += rect(tableX, tableTop - headerRowH - 42, tableW, 42, [1, 0.994, 0.98]);
        stream += centered('Aún no hay respuestas registradas.', pageW / 2, tableTop - 43, 10, [0.40, 0.37, 0.34], 'F1');
      } else {
        pageRows.forEach((record, localIndex) => {
          const rowTop = tableTop - headerRowH - localIndex * 24;
          const rowY = rowTop - 24;
          const bg = localIndex % 2 === 0 ? [1, 0.994, 0.98] : [0.965, 0.946, 0.912];
          stream += rect(tableX, rowY, tableW, 24, bg);
          stream += line(tableX, rowY, tableX + tableW, rowY, [0.84, 0.79, 0.70], 0.35);
          stream += text(String(start + localIndex + 1), 50, rowY + 8, 8, [0.42, 0.35, 0.26], 'F1');
          stream += text(truncate(record.name, 48), 82, rowY + 8, 8.4, [0.10, 0.16, 0.27], 'F1');
          const isYes = record.status === 'yes';
          stream += text(isYes ? String(Number(record.attendees) || 1) : '0', 365, rowY + 8, 8, [0.10, 0.16, 0.27], 'F2');
          stream += text(isYes ? 'ASISTIRÁ' : 'NO ASISTIRÁ', 420, rowY + 8, 6.8, isYes ? [0.12, 0.42, 0.29] : [0.62, 0.25, 0.27], 'F2');
          stream += text(formatWhen(record.createdAt), 495, rowY + 8, 6.5, [0.42, 0.38, 0.33], 'F1');
        });
      }

      stream += line(42, 36, pageW - 42, 36, [0.77, 0.59, 0.29], 0.6);
      stream += text('Nicole Roa Barragán · 21 de noviembre de 2026', 42, 22, 7.2, [0.38, 0.34, 0.29], 'F1');
      stream += text(`Página ${pageIndex + 1} de ${pageCount}`, pageW - 103, 22, 7.2, [0.38, 0.34, 0.29], 'F1');
      pages.push(stream);
    }

    const objects = [];
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = `<< /Type /Pages /Kids [${pages.map((_, index) => `${5 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`;
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    pages.forEach((stream, index) => {
      const pageId = 5 + index * 2;
      const contentId = pageId + 1;
      objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
      objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
    });

    let pdf = '%PDF-1.4\n%NicoleXV\n';
    const offsets = [0];
    for (let id = 1; id < objects.length; id += 1) {
      offsets[id] = pdf.length;
      pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return new Blob([new TextEncoder().encode(pdf)], { type: 'application/pdf' });
  }

  attendanceExportPdf?.addEventListener('click', () => {
    if (!attendancePdfRefreshed) {
      if (attendanceFeedback) attendanceFeedback.textContent = 'Primero pulsa ACTUALIZAR para recargar la lista.';
      return;
    }
    const blob = makeAttendancePdf(attendanceRecords);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Nicole_XV_Control_de_Asistencia.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    if (attendanceFeedback) attendanceFeedback.textContent = 'Reporte PDF generado con la información actualizada.';
  });

})();
