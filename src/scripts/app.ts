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

  const telemetrySpeed = document.getElementById('telemetry-speed');
  const telemetryGear = document.getElementById('telemetry-gear');
  const telemetryDrift = document.getElementById('telemetry-drift');
  const telemetryNitro = document.getElementById('telemetry-nitro');

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
    onCarUpdate: (x, z, angle, speed, maxSpeed, isDrifting, isNitro) => {
      if (minimapCar) {
        const deg = (angle * 180) / Math.PI;
        const rot = 180 - deg;
        minimapCar.setAttribute('transform', `translate(${x.toFixed(2)}, ${z.toFixed(2)}) rotate(${rot.toFixed(1)})`);
      }

      // Speedometer & Telemetry Instrument Cluster
      if (telemetrySpeed) {
        const kmh = Math.round(Math.abs(speed / (maxSpeed || 0.16)) * 120);
        telemetrySpeed.textContent = String(kmh);
      }
      if (telemetryGear) {
        if (speed < -0.01) {
          telemetryGear.textContent = 'R';
          telemetryGear.className = 'text-sm font-black text-[#ff5555] font-mono leading-none';
        } else if (Math.abs(speed) < 0.005) {
          telemetryGear.textContent = 'P';
          telemetryGear.className = 'text-sm font-black text-[#6272a4] font-mono leading-none';
        } else if (Math.abs(speed) < 0.05) {
          telemetryGear.textContent = '1';
          telemetryGear.className = 'text-sm font-black text-[#50fa7b] font-mono leading-none';
        } else if (Math.abs(speed) < 0.11) {
          telemetryGear.textContent = '2';
          telemetryGear.className = 'text-sm font-black text-[#50fa7b] font-mono leading-none';
        } else {
          telemetryGear.textContent = '3';
          telemetryGear.className = 'text-sm font-black text-[#bd93f9] font-mono leading-none';
        }
      }
      if (telemetryDrift) {
        telemetryDrift.style.opacity = isDrifting ? '1' : '0';
      }
      if (telemetryNitro) {
        telemetryNitro.style.opacity = isNitro ? '1' : '0';
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

  // Car Paint Palette Customizer
  const btnPaintToggle = document.getElementById('btn-paint-toggle');
  const paintPaletteMenu = document.getElementById('paint-palette-menu');
  const paintSwatches = document.querySelectorAll('.paint-swatch');

  if (btnPaintToggle && paintPaletteMenu) {
    btnPaintToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      soundFx.init();
      soundFx.playClick();
      paintPaletteMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!paintPaletteMenu.contains(e.target as Node) && e.target !== btnPaintToggle) {
        paintPaletteMenu.classList.add('hidden');
      }
    });

    paintSwatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const color = swatch.getAttribute('data-color');
        if (color) {
          world.setCarPaint(color);
          showToast('Warna mobil diubah! 🎨', '🎨');
          paintPaletteMenu.classList.add('hidden');
        }
      });
    });
  }

  // Mobile Controller: Joystick vs Steering Wheel vs D-Pad
  const modeJoystickBtn = document.getElementById('mode-joystick-btn');
  const modeWheelBtn = document.getElementById('mode-wheel-btn');
  const modeDpadBtn = document.getElementById('mode-dpad-btn');
  const panelJoystick = document.getElementById('panel-joystick');
  const panelWheel = document.getElementById('panel-wheel');
  const panelDpad = document.getElementById('panel-dpad');
  const pedalStation = document.getElementById('pedal-station');
  const joystickKnob = document.getElementById('joystick-knob');
  const steeringWheel = document.getElementById('steering-wheel');
  const wheelAngleHint = document.getElementById('wheel-angle-hint');
  const ctrlGasPedal = document.getElementById('ctrl-gas-pedal');
  const ctrlBrakePedal = document.getElementById('ctrl-brake-pedal');

  let activeThrottle = 0;
  let activeSteer = 0;
  let gasActive = false;
  let brakeActive = false;

  const updatePedalThrottle = () => {
    let t = 0;
    if (gasActive) t += 1.0;
    if (brakeActive) t -= 0.75;
    activeThrottle = t;
    world.setAnalogInput(activeThrottle, activeSteer);
  };

  function setControlMode(mode: 'joystick' | 'wheel' | 'dpad') {
    if (!panelJoystick || !panelWheel || !panelDpad) return;

    const tabs = [
      { id: 'joystick', btn: modeJoystickBtn, panel: panelJoystick },
      { id: 'wheel', btn: modeWheelBtn, panel: panelWheel },
      { id: 'dpad', btn: modeDpadBtn, panel: panelDpad },
    ];

    tabs.forEach((tab) => {
      if (tab.id === mode) {
        tab.panel?.classList.remove('hidden');
        if (tab.id === 'dpad') tab.panel?.classList.add('grid');
        if (tab.btn) {
          tab.btn.className =
            'ctrl-mode-tab px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#bd93f9] text-[#282a36] shadow transition-colors';
        }
      } else {
        tab.panel?.classList.add('hidden');
        if (tab.id === 'dpad') tab.panel?.classList.remove('grid');
        if (tab.btn) {
          tab.btn.className =
            'ctrl-mode-tab px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#6272a4] hover:text-[#f8f8f2] transition-colors';
        }
      }
    });

    if (pedalStation) {
      if (mode === 'wheel') {
        pedalStation.classList.remove('hidden');
        pedalStation.classList.add('flex');
      } else {
        pedalStation.classList.add('hidden');
        pedalStation.classList.remove('flex');
        gasActive = false;
        brakeActive = false;
      }
    }

    world.setAnalogInput(0, 0);
  }

  if (modeJoystickBtn) modeJoystickBtn.addEventListener('click', () => setControlMode('joystick'));
  if (modeWheelBtn) modeWheelBtn.addEventListener('click', () => setControlMode('wheel'));
  if (modeDpadBtn) modeDpadBtn.addEventListener('click', () => setControlMode('dpad'));

  // Option 1: Improved Virtual Analog Joystick (with deadzone & smooth curve)
  if (panelJoystick && joystickKnob) {
    let isDragging = false;
    const maxRadius = 45;
    const deadzone = 0.06;

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

      let rawThrottle = -dy / maxRadius;
      let rawSteer = dx / maxRadius;

      // Deadzone filtering
      if (Math.abs(rawThrottle) < deadzone) rawThrottle = 0;
      if (Math.abs(rawSteer) < deadzone) rawSteer = 0;

      // Quadratic precision curve
      const throttle = Math.sign(rawThrottle) * Math.pow(Math.abs(rawThrottle), 1.2);
      const steer = Math.sign(rawSteer) * Math.pow(Math.abs(rawSteer), 1.2);

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

  // Option 2: Interactive Steering Wheel + Pedals (Setir Mobil Proposional)
  if (panelWheel && steeringWheel) {
    let isWheelDragging = false;
    const maxWheelDeg = 115;

    const updateWheel = (clientX: number, clientY: number) => {
      const rect = panelWheel.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = clientX - cx;
      const dy = clientY - cy;

      // Angle tracking relative to top 12 o'clock
      let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      deg = Math.max(-maxWheelDeg, Math.min(maxWheelDeg, deg));

      steeringWheel.style.transform = `rotate(${deg}deg)`;
      if (wheelAngleHint) wheelAngleHint.textContent = `${Math.round(deg)}°`;

      activeSteer = deg / maxWheelDeg;
      world.setAnalogInput(activeThrottle, activeSteer);
    };

    const resetWheel = () => {
      if (!isWheelDragging) return;
      isWheelDragging = false;
      activeSteer = 0;
      steeringWheel.style.transform = 'rotate(0deg)';
      if (wheelAngleHint) wheelAngleHint.textContent = '0°';
      world.setAnalogInput(activeThrottle, 0);
    };

    panelWheel.addEventListener('pointerdown', (e) => {
      isWheelDragging = true;
      panelWheel.setPointerCapture(e.pointerId);
      updateWheel(e.clientX, e.clientY);
    });

    panelWheel.addEventListener('pointermove', (e) => {
      if (isWheelDragging) {
        updateWheel(e.clientX, e.clientY);
      }
    });

    panelWheel.addEventListener('pointerup', resetWheel);
    panelWheel.addEventListener('pointercancel', resetWheel);

    // Accelerator Gas Pedal
    if (ctrlGasPedal) {
      const startGas = (e: Event) => {
        e.preventDefault();
        gasActive = true;
        ctrlGasPedal.classList.add('scale-95', 'brightness-125');
        updatePedalThrottle();
      };
      const stopGas = (e: Event) => {
        e.preventDefault();
        gasActive = false;
        ctrlGasPedal.classList.remove('scale-95', 'brightness-125');
        updatePedalThrottle();
      };
      ctrlGasPedal.addEventListener('pointerdown', startGas);
      ctrlGasPedal.addEventListener('pointerup', stopGas);
      ctrlGasPedal.addEventListener('pointercancel', stopGas);
      ctrlGasPedal.addEventListener('pointerleave', stopGas);
    }

    // Brake / Reverse Pedal
    if (ctrlBrakePedal) {
      const startBrake = (e: Event) => {
        e.preventDefault();
        brakeActive = true;
        ctrlBrakePedal.classList.add('scale-95', 'brightness-125');
        updatePedalThrottle();
      };
      const stopBrake = (e: Event) => {
        e.preventDefault();
        brakeActive = false;
        ctrlBrakePedal.classList.remove('scale-95', 'brightness-125');
        updatePedalThrottle();
      };
      ctrlBrakePedal.addEventListener('pointerdown', startBrake);
      ctrlBrakePedal.addEventListener('pointerup', stopBrake);
      ctrlBrakePedal.addEventListener('pointercancel', stopBrake);
      ctrlBrakePedal.addEventListener('pointerleave', stopBrake);
    }
  }

  // Option 3: Mobile D-Pad Touch Listeners
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
