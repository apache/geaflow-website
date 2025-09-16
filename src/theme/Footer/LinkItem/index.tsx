import React, { type ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import isInternalUrl from '@docusaurus/isInternalUrl';
import IconExternalLink from '@theme/Icon/ExternalLink';
import type { Props } from '@theme/Footer/LinkItem';
import { getStorage } from '@site/src/util/localStorage';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';


function updateLinkTo(path?: string) {
  if (!path || !ExecutionEnvironment.canUseDOM) return path
  const { pathname } = window.location
  const [navpath, route] = path?.replace('\/', ',')?.split(',')
  const current = getStorage('VERSION') || '0.0.2'
  const versiton = current === '0.0.2' || navpath !== 'docs' ? '' : `/${current}`
  let navLang = `/${navpath}${versiton}`

  if (['docs', 'community'].includes(navpath) && pathname.includes('/zh-CN')) {
    navLang = `${navLang}/zh`
  }
  return `${navLang}/${route}`
}

export default function FooterLinkItem({ item }: Props): ReactNode {
  const { to, href, label, prependBaseUrlToHref, className, ...props } = item;
  const toUrl = useBaseUrl(updateLinkTo(to));
  const normalizedHref = useBaseUrl(href, { forcePrependBaseUrl: true });

  return (
    <Link
      className={clsx('footer__link-item', className)}
      {...(href
        ? {
          href: prependBaseUrlToHref ? normalizedHref : href,
        }
        : {
          to: toUrl,
        })}
      {...props}>
      {label}
      {href && !isInternalUrl(href) && <IconExternalLink />}
    </Link>
  );
}
