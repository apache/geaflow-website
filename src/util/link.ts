import { VERSION_CURRENT } from "@site/src/constants";
import { getStorage } from "@site/src/util/localStorage";

export const historyPushLinkAt = (
    path: string
) => {
    const basePath = ''
    const { pathname } = window.location
    const lang = pathname.includes('/zh-CN') ? '/zh-CN' : ''

    const [navpath, route] = path?.replace('\/', ',')?.split(',')
    const current = getStorage('VERSION') || VERSION_CURRENT
    const versiton = current === VERSION_CURRENT || navpath !== 'docs' ? '' : `/${current}`
    let navLang = `/${navpath}${versiton}`

    if (['docs', 'community'].includes(navpath) && pathname.includes('/zh-CN')) {
        navLang = `${navLang}/zh`
    }

    return `${basePath}${lang}${navLang + '/' + route}`
};