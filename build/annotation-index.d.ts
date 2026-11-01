/** Derived annotation lookup data; source collections remain authoritative. */
export declare class AnnotationIndex<T> {
    private readonly canvases;
    private readonly annotations;
    private readonly order;
    private nextOrder;
    set(canvasId: string, annotations: readonly T[], idFor: (annotation: T) => string, lastWins?: boolean): void;
    entries(id: string): ReadonlyMap<string, T> | undefined;
    rank(canvasId: string): number;
    delete(canvasId: string): void;
    clear(): void;
    private removeEntries;
}
