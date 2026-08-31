import {nonCorsStaticTileSource,
        type ResolvedTileSource,
        staticImageTileSource,
        type TileSourceDescriptor} from "./image-utils";
import type {DivaStaticImageCorsPolicy} from "./public-api";

export type {ResolvedTileSource,
             TileSourceDescriptor} from "./image-utils";

type SendPort<T> = {
    send: (value: T) => void
};
type SubscribePort<T> = {
    subscribe: (callback: (value: T) => void) => void
};
type BrowserPorts = {
    resolveTileSourceRequested: SendPort<{requestId : string; sourceId : string}>;
    resolveTileSourceCancelled : SendPort<string>;
    tileSourceResolutionSucceeded : SubscribePort<Resolution>;
    tileSourceResolutionFailed : SubscribePort<{requestId : string; message : string}>;
    authHttpRequested : SubscribePort<HttpRequest>;
    authHttpCancelled : SubscribePort<string>;
    authHttpResponded : SendPort<{id : string; status : number; body : string}>;
    authHttpFailed : SendPort<{id : string; message : string}>;
    authStorageRequested : SubscribePort<StorageRequest>;
    authStorageResponded : SendPort<{flowId : string; now : number; value : unknown}>;
    authTokenFrameRequested : SubscribePort<TokenFrameRequest>;
    authTokenFrameCancelled : SubscribePort<string>;
    authTokenMessage : SendPort<{flowId : string; now : number; value : unknown}>;
    authTokenFailed : SendPort<{flowId : string; message : string}>;
    authPopupChanged : SendPort<{flowId : string; status : string}>;
    authLogoutChanged : SendPort<{sessionId : string; status : string}>;
    authDestroyed : SendPort<null>;
};
type Resolution = {
    requestId: string; url : string; isStatic : boolean; credentialed : boolean;
    infoJson?: unknown;
};
type HttpRequest = {
    id: string; url : string;
    bearer?: string | null;
    withCredentials?: boolean;
};
type StorageRequest = {
    action: "read"|"write"|"remove"; flowId : string; key : string;
    accessToken?: string;
    expiresAt?: number;
};
type TokenFrameRequest = {
    flowId: string; url : string; messageId : string
};
type Pending = {
    sourceId: string; descriptorKey : string;
    resolve : (source: ResolvedTileSource) => void;
    reject : (error: Error) => void;
};
type Inflight = {
    requestId: string; descriptorKey : string; promise : Promise<ResolvedTileSource>;
    consumers : Set<number>;
};
type SourceResolutionCache = {
    descriptorKey: string; activeState : "anonymous" | "credentialed";
    resolutions : Map<"anonymous"|"credentialed", ResolvedTileSource>;
};
type Frame = {
    element: HTMLIFrameElement; timeout : number; receive : (event: MessageEvent) => void
};
type Popup = {
    window: Window; timer : number
};

const STORAGE_PREFIX = "diva:iiif-auth2:";
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : "Authorization request failed.";
const infoJsonSuffix = /\/info\.json(?:[?#].*)?$/;
const descriptorKey = (source: TileSourceDescriptor): string => JSON.stringify([ source.url, source.isStatic ]);
const cancelled = (): DOMException => new DOMException("The operation was cancelled.", "AbortError");

const cloneResolvedTileSource = (source: ResolvedTileSource): ResolvedTileSource =>
    typeof source === "string" ? source : {...source};

const normalizeInfoJsonServiceIds = (infoJson: Record<string, unknown>): Record<string, unknown> => {
    const normalized = {...infoJson};
    for (const key of ["id", "@id"])
    {
        const value = normalized[key];
        if (typeof value === "string" && infoJsonSuffix.test(value))
        {
            normalized[key] = value.replace(infoJsonSuffix, "");
        }
    }
    return normalized;
};

export class AuthBrowser
{
    private readonly ports: BrowserPorts;
    private readonly root: HTMLElement;
    private readonly pending = new Map<string, Pending>();
    private readonly inflight = new Map<string, Inflight>();
    private readonly resolutionCache = new Map<string, SourceResolutionCache>();
    private readonly requests = new Map<string, AbortController>();
    private readonly frames = new Map<string, Frame>();
    private readonly popups = new Map<string, Popup>();
    private readonly logoutPopups = new Map<string, Popup>();
    private nextRequest = 0;
    private nextConsumer = 0;
    private destroyed = false;
    private readonly clickHandler: (event: Event) => void;
    private readonly staticImageCorsPolicy: DivaStaticImageCorsPolicy;

    constructor(ports: BrowserPorts, root: HTMLElement, staticImageCorsPolicy: DivaStaticImageCorsPolicy = "required")
    {
        this.ports = ports;
        this.root = root;
        this.staticImageCorsPolicy = staticImageCorsPolicy;
        this.clickHandler = this.handleClick.bind(this);
        root.addEventListener("click", this.clickHandler, true);

        ports.tileSourceResolutionSucceeded.subscribe((result) => this.succeed(result));
        ports.tileSourceResolutionFailed.subscribe((result) => this.fail(result.requestId, result.message));
        ports.authHttpRequested.subscribe((request) => void this.fetch(request));
        ports.authHttpCancelled.subscribe((id) => this.cancelFetch(id));
        ports.authStorageRequested.subscribe((request) => this.storage(request));
        ports.authTokenFrameRequested.subscribe((request) => this.startFrame(request));
        ports.authTokenFrameCancelled.subscribe((flowId) => this.cancelFrame(flowId));
    }

    resolve(source: TileSourceDescriptor, signal: AbortSignal): Promise<ResolvedTileSource>
    {
        if (this.destroyed || signal.aborted)
        {
            return Promise.reject(cancelled());
        }

        const key = descriptorKey(source);
        const cached = this.resolutionCache.get(source.sourceId);

        if (cached && cached.descriptorKey !== key)
        {
            this.invalidateSource(source.sourceId);
        }
        else if (cached)
        {
            const resolution = cached.resolutions.get(cached.activeState);
            if (resolution !== undefined)
            {
                return Promise.resolve(cloneResolvedTileSource(resolution));
            }
        }

        let active = this.inflight.get(source.sourceId);
        if (active && active.descriptorKey !== key)
        {
            this.invalidateSource(source.sourceId);
            active = undefined;
        }
        if (!active)
        {
            active = this.startResolution(source, key);
        }
        return this.consume(active, signal);
    }

    registerSources(_sources: TileSourceDescriptor[]): void
    {
        Array.from(this.inflight.values()).forEach((active) => this.cancelResolution(active));
        this.resolutionCache.clear();
        this.cancelBrowserWork();
    }

    invalidateSources(sourceIds: string[]): void
    {
        sourceIds.forEach((sourceId) => this.invalidateSource(sourceId));
    }

    useNonCorsStaticSource(sourceId: string): void
    {
        const cached = this.resolutionCache.get(sourceId);
        const source = cached?.resolutions.get("anonymous");
        if (!cached || !source || typeof source !== "object" || source.type !== "image")
        {
            return;
        }
        cached.resolutions.set("anonymous", nonCorsStaticTileSource(source));
        cached.activeState = "anonymous";
    }

    destroy(): void
    {
        if (this.destroyed)
        {
            return;
        }
        this.destroyed = true;
        this.root.removeEventListener("click", this.clickHandler, true);
        this.ports.authDestroyed.send(null);
        this.cancelBrowserWork();
        this.pending.forEach((pending) => pending.reject(new DOMException("The viewer was destroyed.", "AbortError")));
        this.pending.clear();
        this.inflight.clear();
        this.resolutionCache.clear();
    }

    private cancelBrowserWork(): void
    {
        this.requests.forEach((controller) => controller.abort());
        this.requests.clear();
        Array.from(this.frames.keys()).forEach((flowId) => this.cancelFrame(flowId));
        this.closePopups(this.popups);
        this.closePopups(this.logoutPopups);
    }

    private closePopups(popups: Map<string, Popup>): void
    {
        popups.forEach((popup) => {
            clearInterval(popup.timer);
            popup.window.close();
        });
        popups.clear();
    }

    private succeed(result: Resolution): void
    {
        const pending = this.pending.get(result.requestId);
        if (!pending || this.destroyed)
        {
            return;
        }
        this.pending.delete(result.requestId);
        const active = this.inflight.get(pending.sourceId);
        if (active?.requestId === result.requestId)
        {
            this.inflight.delete(pending.sourceId);
        }
        const credentials = result.credentialed ? "use-credentials" : "Anonymous";
        let tileSource: ResolvedTileSource;
        if (result.infoJson && typeof result.infoJson === "object" && !result.isStatic)
        {
            tileSource = {
                ...normalizeInfoJsonServiceIds(result.infoJson as Record<string, unknown>),
                crossOriginPolicy : credentials,
                ajaxWithCredentials : result.credentialed
            };
        }
        else if (result.isStatic)
        {
            const useNonCors = !result.credentialed && this.staticImageCorsPolicy === "none";
            tileSource = staticImageTileSource(result.url, result.credentialed, useNonCors);
        }
        else if (result.credentialed)
        {
            tileSource = {url : result.url, crossOriginPolicy : credentials, ajaxWithCredentials : true};
        }
        else
        {
            tileSource = result.url;
        }
        const state = result.credentialed ? "credentialed" : "anonymous";
        const cached = this.resolutionCache.get(pending.sourceId);
        const resolutions = cached?.descriptorKey === pending.descriptorKey ? cached.resolutions : new Map();
        resolutions.set(state, tileSource);
        this.resolutionCache.set(pending.sourceId, {descriptorKey : pending.descriptorKey, activeState : state, resolutions});
        pending.resolve(tileSource);
    }

    private fail(requestId: string, message: string): void
    {
        const pending = this.pending.get(requestId);
        if (!pending)
        {
            return;
        }
        this.pending.delete(requestId);
        const active = this.inflight.get(pending.sourceId);
        if (active?.requestId === requestId)
        {
            this.inflight.delete(pending.sourceId);
        }
        pending.reject(new Error(message));
    }

    private startResolution(source: TileSourceDescriptor, key: string): Inflight
    {
        const requestId = `tile-source-${this.nextRequest += 1}`;
        let resolveShared!: (source: ResolvedTileSource) => void;
        let rejectShared!: (error: Error) => void;
        const promise = new Promise<ResolvedTileSource>((resolve, reject) => {
            resolveShared = resolve;
            rejectShared = reject;
        });
        const active = {requestId, descriptorKey : key, promise, consumers : new Set<number>()};
        this.pending.set(requestId, {sourceId : source.sourceId, descriptorKey : key, resolve : resolveShared, reject : rejectShared});
        this.inflight.set(source.sourceId, active);
        this.ports.resolveTileSourceRequested.send({requestId, sourceId : source.sourceId});
        return active;
    }

    private consume(active: Inflight, signal: AbortSignal): Promise<ResolvedTileSource>
    {
        const consumerId = this.nextConsumer += 1;
        active.consumers.add(consumerId);
        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = () => {
                signal.removeEventListener("abort", abort);
                active.consumers.delete(consumerId);
            };
            const abort = () => {
                if (settled)
                {
                    return;
                }
                settled = true;
                finish();
                reject(cancelled());
                if (active.consumers.size === 0)
                {
                    this.cancelResolution(active);
                }
            };
            signal.addEventListener("abort", abort, {once : true});
            active.promise.then(
                (source) => {
                    if (!settled)
                    {
                        settled = true;
                        finish();
                        resolve(cloneResolvedTileSource(source));
                    }
                },
                (error: Error) => {
                    if (!settled)
                    {
                        settled = true;
                        finish();
                        reject(error);
                    }
                });
        });
    }

    private cancelResolution(active: Inflight): void
    {
        const pending = this.pending.get(active.requestId);
        if (!pending)
        {
            return;
        }
        this.pending.delete(active.requestId);
        if (this.inflight.get(pending.sourceId)?.requestId === active.requestId)
        {
            this.inflight.delete(pending.sourceId);
        }
        this.ports.resolveTileSourceCancelled.send(active.requestId);
        pending.reject(cancelled());
    }

    private invalidateSource(sourceId: string): void
    {
        this.resolutionCache.delete(sourceId);
        const active = this.inflight.get(sourceId);
        if (active)
        {
            this.cancelResolution(active);
        }
    }

    private async fetch(request: HttpRequest): Promise<void>
    {
        const controller = new AbortController();
        this.requests.set(request.id, controller);
        try
        {
            const response = await fetch(request.url, {
                mode : "cors",
                credentials : request.withCredentials ? "include" : "omit",
                signal : controller.signal,
                headers : request.bearer ? {Authorization : `Bearer ${request.bearer}`} : undefined
            });
            const body = await response.text();
            if (!this.destroyed)
            {
                this.ports.authHttpResponded.send({id : request.id, status : response.status, body});
            }
        }
        catch (error)
        {
            if (!controller.signal.aborted && !this.destroyed)
            {
                this.ports.authHttpFailed.send({id : request.id, message : errorMessage(error)});
            }
        }
        finally
        {
            this.requests.delete(request.id);
        }
    }

    private cancelFetch(id: string): void
    {
        this.requests.get(id)?.abort();
        this.requests.delete(id);
    }

    private storage(request: StorageRequest): void
    {
        const key = STORAGE_PREFIX + encodeURIComponent(request.key);
        try
        {
            if (request.action === "write")
            {
                sessionStorage.setItem(key, JSON.stringify({accessToken : request.accessToken, expiresAt : request.expiresAt}));
                return;
            }
            if (request.action === "remove")
            {
                sessionStorage.removeItem(key);
                return;
            }
            const raw = sessionStorage.getItem(key);
            this.ports.authStorageResponded.send({flowId : request.flowId, now : Date.now(), value : raw ? JSON.parse(raw) : null});
        }
        catch (_)
        {
            if (request.action === "read")
            {
                this.ports.authStorageResponded.send({flowId : request.flowId, now : Date.now(), value : null});
            }
        }
    }

    private handleClick(event: Event): void
    {
        const target = event.target;
        if (!(target instanceof Element))
        {
            return;
        }
        const logoutButton = target.closest<HTMLElement>("button[data-diva-auth-logout][data-diva-auth-url]");
        if (logoutButton && this.root.contains(logoutButton))
        {
            event.preventDefault();
            event.stopPropagation();
            this.startLogout(logoutButton);
            return;
        }
        const button = target.closest<HTMLElement>("button[data-diva-auth-flow][data-diva-auth-url]");
        if (!button || !this.root.contains(button))
        {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const flowId = button.dataset.divaAuthFlow!;
        const url = new URL(button.dataset.divaAuthUrl!, location.href);
        url.searchParams.set("origin", location.origin);
        const popup = window.open(url.href, "_blank");
        if (!popup)
        {
            this.ports.authPopupChanged.send({flowId, status : "blocked"});
            return;
        }
        this.ports.authPopupChanged.send({flowId, status : "opened"});
        const started = Date.now();
        const timer = window.setInterval(() => {
            if (popup.closed)
            {
                clearInterval(timer);
                this.popups.delete(flowId);
                this.ports.authPopupChanged.send({flowId, status : "closed"});
            }
            else if (Date.now() - started > 10 * 60 * 1000)
            {
                popup.close();
                clearInterval(timer);
                this.popups.delete(flowId);
                this.ports.authTokenFailed.send({flowId, message : "Sign-in timed out."});
            }
        }, 250);
        this.popups.set(flowId, {window : popup, timer});
    }

    private startLogout(button: HTMLElement): void
    {
        const sessionId = button.dataset.divaAuthLogout!;
        const url = new URL(button.dataset.divaAuthUrl!, location.href);
        const popup = window.open(url.href, "_blank");
        if (!popup)
        {
            this.ports.authLogoutChanged.send({sessionId, status : "blocked"});
            return;
        }
        this.ports.authLogoutChanged.send({sessionId, status : "opened"});
        const timer = window.setInterval(() => {
            if (!popup.closed)
            {
                return;
            }
            clearInterval(timer);
            this.logoutPopups.delete(sessionId);
            this.ports.authLogoutChanged.send({sessionId, status : "closed"});
        }, 250);
        this.logoutPopups.set(sessionId, {window : popup, timer});
    }

    private startFrame(request: TokenFrameRequest): void
    {
        this.cancelFrame(request.flowId);
        const url = new URL(request.url, location.href);
        url.searchParams.set("messageId", request.messageId);
        url.searchParams.set("origin", location.origin);
        const iframe = document.createElement("iframe");
        iframe.hidden = true;
        iframe.src = url.href;
        const receive = (event: MessageEvent) => {
            if (event.source !== iframe.contentWindow || event.origin !== url.origin || !event.data || typeof event.data !== "object")
            {
                return;
            }
            if ((event.data as Record<string, unknown>).messageId !== request.messageId)
            {
                return;
            }
            this.ports.authTokenMessage.send({flowId : request.flowId, now : Date.now(), value : event.data});
        };
        window.addEventListener("message", receive);
        const timeout = window.setTimeout(() => {
            this.cancelFrame(request.flowId);
            this.ports.authTokenFailed.send({flowId : request.flowId, message : "The token service did not respond."});
        }, 30000);
        this.frames.set(request.flowId, {element : iframe, timeout, receive});
        document.body.append(iframe);
    }

    private cancelFrame(flowId: string): void
    {
        const frame = this.frames.get(flowId);
        if (!frame)
        {
            return;
        }
        clearTimeout(frame.timeout);
        window.removeEventListener("message", frame.receive);
        frame.element.remove();
        this.frames.delete(flowId);
    }
}
