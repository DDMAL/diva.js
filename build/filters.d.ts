/**
 * The basic framework for this is from:
 *
 * @author Antoine Vandecreme <antoine.vandecreme@nist.gov>
 *     https://github.com/usnistgov/OpenSeadragonFiltering/blob/master/openseadragon-filtering.js
 *
 *  Additional filters and modifications to the processing methods are from
 * CamanJS:
 *      https://github.com/meltingice/CamanJS/blob/master/src/lib/filters.coffee
 *
 *
 */
export type FilterProcessor = (context: CanvasRenderingContext2D, callback: () => void) => void;
type PixelTransformInPlace = (r: number, g: number, b: number, a: number, out: number[]) => void;
type ResettableItem = {
    reset: () => void;
};
export type FilterDefinition = {
    items?: ResettableItem | ResettableItem[];
    processors: FilterProcessor | FilterProcessor[];
};
export type FilterOptions = {
    loadMode?: string;
    filters?: FilterDefinition | FilterDefinition[];
};
export declare function setFilterOptions(viewer: any, options: FilterOptions): void;
export declare const Filters: {
    _scratch: Uint8ClampedArray | null;
    _scratchCanvas: HTMLCanvasElement | null;
    _scratchContext: CanvasRenderingContext2D | null;
    _ensureScratch: (length: number) => Uint8ClampedArray;
    _ensureScratchContext: (width: number, height: number) => CanvasRenderingContext2D;
    _applyPixelTransformInPlace: (context: CanvasRenderingContext2D, transform: PixelTransformInPlace) => void;
    THRESHOLDING: (threshold: number) => FilterProcessor;
    SATURATION: (adjustment: number) => FilterProcessor;
    VIBRANCE: (adjustment: number) => FilterProcessor;
    HUE: (adjustment: number) => FilterProcessor;
    BRIGHTNESS: (adjustment: number) => FilterProcessor;
    CC_RED: (adjustment: number) => FilterProcessor;
    CC_GREEN: (adjustment: number) => FilterProcessor;
    CC_BLUE: (adjustment: number) => FilterProcessor;
    CONTRAST: (adjustment: number) => FilterProcessor;
    GAMMA: (adjustment: number) => FilterProcessor;
    GREYSCALE: () => FilterProcessor;
    INVERT: () => FilterProcessor;
    MORPHOLOGICAL_OPERATION: (kernelSize: number, comparator: (a: number, b: number) => number) => FilterProcessor;
    CONVOLUTION: (kernel: number[]) => FilterProcessor;
    COLORMAP: (cmap: number[][], ctr: number) => FilterProcessor;
    COLORMAP_PRESET: (preset: string) => number[][] | null;
    CONVOLUTION_PRESET: (preset: string) => number[] | null;
    PSEUDOCOLOR: (mode: string, red?: number, green?: number, blue?: number) => FilterProcessor;
    COLOR_REPLACE: (source: string, target: string, tolerance?: number, blend?: number, preserveLum?: boolean) => FilterProcessor;
    ALT_RED_GAMMA: (amount: number) => FilterProcessor;
    ALT_GREEN_GAMMA: (amount: number) => FilterProcessor;
    ALT_BLUE_GAMMA: (amount: number) => FilterProcessor;
    ALT_RED_SIGMOID: (amount: number) => FilterProcessor;
    ALT_GREEN_SIGMOID: (amount: number) => FilterProcessor;
    ALT_BLUE_SIGMOID: (amount: number) => FilterProcessor;
    ALT_RED_HUE: (amount: number, window?: number) => FilterProcessor;
    ALT_GREEN_HUE: (amount: number, window?: number) => FilterProcessor;
    ALT_BLUE_HUE: (amount: number, window?: number) => FilterProcessor;
    ALT_RED_VIBRANCE: (amount: number) => FilterProcessor;
    ALT_GREEN_VIBRANCE: (amount: number) => FilterProcessor;
    ALT_BLUE_VIBRANCE: (amount: number) => FilterProcessor;
    GLOBAL_PCA_COLOR: (mode: string, hueDegrees?: number) => FilterProcessor;
    BACKGROUND_NORMALIZE: (strength?: number) => FilterProcessor;
    UNSHARP_MASK: (amount?: number) => FilterProcessor;
    ADAPTIVE_THRESHOLD: (windowSize?: number, offset?: number) => FilterProcessor;
};
export {};
