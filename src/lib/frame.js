import * as frame from '@farcaster/frame-sdk'

export async function initializeFrame() {
  try {
    // Always call ready() first to remove splash screen - required for Mini Apps
    await frame.sdk.actions.ready();
    console.log('Mini App ready signal sent.');
    
    // Then try to get context
    const context = await frame.sdk.context;

    if (!context || !context.user) {
      console.log('Not in frame context - running as standalone');
      return;
    }

    // Handle potential nested user object (known issue)
    let user = context.user;
    if (user && typeof user === 'object' && 'fid' in user && 'user' in user && user.user) {
      console.warn('Detected nested user object, accessing user.user');
      user = user.user;
    }

    // Ensure user object has fid
    if (!user || typeof user.fid !== 'number') {
      console.error('User object or fid is missing or invalid in frame context:', user);
      return;
    }

    console.log('Frame context initialized for user FID:', user.fid);

    // Make FID globally accessible
    window.userFid = user.fid;
    
  } catch (error) {
    console.error('Error initializing frame/miniapp:', error);
    // Still try to call ready even if context fails
    try {
      await frame.sdk.actions.ready();
      console.log('Fallback ready signal sent.');
    } catch (readyError) {
      console.error('Error signaling ready:', readyError);
    }
  }
}

export async function shareCastIntent(castText, embedUrl) {
  if (!castText || !embedUrl) {
    // console.error('shareCastIntent: castText and embedUrl are required.');
    throw new Error('Cast text and embed URL are required for sharing.');
  }

  try {
    const finalComposeUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(embedUrl)}`;
    
    // Ensure the SDK is available and has the necessary methods
    if (!frame || !frame.sdk || !frame.sdk.actions || !frame.sdk.actions.openUrl) {
        throw new Error('Farcaster SDK or actions.openUrl not available.');
    }

    await frame.sdk.actions.openUrl({ url: finalComposeUrl });
    // console.log('Successfully opened Warpcast compose intent:', finalComposeUrl);
  } catch (error) {
    console.error('Error in shareCastIntent opening URL:', error);
    // Re-throw the error so the calling component can handle it if needed
    throw error; 
  }
} 