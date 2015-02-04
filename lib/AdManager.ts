///<reference path='refs.ts'/>
module TDev.RT {
    export module AdManager {
        export var initialize = (el: HTMLElement)  =>
        {
            el.setChildren([HTML.mkA('', Cloud.getServiceUrl() + '/help/advertisement', '_blank', 'Learn how to display Ads in your apps!')]);
        }
    }
}
