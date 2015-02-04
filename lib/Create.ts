///<reference path='refs.ts'/>

//? Create collections of items.
//@ robust
module TDev.RT.Create
{
    //? Creates an empty collection of arbitrary type
    //@ [result].writesMutable
    export function Collection_of<T>(s:IStackFrame, type_T:any): Collection<T>
    {
        return new Collection<T>(type_T)
    }
}
