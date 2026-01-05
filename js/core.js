function createAtom(type, x, y) {
    if (atoms.some(a => a.x === x && a.y === y)) return null;
    const id = Math.random().toString(36).substr(2, 9);
    const newAtom = { id, type, x, y, connections: [], bondMemory: {} };
    atoms.push(newAtom);
    return newAtom;
}

function createFunctionalGroup(groupId, bx, by) {
    const dir = (typeof groupDirection !== 'undefined' && groupDirection) ? groupDirection : 'left';

    if (typeof GROUPS === 'undefined' || !GROUPS[groupId]) {
        alert("エラー: 官能基データ定義が見つかりません (" + groupId + ")");
        return;
    }

    let group;
    try {
        group = rotateGroupAtoms(GROUPS[groupId], dir);
    } catch (e) {
        console.error(e);
        alert("エラー: 官能基の回転処理に失敗しました。");
        return;
    }

    if (!group) return;

    const newAtoms = [];
    group.atoms.forEach((ga, idx) => {
        const ax = bx + ga.dx * GRID_SIZE;
        const ay = by + ga.dy * GRID_SIZE;
        let a = atoms.find(atm => atm.x === ax && atm.y === ay);
        if (!a) a = createAtom(ga.type, ax, ay);

        // Mark the junction atom (index 0) with intended connection direction
        if (a && idx === 0) a.prefDir = dir;
        newAtoms.push(a);
    });

    group.bonds.forEach(bond => {
        const aIdx = bond[0], bIdx = bond[1], order = bond[2];
        if (aIdx === -1) {
            // Bond to parent atom (passed as bx, by)
            const parent = atoms.find(atm => atm.x === bx && atm.y === by);
            const b = newAtoms[bIdx];
            if (parent && b) {
                if (!parent.bondMemory) parent.bondMemory = {};
                if (!b.bondMemory) b.bondMemory = {};
                parent.bondMemory[b.id] = b.bondMemory[parent.id] = order;
            }
        } else {
            const a = newAtoms[aIdx], b = newAtoms[bIdx];
            if (a && b) {
                if (!a.bondMemory) a.bondMemory = {};
                if (!b.bondMemory) b.bondMemory = {};
                a.bondMemory[b.id] = b.bondMemory[a.id] = order;
            }
        }
    });
}

function cycleBond(a, b) {
    const current = (a.bondMemory?.[b.id] !== undefined) ? a.bondMemory[b.id] : 0;
    // Cycle: 0 -> 1 -> 2 -> 3 -> 1 (skipping 0)
    let next;
    if (current === 0) next = 1;
    else if (current === 1) next = 2;
    else if (current === 2) next = 3;
    else if (current === 3) next = 1;

    if (!a.bondMemory) a.bondMemory = {}; if (!b.bondMemory) b.bondMemory = {};
    a.bondMemory[b.id] = b.bondMemory[a.id] = next;
}

function deleteAtom(id) {
    atoms = atoms.filter(a => a.id !== id);
    atoms.forEach(a => { if (a.bondMemory) delete a.bondMemory[id]; });
}

function clearCanvas() {
    if (atoms.length === 0) return;
    showModal("Canvas Reset", "キャンバスの内容を全て消去しますか？", "消去する", true, () => {
        atoms = [];
        selectedAtomIds.clear();
        saveState();
        updateLogic();
    });
}
