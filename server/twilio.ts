// Twilio Integration for SMS reminders
import twilio from 'twilio';

/** Appended to every outbound reminder (CTIA: opt-out instructions in recurring messages). */
export const SMS_FOOTER = 'Reply STOP to opt out, HELP for help.';

let connectionSettings: any;

type TwilioCredentials = {
  accountSid: string;
  apiKey: string;
  apiKeySecret: string;
  phoneNumber?: string;
};

/**
 * Credentials come from env first (any host):
 *   TWILIO_ACCOUNT_SID + (TWILIO_API_KEY + TWILIO_API_KEY_SECRET | TWILIO_AUTH_TOKEN) + TWILIO_FROM_NUMBER
 * and fall back to the Replit connector when running on Replit.
 */
function getEnvCredentials(): TwilioCredentials | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  if (!accountSid) return null;
  const apiKey = process.env.TWILIO_API_KEY || accountSid;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN;
  if (!apiKeySecret) return null;
  return { accountSid, apiKey, apiKeySecret, phoneNumber: process.env.TWILIO_FROM_NUMBER };
}

export function twilioConfigured(): boolean {
  return !!getEnvCredentials() || !!process.env.REPLIT_CONNECTORS_HOSTNAME;
}

async function getCredentials(): Promise<TwilioCredentials> {
  const fromEnv = getEnvCredentials();
  if (fromEnv) return fromEnv;
  return getReplitConnectorCredentials();
}

async function getReplitConnectorCredentials(): Promise<TwilioCredentials> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}

export async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
}

export async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}

export async function sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    if (!fromNumber) {
      return { success: false, error: 'No Twilio phone number configured' };
    }

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to
    });

    return { success: true, messageId: result.sid };
  } catch (error: any) {
    console.error('Twilio SMS error:', error);
    return { success: false, error: error.message || 'Failed to send SMS' };
  }
}

export async function sendAffirmationReminder(phoneNumber: string, affirmation: string): Promise<{ success: boolean; error?: string }> {
  const message = `Your daily affirmation:\n\n"${affirmation}"\n\nTake a moment to breathe and believe in your manifestation journey.\n\n${SMS_FOOTER}`;
  return sendSMS(phoneNumber, message);
}
