///<reference path='refs.ts'/>
module TDev { export module RT {
    export module BoxFlows
    {
        var _right: BoxFlow = BoxFlow.mk("right");
        var _left: BoxFlow = BoxFlow.mk("left");
        var _up: BoxFlow = BoxFlow.mk("up");
        var _down: BoxFlow = BoxFlow.mk("down");

        // Tile children from right to left
        export function right(): BoxFlow { return _right; }

        // Tile children from left to right
        export function left(): BoxFlow { return _left; }

        // Tile children from bottom to up
        export function up(): BoxFlow { return _up; }

        // Tile children from top to bottom (default)
        export function down(): BoxFlow { return _down; }
    }
} }
