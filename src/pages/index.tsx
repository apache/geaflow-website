import type { ReactNode } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Home from './Home';
import { translate } from '@docusaurus/Translate';
export default function Index(): ReactNode {

  return (
    <Layout
      title='GeaFlow'
      description={translate({ message: 'product_analytics.description' })}>
      <Home />
    </Layout>
  );
}
