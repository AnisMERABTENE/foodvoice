import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        {/* Configuration globale mobile-first */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#f97316" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FOODVOICE" />
        
        {/* PWA et icônes */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Optimisations performances */}
        <link rel="preconnect" href="https://api.openai.com" />
        <link rel="dns-prefetch" href="https://api.openai.com" />
        
        {/* Meta tags SEO */}
        <meta name="description" content="Menu interactif avec assistant vocal intelligent - FOODVOICE" />
        <meta name="keywords" content="restaurant, menu, vocal, assistant, ia, commande" />
        <meta name="author" content="FOODVOICE" />
        
        {/* Open Graph pour partage social */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="FOODVOICE" />
        <meta property="og:image" content="/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="/og-image.jpg" />
      </Head>
      
      <Component {...pageProps} />
    </>
  );
}