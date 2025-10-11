import { SubTitle } from '@site/src/components/SubTitle';
import styles from './index.module.css';
import { translate } from '@docusaurus/Translate';

const Architecture = () => {

  return (
    <div className={styles.ecoWrapper}>
      <SubTitle
        title={translate({ message: 'product.ecosystem' })}
        style={{ margin: '56px 0 32px' }}
      />
      <div className={styles.maxContainer}>
        <img
          className={styles.ecosystemImage}
          src={'/img/structure.png'}
          alt="ecosystem"
        />
      </div>
    </div>
  );
};

export default Architecture;
