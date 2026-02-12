import "openseadragon";

declare module "openseadragon"
{
    namespace OpenSeadragon
    {
    interface Viewer
    {
        filterPluginInstance?: any;
    }
    }
}
