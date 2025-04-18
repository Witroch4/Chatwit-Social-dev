// lib/whatsapp.ts
import axios from 'axios';
import { auth } from '@/auth';
import { getWhatsAppConfig as _getWhatsAppConfig, getWhatsAppApiUrl as _getWhatsAppApiUrl } from '@/app/lib';
import { db } from '@/lib/db';
import { isMetaMediaUrl, getPublicMediaUrl, downloadMetaMediaAndUploadToMinio } from './whatsapp-media';

export interface SendOpts {
  bodyVars?: (string | number)[];
  headerVar?: string;
  headerMedia?: string;
  buttonOverrides?: Record<number, any>;
  couponCode?: string;
}

export interface EnvioResult {
  nome: string;
  numero: string;
  status: 'enviado' | 'falha';
  erro?: string;
}

export function formatE164(num: string): string | null {
  const d = num.replace(/\D/g, '');
  if (!d) return null;
  return d.startsWith('55') ? d : `55${d}`;
}

export function sanitizeCoupon(raw?: string): string {
  const ok = (raw || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
  if (!ok) throw new Error('coupon_code inválido ‑ use 1‑32 letras/números sem espaço');
  return ok;
}

export async function sendTemplateMessage(
  toRaw: string,
  templateName: string,
  opts: SendOpts = {}
): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user) throw new Error('401');

    const cfg = await _getWhatsAppConfig(session.user.id);
    const api = _getWhatsAppApiUrl(cfg);
    const tpl = await db.whatsAppTemplate.findFirst({ where: { name: templateName } });
    if (!tpl) throw new Error(`Template '${templateName}' não encontrado`);
    if (tpl.status !== 'APPROVED') throw new Error(`Template '${templateName}' ≠ APPROVED`);

    const to = formatE164(toRaw);
    if (!to) throw new Error('Número inválido');

    const comps: any[] = [];
    const components = tpl.components as any[];

    for (const c of components) {
      switch (c.type) {
        case 'HEADER': {
          if (c.format === 'TEXT') {
            const txt =
              opts.headerVar ||
              c.text?.replace(/\{\{1\}\}/, opts.headerVar || '');
            if (!txt) throw new Error('HEADER TEXT requer headerVar');
            comps.push({
              type: 'header',
              parameters: [{ type: 'text', text: txt }],
            });
          } else if (
            ['IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION'].includes(c.format)
          ) {
            const fallback =
              c.example?.header_handle?.[0] ??
              c.example?.header_url ??
              (typeof c.example?.header_location === 'object'
                ? JSON.stringify(c.example.header_location)
                : '');

            let media = opts.headerMedia || fallback;
            if (!media)
              throw new Error(`HEADER ${c.format} requer headerMedia ou exemplo`);
            
            // Verificar se a mídia é da Meta e, se for, tentar obter a URL pública do MinIO
            if (isMetaMediaUrl(media)) {
              try {
                // Tentar obter ou gerar a URL pública no MinIO
                const publicUrl = await getPublicMediaUrl(tpl.templateId, session.user.id, media);
                if (publicUrl) {
                  console.log(`[sendTemplateMessage] Usando URL pública do MinIO: ${publicUrl}`);
                  media = publicUrl;
                }
              } catch (mediaError) {
                console.error('[sendTemplateMessage] Erro ao processar mídia:', mediaError);
                // Continua usando a URL original em caso de erro
              }
            }

            if (c.format === 'LOCATION') {
              comps.push({
                type: 'header',
                parameters: [
                  { type: 'location', location: JSON.parse(media) },
                ],
              });
            } else {
              const key = c.format.toLowerCase();
              comps.push({
                type: 'header',
                parameters: [
                  {
                    type: key,
                    [key]: media.startsWith('http')
                      ? { link: media }
                      : { id: media },
                  },
                ],
              });
            }
          }
          break;
        }

        case 'BODY': {
          const placeholders = (c.text.match(/\{\{(\d+)\}\}/g) || []).length;
          if (placeholders) {
            if (!(opts.bodyVars && opts.bodyVars.length >= placeholders)) {
              throw new Error(
                `BODY requer ${placeholders} variáveis (foram passadas ${
                  opts.bodyVars?.length || 0
                })`
              );
            }
            const params = opts.bodyVars!
              .slice(0, placeholders)
              .map((v) => ({ type: 'text', text: String(v) }));
            comps.push({ type: 'body', parameters: params });
          } else {
            comps.push({ type: 'body' });
          }
          break;
        }

        case 'FOOTER':
          comps.push({ type: 'footer' });
          break;

        case 'BUTTONS':
          c.buttons.forEach((btn: any, idx: number) => {
            let item: any;
            switch (btn.type) {
              case 'COPY_CODE':
                item = {
                  type: 'button',
                  sub_type: 'copy_code',
                  index: String(idx),
                  parameters: [
                    {
                      type: 'coupon_code',
                      coupon_code: sanitizeCoupon(
                        opts.couponCode || btn.example?.[0] || 'CODE123'
                      ),
                    },
                  ],
                };
                break;
              // lib/whatsapp.ts  → dentro do switch (btn.type)  ────────────
              case 'PHONE_NUMBER':
                item = {
                  type: 'button',
                  sub_type: 'voice_call',           // ⬅️ trocado
                  index: String(idx),
                  parameters: [
                    { type: 'payload', payload: btn.phone_number }
                  ],
                };
                break;

              case 'URL':
                item = {
                  type: 'button',
                  sub_type: 'url',
                  index: String(idx),
                  parameters: [
                    {
                      type: 'text',
                      text: opts.buttonOverrides?.[idx] ||
                        btn.example ||
                        '',
                    },
                  ],
                };
                break;
              case 'QUICK_REPLY':
                item = {
                  type: 'button',
                  sub_type: 'quick_reply',
                  index: String(idx),
                  parameters: [
                    {
                      type: 'payload',
                      payload: opts.buttonOverrides?.[idx] || 'OK',
                    },
                  ],
                };
                break;
              case 'FLOW':
                item = {
                  type: 'button',
                  sub_type: 'flow',
                  index: String(idx),
                  parameters: [
                    {
                      type: 'flow',
                      flow: {
                        flow_id: btn.flow_id,
                        flow_action: btn.flow_action,
                        navigate_screen: btn.navigate_screen,
                      },
                    },
                  ],
                };
                break;
              default:
                throw new Error(`Botão não suportado: ${btn.type}`);
            }
            comps.push(item);
          });
          break;
      }
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: tpl.language || 'pt_BR' },
        components: comps,
      },
    };

    // ⬇️  LOG DO PAYLOAD PARA DEBUG
    console.log('[sendTemplateMessage] Cloud API URL:', api);
    console.log(
      '[sendTemplateMessage] Payload enviado:',
      JSON.stringify(payload, null, 2)
    );

    // Fazer a requisição para a API do WhatsApp
    const response = await axios.post(api, payload, {
      headers: {
        Authorization: `Bearer ${cfg.whatsappToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Se houver URLs da Meta no payload, programar o download e upload para o MinIO
    if (response.status >= 200 && response.status < 300) {
      // Processa todas as URLs de mídia usadas
      setTimeout(async () => {
        try {
          // Extrair URLs de mídia do payload para processamento assíncrono
          for (const comp of comps) {
            if (comp.type === 'header' && comp.parameters && comp.parameters.length > 0) {
              const param = comp.parameters[0];
              if (param.video?.link && isMetaMediaUrl(param.video.link)) {
                await downloadMetaMediaAndUploadToMinio(
                  param.video.link,
                  tpl.templateId,
                  templateName,
                  session.user.id
                );
              } else if (param.image?.link && isMetaMediaUrl(param.image.link)) {
                await downloadMetaMediaAndUploadToMinio(
                  param.image.link,
                  tpl.templateId,
                  templateName,
                  session.user.id
                );
              } else if (param.document?.link && isMetaMediaUrl(param.document.link)) {
                await downloadMetaMediaAndUploadToMinio(
                  param.document.link,
                  tpl.templateId,
                  templateName,
                  session.user.id
                );
              }
            }
          }
        } catch (afterSendError) {
          console.error('[sendTemplateMessage] Erro ao processar mídia após envio:', afterSendError);
          // Não interrompe o fluxo principal, pois o envio já ocorreu com sucesso
        }
      }, 100); // Executa logo após o envio bem-sucedido
    }

    return true;
  } catch (e: any) {
    console.error('[sendTemplateMessage]', e.response?.data || e.message);
    return false;
  }
}

export async function testWhatsAppApiConnection(cfg: any) {
  try {
    const id = cfg.phoneNumberId || cfg.whatsappBusinessAccountId;
    await axios.get(
      `${cfg.fbGraphApiBase}/${id}/whatsapp_business_profile`,
      {
        headers: {
          Authorization: `Bearer ${cfg.whatsappToken}`,
        },
      }
    );
    return { success: true };
  } catch (e: any) {
    return {
      success: false,
      details: e.response?.data?.error?.message || e.message,
    };
  }
}

export function processCSV(csv: string) {
  // se precisar processar CSV
  return [];
}

export const getWhatsAppConfig = _getWhatsAppConfig;
export const getWhatsAppApiUrl = _getWhatsAppApiUrl;
