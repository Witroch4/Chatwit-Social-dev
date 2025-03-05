import { Instagram, Facebook, Twitter, MessageCircle, Users, BarChart, Zap, CheckCircle, ArrowRight, Smartphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
	return (
		<div className="flex min-h-screen w-full flex-col">
			{/* Hero Section */}
			<section className="relative overflow-hidden bg-gradient-to-b from-primary/10 to-primary/5 pt-32 pb-16">
				<div className="container mx-auto px-4">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						<div className="text-center lg:text-left">
							<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
								<span className="bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">
									Automatize seu Instagram
								</span>{" "}
								e cresça com o Chatwit-Social
							</h1>
							<p className="text-lg md:text-xl mb-8 text-gray-700 dark:text-gray-300">
								A plataforma completa para automatizar suas conversas, aumentar seu engajamento e converter seguidores em clientes.
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
								<Link
									href="/auth/login"
									className="bg-primary hover:bg-primary/90 text-white font-medium rounded-lg px-6 py-3 text-center inline-flex items-center justify-center"
								>
									Comece Gratuitamente
									<ArrowRight className="ml-2 h-5 w-5" />
								</Link>
								<Link
									href="#demo"
									className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 font-medium rounded-lg px-6 py-3 text-center"
								>
									Ver Demonstração
								</Link>
							</div>
							<div className="mt-8 flex items-center justify-center lg:justify-start">
								<div className="flex -space-x-2">
									{[1, 2, 3, 4].map((i) => (
										<div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700"></div>
									))}
								</div>
								<p className="ml-4 text-sm text-gray-600 dark:text-gray-400">
									+2.500 profissionais já estão usando
								</p>
							</div>
						</div>
						<div className="relative">
							<div className="relative z-10 mx-auto lg:ml-auto lg:mr-0 max-w-sm">
								<Image
									src="/smartphone.png"
									alt="Chatwit-Social App"
									width={400}
									height={800}
									className="object-contain"
								/>
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="w-[220px] h-[440px] bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-lg">
										<div className="h-12 bg-primary flex items-center justify-between px-4">
											<span className="text-white text-sm font-medium">Chatwit-Social</span>
											<span className="text-white text-xs">09:41</span>
										</div>
										<div className="p-3 space-y-3">
											<div className="flex items-center space-x-2">
												<div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
													<Image
														src="/ChatWit.svg"
														alt="Chatwit Logo"
														width={24}
														height={24}
													/>
												</div>
												<div>
													<p className="text-xs font-medium">Chatwit-Social</p>
													<p className="text-xs text-gray-500">Olá! Como posso ajudar?</p>
												</div>
											</div>
											<div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg text-xs">
												Gostaria de saber mais sobre seus serviços
											</div>
											<div className="flex items-center space-x-2">
												<div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
													<Image
														src="/ChatWit.svg"
														alt="Chatwit Logo"
														width={24}
														height={24}
													/>
												</div>
												<div className="bg-primary/10 p-2 rounded-lg text-xs">
													Claro! O Chatwit-Social oferece automação de mensagens, chatbots personalizados e análise de engajamento para Instagram.
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -z-10"></div>
						</div>
					</div>
				</div>
			</section>

			{/* Integração com Redes Sociais */}
			<section className="py-16 bg-white dark:bg-gray-900">
				<div className="container mx-auto px-4">
					<div className="text-center mb-12">
						<h2 className="text-3xl md:text-4xl font-bold mb-4">Integração com Redes Sociais</h2>
						<p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
							Conecte-se com seus seguidores em todas as plataformas com uma única solução
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
							<div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
								<Instagram className="h-8 w-8 text-pink-600 dark:text-pink-400" />
							</div>
							<h3 className="text-xl font-semibold mb-3">Instagram</h3>
							<p className="text-gray-600 dark:text-gray-400 mb-4">
								Automatize respostas a comentários, DMs e Stories. Aumente seu engajamento e conversões.
							</p>
							<span className="inline-block text-primary font-medium">Integração Prioritária</span>
						</div>
						<div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
							<div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
								<Facebook className="h-8 w-8 text-blue-600 dark:text-blue-400" />
							</div>
							<h3 className="text-xl font-semibold mb-3">Facebook</h3>
							<p className="text-gray-600 dark:text-gray-400 mb-4">
								Gerencie comentários, mensagens e interações com sua página e grupos do Facebook.
							</p>
							<span className="inline-block text-gray-500 dark:text-gray-400 font-medium">Em breve</span>
						</div>
						<div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
							<div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
								<Twitter className="h-8 w-8 text-blue-400" />
							</div>
							<h3 className="text-xl font-semibold mb-3">Twitter</h3>
							<p className="text-gray-600 dark:text-gray-400 mb-4">
								Responda menções, mensagens diretas e interaja com seus seguidores automaticamente.
							</p>
							<span className="inline-block text-gray-500 dark:text-gray-400 font-medium">Em breve</span>
						</div>
					</div>
				</div>
			</section>

			{/* Recursos */}
			<section className="py-16 bg-gray-50 dark:bg-gray-800">
				<div className="container mx-auto px-4">
					<div className="text-center mb-12">
						<h2 className="text-3xl md:text-4xl font-bold mb-4">Recursos Poderosos</h2>
						<p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
							Tudo o que você precisa para automatizar e escalar seu negócio nas redes sociais
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{[
							{
								icon: <MessageCircle className="h-6 w-6 text-primary" />,
								title: "Chatbot Inteligente",
								description: "Crie fluxos de conversa personalizados que respondem automaticamente às mensagens dos seus seguidores."
							},
							{
								icon: <Users className="h-6 w-6 text-primary" />,
								title: "Segmentação de Público",
								description: "Organize seus seguidores em grupos com base em interesses, comportamentos e interações anteriores."
							},
							{
								icon: <BarChart className="h-6 w-6 text-primary" />,
								title: "Análise de Desempenho",
								description: "Acompanhe métricas importantes como taxa de resposta, engajamento e conversão em tempo real."
							},
							{
								icon: <Zap className="h-6 w-6 text-primary" />,
								title: "Automação de Campanhas",
								description: "Programe e automatize campanhas de marketing para aumentar o engajamento e as vendas."
							},
							{
								icon: <Smartphone className="h-6 w-6 text-primary" />,
								title: "Aplicativo Móvel",
								description: "Gerencie suas conversas e automações de qualquer lugar com nosso aplicativo móvel intuitivo."
							},
							{
								icon: <CheckCircle className="h-6 w-6 text-primary" />,
								title: "Conformidade com LGPD",
								description: "Todas as nossas ferramentas estão em conformidade com a Lei Geral de Proteção de Dados."
							}
						].map((feature, index) => (
							<div key={index} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									{feature.icon}
								</div>
								<h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
								<p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Como Funciona */}
			<section id="demo" className="py-16 bg-white dark:bg-gray-900">
				<div className="container mx-auto px-4">
					<div className="text-center mb-12">
						<h2 className="text-3xl md:text-4xl font-bold mb-4">Como o Chatwit-Social Funciona</h2>
						<p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
							Três passos simples para automatizar suas interações nas redes sociais
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{[
							{
								step: "1",
								title: "Conecte suas contas",
								description: "Integre suas contas de redes sociais com apenas alguns cliques. Começamos com Instagram, em breve mais plataformas."
							},
							{
								step: "2",
								title: "Configure seu chatbot",
								description: "Crie fluxos de conversa personalizados com nossa interface intuitiva de arrastar e soltar. Sem necessidade de codificação."
							},
							{
								step: "3",
								title: "Acompanhe os resultados",
								description: "Monitore o desempenho em tempo real e otimize suas estratégias com base em dados concretos."
							}
						].map((step, index) => (
							<div key={index} className="relative">
								<div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
									<div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl mb-6">
										{step.step}
									</div>
									<h3 className="text-xl font-semibold mb-3">{step.title}</h3>
									<p className="text-gray-600 dark:text-gray-400">{step.description}</p>
								</div>
								{index < 2 && (
									<div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
										<ArrowRight className="h-8 w-8 text-primary" />
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Depoimentos */}
			<section className="py-16 bg-gray-50 dark:bg-gray-800">
				<div className="container mx-auto px-4">
					<div className="text-center mb-12">
						<h2 className="text-3xl md:text-4xl font-bold mb-4">O Que Nossos Clientes Dizem</h2>
						<p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
							Histórias de sucesso de quem já está usando o Chatwit-Social
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{[
							{
								name: "Ana Silva",
								role: "Influenciadora Digital",
								testimonial: "O Chatwit-Social transformou a maneira como me comunico com meus seguidores. Consigo responder a todos de forma personalizada, mesmo quando recebo centenas de mensagens por dia."
							},
							{
								name: "Carlos Mendes",
								role: "Dono de E-commerce",
								testimonial: "Aumentamos nossas vendas em 40% depois de implementar os chatbots do Chatwit-Social. A automação das respostas às dúvidas mais frequentes foi um divisor de águas."
							},
							{
								name: "Mariana Costa",
								role: "Agência de Marketing",
								testimonial: "Gerenciamos as redes sociais de 15 clientes com uma equipe pequena graças ao Chatwit-Social. A plataforma nos permite escalar sem perder a qualidade no atendimento."
							}
						].map((testimonial, index) => (
							<div key={index} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
								<div className="flex items-center mb-4">
									<div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 mr-4"></div>
									<div>
										<h4 className="font-semibold">{testimonial.name}</h4>
										<p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
									</div>
								</div>
								<p className="text-gray-600 dark:text-gray-400 italic">"{testimonial.testimonial}"</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="py-16 bg-primary">
				<div className="container mx-auto px-4 text-center">
					<h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Pronto para revolucionar sua presença nas redes sociais?</h2>
					<p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto">
						Junte-se a milhares de profissionais que já estão usando o Chatwit-Social para automatizar interações, aumentar o engajamento e converter seguidores em clientes.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link
							href="/auth/login"
							className="bg-white hover:bg-gray-100 text-primary font-medium rounded-lg px-8 py-4 text-center inline-flex items-center justify-center text-lg"
						>
							Comece Gratuitamente
							<ArrowRight className="ml-2 h-5 w-5" />
						</Link>
						<Link
							href="#demo"
							className="bg-transparent hover:bg-primary-dark text-white border border-white font-medium rounded-lg px-8 py-4 text-center text-lg"
						>
							Agendar Demonstração
						</Link>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-gray-900 text-white py-12">
				<div className="container mx-auto px-4">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
						<div>
							<Link href="/" className="inline-block mb-6">
								<Image
									src="/ChatWit.svg"
									alt="Chatwit-Social Logo"
									width={150}
									height={40}
									className="object-contain"
								/>
							</Link>
							<p className="text-gray-400 mb-4">
								Automatize suas interações nas redes sociais e transforme seguidores em clientes.
							</p>
							<div className="flex space-x-4">
								<a href="#" className="text-gray-400 hover:text-white">
									<Instagram className="h-5 w-5" />
								</a>
								<a href="#" className="text-gray-400 hover:text-white">
									<Facebook className="h-5 w-5" />
								</a>
								<a href="#" className="text-gray-400 hover:text-white">
									<Twitter className="h-5 w-5" />
								</a>
							</div>
						</div>
						<div>
							<h4 className="font-semibold text-lg mb-4">Produto</h4>
							<ul className="space-y-2">
								<li><a href="#" className="text-gray-400 hover:text-white">Recursos</a></li>
								<li><a href="#" className="text-gray-400 hover:text-white">Preços</a></li>
								<li><a href="#" className="text-gray-400 hover:text-white">Integrações</a></li>
								<li><a href="#" className="text-gray-400 hover:text-white">Atualizações</a></li>
							</ul>
						</div>
						<div>
							<h4 className="font-semibold text-lg mb-4">Suporte</h4>
							<ul className="space-y-2">
								<li><a href="#" className="text-gray-400 hover:text-white">Central de Ajuda</a></li>
								<li><a href="#" className="text-gray-400 hover:text-white">Tutoriais</a></li>
								<li><a href="#" className="text-gray-400 hover:text-white">Contato</a></li>
								<li><a href="#" className="text-gray-400 hover:text-white">Status</a></li>
							</ul>
						</div>
						<div>
							<h4 className="font-semibold text-lg mb-4">Empresa</h4>
							<ul className="space-y-2">
								<li><a href="#" className="text-gray-400 hover:text-white">Sobre nós</a></li>
								<li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
								<li><a href="#" className="text-gray-400 hover:text-white">Carreiras</a></li>
								<li><a href="#" className="text-gray-400 hover:text-white">Termos de Serviço</a></li>
								<li><a href="#" className="text-gray-400 hover:text-white">Política de Privacidade</a></li>
							</ul>
						</div>
					</div>
					<div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500">
						<p>&copy; {new Date().getFullYear()} Chatwit-Social. Todos os direitos reservados.</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
