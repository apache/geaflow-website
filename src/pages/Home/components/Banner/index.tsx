import { Button } from 'antd';
import styles from './index.module.css';
import FadeInSection from "@site/src/components/FadeInSection";
import { translate } from '@docusaurus/Translate';
import { useHistory } from '@docusaurus/router';
import { historyPushLinkAt } from '@site/src/util/link';

const Banner = () => {
  const history = useHistory()
  let background =
    'url(/img/BG.png)';

  const bannerDetail = {
    title: 'Apache GeaFlow',
    desc: translate({ message: 'product_analytics.description' }),
    btn: (
      <FadeInSection transition={{ duration: 1, delay: 0.3 }}>
        <div className={styles.buttonContainer}>
          <div
            onClick={() => {
              window.open('https://github.com/apache/geaflow');
            }}
            className={styles.github}
          >
            GitHub
          </div>
          <div
            className={styles.started}
            onClick={() => {
              history.push(historyPushLinkAt('docs/quick_start/quick_start'));
            }}
          >
            Get Started
          </div>
        </div>
      </FadeInSection>
    ),
  }

  return (
    <div
      className={styles.bannerBox}
      style={{
        backgroundImage: background,
      }}
    >
      <div className={styles.banner}>
        <div className={styles.databaseTitleSection}>
          <FadeInSection>
            <span className={styles.titleText}>{bannerDetail.title}</span>
          </FadeInSection>
          <FadeInSection>
            <span className={styles.descriptionText}>{bannerDetail.desc}</span>
          </FadeInSection>
          {bannerDetail?.btn}
        </div>
        <img src='/img/icon.png' alt="" className={styles.icon} />
      </div>
    </div>
  );
};

export default Banner;
