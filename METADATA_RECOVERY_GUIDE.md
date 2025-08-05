# 🚨 NFT Metadata Recovery Guide

## Overview
If you accidentally deleted NFT metadata JSON files from Cloudflare R2, **don't panic!** All the data needed to recreate them is stored permanently on the blockchain.

## Why This Is Recoverable

✅ **Metadata URLs are stored on-chain** (in the NFT contract)  
✅ **All employee data is on-chain** (character, name, analysis, FID, etc.)  
✅ **We know the exact JSON format** (from our code)  
✅ **File naming pattern is predictable** (`metadata-{fid}-{timestamp}.json`)

## Quick Recovery (Automated)

### Step 1: Run the Recovery Script
```bash
# Install dependencies if needed
npm install ethers aws-sdk

# Recover specific token IDs (usually 0, 1, 2...)
node scripts/recover-metadata.js 0 1

# Or let it auto-detect the first few tokens
node scripts/recover-metadata.js
```

## Manual Recovery Process

### Step 1: Find the Affected Token IDs
The first NFTs minted are usually Token IDs `0`, `1`, `2`, etc.

### Step 2: Get Metadata URLs from Blockchain
Go to [Basescan](https://basescan.org/address/0x647a7E29991Df1192C0fF4264c18CD7001c05787) and:
1. Go to "Contract" → "Read Contract"
2. Use `tokenURI` function with your token ID
3. Copy the returned URL (e.g., `https://pub-8ce6bdd28a564ddfa5df9e4394b9cc71.r2.dev/what-x-are-you/metadata-466111-1234567890.json`)

### Step 3: Get Employee Data from Blockchain
1. Still on Basescan, use the `employees` function
2. Enter your token ID
3. Note down: character, displayName, analysisText, mintedAt, fid

### Step 4: Create the JSON File
Create a file with the exact filename from the URL:

```json
{
  "name": "Dunder Mifflin Employee ID - [DISPLAY_NAME]",
  "description": "Official Dunder Mifflin Scranton Employee ID for [DISPLAY_NAME]. Most like [CHARACTER] from The Office. [ANALYSIS_TEXT]",
  "image": "https://pub-8ce6bdd28a564ddfa5df9e4394b9cc71.r2.dev/what-x-are-you/share-image-[FID]-[TIMESTAMP].png",
  "external_url": "https://dunder-mifflin-id.vercel.app",
  "attributes": [
    {
      "trait_type": "Office Character",
      "value": "[CHARACTER]"
    },
    {
      "trait_type": "Employee Name", 
      "value": "[DISPLAY_NAME]"
    },
    {
      "trait_type": "Farcaster FID",
      "value": "[FID]"
    },
    {
      "trait_type": "Issue Date",
      "value": "[DATE]"
    },
    {
      "trait_type": "Branch",
      "value": "Scranton, PA"
    },
    {
      "trait_type": "Company",
      "value": "Dunder Mifflin Paper Company"
    }
  ],
  "properties": {
    "character": "[CHARACTER]",
    "employeeName": "[DISPLAY_NAME]",
    "fid": [FID_NUMBER],
    "analysisText": "[ANALYSIS_TEXT]",
    "issueDate": "[ISO_DATE]",
    "branch": "Scranton, PA"
  }
}
```

### Step 5: Upload to R2
1. Go to your Cloudflare R2 dashboard
2. Navigate to the `what-x-are-you/` folder
3. Upload the JSON file with the **exact same filename** as the original
4. Set Content-Type to `application/json`

## Verification

After recovery:
1. Check the metadata URL in your browser - it should load the JSON
2. Check OpenSea - the NFT should show proper metadata after a few minutes
3. Verify all attributes are correct

## Prevention

To prevent this in the future:
- **Enable R2 versioning** in Cloudflare dashboard
- **Create backups** of critical metadata files
- **Set up bucket policies** to prevent accidental deletion

## Need Help?

If the automated script doesn't work:
1. Check your `.env` file has all required R2 credentials
2. Verify the contract address is correct
3. Make sure the RPC URL is working
4. Check the token IDs actually exist and have metadata URIs

The blockchain is permanent - your NFTs and their data are safe! 🎯