///<reference path='refs.ts'/>

module TDev { export module Contract {

    export function Requires(e:boolean):void
    {
        if (!e) {
            throw new Error("Contract Requires failed");
        }
    }    
} } 
