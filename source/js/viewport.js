module.exports = Viewport;

function Viewport(outer, options)
{
    options = options || {};

    this.intersectionTolerance = options.intersectionTolerance || 0;
    this.maxExtent = options.maxExtent || 2000;

    this.outer = outer;

    this._top = this._left = this._width = this._height = this._innerDimensions = null;

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
    // FIXME: Should this check the inner dimensions as well?
    this._width = clampMax(this.outer.clientWidth, this.maxExtent);
    this._height = clampMax(this.outer.clientHeight, this.maxExtent);

    this._top = this.outer.scrollTop;
    this._left = this.outer.scrollLeft;
};

Viewport.prototype.setInnerDimensions = function (dimensions)
{
    this._innerDimensions = dimensions;

    if (dimensions)
    {
        this._top = clamp(this._top, 0, dimensions.height - this._height);
        this._left = clamp(this._left, 0, dimensions.width - this._width);
    }
};

Object.defineProperties(Viewport.prototype, {
    top: getCoordinateDescriptor('top', 'height'),
    left: getCoordinateDescriptor('left', 'width'),

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

function getCoordinateDescriptor(coord, associatedDimension)
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
            var normalized;

            if (this._innerDimensions)
            {
                var maxAllowed = this._innerDimensions[associatedDimension] - this[associatedDimension];
                normalized = clamp(newValue, 0, maxAllowed);
            }
            else
            {
                normalized = clampMin(newValue, 0);
            }

            this[privateProp] = this.outer[source] = normalized;
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

function clamp(value, min, max)
{
    return clampMin(clampMax(value, max), min);
}

function clampMin(value, min)
{
    return Math.max(value, min);
}

function clampMax(value, max)
{
    return Math.min(value, max);
}
