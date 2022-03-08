import { createContext } from "react";
import L from 'leaflet';
import { BuildSpline, BuildSplinePoints, World } from "@rrox/types";
import { EngineControls } from "@rrox/types";

export interface MapSettings {
    background   : number;
    minimapCorner: number;
    transparent  : boolean;
}

export interface MapActions {
    teleport             : ( x: number, y: number, z?: number ) => void;
    changeSwitch         : ( id: number ) => void;
    setEngineControls    : ( id: number, type: EngineControls, value: number ) => void;
    setMoneyAndXP        : ( name: string, money?: number, xp?: number ) => void;
    setCheats            : ( name: string, walkSpeed?: number, flySpeed?: number ) => void;
    setControlsSynced    : ( id: number, enabled: boolean ) => void;
    getColor             : ( key: string ) => string;
    getSelectedPlayerName: () => string;
    buildSplines         : ( splines: BuildSpline[], simulate: boolean ) => Promise<false | BuildSplinePoints[]>;
    openControlsExternal : ( ID: number ) => void;
    openNewTab           : ( url: string ) => void;
    locate               : ( ID: number, type: keyof World ) => void;
}

export interface MapContextData {
    settings: MapSettings,
    actions: MapActions,
    map: {
        bounds     : L.LatLngBounds;
        center     : L.LatLng;
        minZoom    : number;
        maxZoom    : number;
        initialZoom: number;
        scale      : number;
    },
    utils: {
        scalePoint ( x: number, y: number, z?: number ): [ lat: number, long: number ];
        scaleNumber( num: number ): number;
        
        revertScalePoint( lat: number, long: number ): [ x: number, y: number ];

        rotate( cx: number, cy: number, x: number, y: number, angle: number ): [ x: number, y: number ];
    },
    follow: {
        array?: keyof World,
        id?: number;
        enabled: boolean;
        setFollowing<A extends keyof World>( array?: A, id?: number, apply?: ( data: World[ A ][ number ], map: L.Map ) => void ): void;
    },
    features: MapFeatures;
    mode: MapMode;
    hidden: boolean;
}

export interface MapFeatures {
    teleport: boolean;
    controlEngines: boolean;
    controlSwitches: boolean;
    build: boolean;
    cheats: boolean;
}

export interface GamepadAxisSettings {
    index: number;
    invert: boolean;
}

export interface GamepadSettings {
    device: string;
    regulatorAxis: GamepadAxisSettings;
    brakeAxis: GamepadAxisSettings;
    reverserAxis: GamepadAxisSettings;
}

export enum MapMode {
    // Normal mode, when showing map in desktop app
    NORMAL = 'normal',

    // Large map in-game after pressing F1
    MAP = 'map',

    // In-game minimap
    MINIMAP = 'minimap',
}

export const MapContext = createContext<MapContextData>( null );