import Header from '../components/Header';
import Basic from '../components/Basic';
import Layout from '../components/Layout';
import {NextPage} from 'next';

const Home: NextPage = () => (
  <>
    <Layout>
      <Header />
      <Basic />
    </Layout>
  </>
);
export default Home;
