///<reference path='refs.ts'/>
module TDev.RT {
    //? Support for interactive tutorials.
    export module Tutorial
    {
        //? Signal that the step is done.
        //@ docsOnly
        export function step_completed(s:IStackFrame)
        {
            s.rt.forceNonRender();
            var st = s.rt.tutorialState
            if (!st) st = s.rt.tutorialState = {}
            st.validated = true;
            s.rt.host.notifyTutorial("stepCompleted");
        }

        //? Show a suggestion to the user (eg., an error description)
        //@ docsOnly dbgOnly
        //@ uiAsync
        export function show_hint(message:string, r:ResumeCtx)
        {
            var m = new ModalDialog();         
            m.add([div("wall-dialog-header", lf("tutorial hint")),
                    Wall.body(message),
                     div("wall-dialog-buttons", 
                        [HTML.mkButtonOnce("ok", () => m.dismiss())])
                    ]);
            m.onDismiss = () => r.resume();
            m.show();
        }
    }
}
