import '../styles/globals.css';
import '../styles/pmeditor.css';
import '../styles/lexicaleditor.css';

import type {AppProps} from 'next/app';
import {Inter} from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'auto',
  weight: ['400', '700'],
});
export default function App({Component, pageProps}: AppProps) {
  return (
    <main className={inter.className}>
      <Component {...pageProps} />
    </main>
  );
}
