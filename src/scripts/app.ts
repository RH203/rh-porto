import { PortfolioWorld, CHECKPOINTS, type CheckpointConfig, type CheckpointKey } from './portfolioWorld';
import { soundFx } from './soundEffects';

function initPortfolioApp() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  const proximityBadge = document.getElementById('proximity-badge');
  const proximityBtn = document.getElementById('proximity-btn');
  const proximityTitle = document.getElementById('proximity-title');
  const proximityIcon = document.getElementById('proximity-icon');

  const modalBackdrop = document.getElementById('info-modal-backdrop');
  const modalCard = document.getElementById('info-modal-card');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalTitle = document.getElementById('modal-title');
  const modalSubtitle = document.getElementById('modal-subtitle');
  const modalIcon = document.getElementById('modal-icon');

  const modalSections = document.querySelectorAll('.modal-section');
  const dockButtons = document.querySelectorAll('.dock-btn');
  const btnHelp = document.getElementById('btn-controls-help');

  const welcomeBackdrop = document.getElementById('welcome-modal-backdrop');
  const welcomeCard = document.getElementById('welcome-modal-card');
  const welcomeCloseBtn = document.getElementById('welcome-close-btn');
  const welcomeStartBtn = document.getElementById('welcome-start-btn');

  // Toolbar & Minimap elements
  const btnNightMode = document.getElementById('btn-night-mode');
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const btnHorn = document.getElementById('btn-horn');
  const ctrlHorn = document.getElementById('ctrl-horn');
  const ctrlLight = document.getElementById('ctrl-light');
  const minimapCar = document.getElementById('minimap-car');
  const minimapNodes = document.querySelectorAll('.minimap-cp-btn');
  const toastBox = document.getElementById('toast-box');
  const toastText = document.getElementById('toast-text');
  const toastIcon = document.getElementById('toast-icon');

  let currentNearCp: CheckpointConfig | null = null;
  let isModalOpen = false;
  let isWelcomeOpen = true;
  let toastTimeout: number | null = null;

  const ICONS: Record<string, string> = {
    projects: '💻',
    experience: '💼',
    skills: '⚡',
    education: '🎓',
    contact: '📬',
    help: '❓',
  };

  // Toast notification helper
  function showToast(message: string, icon = '✨') {
    if (!toastBox || !toastText) return;
    if (toastIcon) toastIcon.textContent = icon;
    toastText.textContent = message;

    toastBox.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-[-10px]');
    toastBox.classList.add('opacity-100', 'translate-y-0');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
      toastBox.classList.remove('opacity-100', 'translate-y-0');
      toastBox.classList.add('opacity-0', 'pointer-events-none', 'translate-y-[-10px]');
    }, 2400);
  }

  // Audio initialize on first user interaction
  const triggerAudioInit = () => {
    soundFx.init();
    window.removeEventListener('pointerdown', triggerAudioInit);
    window.removeEventListener('keydown', triggerAudioInit);
  };
  window.addEventListener('pointerdown', triggerAudioInit);
  window.addEventListener('keydown', triggerAudioInit);

  // Sync sound toggle button state
  function updateSoundBtn() {
    if (!btnSoundToggle) return;
    const muted = soundFx.isMuted();
    btnSoundToggle.textContent = muted ? '🔇' : '🔊';
    btnSoundToggle.title = muted ? 'Suara SFX Mati (Klik untuk aktifkan)' : 'Suara SFX Aktif (Klik untuk mute)';
  }
  updateSoundBtn();

  if (btnSoundToggle) {
    btnSoundToggle.addEventListener('click', () => {
      soundFx.init();
      const muted = soundFx.toggleMute();
      updateSoundBtn();
      showToast(muted ? 'Suara dinonaktifkan' : 'Suara diaktifkan! 🔊', muted ? '🔇' : '🔊');
    });
  }

  // Modal open
  function openModal(key: string, label?: string, desc?: string) {
    if (!modalBackdrop || !modalCard) return;
    isModalOpen = true;

    modalSections.forEach((s) => s.classList.add('hidden'));
    const targetSection = document.getElementById(`section-${key}`);
    if (targetSection) targetSection.classList.remove('hidden');

    if (modalTitle) modalTitle.textContent = label || key.toUpperCase();
    if (modalSubtitle) modalSubtitle.textContent = desc || 'Detail informasi';
    if (modalIcon) modalIcon.textContent = ICONS[key] || '📍';

    modalBackdrop.classList.remove('opacity-0', 'pointer-events-none');
    modalBackdrop.classList.add('opacity-100');
    modalCard.classList.remove('scale-95');
    modalCard.classList.add('scale-100');

    // Update URL hash without causing jump
    if (key !== 'help') {
      history.replaceState(null, '', `#${key}`);
    }
  }

  // Modal close
  function closeModal() {
    if (!isModalOpen || !modalBackdrop || !modalCard) return;
    isModalOpen = false;

    modalBackdrop.classList.remove('opacity-100');
    modalBackdrop.classList.add('opacity-0', 'pointer-events-none');
    modalCard.classList.remove('scale-100');
    modalCard.classList.add('scale-95');

    // Reset URL hash
    history.replaceState(null, '', window.location.pathname);

    world.resetToOverview();
  }

  // Welcome modal handlers
  function closeWelcomeModal() {
    if (!isWelcomeOpen || !welcomeBackdrop || !welcomeCard) return;
    isWelcomeOpen = false;

    welcomeBackdrop.classList.remove('opacity-100');
    welcomeBackdrop.classList.add('opacity-0', 'pointer-events-none');
    welcomeCard.classList.remove('scale-100');
    welcomeCard.classList.add('scale-95');

    setTimeout(() => {
      if (!isWelcomeOpen) {
        welcomeBackdrop.classList.add('hidden');
      }
    }, 300);

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.focus();
  }

  function openWelcomeModal() {
    if (!welcomeBackdrop || !welcomeCard) return;
    isWelcomeOpen = true;
    welcomeBackdrop.classList.remove('hidden');
    void welcomeBackdrop.offsetWidth;
    welcomeBackdrop.classList.remove('opacity-0', 'pointer-events-none');
    welcomeBackdrop.classList.add('opacity-100');
    welcomeCard.classList.remove('scale-95');
    welcomeCard.classList.add('scale-100');
  }

  const starCounterText = document.getElementById('star-counter-text');
  const ctrlNitro = document.getElementById('ctrl-nitro');
  const ctrlJump = document.getElementById('ctrl-jump');

  // 3D World Instantiation
  const world = new PortfolioWorld(container, {
    onNearCheckpoint: (cp) => {
      currentNearCp = cp;
      if (!proximityBadge || !proximityTitle || !proximityIcon) return;
      if (cp && !isModalOpen) {
        proximityTitle.textContent = cp.label;
        proximityIcon.textContent = ICONS[cp.key] || '📍';
        proximityBadge.classList.remove('-translate-y-24', 'opacity-0', 'pointer-events-none');
        proximityBadge.classList.add('translate-y-0', 'opacity-100');
      } else {
        proximityBadge.classList.remove('translate-y-0', 'opacity-100');
        proximityBadge.classList.add('-translate-y-24', 'opacity-0', 'pointer-events-none');
      }
    },
    onSelectCheckpoint: (cp) => {
      openModal(cp.key, cp.label, cp.shortDesc);
    },
    onCarUpdate: (x, z, angle) => {
      if (minimapCar) {
        const deg = (angle * 180) / Math.PI;
        minimapCar.setAttribute('transform', `translate(${x.toFixed(2)}, ${z.toFixed(2)}) rotate(${(-deg).toFixed(1)})`);
      }
    },
    onStarCollected: (collected, total) => {
      if (starCounterText) {
        starCounterText.textContent = `${collected} / ${total}`;
      }
      if (collected >= total) {
        showToast('🏆 Keren! Semua 5 Bintang Berhasil Dikumpulkan!', '⭐');
      } else {
        showToast(`⭐ Bintang ${collected}/${total} Dikoleksi!`, '⭐');
      }
    },
  });

  // Horn button handlers
  const handleHorn = () => {
    soundFx.init();
    world.honk();
    showToast('BEEP BEEP! 📯', '📯');
  };
  if (btnHorn) btnHorn.addEventListener('click', handleHorn);
  if (ctrlHorn) ctrlHorn.addEventListener('click', handleHorn);

  // Night / Day mode toggle
  const handleNightToggle = () => {
    soundFx.init();
    const isNight = world.toggleNightMode();
    if (btnNightMode) {
      btnNightMode.textContent = isNight ? '🌙' : '☀️';
      btnNightMode.title = isNight ? 'Beralih ke Mode Pagi' : 'Beralih ke Mode Malam';
    }
    showToast(isNight ? 'Mode Malam Aktif 🌙' : 'Mode Pagi Cerah Aktif ☀️', isNight ? '🌙' : '☀️');
  };
  if (btnNightMode) btnNightMode.addEventListener('click', handleNightToggle);
  if (ctrlLight) ctrlLight.addEventListener('click', handleNightToggle);

  // Jump and Nitro mobile controls
  if (ctrlJump) {
    ctrlJump.addEventListener('click', () => {
      soundFx.init();
      world.jump();
    });
  }
  if (ctrlNitro) {
    const startNitro = (e: Event) => {
      e.preventDefault();
      soundFx.init();
      world.setNitro(true);
    };
    const stopNitro = (e: Event) => {
      e.preventDefault();
      world.setNitro(false);
    };
    ctrlNitro.addEventListener('touchstart', startNitro, { passive: false });
    ctrlNitro.addEventListener('touchend', stopNitro, { passive: false });
    ctrlNitro.addEventListener('touchcancel', stopNitro, { passive: false });
    ctrlNitro.addEventListener('mousedown', startNitro);
    ctrlNitro.addEventListener('mouseup', stopNitro);
    ctrlNitro.addEventListener('mouseleave', stopNitro);
  }

  // Minimap checkpoint click navigation
  minimapNodes.forEach((node) => {
    node.addEventListener('click', () => {
      soundFx.init();
      const target = node.getAttribute('data-key') as CheckpointKey;
      if (target && CHECKPOINTS[target]) {
        closeModal();
        world.navigateToCheckpoint(target, (cp) => {
          openModal(target, cp.label, cp.shortDesc);
        });
      }
    });
  });

  // Proximity click
  if (proximityBtn) {
    proximityBtn.addEventListener('click', () => {
      soundFx.init();
      if (currentNearCp) {
        closeModal();
        world.navigateToCheckpoint(currentNearCp.key, (cp) => {
          openModal(cp.key, cp.label, cp.shortDesc);
        });
      }
    });
  }

  // Recruiter Dock clicks
  dockButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      soundFx.init();
      const target = btn.getAttribute('data-target') as CheckpointKey;
      if (target && CHECKPOINTS[target]) {
        closeModal();
        world.navigateToCheckpoint(target, (cp) => {
          openModal(target, cp.label, cp.shortDesc);
        });
      }
    });
  });

  // Welcome modal triggers
  if (welcomeCloseBtn) {
    welcomeCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      soundFx.init();
      closeWelcomeModal();
    });
  }
  if (welcomeStartBtn) {
    welcomeStartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      soundFx.init();
      closeWelcomeModal();
    });
  }
  if (welcomeBackdrop) {
    welcomeBackdrop.addEventListener('click', (e) => {
      if (e.target === welcomeBackdrop) {
        e.preventDefault();
        soundFx.init();
        closeWelcomeModal();
      }
    });
  }

  // Controls help
  if (btnHelp) {
    btnHelp.addEventListener('click', () => {
      soundFx.init();
      openModal('help', 'Panduan Kontrol & Fitur', 'Instruksi mengemudi dan shortcut');
    });
  }

  // Info modal triggers
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  // Clipboard copy handlers
  document.querySelectorAll('.clipboard-copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      soundFx.init();
      soundFx.playClick();
      const textToCopy = btn.getAttribute('data-clipboard');
      if (textToCopy) {
        try {
          await navigator.clipboard.writeText(textToCopy);
          showToast(`Tersalin: ${textToCopy}`, '📋');
        } catch {
          showToast('Gagal menyalin teks', '⚠️');
        }
      }
    });
  });

  // Escape key global
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isWelcomeOpen) closeWelcomeModal();
      else if (isModalOpen) closeModal();
    }
  });

  // Mobile Controller: Joystick vs D-Pad
  const modeJoystickBtn = document.getElementById('mode-joystick-btn');
  const modeDpadBtn = document.getElementById('mode-dpad-btn');
  const panelJoystick = document.getElementById('panel-joystick');
  const panelDpad = document.getElementById('panel-dpad');
  const joystickKnob = document.getElementById('joystick-knob');

  function setControlMode(mode: 'joystick' | 'dpad') {
    if (!panelJoystick || !panelDpad || !modeJoystickBtn || !modeDpadBtn) return;
    if (mode === 'joystick') {
      panelJoystick.classList.remove('hidden');
      panelDpad.classList.add('hidden');
      panelDpad.classList.remove('grid');

      modeJoystickBtn.className =
        'ctrl-mode-tab px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#bd93f9] text-[#282a36] shadow transition-colors';
      modeDpadBtn.className =
        'ctrl-mode-tab px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#6272a4] hover:text-[#f8f8f2] transition-colors';
    } else {
      panelJoystick.classList.add('hidden');
      panelDpad.classList.remove('hidden');
      panelDpad.classList.add('grid');

      modeDpadBtn.className =
        'ctrl-mode-tab px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#bd93f9] text-[#282a36] shadow transition-colors';
      modeJoystickBtn.className =
        'ctrl-mode-tab px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#6272a4] hover:text-[#f8f8f2] transition-colors';
    }
  }

  if (modeJoystickBtn && modeDpadBtn) {
    modeJoystickBtn.addEventListener('click', () => setControlMode('joystick'));
    modeDpadBtn.addEventListener('click', () => setControlMode('dpad'));
  }

  // Virtual Analog Joystick
  if (panelJoystick && joystickKnob) {
    let isDragging = false;
    const maxRadius = 45;

    const updateJoystick = (clientX: number, clientY: number) => {
      const rect = panelJoystick.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist > maxRadius) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * maxRadius;
        dy = Math.sin(angle) * maxRadius;
      }

      joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;

      const throttle = -dy / maxRadius;
      const steer = dx / maxRadius;
      world.setAnalogInput(throttle, steer);
    };

    const resetJoystick = () => {
      if (!isDragging) return;
      isDragging = false;
      joystickKnob.style.transform = 'translate(0px, 0px)';
      world.setAnalogInput(0, 0);
    };

    panelJoystick.addEventListener('pointerdown', (e) => {
      isDragging = true;
      panelJoystick.setPointerCapture(e.pointerId);
      updateJoystick(e.clientX, e.clientY);
    });

    panelJoystick.addEventListener('pointermove', (e) => {
      if (isDragging) {
        updateJoystick(e.clientX, e.clientY);
      }
    });

    panelJoystick.addEventListener('pointerup', resetJoystick);
    panelJoystick.addEventListener('pointercancel', resetJoystick);
  }

  // Mobile D-Pad Touch Listeners
  const touchMap: Record<string, 'forward' | 'backward' | 'left' | 'right'> = {
    'ctrl-forward': 'forward',
    'ctrl-backward': 'backward',
    'ctrl-left': 'left',
    'ctrl-right': 'right',
  };

  Object.entries(touchMap).forEach(([id, direction]) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    const start = (e: Event) => {
      e.preventDefault();
      world.setVirtualInput(direction, true);
    };
    const stop = (e: Event) => {
      e.preventDefault();
      world.setVirtualInput(direction, false);
    };

    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', stop, { passive: false });
    btn.addEventListener('touchcancel', stop, { passive: false });
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', stop);
    btn.addEventListener('mouseleave', stop);
  });

  const ctrlAction = document.getElementById('ctrl-action');
  if (ctrlAction) {
    ctrlAction.addEventListener('click', () => {
      closeModal();
      const targetKey = currentNearCp ? currentNearCp.key : 'projects';
      world.navigateToCheckpoint(targetKey, (cp) => {
        openModal(cp.key, cp.label, cp.shortDesc);
      });
    });
  }

  // Deep-linking URL hash router on startup
  const initialHash = window.location.hash.replace('#', '') as CheckpointKey;
  if (initialHash && CHECKPOINTS[initialHash]) {
    closeWelcomeModal();
    setTimeout(() => {
      world.navigateToCheckpoint(initialHash, (cp) => {
        openModal(initialHash, cp.label, cp.shortDesc);
      });
    }, 400);
  }
}

// Run when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPortfolioApp);
} else {
  initPortfolioApp();
}
