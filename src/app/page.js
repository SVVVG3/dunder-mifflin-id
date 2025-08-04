import Image from "next/image";
import styles from "./page.module.css";
import { HomeComponent } from '@/components/HomeComponent';

export async function generateMetadata({ searchParams }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const r2PublicUrl = process.env.R2_PUBLIC_URL;
  const R2_FOLDER_PREFIX = 'what-x-are-you/'; // Define the folder prefix

  let dynamicImageUrl = `${appUrl}/office-embed.png?v=5`; // Default to custom embed image
  
  const shareImageFileNameOnly = (await searchParams).image; 

  if (shareImageFileNameOnly && r2PublicUrl) {
    const base = r2PublicUrl.endsWith('/') ? r2PublicUrl : `${r2PublicUrl}/`;
    // Prepend the folder prefix to the filename from the query parameter
    const fullImageIdentifier = `${R2_FOLDER_PREFIX}${shareImageFileNameOnly}`;
    dynamicImageUrl = `${base}${fullImageIdentifier}`;
    console.log(`Using dynamic image for frame: ${dynamicImageUrl}`);
  } else if (shareImageFileNameOnly && !r2PublicUrl) {
    console.warn("R2_PUBLIC_URL is not set, cannot use dynamic image for fc:frame.");
  }

  return {
    title: 'Dunder Mifflin ID',
    description: 'Discover which character from The Office you most resemble based on your personality!',
    other: {
      'fc:frame': JSON.stringify({
        version: "1",
        name: "Dunder Mifflin ID", // This will fix the "Vercel" title issue
        imageUrl: dynamicImageUrl,
        button: {
          title: "Where's my ID?",
          action: {
            type: "launch_frame",
            name: "Dunder Mifflin ID",
            url: appUrl,
            splashImageUrl: `${appUrl}/office-icon.png?v=5`,
            splashBackgroundColor: "#012f85"
          }
        }
      })
    },
    openGraph: {
      title: 'Which Office Character Are You? - Check out my result!',
      description: 'I found out which Office character I am most like!',
      images: [
        {
          url: dynamicImageUrl, // OG image also uses the dynamic image
          width: 600,
          height: 400,
          alt: 'My result image',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Which Office Character Are You? - Check out my result!',
      description: 'I found out which Office character I am most like!',
      images: [dynamicImageUrl], // Twitter image also uses the dynamic image
    },
  };
}

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <HomeComponent />
      </main>
    </div>
  );
}
