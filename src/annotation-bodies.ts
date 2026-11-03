export type AnnotationBody = { value: string; format?: string; language?: string };

export function annotationBodies(body: unknown): AnnotationBody[]
{
    if (typeof body === "string")
    {
        return [{ value: body }];
    }
    if (Array.isArray(body))
    {
        return body.flatMap(annotationBodies);
    }
    if (body && typeof body === "object")
    {
        const entry = body as Record<string, unknown>;
        const value = typeof entry.value === "string" ? entry.value : entry.chars;
        if (typeof value === "string")
        {
            return [{
                value,
                format: typeof entry.format === "string" ? entry.format : undefined,
                language: typeof entry.language === "string" ? entry.language : undefined,
            }];
        }
    }
    return [];
}

export const isPlainTextBody = (body: AnnotationBody): boolean =>
    body.format?.split(";")[0].trim().toLowerCase() === "text/plain";

export const annotationBodiesEqual = (left?: AnnotationBody[], right?: AnnotationBody[]): boolean =>
    left === right
    || Boolean(
        left && right && left.length === right.length && left.every((body, index) =>
            body.value === right[index].value && body.format === right[index].format
            && body.language === right[index].language
        ),
    );

export function annotationTooltipText(bodies: AnnotationBody[], sanitize: (html: string) => DocumentFragment): string
{
    return bodies.map(body => {
        if (isPlainTextBody(body))
        {
            return body.value.replace(/\r\n?/g, "\n").trim();
        }
        const content = sanitize(body.value);
        // Collapse source indentation before adding semantic line breaks. Text
        // extraction from detached DOM otherwise loses paragraph/br boundaries.
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode()))
        {
            node.textContent = node.textContent?.replace(/\s+/g, " ") ?? "";
        }
        content.querySelectorAll("br").forEach(element => element.replaceWith("\n"));
        content.querySelectorAll("p, div, li, dt, dd").forEach(element => {
            element.before("\n");
            element.after("\n");
        });
        return (content.textContent ?? "").split("\n").map(line => line.trim()).join("\n").replace(/\n{3,}/g, "\n\n")
            .trim();
    }).filter(Boolean).join("\n\n");
}

export function annotationTooltipPreview(text: string): string
{
    const lines = text.split("\n").slice(0, 6).join("\n");
    const characters = Array.from(lines);
    let preview = characters.slice(0, 240).join("").trimEnd();
    if (characters.length > 240)
    {
        preview = preview.replace(/\s+\S*$/u, "").trimEnd() || preview;
    }
    return preview.length < text.length ? `${preview}\n… Click for details` : preview;
}
