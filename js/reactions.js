function handleReactionClick(atom) {
    if (currentTool === 'dehydration') {
        if (reactionSelection.includes(atom.id)) {
            reactionSelection = reactionSelection.filter(id => id !== atom.id);
        } else {
            reactionSelection.push(atom.id);
            if (reactionSelection.length === 3) {
                executeDehydrationV3();
            }
        }
        render();
    }
    else if (currentTool === 'oxidation') {
        if (atom.type === 'C') {
            executeOxidationV2(atom);
        }
    }
    else if (currentTool === 'addition' && reactionStep === 1 && reactionContext) {
        const { a, b, type } = reactionContext;
        if (atom.id === a.id || atom.id === b.id) {
            finalizeAddition(atom, atom.id === a.id ? b : a);
        }
    }
}

function executeAddition(a, b, type) {
    if (type < 2) return;

    if (currentReagent === 'H2' || currentReagent === 'Cl2') {
        saveState();
        a.bondMemory[b.id] = b.bondMemory[a.id] = type - 1;
        let atomType = (currentReagent === 'H2') ? 'H' : 'Cl';
        addAtomTo(a, atomType);
        addAtomTo(b, atomType);
        updateLogic();
    } else {
        reactionStep = 1;
        reactionContext = { a, b, type };
        const container = document.getElementById('tool-options');
        container.innerHTML = `<span class="text-xs font-bold text-red-600 bg-red-50 p-1 rounded">Hをつける原子をクリック (Click atom for H)</span>`;
        reactionSelection = [a.id, b.id];
        render();
    }
}

function finalizeAddition(targetForH, otherAtom) {
    saveState();
    const { type } = reactionContext;
    targetForH.bondMemory[otherAtom.id] = otherAtom.bondMemory[targetForH.id] = type - 1;
    addAtomTo(targetForH, 'H');
    let otherType = (currentReagent === 'HCl') ? 'Cl' : 'O';
    const newOther = addAtomTo(otherAtom, otherType);
    if (currentReagent === 'H2O' && newOther) {
        addAtomTo(newOther, 'H');
    }
    reactionStep = 0;
    reactionContext = null;
    reactionSelection = [];
    updateToolOptions();
    updateLogic();
    render();
}

function addAtomTo(parentAtom, type) {
    const openDirs = getBestOpenDirection(parentAtom, atoms, GRID_SIZE);

    // Pick the first available direction
    if (openDirs.length > 0) {
        const d = openDirs[0];
        const nx = parentAtom.x + d.x * GRID_SIZE;
        const ny = parentAtom.y + d.y * GRID_SIZE;
        const newAtom = createAtom(type, nx, ny);
        if (newAtom) {
            // Ensure single bond (1) is established for new addition atoms
            if (!parentAtom.bondMemory) parentAtom.bondMemory = {};
            if (!newAtom.bondMemory) newAtom.bondMemory = {};
            parentAtom.bondMemory[newAtom.id] = newAtom.bondMemory[parentAtom.id] = 1;
            return newAtom;
        }
    }
    return null;
}

function executeDehydrationV3() {
    if (reactionSelection.length !== 3) return;
    const selectedAtoms = reactionSelection.map(id => atoms.find(a => a.id === id)).filter(a => a);
    if (selectedAtoms.length !== 3) { reactionSelection = []; render(); return; }

    const first = selectedAtoms[0];
    const hAtoms = selectedAtoms.filter(a => a.type === 'H');
    const oAtoms = selectedAtoms.filter(a => a.type === 'O');

    if (hAtoms.length !== 2 || oAtoms.length !== 1) {
        showModal("脱水反応エラー", "H原子2個とO原子1個（計3個）を選択してください。", "了解", false);
        reactionSelection = []; render(); return;
    }

    // Proximity check: All selected must be within 1 grid unit (orthogonal or diagonal) from the first
    const tooFar = selectedAtoms.some(a =>
        Math.abs(a.x - first.x) > GRID_SIZE + 5 || Math.abs(a.y - first.y) > GRID_SIZE + 5
    );
    if (tooFar) {
        showModal("脱水反応エラー", "選択した原子が互いに離れすぎています。最初に選んだ原子の周囲8マスの範囲内で選択してください。", "了解", false);
        reactionSelection = []; render(); return;
    }

    saveState();

    // Identify carbons that were bonded to the removed atoms to increase bond order
    const partners = new Set();
    selectedAtoms.forEach(a => {
        a.connections.forEach(c => {
            if (!reactionSelection.includes(c.targetId)) {
                partners.add(c.targetId);
            }
        });
    });

    const partnerAtoms = Array.from(partners).map(id => atoms.find(at => at.id === id)).filter(at => at && at.type === 'C');

    // If atoms were on two different carbons, increase bond order between them
    if (partnerAtoms.length >= 2) {
        for (let i = 0; i < partnerAtoms.length; i++) {
            for (let j = i + 1; j < partnerAtoms.length; j++) {
                const c1 = partnerAtoms[i];
                const c2 = partnerAtoms[j];
                // Check if they are adjacent or near enough to be bonded
                const dist = Math.sqrt((c1.x - c2.x) ** 2 + (c1.y - c2.y) ** 2);
                if (dist <= GRID_SIZE * 2 + 10) {
                    let order = (c1.bondMemory?.[c2.id] || 0);
                    // Only increase if they were already bonded or are eligible for 1-2 grid bond
                    if (order === 0) order = 1;
                    else order = Math.min(order + 1, 3);

                    if (!c1.bondMemory) c1.bondMemory = {};
                    if (!c2.bondMemory) c2.bondMemory = {};
                    c1.bondMemory[c2.id] = c2.bondMemory[c1.id] = order;
                }
            }
        }
    }

    // Delete selected atoms
    selectedAtoms.forEach(a => deleteAtom(a.id));

    reactionSelection = [];
    updateLogic();
    if (typeof setTool === 'function') setTool('move');
    render();
}

function executeOxidationV2(cAtom) {
    const ohConn = cAtom.connections.find(cn => {
        const t = atoms.find(x => x.id === cn.targetId);
        return t && t.type === 'O' && cn.type === 1 && t.connections.some(tc => atoms.find(x => x.id === tc.targetId)?.type === 'H');
    });

    if (ohConn) {
        saveState();
        const oAtom = atoms.find(x => x.id === ohConn.targetId);
        const hOfO = oAtom.connections.find(c => atoms.find(x => x.id === c.targetId)?.type === 'H');
        if (hOfO) deleteAtom(hOfO.targetId);
        const hOfC = cAtom.connections.find(c => atoms.find(x => x.id === c.targetId)?.type === 'H');
        if (hOfC) {
            deleteAtom(hOfC.targetId);
            if (!cAtom.bondMemory) cAtom.bondMemory = {};
            if (!oAtom.bondMemory) oAtom.bondMemory = {};
            cAtom.bondMemory[oAtom.id] = oAtom.bondMemory[cAtom.id] = 2;
        }
        updateLogic();
        return;
    }

    const carbonylConn = cAtom.connections.find(cn => cn.type === 2 && atoms.find(x => x.id === cn.targetId)?.type === 'O');
    const hConn = cAtom.connections.find(cn => cn.type === 1 && atoms.find(x => x.id === cn.targetId)?.type === 'H');

    if (carbonylConn && hConn) {
        saveState();
        const hAtom = atoms.find(x => x.id === hConn.targetId);
        const oldX = hAtom.x;
        const oldY = hAtom.y;
        deleteAtom(hAtom.id);
        const newO = createAtom('O', oldX, oldY);
        if (newO) {
            if (!cAtom.bondMemory) cAtom.bondMemory = {};
            if (!newO.bondMemory) newO.bondMemory = {};
            cAtom.bondMemory[newO.id] = newO.bondMemory[cAtom.id] = 1;
            const dx = newO.x - cAtom.x;
            const dy = newO.y - cAtom.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                const hx = newO.x + (dx / len) * GRID_SIZE;
                const hy = newO.y + (dy / len) * GRID_SIZE;
                const newH = createAtom('H', hx, hy);
                if (newH) {
                    if (!newO.bondMemory) newO.bondMemory = {};
                    if (!newH.bondMemory) newH.bondMemory = {};
                    newO.bondMemory[newH.id] = newH.bondMemory[newO.id] = 1;
                }
            }
        }
        updateLogic();
        return;
    }
}
