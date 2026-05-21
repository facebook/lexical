import {FC, ReactNode} from 'react';
import Head from 'next/head';
interface PageProps {
  children: ReactNode;
}

const Layout: FC<PageProps> = ({children}) => (
  <div className={'wrapper'}>
    <div className={'root'}>
      <Head>
        <title>PM vs. Lexical</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {children}
    </div>
  </div>
);

export default Layout;
