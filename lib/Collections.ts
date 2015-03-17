///<reference path='refs.ts'/>

//? Create collections of items.
//@ robust skill(3)
module TDev.RT.Collections
{

        //? Creates an empty User collection
        //@ [result].writesMutable
        export function create_user_collection(): Collection<User> { return new Collection<User>(User); }

        //? Creates an empty DateTime collection
        //@ [result].writesMutable
        export function create_date_time_collection(): Collection<DateTime> { return new Collection<DateTime>(DateTime); }

        //? Creates an empty Picture collection
        //@ [result].writesMutable
        export function create_picture_collection(): Collection<Picture> { return new Collection<Picture>(Picture); }

        //? Creates an empty Picture collection
        //@ [result].writesMutable
        export function create_sound_collection(): Collection<Sound> { return new Collection<Sound>(Sound); }

        //? Creates an empty Action collection
        //@ [result].writesMutable
        export function create_action_collection(): Collection<Action> { return new Collection<Action>(Action); }

        //? Creates an empty string collection
        //@ [result].writesMutable
        export function create_string_collection() : Collection<string> { return new Collection<string>("string"); }

        //? Creates an empty place collection
        //@ [result].writesMutable
        export function create_place_collection(): Collection<Place> { return new Collection<Place>(Place); }

        //? Creates an empty link collection
        //@ [result].writesMutable
        export function create_link_collection(): Collection<Link> { return new Collection<Link>(Link); }

        //? Creates an empty message collection
        //@ [result].writesMutable
        export function create_message_collection(): Collection<Message> { return new Collection<Message>(Message); }

        //? Creates an empty location collection
        //@ [result].writesMutable
        export function create_location_collection(): Collection<Location_> { return new Collection<Location_>(Location_); }

        //? Creates an empty number map
        //@ [result].writesMutable
        export function create_number_map() : NumberMap { return new NumberMap(); }

        //?  Creates an empty string map (case and culture sensitive)
        //@ [result].writesMutable
        export function create_string_map() : StringMap { return new StringMap(); }

        //? Creates an empty number collection
        //@ [result].writesMutable
        export function create_number_collection(): Collection<number> { return new Collection<number>("number"); }
}
