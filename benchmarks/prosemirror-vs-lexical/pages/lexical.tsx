import dynamic from 'next/dynamic';
import Header from '../components/Header';
import Layout from '../components/Layout';
import {NextPage} from 'next';

const LexicalEditor = dynamic(() => import('../components/LexicalEditor'), {
  ssr: false,
});

const Home: NextPage = () => (
  <>
    <Layout>
      <Header />
      <LexicalEditor />
    </Layout>
  </>
);
export default Home;
