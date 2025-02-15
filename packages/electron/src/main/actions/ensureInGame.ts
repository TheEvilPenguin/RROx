import { Action } from "./action";
import { ReadAddressAction, ReadAddressMode, ReadAddressValueAction } from ".";
import { PipeType } from "../pipes";
import Log from 'electron-log';

export enum GameMode {
    CLIENT = 'CLIENT',
    HOST = 'HOST',
}

export class EnsureInGameAction extends Action<false | GameMode> {

    public actionID   = 4;
    public actionName = 'Ensure In Game';
    public pipes      = [ PipeType.DLLInjectorData ];

    protected async execute(): Promise<false | GameMode> {
        if( !this.canRun() )
            return false;

        let inGameTest = ( await this.app.getAction( ReadAddressValueAction ).run( 'InGameTest' ) ) as string;

        // We check if the in game test has some (sensible) value
        if ( !inGameTest || inGameTest === '??' || inGameTest.includes( 'MainMenu' ) ) {
            Log.info( 'Not in game: InGameTestValue', inGameTest );
            return false;
        }

        let world  = await this.app.getAction( ReadAddressAction ).run( ReadAddressMode.GLOBAL, 'World' );
        let kismet = await this.app.getAction( ReadAddressAction ).run( ReadAddressMode.GLOBAL, 'KismetSystemLibrary' );;

        if( !world || !kismet ) {
            Log.info( 'Not in game: World/Kismet not found', world, kismet );
            return false;
        }

        await this.acquire();

        let pipe = this.app.getPipe( PipeType.DLLInjectorData );

        // Check if game is server

        pipe.writeInt( this.actionID );
        pipe.writeUInt64( kismet );
        pipe.writeUInt64( world );

        let returnValue = await pipe.readInt();
        
        if( returnValue !== 1 )
            return GameMode.CLIENT;

        return GameMode.HOST;
    }

    public canRun() {
        return super.canRun() && this.app.getAction( ReadAddressAction ).canRun() && this.app.getAction( ReadAddressValueAction ).canRun();
    }

}