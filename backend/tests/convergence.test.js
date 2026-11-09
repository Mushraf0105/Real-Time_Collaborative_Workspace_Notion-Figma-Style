import * as Y from 'yjs';
import crypto from 'crypto';

console.log('🧪 ========================================================');
console.log('🧪 Running SyncSpace CRDT Convergence & Unit Test Suite');
console.log('🧪 ========================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    passedTests++;
    console.log(`✅ PASS: ${message}`);
  }
}

// -----------------------------------------------------------------
// Test 1: Deterministic Conflict Resolution with Concurrent Typing
// -----------------------------------------------------------------
console.log('\n--- Test 1: Concurrent Insertions at Same Index (CRDT Commutativity) ---');
const docA = new Y.Doc();
const docB = new Y.Doc();

const textA = docA.getText('content');
const textB = docB.getText('content');

// Initial synchronization
const initialUpdate = Y.encodeStateAsUpdate(docA);
Y.applyUpdate(docB, initialUpdate);

// Peer A types "Alice" at index 0
textA.insert(0, 'Hello from Alice! ');
const updateFromA = Y.encodeStateAsUpdate(docA);

// Peer B concurrently types "Bob" at index 0 without knowing about Alice
textB.insert(0, 'Greetings from Bob! ');
const updateFromB = Y.encodeStateAsUpdate(docB);

// Cross-exchange updates
Y.applyUpdate(docB, updateFromA);
Y.applyUpdate(docA, updateFromB);

// Verify convergence
const resultA = textA.toString();
const resultB = textB.toString();

assert(resultA === resultB, `Documents converged to exact same string: "${resultA}"`);
assert(resultA.includes('Alice') && resultA.includes('Bob'), 'Both concurrent edits preserved without data loss');

// -----------------------------------------------------------------
// Test 2: State Vector Diffing & Incremental Sync Efficiency
// -----------------------------------------------------------------
console.log('\n--- Test 2: State Vector Diffing (y-protocols/sync) ---');
const clientDoc = new Y.Doc();
const serverDoc = new Y.Doc();

const clientText = clientDoc.getText('content');
const serverText = serverDoc.getText('content');

clientText.insert(0, 'Initial base document paragraph.\n');

// Server calculates its missing updates using client's state vector
const serverStateVector = Y.encodeStateVector(serverDoc);
const diffUpdate = Y.encodeStateAsUpdate(clientDoc, serverStateVector);

Y.applyUpdate(serverDoc, diffUpdate);

assert(clientText.toString() === serverText.toString(), 'Server caught up using minimal state vector diff');
assert(diffUpdate.length > 0 && diffUpdate.length < 500, `Incremental diff is lightweight (${diffUpdate.length} bytes)`);

// -----------------------------------------------------------------
// Test 3: Concurrent Deletion and Overlapping Range Editing
// -----------------------------------------------------------------
console.log('\n--- Test 3: Concurrent Deletion & Formatting Convergence ---');
const peer1 = new Y.Doc();
const peer2 = new Y.Doc();

const p1Text = peer1.getText('collab');
const p2Text = peer2.getText('collab');

p1Text.insert(0, 'The quick brown fox jumps over the lazy dog.');
Y.applyUpdate(peer2, Y.encodeStateAsUpdate(peer1));

// Peer 1 deletes "brown "
p1Text.delete(10, 6);
const p1DelUpdate = Y.encodeStateAsUpdate(peer1);

// Peer 2 inserts " extremely" before "quick"
p2Text.insert(3, ' extremely');
const p2InsUpdate = Y.encodeStateAsUpdate(peer2);

// Sync both ways
Y.applyUpdate(peer2, p1DelUpdate);
Y.applyUpdate(peer1, p2InsUpdate);

assert(p1Text.toString() === p2Text.toString(), `Interleaved edit & delete converged: "${p1Text.toString()}"`);

// -----------------------------------------------------------------
// Test 4: Y.Map Canvas Synchronization (Sticky Notes)
// -----------------------------------------------------------------
console.log('\n--- Test 4: Figma Canvas Y.Map Synchronization ---');
const canvasDoc1 = new Y.Doc();
const canvasDoc2 = new Y.Doc();

const map1 = canvasDoc1.getMap('canvas_items');
const map2 = canvasDoc2.getMap('canvas_items');

// User 1 adds a sticky note
map1.set('note-1', { x: 150, y: 220, text: 'Architecture Review', color: '#fef08a' });
Y.applyUpdate(canvasDoc2, Y.encodeStateAsUpdate(canvasDoc1));

assert(map2.has('note-1'), 'Canvas note replicated to peer 2');
assert(map2.get('note-1').text === 'Architecture Review', 'Note text matches');

// User 2 drags note to new position
const current = map2.get('note-1');
map2.set('note-1', { ...current, x: 300, y: 400 });
Y.applyUpdate(canvasDoc1, Y.encodeStateAsUpdate(canvasDoc2));

assert(map1.get('note-1').x === 300, 'Drag movement replicated back to user 1');

// -----------------------------------------------------------------
// Test 5: Cryptographic Hash Convergence Check
// -----------------------------------------------------------------
console.log('\n--- Test 5: Cryptographic State Vector Parity ---');
const hash1 = crypto.createHash('sha256').update(Y.encodeStateAsUpdate(docA)).digest('hex');
const hash2 = crypto.createHash('sha256').update(Y.encodeStateAsUpdate(docB)).digest('hex');

assert(hash1 === hash2, `SHA-256 state vector hashes match exactly: ${hash1.slice(0, 16)}...`);

console.log('\n========================================================');
console.log(`🎉 Summary: ${passedTests}/${totalTests} Tests Passed (100% Convergence Rate)`);
console.log('========================================================\n');

