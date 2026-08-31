import type { DivaStaticImageCorsPolicy } from "./public-api";
import { type ResolvedTileSource, type TileSourceDescriptor } from "./image-utils";
export type { ResolvedTileSource, TileSourceDescriptor } from "./image-utils";
type SendPort<T> = {
    send: (value: T) => void;
};
type SubscribePort<T> = {
    subscribe: (callback: (value: T) => void) => void;
};
type BrowserPorts = {
    resolveTileSourceRequested: SendPort<{
        requestId: string;
        sourceId: string;
    }>;
    resolveTileSourceCancelled: SendPort<string>;
    tileSourceResolutionSucceeded: SubscribePort<Resolution>;
    tileSourceResolutionFailed: SubscribePort<{
        requestId: string;
        message: string;
    }>;
    authHttpRequested: SubscribePort<HttpRequest>;
    authHttpCancelled: SubscribePort<string>;
    authHttpResponded: SendPort<{
        id: string;
        status: number;
        body: string;
    }>;
    authHttpFailed: SendPort<{
        id: string;
        message: string;
    }>;
    authStorageRequested: SubscribePort<StorageRequest>;
    authStorageResponded: SendPort<{
        flowId: string;
        now: number;
        value: unknown;
    }>;
    authTokenFrameRequested: SubscribePort<TokenFrameRequest>;
    authTokenFrameCancelled: SubscribePort<string>;
    authTokenMessage: SendPort<{
        flowId: string;
        now: number;
        value: unknown;
    }>;
    authTokenFailed: SendPort<{
        flowId: string;
        message: string;
    }>;
    authPopupChanged: SendPort<{
        flowId: string;
        status: string;
    }>;
    authLogoutChanged: SendPort<{
        sessionId: string;
        status: string;
    }>;
    authDestroyed: SendPort<null>;
};
type Resolution = {
    requestId: string;
    url: string;
    isStatic: boolean;
    credentialed: boolean;
    infoJson?: unknown;
};
type HttpRequest = {
    id: string;
    url: string;
    bearer?: string | null;
    withCredentials?: boolean;
};
type StorageRequest = {
    action: "read" | "write" | "remove";
    flowId: string;
    key: string;
    accessToken?: string;
    expiresAt?: number;
};
type TokenFrameRequest = {
    flowId: string;
    url: string;
    messageId: string;
};
export declare class AuthBrowser {
    private readonly ports;
    private readonly root;
    private readonly pending;
    private readonly inflight;
    private readonly resolutionCache;
    private readonly requests;
    private readonly frames;
    private readonly popups;
    private readonly logoutPopups;
    private nextRequest;
    private nextConsumer;
    private destroyed;
    private readonly clickHandler;
    private readonly staticImageCorsPolicy;
    constructor(ports: BrowserPorts, root: HTMLElement, staticImageCorsPolicy?: DivaStaticImageCorsPolicy);
    resolve(source: TileSourceDescriptor, signal: AbortSignal): Promise<ResolvedTileSource>;
    registerSources(_sources: TileSourceDescriptor[]): void;
    invalidateSources(sourceIds: string[]): void;
    useNonCorsStaticSource(sourceId: string): void;
    destroy(): void;
    private cancelBrowserWork;
    private closePopups;
    private succeed;
    private fail;
    private startResolution;
    private consume;
    private cancelResolution;
    private invalidateSource;
    private fetch;
    private cancelFetch;
    private storage;
    private handleClick;
    private startLogout;
    private startFrame;
    private cancelFrame;
}
