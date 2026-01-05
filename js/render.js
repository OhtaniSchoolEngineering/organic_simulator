function updateLogic(full = true) {
    if (!atoms) return;
    atoms.forEach(a => a.connections = []);
    let pairs = [];
    for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
            const a = atoms[i], b = atoms[j];
            const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

            let threshold = GRID_SIZE + 10;
            // Allow C-C bonds up to 2 grid units
            if (a.type === 'C' && b.type === 'C') {
                threshold = GRID_SIZE * 2 + 10;
            }

            // Disallow diagonal bonds: atoms must share either X or Y coordinate
            const isOrthogonal = Math.abs(a.x - b.x) < 5 || Math.abs(a.y - b.y) < 5;
            if (!isOrthogonal) continue;

            if (dist > 0 && dist <= threshold) {
                // Prevent bonding across another atom
                if (dist > GRID_SIZE + 10) {
                    const midX = (a.x + b.x) / 2;
                    const midY = (a.y + b.y) / 2;
                    const hasObstacle = atoms.some(o =>
                        o.id !== a.id && o.id !== b.id &&
                        Math.abs(o.x - midX) < 5 && Math.abs(o.y - midY) < 5
                    );
                    if (hasObstacle) continue;
                }

                const memOrd = a.bondMemory?.[b.id];
                const ord = (memOrd !== undefined) ? memOrd : 1;
                pairs.push({ a, b, ord: ord, hasMemory: memOrd !== undefined });
            }
        }
    }
    pairs.sort((p1, p2) => {
        if (p1.hasMemory !== p2.hasMemory) return p2.hasMemory ? 1 : -1;
        return p2.ord - p1.ord;
    });
    pairs.forEach(p => {
        if (p.ord > 0 && canConn(p.a, p.b, p.ord)) {
            conn(p.a, p.b, p.ord);
        }
    });
    if (full) render(); else renderBonds();
}

function canConn(a, b, o) {
    return Chemistry.canConnect(a, b, o);
}
function conn(a, b, o) {
    a.connections.push({ targetId: b.id, type: o });
    b.connections.push({ targetId: a.id, type: o });
}

function renderBonds() {
    const cv = document.getElementById('canvas');
    if (!cv) return;

    cv.querySelectorAll('.bond, .empty-arm').forEach(b => b.remove());
    atoms.forEach(a => renderArms(a, cv));
    const done = new Set();
    atoms.forEach(a => a.connections.forEach(c => {
        const k = [a.id, c.targetId].sort().join('-');
        if (!done.has(k)) { done.add(k); createLine(a, atoms.find(x => x.id === c.targetId), c.type, cv); }
    }));
}

function render() {
    const cv = document.getElementById('canvas');
    if (!cv) return;

    const sb = document.getElementById('selection-box');
    if (sb) { cv.innerHTML = ''; cv.appendChild(sb); }

    renderHighlights();
    renderBonds();
    atoms.forEach(a => {
        const div = document.createElement('div');
        div.id = `atom-${a.id}`;
        let interactClass = '';
        if (currentTool === 'move') interactClass = 'cursor-grab';
        else if (currentTool === 'dehydration' && (a.type === 'H' || a.type === 'O')) interactClass = 'reaction-target';
        else if (currentTool === 'oxidation' && a.type === 'C') interactClass = 'reaction-target';
        else if (currentTool === 'addition' && typeof reactionStep !== 'undefined' && reactionStep === 1 && reactionSelection.includes(a.id)) interactClass = 'reaction-target';
        else if (currentTool !== 'move') interactClass = 'cursor-not-allowed';

        div.className = `atom atom-${a.type} ${interactClass} ${selectedAtomIds.has(a.id) ? 'atom-selected' : ''} ${reactionSelection.includes(a.id) ? 'atom-reaction-selected' : ''}`;
        div.innerText = a.type; div.style.left = `${a.x}px`; div.style.top = `${a.y}px`;
        if (viewSettings.chiral && a.type === 'C' && checkChiral(a)) {
            const m = document.createElement('span'); m.className = 'absolute -top-2 -right-2 text-amber-500 text-2xl font-bold'; m.innerText = '*';
            div.appendChild(m);
        }
        div.onmousedown = (e) => startDrag(e, a);
        cv.appendChild(div);
    });
    processMols();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderArms(atom, container) {
    const used = atom.connections.reduce((s, c) => s + c.type, 0);
    const rem = VALENCY[atom.type] - used;
    if (rem <= 0) return;

    let ds = [
        { x: 1, y: 0, a: 0, d: 'right' },
        { x: -1, y: 0, a: 180, d: 'left' },
        { x: 0, y: 1, a: 90, d: 'down' },
        { x: 0, y: -1, a: 270, d: 'up' }
    ];

    if (atom.prefDir) {
        const pref = ds.find(d => d.d === atom.prefDir);
        if (pref) ds = [pref, ...ds.filter(d => d.d !== atom.prefDir)];
    } else {
        if (atom.connections.length > 0) {
            let sumX = 0, sumY = 0;
            atom.connections.forEach(cn => {
                const t = atoms.find(x => x.id === cn.targetId);
                if (t) {
                    sumX += Math.sign(Math.round((t.x - atom.x) / GRID_SIZE));
                    sumY += Math.sign(Math.round((t.y - atom.y) / GRID_SIZE));
                }
            });
            const targetX = -sumX, targetY = -sumY;
            ds.sort((a, b) => {
                const scoreA = a.x * targetX + a.y * targetY;
                const scoreB = b.x * targetX + b.y * targetY;
                return scoreB - scoreA;
            });
        }
    }

    let displayed = 0;
    ds.forEach(d => {
        if (displayed >= rem) return;
        const isOccupied = atom.connections.some(cn => {
            const t = atoms.find(x => x.id === cn.targetId);
            if (!t) return false;
            const rdx = Math.sign(Math.round((t.x - atom.x) / GRID_SIZE));
            const rdy = Math.sign(Math.round((t.y - atom.y) / GRID_SIZE));
            return rdx === d.x && rdy === d.y;
        });

        if (!isOccupied) {
            if (viewSettings.ghostHydrogen && !selectedAtomIds.has(atom.id)) {
                const gx = atom.x + d.x * GRID_SIZE;
                const gy = atom.y + d.y * GRID_SIZE;
                const arm = document.createElement('div');
                arm.className = 'empty-arm';
                arm.style.left = `${atom.x}px`; arm.style.top = `${atom.y}px`;
                arm.style.transform = `rotate(${d.a}deg) translateX(${ATOM_SIZE / 2}px)`;
                container.appendChild(arm);

                const ghost = document.createElement('div');
                ghost.className = 'atom atom-ghost-H';
                ghost.innerText = 'H';
                ghost.style.position = 'absolute';
                ghost.style.left = `${gx}px`; ghost.style.top = `${gy}px`;
                ghost.style.transform = 'translate(-50%, -50%) scale(0.8)';
                container.appendChild(ghost);
            } else {
                const arm = document.createElement('div'); arm.className = 'empty-arm';
                arm.style.left = `${atom.x}px`; arm.style.top = `${atom.y}px`;
                arm.style.transform = `rotate(${d.a}deg) translateX(${ATOM_SIZE / 2}px)`;
                container.appendChild(arm);
            }
            displayed++;
        }
    });
}

function createLine(a, b, type, container) {
    if (!a || !b) return;
    const dist = getDistance(a.x, a.y, b.x, b.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    const l = document.createElement('div');
    l.className = `bond bond-${type === 3 ? 'triple' : type === 2 ? 'double' : 'single'}`;
    if (currentTool === 'addition' && type >= 2 && (typeof reactionStep === 'undefined' || reactionStep === 0)) {
        l.classList.add('bond-addition-eligible');
    }
    l.style.width = `${dist}px`; l.style.left = `${a.x}px`; l.style.top = `${a.y}px`; l.style.transform = `rotate(${ang}deg)`;

    if (currentTool === 'addition' && type >= 2) {
        l.style.cursor = 'pointer';
        l.onmouseenter = () => l.classList.add('bond-hover');
        l.onmouseleave = () => l.classList.remove('bond-hover');
        l.onclick = (e) => {
            e.stopPropagation();
            executeAddition(a, b, type);
        };
    } else {
        l.onclick = null;
        l.onmouseenter = null;
        l.onmouseleave = null;
        l.style.cursor = 'default';
    }
    container.appendChild(l);
}

function checkChiral(a) {
    return Chemistry.isChiral(a, atoms);
}

function processMols() {
    const mols = Chemistry.analyzeMolecules(atoms, viewSettings);
    const st = document.getElementById('status-text');
    if (st) st.innerText = mols.length > 0 ? mols.join(', ') : 'Ready';
    const lst = document.getElementById('molecule-list');
    if (lst) {
        lst.innerHTML = '';
        mols.forEach(mName => {
            const li = document.createElement('div');
            li.className = 'p-2 border-b last:border-0 text-sm border-slate-100';
            li.innerText = mName;
            lst.appendChild(li);
        });
    }
}

function renderHighlights() {
    if (!viewSettings.highlightGroups) return;
    const cv = document.getElementById('canvas');
    if (!cv) return;

    // Remove existing highlights
    cv.querySelectorAll('.group-highlight').forEach(el => el.remove());

    const visited = new Set();
    atoms.forEach(atom => {
        if (visited.has(atom.id)) return;

        // BFS to get all atoms in this molecule
        const component = [];
        const queue = [atom];
        visited.add(atom.id);

        while (queue.length > 0) {
            const current = queue.pop();
            component.push(current);
            current.connections.forEach(conn => {
                if (!visited.has(conn.targetId)) {
                    visited.add(conn.targetId);
                    const neighbor = atoms.find(a => a.id === conn.targetId);
                    if (neighbor) queue.push(neighbor);
                }
            });
        }

        // Identify functional groups in this molecule
        let groups = [];
        if (viewSettings.highlightGroups) {
            groups = groups.concat(Chemistry.identifyFunctionalGroups(component));
        }
        if (viewSettings.iodoform) {
            groups = groups.concat(Chemistry.identifyIodoformPositive(component));
        }

        groups.forEach(group => {
            const groupAtoms = group.atomIds.map(id => atoms.find(a => a.id === id)).filter(a => a);
            if (groupAtoms.length === 0) return;

            // Calculate bounding box
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            groupAtoms.forEach(a => {
                minX = Math.min(minX, a.x);
                minY = Math.min(minY, a.y);
                maxX = Math.max(maxX, a.x);
                maxY = Math.max(maxY, a.y);
            });

            // Add padding
            const padding = 30;
            const x = minX - padding;
            const y = minY - padding;
            const w = (maxX - minX) + padding * 2;
            const h = (maxY - minY) + padding * 2;

            const highlight = document.createElement('div');
            highlight.className = `group-highlight highlight-${group.type}`;
            highlight.style.left = `${x}px`;
            highlight.style.top = `${y}px`;
            highlight.style.width = `${w}px`;
            highlight.style.height = `${h}px`;

            // Add label on hover (optional enhancement)
            highlight.title = group.name;
            highlight.setAttribute('data-name', group.name);

            cv.appendChild(highlight);
        });
    });
}
