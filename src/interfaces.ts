export interface IMarker {
    lat?: number;
    lon?: number;
    text?: string | L.Marker<any>;
    icon?: string | L.Marker<any>;
    label?: string;
    "label-direction"?: string;
}

export interface IPinpointOptions {
    "aspect-ratio"?: string;
    basemap?: string;
    basemapCredit?: string;
    creation?: boolean;
    dek?: string;
    dragend?: () => void;
    el?: string;
    element?: string;
    geojson?: boolean;
    hed?: string;
    lat?: number;
    lon?: number;
    markerdragend?: () => void;
    markers?: IMarker[];
    minimap?: boolean;
    "minimap-zoom-offset"?: number;
    note?: string;
    nozoomlimits?: boolean;
    zoom?: number;
    zoomend?: () => void;
}
