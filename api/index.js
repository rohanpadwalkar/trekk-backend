"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const express_1 = __importDefault(require("express"));
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const app_module_1 = require("../src/app.module");
const create_app_1 = require("../src/create-app");
const server = (0, express_1.default)();
let bootstrapped = null;
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(server));
    await (0, create_app_1.configureApp)(app);
    await app.init();
}
async function handler(req, res) {
    if (!bootstrapped)
        bootstrapped = bootstrap();
    await bootstrapped;
    server(req, res);
}
//# sourceMappingURL=index.js.map