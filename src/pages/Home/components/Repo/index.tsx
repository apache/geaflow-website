import { SubTitle } from '@site/src/components/SubTitle'
import styles from './index.module.css'
import { translate } from '@docusaurus/Translate'
import { useState } from 'react'
import { LANGUAGE_ICON_COLOR, REPOS, REPOS_DATA } from '@site/src/constants'

const Repo = () => {
    const [repos, setRepos] = useState(REPOS_DATA)

    // TODO: The domain name has a security policy and cannot be requested at the moment.
    // const getRepoAll = async () => {
    //     try {
    //         const serviceALl = REPOS.map((repo) => {
    //             return getRepoServices(repo)
    //         })
    //         const res = await Promise.all(serviceALl)
    //         setRepos(res || [])
    //     } catch (error) {
    //         console.error(error)
    //     }
    // }

    // useEffect(() => {
    //     getRepoAll()
    // }, [])

    const onLink = (repo: string, path: string) => {
        window.open(`https://github.com/TuGraph-family/${repo}/${path}`)
    }

    return repos?.length ? <div className={styles.repo}>
        <SubTitle
            title={translate({ message: 'product.repo' })}
        />
        <div className={styles.repoCardList}>
            {
                repos.map((item) => <div key={item.repo} className={styles.repoCard}>
                    <div className={styles.repoCardTitle}>
                        <img src='https://mdn.alipayobjects.com/huamei_tu4rvn/afts/img/A*IZUlSI-VOkUAAAAAJSAAAAgAep_eAQ/original' alt="logo" />
                        <a href={`https://github.com/TuGraph-family/${item.repo}`} target='_blank'  >{item.repo}</a>
                        <div className={styles.repoCardTitleTag}>{item.visibility?.replace(/[a-z]/, (val: string) => val.toLocaleUpperCase())}</div>
                    </div>
                    <div className={styles.repoCardDescription}>
                        {item.description}
                    </div>
                    <div className={styles.repoCardInfo}>
                        {item?.language ? <div><div className={styles.circle} style={{ backgroundColor: LANGUAGE_ICON_COLOR?.[item.language] || '#dea584' }} />{item.language}</div> : null}
                        {item?.stargazers_count ? <div className={styles.herf} onClick={() => onLink(item.repo, 'stargazers')}><img src="https://mdn.alipayobjects.com/huamei_tu4rvn/afts/img/A*X0eERqyLMw0AAAAAKrAAAAgAep_eAQ/original" alt="" /> {item.stargazers_count}</div> : null}
                        {item?.forks_count ? <div className={styles.herf} onClick={() => onLink(item.repo, 'forks')}><img src="https://mdn.alipayobjects.com/huamei_tu4rvn/afts/img/A*D4RdTpfrhLMAAAAAI-AAAAgAep_eAQ/original" alt="" /> {item.forks_count}</div> : null}
                    </div>
                </div>)
            }
        </div>
    </div> : null
}

export default Repo