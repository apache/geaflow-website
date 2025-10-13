import Architecture from "@site/src/pages/Home/components/Architecture";
import Banner from "@site/src/pages/Home/components/Banner";
import Introduction from "@site/src/pages/Home/components/Introduction";
import Repo from "@site/src/pages/Home/components/Repo";

const Home = () => {
    return <div>
        <Banner />
        <Introduction />
        <Architecture />
        {/* <Repo /> */}
    </div>
}

export default Home;