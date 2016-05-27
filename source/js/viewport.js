module.exports = Viewport;

function Viewport(outer, options)
{
    options = options || {};

    this.intersectionTolerance = options.intersectionTolerance || 0;
    this.maxExtent = options.maxExtent || 2000;

    this.outer = outer;

    this._top = this._left = this._width = this._height = null;

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
    this._width = Math.min(this.outer.clientWidth, this.maxExtent);
    this._height = Math.min(this.outer.clientHeight, this.maxExtent);

    this._top = this.outer.scrollTop;
    this._left = this.outer.scrollLeft;
};

Object.defineProperties(Viewport.prototype, {
    top: getCoordinateDescriptor('top'),
    left: getCoordinateDescriptor('left'),

    width: getDimensionDescriptor('width'),
    height: getDimensionDescriptor('height'),

    bottom: {
        get: function ()
        {
            return this._top + this._height;
        }
    },
    right: {
        get: function ()
        {
            return this._left + this._width;
        }
    }
});

function getCoordinateDescriptor(coord)
{
    var privateProp = '_' + coord;
    var source = 'scroll' + coord.charAt(0).toUpperCase() + coord.slice(1);

    return {
        get: function ()
        {
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
            this[privateProp] = this.outer[source] = newValue;
        }
    };
}

function getDimensionDescriptor(dimen)
{
    return {
        get: function ()
        {
            return this['_' + dimen];
        }
    };
}

function fallsBetween(point, start, end)
{
    return point >= start && point <= end;
}
