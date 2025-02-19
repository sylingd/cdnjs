"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var FrameManager = (function () {
    function FrameManager(container) {
        this.container = container;
    }
    FrameManager.prototype.nextFrame = function (timestamp) {
        var container = this.container;
        var options = container.options;
        var fpsLimit = options.fpsLimit > 0 ? options.fpsLimit : 60;
        if (container.lastFrameTime !== undefined && timestamp < container.lastFrameTime + (1000 / fpsLimit)) {
            container.play();
            return;
        }
        var delta = timestamp - container.lastFrameTime;
        console.log(delta, container.lastFrameTime, timestamp);
        container.lastFrameTime = timestamp;
        container.particles.draw(delta);
        if (!options.particles.move.enable) {
            container.pause();
        }
        else {
            container.play();
        }
    };
    return FrameManager;
}());
exports.FrameManager = FrameManager;
