import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

// Character to office position mapping
const characterPositions = {
  'Jim Halpert': 'Sales',
  'Pam Beesly': 'Reception',
  'Dwight Schrute': 'Sales',
  'Michael Scott': 'Regional Manager',
  'Angela Martin': 'Accounting',
  'Stanley Hudson': 'Sales',
  'Kelly Kapoor': 'Customer Service',
  'Oscar Martinez': 'Accounting',
  'Darryl Philbin': 'Warehouse Foreman',
  'Kevin Malone': 'Accounting'
};

function getCharacterImage(character) {
  const characterImages = {
    'Jim Halpert': '/characters/jim-halpert-id.png',
    'Pam Beesly': '/characters/pam-beesly-id.png',
    'Dwight Schrute': '/characters/dwight-schrute-id.png',
    'Michael Scott': '/characters/michael-scott-id.png',
    'Angela Martin': '/characters/angela-martin-id.png',
    'Stanley Hudson': '/characters/stanley-hudson-id.png',
    'Kelly Kapoor': '/characters/kelly-kapoor-id.png',
    'Oscar Martinez': '/characters/oscar-martinez-id.png',
    'Darryl Philbin': '/characters/darryl-philbin-id.png',
    'Kevin Malone': '/characters/kevin-malone-id.png'
  };
  return characterImages[character] || '/characters/jim-halpert-id.png';
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Params from query string
    const character = searchParams.get('character') || 'Jim Halpert';
    const displayName = searchParams.get('displayName') || 'Anonymous User';
    const analysisText = searchParams.get('analysisText') || '';
    
    // Get additional data for ID card
    const position = characterPositions[character] || 'Employee';
    const badgeDate = new Date().toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
    
    // Build ALL strings outside JSX to avoid interpolation issues
    const characterInitials = character.split(' ')[0][0] + (character.split(' ')[1] ? character.split(' ')[1][0] : '');
    const issuedText = `Issued: ${badgeDate}`;
    const characterMatchText = `Office Mentor: ${character}`;
    const positionText = `Position: ${position}`;
    const locationWithDateText = `Scranton, PA | ${issuedText}`;
    const quotedAnalysisText = analysisText ? `"${analysisText}"` : '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://8a08d2da340d.ngrok-free.app';
    const characterImageUrl = `${appUrl}${getCharacterImage(character)}`;
    const officeIconUrl = `${appUrl}/office-icon.png`;
    const barcodeImageUrl = `${appUrl}/barcode.png`;
    
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

    // Build profile image JSX outside to avoid conditional rendering crashes (50% bigger: 28px -> 42px)
    const userInitial = displayName.charAt(0).toUpperCase();
    let profileImageJSX;
    if (validPfpUrl) {
      profileImageJSX = (
        <img
          src={validPfpUrl}
          alt="Profile"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            objectFit: 'cover'
          }}
        />
      );
    } else {
      profileImageJSX = <span>{userInitial}</span>;
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            fontFamily: 'Anton, Arial, sans-serif',
            border: '12px solid #e0e0e0',
            borderRadius: '20px',
            overflow: 'hidden'
          }}
        >
          {/* Blue Header Section */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#012f85',
            padding: '20px 24px',
            height: '120px'
          }}>
                    {/* Office Icon (moved to left, 50% bigger + 20% more + 10% more) */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src={officeIconUrl}
            alt="Office Icon"
            style={{
              width: '119px',
              height: '119px'
            }}
          />
        </div>
            
            {/* Barcode (moved to right, 20% bigger) */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img
                src={barcodeImageUrl}
                alt="Barcode"
                style={{
                  width: '144px',
                  height: '48px'
                }}
              />
            </div>
          </div>
          
          {/* Main Content Area */}
          <div style={{ 
            display: 'flex', 
            flex: 1,
            backgroundColor: '#ffffff'
          }}>
            {/* Left Side - Employee Info */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              width: '55%',
              padding: '20px',
              justifyContent: 'space-between'
            }}>
              {/* Employee Name with profile picture */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#000', marginRight: '8px' }}>{displayName}</div>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  color: '#666',
                  fontWeight: 'bold',
                  overflow: 'hidden'
                }}>
                  {profileImageJSX}
                </div>
              </div>
              
              {/* Temporary Employee Badge text */}
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px', display: 'block' }}>Temporary Employee Badge</div>
              
              {/* Location with Issued Date */}
              <div style={{ fontSize: '18px', color: '#333', marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                <span>Scranton, PA</span>
                <span style={{ fontWeight: 'bold', margin: '0 8px' }}>|</span>
                <span style={{ fontSize: '14px', fontWeight: 'normal' }}>{issuedText}</span>
              </div>
              
              {/* Analysis Text (between issued date and position) */}
              {quotedAnalysisText && (
                <div style={{ fontSize: '13px', color: '#555', fontStyle: 'italic', marginBottom: '16px', lineHeight: '1.3', display: 'block' }}>
                  {quotedAnalysisText}
                </div>
              )}
              
              {/* Position Text (no rectangle) */}
              <div style={{ fontSize: '16px', color: '#000', fontWeight: 'bold', marginTop: 'auto', display: 'block' }}>
                {positionText}
              </div>
            </div>
            
            {/* Right Side - Character Photo */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              width: '45%',
              padding: '20px'
            }}>
              <div style={{
                width: '200px',
                height: '200px',
                border: '4px solid #333',
                backgroundColor: '#f8f8f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginBottom: '8px',
                borderRadius: '12px'
              }}>
                <img
                  src={characterImageUrl}
                  alt={character}
                  style={{
                    width: '192px',
                    height: '192px',
                    objectFit: 'cover'
                  }}
                />
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#012f85', 
                fontWeight: 'bold',
                textAlign: 'center',
                display: 'block'
              }}>
                {characterMatchText}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 600,
        height: 400,
        debug: false,
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