'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './HomeComponent.module.css';
import { shareCastIntent } from '@/lib/frame';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAccount, useReadContract, useWriteContract, useSwitchChain, useWaitForTransactionReceipt } from 'wagmi';
import { base } from 'wagmi/chains';
import { parseUnits, formatUnits } from 'viem';

// Contract addresses
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC
const MINT_PRICE = '1000000'; // $1 USDC (6 decimals)

// Contract ABIs
const NFT_CONTRACT_ABI = [
  {
    name: 'mintEmployeeID',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'character', type: 'string' },
      { name: 'displayName', type: 'string' },
      { name: 'analysisText', type: 'string' },
      { name: 'fid', type: 'uint256' },
      { name: 'metadataURI', type: 'string' }
    ],
    outputs: []
  },
  {
    name: 'hasMinted',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'getMintPriceUSDC',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  }
];

const USDC_CONTRACT_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
];

// Helper function to get character colors (adjust as needed)
const getCharacterStyle = (characterName) => {
  switch (characterName?.toLowerCase()) {
    case 'jim halpert': return styles.jimHalpert;
    case 'pam beesly': return styles.pamBeesly;
    case 'dwight schrute': return styles.dwightSchrute;
    case 'michael scott': return styles.michaelScott;
    case 'angela martin': return styles.angelaMartin;
    case 'stanley hudson': return styles.stanleyHudson;
    case 'kelly kapoor': return styles.kellyKapoor;
    case 'oscar martinez': return styles.oscarMartinez;
    case 'darryl philbin': return styles.darrylPhilbin;
    case 'kevin malone': return styles.kevinMalone;
    default: return '';
  }
};

// Helper function to get character image URLs
const getCharacterImage = (characterName) => {
  switch (characterName?.toLowerCase()) {
    case 'jim halpert': return '/characters/jim-halpert.png?v=2';
    case 'pam beesly': return '/characters/pam-beesly.png?v=2';
    case 'dwight schrute': return '/characters/dwight-schrute.png?v=2';
    case 'michael scott': return '/characters/michael-scott.png?v=2';
    case 'angela martin': return '/characters/angela-martin.png?v=2';
    case 'stanley hudson': return '/characters/stanley-hudson.png?v=2';
    case 'kelly kapoor': return '/characters/kelly-kapoor.png?v=2';
    case 'oscar martinez': return '/characters/oscar-martinez.png?v=2';
    case 'darryl philbin': return '/characters/darryl-philbin.png?v=2';
    case 'kevin malone': return '/characters/kevin-malone.png?v=2';
    default: return '/characters/michael-scott.png?v=2'; // Fallback to Michael if unknown character
  }
};

export function HomeComponent() {
  const [userData, setUserData] = useState(null);
  const [officeData, setOfficeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fid, setFid] = useState(null);
  const [shareStatus, setShareStatus] = useState('');
  const [mintStatus, setMintStatus] = useState('');
  const [hasShared, setHasShared] = useState(false);
  const [mintStep, setMintStep] = useState('idle'); // 'idle', 'approving', 'minting', 'complete'
  const [mintData, setMintData] = useState(null); // Store mint parameters

  // Wagmi hooks
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: mintTxHash, error: mintError, isPending: isMintPending } = useWriteContract();
  const { writeContract: approveUSDC, data: approveTxHash, error: approveError, isPending: isApprovePending } = useWriteContract();

  // Get contract address from env
  const contractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;

  // Read contract hooks - only run if address is available
  const { data: hasMintedData } = useReadContract({
    address: contractAddress,
    abi: NFT_CONTRACT_ABI,
    functionName: 'hasMinted',
    args: [address],
    query: { enabled: !!address && !!contractAddress }
  });

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_CONTRACT_ABI,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address }
  });

  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_CONTRACT_ABI,
    functionName: 'allowance',
    args: [address, contractAddress],
    query: { enabled: !!address && !!contractAddress }
  });

  // Transaction receipt hooks
  const { isLoading: isMintTxLoading, isSuccess: isMintTxSuccess } = useWaitForTransactionReceipt({
    hash: mintTxHash,
  });

  const { isLoading: isApproveTxLoading, isSuccess: isApproveTxSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  // Handle approval transaction status
  useEffect(() => {
    if (isApprovePending) {
      setMintStatus('📝 Approving USDC spending... (Check your wallet)');
      setMintStep('approving');
    } else if (isApproveTxLoading) {
      setMintStatus('⏳ Waiting for USDC approval confirmation...');
    } else if (isApproveTxSuccess && mintStep === 'approving' && mintData) {
      console.log('✅ Approval successful, waiting for blockchain state update...');
      setMintStatus('⏳ USDC approved! Waiting for blockchain sync...');
      
      // CRITICAL FIX: Add delay + refetch allowance to prevent race condition
      // Wait 3 seconds for blockchain state to fully update before minting
      setTimeout(async () => {
        console.log('🎯 Blockchain synced, refetching allowance...');
        setMintStatus('🔄 Verifying USDC approval...');
        
        try {
          // Refetch allowance to ensure we have latest blockchain state
          await refetchAllowance();
          
          console.log('✅ Allowance refreshed, now minting...');
          setMintStatus('🎯 USDC approved! Now minting your ID...');
          setMintStep('minting');
          
          // Automatically trigger mint with stored data
          writeContract({
            address: contractAddress,
            abi: NFT_CONTRACT_ABI,
            functionName: 'mintEmployeeID',
            args: [
              mintData.character, 
              mintData.displayName, 
              mintData.analysisText, 
              BigInt(mintData.fid), 
              mintData.metadataUrl
            ],
          });
        } catch (error) {
          console.error('❌ Failed to refetch allowance:', error);
          setMintStatus('🔄 Retrying in 2 seconds...');
          
          // Fallback: try one more time after 2 seconds
          setTimeout(() => {
            setMintStatus('🎯 Now minting your ID...');
            setMintStep('minting');
            writeContract({
              address: contractAddress,
              abi: NFT_CONTRACT_ABI,
              functionName: 'mintEmployeeID',
              args: [
                mintData.character, 
                mintData.displayName, 
                mintData.analysisText, 
                BigInt(mintData.fid), 
                mintData.metadataUrl
              ],
            });
          }, 2000);
        }
      }, 3000); // 3 second delay to prevent race condition
      
    } else if (approveError) {
      console.error('Approval error:', approveError);
      setMintStatus(`❌ USDC approval failed: ${approveError.message}`);
      setMintStep('idle');
      setMintData(null);
      setTimeout(() => setMintStatus(''), 8000);
    }
  }, [isApprovePending, isApproveTxLoading, isApproveTxSuccess, approveError, mintStep, mintData, writeContract, contractAddress, refetchAllowance]);

  // Handle mint transaction status
  useEffect(() => {
    if (isMintPending && mintStep === 'minting') {
      setMintStatus('🎯 Minting your ID... (Check your wallet)');
    } else if (isMintTxLoading) {
      setMintStatus('⏳ Waiting for mint confirmation...');
    } else if (isMintTxSuccess && mintTxHash && mintStep === 'minting') {
      console.log('✅ Mint successful, tx hash:', mintTxHash);
      const character = mintData?.character || officeData?.primaryCharacter || 'Unknown';
      const displayName = mintData?.displayName || userData?.display_name || userData?.username || 'Unknown';
      
      setMintStatus(`🎉 Dunder Mifflin ID Minted Successfully!
🏢 Official Farcaster Mini App Minting
📋 Employee: ${displayName}
👔 Character: ${character}
🔗 TX: ${mintTxHash.substring(0, 10)}...
💎 View on Base Explorer`);
      
      setMintStep('complete');
      setMintData(null);
      setTimeout(() => setMintStatus(''), 25000);
    } else if (mintError && mintStep === 'minting') {
      console.error('Mint error:', mintError);
      
      // Check if it's an allowance error
      if (mintError.message?.includes('transfer amount exceeds allowance') || 
          mintError.message?.includes('ERC20: transfer amount exceeds allowance')) {
        setMintStatus('🔄 Allowance issue detected. Please try minting again in 10 seconds...');
        console.log('🔄 Allowance race condition detected, will auto-retry');
        // Auto-retry after 10 seconds
        setTimeout(() => {
          if (mintData) {
            setMintStatus('🔄 Auto-retrying mint...');
            writeContract({
              address: contractAddress,
              abi: NFT_CONTRACT_ABI,
              functionName: 'mintEmployeeID',
              args: [
                mintData.character, 
                mintData.displayName, 
                mintData.analysisText, 
                BigInt(mintData.fid), 
                mintData.metadataUrl
              ],
            });
          }
        }, 10000);
      } else {
        setMintStatus(`❌ Mint failed: ${mintError.message}`);
        setMintStep('idle');
        setMintData(null);
        setTimeout(() => setMintStatus(''), 8000);
      }
    }
  }, [isMintPending, isMintTxLoading, isMintTxSuccess, mintTxHash, mintError, mintStep, mintData, officeData, userData, writeContract, contractAddress]);


  // Effect to initialize SDK and get context
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing Mini App...');
        console.log('SDK available:', !!sdk);
        
        if (!sdk) {
          console.error('SDK not available - using development fallback');
          // Development fallback - use a test FID
          setFid(466111); // Your FID for testing
          setIsLoading(false);
          return;
        }

        // Call sdk.actions.ready() to initialize the Mini App
        console.log('Calling sdk.actions.ready()...');
        const context = await sdk.actions.ready();
        console.log('SDK ready, full context:', context);
        
        // Try different ways to get user FID from context
        let userFid = null;
        if (context?.user?.fid) {
          userFid = context.user.fid;
          console.log('Got FID from context.user.fid:', userFid);
        } else if (context?.fid) {
          userFid = context.fid;
          console.log('Got FID from context.fid:', userFid);
        } else if (context?.userData?.fid) {
          userFid = context.userData.fid;
          console.log('Got FID from context.userData.fid:', userFid);
        }
        
        if (userFid) {
          setFid(userFid);
          setIsLoading(false);
        } else {
          console.log('No FID in ready() context, trying sdk.context...');
          // Fallback: try to get context separately
          try {
            const userContext = await sdk.context;
            console.log('SDK context object:', userContext);
            if (userContext?.user?.fid) {
              setFid(userContext.user.fid);
              setIsLoading(false);
            } else {
              console.log('No context available, using development fallback');
              // Development fallback
              setFid(466111);
              setIsLoading(false);
            }
          } catch (contextError) {
            console.error('Failed to get SDK context:', contextError);
            console.log('Using development fallback FID');
            setFid(466111);
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Failed to initialize SDK:', error);
        console.log('Using development fallback due to SDK error');
        setFid(466111);
        setIsLoading(false);
      }
    };

    // Add a small delay to ensure SDK is fully loaded
    const timer = setTimeout(initializeApp, 100);
    return () => clearTimeout(timer);
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
    setOfficeData(null);
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
        if (!data.office) throw new Error("Missing Office analysis.");
        setUserData({ username: data.username, pfp_url: data.pfp_url, display_name: data.display_name });
        setOfficeData(data.office);
        setIsLoading(false); 
      })
      .catch(err => {
        console.error("Error fetching analysis data:", err); // Keep error
        setError(err.message || "Failed to fetch analysis data.");
        setIsLoading(false); 
      });
  }, [fid]);

  const handleShareClick = useCallback(async () => {
    if (!officeData || !fid || !userData) {
      // console.error('Missing data for sharing:', { officeData, fid, userData });
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
          character: officeData.primaryCharacter,
          displayName: userData.display_name || userData.username || `FID ${fid}`,
          pfpUrl: userData.pfp_url || '',
          fid: fid,
          analysisText: officeData.summary ? officeData.summary.split('.')[0]?.trim() + '.' : '',
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

      const castText = `I am now a temp at Dunder Mifflin!

HR said my mentor is ${officeData.primaryCharacter}..

All I did was take a quiz & I got hired 🤷‍♂️`;
      
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
      // Mark as shared after successful share attempt
      setHasShared(true);
      setTimeout(() => setShareStatus(''), 5000); 
    }
  }, [officeData, userData, fid]);

  const handleMintClick = useCallback(async () => {
    console.log('🚀 Starting mint process with Wagmi...');
    
    if (!officeData || !fid || !userData) {
      setMintStatus('Error: Missing data');
      setTimeout(() => setMintStatus(''), 3000);
      return;
    }

    // Check if user has shared (viral mechanic requirement)
    if (!hasShared) {
      setMintStatus('Please share your result first to unlock minting! 📤');
      setTimeout(() => setMintStatus(''), 5000);
      return;
    }

    if (!contractAddress) {
      setMintStatus('⚠️ Contract not deployed yet!');
      setTimeout(() => setMintStatus(''), 5000);
      return;
    }

    // Check if wallet is connected
    if (!isConnected || !address) {
      setMintStatus('❌ Wallet not connected. Please refresh and try again.');
      setTimeout(() => setMintStatus(''), 5000);
      return;
    }

    // Ensure we're on Base network
    if (chain?.id !== base.id) {
      setMintStatus('🔄 Switching to Base network...');
      try {
        await switchChain({ chainId: base.id });
      } catch (switchError) {
        console.error('Network switch failed:', switchError);
        setMintStatus('❌ Failed to switch to Base network. Please switch manually.');
        setTimeout(() => setMintStatus(''), 5000);
        return;
      }
    }

    // Check if user has already minted
    if (hasMintedData) {
      setMintStatus('You already have a Dunder Mifflin ID! 🎉');
      setTimeout(() => setMintStatus(''), 5000);
      return;
    }

    // Check USDC balance
    const minBalance = BigInt(MINT_PRICE);
    if (!usdcBalance || usdcBalance < minBalance) {
      setMintStatus('❌ Insufficient USDC balance. You need $1 USDC to mint.');
      setTimeout(() => setMintStatus(''), 8000);
      return;
    }

    try {
      setMintStatus('💰 Preparing mint data...');

      const character = officeData.primaryCharacter;
      const displayName = userData.display_name || userData.username || `FID ${fid}`;
      const analysisText = officeData.summary ? officeData.summary.split('.')[0]?.trim() + '.' : '';

      // Generate metadata URL
      const shareResponse = await fetch('/api/create-share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character,
          displayName,
          pfpUrl: userData.pfp_url || '',
          fid,
          analysisText,
        }),
      });

      if (!shareResponse.ok) {
        throw new Error('Failed to generate metadata for minting');
      }

      const { generatedMetadataR2Url } = await shareResponse.json();
      if (!generatedMetadataR2Url) {
        throw new Error('Failed to generate metadata URL');
      }

      console.log('✅ Metadata generated:', generatedMetadataR2Url);

      // Store mint data for use after approval (if needed)
      const mintParams = {
        character,
        displayName,
        analysisText,
        fid,
        metadataUrl: generatedMetadataR2Url
      };

      // Check USDC allowance and approve if needed
      const allowanceAmount = usdcAllowance || BigInt(0);
      if (allowanceAmount < minBalance) {
        console.log('🔄 USDC approval needed, storing mint data for after approval...');
        setMintData(mintParams); // Store for later use
        setMintStatus('📝 Approving USDC spending...');
        
        approveUSDC({
          address: USDC_ADDRESS,
          abi: USDC_CONTRACT_ABI,
          functionName: 'approve',
          args: [contractAddress, minBalance],
        });

        // The approval success will automatically trigger the mint
        return;
      }

      // USDC already approved, mint directly
      console.log('✅ USDC already approved, minting directly...');
      setMintStep('minting');
      setMintStatus('🎯 Minting your Dunder Mifflin ID...');
      
      writeContract({
        address: contractAddress,
        abi: NFT_CONTRACT_ABI,
        functionName: 'mintEmployeeID',
        args: [character, displayName, analysisText, BigInt(fid), generatedMetadataR2Url],
      });

    } catch (error) {
      console.error('❌ Mint preparation failed:', error);
      setMintStatus(`❌ Mint failed: ${error.message.substring(0, 50)}...`);
      setMintStep('idle');
      setMintData(null);
      setTimeout(() => setMintStatus(''), 8000);
    }
  }, [
    officeData, userData, fid, hasShared, contractAddress, isConnected, address,
    chain, hasMintedData, usdcBalance, usdcAllowance, switchChain, approveUSDC, writeContract
  ]);

  const primaryCharacter = officeData?.primaryCharacter;
  const characterStyle = getCharacterStyle(primaryCharacter);
  const otherCharacters = officeData?.counterArguments ? Object.keys(officeData.counterArguments) : [];

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
            <span className={styles.userNameHighlight}>{userData?.display_name || userData?.username || `FID ${fid}` }</span>, you're hired!
        </h1>
      </div>

      {/* Share Button - MOVED HERE */} 
      {officeData && (
        <button
            className={styles.shareButton}
            onClick={handleShareClick}
            disabled={!!shareStatus && shareStatus !== 'Share my ID'}
            aria-label="Share my ID"
        >
            <Image
              src="/farcaster-arch-icon.png"
              alt="Farcaster arch icon"
              width={20}
              height={20}
              className={styles.farcasterArch}
              unoptimized={true}
            /> 
            {shareStatus || 'Share my ID'}
        </button>
       )}

      {/* Mint Dunder Mifflin ID Button - MOVED UP */}
      {officeData && (
        <div className={styles.mintContainer}>
          <button 
            className={`${styles.mintButton} ${!hasShared ? styles.mintButtonDisabled : ''}`}
            onClick={handleMintClick}
            disabled={!hasShared || (!!mintStatus && !mintStatus.includes('🎉'))}
            aria-label={hasShared ? "Mint Dunder Mifflin ID" : "Share first to unlock minting"}
            title={hasShared ? "Click to mint your NFT!" : "Share your result first to unlock minting"}
          >
            {mintStatus ? (
              <span>{mintStatus}</span>
                             ) : hasShared ? (
                   <span>Mint Your Dunder Mifflin ID</span>
                 ) : (
                   <span>Share To Unlock Minting</span>
                 )}
               </button>
        </div>
      )}

      {/* Results Container */} 
      {officeData && (
          <div className={styles.resultsContainer}>
            <h2 className={styles.resultTitle}>
              Your mentor is...<br/>
              <span className={`${styles.highlight} ${characterStyle}`}>{primaryCharacter}!</span>
            </h2>
            
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
            
            {officeData.summary && <p className={styles.summary}>{officeData.summary}</p>}
            
            {/* Details Grid - REORDERED */} 
            <div className={styles.detailsGrid}>
                {/* Key Traits & Evidence (Now First) */} 
                {officeData.evidence && officeData.evidence.length > 0 && (
                  <div className={styles.evidenceContainer}>
                    <h3>Reasons You Get Along</h3>
                    {officeData.evidence.map((item, index) => (
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
                {officeData.characterPercentages && (
                  <div className={styles.percentagesContainer}>
                    <h3>Mentor Compatibility</h3>
                    <ul>
                      {Object.entries(officeData.characterPercentages)
                        .sort(([charA, a], [charB, b]) => {
                          // Primary character always first
                          if (charA === primaryCharacter) return -1;
                          if (charB === primaryCharacter) return 1;
                          // Then sort others by percentage (highest first)
                          return b - a;
                        })
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
                    <h3>Why Not Other Mentors?</h3>
                    {otherCharacters.map(character => (
                        <div key={character} className={styles.whyNotItem}>
                            <div className={styles.whyNotHeader}>
                                <Image
                                    src={getCharacterImage(character)}
                                    alt={`${character} character portrait`}
                                    width={60}
                                    height={60}
                                    className={`${styles.whyNotCharacterImage} ${getCharacterStyle(character)}`}
                                    unoptimized={true}
                                />
                                <strong className={getCharacterStyle(character)}>{character}:</strong>
                            </div>
                            <p className={styles.whyNotExplanation}>{officeData.counterArguments[character]}</p>
                        </div>
                    ))}
                </div>
             )}
             

          </div>
      )}
    </div>
  );
} 