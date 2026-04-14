import fs from 'fs';
import path from 'path';
import { assetRegistryV2 } from '../src/runtime/registries/AssetRegistryV2';
import { resolveMeetingSpec } from '../src/runtime/meeting/MeetingSpec';
import { loadGovernanceLoops } from '../src/runtime/governance/LoopRegistry';
import { DynamicDiscoveryService } from '../src/runtime/DynamicDiscoveryService';

async function verifyRemediation() {
  console.log('--- [VERIFICATION START] Asset Foundation Remediation ---');

  // 1. Initialize Registry & Trigger Discovery
  console.log('1. Initializing Registry and Priming Discovery...');
  await assetRegistryV2.initialize();
  
  // Force discovery of new asset types (Remediation 35A)
  await DynamicDiscoveryService.discoverAll(process.cwd(), { forceRefresh: true });
  
  // 2. Resolve Meeting Spec
  console.log('2. Resolving Meeting Spec (should come from Registry)...');
  try {
    const spec = resolveMeetingSpec();
    console.log(`   Found Spec Mode: ${spec.mode}, Rounds: ${spec.rounds}`);
  } catch (e) {
    console.error(`   FAIL: Failed to resolve meeting spec: ${e.message}`);
  }

  // 3. Loading Governance Loops
  console.log('3. Loading Governance Loops (should come from Registry)...');
  
  // Ensure we have at least one loop for testing if possible
  const loopCatalogPath = path.join(process.cwd(), 'docs/runtime/governance/loop-catalog.json');
  let createdDummyLoop = false;
  if (!fs.existsSync(loopCatalogPath)) {
    console.log('   (Creating dummy loop catalog for verification)');
    fs.mkdirSync(path.dirname(loopCatalogPath), { recursive: true });
    fs.writeFileSync(loopCatalogPath, JSON.stringify({
      loops: [{ id: 'test-loop', kind: 'improvement', enabledByDefault: true }]
    }));
    createdDummyLoop = true;
    // Re-run discovery for loops
    await DynamicDiscoveryService.discoverLoops(process.cwd());
  }

  const loops = loadGovernanceLoops();
  console.log(`   Found ${loops.length} loops in Registry.`);

  // 4. Test Post-Mutation Refresh
  console.log('4. Testing Post-Mutation Refresh...');
  const allMeetingSpecs = await assetRegistryV2.listByType('meeting_spec');
  if (allMeetingSpecs.length > 0) {
    const asset = allMeetingSpecs[0];
    const assetId = asset.identity.asset_id;
    const filePath = asset.metadata.storage_ref;
    const oldChecksum = asset.metadata.checksum;

    console.log(`   Targeting asset: ${assetId} at ${filePath}`);
    
    // Simulate mutation (change rounds which IS in MeetingSpec)
    console.log('   Simulating file mutation (changing rounds in YAML)...');
    const oldContent = fs.readFileSync(filePath, 'utf-8');
    const newContent = oldContent.replace(/rounds: \d+/, 'rounds: 9');
    fs.writeFileSync(filePath, newContent, 'utf-8');

    // Trigger Refresh
    console.log('   Triggering refreshAsset...');
    await assetRegistryV2.refreshAsset(assetId);

    // Verify
    const updatedAsset = await assetRegistryV2.getAsset(assetId);
    if (updatedAsset && updatedAsset.metadata.checksum !== oldChecksum) {
      console.log(`   SUCCESS: Checksum updated!`);
      console.log(`   Old: ${oldChecksum.slice(0, 10)}...`);
      console.log(`   New: ${updatedAsset.metadata.checksum.slice(0, 10)}...`);
    } else {
      console.warn(`   FAIL: Checksum did not change. (New: ${updatedAsset?.metadata.checksum?.slice(0, 10)}...)`);
    }

    // CLEANUP mutation
    fs.writeFileSync(filePath, oldContent, 'utf-8');
    await assetRegistryV2.refreshAsset(assetId);
  } else {
    console.warn('   SKIP: No meeting specs found to test refresh.');
  }

  if (createdDummyLoop) {
    fs.unlinkSync(loopCatalogPath);
  }

  console.log('--- [VERIFICATION END] ---');
}

verifyRemediation().catch(console.error);
