import React, { useContext, useEffect, useRef, useState } from 'react';
import { ExpandAltOutlined } from '@ant-design/icons';
import { MapContext } from '..';
import { MapMode } from '.';
import { ControllableModal, ControllableModalRef } from '../components/controllableModal';

export function Modal( { children }: { children?: React.ReactNode }): JSX.Element {
    const { mode, hidden, settings } = useContext( MapContext );
    const ref = useRef<ControllableModalRef>();

    const [ savedPosition, setSavedPosition ] = useState<{ x: number, y: number, width: number, height: number } | null>( null );
    const [ isVisible, setVisible ] = useState( true );

    const [ , setForceUpdate ] = useState( 0 );

    useEffect( () => {
        let counter = 0;

        const listener = () => {
            setSavedPosition( null );
            setForceUpdate( ++counter );
        };

        window.addEventListener( 'resize', listener );

        return () => window.removeEventListener( 'resize', listener );
    }, [] );

    useEffect( () => {
        if( mode === MapMode.NORMAL )
            return;

        if( mode === MapMode.MINIMAP ) {

            if( !savedPosition )
                setSavedPosition( {
                    x     : ref.current.x,
                    y     : ref.current.y,
                    width : ref.current.width,
                    height: ref.current.height,
                } );

            const width = 0.2 * window.innerWidth;
            const height = 0.25 * window.innerHeight;

            let x: number, y: number;

            if( settings.minimapCorner === 1 )
                x = 0, y = 0;
            else if( settings.minimapCorner === 2 )
                x = window.innerWidth - width, y = 0;
            else if( settings.minimapCorner === 3 )
                x = 0, y = window.innerHeight - height;
            else if( settings.minimapCorner === 4 )
                x = window.innerWidth - width, y = window.innerHeight - height;

            ref.current.resize( x, y, width, height );
            ref.current.move( x, y );
        } else if( mode === MapMode.MAP && savedPosition && isVisible ) {
            ref.current.resize( savedPosition.x, savedPosition.y, savedPosition.width, savedPosition.height );
            ref.current.move( savedPosition.x, savedPosition.y );
            setSavedPosition( null );
        }
    }, [ mode, settings.minimapCorner, isVisible, hidden ] );

    if( mode === MapMode.NORMAL )
        return children as JSX.Element;

    return <>
        <ControllableModal
            visible={mode === MapMode.MINIMAP || isVisible}
            footer={null}
            destroyOnClose={false}
            onCancel={() => setVisible( false )}
            zIndex={2000}
            initialHeight={window.innerHeight * 0.7}
            initialWidth={window.innerWidth * 0.5}
            initialY={window.innerHeight * 0.15}
            initialX={window.innerWidth * 0.25}
            ref={ref}
            className={[ 'map-modal', mode === MapMode.MINIMAP ? 'minimap' : null ].join( ' ' )}
        >
            {children}
        </ControllableModal>
        {mode === MapMode.MAP && !isVisible && <div
            style={{ position: 'absolute', bottom: 0, left: 0, margin: 20 }}
        >
            <ExpandAltOutlined 
                style={{
                    backgroundColor: 'white',
                    padding: 10,
                    fontSize: 32,
                    borderRadius: 5,
                    cursor: 'pointer'
                }}
                onClick={() => setVisible( true )}
            />
        </div>}
    </>;
}