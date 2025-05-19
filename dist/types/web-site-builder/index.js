"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewMode = exports.ElementType = exports.DeviceMode = void 0;
var DeviceMode;
(function (DeviceMode) {
    DeviceMode["Mobile"] = "Mobile";
    DeviceMode["Tablet"] = "Tablet";
    DeviceMode["Desktop"] = "Desktop";
})(DeviceMode || (exports.DeviceMode = DeviceMode = {}));
var PreviewMode;
(function (PreviewMode) {
    PreviewMode["Edit"] = "Edit";
    PreviewMode["Preview"] = "Preview";
    PreviewMode["Live"] = "Live";
})(PreviewMode || (exports.PreviewMode = PreviewMode = {}));
var ElementType;
(function (ElementType) {
    ElementType["TextElement"] = "TextElement";
    ElementType["ContainerElement"] = "ContainerElement";
    ElementType["SimpleBannerElement"] = "SimpleBannerElement";
})(ElementType || (exports.ElementType = ElementType = {}));
