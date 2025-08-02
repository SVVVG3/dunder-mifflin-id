'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './HomeComponent.module.css';
import { shareCastIntent } from '@/lib/frame';

// Helper function to get character colors (adjust as needed)
const getCharacterStyle = (characterName) => {
  switch (characterName?.toLowerCase()) {
    case 'tony soprano': return styles.tonySoprano;
    case 'carmela soprano': return styles.carmelaSoprano;
    case 'christopher moltisanti': return styles.christopherMoltisanti;
    case 'paulie gualtieri': return styles.paulieGualtieri;
    case 'silvio dante': return styles.silvioDante;
    case 'dr. jennifer melfi': return styles.drJenniferMelfi;
    default: return '';
  }
};

// Helper function to get character image URLs
const getCharacterImage = (characterName) => {
  switch (characterName?.toLowerCase()) {
    case 'tony soprano': return '/characters/tony-soprano.png';
    case 'carmela soprano': return '/characters/carmela-soprano.png';
    case 'christopher moltisanti': return '/characters/christopher-moltisanti.png';
    case 'paulie gualtieri': return '/characters/paulie-gualtieri.png';
    case 'silvio dante': return '/characters/silvio-dante.png';
    case 'dr. jennifer melfi': return '/characters/dr-jennifer-melfi.png';
    default: return '/characters/default-character.png';
  }
};

export function HomeComponent() {
  const [userData, setUserData] = useState(null);
  const [sopranosData, setSopranosData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fid, setFid] = useState(null);
  const [shareStatus, setShareStatus] = useState('');

  // Effect to check for window.userFid
  useEffect(() => {
    if (typeof window !== 'undefined' && window.userFid) {
      // console.log('HomeComponent found window.userFid immediately:', window.userFid);
      setFid(window.userFid);
      setIsLoading(false); 
      return; 
    }
    let attempts = 0;
    const maxAttempts = 30; 
    const intervalMs = 200;
    // console.log('HomeComponent starting poll for window.userFid');
    const intervalId = setInterval(() => {
      attempts++;
      if (typeof window !== 'undefined' && window.userFid) {
        // console.log(`HomeComponent found window.userFid after ${attempts} attempts:`, window.userFid);
        setFid(window.userFid);
        clearInterval(intervalId);
      } else if (attempts >= maxAttempts) {
        // console.warn('HomeComponent polling timeout reached without finding window.userFid.');
        setError("Could not detect Farcaster frame context. Ensure you're viewing this in a frame.");
        setIsLoading(false);
        clearInterval(intervalId);
      }
    }, intervalMs);
    return () => {
      // console.log("HomeComponent cleaning up polling interval.");
      clearInterval(intervalId);
    };
  }, []);

  // Fetch data effect (triggered by fid change)
  useEffect(() => {
    if (!fid) {
        return;
    }
    // console.log(`HomeComponent FID set to: ${fid}, fetching analysis data...`);
    setIsLoading(true);
    setError(null);
    setUserData(null);
    setSopranosData(null);
    setShareStatus('');
    fetch(`/api/user?fid=${fid}`)
      .then(async res => {
        if (!res.ok) {
          let errorMsg = `API request failed with status ${res.status}`;
          try { const errorData = await res.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* Ignore */ }
          throw new Error(errorMsg);
        }
        return res.json();
      })
      .then(data => {
        // console.log("HomeComponent received analysis data:", data);
        if (!data.sopranos) throw new Error("Missing Sopranos analysis.");
        setUserData({ username: data.username, pfp_url: data.pfp_url, display_name: data.display_name });
        setSopranosData(data.sopranos);
        setIsLoading(false); 
      })
      .catch(err => {
        console.error("Error fetching analysis data:", err); // Keep error
        setError(err.message || "Failed to fetch analysis data.");
        setIsLoading(false); 
      });
  }, [fid]);

  const handleShareClick = useCallback(async () => {
    if (!sopranosData || !fid || !userData) {
      // console.error('Missing data for sharing:', { sopranosData, fid, userData });
      setShareStatus('Error: Missing data');
      setTimeout(() => setShareStatus(''), 3000);
      return;
    }

    setShareStatus('Sharing...');

    try {
      const apiResponse = await fetch('/api/create-share-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          character: sopranosData.primaryCharacter,
          displayName: userData.display_name || userData.username || `FID ${fid}`,
          pfpUrl: userData.pfp_url || '',
          fid: fid,
        }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || `Failed to create share link (status: ${apiResponse.status})`);
      }

      // Destructure response data
      const { shareablePageUrl, generatedImageR2Url, hasCustomImage } = await apiResponse.json();

      // Log the R2 URL to the front-end console as requested
      if (generatedImageR2Url) {
        console.log('Final R2 Image URL:', generatedImageR2Url);
      }

      if (!shareablePageUrl) {
        throw new Error('Shareable Page URL not received from API.');
      }

      const castText = `I'm most like ${sopranosData.primaryCharacter}! Which Soprano are you?`;
      
      await shareCastIntent(castText, shareablePageUrl);
      
      // Provide different success messages based on whether custom image was included
      if (hasCustomImage) {
        setShareStatus('Shared with image!');
      } else {
        setShareStatus('Shared!');
      }

    } catch (err) {
      console.error('Error in handleShareClick:', err); // Keep error
      setShareStatus(`Share failed: ${err.message.substring(0, 50)}...`);
    } finally {
      setTimeout(() => setShareStatus(''), 5000); 
    }
  }, [sopranosData, userData, fid]);

  const primaryCharacter = sopranosData?.primaryCharacter;
  const characterStyle = getCharacterStyle(primaryCharacter);
  const otherCharacters = sopranosData?.counterArguments ? Object.keys(sopranosData.counterArguments) : [];

  // Loading State UI (Show if fid is not set yet OR if isLoading is true during fetch)
  if (!fid || isLoading) {
        return (
            <div className={`${styles.container} ${styles.loadingContainer}`}>
                <div className={styles.spinner}></div>
                {/* Adjust text based on whether we are waiting for FID or fetching data */} 
                <p className={styles.loadingText}>{!fid ? "Waiting for frame context..." : "Analyzing your personality..."}</p>
            </div>
        );
  }

  // Error State UI
  if (error) {
        return (
            <div className={styles.container}>
                 <h2 className={styles.errorTitle}>Analysis Error!</h2>
                <p className={styles.errorMessage}>{error}</p>
            </div>
        );
  }

  // Main Content UI (Only render if fid is set, not loading, and no error)
  return (
    <div className={styles.container}>
      {/* Simplified Header */} 
      <div className={styles.headerContainer}>
        {userData && userData.pfp_url && (
            <div className={styles.pfpContainerSmall}>
              <Image
                src={userData.pfp_url}
                alt={`${userData.display_name || userData.username || 'User'}'s profile picture`}
                width={50} // Smaller PFP
                height={50}
                className={`${styles.pfpImageSmall} ${characterStyle}`}
                priority
                unoptimized={true}
              />
            </div>
        )}
         <h1 className={styles.titleSmall}>
            Analysis complete for <span className={styles.userNameHighlight}>{userData?.display_name || userData?.username || `FID ${fid}` }</span>!
        </h1>
      </div>

      {/* Share Button - MOVED HERE */} 
      {sopranosData && (
        <button
            className={styles.shareButton}
            onClick={handleShareClick}
            disabled={!!shareStatus && shareStatus !== 'Share Result'}
            aria-label="Share Result"
        >
            <span role="img" aria-label="share icon">🔗</span> 
            {shareStatus || 'Share Result'}
        </button>
       )}

      {/* Results Container */} 
      {sopranosData && (
          <div className={styles.resultsContainer}>
            <h2 className={styles.resultTitle}>You are most like... <span className={`${styles.highlight} ${characterStyle}`}>{primaryCharacter}!</span></h2>
            
            {/* Character Image */}
            <div className={styles.characterImageContainer}>
              <Image
                src={getCharacterImage(primaryCharacter)}
                alt={`${primaryCharacter} character portrait`}
                width={200}
                height={200}
                className={`${styles.characterImage} ${characterStyle}`}
                priority
                unoptimized={true}
              />
            </div>
            
            {sopranosData.summary && <p className={styles.summary}>{sopranosData.summary}</p>}
            
            {/* Details Grid - REORDERED */} 
            <div className={styles.detailsGrid}>
                {/* Key Traits & Evidence (Now First) */} 
                {sopranosData.evidence && sopranosData.evidence.length > 0 && (
                  <div className={styles.evidenceContainer}>
                    <h3>Key Traits & Evidence</h3>
                    {sopranosData.evidence.map((item, index) => (
                      <div key={index} className={styles.evidenceItem}>
                        <h4 className={styles.traitTitle}>{item.trait}</h4>
                        <blockquote>
                          {item.quotes.map((quote, qIndex) => (
                            <p key={qIndex}>"{quote}"</p>
                          ))}
                        </blockquote>
                        <p className={styles.explanation}>{item.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
                {/* Character Affinity (Now Second) */} 
                {sopranosData.characterPercentages && (
                  <div className={styles.percentagesContainer}>
                    <h3>Character Affinity</h3>
                    <ul>
                      {Object.entries(sopranosData.characterPercentages)
                        .sort(([, a], [, b]) => b - a)
                        .map(([character, percentage]) => (
                          <li key={character} className={getCharacterStyle(character)}>
                             {character}: {Math.round(percentage)}%
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
            </div>

             {/* Why Not Section */} 
             {otherCharacters.length > 0 && (
                <div className={styles.whyNotContainer}>
                    <h3>Why Not Other Characters?</h3>
                    {otherCharacters.map(character => (
                        <div key={character} className={styles.whyNotItem}>
                            <strong className={getCharacterStyle(character)}>{character}:</strong> {sopranosData.counterArguments[character]}
                        </div>
                    ))}
                </div>
             )}
          </div>
      )}
    </div>
  );
} 