import React, { useContext, useState } from 'react';
import { Frame as FrameData } from "@rrox/types";
import { MapContext, MapMode, GamepadSettings } from '../context';
import { Shape } from '../leaflet/shape';
import { FrameDefinitions } from '../definitions/Frame';
import { MapTooltip } from '../leaflet/tooltip';
import { Button } from 'antd';
import { FrameControlsPopup } from '../popups/FrameControls';
import { StorageInfo } from '../popups/StorageInfo';
import { Cars } from '@rrox/types';
import L from 'leaflet';

const getStrokeColor = ( brake: number ) => {
    if( brake > 0.5 )
        return 'red';
    else if( brake > 0.2 )
        return 'orange';
    else
        return 'black';
};

export const Frame = React.memo( function Frame( { data, frames, gamepadSettings }: { data: FrameData, frames: FrameData[], gamepadSettings: GamepadSettings } ) {
    const { utils, mode, follow, actions, features } = useContext( MapContext );

    const { ID, Location, Rotation, Type, Freight, Number, Name, Brake } = data;

    const definition = FrameDefinitions[ Type ];

    const [ controlsVisible, setControlsVisible ] = useState( false );
    const [ storageVisible, setStorageVisible ] = useState( false );
    const [ tooltipVisible, setTooltipVisible ] = useState( false );
    
    const anchor = utils.scalePoint( ...Location );

    if( definition.engine )
        return <Shape
                positions={[
                    utils.scalePoint( 0, definition.length / 2 ),
                    utils.scalePoint( 100, definition.length / 6 ),
                    utils.scalePoint( 100, -definition.length / 2 ),
                    utils.scalePoint( -100, -definition.length / 2 ),
                    utils.scalePoint( -100, definition.length / 6 ),
                ]}
                anchor={anchor}
                rotation={Math.round( Rotation[ 1 ] ) - 90}
                color={getStrokeColor( Brake )}
                fillColor={actions.getColor( Type )}
                fillOpacity={1}
                interactive
            >
                <MapTooltip
                    title={`${Name.replace("<br>", "").toUpperCase()}${Name && Number ? ' - ' : ''}${Number.toUpperCase() || ''}`}
                    visible={tooltipVisible && mode !== MapMode.MINIMAP}
                    setVisible={setTooltipVisible}
                >
                    <img src={definition.image} width={100} height={100} style={{ margin: '-10px auto 20px auto' }} alt="Tooltip Icon" />
                    <Button onClick={() => {
                        setTooltipVisible( false );
                        setControlsVisible( true );
                    }}>Open Controls</Button>
                    <Button
                        style={{ marginTop: 5 }}
                        onClick={() => {
                            if ( follow.array === 'Frames' && follow.id === ID )
                                follow.setFollowing();
                            else
                                follow.setFollowing( 'Frames', ID, ( data, map ) => {
                                    const anchor = utils.scalePoint( ...data.Location );
                                    map.panTo( L.latLng( anchor[ 0 ], anchor[ 1 ] ), { animate: true, duration: 0.5 } );
                                } );
                            setTooltipVisible( false );
                        }}
                    >
                        {follow && follow.array === 'Frames' && follow.id === ID ? 'Unfollow' : 'Follow'}
                    </Button>
                    {features.teleport && <Button
                        style={{ marginTop: 5 }}
                        onClick={() => actions.teleport( data.Location[ 0 ], data.Location[ 1 ], data.Location[ 2 ] + 500 )}
                    >Teleport Here</Button>}
                </MapTooltip>
                <FrameControlsPopup
                    title={`${Name.replace("<br>", "").toUpperCase()}${Name && Number ? ' - ' : ''}${Number.toUpperCase() || ''}`}
                    data={data}
                    frames={frames}
                    id={ID}
                    isVisible={controlsVisible}
                    className={mode === MapMode.MINIMAP ? 'modal-hidden' : undefined}
                    controlEnabled={features.controlEngines}
                    onClose={() => {
                        setControlsVisible( false );
                        setTooltipVisible( false );
                    }}
                    gamepadSettings={gamepadSettings}
                />
            </Shape>;

    let frameTitle = Name || Number ? (Name.replace("<br>", "").toUpperCase()) + (Name && Number ? ' - ' : '') + (Number.toUpperCase() || '') : (definition.name || 'Freight Car');
    return <Shape
        positions={[
            utils.scalePoint( 100, definition.length / 2 ),
            utils.scalePoint( 100, -definition.length / 2 ),
            utils.scalePoint( -100, -definition.length / 2 ),
            utils.scalePoint( -100, definition.length / 2 ),
        ]}
        anchor={anchor}
        rotation={Math.round( Rotation[ 1 ] ) - 90}
        color={getStrokeColor( Brake )}
        fillColor={definition.freight
                ? actions.getColor( `${Type}.${Freight && Freight.Amount > 0 ? 'loaded' : 'unloaded'}` )
                : actions.getColor( Type )}
        fillOpacity={1}
        interactive
    >
        <MapTooltip
            title={frameTitle}
            visible={tooltipVisible && mode !== MapMode.MINIMAP}
            setVisible={setTooltipVisible}
        >
            <img src={definition.image} width={100} height={100} style={{ margin: '-10px auto 20px auto' }} alt="Tooltip Icon"/>
            <Button onClick={() => {
                setTooltipVisible( false );
                setControlsVisible( true );
            }}>Open Controls</Button>
            {data.Freight && <Button
                style={{ marginTop: 5 }}
                onClick={() => {
                    setTooltipVisible( false );
                    setStorageVisible( true );
                }}
            >Show Freight</Button>}
            {features.teleport && Type === Cars.CABOOSE && <Button
                style={{ marginTop: 5 }}
                onClick={() => actions.teleport( data.Location[ 0 ], data.Location[ 1 ], data.Location[ 2 ] )}
            >Teleport Here</Button>}
        </MapTooltip>
        <FrameControlsPopup
            title={frameTitle}
            data={data}
            frames={frames}
            id={ID}
            isVisible={controlsVisible}
            className={mode === MapMode.MINIMAP ? 'modal-hidden' : undefined}
            controlEnabled={features.controlEngines}
            onClose={() => {
                setControlsVisible( false );
                setTooltipVisible( false );
            }}
            gamepadSettings={gamepadSettings}
        />
        <StorageInfo
            title={frameTitle}
            className={mode === MapMode.MINIMAP ? 'modal-hidden' : undefined}
            storages={{
                Freight: Freight ? [ Freight ] : []
            }}
            isVisible={storageVisible}
            onClose={() => {
                setStorageVisible( false );
                setTooltipVisible( false );
            }}
        />
    </Shape>;
} );