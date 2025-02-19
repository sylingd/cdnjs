(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('@angular/common'), require('@angular/forms')) :
    typeof define === 'function' && define.amd ? define('primeng/inputswitch', ['exports', '@angular/core', '@angular/common', '@angular/forms'], factory) :
    (global = global || self, factory((global.primeng = global.primeng || {}, global.primeng.inputswitch = {}), global.ng.core, global.ng.common, global.ng.forms));
}(this, (function (exports, core, common, forms) { 'use strict';

    var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var INPUTSWITCH_VALUE_ACCESSOR = {
        provide: forms.NG_VALUE_ACCESSOR,
        useExisting: core.forwardRef(function () { return InputSwitch; }),
        multi: true
    };
    var InputSwitch = /** @class */ (function () {
        function InputSwitch(cd) {
            this.cd = cd;
            this.onChange = new core.EventEmitter();
            this.checked = false;
            this.focused = false;
            this.onModelChange = function () { };
            this.onModelTouched = function () { };
        }
        InputSwitch.prototype.onClick = function (event, cb) {
            if (!this.disabled && !this.readonly) {
                this.toggle(event);
                cb.focus();
            }
        };
        InputSwitch.prototype.onInputChange = function (event) {
            if (!this.readonly) {
                var inputChecked = event.target.checked;
                this.updateModel(event, inputChecked);
            }
        };
        InputSwitch.prototype.toggle = function (event) {
            this.updateModel(event, !this.checked);
        };
        InputSwitch.prototype.updateModel = function (event, value) {
            this.checked = value;
            this.onModelChange(this.checked);
            this.onChange.emit({
                originalEvent: event,
                checked: this.checked
            });
        };
        InputSwitch.prototype.onFocus = function (event) {
            this.focused = true;
        };
        InputSwitch.prototype.onBlur = function (event) {
            this.focused = false;
            this.onModelTouched();
        };
        InputSwitch.prototype.writeValue = function (checked) {
            this.checked = checked;
            this.cd.markForCheck();
        };
        InputSwitch.prototype.registerOnChange = function (fn) {
            this.onModelChange = fn;
        };
        InputSwitch.prototype.registerOnTouched = function (fn) {
            this.onModelTouched = fn;
        };
        InputSwitch.prototype.setDisabledState = function (val) {
            this.disabled = val;
        };
        InputSwitch.ctorParameters = function () { return [
            { type: core.ChangeDetectorRef }
        ]; };
        __decorate([
            core.Input()
        ], InputSwitch.prototype, "style", void 0);
        __decorate([
            core.Input()
        ], InputSwitch.prototype, "styleClass", void 0);
        __decorate([
            core.Input()
        ], InputSwitch.prototype, "tabindex", void 0);
        __decorate([
            core.Input()
        ], InputSwitch.prototype, "inputId", void 0);
        __decorate([
            core.Input()
        ], InputSwitch.prototype, "name", void 0);
        __decorate([
            core.Input()
        ], InputSwitch.prototype, "disabled", void 0);
        __decorate([
            core.Input()
        ], InputSwitch.prototype, "readonly", void 0);
        __decorate([
            core.Input()
        ], InputSwitch.prototype, "ariaLabelledBy", void 0);
        __decorate([
            core.Output()
        ], InputSwitch.prototype, "onChange", void 0);
        InputSwitch = __decorate([
            core.Component({
                selector: 'p-inputSwitch',
                template: "\n        <div [ngClass]=\"{'ui-inputswitch ui-widget': true, 'ui-inputswitch-checked': checked, 'ui-state-disabled': disabled, 'ui-inputswitch-readonly': readonly, 'ui-inputswitch-focus': focused}\" \n            [ngStyle]=\"style\" [class]=\"styleClass\" (click)=\"onClick($event, cb)\">\n            <div class=\"ui-helper-hidden-accessible\">\n                <input #cb type=\"checkbox\" [attr.id]=\"inputId\" [attr.name]=\"name\" [attr.tabindex]=\"tabindex\" [checked]=\"checked\" (change)=\"onInputChange($event)\"\n                    (focus)=\"onFocus($event)\" (blur)=\"onBlur($event)\" [disabled]=\"disabled\" role=\"switch\" [attr.aria-checked]=\"checked\" [attr.aria-labelledby]=\"ariaLabelledBy\"/>\n            </div>\n            <span class=\"ui-inputswitch-slider\"></span>\n        </div>\n    ",
                providers: [INPUTSWITCH_VALUE_ACCESSOR]
            })
        ], InputSwitch);
        return InputSwitch;
    }());
    var InputSwitchModule = /** @class */ (function () {
        function InputSwitchModule() {
        }
        InputSwitchModule = __decorate([
            core.NgModule({
                imports: [common.CommonModule],
                exports: [InputSwitch],
                declarations: [InputSwitch]
            })
        ], InputSwitchModule);
        return InputSwitchModule;
    }());

    exports.INPUTSWITCH_VALUE_ACCESSOR = INPUTSWITCH_VALUE_ACCESSOR;
    exports.InputSwitch = InputSwitch;
    exports.InputSwitchModule = InputSwitchModule;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=primeng-inputswitch.umd.js.map
