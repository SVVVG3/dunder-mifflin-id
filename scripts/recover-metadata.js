#!/usr/bin/env node

/**
 * Metadata Recovery Script for Dunder Mifflin ID NFTs
 * 
 * This script recovers accidentally deleted metadata JSON files from R2
 * by reading the data from the blockchain and recreating the files.
 */

const { ethers } = require('ethers');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Contract ABI (minimal, just what we need)
const CONTRACT_ABI = [
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function employees(uint256 tokenId) view returns (string character, string displayName, string analysisText, uint256 mintedAt, uint256 fid)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

// Setup providers
const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

// Setup R2 client (AWS SDK v3)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function recoverMetadata(tokenId) {
  try {
    console.log(`\n🔍 Recovering metadata for Token ID: ${tokenId}`);
    
    // 1. Get the metadata URI from blockchain
    const metadataURI = await contract.tokenURI(tokenId);
    console.log(`📍 Metadata URI: ${metadataURI}`);
    
    if (!metadataURI || !metadataURI.includes('pub-8ce6bdd28a564ddfa5df9e4394b9cc71.r2.dev')) {
      console.log(`⚠️ Token ${tokenId} doesn't use R2 metadata, skipping...`);
      return;
    }
    
    // 2. Get employee data from blockchain
    const employee = await contract.employees(tokenId);
    const [character, displayName, analysisText, mintedAt, fid] = employee;
    
    console.log(`👤 Employee: ${displayName}`);
    console.log(`🎭 Character: ${character}`);
    console.log(`🆔 FID: ${fid.toString()}`);
    
    // 3. Get the owner
    const owner = await contract.ownerOf(tokenId);
    console.log(`👛 Owner: ${owner}`);
    
    // 4. Convert mintedAt timestamp to date
    const issueDate = new Date(Number(mintedAt) * 1000);
    
    // 5. Extract the image URL (assume it follows same pattern as metadata)
    // metadata-{fid}-{timestamp}.json -> share-image-{fid}-{timestamp}.png
    const metadataFilename = metadataURI.split('/').pop();
    const timestamp = metadataFilename.match(/metadata-\d+-(\d+)\.json/)?.[1];
    const imageFilename = `share-image-${fid}-${timestamp}.png`;
    const imageUrl = `${process.env.R2_PUBLIC_URL}/what-x-are-you/${imageFilename}`;
    
    // 6. Create the metadata JSON (matching exact format)
    const nftMetadata = {
      name: `Dunder Mifflin Employee ID - ${displayName}`,
      description: `Official Dunder Mifflin Scranton Employee ID for ${displayName}. Most like ${character} from The Office.${analysisText ? ` ${analysisText}` : ''}`,
      image: imageUrl,
      external_url: "https://dunder-mifflin-id.vercel.app",
      attributes: [
        {
          trait_type: "Office Character",
          value: character
        },
        {
          trait_type: "Employee Name", 
          value: displayName
        },
        {
          trait_type: "Farcaster FID",
          value: fid.toString()
        },
        {
          trait_type: "Issue Date",
          value: issueDate.toLocaleDateString('en-US')
        },
        {
          trait_type: "Branch",
          value: "Scranton, PA"
        },
        {
          trait_type: "Company",
          value: "Dunder Mifflin Paper Company"
        }
      ],
      properties: {
        character: character,
        employeeName: displayName,
        fid: Number(fid),
        analysisText: analysisText || '',
        issueDate: issueDate.toISOString(),
        branch: "Scranton, PA"
      }
    };
    
    // 7. Upload to R2 with exact same filename
    const r2Key = `what-x-are-you/${metadataFilename}`;
    const metadataBuffer = Buffer.from(JSON.stringify(nftMetadata, null, 2));
    
    console.log(`📤 Uploading to R2: ${r2Key}`);
    
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: r2Key,
      Body: metadataBuffer,
      ContentType: 'application/json',
      CacheControl: 'public, max-age=31536000', // 1 year cache
    });
    
    await r2Client.send(uploadCommand);
    
    console.log(`✅ Successfully recovered metadata for Token ID ${tokenId}`);
    console.log(`🔗 Metadata URL: ${metadataURI}`);
    
    return {
      tokenId,
      success: true,
      metadataURI,
      employee: { character, displayName, fid: Number(fid) }
    };
    
  } catch (error) {
    console.error(`❌ Failed to recover Token ID ${tokenId}:`, error.message);
    return {
      tokenId,
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🚨 Dunder Mifflin ID Metadata Recovery Tool');
  console.log('==========================================');
  console.log(`📄 Contract: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 RPC: ${RPC_URL}`);
  console.log(`☁️ R2 Bucket: ${process.env.R2_BUCKET_NAME}`);
  
  // Get token IDs to recover (usually the first few minted)
  const tokenIds = process.argv.slice(2).map(id => parseInt(id));
  
  if (tokenIds.length === 0) {
    console.log('\n❓ No token IDs specified. Attempting to recover tokens 0 and 1...');
    tokenIds.push(0, 1);
  }
  
  console.log(`🎯 Recovering tokens: ${tokenIds.join(', ')}`);
  
  const results = [];
  
  for (const tokenId of tokenIds) {
    const result = await recoverMetadata(tokenId);
    results.push(result);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 Recovery Summary:');
  console.log('==================');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Successfully recovered:');
    successful.forEach(r => {
      console.log(`  Token ${r.tokenId}: ${r.employee.displayName} (${r.employee.character})`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed to recover:');
    failed.forEach(r => {
      console.log(`  Token ${r.tokenId}: ${r.error}`);
    });
  }
  
  console.log('\n🎉 Recovery process complete!');
}

// Run the recovery
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { recoverMetadata };