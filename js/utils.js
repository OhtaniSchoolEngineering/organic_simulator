// Geometry Helpers
function getDistance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function getMidpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function rotatePoint(x, y, angleDeg) {
    const rad = angleDeg * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
        x: Math.round(x * cos - y * sin),
        y: Math.round(x * sin + y * cos)
    };
}

// Find the best open direction for placement
// Used by: fillHydrogen (ui.js), addAtomTo (reactions.js)
function getBestOpenDirection(atom, allAtoms, gridSize) {
    // Standard directions: right, left, down, up
    let dirs = [
        { x: 1, y: 0 }, { x: -1, y: 0 },
        { x: 0, y: 1 }, { x: 0, y: -1 }
    ];

    // Calculate bias based on existing connections (opposite to centroid)
    if (atom.connections.length > 0) {
        let sumX = 0, sumY = 0;
        atom.connections.forEach(cn => {
            const target = allAtoms.find(a => a.id === cn.targetId);
            if (target) {
                sumX += Math.sign(Math.round((target.x - atom.x) / gridSize));
                sumY += Math.sign(Math.round((target.y - atom.y) / gridSize));
            }
        });

        // Target direction is opposite to the sum of vectors
        const tx = -sumX;
        const ty = -sumY;

        // Sort directions by alignment with target direction
        dirs.sort((d1, d2) => {
            const score1 = d1.x * tx + d1.y * ty;
            const score2 = d2.x * tx + d2.y * ty;
            return score2 - score1; // Descending score
        });
    }

    // Return all valid empty directions
    return dirs.filter(d => {
        // Check if spot is occupied
        return !allAtoms.some(o =>
            Math.round((o.x - atom.x) / gridSize) === d.x &&
            Math.round((o.y - atom.y) / gridSize) === d.y
        );
    });
}


function rotateGroupAtoms(group, direction) {
    // Base orientation: Left plug point. Rotations: left=0, up=90(CCW), down=270(CCW).
    if (!group) return null;

    const rotations = { left: 0, up: 90, down: 270, right: 0 };
    const angle = rotations[direction] || 0;

    const rotated = JSON.parse(JSON.stringify(group));
    const isMirror = (direction === 'right');

    if (isMirror) {
        // Mirror for Right: Flip X axis
        rotated.atoms = group.atoms.map(a => ({
            type: a.type,
            dx: -a.dx,
            dy: a.dy
        }));
    } else {
        // Standard rotation
        rotated.atoms = group.atoms.map(a => {
            const p = rotatePoint(a.dx, a.dy, angle);
            return { type: a.type, dx: p.x, dy: p.y };
        });
    }
    return rotated;
}
