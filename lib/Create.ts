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

    //? Creates a `Ref of T` (single-field object), initialized to the default value of `T`
    //@ [result].writesMutable
    export function Ref_of<T>(s:IStackFrame, type_T:any): Ref<T>
    {
        var r = new Ref<T>()

        if (type_T == "string")
            r._set(<any>"", s)
        else if (type_T == "number")
            r._set(<any>0, s)
        else if (type_T == "boolean")
            r._set(<any>false, s)

        return r
    }
}
