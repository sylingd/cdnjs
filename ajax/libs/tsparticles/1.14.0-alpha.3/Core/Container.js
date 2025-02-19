"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Canvas_1 = require("./Canvas");
var EventListeners_1 = require("../Utils/EventListeners");
var Particles_1 = require("./Particles");
var Retina_1 = require("./Retina");
var PolygonMask_1 = require("../Plugins/PolygonMask");
var FrameManager_1 = require("./FrameManager");
var Options_1 = require("../Options/Classes/Options");
var Presets_1 = require("../Utils/Presets");
var Emitter_1 = require("./Emitter");
var CanvasUtils_1 = require("../Utils/CanvasUtils");
var Utils_1 = require("../Utils/Utils");
var ClickMode_1 = require("../Enums/Modes/ClickMode");
var Absorbers_1 = require("../Plugins/Absorbers");
var Container = (function () {
    function Container(id, params) {
        var presets = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            presets[_i - 2] = arguments[_i];
        }
        this.started = false;
        this.destroyed = false;
        this.id = id;
        this.paused = true;
        this.sourceOptions = params;
        this.lastFrameTime = 0;
        this.pageHidden = false;
        this.retina = new Retina_1.Retina(this);
        this.canvas = new Canvas_1.Canvas(this);
        this.particles = new Particles_1.Particles(this);
        this.drawer = new FrameManager_1.FrameManager(this);
        this.interactivity = {
            mouse: {},
        };
        this.bubble = {};
        this.repulse = { particles: [] };
        this.emitters = [];
        this.plugins = [];
        this.drawers = {};
        this.options = new Options_1.Options();
        for (var _a = 0, presets_1 = presets; _a < presets_1.length; _a++) {
            var preset = presets_1[_a];
            this.options.load(Presets_1.Presets.getPreset(preset));
        }
        if (this.sourceOptions) {
            this.options.load(this.sourceOptions);
        }
        this.eventListeners = new EventListeners_1.EventListeners(this);
    }
    Container.requestFrame = function (callback) {
        return window.customRequestAnimationFrame(callback);
    };
    Container.cancelAnimation = function (handle) {
        window.cancelAnimationFrame(handle);
    };
    Container.prototype.play = function () {
        var _this = this;
        if (this.paused) {
            this.lastFrameTime = performance.now();
            this.paused = false;
            for (var _i = 0, _a = this.emitters; _i < _a.length; _i++) {
                var emitter = _a[_i];
                emitter.start();
            }
        }
        this.drawAnimationFrame = Container.requestFrame(function (t) { return _this.drawer.nextFrame(t); });
    };
    Container.prototype.pause = function () {
        if (this.drawAnimationFrame !== undefined) {
            for (var _i = 0, _a = this.emitters; _i < _a.length; _i++) {
                var emitter = _a[_i];
                emitter.stop();
            }
            Container.cancelAnimation(this.drawAnimationFrame);
            delete this.drawAnimationFrame;
            this.paused = true;
        }
    };
    Container.prototype.densityAutoParticles = function () {
        if (!(this.canvas.element && this.options.particles.number.density.enable)) {
            return;
        }
        var area = this.canvas.element.width * this.canvas.element.height / 1000;
        if (this.retina.isRetina) {
            area /= this.retina.pixelRatio * 2;
        }
        var optParticlesNumber = this.options.particles.number.value;
        var density = this.options.particles.number.density.area;
        var particlesNumber = area * optParticlesNumber / density;
        var particlesCount = this.particles.count;
        if (particlesCount < particlesNumber) {
            this.particles.push(Math.abs(particlesNumber - particlesCount));
        }
        else if (particlesCount > particlesNumber) {
            this.particles.removeQuantity(particlesCount - particlesNumber);
        }
    };
    Container.prototype.destroy = function () {
        this.stop();
        this.retina.reset();
        this.canvas.destroy();
        delete this.interactivity;
        delete this.options;
        delete this.retina;
        delete this.canvas;
        delete this.particles;
        delete this.bubble;
        delete this.repulse;
        delete this.drawer;
        delete this.eventListeners;
        for (var type in this.drawers) {
            var drawer = this.drawers[type];
            if (drawer.destroy !== undefined) {
                drawer.destroy(this);
            }
        }
        this.drawers = {};
        this.destroyed = true;
    };
    Container.prototype.exportImg = function (callback) {
        this.exportImage(callback);
    };
    Container.prototype.exportImage = function (callback, type, quality) {
        var _a;
        return (_a = this.canvas.element) === null || _a === void 0 ? void 0 : _a.toBlob(callback, type !== null && type !== void 0 ? type : "image/png", quality);
    };
    Container.prototype.exportConfiguration = function () {
        return JSON.stringify(this.options, undefined, 2);
    };
    Container.prototype.refresh = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.stop();
                        return [4, this.start()];
                    case 1:
                        _a.sent();
                        return [2];
                }
            });
        });
    };
    Container.prototype.stop = function () {
        if (!this.started) {
            return;
        }
        this.started = false;
        this.eventListeners.removeListeners();
        this.pause();
        this.particles.clear();
        this.retina.reset();
        this.canvas.clear();
        for (var _i = 0, _a = this.plugins; _i < _a.length; _i++) {
            var plugin = _a[_i];
            if (plugin.reset !== undefined) {
                plugin.reset();
            }
        }
        this.emitters = [];
        this.plugins = [];
        delete this.particles.lineLinkedColor;
    };
    Container.prototype.start = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var absorbers, loadAbsorbers, _i, _a, plugin, _b, _c, type, type, _d, _e, _f, type, drawer;
            return tslib_1.__generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if (this.started) {
                            return [2];
                        }
                        if (this.options.polygon.enable) {
                            this.plugins.push(new PolygonMask_1.PolygonMask(this));
                        }
                        absorbers = this.options.absorbers;
                        loadAbsorbers = false;
                        if (absorbers instanceof Array) {
                            if (absorbers.length) {
                                loadAbsorbers = true;
                            }
                        }
                        else if (absorbers !== undefined) {
                            loadAbsorbers = true;
                        }
                        else if (Utils_1.Utils.isInArray(ClickMode_1.ClickMode.absorber, this.options.interactivity.events.onClick.mode)) {
                            loadAbsorbers = true;
                        }
                        if (loadAbsorbers) {
                            this.plugins.push(new Absorbers_1.Absorbers(this));
                        }
                        this.started = true;
                        this.eventListeners.addListeners();
                        _i = 0, _a = this.plugins;
                        _g.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3, 5];
                        plugin = _a[_i];
                        if (!(plugin.initAsync !== undefined)) return [3, 3];
                        return [4, plugin.initAsync()];
                    case 2:
                        _g.sent();
                        return [3, 4];
                    case 3:
                        if (plugin.init !== undefined) {
                            plugin.init();
                        }
                        _g.label = 4;
                    case 4:
                        _i++;
                        return [3, 1];
                    case 5:
                        if (this.options.particles.shape.type instanceof Array) {
                            for (_b = 0, _c = this.options.particles.shape.type; _b < _c.length; _b++) {
                                type = _c[_b];
                                this.drawers[type] = CanvasUtils_1.CanvasUtils.getShapeDrawer(type);
                            }
                        }
                        else {
                            type = this.options.particles.shape.type;
                            this.drawers[type] = CanvasUtils_1.CanvasUtils.getShapeDrawer(type);
                        }
                        _d = [];
                        for (_e in this.drawers)
                            _d.push(_e);
                        _f = 0;
                        _g.label = 6;
                    case 6:
                        if (!(_f < _d.length)) return [3, 9];
                        type = _d[_f];
                        drawer = this.drawers[type];
                        if (!(drawer.init !== undefined)) return [3, 8];
                        return [4, drawer.init(this)];
                    case 7:
                        _g.sent();
                        _g.label = 8;
                    case 8:
                        _f++;
                        return [3, 6];
                    case 9:
                        this.init();
                        this.play();
                        return [2];
                }
            });
        });
    };
    Container.prototype.init = function () {
        this.retina.init();
        this.canvas.init();
        this.particles.init();
        if (this.options.emitters instanceof Array) {
            for (var _i = 0, _a = this.options.emitters; _i < _a.length; _i++) {
                var emitterOptions = _a[_i];
                var emitter = new Emitter_1.Emitter(this, emitterOptions);
                this.emitters.push(emitter);
            }
        }
        else {
            var emitterOptions = this.options.emitters;
            var emitter = new Emitter_1.Emitter(this, emitterOptions);
            this.emitters.push(emitter);
        }
        this.densityAutoParticles();
    };
    return Container;
}());
exports.Container = Container;
