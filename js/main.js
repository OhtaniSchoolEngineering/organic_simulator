window.onload = () => {
    saveState();
    if (typeof render === 'function') render();
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Event Listeners
    const cv = document.getElementById('canvas'); // The inner canvas div
    if (cv) {
        cv.addEventListener('mousedown', handleCanvasMouseDown);
        cv.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        cv.addEventListener('drop', handleDrop);
    }

    // Prevent context menu and add C atom on right click
    document.addEventListener('contextmenu', (e) => {
        const container = e.target.closest('#canvas-container');
        if (container) {
            e.preventDefault();
            const cv = document.getElementById('canvas');
            if (!cv) return;

            const rect = cv.getBoundingClientRect();
            const x = (e.clientX - rect.left);
            const y = (e.clientY - rect.top);

            const baseX = Math.round(x / GRID_SIZE) * GRID_SIZE;
            const baseY = Math.round(y / GRID_SIZE) * GRID_SIZE;

            if (typeof createAtom === 'function') {
                createAtom('C', baseX, baseY);
                if (typeof saveState === 'function') saveState();
                if (typeof updateLogic === 'function') updateLogic();
            }
        }
    });

    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) redo(); else undo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            redo();
        }
    });
};
