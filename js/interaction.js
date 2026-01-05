let isPanning = false;

function handlePantryDragStart(e, mode, value) {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('mode', mode);
    e.dataTransfer.setData('value', value);

    const emptyImg = new Image();
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(emptyImg, 0, 0);

    const dragGhost = document.getElementById('drag-ghost');
    dragGhost.innerHTML = '';
    dragGhost.style.display = 'block';
    dragGhost.style.pointerEvents = 'none';

    if (mode === 'atom') {
        const atomEl = document.createElement('div');
        atomEl.className = `atom atom-${value}`;
        atomEl.innerText = value;
        atomEl.style.position = 'absolute';
        atomEl.style.left = '0px';
        atomEl.style.top = '0px';
        dragGhost.appendChild(atomEl);

        const valency = VALENCY[value] || 0;
        const directions = [{ a: 0 }, { a: 90 }, { a: 180 }, { a: 270 }];
        for (let i = 0; i < Math.min(valency, 4); i++) {
            const arm = document.createElement('div');
            arm.className = 'empty-arm';
            arm.style.position = 'absolute';
            arm.style.left = '0px';
            arm.style.top = '0px';
            arm.style.transform = `rotate(${directions[i].a}deg) translateX(${ATOM_SIZE / 2}px)`;
            dragGhost.appendChild(arm);
        }
    } else {
        const group = rotateGroupAtoms(GROUPS[value], groupDirection || 'left');
        const container = document.createElement('div');
        container.style.position = 'relative';

        const anchorAtom = group.atoms[0];
        const offsetX = anchorAtom.dx * GRID_SIZE;
        const offsetY = anchorAtom.dy * GRID_SIZE;

        group.bonds.forEach(b => {
            const start = group.atoms[b[0]], end = group.atoms[b[1]], type = b[2];
            const x1 = start.dx * GRID_SIZE - offsetX;
            const y1 = start.dy * GRID_SIZE - offsetY;
            const x2 = end.dx * GRID_SIZE - offsetX;
            const y2 = end.dy * GRID_SIZE - offsetY;
            const dx = x2 - x1, dy = y2 - y1;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ang = Math.atan2(dy, dx) * 180 / Math.PI;
            const line = document.createElement('div');
            line.className = `bond bond-${type === 3 ? 'triple' : type === 2 ? 'double' : 'single'} opacity-50`;
            line.style.position = 'absolute';
            line.style.width = `${dist}px`;
            line.style.left = `${x1}px`;
            line.style.top = `${y1}px`;
            line.style.transform = `rotate(${ang}deg)`;
            line.style.transformOrigin = 'center left';
            container.appendChild(line);
        });

        group.atoms.forEach(ga => {
            const el = document.createElement('div');
            el.className = `atom atom-${ga.type} scale-90`;
            el.style.position = 'absolute';
            el.style.left = `${ga.dx * GRID_SIZE - offsetX}px`;
            el.style.top = `${ga.dy * GRID_SIZE - offsetY}px`;
            el.style.transform = 'translate(-50%, -50%) scale(0.9)';
            el.innerText = ga.type;
            container.appendChild(el);
            const valency = VALENCY[ga.type] || 0;
            const used = group.bonds.filter(b => group.atoms[b[0]] === ga || group.atoms[b[1]] === ga).reduce((s, b) => s + b[2], 0);
            const rem = valency - used;
            if (rem > 0) {
                let ds = [{ x: -1, y: 0, a: 180, d: 'left' }, { x: 0, y: -1, a: 270, d: 'up' }, { x: 0, y: 1, a: 90, d: 'down' }, { x: 1, y: 0, a: 0, d: 'right' }];
                if (group.atoms.indexOf(ga) === 0) {
                    const pref = ds.find(d => d.d === (groupDirection || 'left'));
                    if (pref) ds = [pref, ...ds.filter(d => d.d !== (groupDirection || 'left'))];
                }
                let displayed = 0;
                ds.forEach(d => {
                    if (displayed >= rem) return;
                    const isOccupied = group.atoms.some(other => other !== ga && other.dx === ga.dx + d.x && other.dy === ga.dy + d.y);
                    if (!isOccupied) {
                        const arm = document.createElement('div');
                        arm.className = 'empty-arm';
                        arm.style.position = 'absolute';
                        arm.style.left = `${ga.dx * GRID_SIZE - offsetX}px`;
                        arm.style.top = `${ga.dy * GRID_SIZE - offsetY}px`;
                        arm.style.transform = `rotate(${d.a}deg) translateX(${ATOM_SIZE / 2}px)`;
                        container.appendChild(arm);
                        displayed++;
                    }
                });
            }
        });
        dragGhost.appendChild(container);
    }

    const updateGhost = (me) => {
        dragGhost.style.left = `${me.clientX}px`;
        dragGhost.style.top = `${me.clientY}px`;
    };

    document.addEventListener('dragover', updateGhost);
    document.addEventListener('dragend', () => {
        dragGhost.style.display = 'none';
        document.removeEventListener('dragover', updateGhost);
    }, { once: true });
}

function handleDrop(e) {
    try {
        e.preventDefault();
        if (typeof setTool === 'function' && currentTool !== 'move') setTool('move');

        const mode = e.dataTransfer.getData('mode');
        const value = e.dataTransfer.getData('value');
        if (!mode) return;

        const cv = document.getElementById('canvas');
        if (!cv) return;

        const rect = cv.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const baseX = Math.round(x / GRID_SIZE) * GRID_SIZE;
        const baseY = Math.round(y / GRID_SIZE) * GRID_SIZE;

        if (mode === 'atom') {
            createAtom(value, baseX, baseY);
        } else if (mode === 'group') {
            createFunctionalGroup(value, baseX, baseY);
        }
        saveState();
        updateLogic();
    } catch (err) {
        console.error(err);
        alert("操作エラー: " + err.message);
    }
}

function handleCanvasMouseDown(e) {
    const cv = document.getElementById('canvas');
    if (e.target !== cv) return;
    const rect = cv.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    // Selection box logic
    const sb = document.getElementById('selection-box');
    sb.style.display = 'block';
    sb.style.left = `${startX}px`;
    sb.style.top = `${startY}px`;
    sb.style.width = '0px'; sb.style.height = '0px';

    function onMouseMove(me) {
        const curX = me.clientX - rect.left;
        const curY = me.clientY - rect.top;
        const x = Math.min(startX, curX), y = Math.min(startY, curY);
        const w = Math.abs(startX - curX), h = Math.abs(startY - curY);
        sb.style.left = `${x}px`; sb.style.top = `${y}px`;
        sb.style.width = `${w}px`; sb.style.height = `${h}px`;
        selectedAtomIds.clear();
        atoms.forEach(a => { if (a.x >= x && a.x <= x + w && a.y >= y && a.y <= y + h) selectedAtomIds.add(a.id); });
        render();
    }
    function onMouseUp() { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); sb.style.display = 'none'; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    selectedAtomIds.clear(); render();
}

function startDrag(e, atom) {
    e.preventDefault(); e.stopPropagation();

    if (currentTool !== 'move') {
        handleReactionClick(atom);
        return;
    }

    saveState();
    const cv = document.getElementById('canvas');
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const startMouseX = e.clientX, startMouseY = e.clientY;

    if (e.ctrlKey || selectedAtomIds.has(atom.id)) { } else { selectedAtomIds.clear(); selectedAtomIds.add(atom.id); }
    render();
    const initials = new Map();
    selectedAtomIds.forEach(id => {
        const a = atoms.find(x => x.id === id);
        initials.set(id, { x: a.x, y: a.y });
        const el = document.getElementById(`atom-${id}`);
        if (el) {
            el.classList.add('atom-dragging');
        }
    });

    selectedAtomIds.forEach(id => {
        const el = document.getElementById(`atom-${id}`);
        if (el) document.body.appendChild(el);
    });

    const header = document.getElementById('header');
    const footer = document.getElementById('footer');

    function onMouseMove(me) {
        const dx = me.clientX - startMouseX, dy = me.clientY - startMouseY;
        const isTrash = me.clientY < header.offsetHeight || me.clientY > (window.innerHeight - footer.offsetHeight);
        selectedAtomIds.forEach(id => {
            const a = atoms.find(x => x.id === id), init = initials.get(id);
            a.x = init.x + dx; a.y = init.y + dy;
            const el = document.getElementById(`atom-${id}`);
            if (el) {
                el.style.left = `${init.x + rect.left + dx}px`;
                el.style.top = `${init.y + rect.top + dy}px`;

                if (isTrash) {
                    el.classList.add('atom-trash');
                    el.innerText = '';
                } else {
                    el.classList.remove('atom-trash');
                    el.innerText = a.type;
                }
            }
        });

        // Show bond hint when overlapping
        const dragHint = document.getElementById('drag-hint');
        let hintText = '';
        if (selectedAtomIds.size === 1) {
            const dragAtomId = Array.from(selectedAtomIds)[0];
            const a = atoms.find(x => x.id === dragAtomId);
            const sx = Math.round(a.x / GRID_SIZE) * GRID_SIZE;
            const sy = Math.round(a.y / GRID_SIZE) * GRID_SIZE;
            const target = atoms.find(o => o.id !== a.id && o.x === sx && o.y === sy);

            if (target && !isTrash) {
                const current = (a.bondMemory?.[target.id] !== undefined) ? a.bondMemory[target.id] : 0;
                let next;
                if (current === 0) next = 1;
                else if (current === 1) next = 2;
                else if (current === 2) next = 3;
                else if (current === 3) next = 1;

                const bondNames = ["", "単結合に変化", "二重結合に変化", "三重結合に変化"];
                hintText = bondNames[next];
            }
        }

        if (hintText) {
            dragHint.innerText = hintText;
            dragHint.style.display = 'block';
            dragHint.style.left = `${me.clientX}px`;
            dragHint.style.top = `${me.clientY}px`;
        } else {
            dragHint.style.display = 'none';
        }

        updateLogic(false);
    }

    function onMouseUp(me) {
        window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp);
        const dragHint = document.getElementById('drag-hint');
        if (dragHint) dragHint.style.display = 'none';
        const isTrash = me.clientY < header.offsetHeight || me.clientY > (window.innerHeight - footer.offsetHeight);

        selectedAtomIds.forEach(id => {
            const el = document.getElementById(`atom-${id}`);
            if (el) { el.classList.remove('atom-dragging'); cv.appendChild(el); }
            if (isTrash) deleteAtom(id);
            else {
                const a = atoms.find(x => x.id === id), init = initials.get(id);
                const sx = Math.round(a.x / GRID_SIZE) * GRID_SIZE, sy = Math.round(a.y / GRID_SIZE) * GRID_SIZE;
                const other = atoms.find(o => o.id !== a.id && o.x === sx && o.y === sy);
                if (other && selectedAtomIds.size === 1) {
                    cycleBond(a, other);
                    a.x = init.x; a.y = init.y;
                }
                else { a.x = sx; a.y = sy; }
            }
        });
        if (isTrash) selectedAtomIds.clear();
        saveState(); updateLogic();
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}
