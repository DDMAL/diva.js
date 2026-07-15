import Diva, {type DivaLayoutMode, type DivaPage, type DivaRegion} from "diva.js";

const viewer = new Diva("viewer", {objectData : "https://example.org/manifest"});
const layout: DivaLayoutMode = viewer.getLayoutMode();
const pages: readonly DivaPage[] = viewer.getPages();
const region: DivaRegion = {
    x : 0,
    y : 0,
    width : 100,
    height : 100
};

void viewer.ready.then(async () => {
    await viewer.goToPage(0);
    await viewer.setLayoutMode(layout);
    await viewer.zoomToRegion(pages[0].index, region);
});

viewer.addEventListener("pagechange", (event) => {
    const index: number = event.detail.pageIndex;
    console.log(index);
});

window.Diva = Diva;
