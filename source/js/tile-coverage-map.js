export default class TileCoverageMap
{
    constructor (rows, cols)
    {
        this._rows = rows;
        this._cols = cols;
        this._map = new Array(rows).fill(null).map(() => new Array(cols).fill(false));
    }

    isLoaded (row, col)
    {
        // Return true for out of bounds tiles because they
        // don't need to load. (Unfortunately this will also
        // mask logical errors.)
        if (row >= this._rows || col >= this._cols)
            return true;

        return this._map[row][col];
    }

    set(row, col, value)
    {
        this._map[row][col] = value;
    }
}