import React, { type ReactNode } from 'react';
import clsx from 'clsx';
import {
  useThemeConfig,
  ErrorCauseBoundary,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import {
  splitNavbarItems,
  useNavbarMobileSidebar,
} from '@docusaurus/theme-common/internal';
import NavbarItem, { type Props as NavbarItemConfig } from '@theme/NavbarItem';
import SearchBar from '@theme/SearchBar';
import NavbarMobileSidebarToggle from '@theme/Navbar/MobileSidebar/Toggle';
import NavbarLogo from '@theme/Navbar/Logo';
import NavbarSearch from '@theme/Navbar/Search';

import styles from './styles.module.css';
import { useLocation } from '@docusaurus/router';
import { VERSION_CURRENT, VERSIONS } from '@site/src/constants';
import { getStorage, setStorage } from '@site/src/util/localStorage';

function useNavbarItems() {
  // TODO temporary casting until ThemeConfig type is improved
  return useThemeConfig().navbar.items as NavbarItemConfig[];
}

function NavbarItems({ items }: { items: NavbarItemConfig[] }): ReactNode {
  return (
    <>
      {items.map((item, i) => (
        <ErrorCauseBoundary
          key={i}
          onError={(error) =>
            new Error(
              `A theme navbar item failed to render.
Please double-check the following navbar item (themeConfig.navbar.items) of your Docusaurus config:
${JSON.stringify(item, null, 2)}`,
              { cause: error },
            )
          }>
          <NavbarItem {...item} />
        </ErrorCauseBoundary>
      ))}
    </>
  );
}

function NavbarContentLayout({
  left,
  right,
  center,
}: {
  left: ReactNode;
  right: ReactNode;
  center?: ReactNode;
}) {
  return (
    <div className="navbar__inner">
      <div
        className={clsx(
          ThemeClassNames.layout.navbar.containerLeft,
          'navbar__items',
        )}>
        {left}
      </div>
      <div
        className={clsx(
          ThemeClassNames.layout.navbar.containerRight,
          'navbar__items navbar__items--right',
        )}>
        {right}
      </div>
      <div className={styles.navbarCenter}>
        {center}
      </div>
    </div>
  );
}

export default function NavbarContent(): ReactNode {
  const mobileSidebar = useNavbarMobileSidebar();
  const { pathname } = useLocation()

  const getVersion = () => {
    return getStorage('VERSION') || VERSIONS[0]
  }

  const items = useNavbarItems();
  const [leftItems, rightItems] = splitNavbarItems(items);


  const searchBarItem = items.find((item) => item.type === 'search');

  const centerItems = leftItems.map((item => {
    if (item?.id) {
      const lang = pathname.includes('zh-CN') ? '/zh' : ''
      const version = getVersion() === VERSION_CURRENT || item?.id !== 'docs' ? '' : `/${getVersion()}`
      return {
        ...item,
        to: `${item.id}${version}${lang}${item.to}`
      }
    }
    return item
  }))

  const onChangeVersion = (v) => {
    setStorage('VERSION', v)
    if (pathname.includes('/docs/')) {
      const base = pathname.split('/docs/')[0]
      const version = v === VERSION_CURRENT ? '' : `/${v}`
      const lang = pathname.includes('zh-CN') ? '/zh' : ''
      window.location.href = `${base}/docs${version + lang}/guide`
      return
    }
    // 刷新页面
    window.location.reload()
  }


  return (
    <NavbarContentLayout
      left={
        // TODO stop hardcoding items?
        <>
          {!mobileSidebar.disabled && <NavbarMobileSidebarToggle />}
          <NavbarLogo />
          {/* <NavbarItems items={leftItems} /> */}
        </>
      }
      right={
        // TODO stop hardcoding items?
        // Ask the user to add the respective navbar items => more flexible
        <>
          {
            VERSIONS.length > 1 && (
              <div className={styles.versionSelect}>
                <div className={styles.versions}>
                  {VERSIONS.map(item => {
                    return (
                      <div className={
                        clsx(styles.selectItem, item === getVersion() && styles.selectItemActive)
                      } key={item} onClick={() => {
                        if (item !== getVersion()) {
                          onChangeVersion(item)
                        }
                      }}>
                        {item}
                      </div>
                    )
                  })}

                </div>
                <div className={styles.current}>
                  {getVersion()}
                </div>
              </div>
            )
          }


          <NavbarItems items={rightItems} />
          {!searchBarItem && (
            <NavbarSearch>
              <SearchBar />
            </NavbarSearch>
          )}
        </>
      }
      center={
        <> <NavbarItems items={centerItems} /></>
      }
    />
  );
}
