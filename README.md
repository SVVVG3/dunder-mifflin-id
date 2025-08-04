# 🏢 Dunder Mifflin Employee ID - Farcaster Mini App

A viral Farcaster Mini App that analyzes your personality using AI and mints you a personalized **Dunder Mifflin Employee ID** NFT on Base. Users discover which Office character they most resemble and can mint their official employee badge!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/dunder-mifflin-id)

## ✨ Features

### 🤖 AI-Powered Personality Analysis
- Uses **Google Gemini** to analyze Farcaster user profiles and recent casts
- Matches personality traits to 10 iconic Office characters
- Provides detailed analysis with evidence and reasoning
- Anti-bias system prevents defaulting to popular characters like Jim Halpert

### 🎨 Dynamic ID Card Generation  
- Generates personalized Dunder Mifflin employee ID cards
- Includes user's profile picture, character match, and analysis
- Professional ID card design with company branding
- Powered by **Vercel OG** for dynamic image generation

### 💰 NFT Minting with USDC
- **$1 USDC** minting on Base network
- Deployed smart contract: `0x647a7E29991Df1192C0fF4264c18CD7001c05787`
- Prevents duplicate mints per wallet
- Full metadata stored on-chain and IPFS-compatible

### 🔗 Viral "Share to Claim" Mechanic
- Users must share their results to unlock minting
- Drives organic growth through social sharing
- Custom share images with personalized ID cards

### 🛠️ Built with Best Practices
- **Farcaster Mini Apps SDK** with official wagmi connector
- **Wagmi + Viem** for Web3 interactions
- **Foundry** for smart contract development
- **Cloudflare R2** for image storage
- **TypeScript-ready** architecture

## 📦 Tech Stack

- **Frontend**: Next.js 15, React 19, CSS Modules
- **Web3**: Wagmi, Viem, Farcaster Mini Apps SDK
- **AI**: Google Gemini 2.0 Flash
- **Storage**: Cloudflare R2
- **Blockchain**: Base (Ethereum L2)
- **Smart Contracts**: Solidity, Foundry
- **Deployment**: Vercel

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Farcaster account
- Base wallet with USDC for testing

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/dunder-mifflin-id.git
cd dunder-mifflin-id
npm install
```

### 2. Environment Setup
Create `.env` with the following variables:

```bash
# AI & User Data
GEMINI_API_KEY=your_gemini_api_key
NEYNAR_API_KEY=your_neynar_api_key

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x647a7E29991Df1192C0fF4264c18CD7001c05787

# Smart Contract Deployment (Optional)
PRIVATE_KEY=your_wallet_private_key
BASE_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

### 3. Development
```bash
# Start development server
npm run dev

# Test with ngrok for Farcaster
npx ngrok http 3000
# Update NEXT_PUBLIC_APP_URL in .env with ngrok URL
```

### 4. Smart Contract Development
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Compile contracts
forge build

# Run tests
forge test

# Deploy to Base (optional - contract already deployed)
forge script script/DeployDunderMifflin.s.sol:DeployDunderMifflin --rpc-url base --broadcast --verify
```

## 🎭 Office Characters

The app analyzes personality traits and matches users to one of 10 characters:

- **Jim Halpert**: Witty, sarcastic, prankster
- **Pam Beesly**: Artistic, kind, supportive  
- **Dwight Schrute**: Intense, loyal, eccentric
- **Michael Scott**: Well-meaning leader, inappropriate humor
- **Angela Martin**: Organized, judgmental, perfectionist
- **Stanley Hudson**: No-nonsense, dry humor, boundaries
- **Kelly Kapoor**: Pop culture obsessed, dramatic
- **Oscar Martinez**: Intellectual, fact-checker, sophisticated
- **Darryl Philbin**: Street smart, musical, ambitious
- **Kevin Malone**: Simple pleasures, food-focused, childlike

## 🏗️ Architecture

### Smart Contract (`DunderMifflinID.sol`)
- **ERC-721** NFT with on-chain metadata
- **USDC payment** integration ($1 per mint)
- **Duplicate prevention** (one mint per address)
- **Character analytics** tracking
- **Emergency functions** for admin

### Frontend Components
- `HomeComponent`: Main app interface and minting logic
- `WagmiProvider`: Web3 wallet connection setup
- `FrameInit`: Farcaster Mini App initialization

### API Routes
- `/api/user`: Fetches user data and runs AI analysis
- `/api/create-share-link`: Generates shareable results
- `/api/og`: Dynamic Open Graph image generation
- `/api/splash`: Mini App splash screen

### Image Generation
- Dynamic ID cards with user data
- Professional Dunder Mifflin branding
- Character headshots and company assets
- Optimized for social sharing

## 📱 Farcaster Integration

### Mini App Configuration
The app includes proper Farcaster Mini App setup:
- `farcaster.json` manifest
- Account association proofs
- Proper meta tags for embed rendering
- Share intent integration

### Testing in Farcaster
1. Deploy to a public URL (Vercel, ngrok, etc.)
2. Update `NEXT_PUBLIC_APP_URL` in environment
3. Test in Warpcast or other Farcaster clients
4. Share functionality creates viral growth

## 🔧 Deployment

### Vercel Deployment
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Environment Variables for Production
Make sure to set all required environment variables in your Vercel dashboard:
- All API keys (Gemini, Neynar, R2, Basescan)
- Contract address and blockchain config
- Set `NEXT_PUBLIC_APP_URL` to your production domain

### Custom Domain (Optional)
- Add your domain in Vercel settings
- Update `farcaster.json` manifest with production URL
- Test Mini App functionality on production

## 🧪 Testing

### Unit Tests
```bash
# Smart contract tests
forge test -vvv

# Run specific test
forge test --match-test testMintEmployeeID
```

### Integration Testing
1. Test AI analysis with various Farcaster profiles
2. Verify image generation and sharing
3. Test minting flow end-to-end
4. Validate wallet connections and network switching

## 🐛 Troubleshooting

### Common Issues

**"Wallet showing malicious token warning"**
- This is normal for new contracts - click "Continue Anyway"
- Warning disappears as contract gains recognition

**"CALL_EXCEPTION errors"**
- Ensure you're using the wagmi connector, not direct ethers.js
- Check that Base network is properly configured

**"Image generation failing"**
- Verify R2 credentials and bucket permissions
- Check that all character images exist in `/public/characters/`

**"Farcaster embed not showing"**
- Ensure `farcaster.json` has correct production URLs
- Check meta tags are properly set
- Allow 5-10 minutes for Farcaster cache to update


## 🙏 Acknowledgments

- **The Office** for endless entertainment and memorable characters
- **@jc4p** for the starter template
- **Farcaster** for the decentralized social protocol
- **Base** for affordable blockchain transactions
- **OpenZeppelin** for secure smart contract primitives
- **Vercel** for seamless deployment

## 📞 Support

For support or questions:
- Reach out on Farcaster: @svvvg3.eth

---

**Built with ❤️ for the Farcaster community. That's what she said. - Michael Scott**