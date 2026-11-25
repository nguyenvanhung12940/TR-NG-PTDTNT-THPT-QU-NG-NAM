import { sanitizeWorkspaceId } from '../utils/edusmart';
import { FIREBASE_PROJECT_ID } from './firebase';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status?: string;
  due?: string;
}

export interface GmailMessageSummary {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
}

export interface ContactPerson {
  resourceName: string;
  name: string;
  email: string;
  phone: string;
}

export interface ChatSpaceItem {
  name: string;
  displayName?: string;
  spaceType?: string;
}

async function workspaceFetch<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const rawMsg = data?.error?.message || `HTTP ${res.status}`;
    if (url.includes('chat.googleapis.com') && res.status === 404) {
      throw new Error(
        `${rawMsg}. Google Chat yêu cầu tài khoản Google Workspace (Business/Enterprise) và cấu hình Chat App tại: https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=${FIREBASE_PROJECT_ID}`
      );
    }
    throw new Error(rawMsg);
  }
  return data as T;
}

// 1. Google Drive
export async function listDriveFiles(accessToken: string, queryText = ''): Promise<DriveFileItem[]> {
  const qParts = ['trashed = false'];
  if (queryText.trim()) {
    const escaped = queryText.trim().replace(/'/g, "\\'");
    qParts.push(`name contains '${escaped}'`);
  }
  const params = new URLSearchParams({
    pageSize: '12',
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
    q: qParts.join(' and '),
    orderBy: 'modifiedTime desc',
  });
  const data = await workspaceFetch<{ files?: DriveFileItem[] }>(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    accessToken
  );
  return data.files ?? [];
}

// 2. Google Sheets
export async function createStudySpreadsheet(
  accessToken: string,
  title: string,
  rows: (string | number)[][]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const created = await workspaceFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    sheets?: Array<{ properties?: { title?: string } }>;
  }>('https://sheets.googleapis.com/v4/spreadsheets', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
    }),
  });

  const firstSheetTitle = created.sheets?.[0]?.properties?.title || 'Sheet1';
  const encodedRange = encodeURIComponent(`${firstSheetTitle}!A1`);

  await workspaceFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(created.spreadsheetId)}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({ values: rows }),
    }
  );

  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl: created.spreadsheetUrl,
  };
}

export async function readSpreadsheetPreview(
  accessToken: string,
  spreadsheetIdInput: string
): Promise<{ title: string; sheetName: string; values: string[][] }> {
  const safeId = sanitizeWorkspaceId(spreadsheetIdInput);
  if (!safeId) throw new Error('Mã Google Sheet không hợp lệ.');

  const meta = await workspaceFetch<{
    properties?: { title?: string };
    sheets?: Array<{ properties?: { title?: string } }>;
  }>(`https://sheets.googleapis.com/v4/spreadsheets/${safeId}`, accessToken);

  const sheetName = meta.sheets?.[0]?.properties?.title || 'Sheet1';
  const range = encodeURIComponent(`${sheetName}!A1:F15`);
  const data = await workspaceFetch<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${safeId}/values/${range}`,
    accessToken
  );
  return {
    title: meta.properties?.title || 'Bảng tính Google Sheets',
    sheetName,
    values: data.values ?? [],
  };
}

// 3. Gmail
export async function listGmailMessages(accessToken: string): Promise<GmailMessageSummary[]> {
  const list = await workspaceFetch<{ messages?: Array<{ id: string }> }>(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8',
    accessToken
  );

  const items = list.messages ?? [];
  const details = await Promise.all(
    items.slice(0, 8).map(async (m) => {
      const msg = await workspaceFetch<{
        id: string;
        snippet?: string;
        payload?: { headers?: Array<{ name: string; value: string }> };
      }>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(m.id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        accessToken
      );
      const headers = msg.payload?.headers ?? [];
      const findH = (n: string) => headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value || '';
      return {
        id: msg.id,
        subject: findH('Subject') || '(Không có tiêu đề)',
        from: findH('From') || 'Không rõ người gửi',
        date: findH('Date'),
        snippet: msg.snippet || '',
      };
    })
  );
  return details;
}

export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<{ id: string }> {
  const mime = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ].join('\r\n');

  const raw = btoa(unescape(encodeURIComponent(mime)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return workspaceFetch<{ id: string }>(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ raw }),
    }
  );
}

// 4. Google Docs
export async function createStudyDoc(
  accessToken: string,
  title: string,
  content: string
): Promise<{ documentId: string; url: string }> {
  const doc = await workspaceFetch<{ documentId: string; title: string }>(
    'https://docs.googleapis.com/v1/documents',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ title }),
    }
  );

  if (content.trim()) {
    await workspaceFetch(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(doc.documentId)}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content,
              },
            },
          ],
        }),
      }
    );
  }

  return {
    documentId: doc.documentId,
    url: `https://docs.google.com/document/d/${doc.documentId}/edit`,
  };
}

// 5. Google Slides
export async function createStudySlides(
  accessToken: string,
  title: string,
  summaryText: string
): Promise<{ presentationId: string; url: string }> {
  const pres = await workspaceFetch<{
    presentationId: string;
    slides?: Array<{ objectId: string }>;
  }>('https://slides.googleapis.com/v1/presentations', accessToken, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });

  const slideId = `edusmart_slide_${Date.now()}`;
  const titleBoxId = `edusmart_title_${Date.now()}`;
  const bodyBoxId = `edusmart_body_${Date.now()}`;

  await workspaceFetch(
    `https://slides.googleapis.com/v1/presentations/${encodeURIComponent(pres.presentationId)}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            createSlide: {
              objectId: slideId,
              slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
              placeholderIdMappings: [
                { layoutPlaceholder: { type: 'TITLE', index: 0 }, objectId: titleBoxId },
                { layoutPlaceholder: { type: 'BODY', index: 0 }, objectId: bodyBoxId },
              ],
            },
          },
          { insertText: { objectId: titleBoxId, text: title } },
          { insertText: { objectId: bodyBoxId, text: summaryText } },
        ],
      }),
    }
  );

  return {
    presentationId: pres.presentationId,
    url: `https://docs.google.com/presentation/d/${pres.presentationId}/edit`,
  };
}

// 6. Google Tasks
export async function listGoogleTasks(accessToken: string): Promise<GoogleTaskItem[]> {
  const data = await workspaceFetch<{ items?: GoogleTaskItem[] }>(
    'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?maxResults=20',
    accessToken
  );
  return data.items ?? [];
}

export async function createGoogleTask(
  accessToken: string,
  title: string,
  notes: string,
  dueDate?: string
): Promise<GoogleTaskItem> {
  const body: Record<string, string> = { title, notes };
  if (dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    body.due = `${dueDate}T23:59:59.000Z`;
  }
  return workspaceFetch<GoogleTaskItem>(
    'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}

// 7. Google Chat
export async function listChatSpaces(accessToken: string): Promise<ChatSpaceItem[]> {
  const data = await workspaceFetch<{ spaces?: ChatSpaceItem[] }>(
    'https://chat.googleapis.com/v1/spaces?pageSize=15',
    accessToken
  );
  return data.spaces ?? [];
}

export async function sendChatMessage(
  accessToken: string,
  spaceName: string,
  text: string
): Promise<{ name: string }> {
  const safeSpace = spaceName.startsWith('spaces/')
    ? `spaces/${sanitizeWorkspaceId(spaceName.slice('spaces/'.length))}`
    : `spaces/${sanitizeWorkspaceId(spaceName)}`;

  return workspaceFetch<{ name: string }>(
    `https://chat.googleapis.com/v1/${safeSpace}/messages`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ text }),
    }
  );
}

// 8. Google Forms
export async function createStudyForm(
  accessToken: string,
  title: string,
  questions: string[]
): Promise<{ formId: string; responderUri: string }> {
  const form = await workspaceFetch<{ formId: string; responderUri: string }>(
    'https://forms.googleapis.com/v1/forms',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        info: {
          title,
          documentTitle: title,
        },
      }),
    }
  );

  if (questions.length > 0) {
    await workspaceFetch(
      `https://forms.googleapis.com/v1/forms/${encodeURIComponent(form.formId)}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: questions.map((q, index) => ({
            createItem: {
              item: {
                title: q,
                questionItem: {
                  question: {
                    required: true,
                    textQuestion: { paragraph: true },
                  },
                },
              },
              location: { index },
            },
          })),
        }),
      }
    );
  }

  return form;
}

export async function getFormResponses(accessToken: string, formIdInput: string) {
  const safeFormId = sanitizeWorkspaceId(formIdInput);
  if (!safeFormId) throw new Error('Mã Google Form không hợp lệ.');

  const [formMeta, respData] = await Promise.all([
    workspaceFetch<{ info?: { title?: string }; responderUri?: string }>(
      `https://forms.googleapis.com/v1/forms/${safeFormId}`,
      accessToken
    ),
    workspaceFetch<{ responses?: Array<{ responseId: string; createTime: string }> }>(
      `https://forms.googleapis.com/v1/forms/${safeFormId}/responses`,
      accessToken
    ),
  ]);

  return {
    title: formMeta.info?.title || 'Biểu mẫu Google Forms',
    responderUri: formMeta.responderUri || '',
    responsesCount: respData.responses?.length ?? 0,
  };
}

// 9. Google Meet
export async function createMeetSpace(
  accessToken: string
): Promise<{ name: string; meetingUri: string; meetingCode: string }> {
  return workspaceFetch<{ name: string; meetingUri: string; meetingCode: string }>(
    'https://meet.googleapis.com/v2/spaces',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
}

// 10. Contacts (People API)
export async function listContacts(accessToken: string): Promise<ContactPerson[]> {
  const data = await workspaceFetch<{
    connections?: Array<{
      resourceName: string;
      names?: Array<{ displayName?: string }>;
      emailAddresses?: Array<{ value?: string }>;
      phoneNumbers?: Array<{ value?: string }>;
    }>;
  }>(
    'https://people.googleapis.com/v1/people/me/connections?pageSize=20&personFields=names,emailAddresses,phoneNumbers',
    accessToken
  );

  return (data.connections ?? []).map((person) => ({
    resourceName: person.resourceName,
    name: person.names?.[0]?.displayName || 'Chưa đặt tên',
    email: person.emailAddresses?.[0]?.value || '',
    phone: person.phoneNumbers?.[0]?.value || '',
  }));
}
