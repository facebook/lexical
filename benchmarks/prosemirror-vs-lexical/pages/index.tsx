import Header from '../components/Header';
import Layout from '../components/Layout';
import {NextPage} from 'next';

const Home: NextPage = () => (
  <>
    <Layout>
      <Header />
      <div className={'welcome'}>Hello and happy testing!</div>
    </Layout>
  </>
);
export default Home;
