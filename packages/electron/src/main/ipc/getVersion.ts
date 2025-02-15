import { app } from 'electron';
import { IPCHandler } from "./ipc";

export class GetVersionIPCHandler extends IPCHandler {
    public taskName = 'Get App Version';
    
    public channel = 'get-version';
    
    public public = true;
    
    protected handle() {
        return app.getVersion();
    }
}