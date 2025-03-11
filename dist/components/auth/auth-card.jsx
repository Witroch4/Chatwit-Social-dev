"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const card_1 = require("../../components/ui/card");
const AuthCard = ({ title, description, children }) => {
    return (<card_1.Card className="mx-auto max-w-sm min-w-[350px] shadow-md">
			<card_1.CardHeader>
				{title && <card_1.CardTitle className="text-2xl">{title}</card_1.CardTitle>}
				{description && <card_1.CardDescription>{description}</card_1.CardDescription>}
			</card_1.CardHeader>
			<card_1.CardContent>{children}</card_1.CardContent>
		</card_1.Card>);
};
exports.default = AuthCard;
