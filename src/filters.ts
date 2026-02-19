/*
 * This software was developed at the National Institute of Standards and
 * Technology by employees of the Federal Government in the course of
 * their official duties. Pursuant to title 17 Section 105 of the United
 * States Code this software is not subject to copyright protection and is
 * in the public domain. This software is an experimental system. NIST assumes
 * no responsibility whatsoever for its use by other parties, and makes no
 * guarantees, expressed or implied, about its quality, reliability, or
 * any other characteristic. We would appreciate acknowledgement if the
 * software is used.
 */

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
type ResettableItem = {reset: () => void};

export type FilterDefinition = {
    items?: ResettableItem | ResettableItem[]; processors : FilterProcessor | FilterProcessor[];
};

export type FilterOptions = {
    loadMode?: string;
    filters?: FilterDefinition | FilterDefinition[];
};

type FilterPluginInstance = {
    viewer: any; filters : FilterDefinition[]; filterIncrement : number;
};

export function setFilterOptions(viewer: any, options: FilterOptions): void
{
    if (!viewer)
    {
        throw new Error("A viewer must be specified.");
    }
    if (!viewer.filterPluginInstance)
    {
        viewer.filterPluginInstance = createFilterPlugin(viewer, options || {});
    }
    else
    {
        setOptions(viewer.filterPluginInstance, options || {});
    }
}

function readImageDataFromContext(context: CanvasRenderingContext2D): ImageData
{
    const width = context.canvas.width;
    const height = context.canvas.height;
    const scratchContext = Filters._ensureScratchContext(width, height);
    scratchContext.clearRect(0, 0, width, height);
    scratchContext.drawImage(context.canvas, 0, 0);
    return scratchContext.getImageData(0, 0, width, height);
}

function createFilterPlugin(viewer: any, options: FilterOptions): FilterPluginInstance
{
    const instance: FilterPluginInstance = {viewer, filters : [], filterIncrement : 0};

    const self = instance;
    self.viewer.addHandler("tile-loaded", tileLoadedHandler);
    self.viewer.addHandler("tile-drawing", tileDrawingHandler);

    setOptions(self, options);

    function tileLoadedHandler(event: any): void
    {
        const processors = getFiltersProcessors(self, event.tiledImage);
        if (processors.length === 0)
        {
            return;
        }
        const tile = event.tile;
        const image = event.data || event.image;
        if (image !== null && image !== undefined)
        {
            const canvas = window.document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext("2d", {willReadFrequently : true}) as CanvasRenderingContext2D;
            context.drawImage(image, 0, 0);
            tile._renderedContext = context;
            const callback = event.getCompletionCallback();
            applyFilters(context, processors, callback);
            tile._filterIncrement = self.filterIncrement;
        }
    }

    function applyFilters(context: CanvasRenderingContext2D, filtersProcessors: FilterProcessor[],
                          callback?: () => void): void
    {
        if (callback)
        {
            const currentIncrement = self.filterIncrement;
            const callbacks: Array<() => void> = [];
            for (let i = 0; i < filtersProcessors.length - 1; i += 1)
            {
                callbacks[i] = () => {
                    if (self.filterIncrement !== currentIncrement)
                    {
                        return;
                    }
                    filtersProcessors[i + 1](context, callbacks[i + 1]);
                };
            }
            callbacks[filtersProcessors.length - 1] = () => {
                if (self.filterIncrement !== currentIncrement)
                {
                    return;
                }
                callback();
            };
            filtersProcessors[0](context, callbacks[0]);
        }
        else
        {
            for (let i = 0; i < filtersProcessors.length; i += 1)
            {
                filtersProcessors[i](context, () => {});
            }
        }
    }

    function tileDrawingHandler(event: any): void
    {
        const tile = event.tile;
        const rendered = event.rendered;
        if (rendered._filterIncrement === self.filterIncrement)
        {
            return;
        }
        const processors = getFiltersProcessors(self, event.tiledImage);
        if (processors.length === 0)
        {
            if (rendered._originalImageData)
            {
                rendered.putImageData(rendered._originalImageData, 0, 0);
                delete rendered._originalImageData;
            }
            rendered._filterIncrement = self.filterIncrement;
            return;
        }

        if (rendered._originalImageData)
        {
            rendered.putImageData(rendered._originalImageData, 0, 0);
        }
        else
        {
            rendered._originalImageData = readImageDataFromContext(rendered);
        }

        if (tile._renderedContext)
        {
            if (tile._filterIncrement === self.filterIncrement)
            {
                const imgData = readImageDataFromContext(tile._renderedContext);
                rendered.putImageData(imgData, 0, 0);
                delete tile._renderedContext;
                delete tile._filterIncrement;
                rendered._filterIncrement = self.filterIncrement;
                return;
            }
            delete tile._renderedContext;
            delete tile._filterIncrement;
        }
        applyFilters(rendered, processors);
        rendered._filterIncrement = self.filterIncrement;
    }

    return instance;
}

function setOptions(instance: FilterPluginInstance, options: FilterOptions): void
{
    const filters = options.filters;
    instance.filters = !filters ? [] : Array.isArray(filters) ? filters : [ filters ];
    for (let i = 0; i < instance.filters.length; i += 1)
    {
        const filter = instance.filters[i];
        if (!filter.processors)
        {
            throw new Error("Filter processors must be specified.");
        }
        filter.processors = Array.isArray(filter.processors) ? filter.processors : [ filter.processors ];
    }
    instance.filterIncrement += 1;

    if (options.loadMode === "sync")
    {
        instance.viewer.forceRedraw();
    }
    else
    {
        let itemsToReset: any[] = [];
        for (let i = 0; i < instance.filters.length; i += 1)
        {
            const filter = instance.filters[i];
            if (!filter.items)
            {
                itemsToReset = getAllItems(instance.viewer.world);
                break;
            }
            if (Array.isArray(filter.items))
            {
                for (let j = 0; j < filter.items.length; j += 1)
                {
                    addItemToReset(filter.items[j], itemsToReset);
                }
            }
            else
            {
                addItemToReset(filter.items, itemsToReset);
            }
        }
        for (let i = 0; i < itemsToReset.length; i += 1)
        {
            itemsToReset[i].reset();
        }
    }
}

function addItemToReset(item: any, itemsToReset: any[]): void
{
    if (itemsToReset.indexOf(item) >= 0)
    {
        throw new Error("An item can not have filters assigned multiple times.");
    }
    itemsToReset.push(item);
}

function getAllItems(world: any): any[]
{
    const result = [];
    for (let i = 0; i < world.getItemCount(); i += 1)
    {
        result.push(world.getItemAt(i));
    }
    return result;
}

function getFiltersProcessors(instance: any, item: any): FilterProcessor[]
{
    if (instance.filters.length === 0)
    {
        return [];
    }

    let globalProcessors: FilterProcessor[]|null = null;
    for (let i = 0; i < instance.filters.length; i += 1)
    {
        const filter = instance.filters[i];
        if (!filter.items)
        {
            globalProcessors = filter.processors;
        }
        else if (filter.items === item || Array.isArray(filter.items) && filter.items.indexOf(item) >= 0)
        {
            return filter.processors;
        }
    }
    return globalProcessors ? globalProcessors : [];
}

const sampleStops = (stops: Array<{stop : number; color : number[]}>, t: number): number[] => {
    let lower = stops[0];
    let upper = stops[stops.length - 1];
    for (let i = 0; i < stops.length; i += 1)
    {
        if (stops[i].stop >= t)
        {
            upper = stops[i];
            lower = stops[Math.max(0, i - 1)];
            break;
        }
    }
    if (upper.stop === lower.stop)
    {
        return upper.color.slice();
    }
    const localT = (t - lower.stop) / (upper.stop - lower.stop);
    const r = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * localT);
    const g = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * localT);
    const b = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * localT);
    return [ r, g, b ];
};

const buildColormap = (stops: Array<{stop : number; color : number[]}>): number[][] => {
    const map: number[][] = [];
    for (let i = 0; i < 256; i += 1)
    {
        const t = i / 255;
        map[i] = sampleStops(stops, t);
    }
    return map;
};

const colormapCache = new Map<string, number[][]>();

const getColormap = (preset: string): number[][]|null => {
    const cached = colormapCache.get(preset);
    if (cached)
    {
        return cached;
    }
    let result: number[][]|null = null;
    switch (preset)
    {
    case "hot":
        result = buildColormap([
            {stop : 0, color : [ 0, 0, 0 ]}, {stop : 0.4, color : [ 255, 0, 0 ]}, {stop : 0.7, color : [ 255, 255, 0 ]},
            {stop : 1, color : [ 255, 255, 255 ]}
        ]);
        break;
    case "cool":
        result = buildColormap([
            {stop : 0, color : [ 0, 0, 0 ]}, {stop : 0.5, color : [ 0, 128, 255 ]},
            {stop : 1, color : [ 255, 255, 255 ]}
        ]);
        break;
    case "gray":
    case "":
        result = buildColormap([ {stop : 0, color : [ 0, 0, 0 ]}, {stop : 1, color : [ 255, 255, 255 ]} ]);
        break;
    default:
        return null;
    }
    colormapCache.set(preset, result);
    return result;
};

const clampByte = (value: number): number => {
    if (value < 0)
    {
        return 0;
    }
    if (value > 255)
    {
        return 255;
    }
    return value;
};

const clamp01 = (value: number): number => {
    if (value < 0)
    {
        return 0;
    }
    if (value > 1)
    {
        return 1;
    }
    return value;
};

const hexToRgb = (hex: string): [ number, number, number ]|null => {
    if (!hex)
    {
        return null;
    }
    let cleaned = hex.trim();
    if (cleaned.startsWith("#"))
    {
        cleaned = cleaned.slice(1);
    }
    if (cleaned.length === 3)
    {
        cleaned = cleaned.split("").map((ch) => ch + ch).join("");
    }
    if (cleaned.length !== 6)
    {
        return null;
    }
    const value = parseInt(cleaned, 16);
    if (Number.isNaN(value))
    {
        return null;
    }
    return [ (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff ];
};

const boxBlur = (input: Uint8ClampedArray, width: number, height: number, radius: number,
                 grayscale?: boolean): Uint8ClampedArray => {
    const size = width * height;
    const output = new Uint8ClampedArray(input.length);
    if (!radius)
    {
        output.set(input);
        return output;
    }
    const windowSize = radius * 2 + 1;
    const invWindowSize = 1 / windowSize;
    if (grayscale)
    {
        const temp = new Uint8ClampedArray(size);
        for (let y = 0; y < height; y += 1)
        {
            let sum = 0;
            for (let x = -radius; x <= radius; x += 1)
            {
                const cx = Math.min(width - 1, Math.max(0, x));
                sum += input[y * width + cx];
            }
            for (let x = 0; x < width; x += 1)
            {
                temp[y * width + x] = (sum * invWindowSize + 0.5) | 0;
                const removeX = Math.max(0, x - radius);
                const addX = Math.min(width - 1, x + radius + 1);
                sum += input[y * width + addX] - input[y * width + removeX];
            }
        }
        for (let x = 0; x < width; x += 1)
        {
            let sum = 0;
            for (let y = -radius; y <= radius; y += 1)
            {
                const cy = Math.min(height - 1, Math.max(0, y));
                sum += temp[cy * width + x];
            }
            for (let y = 0; y < height; y += 1)
            {
                output[y * width + x] = (sum * invWindowSize + 0.5) | 0;
                const removeY = Math.max(0, y - radius);
                const addY = Math.min(height - 1, y + radius + 1);
                sum += temp[addY * width + x] - temp[removeY * width + x];
            }
        }
        return output;
    }
    const temp = new Uint8ClampedArray(input.length);
    for (let y = 0; y < height; y += 1)
    {
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        for (let x = -radius; x <= radius; x += 1)
        {
            const cx = Math.min(width - 1, Math.max(0, x));
            const idx = (y * width + cx) * 4;
            sumR += input[idx];
            sumG += input[idx + 1];
            sumB += input[idx + 2];
        }
        for (let x = 0; x < width; x += 1)
        {
            const idx = (y * width + x) * 4;
            temp[idx] = (sumR * invWindowSize + 0.5) | 0;
            temp[idx + 1] = (sumG * invWindowSize + 0.5) | 0;
            temp[idx + 2] = (sumB * invWindowSize + 0.5) | 0;
            temp[idx + 3] = input[idx + 3];
            const removeX = Math.max(0, x - radius);
            const addX = Math.min(width - 1, x + radius + 1);
            const removeIdx = (y * width + removeX) * 4;
            const addIdx = (y * width + addX) * 4;
            sumR += input[addIdx] - input[removeIdx];
            sumG += input[addIdx + 1] - input[removeIdx + 1];
            sumB += input[addIdx + 2] - input[removeIdx + 2];
        }
    }
    for (let x = 0; x < width; x += 1)
    {
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        for (let y = -radius; y <= radius; y += 1)
        {
            const cy = Math.min(height - 1, Math.max(0, y));
            const idx = (cy * width + x) * 4;
            sumR += temp[idx];
            sumG += temp[idx + 1];
            sumB += temp[idx + 2];
        }
        for (let y = 0; y < height; y += 1)
        {
            const idx = (y * width + x) * 4;
            output[idx] = (sumR * invWindowSize + 0.5) | 0;
            output[idx + 1] = (sumG * invWindowSize + 0.5) | 0;
            output[idx + 2] = (sumB * invWindowSize + 0.5) | 0;
            output[idx + 3] = temp[idx + 3];
            const removeY = Math.max(0, y - radius);
            const addY = Math.min(height - 1, y + radius + 1);
            const removeIdx = (removeY * width + x) * 4;
            const addIdx = (addY * width + x) * 4;
            sumR += temp[addIdx] - temp[removeIdx];
            sumG += temp[addIdx + 1] - temp[removeIdx + 1];
            sumB += temp[addIdx + 2] - temp[removeIdx + 2];
        }
    }
    return output;
};

function applyPixelTransformInPlace(transform: PixelTransformInPlace): FilterProcessor
{
    return function(context: CanvasRenderingContext2D, callback: () => void): void {
        Filters._applyPixelTransformInPlace(context, transform);
        callback();
    };
}

function buildLuminance(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray
{
    const length = width * height;
    const lum = Filters._ensureScratch(length);
    for (let i = 0, p = 0; p < length; i += 4, p += 1)
    {
        lum[p] = (77 * data[i] + 150 * data[i + 1] + 29 * data[i + 2]) >> 8;
    }
    return lum;
}

function withImageData(context: CanvasRenderingContext2D, handler: (imgData: ImageData) => boolean): void
{
    const width = context.canvas.width;
    const height = context.canvas.height;
    const scratchContext = Filters._ensureScratchContext(width, height);
    scratchContext.clearRect(0, 0, width, height);
    scratchContext.drawImage(context.canvas, 0, 0);
    const imgData = scratchContext.getImageData(0, 0, width, height);
    const didChange = handler(imgData);
    if (didChange)
    {
        scratchContext.putImageData(imgData, 0, 0);
        context.clearRect(0, 0, width, height);
        context.drawImage(Filters._scratchCanvas as HTMLCanvasElement, 0, 0);
    }
}

function convolvePixels(originalPixels: Uint8ClampedArray, outputPixels: Uint8ClampedArray, width: number,
                        height: number, kernel: number[], kernelSize: number, kernelHalfSize: number): void
{
    const rowStride = width * 4;

    // Process interior pixels (no bounds checking needed)
    const interiorStartY = kernelHalfSize;
    const interiorEndY = height - kernelHalfSize;
    const interiorStartX = kernelHalfSize;
    const interiorEndX = width - kernelHalfSize;

    for (let y = interiorStartY; y < interiorEndY; y += 1)
    {
        const rowOffset = y * rowStride;
        for (let x = interiorStartX; x < interiorEndX; x += 1)
        {
            let r = 0;
            let g = 0;
            let b = 0;
            for (let j = 0; j < kernelSize; j += 1)
            {
                const kernelRowOffset = (y + j - kernelHalfSize) * rowStride;
                for (let i = 0; i < kernelSize; i += 1)
                {
                    const offset = kernelRowOffset + (x + i - kernelHalfSize) * 4;
                    const weight = kernel[j * kernelSize + i];
                    r += originalPixels[offset] * weight;
                    g += originalPixels[offset + 1] * weight;
                    b += originalPixels[offset + 2] * weight;
                }
            }
            const outOffset = rowOffset + x * 4;
            outputPixels[outOffset] = r;
            outputPixels[outOffset + 1] = g;
            outputPixels[outOffset + 2] = b;
        }
    }

    // Process edge pixels (with bounds checking)
    for (let y = 0; y < height; y += 1)
    {
        const rowOffset = y * rowStride;
        const isInteriorY = y >= interiorStartY && y < interiorEndY;
        for (let x = 0; x < width; x += 1)
        {
            // Skip interior pixels (already processed)
            if (isInteriorY && x >= interiorStartX && x < interiorEndX)
            {
                continue;
            }
            let r = 0;
            let g = 0;
            let b = 0;
            for (let j = 0; j < kernelSize; j += 1)
            {
                const pixelY = y + j - kernelHalfSize;
                if (pixelY < 0 || pixelY >= height)
                {
                    continue;
                }
                const kernelRowOffset = pixelY * rowStride;
                for (let i = 0; i < kernelSize; i += 1)
                {
                    const pixelX = x + i - kernelHalfSize;
                    if (pixelX >= 0 && pixelX < width)
                    {
                        const offset = kernelRowOffset + pixelX * 4;
                        const weight = kernel[j * kernelSize + i];
                        r += originalPixels[offset] * weight;
                        g += originalPixels[offset + 1] * weight;
                        b += originalPixels[offset + 2] * weight;
                    }
                }
            }
            const outOffset = rowOffset + x * 4;
            outputPixels[outOffset] = r;
            outputPixels[outOffset + 1] = g;
            outputPixels[outOffset + 2] = b;
        }
    }
}

function morphPixels(originalPixels: Uint8ClampedArray, outputPixels: Uint8ClampedArray, width: number, height: number,
                     kernelSize: number, kernelHalfSize: number, comparator: (a: number, b: number) => number): void
{
    const rowStride = width * 4;

    // Process interior pixels (no bounds checking needed)
    const interiorStartY = kernelHalfSize;
    const interiorEndY = height - kernelHalfSize;
    const interiorStartX = kernelHalfSize;
    const interiorEndX = width - kernelHalfSize;

    for (let y = interiorStartY; y < interiorEndY; y += 1)
    {
        const rowOffset = y * rowStride;
        for (let x = interiorStartX; x < interiorEndX; x += 1)
        {
            const centerOffset = rowOffset + x * 4;
            let r = originalPixels[centerOffset];
            let g = originalPixels[centerOffset + 1];
            let b = originalPixels[centerOffset + 2];
            for (let j = 0; j < kernelSize; j += 1)
            {
                const kernelRowOffset = (y + j - kernelHalfSize) * rowStride;
                for (let i = 0; i < kernelSize; i += 1)
                {
                    const offset = kernelRowOffset + (x + i - kernelHalfSize) * 4;
                    r = comparator(originalPixels[offset], r);
                    g = comparator(originalPixels[offset + 1], g);
                    b = comparator(originalPixels[offset + 2], b);
                }
            }
            outputPixels[centerOffset] = r;
            outputPixels[centerOffset + 1] = g;
            outputPixels[centerOffset + 2] = b;
        }
    }

    // Process edge pixels (with bounds checking)
    for (let y = 0; y < height; y += 1)
    {
        const rowOffset = y * rowStride;
        const isInteriorY = y >= interiorStartY && y < interiorEndY;
        for (let x = 0; x < width; x += 1)
        {
            // Skip interior pixels (already processed)
            if (isInteriorY && x >= interiorStartX && x < interiorEndX)
            {
                continue;
            }
            const centerOffset = rowOffset + x * 4;
            let r = originalPixels[centerOffset];
            let g = originalPixels[centerOffset + 1];
            let b = originalPixels[centerOffset + 2];
            for (let j = 0; j < kernelSize; j += 1)
            {
                const pixelY = y + j - kernelHalfSize;
                if (pixelY < 0 || pixelY >= height)
                {
                    continue;
                }
                const kernelRowOffset = pixelY * rowStride;
                for (let i = 0; i < kernelSize; i += 1)
                {
                    const pixelX = x + i - kernelHalfSize;
                    if (pixelX >= 0 && pixelX < width)
                    {
                        const offset = kernelRowOffset + pixelX * 4;
                        r = comparator(originalPixels[offset], r);
                        g = comparator(originalPixels[offset + 1], g);
                        b = comparator(originalPixels[offset + 2], b);
                    }
                }
            }
            outputPixels[centerOffset] = r;
            outputPixels[centerOffset + 1] = g;
            outputPixels[centerOffset + 2] = b;
        }
    }
}

function dot3(a: number[], b: number[]): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

function normalize3(v: number[]): number[]
{
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [ v[0] / len, v[1] / len, v[2] / len ];
}

function scaleMat3(m: number[][], s: number): number[][]
{
    return [
        [ m[0][0] * s, m[0][1] * s, m[0][2] * s ], [ m[1][0] * s, m[1][1] * s, m[1][2] * s ],
        [ m[2][0] * s, m[2][1] * s, m[2][2] * s ]
    ];
}

function outer3(v: number[]): number[][]
{
    return [
        [ v[0] * v[0], v[0] * v[1], v[0] * v[2] ], [ v[1] * v[0], v[1] * v[1], v[1] * v[2] ],
        [ v[2] * v[0], v[2] * v[1], v[2] * v[2] ]
    ];
}

function matVec3(m: number[][], v: number[]): number[]
{
    return [
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
    ];
}

function matSub(a: number[][], b: number[][]): number[][]
{
    return [
        [ a[0][0] - b[0][0], a[0][1] - b[0][1], a[0][2] - b[0][2] ],
        [ a[1][0] - b[1][0], a[1][1] - b[1][1], a[1][2] - b[1][2] ],
        [ a[2][0] - b[2][0], a[2][1] - b[2][1], a[2][2] - b[2][2] ]
    ];
}

function powerIterEigen(m: number[][], iterations: number): {vector: number[]; value : number}
{
    let v = normalize3([ 1, 1, 1 ]);
    for (let i = 0; i < iterations; i += 1)
    {
        v = normalize3(matVec3(m, v));
    }
    const mv = matVec3(m, v);
    const value = dot3(v, mv);
    return {vector : v, value};
}

type PcaBasis = {
    mean: number[];
    vectors: number[][];
    values: number[];
};

type RunningPcaStats = {
    count: number;
    mean: number[];
    m2: number[][];
};

function computePcaBasisFromCov(mean: number[], cov: number[][]): PcaBasis
{
    const eig1 = powerIterEigen(cov, 12);
    const deflated = matSub(cov, scaleMat3(outer3(eig1.vector), eig1.value));
    const eig2 = powerIterEigen(deflated, 12);
    const eig3 = normalize3([
        eig1.vector[1] * eig2.vector[2] - eig1.vector[2] * eig2.vector[1],
        eig1.vector[2] * eig2.vector[0] - eig1.vector[0] * eig2.vector[2],
        eig1.vector[0] * eig2.vector[1] - eig1.vector[1] * eig2.vector[0]
    ]);
    const eig3Value = dot3(eig3, matVec3(cov, eig3));

    return {
        mean,
        vectors : [ eig1.vector, eig2.vector, eig3 ],
        values : [ Math.max(0, eig1.value), Math.max(0, eig2.value), Math.max(0, eig3Value) ]
    };
}

function computePcaVectors(data: Uint8ClampedArray): PcaBasis
{
    const count = data.length / 4;
    let meanR = 0;
    let meanG = 0;
    let meanB = 0;
    for (let i = 0; i < data.length; i += 4)
    {
        meanR += data[i];
        meanG += data[i + 1];
        meanB += data[i + 2];
    }
    meanR /= count;
    meanG /= count;
    meanB /= count;

    let c00 = 0, c01 = 0, c02 = 0;
    let c11 = 0, c12 = 0;
    let c22 = 0;
    for (let i = 0; i < data.length; i += 4)
    {
        const r = data[i] - meanR;
        const g = data[i + 1] - meanG;
        const b = data[i + 2] - meanB;
        c00 += r * r;
        c01 += r * g;
        c02 += r * b;
        c11 += g * g;
        c12 += g * b;
        c22 += b * b;
    }
    const inv = 1 / Math.max(1, count - 1);
    const cov = [
        [ c00 * inv, c01 * inv, c02 * inv ], [ c01 * inv, c11 * inv, c12 * inv ], [ c02 * inv, c12 * inv, c22 * inv ]
    ];

    return computePcaBasisFromCov([ meanR, meanG, meanB ], cov);
}

function applyPcaColor(imgData: ImageData, mode: string, hueDegrees: number = 0): void
{
    const data = imgData.data;
    const pca = computePcaVectors(data);
    const mean = pca.mean;
    const v1 = pca.vectors[0];
    const v2 = pca.vectors[1];
    const v3 = pca.vectors[2];

    let min1 = Infinity, max1 = -Infinity;
    let min2 = Infinity, max2 = -Infinity;
    let min3 = Infinity, max3 = -Infinity;

    for (let i = 0; i < data.length; i += 4)
    {
        const r = data[i] - mean[0];
        const g = data[i + 1] - mean[1];
        const b = data[i + 2] - mean[2];
        const c1 = r * v1[0] + g * v1[1] + b * v1[2];
        const c2 = r * v2[0] + g * v2[1] + b * v2[2];
        const c3 = r * v3[0] + g * v3[1] + b * v3[2];
        if (c1 < min1)
            min1 = c1;
        if (c1 > max1)
            max1 = c1;
        if (c2 < min2)
            min2 = c2;
        if (c2 > max2)
            max2 = c2;
        if (c3 < min3)
            min3 = c3;
        if (c3 > max3)
            max3 = c3;
    }

    const range1 = max1 - min1 || 1;
    const range2 = max2 - min2 || 1;
    const range3 = max3 - min3 || 1;

    const toByte = (v: number, min: number, range: number) => clampByte(((v - min) / range) * 255);

    for (let i = 0; i < data.length; i += 4)
    {
        const r = data[i] - mean[0];
        const g = data[i + 1] - mean[1];
        const b = data[i + 2] - mean[2];
        const c1 = r * v1[0] + g * v1[1] + b * v1[2];
        const c2 = r * v2[0] + g * v2[1] + b * v2[2];
        const c3 = r * v3[0] + g * v3[1] + b * v3[2];

        if (mode === "pca1")
        {
            const v = toByte(c1, min1, range1);
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
        }
        else if (mode === "pca2")
        {
            const v = toByte(c2, min2, range2);
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
        }
        else if (mode === "pca3")
        {
            const v = toByte(c3, min3, range3);
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
        }
        else
        {
            data[i] = toByte(c1, min1, range1);
            data[i + 1] = toByte(c2, min2, range2);
            data[i + 2] = toByte(c3, min3, range3);
        }
    }

    applyHueRotationInPlace(data, hueDegrees);
}

type HueRotationMatrix = {
    m00: number; m01 : number; m02 : number;
    m10: number; m11 : number; m12 : number;
    m20: number; m21 : number; m22 : number;
};

function buildHueRotationMatrix(degrees: number): HueRotationMatrix
{
    const angle = (degrees * Math.PI) / 180;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const oneThird = 1 / 3;
    const sqrt1_3 = Math.sqrt(oneThird);

    return {
        m00 : cosA + (1 - cosA) * oneThird,
        m01 : oneThird * (1 - cosA) - sqrt1_3 * sinA,
        m02 : oneThird * (1 - cosA) + sqrt1_3 * sinA,
        m10 : oneThird * (1 - cosA) + sqrt1_3 * sinA,
        m11 : cosA + (1 - cosA) * oneThird,
        m12 : oneThird * (1 - cosA) - sqrt1_3 * sinA,
        m20 : oneThird * (1 - cosA) - sqrt1_3 * sinA,
        m21 : oneThird * (1 - cosA) + sqrt1_3 * sinA,
        m22 : cosA + (1 - cosA) * oneThird
    };
}

function applyHueRotationInPlace(data: Uint8ClampedArray, degrees: number): void
{
    if (degrees === 0)
    {
        return;
    }
    const matrix = buildHueRotationMatrix(degrees);

    for (let i = 0; i < data.length; i += 4)
    {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = clampByte(matrix.m00 * r + matrix.m01 * g + matrix.m02 * b);
        data[i + 1] = clampByte(matrix.m10 * r + matrix.m11 * g + matrix.m12 * b);
        data[i + 2] = clampByte(matrix.m20 * r + matrix.m21 * g + matrix.m22 * b);
    }
}

function createRunningPcaStats(): RunningPcaStats
{
    return {
        count : 0,
        mean : [ 0, 0, 0 ],
        m2 : [
            [ 0, 0, 0 ],
            [ 0, 0, 0 ],
            [ 0, 0, 0 ]
        ]
    };
}

function updateRunningPcaStats(stats: RunningPcaStats, data: Uint8ClampedArray): void
{
    const sampleStride = 16;
    for (let i = 0; i < data.length; i += 4 * sampleStride)
    {
        const sample = [ data[i], data[i + 1], data[i + 2] ];
        const nextCount = stats.count + 1;
        const delta = [
            sample[0] - stats.mean[0],
            sample[1] - stats.mean[1],
            sample[2] - stats.mean[2]
        ];
        const nextMean = [
            stats.mean[0] + delta[0] / nextCount,
            stats.mean[1] + delta[1] / nextCount,
            stats.mean[2] + delta[2] / nextCount
        ];
        const delta2 = [
            sample[0] - nextMean[0],
            sample[1] - nextMean[1],
            sample[2] - nextMean[2]
        ];

        stats.m2[0][0] += delta[0] * delta2[0];
        stats.m2[0][1] += delta[0] * delta2[1];
        stats.m2[0][2] += delta[0] * delta2[2];
        stats.m2[1][0] += delta[1] * delta2[0];
        stats.m2[1][1] += delta[1] * delta2[1];
        stats.m2[1][2] += delta[1] * delta2[2];
        stats.m2[2][0] += delta[2] * delta2[0];
        stats.m2[2][1] += delta[2] * delta2[1];
        stats.m2[2][2] += delta[2] * delta2[2];

        stats.count = nextCount;
        stats.mean = nextMean;
    }
}

function basisFromRunningStats(stats: RunningPcaStats): PcaBasis|null
{
    if (stats.count < 2)
    {
        return null;
    }
    const inv = 1 / (stats.count - 1);
    const cov = [
        [ stats.m2[0][0] * inv, stats.m2[0][1] * inv, stats.m2[0][2] * inv ],
        [ stats.m2[1][0] * inv, stats.m2[1][1] * inv, stats.m2[1][2] * inv ],
        [ stats.m2[2][0] * inv, stats.m2[2][1] * inv, stats.m2[2][2] * inv ]
    ];
    return computePcaBasisFromCov(stats.mean, cov);
}

function applyPcaColorWithBasis(imgData: ImageData, mode: string, basis: PcaBasis, hueDegrees: number): void
{
    const data = imgData.data;
    const mean = basis.mean;
    const v1 = basis.vectors[0];
    const v2 = basis.vectors[1];
    const v3 = basis.vectors[2];
    const sigma1 = Math.sqrt(Math.max(1e-6, basis.values[0]));
    const sigma2 = Math.sqrt(Math.max(1e-6, basis.values[1]));
    const sigma3 = Math.sqrt(Math.max(1e-6, basis.values[2]));
    const scale = 3;

    const toByte = (component: number, sigma: number) => clampByte(128 + (component / (scale * sigma)) * 127);

    for (let i = 0; i < data.length; i += 4)
    {
        const r = data[i] - mean[0];
        const g = data[i + 1] - mean[1];
        const b = data[i + 2] - mean[2];
        const c1 = r * v1[0] + g * v1[1] + b * v1[2];
        const c2 = r * v2[0] + g * v2[1] + b * v2[2];
        const c3 = r * v3[0] + g * v3[1] + b * v3[2];

        if (mode === "pca1")
        {
            const v = toByte(c1, sigma1);
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
        }
        else if (mode === "pca2")
        {
            const v = toByte(c2, sigma2);
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
        }
        else if (mode === "pca3")
        {
            const v = toByte(c3, sigma3);
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
        }
        else
        {
            data[i] = toByte(c1, sigma1);
            data[i + 1] = toByte(c2, sigma2);
            data[i + 2] = toByte(c3, sigma3);
        }
    }

    applyHueRotationInPlace(data, hueDegrees);
}

const noopFilter: FilterProcessor = (_context, callback) => { callback(); };

function rgbToHSV(r: number, g: number, b: number): {h: number; s : number; v : number}
{
    const rr = r / 255;
    const gg = g / 255;
    const bb = b / 255;
    const maxValue = Math.max(rr, gg, bb);
    const minValue = Math.min(rr, gg, bb);
    const v = maxValue;
    const d = maxValue - minValue;

    const s = maxValue === 0 ? 0 : d / maxValue;
    let h = 0;
    if (maxValue !== minValue)
    {
        switch (maxValue)
        {
        case rr:
            h = (gg - bb) / d + (gg < bb ? 6 : 0);
            break;
        case gg:
            h = (bb - rr) / d + 2;
            break;
        default:
            h = (rr - gg) / d + 4;
        }
        h /= 6;
    }
    return {h, s, v};
}

function hsvToRGB(h: number, s: number, v: number): {r: number; g : number; b : number}
{
    let r = 0;
    let g = 0;
    let b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6)
    {
    case 0:
        r = v;
        g = t;
        b = p;
        break;
    case 1:
        r = q;
        g = v;
        b = p;
        break;
    case 2:
        r = p;
        g = v;
        b = t;
        break;
    case 3:
        r = p;
        g = q;
        b = v;
        break;
    case 4:
        r = t;
        g = p;
        b = v;
        break;
    default:
        r = v;
        g = p;
        b = q;
    }

    return {r : Math.floor(r * 255), g : Math.floor(g * 255), b : Math.floor(b * 255)};
}

function applyChannelLUT(channel: number, lut: number[]): FilterProcessor
{
    if (channel === 0)
    {
        return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
            out[0] = lut[r];
            out[1] = g;
            out[2] = b;
            out[3] = a;
        });
    }
    if (channel === 1)
    {
        return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
            out[0] = r;
            out[1] = lut[g];
            out[2] = b;
            out[3] = a;
        });
    }
    return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
        out[0] = r;
        out[1] = g;
        out[2] = lut[b];
        out[3] = a;
    });
}

function ccChannel(channel: number, adjustment: number): FilterProcessor
{
    const adj = adjustment / 100;
    const absAdj = Math.abs(adj);
    const transform = (ch: number) => adj > 0 ? ch + (255 - ch) * adj : ch - ch * absAdj;
    if (channel === 0)
    {
        return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
            out[0] = transform(r);
            out[1] = g;
            out[2] = b;
            out[3] = a;
        });
    }
    if (channel === 1)
    {
        return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
            out[0] = r;
            out[1] = transform(g);
            out[2] = b;
            out[3] = a;
        });
    }
    return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
        out[0] = r;
        out[1] = g;
        out[2] = transform(b);
        out[3] = a;
    });
}

function altChannelGamma(channel: number, amount: number): FilterProcessor
{
    const strength = Math.max(0, Math.min(100, amount || 0));
    if (strength === 0)
    {
        return noopFilter;
    }
    const exponent = 1 - (strength / 100) * 0.8;
    const lut: number[] = [];
    for (let i = 0; i < 256; i += 1)
    {
        lut[i] = clampByte(Math.pow(i / 255, exponent) * 255);
    }
    return applyChannelLUT(channel, lut);
}

function altChannelSigmoid(channel: number, amount: number): FilterProcessor
{
    const strength = Math.max(0, Math.min(100, amount || 0)) / 100;
    if (strength === 0)
    {
        return noopFilter;
    }
    const a = 8;
    const lut: number[] = [];
    for (let i = 0; i < 256; i += 1)
    {
        const sig = 1 / (1 + Math.exp(-a * (i / 255 - 0.5)));
        const target = sig * 255;
        lut[i] = clampByte(i + (target - i) * strength);
    }
    return applyChannelLUT(channel, lut);
}

function altChannelHue(hueTarget: number, amount: number, window?: number): FilterProcessor
{
    const strength = Math.max(-100, Math.min(100, amount || 0)) / 100;
    if (strength === 0)
    {
        return noopFilter;
    }
    const windowSize = Math.max(0.02, Math.min(0.3, (window === undefined ? 8 : window) / 100));
    return applyPixelTransformInPlace((r: number, g: number, b: number, aPx: number, out: number[]) => {
        const hsv = rgbToHSV(r, g, b);
        const hueDist = hueTarget === 0 ? Math.min(Math.abs(hsv.h), Math.abs(1 - hsv.h)) : Math.abs(hsv.h - hueTarget);
        const hueWeight = clamp01(1 - hueDist / windowSize);
        const weight = hueWeight * Math.abs(strength);
        if (weight <= 0)
        {
            out[0] = r;
            out[1] = g;
            out[2] = b;
            out[3] = aPx;
            return;
        }
        const sign = strength >= 0 ? 1 : -1;
        const nextS = clamp01(hsv.s + sign * (1 - hsv.s) * weight);
        const nextV = clamp01(hsv.v + sign * hsv.v * weight * 0.2);
        const rgb = hsvToRGB(hsv.h, nextS, nextV);
        out[0] = rgb.r;
        out[1] = rgb.g;
        out[2] = rgb.b;
        out[3] = aPx;
    });
}

function altChannelVibrance(channel: number, amount: number): FilterProcessor
{
    const strength = Math.max(0, Math.min(100, amount || 0)) / 100;
    if (strength === 0)
    {
        return noopFilter;
    }
    const lut: number[] = [];
    for (let i = 0; i < 256; i += 1)
    {
        const weight = (i / 255) * (i / 255) * strength;
        lut[i] = clampByte(i + (255 - i) * weight);
    }
    return applyChannelLUT(channel, lut);
}

export const Filters = {
    _scratch : null as Uint8ClampedArray | null,
    _scratchCanvas : null as HTMLCanvasElement | null,
    _scratchContext : null as CanvasRenderingContext2D | null,
    _ensureScratch : function(length: number) : Uint8ClampedArray {
        // Returns a shared mutable buffer. Callers should consume/copy the
        // contents before the next _ensureScratch call, which may overwrite it.
        if (!this._scratch || this._scratch.length < length)
        {
            this._scratch = new Uint8ClampedArray(length);
        }
        return this._scratch;
    },
    _ensureScratchContext : function(width: number, height: number) : CanvasRenderingContext2D {
        if (!this._scratchCanvas)
        {
            this._scratchCanvas = window.document.createElement("canvas");
        }
        if (!this._scratchContext)
        {
            this._scratchContext =
                this._scratchCanvas.getContext("2d", {willReadFrequently : true}) as CanvasRenderingContext2D;
        }
        if (this._scratchCanvas.width !== width)
        {
            this._scratchCanvas.width = width;
        }
        if (this._scratchCanvas.height !== height)
        {
            this._scratchCanvas.height = height;
        }
        return this._scratchContext;
    },
    _applyPixelTransformInPlace : function(context: CanvasRenderingContext2D, transform: PixelTransformInPlace) : void {
        const width = context.canvas.width;
        const height = context.canvas.height;
        const scratchContext = this._ensureScratchContext(width, height);
        scratchContext.clearRect(0, 0, width, height);
        scratchContext.drawImage(context.canvas, 0, 0);
        const imgData = scratchContext.getImageData(0, 0, width, height);
        const pixels = imgData.data;
        const out = [ 0, 0, 0, 0 ];
        for (let i = 0, pxl = pixels.length; i < pxl; i += 4)
        {
            transform(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3], out);
            pixels[i] = out[0];
            pixels[i + 1] = out[1];
            pixels[i + 2] = out[2];
            pixels[i + 3] = out[3];
        }
        scratchContext.putImageData(imgData, 0, 0);
        context.clearRect(0, 0, width, height);
        context.drawImage(this._scratchCanvas as HTMLCanvasElement, 0, 0);
    },
    THRESHOLDING : function(threshold: number) : FilterProcessor {
        if (threshold < 0 || threshold > 255)
        {
            throw new Error("Threshold must be between 0 and 255.");
        }
        return applyPixelTransformInPlace((r: number, g: number, b: number, _a: number, out: number[]) => {
            const v = ((54 * r + 183 * g + 19 * b) >> 8) >= threshold ? 255 : 0;
            out[0] = v;
            out[1] = v;
            out[2] = v;
            out[3] = 255;
        });
    },
    SATURATION : function(adjustment: number) : FilterProcessor {
        const adj = adjustment * -0.01;
        return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
            const maxValue = Math.max(r, g, b);
            out[0] = r !== maxValue ? r + (maxValue - r) * adj : r;
            out[1] = g !== maxValue ? g + (maxValue - g) * adj : g;
            out[2] = b !== maxValue ? b + (maxValue - b) * adj : b;
            out[3] = a;
        });
    },
    VIBRANCE : function(adjustment: number) : FilterProcessor {
        const adj = adjustment * -1;
        return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
            const maxValue = Math.max(r, g, b);
            const avg = (r + g + b) / 3;
            const amt = ((Math.abs(maxValue - avg) * 2 / 255) * adj) / 100;
            out[0] = r !== maxValue ? r + (maxValue - r) * amt : r;
            out[1] = g !== maxValue ? g + (maxValue - g) * amt : g;
            out[2] = b !== maxValue ? b + (maxValue - b) * amt : b;
            out[3] = a;
        });
    },
    HUE : function(adjustment: number) : FilterProcessor {
        // Use direct hue rotation matrix instead of RGB→HSV→RGB conversion
        // Hue rotation is a rotation around the (1,1,1) axis in RGB space
        const degrees = (Math.abs(adjustment) / 100) * 360;
        const matrix = buildHueRotationMatrix(degrees);

        return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
            out[0] = clampByte(matrix.m00 * r + matrix.m01 * g + matrix.m02 * b);
            out[1] = clampByte(matrix.m10 * r + matrix.m11 * g + matrix.m12 * b);
            out[2] = clampByte(matrix.m20 * r + matrix.m21 * g + matrix.m22 * b);
            out[3] = a;
        });
    },
    BRIGHTNESS : function(adjustment: number) : FilterProcessor {
        if (adjustment < -255 || adjustment > 255)
        {
            throw new Error("Brightness adjustment must be between -255 and 255.");
        }
        const precomputedBrightness: number[] = [];
        for (let i = 0; i < 256; i += 1)
        {
            precomputedBrightness[i] = i + adjustment;
        }
        return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
            out[0] = precomputedBrightness[r];
            out[1] = precomputedBrightness[g];
            out[2] = precomputedBrightness[b];
            out[3] = a;
        });
    },
    CC_RED : function(adjustment: number) : FilterProcessor { return ccChannel(0, adjustment);},
    CC_GREEN : function(adjustment: number) : FilterProcessor { return ccChannel(1, adjustment);},
    CC_BLUE : function(adjustment: number) : FilterProcessor { return ccChannel(2, adjustment);},
    CONTRAST : function(adjustment: number) : FilterProcessor {
        if (adjustment < 0)
        {
            throw new Error("Contrast adjustment must be positive.");
        }
        const precomputedContrast: number[] = [];
        for (let i = 0; i < 256; i += 1)
        {
            precomputedContrast[i] = i * adjustment;
        }
        return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
            out[0] = precomputedContrast[r];
            out[1] = precomputedContrast[g];
            out[2] = precomputedContrast[b];
            out[3] = a;
        });
    },
    GAMMA : function(adjustment: number) : FilterProcessor {
        if (adjustment < 0)
        {
            throw new Error("Gamma adjustment must be positive.");
        }
        const precomputedGamma: number[] = [];
        for (let i = 0; i < 256; i += 1)
        {
            precomputedGamma[i] = Math.pow(i / 255, adjustment) * 255;
        }
        return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
            out[0] = precomputedGamma[r];
            out[1] = precomputedGamma[g];
            out[2] = precomputedGamma[b];
            out[3] = a;
        });
    },
    GREYSCALE : function() : FilterProcessor {
        return applyPixelTransformInPlace((r: number, g: number, b: number, _a: number, out: number[]) => {
            const val = (77 * r + 150 * g + 29 * b) >> 8;
            out[0] = val;
            out[1] = val;
            out[2] = val;
            out[3] = 255;
        });
    },
    INVERT : function() : FilterProcessor {
        const precomputedInvert: number[] = [];
        for (let i = 0; i < 256; i += 1)
        {
            precomputedInvert[i] = 255 - i;
        }
        return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
            out[0] = precomputedInvert[r];
            out[1] = precomputedInvert[g];
            out[2] = precomputedInvert[b];
            out[3] = a;
        });
    },
    MORPHOLOGICAL_OPERATION : function(kernelSize: number, comparator: (a: number, b: number) => number) :
        FilterProcessor {
            if (kernelSize % 2 === 0)
            {
                throw new Error("The kernel size must be an odd number.");
            }
            const kernelHalfSize = Math.floor(kernelSize / 2);

            if (!comparator)
            {
                throw new Error("A comparator must be defined.");
            }

            return function(context: CanvasRenderingContext2D, callback: () => void): void {
                withImageData(context, (imgData) => {
                    const width = imgData.width;
                    const height = imgData.height;
                    const originalPixels = Filters._ensureScratch(imgData.data.length);
                    originalPixels.set(imgData.data);
                    morphPixels(originalPixels, imgData.data, width, height, kernelSize, kernelHalfSize, comparator);
                    return true;
                });
                callback();
            };
        },
    CONVOLUTION : function(kernel: number[]) : FilterProcessor {
        if (!Array.isArray(kernel))
        {
            throw new Error("The kernel must be an array.");
        }
        const kernelSize = Math.sqrt(kernel.length);
        if ((kernelSize + 1) % 2 !== 0)
        {
            throw new Error("The kernel must be a square matrix with odd width and height.");
        }
        const kernelHalfSize = (kernelSize - 1) / 2;

        return function(context: CanvasRenderingContext2D, callback: () => void): void {
            withImageData(context, (imgData) => {
                const width = imgData.width;
                const height = imgData.height;
                const originalPixels = Filters._ensureScratch(imgData.data.length);
                originalPixels.set(imgData.data);
                convolvePixels(originalPixels, imgData.data, width, height, kernel, kernelSize, kernelHalfSize);
                return true;
            });
            callback();
        };
    },
    COLORMAP : function(cmap: number[][], ctr: number) : FilterProcessor {
        const resampledCmap = cmap.slice(0);
        const diff = 255 - ctr;
        for (let i = 0; i < 256; i += 1)
        {
            let position = 0;
            if (i > ctr)
            {
                position = Math.min((i - ctr) / diff * 128 + 128, 255) | 0;
            }
            else
            {
                position = Math.max(0, i / (ctr / 128)) | 0;
            }
            resampledCmap[i] = cmap[position];
        }
        return applyPixelTransformInPlace((r: number, g: number, b: number, _a: number, out: number[]) => {
            const v = (r + g + b) / 3 | 0;
            const c = resampledCmap[v];
            out[0] = c[0];
            out[1] = c[1];
            out[2] = c[2];
            out[3] = 255;
        });
    },
    COLORMAP_PRESET : function(preset: string) : number[][] | null { return getColormap(preset || "");},
    CONVOLUTION_PRESET : function(preset: string) : number[] |
                             null {
                                 const normalized = (preset || "").toLowerCase();
                                 switch (normalized)
                                 {
                                 case "sharpen":
                                     return [ 0, -1, 0, -1, 5, -1, 0, -1, 0 ];
                                 case "blur":
                                     return [ 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9 ];
                                 case "edge":
                                     return [ -1, -1, -1, -1, 8, -1, -1, -1, -1 ];
                                 case "emboss":
                                     return [ -2, -1, 0, -1, 1, 1, 0, 1, 2 ];
                                 default:
                                     return null;
                                 }
                             },
    PSEUDOCOLOR : function(mode: string, red?: number, green?: number, blue?: number) : FilterProcessor {
        const normalized = (mode || "").toLowerCase();
        const rWeight = red === undefined ? 1 : red;
        const gWeight = green === undefined ? 1 : green;
        const bWeight = blue === undefined ? 1 : blue;
        const applyWeightsInPlace = (c0: number, c1: number, c2: number, out: number[]) => {
            out[0] = clampByte(c0 * rWeight);
            out[1] = clampByte(c1 * gWeight);
            out[2] = clampByte(c2 * bWeight);
        };
        return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
            const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            switch (normalized)
            {
            case "rg":
            {
                const v = clampByte(128 + (r - g));
                applyWeightsInPlace(v, 255 - v, (r + g) / 2, out);
                out[3] = a;
                return;
            }
            case "gb":
            {
                const v = clampByte(128 + (g - b));
                applyWeightsInPlace((g + b) / 2, v, 255 - v, out);
                out[3] = a;
                return;
            }
            case "rb":
            {
                const v = clampByte(128 + (r - b));
                applyWeightsInPlace(v, (r + b) / 2, 255 - v, out);
                out[3] = a;
                return;
            }
            case "luma":
            {
                const v = clampByte(luma);
                applyWeightsInPlace(v, 255 - v, v, out);
                out[3] = a;
                return;
            }
            case "cmy":
            {
                applyWeightsInPlace(255 - r, 255 - g, 255 - b, out);
                out[3] = a;
                return;
            }
            case "heat":
            {
                const v = clampByte(luma);
                const t = v / 255;
                applyWeightsInPlace(clampByte(255 * Math.min(1, t * 3)),
                                    clampByte(255 * Math.min(1, Math.max(0, (t - 0.33) * 3))),
                                    clampByte(255 * Math.min(1, Math.max(0, (t - 0.66) * 3))), out);
                out[3] = a;
                return;
            }
            case "pca1":
            {
                const v = clampByte(0.6 * r + 0.3 * g + 0.1 * b);
                applyWeightsInPlace(v, 255 - v, v, out);
                out[3] = a;
                return;
            }
            case "pca2":
            {
                const v = clampByte(0.5 * r - 0.2 * g - 0.3 * b + 128);
                applyWeightsInPlace(v, 255 - v, 255 - v, out);
                out[3] = a;
                return;
            }
            case "pca3":
            {
                const v = clampByte(0.2 * r + 0.6 * g - 0.8 * b + 128);
                applyWeightsInPlace(255 - v, v, 255 - v, out);
                out[3] = a;
                return;
            }
            default:
            {
                applyWeightsInPlace(r, g, b, out);
                out[3] = a;
            }
            }
        });
    },
    COLOR_REPLACE : function(source: string, target: string, tolerance?: number, blend?: number,
                             preserveLum?: boolean) : FilterProcessor {
        const src = hexToRgb(source);
        const dst = hexToRgb(target);
        if (!src || !dst)
        {
            return noopFilter;
        }
        const tol = Math.max(0, Math.min(255, tolerance === undefined ? 0 : tolerance));
        const strength = Math.max(0, Math.min(1, blend === undefined ? 1 : blend));
        const targetHsv = rgbToHSV(dst[0], dst[1], dst[2]);
        return applyPixelTransformInPlace((r: number, g: number, b: number, a: number, out: number[]) => {
            const dr = r - src[0];
            const dg = g - src[1];
            const db = b - src[2];
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);
            let weight = 0;
            if (tol <= 0)
            {
                weight = dist === 0 ? 1 : 0;
            }
            else
            {
                weight = 1 - Math.min(1, dist / tol);
            }
            weight *= strength;
            if (weight <= 0)
            {
                out[0] = r;
                out[1] = g;
                out[2] = b;
                out[3] = a;
                return;
            }
            let tr = dst[0];
            let tg = dst[1];
            let tb = dst[2];
            if (preserveLum)
            {
                const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                const rgb = hsvToRGB(targetHsv.h, targetHsv.s, luma);
                tr = rgb.r;
                tg = rgb.g;
                tb = rgb.b;
            }
            out[0] = clampByte(r + (tr - r) * weight);
            out[1] = clampByte(g + (tg - g) * weight);
            out[2] = clampByte(b + (tb - b) * weight);
            out[3] = a;
        });
    },
    ALT_RED_GAMMA : function(amount: number) : FilterProcessor { return altChannelGamma(0, amount);},
    ALT_GREEN_GAMMA : function(amount: number) : FilterProcessor { return altChannelGamma(1, amount);},
    ALT_BLUE_GAMMA : function(amount: number) : FilterProcessor { return altChannelGamma(2, amount);},
    ALT_RED_SIGMOID : function(amount: number) : FilterProcessor { return altChannelSigmoid(0, amount);},
    ALT_GREEN_SIGMOID : function(amount: number) : FilterProcessor { return altChannelSigmoid(1, amount);},
    ALT_BLUE_SIGMOID : function(amount: number) : FilterProcessor { return altChannelSigmoid(2, amount);},
    ALT_RED_HUE : function(amount: number, window?: number) :
        FilterProcessor { return altChannelHue(0, amount, window);},
    ALT_GREEN_HUE : function(amount: number, window?: number) :
        FilterProcessor { return altChannelHue(1 / 3, amount, window);},
    ALT_BLUE_HUE : function(amount: number, window?: number) :
        FilterProcessor { return altChannelHue(2 / 3, amount, window);},
    ALT_RED_VIBRANCE : function(amount: number) : FilterProcessor { return altChannelVibrance(0, amount);},
    ALT_GREEN_VIBRANCE : function(amount: number) : FilterProcessor { return altChannelVibrance(1, amount);},
    ALT_BLUE_VIBRANCE : function(amount: number) : FilterProcessor { return altChannelVibrance(2, amount);},
    GLOBAL_PCA_COLOR : function(mode: string, hueDegrees?: number) : FilterProcessor {
        const normalized = (mode || "").toLowerCase();
        const hue = Math.max(-180, Math.min(180, hueDegrees ?? 0));
        const runningStats = createRunningPcaStats();
        // This basis is intentionally scoped to this processor instance.
        // Caller assumption: filter rebuilds (new processor instance) occur
        // when switching images/tile sources or changing filter settings.
        // If that lifecycle changes, this basis should be explicitly reset.
        let globalBasis: PcaBasis|null = null;
        const minSamples = 2000;

        return function(context: CanvasRenderingContext2D, callback: () => void): void {
            withImageData(context, (imgData) => {
                const data = imgData.data;
                if (!globalBasis)
                {
                    updateRunningPcaStats(runningStats, data);
                    if (runningStats.count >= minSamples)
                    {
                        globalBasis = basisFromRunningStats(runningStats);
                    }
                }

                if (globalBasis)
                {
                    applyPcaColorWithBasis(imgData, normalized, globalBasis, hue);
                }
                else
                {
                    applyPcaColor(imgData, normalized, hue);
                }
                return true;
            });
            callback();
        };
    },
    BACKGROUND_NORMALIZE : function(strength?: number) : FilterProcessor {
        const amount = Math.max(0, Math.min(2, strength || 0));
        return function(context: CanvasRenderingContext2D, callback: () => void): void {
            if (amount === 0)
            {
                callback();
                return;
            }
            withImageData(context, (imgData) => {
                const width = imgData.width;
                const height = imgData.height;
                if (!width || !height)
                {
                    return false;
                }
                const data = imgData.data;
                const lum = buildLuminance(data, width, height);
                const blurred = boxBlur(lum, width, height, 6, true);
                for (let i = 0, p = 0; i < data.length; i += 4, p += 1)
                {
                    const normalized = clampByte((lum[p] - blurred[p]) * amount + 128);
                    data[i] = normalized;
                    data[i + 1] = normalized;
                    data[i + 2] = normalized;
                }
                return true;
            });
            callback();
        };
    },
    UNSHARP_MASK : function(amount?: number) : FilterProcessor {
        const strength = Math.max(0, Math.min(3, amount || 0));
        return function(context: CanvasRenderingContext2D, callback: () => void): void {
            if (strength === 0)
            {
                callback();
                return;
            }
            withImageData(context, (imgData) => {
                const width = imgData.width;
                const height = imgData.height;
                if (!width || !height)
                {
                    return false;
                }
                const blurred = boxBlur(imgData.data, width, height, 2);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4)
                {
                    data[i] = clampByte(data[i] + strength * (data[i] - blurred[i]));
                    data[i + 1] = clampByte(data[i + 1] + strength * (data[i + 1] - blurred[i + 1]));
                    data[i + 2] = clampByte(data[i + 2] + strength * (data[i + 2] - blurred[i + 2]));
                }
                return true;
            });
            callback();
        };
    },
    ADAPTIVE_THRESHOLD : function(windowSize?: number, offset?: number) : FilterProcessor {
        let size = windowSize || 15;
        if (size % 2 === 0)
        {
            size += 1;
        }
        size = Math.max(3, Math.min(51, size));
        const bias = Math.max(-50, Math.min(50, offset || 0));
        return function(context: CanvasRenderingContext2D, callback: () => void): void {
            withImageData(context, (imgData) => {
                const width = imgData.width;
                const height = imgData.height;
                if (!width || !height)
                {
                    return false;
                }
                const data = imgData.data;
                const lum = buildLuminance(data, width, height);
                const mean = boxBlur(lum, width, height, Math.floor(size / 2), true);
                for (let i = 0, p = 0; i < data.length; i += 4, p += 1)
                {
                    const value = lum[p] > mean[p] + bias ? 255 : 0;
                    data[i] = value;
                    data[i + 1] = value;
                    data[i + 2] = value;
                }
                return true;
            });
            callback();
        };
    }
};
