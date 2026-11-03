export type AnnotationBody = {
    value: string;
    format?: string;
    language?: string;
};
export declare function annotationBodies(body: unknown): AnnotationBody[];
export declare const isPlainTextBody: (body: AnnotationBody) => boolean;
export declare const annotationBodiesEqual: (left?: AnnotationBody[], right?: AnnotationBody[]) => boolean;
export declare function annotationTooltipText(bodies: AnnotationBody[], sanitize: (html: string) => DocumentFragment): string;
export declare function annotationTooltipPreview(text: string): string;
