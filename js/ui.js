function setGroupDirection(dir) {
    groupDirection = dir;
    ['left', 'up', 'down', 'right'].forEach(d => {
        const btn = document.getElementById(`dir-${d}`);
        if (btn) {
            if (d === dir) {
                btn.className = 'w-7 h-7 bg-indigo-100 hover:bg-indigo-200 rounded border border-indigo-300 flex items-center justify-center transition';
            } else {
                btn.className = 'w-7 h-7 bg-white hover:bg-indigo-100 rounded border border-indigo-200 flex items-center justify-center transition';
            }
        }
    });
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
}

function setTool(mode) {
    currentTool = mode;
    reactionSelection = [];
    reactionStep = 0;
    reactionContext = null;

    ['move', 'addition', 'dehydration', 'oxidation'].forEach(m => {
        const btn = document.getElementById(`tool-${m}`);
        if (btn) {
            if (m === mode) {
                btn.classList.add('active', 'bg-indigo-100', 'text-indigo-700');
            } else {
                btn.classList.remove('active', 'bg-indigo-100', 'text-indigo-700');
            }
        }
    });
    updateToolOptions();
    if (typeof render === 'function') render();
}

function setReagent(r) {
    currentReagent = r;
    updateToolOptions();
}

function updateToolOptions() {
    const container = document.getElementById('tool-options');
    if (!container) return;
    container.innerHTML = '';
    container.classList.toggle('hidden', currentTool === 'move');

    if (currentTool === 'addition') {
        ['H2', 'HCl', 'Cl2', 'H2O'].forEach(r => {
            const btn = document.createElement('button');
            btn.className = `px-2 py-1 text-xs font-bold rounded border ${currentReagent === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`;
            btn.innerText = r;
            btn.onclick = () => setReagent(r);
            container.appendChild(btn);
        });
    } else if (currentTool === 'dehydration') {
        container.innerHTML = '<span class="text-xs font-bold text-slate-600">周囲8マス内のH2個とO1個を選択 (Select 2H & 1O)</span>';
    } else if (currentTool === 'oxidation') {
        container.innerHTML = '<span class="text-xs font-bold text-slate-600">Click Alcohol/Aldehyde C</span>';
    }
}

function updateUI() {
    const panel = document.getElementById('prop-panel');
    if (panel) panel.classList.toggle('hidden', !viewSettings.prop);
}

function toggleView(mode) {
    viewSettings[mode] = !viewSettings[mode];
    updateButtonState(mode);
    updateUI();
    if (typeof render === 'function') render();
}

function updateButtonState(mode) {
    const btn = document.getElementById(`btn-view-${mode}`);
    if (btn) {
        if (viewSettings[mode]) {
            btn.classList.add('bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
            btn.classList.remove('bg-slate-100', 'text-slate-600', 'border-slate-200');
        } else {
            btn.classList.add('bg-slate-100', 'text-slate-600', 'border-slate-200');
            btn.classList.remove('bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
        }
    }
    // Handle duplicate chiral button
    if (mode === 'chiral') {
        const lbl = document.getElementById('chiral-label');
        if (lbl) lbl.innerText = viewSettings.chiral ? 'ON' : 'OFF';
        const cBtn = document.getElementById('btn-chiral');
        if (cBtn) {
            if (viewSettings.chiral) {
                cBtn.classList.add('bg-amber-100');
            } else {
                cBtn.classList.remove('bg-amber-100');
            }
        }
    }
}

function toggleChiral() {
    toggleView('chiral');
}

function showModal(title, body, confirmText = "Confirm", isDanger = false, onConfirm) {
    const modal = document.getElementById('custom-modal');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');

    titleEl.querySelector('span').innerText = title;
    bodyEl.innerText = body;
    confirmBtn.innerText = confirmText;

    confirmBtn.className = isDanger ? 'modal-btn modal-btn-danger' : 'modal-btn modal-btn-confirm';

    modal.classList.add('active');

    const close = () => {
        modal.classList.remove('active');
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
    };

    confirmBtn.onclick = () => {
        if (onConfirm) onConfirm();
        close();
    };
    cancelBtn.onclick = close;
}

function fillHydrogen() {
    let added = false;
    const currentAtoms = [...atoms];

    currentAtoms.forEach(a => {
        const used = Chemistry.countUsedValency(a);
        const val = VALENCY[a.type];
        const rem = val - used;

        if (rem <= 0) return;

        const openDirs = getBestOpenDirection(a, atoms, GRID_SIZE);

        for (let i = 0; i < Math.min(rem, openDirs.length); i++) {
            const d = openDirs[i];
            const hx = a.x + d.x * GRID_SIZE;
            const hy = a.y + d.y * GRID_SIZE;
            if (hx >= 0 && hy >= 0) {
                const hAtom = createAtom('H', hx, hy);
                if (hAtom) {
                    if (!a.bondMemory) a.bondMemory = {};
                    if (!hAtom.bondMemory) hAtom.bondMemory = {};
                    a.bondMemory[hAtom.id] = hAtom.bondMemory[a.id] = 1;
                    added = true;
                }
            }
        }
    });

    if (added) {
        saveState();
        updateLogic();
    }
}

function removeHydrogen() {
    if (atoms.filter(a => a.type === 'H').length === 0) return;

    atoms = atoms.filter(a => a.type !== 'H');
    atoms.forEach(a => {
        if (a.bondMemory) {
            Object.keys(a.bondMemory).forEach(id => {
                if (!atoms.find(at => at.id === id)) {
                    delete a.bondMemory[id];
                }
            });
        }
    });
    saveState();
    updateLogic();
}
