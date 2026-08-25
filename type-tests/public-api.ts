import Diva, {type DivaLayoutMode, type DivaPage, type DivaPageSelector, type DivaPageTarget, type DivaRegion, type DivaSidebarPanel, type DivaStaticImageCorsPolicy} from "diva.js";

const viewer = new Diva("viewer", {objectData : "https://example.org/manifest"});
const initialSelector: DivaPageSelector = {
    by : "canvasId",
    value : "https://example.org/canvas/3"
};
const initialTarget: DivaPageTarget = initialSelector;
const initialPanel: DivaSidebarPanel = "contents";
const staticImageCorsPolicy: DivaStaticImageCorsPolicy = "fallback";
const wideViewer = new Diva("wide-viewer", {
    objectData : "https://example.org/manifest",
    sidebarPanel : initialPanel,
    sidebarWidth : 420,
    initialPage : initialTarget,
    staticImageCorsPolicy
});
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
    const found: DivaPage|undefined = viewer.findPage({by : "label", value : "Folio 3"});
    const moved: boolean = await viewer.goToPage(initialSelector);
    await viewer.setLayoutMode(layout);
    await viewer.zoomToRegion(pages[0].index, region);
    void found;
    void moved;
});

viewer.addEventListener("pagechange", (event) => {
    const index: number = event.detail.pageIndex;
    console.log(index);
});

window.Diva = Diva;
void wideViewer;
