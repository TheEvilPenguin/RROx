import React from 'react';
import { CoupledFrameItem } from '@rrox/utils';
import { FrameDefinitions } from '../../mapLeaflet';
import { Frame } from '@rrox/types';

export function CouplingsBar( {
    coupledFrames,
    selectedID,
    setSelectedID
}: {
    coupledFrames: CoupledFrameItem[],
    selectedID: number,
    setSelectedID: ( ID: number ) => void,
} ) {
    return <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', width: '100%', minHeight: 50 }}>
        {coupledFrames.map( ( { frame, flipped, isCoupled }, i ) => {
            const definition = FrameDefinitions[ frame.Type ];

            return <img
                width={50}
                style={{
                    transform: flipped ? 'scaleX(-1)' : null,
                    cursor: 'pointer',
                    backgroundColor: frame.ID === selectedID ? '#999' :
                        ( !isCoupled ? '#ff8383' : null )
                }}
                src={definition.imageIcon}
                onClick={() => setSelectedID( frame.ID )}
                key={i}
            />
        } )}
    </div>;
}