module.exports = Viewport;

function Viewport(outer, options)
{
    this.outer = outer;
    this.intersectionTolerance = (options && options.intersectionTolerance) || 0;

    this._top = this._left = this._width = this._height = null;

    this._valid = false;
    this._validationPending = false;

    this.invalidate();
}

Viewport.prototype.intersectsRegion = function (region)
{
    return this.hasHorizontalOverlap(region) && this.hasVerticalOverlap(region);
};

Viewport.prototype.hasVerticalOverlap = function (region)
{
    var top = this.top - this.intersectionTolerance;
    var bottom = this.bottom + this.intersectionTolerance;

    return (
        fallsBetween(region.top, top, bottom) ||
        fallsBetween(region.bottom, top, bottom) ||
        (region.top <= top && region.bottom >= bottom)
    );
};

Viewport.prototype.hasHorizontalOverlap = function (region)
{
    var left = this.left - this.intersectionTolerance;
    var right = this.right + this.intersectionTolerance;

    return (
        fallsBetween(region.left, left, right) ||
        fallsBetween(region.right, left, right) ||
        (region.left <= left && region.right >= right)
    );
};

Viewport.prototype.invalidate = function ()
{
    if (!this._setInvalid())
        return;

    this._revalidate();
};

// TODO(wabain): Get rid of this if it doesn't end up being used
Viewport.prototype.invalidateAndDeferRevalidation = function ()
{
    if (!this._setInvalid())
        throw new Error('cannot defer viewport revalidation: validation is already pending');

    return this._revalidate.bind(this);
};

Viewport.prototype._setInvalid = function ()
{
    if (this._validationPending)
        return false;

    this._valid = false;
    this._validationPending = true;

    return true;
};

Viewport.prototype._revalidate = function ()
{
    this._top = this.outer.scrollTop;
    this._left = this.outer.scrollLeft;
    this._width = this.outer.clientWidth;
    this._height = this.outer.clientHeight;
    this._valid = true;
    this._validationPending = false;
};

Viewport.prototype._assertValid = function (prop)
{
    if (!this._valid)
        throw new TypeError('Access of viewport.' + prop + ' while it is invalidated');
};

['top', 'left'].forEach(function (prop)
{
    var privateProp = '_' + prop;
    var source = 'scroll' + prop.charAt(0).toUpperCase() + prop.slice(1);

    Object.defineProperty(Viewport.prototype, prop, {
        get: function ()
        {
            this._assertValid(prop);
            return this[privateProp];
        },
        set: function (newValue)
        {
            // TODO: It would make sense to validate these values, but that can't
            // be done by reading the dimensions of the inner element because
            // that would trigger reflows and cause layout thrashing. Therefore,
            // Viewport would need to know about the dimensions of the document,
            // and everything that uses these setters is working with knowledge of those
            // values anyway, so not much is gained by adding checks here.
            this._assertValid(prop);
            this[privateProp] = this.outer[source] = newValue;
        }
    });
});

['width', 'height'].forEach(function (prop)
{
    Object.defineProperty(Viewport.prototype, prop, {
        get: function ()
        {
            this._assertValid(prop);
            return this['_' + prop];
        }
    });
});

Object.defineProperties(Viewport.prototype, {
    bottom: {
        get: function ()
        {
            this._assertValid('bottom');
            return this._top + this._height;
        }
    },
    right: {
        get: function ()
        {
            this._assertValid('right');
            return this._left + this._width;
        }
    }
});

function fallsBetween(point, start, bottom)
{
    return point >= start && point <= bottom;
}
