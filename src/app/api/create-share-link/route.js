import { NextResponse } from 'next/server';
import { uploadToR2, isCloudflareR2Configured } from '@/lib/r2';

export async function POST(request) {
  try {
    const body = await request.json();
    const { character, displayName, pfpUrl, fid, analysisText } = body;

    if (!character || !displayName || !fid) {
      return NextResponse.json({ error: 'Missing required parameters: character, displayName, fid' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL is not configured.' }, { status: 500 });
    }

    // Create base shareable URL without image parameter (works without R2)
    const sharePageUrl = new URL(appUrl);
    
    let generatedImageR2Url = null;
    let generatedMetadataR2Url = null;
    let imageFileName = null;
    let metadataFileName = null;

    // If R2 is configured, generate and upload the image
    if (isCloudflareR2Configured()) {
      try {
        // Construct the URL for the OG image generator
        const ogImageUrl = new URL(`${appUrl}/api/og`);
        ogImageUrl.searchParams.set('character', character);
        ogImageUrl.searchParams.set('displayName', displayName);
        if (pfpUrl) {
          ogImageUrl.searchParams.set('pfpUrl', pfpUrl);
        }
        if (analysisText) {
          ogImageUrl.searchParams.set('analysisText', analysisText);
        }
        ogImageUrl.searchParams.set('fid', fid.toString());

        // Fetch the image from the OG route
        const imageResponse = await fetch(ogImageUrl.toString());
        
        if (!imageResponse.ok) {
          const errorText = await imageResponse.text();
          console.warn('Failed to generate OG image for R2 upload:', errorText);
        } else {
          const imageBuffer = await imageResponse.arrayBuffer();

          // Upload to R2
          const timestamp = Date.now();
          imageFileName = `share-image-${fid}-${timestamp}.png`;
          const r2FileName = `what-x-are-you/${imageFileName}`;
          
          generatedImageR2Url = await uploadToR2(Buffer.from(imageBuffer), r2FileName, 'image/png');

          // Generate NFT metadata and upload to R2
          if (generatedImageR2Url) {
            try {
              // Create NFT metadata following OpenSea standards
              const nftMetadata = {
                name: `Dunder Mifflin Employee ID - ${displayName}`,
                description: `Official Dunder Mifflin Scranton Employee ID for ${displayName}. Most like ${character} from The Office.${analysisText ? ` ${analysisText}` : ''}`,
                image: generatedImageR2Url, // Use R2 URL instead of IPFS
                external_url: appUrl,
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
                    value: new Date().toLocaleDateString('en-US')
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
                  fid: fid,
                  analysisText: analysisText || '',
                  issueDate: new Date().toISOString(),
                  branch: "Scranton, PA"
                }
              };

              // Upload metadata JSON to R2
              metadataFileName = `metadata-${fid}-${timestamp}.json`;
              const metadataR2FileName = `what-x-are-you/${metadataFileName}`;
              const metadataBuffer = Buffer.from(JSON.stringify(nftMetadata, null, 2));
              
              generatedMetadataR2Url = await uploadToR2(metadataBuffer, metadataR2FileName, 'application/json');
              
              console.log(`✅ Generated NFT metadata for ${displayName}: ${generatedMetadataR2Url}`);
            } catch (metadataError) {
              console.warn('Failed to generate/upload NFT metadata:', metadataError.message);
              // Continue - image sharing still works without metadata
            }
          }

          // Add image parameter to the shareable URL only if R2 upload succeeded
          sharePageUrl.searchParams.set('image', imageFileName);
        }
      } catch (r2Error) {
        console.warn('R2 upload failed, sharing without image:', r2Error.message);
        // Continue without R2 image - sharing will still work
      }
    }

    return NextResponse.json({
      generatedImageR2Url,
      generatedMetadataR2Url,
      shareablePageUrl: sharePageUrl.toString(),
      imageFileName,
      metadataFileName,
      hasCustomImage: !!generatedImageR2Url,
      hasMetadata: !!generatedMetadataR2Url
    });

  } catch (error) {
    console.error('Error in create-share-link:', error); // Keep error
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
} 