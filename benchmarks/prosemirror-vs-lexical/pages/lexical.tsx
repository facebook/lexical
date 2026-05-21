import {Inter} from '@next/font/google';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import Layout from '../components/Layout';
import {NextPage} from 'next';

const LexicalEditor = dynamic(() => import('../components/LexicalEditor'), {
  ssr: false,
});

const inter = Inter({subsets: ['latin']});

const Home: NextPage = () => (
  <>
    <Layout>
      <Header />
      <LexicalEditor />
    </Layout>
  </>
);
export default Home;
