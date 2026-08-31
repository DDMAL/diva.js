export type ImageRegion = {
    x: number;
    y : number;
    width : number;
    height : number;
};

export type ResolvedTileSource = string|Record<string, unknown>;

export type TileSourceDescriptor = {
    sourceId: string;
    url : string;
    isStatic : boolean;
};

export const iiifImageRegionUrl = (imageService: string|null, region: ImageRegion): string|null => {
    const {x, y, width, height} = region;
    if (!imageService || ![x, y, width, height].every(Number.isFinite))
    {
        return null;
    }

    const left = Math.floor(x);
    const top = Math.floor(y);
    const right = Math.ceil(x + width);
    const bottom = Math.ceil(y + height);
    if (left < 0 || top < 0 || right <= left || bottom <= top)
    {
        return null;
    }

    try
    {
        const service = new URL(imageService);
        if (!service.pathname.endsWith("/info.json"))
        {
            return null;
        }
        service.search = "";
        service.hash = "";
        service.pathname = service.pathname.slice(0, -"/info.json".length);
        return `${service.toString().replace(/\/$/, "")}/${left},${top},${right - left},${bottom - top}/!320,320/0/default.jpg`;
    }
    catch (_error)
    {
        return null;
    }
};

export const staticImageTileSource = (url: string, credentialed = false, useNonCors = false): ResolvedTileSource => ({
    type : "image",
    url,
    crossOriginPolicy : useNonCors ? false : (credentialed ? "use-credentials" : "Anonymous"),
    ajaxWithCredentials : credentialed,
    loadTilesWithAjax : !useNonCors,
    buildPyramid : !useNonCors,
    useCanvas : !useNonCors
});

export const nonCorsStaticTileSource = (tileSource: ResolvedTileSource): ResolvedTileSource => {
    const source = typeof tileSource === "object" && tileSource !== null
                       ? tileSource
                       : {type : "image", url : tileSource};
    return {
        ...source,
        type : "image",
        crossOriginPolicy : false,
        ajaxWithCredentials : false,
        loadTilesWithAjax : false,
        buildPyramid : false,
        useCanvas : false
    };
};
