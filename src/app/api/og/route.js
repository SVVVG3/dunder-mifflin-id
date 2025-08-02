import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Params from query string
    const character = searchParams.get('character') || 'Your Character';
    const displayName = searchParams.get('displayName') || 'Anonymous User';
    const pfpUrl = searchParams.get('pfpUrl');
    // const fid = searchParams.get('fid'); // Not directly used in image text but good for context

    // Basic validation for pfpUrl
    let validPfpUrl = null;
    if (pfpUrl) {
      try {
        const pfpUrlObj = new URL(pfpUrl);
        if (pfpUrlObj.protocol === 'http:' || pfpUrlObj.protocol === 'https:') {
          validPfpUrl = pfpUrl;
        }
      } catch (e) {
        // console.warn('Invalid pfpUrl provided:', pfpUrl); // Reduce logging
      }
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            fontFamily: '"Arial", sans-serif',
            fontSize: 32,
            color: 'white',
            padding: '20px',
            border: '20px solid #8B0000'
          }}
        >
          {/* Character Image */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
            <div 
              style={{ 
                width: 120, 
                height: 120, 
                borderRadius: '12px',
                backgroundColor: '#333',
                border: '4px solid #8B0000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                color: '#FF6B35'
              }}
            >
              {character.split(' ')[0][0]}{character.split(' ')[1] ? character.split(' ')[1][0] : ''}
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            textAlign: 'center',
            marginBottom: '15px',
            fontSize: '40px',
            fontWeight: 'bold',
            color: '#fff'
          }}>{displayName}</div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            textAlign: 'center',
            fontSize: '42px',
            fontWeight: 'bold',
            color: '#FF6B35',
            marginBottom: '20px'
          }}>
            I'm most like {character}!
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            textAlign: 'center',
            fontSize: '28px',
            color: '#ccc',
            marginTop: 'auto'
          }}>
            Which Soprano are you?
          </div>
        </div>
      ),
      {
        width: 600,
        height: 400,
      },
    );
  } catch (e) {
    console.error('Error generating image:', e.message);
    if (e.cause) {
      console.error('Cause:', e.cause);
    }
    return new Response(`Failed to generate image: ${e.message}`, { status: 500 });
  }
} 