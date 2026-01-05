function saveState() {
    const state = JSON.stringify(atoms);
    if (actionHistory.length > 0 && actionHistory[actionHistory.length - 1] === state) return;
    actionHistory.push(state);
    if (actionHistory.length > 30) actionHistory.shift();
    redoStack = [];
    updateHistoryButtons();
}

function undo() {
    if (actionHistory.length <= 1) return;
    redoStack.push(actionHistory.pop());
    atoms = JSON.parse(actionHistory[actionHistory.length - 1]);
    updateLogic();
    updateHistoryButtons();
}

function redo() {
    if (redoStack.length === 0) return;
    const next = redoStack.pop();
    actionHistory.push(next);
    atoms = JSON.parse(next);
    updateLogic();
    updateHistoryButtons();
}

function updateHistoryButtons() {
    const uBtn = document.getElementById('btn-undo');
    const rBtn = document.getElementById('btn-redo');
    if (uBtn) uBtn.disabled = actionHistory.length <= 1;
    if (rBtn) rBtn.disabled = redoStack.length === 0;
}
