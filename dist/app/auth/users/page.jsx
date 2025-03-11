"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const users_1 = require("../../../actions/auth/users");
const users_stats_1 = __importDefault(require("../../../components/auth/users-stats"));
const users_table_1 = __importDefault(require("../../../components/auth/users-table"));
const Users = async () => {
    const users = await (0, users_1.getUsers)();
    return (<div className="flex flex-col w-full min-h-full items-center justify-start gap-4 m-2">
            <users_stats_1.default users={users}/>
            <users_table_1.default users={users}/>
        </div>);
};
exports.default = Users;
