import { useProjectStore, type WebhookEvent, type ProjectConfig, type Integration } from '../store/useProjectStore';

export interface WebhookPayload {
    event: WebhookEvent;
    project_name: string;
    branch?: string;
    commit_msg?: string;
    tag_name?: string;
    author?: string;
    details?: string;
}

const sendTelegram = async (integration: Integration, payload: WebhookPayload) => {
    if (!integration.botToken || !integration.chatId) return;
    
    let text = `🚀 *ReizGit Notification*\n`;
    text += `*Project:* ${payload.project_name}\n`;
    text += `*Event:* \`${payload.event.toUpperCase()}\`\n`;
    
    if (payload.branch) text += `*Branch:* \`${payload.branch}\`\n`;
    if (payload.commit_msg) text += `*Commit:* ${payload.commit_msg}\n`;
    if (payload.tag_name) text += `*Tag:* \`${payload.tag_name}\`\n`;
    if (payload.details) text += `\n${payload.details}`;

    try {
        await fetch(`https://api.telegram.org/bot${integration.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: integration.chatId,
                text,
                parse_mode: 'Markdown'
            })
        });
    } catch (e) {
        console.error('Failed to send Telegram webhook', e);
    }
};

const sendSlack = async (integration: Integration, payload: WebhookPayload) => {
    if (!integration.webhookUrl) return;

    let text = `🚀 *ReizGit Notification* - *${payload.project_name}*\nEvent: \`${payload.event.toUpperCase()}\``;
    if (payload.branch) text += `\nBranch: \`${payload.branch}\``;
    if (payload.commit_msg) text += `\nCommit: ${payload.commit_msg}`;
    if (payload.tag_name) text += `\nTag: \`${payload.tag_name}\``;

    try {
        await fetch(integration.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
    } catch (e) {
        console.error('Failed to send Slack webhook', e);
    }
};

const sendHttp = async (integration: Integration, payload: WebhookPayload) => {
    if (!integration.webhookUrl) return;
    try {
        await fetch(integration.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error('Failed to send HTTP webhook', e);
    }
};

export const dispatchWebhook = async (project: ProjectConfig, event: WebhookEvent, payloadOverrides: Partial<WebhookPayload>) => {
    const hooks = project.hooks || [];
    const triggeredHooks = hooks.filter(h => h.events.includes(event));
    
    if (triggeredHooks.length === 0) return;

    const { integrations } = useProjectStore.getState();
    const payload: WebhookPayload = {
        event,
        project_name: project.name,
        ...payloadOverrides
    };

    for (const hook of triggeredHooks) {
        const integration = integrations.find(i => i.id === hook.integrationId);
        if (!integration) continue;

        switch (integration.type) {
            case 'telegram':
                await sendTelegram(integration, payload);
                break;
            case 'slack':
                await sendSlack(integration, payload);
                break;
            case 'http':
                await sendHttp(integration, payload);
                break;
        }
    }
};
