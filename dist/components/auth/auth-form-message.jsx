"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lucide_react_1 = require("lucide-react");
const alert_1 = require("../../components/ui/alert");
const AuthFormMessage = ({ message, type, title }) => {
    return (<alert_1.Alert variant={type}>
			{type === "success" ? <lucide_react_1.CheckCircle className="h-4 w-4"/> : <lucide_react_1.AlertCircle className="h-4 w-4"/>}
			{title && <alert_1.AlertTitle>{title}</alert_1.AlertTitle>}
			<alert_1.AlertDescription>{message}</alert_1.AlertDescription>
		</alert_1.Alert>);
};
exports.default = AuthFormMessage;
