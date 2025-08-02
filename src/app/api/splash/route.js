import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET() {
  try {
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
            backgroundColor: '#0a0a0a',
            fontFamily: '"Arial", sans-serif',
            fontSize: 64,
            color: '#ff6b35',
            textAlign: 'center',
          }}
        >
          <div style={{
            fontSize: '120px',
            marginBottom: '20px'
          }}>
            🎭
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#ededed'
          }}>
            Which Soprano
          </div>
          <div style={{
            fontSize: '32px', 
            fontWeight: 'bold',
            color: '#ededed'
          }}>
            Are You?
          </div>
        </div>
      ),
      {
        width: 200,
        height: 200,
      },
    );
  } catch (e) {
    console.error('Error generating splash image:', e.message);
    return new Response(`Failed to generate splash image: ${e.message}`, { status: 500 });
  }
}