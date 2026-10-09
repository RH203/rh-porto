import { PortfolioWorld, CHECKPOINTS, type CheckpointConfig, type CheckpointKey } from './portfolioWorld';

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

  let currentNearCp: CheckpointConfig | null = null;
  let isModalOpen = false;
  let isWelcomeOpen = true;

  const ICONS: Record<string, string> = {
    projects: '💻',
    experience: '💼',
    skills: '⚡',
    education: '🎓',
    contact: '📬',
    help: '❓',
  };

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
  }

  // Modal close
  function closeModal() {
    if (!isModalOpen || !modalBackdrop || !modalCard) return;
    isModalOpen = false;

    modalBackdrop.classList.remove('opacity-100');
    modalBackdrop.classList.add('opacity-0', 'pointer-events-none');
    modalCard.classList.remove('scale-100');
    modalCard.classList.add('scale-95');

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
  });

  // Proximity click
  if (proximityBtn) {
    proximityBtn.addEventListener('click', () => {
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
      closeWelcomeModal();
    });
  }
  if (welcomeStartBtn) {
    welcomeStartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeWelcomeModal();
    });
  }
  if (welcomeBackdrop) {
    welcomeBackdrop.addEventListener('click', (e) => {
      if (e.target === welcomeBackdrop) {
        e.preventDefault();
        closeWelcomeModal();
      }
    });
  }

  // Controls help
  if (btnHelp) {
    btnHelp.addEventListener('click', openWelcomeModal);
  }

  // Info modal triggers
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

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
}

// Run when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPortfolioApp);
} else {
  initPortfolioApp();
}
