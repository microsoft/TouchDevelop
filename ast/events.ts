///<reference path='refs.ts'/>


module TDev { export module AST {

	export interface EventSig {
		sig : string;
		help: string;
		obsolete?:boolean;
        alt?:string;
	}

    export var eventSigs : EventSig[] = [
        { sig: "gameloop()", help: "raised many times per second", alt:"time->on every frame" },
        { sig: "shake()", help: "raised when device is shaken", alt:"senses->on shake" },
        { sig: "phone_face_up()", help: "raised when screen is facing up", alt:"senses->on phone face up" },
        { sig: "phone_face_down()", help: "raised when screen is facing down", alt:"senses->on phone face down" },
        { sig: "phone_portrait()", help: "raised when device is in the default screen orientation", alt:"senses->on phone portrait" },
        { sig: "phone_landscape_left()", help: "raised when device is rotated 90 degrees to the left", alt:"senses->on phone landscape left"},
        { sig: "phone_landscape_right()", help: "raised when device is rotated 90 degrees to the right", alt:"senses->on phone landscape right"},
        { sig: "active_song_changed()", help: "raised when the active song changes in the player"},
        { sig: "player_state_changed()", help: "raised when the player is paused, stopped or started"},
        { sig: "camera_button_half_pressed()", help:"not supported", obsolete:true },
        { sig: "camera_button_pressed()", help:"not supported", obsolete:true },
        { sig: "camera_button_released()", help:"not supported", obsolete:true },
        { sig: "empty_space_on_wall()", help:"not implemented yet"},
        { sig: "page_navigated_from()", help: "raised when a page is popped", alt:"wall->current page->on navigated from" },
        { sig: "cloud_data_updated()", help:"raised when cloud data was synchronized with the cloud"},
        { sig: "touch_down\\:_(Var:Board, x:Number, y:Number)", help:""},
        { sig: "touch_up\\:_(Var:Board, x:Number, y:Number)", help:""},
        { sig: "touch_over_(Var:Sprite_Set, sprite:Sprite, index_in_set:Number, x:Number, y:Number)", help:""},
        { sig: "tap_board\\:_(Var:Board, x:Number, y:Number)", help:"raised when the board is tapped"},
        { sig: "swipe_board\\:_(Var:Board, x:Number, y:Number, delta_x:Number, delta_y:Number)", help:"raised when the board is swiped"},
        { sig: "tap_sprite_in_(Var:Sprite_Set, sprite:Sprite, index_in_set:Number, x:Number, y:Number)", help:"raised when a sprite from the sprite set is tapped"},
        { sig: "swipe_sprite_in_(Var:Sprite_Set, sprite:Sprite, index_in_set:Number, x:Number, y:Number, delta_x:Number, delta_y:Number)",help:"raised when a sprite from the sprite set is swipped"},
        { sig: "drag_sprite_in_(Var:Sprite_Set, sprite:Sprite, index_in_set:Number, x:Number, y:Number, delta_x:Number, delta_y:Number)",help:"raised when a sprite from the sprite set is dragged"},
        { sig: "tap_sprite\\:_(Var:Sprite, sprite:Sprite, x:Number, y:Number)", help:"raised when the sprite is tapped"},
        { sig: "swipe_sprite\\:_(Var:Sprite, sprite:Sprite, x:Number, y:Number, delta_x:Number, delta_y:Number)", help:"raised when the sprite is swiped"},
        { sig: "drag_sprite\\:_(Var:Sprite, sprite:Sprite, x:Number, y:Number, delta_x:Number, delta_y:Number)", help:"raised when the sprite is dragged"}
    ];

    export class EventClass
    {
        public category:string;
        public inParameters:LocalDef[];
        public globalKind:Kind = null;
        public platform = PlatformCapability.None;
        public lowPriority = false;
		public help : string;

        constructor(p:Parser, sig : EventSig) {
			var hds = sig.sig;
			this.help = sig.help;
			this.lowPriority = !!sig.obsolete;
            p.tokenize(hds);
            var hd = p.parseActionHeader();
            this.category = hd.name;
            this.inParameters = hd.inParameters.map((p) => p.local);
            if (this.inParameters.length > 0 && this.inParameters[0].getName() == "Var") {
                this.globalKind = this.inParameters[0].getKind();
                this.inParameters.shift();
            }
            if (/^phone_/.test(hds)) this.platform = PlatformCapability.Orientation;
            else if (/^shake/.test(hds)) this.platform = PlatformCapability.Accelerometer;
            else if (/^(active_song_changed|player_state_changed)/.test(hds)) this.platform = PlatformCapability.Media;
            else if (/^camera_button/.test(hds)) {
                this.platform = PlatformCapability.Camera;
                this.lowPriority = true;
            }

            if (/^empty_space/.test(hds)) this.lowPriority = true;
        }
    }

    export class EventInfo
    {
        public onVariable : GlobalDef;
        public disabled = false;
        constructor(public type : EventClass) {
        }
    }

    export class EventMgr
    {
        private eventClasses:EventClass[];

        public genericEvent()
        {
            return this.mkAction(this.eventClasses[0], "event")
        }
        
        public init()
        {
            var p = new Parser();
            this.eventClasses = eventSigs.map((s) => new EventClass(p, s));
            api.getKinds().forEach((k:Kind) => {
                if (k.isData && k.hasContext(KindContext.WallTap)) {
                    var ec = new EventClass(p, { sig:"evt()", help:"raised when a " + k.getName() + " is tapped on the wall"});
                    ec.category = "tap wall " + k.getName();
                    ec.lowPriority = k.getName() != "TextBox";
                    ec.inParameters = [mkLocal("item", k)];
                    this.eventClasses.push(ec);
                }
            });
        }

        public setInfo(a:Action, p:Parser)
        {
            var name = a.getName();
            var clses = this.eventClasses.filter((c) => name.slice(0, c.category.length) == c.category);
            clses.sort((a, b) => b.category.length - a.category.length);
            var cls = clses[0];
            if (cls === undefined) {
                a.isPrivate = true; 
                p.error("no such event category " + a.getName());
            } else {
                a.setEventInfo(new EventInfo(cls));
            }
        }

        private mkAction(ec:EventClass, name:string)
        {
            var a = new Action();
            a.parent = Script;
            a.header.inParameters.setChildren(ec.inParameters.map((p:LocalDef) => new ActionParameter(p.clone())));
            a.setName(name);
            a.body = Parser.emptyBlock();
            a.body.parent = a.header;
            a.setEventInfo(new EventInfo(ec));
            return a;
        }

        public availableEvents()
        {
            var existing:any = {};
            Script.events().forEach((a:Action) => {
                existing[a.getName()] = true;
            });

            var res:Action[] = [];

            this.eventClasses.forEach((ec:EventClass) => {
                if (!Script.canUseCapability(ec.platform))
                    return;

                var add = (name:string) => {
                    if (!existing[name]) {
                        res.push(this.mkAction(ec, name));
                    }
                }
                if (!ec.globalKind) {
                    add(ec.category);
                } else {
                    Script.variables().forEach((d:GlobalDef) => {
                        if (d.getKind() == ec.globalKind)
                            add(ec.category + d.getName());
                    });
                }
            });

            return res;
        }
    }
} }
