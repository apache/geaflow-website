export async function getRepoServices(
    repo: string
) {
    try {
        const res = await fetch('https://api.github.com/repos/TuGraph-family/' + repo);
        const {
            description,
            stargazers_count,
            forks_count,
            language,
            visibility
        } = await res.json();
        return {
            description,
            stargazers_count,
            forks_count,
            language,
            visibility,
            repo,
        };
    } catch (error) {
        console.error(error);
    }
}