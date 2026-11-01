/** Derived annotation lookup data; source collections remain authoritative. */
export class AnnotationIndex<T>
{
    private readonly canvases = new Map<string, Set<string>>();
    private readonly annotations = new Map<string, Map<string, T>>();
    private readonly order = new Map<string, number>();
    private nextOrder = 0;

    public set(canvasId: string, annotations: readonly T[], idFor: (annotation: T) => string, lastWins = false): void
    {
        this.removeEntries(canvasId);
        if (!this.order.has(canvasId))
        {
            this.order.set(canvasId, this.nextOrder++);
        }
        const ids = new Set<string>();
        for (const annotation of annotations)
        {
            const id = idFor(annotation);
            // Array.find selects the first occurrence within a Canvas.
            if (!lastWins && ids.has(id))
            {
                continue;
            }
            ids.add(id);
            let entries = this.annotations.get(id);
            if (!entries)
            {
                entries = new Map();
                this.annotations.set(id, entries);
            }
            entries.set(canvasId, annotation);
        }
        this.canvases.set(canvasId, ids);
    }

    public entries(id: string): ReadonlyMap<string, T> | undefined
    {
        return this.annotations.get(id);
    }

    public rank(canvasId: string): number
    {
        return this.order.get(canvasId) ?? Infinity;
    }

    public delete(canvasId: string): void
    {
        this.removeEntries(canvasId);
        this.order.delete(canvasId);
    }

    public clear(): void
    {
        this.canvases.clear();
        this.annotations.clear();
        this.order.clear();
        this.nextOrder = 0;
    }

    private removeEntries(canvasId: string): void
    {
        this.canvases.get(canvasId)?.forEach((id) => {
            const entries = this.annotations.get(id)!;
            entries.delete(canvasId);
            if (entries.size === 0)
            {
                this.annotations.delete(id);
            }
        });
        this.canvases.delete(canvasId);
    }
}
