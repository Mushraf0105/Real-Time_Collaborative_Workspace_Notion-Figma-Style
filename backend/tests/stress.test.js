import * as Y from 'yjs';
import crypto from 'crypto';

console.log('⚡ ================================================================');
console.log('⚡ SyncSpace Concurrency & Stress Benchmark (50 Virtual Peers)');
console.log('⚡ Benchmark Data: Project Gutenberg & Wikipedia Article Extracts');
console.log('⚡ ================================================================\n');

// Sample Corpus: Project Gutenberg & Wikipedia
const GUTENBERG_ALICE = [
  "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do.",
  "Once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it.",
  "So she was considering in her own mind whether the pleasure of making a daisy-chain would be worth the trouble.",
  "Suddenly a White Rabbit with pink eyes ran close by her.",
  "There was nothing so very remarkable in that; nor did Alice think it so very much out of the way.",
];

const WIKIPEDIA_CRDT = [
  "A Conflict-free Replicated Data Type (CRDT) is a data structure that simplifies distributed data storage.",
  "State-based CRDTs (CvRDTs) send their full state to other replicas periodically.",
  "Operation-based CRDTs (CmRDTs) broadcast only concurrent operations across the network.",
  "Yjs implements a hybrid sequence CRDT that provides O(1) random access and minimal memory overhead.",
  "In distributed collaborative editors, strong eventual consistency guarantees all peers converge identically.",
];

const CORPUS = [...GUTENBERG_ALICE, ...WIKIPEDIA_CRDT];

async function runStressTest() {
  const NUM_PEERS = 50;
  const OPERATIONS_PER_PEER = 20;
  const totalOperations = NUM_PEERS * OPERATIONS_PER_PEER;

  console.log(`🚀 Spawning ${NUM_PEERS} concurrent virtual peers...`);
  console.log(`📊 Executing ${totalOperations} randomized collaborative operations...\n`);

  // 1. Initialize 50 independent peer Y.Docs with incremental update collectors
  const peers = [];
  const pendingUpdates = [];

  for (let i = 0; i < NUM_PEERS; i++) {
    const doc = new Y.Doc({ clientID: 1000 + i });
    doc.on('update', (update, origin) => {
      if (origin !== 'sync') {
        pendingUpdates.push(update);
      }
    });

    peers.push({
      id: i,
      doc,
      text: doc.getText('document_body'),
    });
  }

  const latencies = [];
  const startTime = Date.now();

  // 2. Run simulation rounds
  for (let opRound = 0; opRound < OPERATIONS_PER_PEER; opRound++) {
    pendingUpdates.length = 0; // Clear round buffer

    // Each peer performs an edit concurrently
    for (let pIdx = 0; pIdx < NUM_PEERS; pIdx++) {
      const peer = peers[pIdx];
      const opStart = performance.now();

      const sentence = CORPUS[(pIdx + opRound) % CORPUS.length];
      const currentLen = peer.text.length;
      const insertPos = currentLen === 0 ? 0 : Math.floor(Math.random() * currentLen);

      peer.text.insert(insertPos, `[P${peer.id}: ${sentence.slice(0, 30)}] `);

      const opDuration = performance.now() - opStart;
      latencies.push(opDuration);
    }

    // Merge all 50 peer updates using Y.mergeUpdates for maximal efficiency
    if (pendingUpdates.length > 0) {
      const mergedRoundUpdate = Y.mergeUpdates(pendingUpdates);
      for (const targetPeer of peers) {
        Y.applyUpdate(targetPeer.doc, mergedRoundUpdate, 'sync');
      }
    }
  }

  const totalDurationMs = Date.now() - startTime;
  const throughputOpsPerSec = ((totalOperations / totalDurationMs) * 1000).toFixed(1);

  // 3. Measure Percentile Latencies
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)].toFixed(2);
  const p90 = latencies[Math.floor(latencies.length * 0.9)].toFixed(2);
  const p95 = latencies[Math.floor(latencies.length * 0.95)].toFixed(2);
  const p99 = latencies[Math.floor(latencies.length * 0.99)].toFixed(2);

  // 4. Verify 100% Cryptographic Convergence
  console.log('🔍 Verifying Strong Eventual Consistency across all 50 peers...');
  const firstDocText = peers[0].text.toString();
  const firstDocHash = crypto
    .createHash('sha256')
    .update(Y.encodeStateAsUpdate(peers[0].doc))
    .digest('hex');

  let allMatch = true;
  for (let i = 1; i < NUM_PEERS; i++) {
    const currentHash = crypto
      .createHash('sha256')
      .update(Y.encodeStateAsUpdate(peers[i].doc))
      .digest('hex');

    if (currentHash !== firstDocHash) {
      allMatch = false;
      console.error(`❌ Convergence mismatch at peer ${i}!`);
      break;
    }
  }

  console.log('\n📈 ==================== BENCHMARK RESULTS ====================');
  console.log(`👥 Concurrent Virtual Peers:      ${NUM_PEERS}`);
  console.log(`📝 Total Operations Executed:     ${totalOperations} edits`);
  console.log(`⏱️ Total Execution Time:          ${totalDurationMs} ms`);
  console.log(`⚡ Throughput:                    ${throughputOpsPerSec} ops/sec`);
  console.log(`⚡ Latency p50 (Median):          ${p50} ms`);
  console.log(`⚡ Latency p90:                   ${p90} ms`);
  console.log(`⚡ Latency p95:                   ${p95} ms`);
  console.log(`⚡ Latency p99:                   ${p99} ms`);
  console.log(`📄 Final Converged Document Size: ${firstDocText.length} characters`);
  console.log(`🔐 Cryptographic Hash:            ${firstDocHash.slice(0, 24)}...`);
  console.log(`🎯 State Vector Convergence:      ${allMatch ? '100.0% SUCCESSFUL' : 'FAILED'}`);
  console.log('==============================================================\n');

  if (!allMatch) {
    process.exit(1);
  }
}

runStressTest().catch(console.error);
