import dynamic from 'next/dynamic';
import Header from '../components/Header';
import Layout from '../components/Layout';
import {NextPage} from 'next';

const PMEditor = dynamic(() => import('../components/PMEditor'), {
  ssr: false,
});

const Home: NextPage = () => (
  <>
    <Layout>
      <Header />
      <PMEditor />
    </Layout>
  </>
);
export default Home;
