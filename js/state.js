const canvasContainer = document.getElementById('canvas-container');
const header = document.getElementById('header');
const footer = document.getElementById('footer');
const selectionBox = document.getElementById('selection-box');
const dragGhost = document.getElementById('drag-ghost');

let atoms = [];
let selectedAtomIds = new Set();
let viewSettings = { prop: false, chiral: false, ghostHydrogen: false, highlightGroups: false, iodoform: false };
let groupDirection = 'left';
let actionHistory = [];
let redoStack = [];

// Reaction Mode States
let currentTool = 'move';
let currentReagent = 'H2';
let reactionSelection = [];
let reactionStep = 0;
let reactionContext = null;
