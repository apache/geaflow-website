import { Col, Row } from 'antd';
import { INTRO } from '@site/src/constants';
import { SubTitle } from '@site/src/components/SubTitle';
import FadeInSection from '@site/src/components/FadeInSection';
import styles from './index.module.css';
import { translate } from '@docusaurus/Translate';

const Introduction = () => {
  return (
    <div
      className={styles.container}
    >
      <div>
        <SubTitle title={translate({ message: 'product.intro' })} />
        <FadeInSection>
          <div className={styles.desc}>{translate({ message: 'product.intro.desc' })}</div></FadeInSection>
        <FadeInSection threshold={0.3}>
          <div className={styles.featureContainer}>
            <Row gutter={[24, 24]} className={styles.contentBoxAll}>
              {INTRO.list?.map((item) => (
                <Col span={24} md={8} key={item.key}>
                  <div className={styles.contentBox}>
                    <div className={styles.intlText}>
                      <div className={styles.title}>{translate({ message: item?.title })}</div>
                      <div className={styles.descContent}>{translate({ message: item?.desc })} </div>
                    </div>
                    {item?.img ? (
                      <img src={item?.img} className={styles.featureImage} />
                    ) : null}
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </FadeInSection>
      </div>
    </div>
  );
};

export default Introduction;
