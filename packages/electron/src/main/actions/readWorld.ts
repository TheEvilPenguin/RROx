import { Action } from "./action";
import { PipeType } from "../pipes";
import { Frame, Player, Spline, Switch, Turntable, WaterTower, Sandhouse, Industry, World, Products, IndustryType, Cars } from "@rrox/types";
import Log from 'electron-log';

export enum ReadWorldMode {
    HOST_FULL    = 0, // When server host: read full world including splines
    HOST_PARTIAL = 1, // When server host: read world excluding splines
    CLIENT       = 2, // When client: will read limited data as not the entire world is transmitted
}

type CouplingsData = {
    fromFrame?: Frame,
    toFrame  ?: Frame,
    type     ?: 'front'|'rear',
    isCoupled?: boolean;
};
type CouplingsMap = Map<bigint, CouplingsData>;

export class ReadWorldAction extends Action<World, [ mode: ReadWorldMode ]> {

    public actionID   = 'R';
    public actionName = 'Read World';
    public pipes      = [ PipeType.CheatEngineData ];

    /**
     * Execute the read world action
     * @param full Full world read (whether or not to include splines)
     */
    protected async execute( mode: ReadWorldMode ) {
        await this.acquire();

        let pipe = this.app.getPipe( PipeType.CheatEngineData );

        const data: World = {
            Frames     : [],
            Players    : [],
            Switches   : [],
            Turntables : [],
            WaterTowers: [],
            Sandhouses : [],
            Industries : [],
            Splines    : [],
        };

        const couplings: CouplingsMap = new Map();

        pipe.writeString( this.actionID );
        pipe.writeInt( Number( mode ) );

        while ( true ) {
            let nameLength = await pipe.readInt();
            if ( nameLength === 0 )
                break;

            let arrayName = await pipe.readString( nameLength );

            let arraySize = 0;
            if ( mode !== ReadWorldMode.CLIENT )
                arraySize = await pipe.readInt();

            let array: unknown[];
            let method: () => Promise<unknown>;

            if ( arrayName === 'Player' || arrayName === 'PlayerMulti' ) {
                array = data.Players;
                method = () => this.readPlayer();
            } else if ( arrayName === 'FrameCar' ) {
                array = data.Frames;
                method = () => this.readFrame( couplings );
            } else if ( arrayName === 'Turntable' ) {
                array = data.Turntables;
                method = () => this.readTurntable();
            } else if ( arrayName === 'Switch' ) {
                array = data.Switches;
                method = () => this.readSwitch();
            } else if ( arrayName === 'WaterTower' ) {
                array = data.WaterTowers;
                method = () => this.readWaterTower();
            } else if ( arrayName === 'Sandhouse' ) {
                array = data.Sandhouses;
                method = () => this.readSandhouse();
            } else if ( arrayName === 'Industry' ) {
                array = data.Industries;
                method = () => this.readIndustry();
            } else if ( arrayName === 'Spline' ) {
                array = data.Splines;
                method = () => this.readSpline();
            }

            const read = async ( i: number | string = '' ) => {
                try {
                    array.push( await method() );
                } catch ( e ) {
                    Log.warn( `Error while reading ${arrayName} ${i}:`, e );
                    pipe.close();
                    return data;
                }
            };

            if ( mode === ReadWorldMode.CLIENT )
                await read();
            else
                for ( let i = 0; i < arraySize; i++ )
                    await read( i );
        }

        this.processFrameCouplings( couplings );

        return data;
    }

    private async readPlayer(): Promise<Player> {
        let pipe = this.app.getPipe( PipeType.CheatEngineData );

        return {
            ID  : await pipe.readInt(),
            Name: await pipe.readString( await pipe.readInt() ),
            Location: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ],
            Rotation: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ]
        }
    }

    private async readFrame( couplings: CouplingsMap ): Promise<Frame> {
        let pipe = this.app.getPipe( PipeType.CheatEngineData );

        let ID   = await pipe.readInt();
        let Type = await pipe.readString( await pipe.readInt() );
        let Name = await pipe.readString( await pipe.readInt() );

        if( Name.endsWith( '<br>' ) )
            Name = Name.slice( 0, -4 );

        let frame: Frame = {
            ID    : ID,
            Type  : Type as Cars,
            Name  : Name,
            Number: await pipe.readString( await pipe.readInt() ),
            Location: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ],
            Rotation: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ],
            Regulator        : await pipe.readFloat(),
            Reverser         : await pipe.readFloat(),
            Brake            : await pipe.readFloat(),
            Whistle          : await pipe.readFloat(),
            Generator        : await pipe.readFloat(),
            Compressor       : await pipe.readFloat(),
            BoilerPressure   : await pipe.readFloat(),
            MaxBoilerPressure: await pipe.readFloat(),
            WaterTemperature : await pipe.readFloat(),
            WaterLevel       : await pipe.readFloat(),
            MaxWaterLevel    : await pipe.readFloat(),
            AirPressure      : await pipe.readFloat(),
            FireTemperature  : await pipe.readFloat(),
            FuelAmount       : await pipe.readFloat(),
            MaxFuelAmount    : await pipe.readFloat(),
            Speed            : await pipe.readFloat(),
            MaxSpeed         : await pipe.readInt(),
            Tender           : {
                FuelAmount   : await pipe.readFloat(),
                MaxFuelAmount: await pipe.readFloat(),
                WaterLevel   : await pipe.readFloat(),
                MaxWaterLevel: await pipe.readFloat(),
            },
            Freight          : {
                Amount: await pipe.readInt(),
                Max   : await pipe.readInt(),
                Type  : await pipe.readString( await pipe.readInt() ),
            },
            Couplings: {
                FrontID: null,
                RearID : null,
                FrontCoupled: false,
                RearCoupled : false,
            },
            SyncControls: false,
        };

        if( frame.Freight.Max === 0 )
            frame.Freight = null;
        if( frame.Tender.MaxFuelAmount === 0 )
            frame.Tender = null;

        let frontCouplerAddr   = await pipe.readInt64();
        let frontCoupledToAddr = await pipe.readInt64();
        let isCoupledFront     = Boolean( await pipe.readByte() );
        let rearCouplerAddr   = await pipe.readInt64();
        let rearCoupledToAddr = await pipe.readInt64();
        let isCoupledRear     = Boolean( await pipe.readByte() );

        const setCoupler = ( type: 'front-from' | 'rear-from' | 'front-to' | 'rear-to', addr: bigint, isCoupled: boolean ) => {
            let data: CouplingsData = {};

            if( couplings.has( addr ) ) 
                data = couplings.get( addr );
            else
                couplings.set( addr, data );

            if( type === 'front-from' ) {
                data.type = 'front';
                data.isCoupled = isCoupled;
                data.fromFrame = frame;
            } else if( type === 'rear-from' ) {
                data.type = 'rear';
                data.isCoupled = isCoupled;
                data.fromFrame = frame;
            } else if( type === 'front-to' )
                data.toFrame = frame;
            else if( type === 'rear-to' )
                data.toFrame = frame;
        }

        setCoupler( 'front-from', frontCouplerAddr  , isCoupledFront );
        setCoupler( 'rear-from' , rearCouplerAddr   , isCoupledRear );
        setCoupler( 'front-to'  , frontCoupledToAddr, isCoupledFront );
        setCoupler( 'rear-to'   , rearCoupledToAddr , isCoupledRear );

        return frame;
    }

    private processFrameCouplings( couplings: CouplingsMap ) {
        couplings.forEach( ( { type, isCoupled, fromFrame, toFrame } ) => {
            if( !type || !fromFrame || !toFrame )
                return; //Incomplete data, cannot set

            if( type === 'front' ) {
                fromFrame.Couplings.FrontID      = toFrame.ID;
                fromFrame.Couplings.FrontCoupled = isCoupled;
            } else if( type === 'rear' ) {
                fromFrame.Couplings.RearID      = toFrame.ID;
                fromFrame.Couplings.RearCoupled = isCoupled;
            }
        } );
    }

    private async readSwitch(): Promise<Switch> {
        let pipe = this.app.getPipe( PipeType.CheatEngineData );

        return {
            ID    : await pipe.readInt(),
            Type  : await pipe.readInt(),
            Side  : await pipe.readInt(),
            Location: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ],
            Rotation: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ]
        }
    }

    private async readTurntable(): Promise<Turntable> {
        let pipe = this.app.getPipe( PipeType.CheatEngineData );

        return {
            ID      : await pipe.readInt(),
            Location: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ],
            Rotation: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ],
            Deck: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ]
        }
    }

    private async readWaterTower(): Promise<WaterTower> {
        let pipe = this.app.getPipe( PipeType.CheatEngineData );

        return {
            ID      : await pipe.readInt(),
            Location: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ],
            Rotation: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ],
            Storage: {
                Amount: await pipe.readFloat(),
                Max   : await pipe.readFloat(),
                Type  : await pipe.readString( await pipe.readInt() ) ,
            }
        }
    }

    private async readSandhouse(): Promise<Sandhouse> {
        let pipe = this.app.getPipe( PipeType.CheatEngineData );

        return {
            ID: await pipe.readInt(),
            Location: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ],
            Rotation: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ],
            Storage: {
                Amount: await pipe.readFloat(),
                Max: await pipe.readFloat(),
                Type: await pipe.readString( await pipe.readInt() ),
            }
        }
    }

    private async readIndustry(): Promise<Industry> {
        let pipe = this.app.getPipe( PipeType.CheatEngineData );

        let industry = {
            ID  : await pipe.readInt(),
            Type: await pipe.readInt(),
            Location: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ],
            Rotation: [
                await pipe.readFloat(),
                await pipe.readFloat(),
                await pipe.readFloat(),
            ],
            Educts: [],
            Products: []
        } as Industry;

        let productsAndEducts = [];
        for( let i = 0; i < 8; i++ )
            productsAndEducts.push( {
                Amount: await pipe.readFloat(),
                Max: await pipe.readFloat(),
                Type: await pipe.readString( await pipe.readInt() ) ,
            } );

        productsAndEducts.forEach( ( item, i ) => {
            if( item.Type === '' )
                return;
            else if( i < 4 )
                industry.Educts.push( item );
            else
                industry.Products.push( item );
        } );

        if( industry.Type === IndustryType.IRONWORKS )
            industry.Products = industry.Products.map( ( p ) => p.Type === Products.RAWIRON ? {
                ...p,
                Type: Products.STEELPIPES,
            } : p );

        return industry;
    }

    private async readSpline(): Promise<Spline> {
        let pipe = this.app.getPipe( PipeType.CheatEngineData );

        let data: Spline = {
            ID      : await pipe.readInt(),
            Type    : await pipe.readInt(),
            Segments: [],
        };

        let pointsCount = await pipe.readInt();

        for( let j = 0; j < pointsCount; j++ ) {
            data.Segments.push( {
                LocationStart: [
                    await pipe.readFloat(),
                    await pipe.readFloat(),
                    await pipe.readFloat()
                ],
                LocationEnd: null,
                Visible: Boolean( await pipe.readByte() ),
            } );
        }

        for( let j = 0; j < pointsCount - 1; j++ )
            data.Segments[ j ].LocationEnd = data.Segments[ j + 1 ].LocationStart;

        data.Segments.pop();

        return data;
    }

}