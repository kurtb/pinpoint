import * as L from "leaflet";
import MiniMap from "leaflet-minimap";

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

export class Pinpoint {
    private element: HTMLElement;
    private map: L.Map;
    private markers = new Array<IMarker>();
    private resizeInterval: number;

    constructor(private opts: IPinpointOptions) {
        this.opts.el = this.opts.element || this.opts.el || "#map-el";
        this.element = document.querySelector(this.opts.el);
        this.opts.basemap = opts.basemap || "http://{s}.tile.osm.org/{z}/{x}/{y}.png";
        this.opts.basemapCredit =
            opts.basemapCredit ||
            '<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> ' +
            '| &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';

        this.addElements();
        this.fillText();
        this.setAspectRatio();
        this.setupMap(opts);
        this.calcBounds();

        this.disableInteraction();

        if (this.opts.creation) {
            this.enableInteraction();
            this.map.remove();
            this.map.setMaxBounds(null);
            this.setupMap({ nozoomlimits: true });
        }

        this.element.querySelector(".map-outer").addEventListener("click", () => this.enableInteraction());

        if (opts.minimap) {
            this.addMinimap();
        }

        for (let i = 0; i < opts.markers.length; i++) {
            this.addMarker(opts.markers[i], i);
        }

        if (opts.geojson) {
            this.addGeoJSON(opts.geojson);
        }

        // What does this do?
        // if (typeof Iframe !== 'undefined') {
        //     var fm = Iframe.init();
        // }

        this.onResize(() => {
            this.setAspectRatio();
        });
    }

    public addElements() {
        // tslint:disable:max-line-length
        const pointer = '<!-- Generator: Adobe Illustrator 16.0.1, SVG Export Plug-In . SVG Version: 6.00 Build 0)  --><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_5" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"	 width="13.312px" height="15.267px" viewBox="0 0 13.312 15.267" enable-background="new 0 0 13.312 15.267" xml:space="preserve"><path fill="#697379" d="M13.312,6.4c0.002-1.229-2.215-1.265-2.203,0.008c0,0,0-0.604,0-0.846c0.016-1.146-2.188-1.216-2.2,0.007	v-0.44c0-1.251-2.307-1.277-2.307,0.007c0,0,0-2.586,0-4.218c0-1.203-2.341-1.246-2.341,0.005v7.485L2.049,6.199	C1.292,5.286-0.58,6.604,0.177,7.68l5.129,6.233c0,0,1.097,1.354,3.285,1.354c1.963,0,2.704-0.394,3.481-1.2	c0.754-0.78,1.24-1.657,1.24-2.938C13.312,10.76,13.312,7.192,13.312,6.4z"/></svg>';
        const html = '<p class="pinpoint-hed"></p>' +
            '<p class="pinpoint-dek"></p>' +
            '<div class="map-outer inactive">' +
            '<span class="map-cover"></span>' +
            '<span class="image-interactive-icon">' + pointer + '<span class="image-interactive-icon-text">Zoom/Pan</span></span>' +
            '<span class="image-interactive-icon image-interactive-icon-hover">' + pointer.replace("#697379", "white") + '<span class="image-interactive-icon-text">Zoom/Pan</span></span>' +
            '<div class="map-inner"></div>' +
            " </div>" +
            ' <p class="pinpoint-note"></p>' +
            ' <p class="pinpoint-source">' + this.opts.basemapCredit + "</p>";
        // tslint:enable:max-line-length
        this.element.innerHTML = html;
    }

    public setAspectRatio() {
        if (!this.element.querySelector(".map-inner")) {
            return;
        }

        const aspectRatios = {
            square: 1,
            tall: 1.2,
            wide: (2 / 3),
        };

        const aspectRatio = aspectRatios[this.opts["aspect-ratio"]];
        const mapInner = this.element.querySelector(".map-inner") as HTMLElement;
        const newHeight = mapInner.offsetWidth * aspectRatio;
        const widthEls = this.element.querySelectorAll(".map-inner, .map-cover") as NodeListOf<HTMLElement>;

        for (const widthEl of widthEls) {
            widthEl.style.height = newHeight + "px";
        }

        if (this.map) {
            this.map.invalidateSize();
        }
    }

    public setupMap(opts: IPinpointOptions) {
        let maxZoom = opts.zoom + 1;
        let minZoom = opts.zoom - 1;
        if (opts && opts.nozoomlimits) {
            maxZoom = 20;
            minZoom = 1;
        }

        const mapOptions = {
            attributionControl: false,
            keyboard: false,
            maxZoom,
            minZoom,
            scrollWheelZoom: true,
        };

        const mapEl = this.element.querySelector(".map-inner") as HTMLElement;
        this.map = L.map(mapEl, mapOptions)
            .setView([opts.lat, opts.lon], opts.zoom);
        L.control.scale({ position: "topright" }).addTo(this.map); // scale bar

        // put miles on top of km
        const scaleParent = this.element.querySelector(".leaflet-control-scale.leaflet-control");
        const scaleLine = scaleParent.querySelector(".leaflet-control-scale-line");
        scaleParent.appendChild(scaleLine);

        L.tileLayer(this.opts.basemap).addTo(this.map);

        if (opts.dragend) {
            this.map.on("dragend", opts.dragend);
        }

        if (opts.zoomend) {
            this.map.on("zoomend", opts.zoomend);
        }
    }

    public addMarker(mopts, index) {
        this.markers = this.markers || [];
        mopts.icon = mopts.icon || "circle";
        // set the icon type
        const squareIcon = L.divIcon({
            className: "marker-icon marker-icon-" + mopts.icon,
        });
        const icon = L.marker(
            [mopts.lat, mopts.lon],
            {
                draggable: this.opts.creation,
                icon: squareIcon,
                title: index,
            },
        ).addTo(this.map);
        mopts.label = mopts.label || "plain";
        const labelDir = mopts["label-direction"] || "north";
        let textBox: L.DivIcon;
        if (mopts.label === "callout") {
            textBox = L.divIcon({
                className: "marker-label-callout " + labelDir,
                html: '<div class="marker-inner">' + mopts.text + "</div>",
            });
        } else if (mopts.label === "plain") {
            textBox = L.divIcon({
                className: "marker-label-plain " + labelDir,
                html: '<div class="marker-inner">' + mopts.text + "</div>",
            });
        }
        const text = L.marker(
            [mopts.lat, mopts.lon],
            {
                icon: textBox,
            },
        ).addTo(this.map);

        // you can set .my-div-icon styles in CSS

        // L.marker([50.505, 30.57]).addTo(map);

        const miList = this.element.querySelectorAll<HTMLElement>(".marker-inner");
        for (const mi of miList) {
            mi.style.marginLeft = (-mi.offsetWidth / 2) + "px";
            setTimeout(
                () => {
                    mi.style.marginLeft = (-mi.offsetWidth / 2) + "px";
                },
                100);
        }

        if (this.opts.markerdragend) {
            icon.on("dragend", this.opts.markerdragend);
        }

        this.markers.push({
            icon,
            text,
        });
    }

    public addMinimap() {
        const minitiles = L.tileLayer(
            this.opts.basemap, {
                attribution: "",
            });

        const miniMap = new MiniMap(
            minitiles,
            {
                aimingRectOptions: {
                    color: "black",
                    fillColor: "#999",
                    fillOpacity: 0,
                    opacity: 1,
                    weight: 1,
                },
                height: 100,
                width: 100,
                zoomLevelOffset: this.opts["minimap-zoom-offset"] || -5,
            }).addTo(this.map);

        // Disable drag and zoom handlers.
        miniMap._miniMap.dragging.disable();
        miniMap._miniMap.touchZoom.disable();
        miniMap._miniMap.doubleClickZoom.disable();
        miniMap._miniMap.scrollWheelZoom.disable();

        // Disable tap handler, if present.
        if (miniMap._miniMap.tap) { miniMap._miniMap.tap.disable(); }
    }

    public calcBounds() {
        const bounds = calcNewMaxBounds(this.map);
        this.map.setMaxBounds(bounds);

        function calcNewMaxBounds(map) {
            // add an extra 30% margin to bounds
            const boundScaleFactor = 1 / 3;

            const current = map.getBounds();
            const hori = Math.abs(current._southWest.lng - current._northEast.lng) * boundScaleFactor;
            const vert = Math.abs(current._southWest.lat - current._northEast.lat) * boundScaleFactor;
            const southWest = {
                lat: current._southWest.lat - vert,
                lng: current._southWest.lng - hori,
            };
            const northEast = {
                lat: current._northEast.lat + vert,
                lng: current._northEast.lng + hori,
            };
            return L.latLngBounds(southWest, northEast);
        }
    }

    public fillText() {
        if (this.opts.hed && (this.opts.hed.length > 0)) {
            this.element.querySelector<HTMLElement>(".pinpoint-hed").innerText = this.opts.hed;
        } else {
            this.element.querySelector<HTMLElement>(".pinpoint-hed").style.display = "none";
        }
        if (this.opts.dek && (this.opts.dek.length > 0)) {
            this.element.querySelector<HTMLElement>(".pinpoint-dek").innerText = this.opts.dek;
        } else {
            this.element.querySelector<HTMLElement>(".pinpoint-dek").style.display = "none";
        }
        if (this.opts.note && (this.opts.note.length > 0)) {
            this.element.querySelector(".pinpoint-note").innerHTML = this.opts.note;
        } else {
            this.element.querySelector<HTMLElement>(".pinpoint-note").style.display = "none";
        }
        const hedDek = this.element.querySelectorAll<HTMLElement>(".pinpoint-hed, .pinpoint-dek");
        for (const element of hedDek) {
            if (element.offsetWidth > 0 && element.offsetHeight > 0) {
                element.className = element.className + " pinpoint-topline";
            }
        }
    }

    public disableInteraction() {
        this.element.querySelector(".map-outer").className += " inactive";
        // map.dragging.disable();
        // map.touchZoom.disable();
        // map.doubleClickZoom.disable();
        // // map.scrollWheelZoom.disable();
        // map.boxZoom.disable();
        // map.keyboard.disable();
        return this;
    }

    public enableInteraction() {
        const outer = this.element.querySelector(".map-outer");
        outer.className = outer.className.replace(/inactive/g, "");

        // map.dragging.enable();
        // map.touchZoom.enable();
        // map.doubleClickZoom.enable();
        // // map.scrollWheelZoom.enable();
        // map.boxZoom.enable();
        // map.keyboard.enable();
        return this;
    }

    public remove() {
        clearInterval(this.resizeInterval);
        // this.map.outerHTML = '';
        this.element.innerHTML = "";
    }

    public addGeoJSON(geojson) {
        const map = this.map;
        const features = geojson.features;
        for (const feature of features) {
            if (feature.geometry && feature.geometry) {
                let styleName;
                if (feature.properties && feature.properties.pinpointStyle) {
                    styleName = feature.properties.pinpointStyle;
                } else {
                    styleName = "";
                }

                const type = feature.geometry.type;
                if (this.isOneOf(type, ["LineString", "MultiLineString", "Polygon", "MultiPolygon"])) {
                    L.geoJSON(feature.geometry, {
                        style: {
                            className: "pinpoint-geojson " + styleName,
                        } as any,
                    }).addTo(map);
                }
            }
        }
    }

    public onResize(callback) {
        let currentWidth = this.element.offsetWidth;
        this.resizeInterval = setInterval(function() {
            if (currentWidth !== this.element.offsetWidth) {
                currentWidth = currentWidth;
                callback();
            }
        }.bind(this), 50);
    }

    private isOneOf(needle, haystack) {
        for (const element of haystack) {
            if (element === needle) {
                return true;
            }
        }
        return false;
    }
}
