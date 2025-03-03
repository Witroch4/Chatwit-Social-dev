"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationEmailTemplate = void 0;
const VerificationEmailTemplate = ({ name, token }) => {
    const verificationUrl = `${process.env.NEXT_PUBLIC_URL}${process.env.RESEND_VERIFICATION_URL}?token=${token}`;
    return (<div>
			<h1>Seja bem vindo ${name},</h1>
			<h2>
				Para verificar sua conta, favor clicar{" "}
				<a href={verificationUrl} target="_blank" rel="noreferrer">
					aqui
				</a>
			</h2>
		</div>);
};
exports.VerificationEmailTemplate = VerificationEmailTemplate;
