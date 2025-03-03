"use strict";
//components/auth/user-stats.tsx
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
const card_1 = require("@/components/ui/card");
const separator_1 = require("@/components/ui/separator");
const UsersStats = ({ users }) => {
    const totalUsers = users.length;
    const verifiedUsers = users.filter((usr) => usr.emailVerified !== undefined).length;
    const total2FAEnabled = users.filter((usr) => usr.isTwoFactorAuthEnabled !== undefined).length;
    return (<div className="flex flex-row items-center justify-around w-full">
            <card_1.Card>
                <card_1.CardHeader>
                    <card_1.CardTitle>Usuários Totais</card_1.CardTitle>
                    <card_1.CardDescription />
                </card_1.CardHeader>
                <card_1.CardContent className="flex items-center justify-center text-4xl">
                    {totalUsers}
                </card_1.CardContent>
                <card_1.CardFooter className="flex flex-row items-center justify-evenly">
                    <div className="flex flex-col items-center justify-center">
                        <div className="text-sm text-muted-foreground">Verified</div>
                        <div className="text-xl text-muted-foreground">{verifiedUsers}</div>
                    </div>
                    <separator_1.Separator orientation="vertical" className="mx-2 h-10 w-px"/>
                    <div className="flex flex-col items-center justify-center">
                        <div className="text-sm text-muted-foreground">Verified</div>
                        <div className="text-xl text-muted-foreground">{total2FAEnabled}</div>
                    </div>
                </card_1.CardFooter>
            </card_1.Card>
            <card_1.Card>
                <card_1.CardHeader>
                    <card_1.CardTitle>Usuários Totais</card_1.CardTitle>
                    <card_1.CardDescription />
                </card_1.CardHeader>
                <card_1.CardContent className="flex items-center justify-center text-4xl">
                    {totalUsers}
                </card_1.CardContent>
                <card_1.CardFooter className="flex flex-row items-center justify-evenly">
                    <div className="flex flex-col items-center justify-center">
                        <div className="text-sm text-muted-foreground">Verified</div>
                        <div className="text-xl text-muted-foreground">{verifiedUsers}</div>
                    </div>
                    <separator_1.Separator orientation="vertical" className="mx-2 h-10 w-px"/>
                    <div className="flex flex-col items-center justify-center">
                        <div className="text-sm text-muted-foreground">Verified</div>
                        <div className="text-xl text-muted-foreground">{total2FAEnabled}</div>
                    </div>
                </card_1.CardFooter>
            </card_1.Card>
            <card_1.Card>
                <card_1.CardHeader>
                    <card_1.CardTitle>Usuários Totais</card_1.CardTitle>
                    <card_1.CardDescription />
                </card_1.CardHeader>
                <card_1.CardContent className="flex items-center justify-center text-4xl">
                    {totalUsers}
                </card_1.CardContent>
                <card_1.CardFooter className="flex flex-row items-center justify-evenly">
                    <div className="flex flex-col items-center justify-center">
                        <div className="text-sm text-muted-foreground">Verified</div>
                        <div className="text-xl text-muted-foreground">{verifiedUsers}</div>
                    </div>
                    <separator_1.Separator orientation="vertical" className="mx-2 h-10 w-px"/>
                    <div className="flex flex-col items-center justify-center">
                        <div className="text-sm text-muted-foreground">Verified</div>
                        <div className="text-xl text-muted-foreground">{total2FAEnabled}</div>
                    </div>
                </card_1.CardFooter>
            </card_1.Card>
        </div>);
};
exports.default = UsersStats;
