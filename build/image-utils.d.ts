export type ImageRegion = {
    x: number;
    y: number;
    width: number;
    height: number;
};
export type ResolvedTileSource = string | Record<string, unknown>;
export type TileSourceDescriptor = {
    sourceId: string;
    url: string;
    isStatic: boolean;
};
export declare const iiifImageRegionUrl: (imageService: string | null, region: ImageRegion) => string | null;
export declare const staticImageTileSource: (url: string, credentialed?: boolean, useNonCors?: boolean) => ResolvedTileSource;
export declare const nonCorsStaticTileSource: (tileSource: ResolvedTileSource) => ResolvedTileSource;
