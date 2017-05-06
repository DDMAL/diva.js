export function DivaParentElementNotFoundException (message)
{
    this.name = "DivaParentElementNotFoundException";
    this.message = message;
    this.stack = (new Error()).stack;
}

DivaParentElementNotFoundException.prototype = new Error();

export function NotAnIIIFManifestException (message)
{
    this.name = "NotAnIIIFManifestException";
    this.message = message;
    this.stack = (new Error()).stack;
}

NotAnIIIFManifestException.prototype = new Error();

export function ObjectDataNotSuppliedException (message)
{
    this.name = "ObjectDataNotSuppliedException";
    this.message = message;
    this.stack = (new Error()).stack;
}

ObjectDataNotSuppliedException.prototype = new Error();
