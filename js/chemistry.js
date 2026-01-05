/**
 * Chemistry Logic Module
 * Handles molecular analysis, valency checks, and chemical properties.
 */

// Function to check if a specific connection is valid given valency constraints
function canConnect(atomA, atomB, order) {
    if (!atomA || !atomB) return false;
    const usedA = countUsedValency(atomA);
    const usedB = countUsedValency(atomB);
    const valA = VALENCY[atomA.type] || 0;
    const valB = VALENCY[atomB.type] || 0;

    return (usedA + order <= valA) && (usedB + order <= valB);
}

// Helper to count used valency for an atom
function countUsedValency(atom) {
    return atom.connections.reduce((sum, conn) => sum + conn.type, 0);
}

// Check if a carbon atom is chiral (4 different groups attached)
function isChiral(atom, allAtoms) {
    if (atom.type !== 'C' || atom.connections.length < 4) return false;

    // Get the four neighbors
    const neighbors = atom.connections.map(c => allAtoms.find(a => a.id === c.targetId));
    if (neighbors.some(n => !n)) return false; // Should not happen

    // To strictly check chirality, we should check the full structure of the attached groups.
    // For this simulation, we'll do a simplified check: 
    // unique atoms types or unique immediate environments?
    // Let's implement a recursive unique string generator for depth 2-3 to differentiate groups.

    const signatures = neighbors.map(n => getGroupSignature(n, atom, allAtoms, 3));
    const uniqueSignatures = new Set(signatures);

    return uniqueSignatures.size === 4;
}

// Generate a structural signature for a group attached to an atom
// originAtom is the atom we are coming from (to avoid backtracking)
function getGroupSignature(atom, originAtom, allAtoms, depth) {
    if (depth === 0) return atom.type;

    let parts = [atom.type];
    const internalConns = atom.connections.filter(c => c.targetId !== originAtom.id);

    // Sort connections to ensure canonical representation
    const childSigs = internalConns.map(c => {
        const neighbor = allAtoms.find(a => a.id === c.targetId);
        if (!neighbor) return "";
        const bondStr = c.type === 2 ? "=" : c.type === 3 ? "#" : "-";
        return bondStr + getGroupSignature(neighbor, atom, allAtoms, depth - 1);
    });

    childSigs.sort();
    return parts.join("") + "(" + childSigs.join("") + ")";
}

// Analyze all molecules in the canvas
function analyzeMolecules(atoms, viewSettings) {
    const visited = new Set();
    const molecules = [];

    atoms.forEach(atom => {
        if (visited.has(atom.id)) return;

        const molAtoms = bfsTraversal(atom, atoms, visited);
        const formula = calculateFormula(molAtoms, viewSettings.ghostHydrogen);
        const structureName = identifyMolecule(formula, molAtoms);

        molecules.push(structureName);
    });

    return molecules;
}

// BFS to find all atoms in a molecule
function bfsTraversal(startAtom, allAtoms, visitedSet) {
    const component = [];
    const queue = [startAtom];
    visitedSet.add(startAtom.id);

    while (queue.length > 0) {
        const current = queue.pop();
        component.push(current);

        current.connections.forEach(conn => {
            if (!visitedSet.has(conn.targetId)) {
                visitedSet.add(conn.targetId);
                const neighbor = allAtoms.find(a => a.id === conn.targetId);
                if (neighbor) queue.push(neighbor);
            }
        });
    }
    return component;
}

// Calculate chemical formula (e.g., C2H6)
function calculateFormula(molAtoms, includeGhostHydrogen) {
    const counts = {};

    molAtoms.forEach(a => {
        // Count the user-placed atoms
        counts[a.type] = (counts[a.type] || 0) + 1;

        // Count implicit hydrogens if enabled
        if (includeGhostHydrogen) {
            const used = countUsedValency(a);
            const val = VALENCY[a.type] || 0;
            const remaining = val - used;
            if (remaining > 0) {
                counts['H'] = (counts['H'] || 0) + remaining;
            }
        }
    });

    // Format the string: C first, then H, then alphabetical
    let formula = '';
    if (counts['C']) formula += `C${counts['C']}`;
    if (counts['H']) formula += `H${counts['H']}`;

    Object.keys(counts).sort().forEach(key => {
        if (key !== 'C' && key !== 'H') {
            formula += `${key}${counts[key]}`;
        }
    });

    return formula;
}

// Identify molecule name from database or generate IUPAC name
function identifyMolecule(formula, molAtoms) {
    const entryList = MOLECULE_DB.filter(m => m.formula === formula);

    if (entryList.length === 0) {
        return formatFormulaWithSubscripts(formula);
    }

    const structure = analyzeStructure(molAtoms);

    // Attempt to find the best match in our database using structural tags
    let bestMatch = null;
    if (entryList.length > 0) {
        // Evaluate each entry's tags against the current structure
        bestMatch = entryList.find(entry => {
            if (!entry.tags || entry.tags.length === 0) return false;

            return entry.tags.every(tag => {
                if (tag === 'alkene') return structure.hasDoubleBond;
                if (tag === 'alkyne') return structure.hasTripleBond;
                if (tag === 'hydroxyl' || tag === 'alcohol') return structure.functionalGroups.some(g => g.type === 'OH');
                if (tag === 'carbonyl') return structure.functionalGroups.some(g => g.type === 'CHO' || g.type === 'CO');
                if (tag === 'aldehyde') return structure.functionalGroups.some(g => g.type === 'CHO');
                if (tag === 'ketone') return structure.functionalGroups.some(g => g.type === 'CO');
                if (tag === 'carboxylic_acid') return structure.functionalGroups.some(g => g.type === 'COOH');
                if (tag === 'ester') return structure.functionalGroups.some(g => g.type === 'COO');
                if (tag === 'ether') return structure.functionalGroups.some(g => g.type === 'COC');
                if (tag === 'amino') return structure.functionalGroups.some(g => g.type === 'NH2');
                if (tag === 'cis') return structure.isCis;
                if (tag === 'trans') return structure.isTrans;
                return true;
            });
        });

        // If no tag-based match, and there's only one entry, use it
        if (!bestMatch && entryList.length === 1) {
            bestMatch = entryList[0];
        }
    }

    if (bestMatch) {
        return `${bestMatch.name} (${bestMatch.structuralFormula})`;
    }

    // Multiple matches (isomers) or unique structure - try IUPAC
    const iupacName = generateIUPACName(structure, molAtoms);

    if (iupacName && !["メタン", "エタン", "プロパン", "ブタン"].includes(iupacName)) {
        return `${iupacName} (${formatFormulaWithSubscripts(formula)})`;
    }

    // Fallback to the first formula-based match as "isomer of ..."
    return `${entryList[0].name}の異性体 (${formatFormulaWithSubscripts(formula)})`;
}

// Format formula with subscript numbers
function formatFormulaWithSubscripts(formula) {
    return formula.replace(/(\d+)/g, (match) => {
        const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
        return match.split('').map(d => subscripts[parseInt(d)]).join('');
    });
}

// analyzeStructure is defined later in the file with cis/trans support.


// Find longest carbon chain using DFS
function findLongestCarbonChain(carbons) {
    if (carbons.length === 0) return [];

    let longestChain = [];

    // Try starting from each carbon
    carbons.forEach(startCarbon => {
        const chain = dfsLongestChain(startCarbon, carbons, new Set(), []);
        if (chain.length > longestChain.length) {
            longestChain = chain;
        }
    });

    return longestChain;
}

// DFS to find longest chain
function dfsLongestChain(current, allCarbons, visited, currentPath) {
    visited.add(current.id);
    currentPath.push(current);

    let longestFromHere = [...currentPath];

    // Get carbon neighbors
    const carbonNeighbors = current.connections
        .map(c => allCarbons.find(a => a.id === c.targetId))
        .filter(a => a && !visited.has(a.id));

    carbonNeighbors.forEach(neighbor => {
        const chain = dfsLongestChain(neighbor, allCarbons, new Set(visited), [...currentPath]);
        if (chain.length > longestFromHere.length) {
            longestFromHere = chain;
        }
    });

    return longestFromHere;
}

// Identify substituents on main chain
function identifySubstituents(mainChain, molAtoms) {
    const substituents = [];

    mainChain.forEach((carbon, index) => {
        const nonChainNeighbors = carbon.connections
            .map(c => molAtoms.find(a => a.id === c.targetId))
            .filter(a => a && !mainChain.includes(a));

        nonChainNeighbors.forEach(neighbor => {
            const position = index + 1; // 1-indexed

            if (neighbor.type === 'Cl') {
                substituents.push({ position, name: 'クロロ', type: 'Cl' });
            } else if (neighbor.type === 'Br') {
                substituents.push({ position, name: 'ブロモ', type: 'Br' });
            } else if (neighbor.type === 'I') {
                substituents.push({ position, name: 'ヨード', type: 'I' });
            } else if (neighbor.type === 'C') {
                // Methyl or other alkyl group
                substituents.push({ position, name: 'メチル', type: 'CH3' });
            }
        });
    });

    return substituents;
}

// Identify functional groups with atom member information
function identifyFunctionalGroups(molAtoms) {
    const groups = [];
    const usedAtomIds = new Set();

    // 1. Carboxyl group (-COOH)
    molAtoms.forEach(atom => {
        if (atom.type === 'C') {
            const doubleO = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).find(a => a && a.type === 'O' && atom.connections.find(c => c.targetId === a.id).type === 2);
            const singleO = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).find(a => a && a.type === 'O' && atom.connections.find(c => c.targetId === a.id).type === 1);
            if (doubleO && singleO) {
                const hOfO = singleO.connections.map(c => molAtoms.find(a => a.id === c.targetId)).find(a => a && a.type === 'H');
                if (hOfO) {
                    groups.push({ type: 'COOH', name: 'カルボキシ', atomIds: [atom.id, doubleO.id, singleO.id, hOfO.id] });
                    [atom.id, doubleO.id, singleO.id, hOfO.id].forEach(id => usedAtomIds.add(id));
                }
            }
        }
    });

    // 2. Ester group (-COO-) - High priority
    molAtoms.forEach(atom => {
        if (atom.type === 'C' && !usedAtomIds.has(atom.id)) {
            const doubleO = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).find(a => a && a.type === 'O' && atom.connections.find(c => c.targetId === a.id).type === 2);
            const singleO = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).find(a => a && a.type === 'O' && atom.connections.find(c => c.targetId === a.id).type === 1);
            if (doubleO && singleO && !usedAtomIds.has(doubleO.id) && !usedAtomIds.has(singleO.id)) {
                const cOfO = singleO.connections.map(c => molAtoms.find(a => a.id === c.targetId)).find(a => a && a.type === 'C' && a !== atom);
                if (cOfO) {
                    groups.push({ type: 'COO', name: 'エステル', atomIds: [atom.id, doubleO.id, singleO.id] });
                    [atom.id, doubleO.id, singleO.id].forEach(id => usedAtomIds.add(id));
                }
            }
        }
    });

    // 3. Formyl group (-CHO)
    molAtoms.forEach(atom => {
        if (atom.type === 'C' && !usedAtomIds.has(atom.id)) {
            const doubleO = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).find(a => a && a.type === 'O' && atom.connections.find(c => c.targetId === a.id).type === 2);
            const hOfC = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).find(a => a && a.type === 'H');
            if (doubleO && hOfC) {
                groups.push({ type: 'CHO', name: 'ホルミル', atomIds: [atom.id, doubleO.id, hOfC.id] });
                [atom.id, doubleO.id, hOfC.id].forEach(id => usedAtomIds.add(id));
            }
        }
    });

    // 4. Carbonyl/Ketone group (C=O)
    molAtoms.forEach(atom => {
        if (atom.type === 'C' && !usedAtomIds.has(atom.id)) {
            const doubleO = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).find(a => a && a.type === 'O' && atom.connections.find(c => c.targetId === a.id).type === 2);
            if (doubleO && !usedAtomIds.has(doubleO.id)) {
                const cNeighbors = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).filter(a => a && a.type === 'C');
                if (cNeighbors.length === 2) {
                    groups.push({ type: 'CO', name: 'ケトン基', atomIds: [atom.id, doubleO.id] });
                } else {
                    groups.push({ type: 'CO', name: 'カルボニル', atomIds: [atom.id, doubleO.id] });
                }
                usedAtomIds.add(atom.id);
                usedAtomIds.add(doubleO.id);
            }
        }
    });

    // 5. Hydroxyl group (-OH)
    molAtoms.forEach(atom => {
        if (atom.type === 'O' && !usedAtomIds.has(atom.id)) {
            const hNeighbor = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).find(a => a && a.type === 'H');
            const cNeighbor = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).find(a => a && a.type === 'C');
            if (hNeighbor && cNeighbor) {
                groups.push({ type: 'OH', name: 'ヒドロキシ', atomIds: [atom.id, hNeighbor.id] });
                usedAtomIds.add(atom.id);
                usedAtomIds.add(hNeighbor.id);
            }
        }
    });

    // 6. Ether group (-O-)
    molAtoms.forEach(atom => {
        if (atom.type === 'O' && !usedAtomIds.has(atom.id)) {
            const cNeighbors = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).filter(a => a && a.type === 'C');
            if (cNeighbors.length === 2) {
                groups.push({ type: 'COC', name: 'エーテル', atomIds: [atom.id] });
                usedAtomIds.add(atom.id);
            }
        }
    });

    // 7. Amino group (-NH2)
    molAtoms.forEach(atom => {
        if (atom.type === 'N' && !usedAtomIds.has(atom.id)) {
            const hNeighbors = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).filter(a => a && a.type === 'H');
            if (hNeighbors.length === 2) {
                const ids = [atom.id, ...hNeighbors.map(h => h.id)];
                groups.push({ type: 'NH2', name: 'アミノ', atomIds: ids });
                ids.forEach(id => usedAtomIds.add(id));
            }
        }
    });

    // 8. Ethyl group (-C2H5)
    molAtoms.forEach(atom => {
        if (atom.type === 'C' && !usedAtomIds.has(atom.id)) {
            const hNeighbors = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).filter(a => a && a.type === 'H');
            const otherCs = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).filter(a => a && a.type === 'C' && !usedAtomIds.has(a.id));

            if (hNeighbors.length === 2 && otherCs.length > 0) {
                const methylC = otherCs.find(oc => {
                    const och = oc.connections.map(c => molAtoms.find(a => a.id === c.targetId)).filter(a => a && a.type === 'H');
                    const occ = oc.connections.map(c => molAtoms.find(a => a.id === c.targetId)).filter(a => a && a.type === 'C');
                    return och.length === 3 && occ.length === 1;
                });

                if (methylC) {
                    const hOfMethyl = methylC.connections.map(c => molAtoms.find(a => a.id === c.targetId)).filter(a => a && a.type === 'H');
                    const ids = [atom.id, methylC.id, ...hNeighbors.map(h => h.id), ...hOfMethyl.map(h => h.id)];
                    groups.push({ type: 'ethyl', name: 'エチル基', atomIds: ids });
                    ids.forEach(id => usedAtomIds.add(id));
                }
            }
        }
    });

    // 9. Methyl group (-CH3)
    molAtoms.forEach(atom => {
        if (atom.type === 'C' && !usedAtomIds.has(atom.id)) {
            const hNeighbors = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).filter(a => a && a.type === 'H');
            const nonHNeighbors = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).filter(a => a && a.type !== 'H');
            if (hNeighbors.length === 3 && nonHNeighbors.length === 1) {
                const ids = [atom.id, ...hNeighbors.map(h => h.id)];
                groups.push({ type: 'CH3', name: 'メチル', atomIds: ids });
                ids.forEach(id => usedAtomIds.add(id));
            }
        }
    });

    return groups;
}

// Identify Iodoform test positive structures
function identifyIodoformPositive(molAtoms) {
    const parts = [];

    molAtoms.forEach(atom => {
        if (atom.type !== 'C') return;

        const connections = atom.connections.map(c => molAtoms.find(a => a.id === c.targetId)).filter(a => a);

        // 1. Find all methyl neighbors (CH3-)
        const methyls = connections.filter(neigh => {
            if (neigh.type !== 'C') return false;
            const hCount = neigh.connections.filter(cc => molAtoms.find(a => a.id === cc.targetId)?.type === 'H').length;
            const cCount = neigh.connections.filter(cc => molAtoms.find(a => a.id === cc.targetId)?.type === 'C').length;
            // CH3 bonded to exactly one other atom (the central C)
            return hCount === 3 && cCount === 1;
        });

        if (methyls.length === 0) return;
        const mainMethyl = methyls[0];

        // Case A: Acetyl structure (CH3-CO-R)
        const doubleO = connections.find(c => c.type === 'O' && atom.connections.find(conn => conn.targetId === c.id).type === 2);
        if (doubleO) {
            // Check if R group is H or C (ignore the methyl we identified)
            const otherNeighbors = connections.filter(c => c.id !== mainMethyl.id && c.id !== doubleO.id);
            if (otherNeighbors.every(n => n.type === 'C' || n.type === 'H')) {
                const ids = [atom.id, doubleO.id];
                methyls.forEach(m => {
                    ids.push(m.id);
                    const hOfM = m.connections.map(c => molAtoms.find(at => at.id === c.targetId)).filter(at => at && at.type === 'H');
                    hOfM.forEach(h => ids.push(h.id));
                });
                parts.push({ type: 'iodoform', name: 'ヨードホルム反応陽性', atomIds: ids });
            }
        }

        // Case B: Ethanol-like structure (CH3-CH(OH)-R)
        const ohO = connections.find(c => {
            if (c.type !== 'O' || atom.connections.find(conn => conn.targetId === c.id).type !== 1) return false;
            return c.connections.some(cc => molAtoms.find(a => a.id === cc.targetId)?.type === 'H');
        });
        const hasH = connections.some(c => c.type === 'H');

        if (ohO && hasH) {
            // Check if R group is H or C (ignore methyl, OH, and one H)
            // Note: CH3-CH(OH)-H (Ethanol if viewed from C1) should match
            const otherNeighbors = connections.filter(c => c.id !== mainMethyl.id && c.id !== ohO.id && c.type !== 'H');
            if (otherNeighbors.every(n => n.type === 'C' || n.type === 'H')) {
                const ids = [atom.id, ohO.id];
                // H of central C
                const hOfC = connections.filter(c => c.type === 'H');
                hOfC.forEach(h => ids.push(h.id));
                // H of OH
                const hOfOH = ohO.connections.map(c => molAtoms.find(at => at.id === c.targetId)).filter(at => at && at.type === 'H');
                hOfOH.forEach(h => ids.push(h.id));
                // All methyls
                methyls.forEach(m => {
                    ids.push(m.id);
                    const hOfM = m.connections.map(c => molAtoms.find(at => at.id === c.targetId)).filter(at => at && at.type === 'H');
                    hOfM.forEach(h => ids.push(h.id));
                });
                parts.push({ type: 'iodoform', name: 'ヨードホルム反応陽性', atomIds: ids });
            }
        }
    });

    return parts;
}

// Generate IUPAC name (simplified version) - Restored
function generateIUPACName(structure, molAtoms) {
    if (structure.type !== 'hydrocarbon') return null;

    const chainLength = structure.chainLength;
    const substituents = structure.substituents;

    // Base name for alkane
    const baseNames = ['', 'メタン', 'エタン', 'プロパン', 'ブタン', 'ペンタン',
        'ヘキサン', 'ヘプタン', 'オクタン', 'ノナン', 'デカン'];

    if (chainLength === 0 || chainLength > 10) return null;

    let baseName = baseNames[chainLength];

    // Check for double/triple bonds in main chain
    const hasDoubleBond = structure.mainChain.some(c =>
        c.connections.some(conn => conn.type === 2)
    );
    const hasTripleBond = structure.mainChain.some(c =>
        c.connections.some(conn => conn.type === 3)
    );

    if (hasTripleBond) {
        baseName = baseName.replace('アン', 'イン');
    } else if (hasDoubleBond) {
        baseName = baseName.replace('アン', 'エン');
    }

    // Add substituents
    if (substituents.length === 0) {
        return baseName;
    }

    // Group substituents by type
    const grouped = {};
    substituents.forEach(sub => {
        if (!grouped[sub.name]) grouped[sub.name] = [];
        grouped[sub.name].push(sub.position);
    });

    // Build name
    const parts = [];
    Object.keys(grouped).sort().forEach(subName => {
        const positions = Array.from(new Set(grouped[subName])).sort((a, b) => a - b);
        const posStr = positions.join(',');
        const count = positions.length;
        const prefix = count > 1 ? (['', '', 'ジ', 'トリ', 'テトラ', 'ペンタ'][count] || '') : '';
        parts.push(`${posStr}-${prefix}${subName}`);
    });

    return parts.join('-') + baseName;
}

// Update analyzeStructure to potentially include these groups with atom info
function analyzeStructure(molAtoms) {
    const carbons = molAtoms.filter(a => a.type === 'C');

    if (carbons.length === 0) {
        return { type: 'non-hydrocarbon', carbons: [], functionalGroupsWithAtoms: [] };
    }

    const mainChain = findLongestCarbonChain(carbons);
    const substituents = identifySubstituents(mainChain, molAtoms);
    const functionalGroups = identifyFunctionalGroups(molAtoms);

    const hasDoubleBond = molAtoms.some(a => a.connections.some(c => c.type === 2));
    const hasTripleBond = molAtoms.some(a => a.connections.some(c => c.type === 3));

    // Cis/Trans detection
    let isCis = false;
    let isTrans = false;
    if (hasDoubleBond) {
        const ccDoubles = [];
        molAtoms.forEach(a => {
            if (a.type === 'C') {
                a.connections.forEach(c => {
                    if (c.type === 2) {
                        const target = molAtoms.find(t => t.id === c.targetId);
                        if (target && target.type === 'C' && a.id < target.id) {
                            ccDoubles.push([a, target]);
                        }
                    }
                });
            }
        });

        if (ccDoubles.length === 1) {
            const [c1, c2] = ccDoubles[0];
            const getSubstVector = (c, otherC) => {
                const subs = c.connections
                    .filter(cn => cn.targetId !== otherC.id)
                    .map(cn => molAtoms.find(t => t.id === cn.targetId))
                    .filter(t => t);
                subs.sort((a, b) => (VALENCY[b.type] || 0) - (VALENCY[a.type] || 0));
                if (subs.length > 0) return { x: subs[0].x - c.x, y: subs[0].y - c.y };
                return null;
            };

            const v1 = getSubstVector(c1, c2);
            const v2 = getSubstVector(c2, c1);
            if (v1 && v2) {
                const dbV = { x: c2.x - c1.x, y: c2.y - c1.y };
                const normal = { x: -dbV.y, y: dbV.x };
                const dot1 = v1.x * normal.x + v1.y * normal.y;
                const dot2 = v2.x * normal.x + v2.y * normal.y;
                if (Math.abs(dot1) > 1 && Math.abs(dot2) > 1) {
                    if (dot1 * dot2 > 0) isCis = true;
                    else isTrans = true;
                }
            }
        }
    }

    return {
        type: 'hydrocarbon',
        mainChain,
        chainLength: mainChain.length,
        substituents,
        functionalGroups,
        hasDoubleBond,
        hasTripleBond,
        isCis,
        isTrans
    };
}

// Expose functions to global scope
// Update Chemistry object to export the improved functional group detector
window.Chemistry = {
    canConnect,
    countUsedValency,
    isChiral,
    analyzeMolecules,
    identifyFunctionalGroups,
    identifyIodoformPositive
};
