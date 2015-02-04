///<reference path='refs.ts'/>
module TDev.RT.Wab {
    export function ArtCacheInit()
    {
        ArtCache.getMaxItems = ArtCacheWab.getMaxItems;
    }

    export module ArtCacheWab {
        export function getMaxItems() { return 500; }
    }
}
