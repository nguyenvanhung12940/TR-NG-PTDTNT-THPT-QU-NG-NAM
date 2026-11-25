import React, { useState } from 'react';
import {
  ChatSpaceItem,
  ContactPerson,
  createMeetSpace,
  createStudyDoc,
  createStudyForm,
  createStudySlides,
  createStudySpreadsheet,
  DriveFileItem,
  getFormResponses,
  GmailMessageSummary,
  GoogleTaskItem,
  listChatSpaces,
  listContacts,
  listDriveFiles,
  listGmailMessages,
  listGoogleTasks,
  readSpreadsheetPreview,
  sendChatMessage,
  sendGmailMessage,
} from '../lib/workspaceApi';
import { PendingConfirmation } from './ConfirmActionModal';
import { GoogleSignInButton } from './GoogleSignInButton';

type WorkspaceTab = 'drive' | 'docs_slides' | 'sheets' | 'tasks' | 'mail_contacts' | 'forms_meet_chat';

interface WorkspacePageProps {
  hasWorkspaceToken: boolean;
  accessToken: string | null;
  isSigningIn: boolean;
  onGoogleSignIn: () => Promise<void>;
  onRequestConfirm: (pending: PendingConfirmation) => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  hasWorkspaceToken,
  accessToken,
  isSigningIn,
  onGoogleSignIn,
  onRequestConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('drive');
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string; url?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Drive
  const [driveQuery, setDriveQuery] = useState('');
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);

  // Docs & Slides
  const [docTitle, setDocTitle] = useState('Ghi chú tự học EDU SMART');
  const [docContent, setDocContent] = useState('');
  const [slideTitle, setSlideTitle] = useState('Tổng kết bài học EDU SMART');
  const [slideBody, setSlideBody] = useState('');

  // Sheets
  const [sheetIdInput, setSheetIdInput] = useState('');
  const [sheetTitle, setSheetTitle] = useState('Sổ tay kế hoạch EDU SMART');
  const [sheetPreview, setSheetPreview] = useState<{ title: string; sheetName: string; values: string[][] } | null>(null);

  // Tasks
  const [googleTasks, setGoogleTasks] = useState<GoogleTaskItem[]>([]);

  // Gmail & Contacts
  const [gmailList, setGmailList] = useState<GmailMessageSummary[]>([]);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [mailTo, setMailTo] = useState('');
  const [mailSubject, setMailSubject] = useState('Báo cáo tự học EDU SMART');
  const [mailBody, setMailBody] = useState('');

  // Forms, Meet & Chat
  const [formTitle, setFormTitle] = useState('Phiếu tự đánh giá sau giờ học');
  const [formQuestion, setFormQuestion] = useState('Em đã nắm vững kiến thức trọng tâm nào hôm nay?');
  const [formIdInput, setFormIdInput] = useState('');
  const [formSummary, setFormSummary] = useState<{ title: string; responderUri: string; responsesCount: number } | null>(null);
  const [meetInfo, setMeetInfo] = useState<{ meetingUri: string; meetingCode: string } | null>(null);
  const [chatSpaces, setChatSpaces] = useState<ChatSpaceItem[]>([]);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [chatMessage, setChatMessage] = useState('');

  const runRead = async (fn: (token: string) => Promise<void>) => {
    if (!accessToken) return;
    setLoading(true);
    setStatus(null);
    try {
      await fn(accessToken);
    } catch (err: any) {
      setStatus({ kind: 'error', text: err?.message || 'Không thể kết nối Google Workspace.' });
    } finally {
      setLoading(false);
    }
  };

  if (!hasWorkspaceToken || !accessToken) {
    return (
      <div className="bg-white border border-[#dce6f0] rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-[#174b78]">Trung tâm Google Workspace</h2>
        <p className="text-sm text-[#52677e] leading-relaxed">
          Kết nối tài khoản Google để sử dụng Drive, Docs, Sheets, Slides, Tasks, Gmail, Contacts, Forms, Meet và Google Chat trực tiếp trong EDU SMART.
        </p>
        <div className="flex justify-center pt-2">
          <GoogleSignInButton onClick={onGoogleSignIn} disabled={isSigningIn} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#174b78]">Trung tâm Google Workspace</h2>
        <p className="text-sm text-[#52677e] mt-1">
          Mọi thao tác tạo mới hoặc gửi thông tin đều yêu cầu xác nhận rõ ràng trước khi thực hiện.
        </p>
      </div>

      {/* Segmented filter tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#eaf2fa] rounded-xl" role="tablist" aria-label="Công cụ Google Workspace">
        {(
          [
            ['drive', 'Google Drive'],
            ['docs_slides', 'Docs & Slides'],
            ['sheets', 'Google Sheets'],
            ['tasks', 'Google Tasks'],
            ['mail_contacts', 'Gmail & Contacts'],
            ['forms_meet_chat', 'Forms · Meet · Chat'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => {
              setActiveTab(id);
              setStatus(null);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === id
                ? 'bg-white text-[#1677d2] shadow-sm'
                : 'text-[#52677e] hover:text-[#19324d]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {status && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl px-4 py-3 text-sm ${
            status.kind === 'success'
              ? 'bg-[#e6faf4] text-[#08775e] border border-[#b2ebdc]'
              : 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]'
          }`}
        >
          <span>{status.text}</span>
          {status.url && (
            <>
              {' '}
              <a
                href={status.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold"
              >
                Mở liên kết
              </a>
            </>
          )}
        </div>
      )}

      {/* 1. DRIVE */}
      {activeTab === 'drive' && (
        <div className="bg-white border border-[#dce6f0] rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-[#174b78]">Google Drive – Tài liệu học tập</h3>
          <div className="flex flex-wrap gap-3">
            <input
              value={driveQuery}
              onChange={(e) => setDriveQuery(e.target.value)}
              placeholder="Tìm tên tệp trên Google Drive..."
              aria-label="Tìm tên tệp trên Google Drive"
              className="flex-1 min-w-[220px] border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                runRead(async (token) => {
                  const files = await listDriveFiles(token, driveQuery);
                  setDriveFiles(files);
                  setStatus({ kind: 'success', text: `Tìm thấy ${files.length} tệp từ Google Drive.` });
                })
              }
              className="px-5 py-2.5 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] whitespace-nowrap"
            >
              {loading ? 'Đang tải...' : 'Tải danh sách Drive'}
            </button>
          </div>
          {driveFiles.length > 0 && (
            <ul className="divide-y divide-[#e8eff6] text-sm">
              {driveFiles.map((file) => (
                <li key={file.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#123e68]">{file.name}</div>
                    <div className="text-xs text-[#52677e]">{file.mimeType}</div>
                  </div>
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#1677d2] underline whitespace-nowrap"
                    >
                      Mở trên Drive
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 2. DOCS & SLIDES */}
      {activeTab === 'docs_slides' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#dce6f0] rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#174b78]">Google Docs – Tạo phiếu ghi chép</h3>
            <div>
              <label htmlFor="wsDocTitle" className="block text-sm font-bold mb-1">Tiêu đề tài liệu</label>
              <input
                id="wsDocTitle"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="wsDocContent" className="block text-sm font-bold mb-1">Nội dung ghi chép</label>
              <textarea
                id="wsDocContent"
                rows={4}
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="Nhập tóm tắt kiến thức hoặc kết quả Fact Check..."
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                onRequestConfirm({
                  title: 'Tạo tài liệu mới trên Google Docs?',
                  description: `Ứng dụng sẽ tạo Google Doc "${docTitle}" với nội dung bạn đã nhập.`,
                  confirmLabel: 'Tạo Google Doc',
                  onConfirm: async () => {
                    const res = await createStudyDoc(accessToken, docTitle, docContent);
                    setStatus({ kind: 'success', text: 'Đã tạo Google Doc thành công.', url: res.url });
                  },
                })
              }
              className="px-5 py-2.5 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] whitespace-nowrap"
            >
              Tạo Google Doc
            </button>
          </div>

          <div className="bg-white border border-[#dce6f0] rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#174b78]">Google Slides – Tạo bài thuyết trình</h3>
            <div>
              <label htmlFor="wsSlideTitle" className="block text-sm font-bold mb-1">Tên bài trình bày</label>
              <input
                id="wsSlideTitle"
                value={slideTitle}
                onChange={(e) => setSlideTitle(e.target.value)}
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="wsSlideBody" className="block text-sm font-bold mb-1">Ý chính trên slide</label>
              <textarea
                id="wsSlideBody"
                rows={4}
                value={slideBody}
                onChange={(e) => setSlideBody(e.target.value)}
                placeholder="Nhập dàn ý bài thuyết trình hoặc tự kiểm tra..."
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                onRequestConfirm({
                  title: 'Tạo bài thuyết trình trên Google Slides?',
                  description: `Ứng dụng sẽ tạo tệp Google Slides "${slideTitle}" trong Drive của bạn.`,
                  confirmLabel: 'Tạo Google Slides',
                  onConfirm: async () => {
                    const res = await createStudySlides(accessToken, slideTitle, slideBody || 'Tổng hợp tự học EDU SMART');
                    setStatus({ kind: 'success', text: 'Đã tạo Google Slides thành công.', url: res.url });
                  },
                })
              }
              className="px-5 py-2.5 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] whitespace-nowrap"
            >
              Tạo Google Slides
            </button>
          </div>
        </div>
      )}

      {/* 3. SHEETS */}
      {activeTab === 'sheets' && (
        <div className="bg-white border border-[#dce6f0] rounded-2xl p-6 space-y-5">
          <h3 className="text-lg font-bold text-[#174b78]">Google Sheets – Bảng kế hoạch & dữ liệu</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label htmlFor="wsSheetTitle" className="block text-sm font-bold mb-1">Tên bảng tính mới</label>
              <input
                id="wsSheetTitle"
                value={sheetTitle}
                onChange={(e) => setSheetTitle(e.target.value)}
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                onRequestConfirm({
                  title: 'Tạo bảng tính mới trên Google Sheets?',
                  description: `Ứng dụng sẽ tạo Google Sheet "${sheetTitle}" với bảng mẫu kế hoạch tự học.`,
                  confirmLabel: 'Tạo Google Sheet',
                  onConfirm: async () => {
                    const res = await createStudySpreadsheet(accessToken, sheetTitle, [
                      ['Môn học', 'Mục tiêu', 'Hạn hoàn thành', 'Trạng thái'],
                      ['Toán học', 'Ôn tập chuyên đề', '2026-12-01', 'Đang học'],
                    ]);
                    setSheetIdInput(res.spreadsheetId);
                    setStatus({ kind: 'success', text: 'Đã tạo Google Sheet mới.', url: res.spreadsheetUrl });
                  },
                })
              }
              className="px-5 py-2.5 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] whitespace-nowrap"
            >
              Tạo Sheet mới
            </button>
          </div>

          <div className="pt-4 border-t border-[#e8eff6] flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label htmlFor="wsSheetId" className="block text-sm font-bold mb-1">Đọc dữ liệu từ Spreadsheet ID</label>
              <input
                id="wsSheetId"
                value={sheetIdInput}
                onChange={(e) => setSheetIdInput(e.target.value)}
                placeholder="Dán ID bảng tính Google Sheets..."
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2 text-sm font-mono-tabular"
              />
            </div>
            <button
              type="button"
              disabled={loading || !sheetIdInput.trim()}
              onClick={() =>
                runRead(async (token) => {
                  const data = await readSpreadsheetPreview(token, sheetIdInput);
                  setSheetPreview(data);
                  setStatus({ kind: 'success', text: `Đã đọc tab "${data.sheetName}" từ "${data.title}".` });
                })
              }
              className="px-5 py-2.5 rounded-xl border border-[#cfe2f3] bg-[#f5faff] text-[#1677d2] text-sm font-bold hover:bg-[#eaf6ff] whitespace-nowrap disabled:opacity-50"
            >
              Đọc dữ liệu Sheet
            </button>
          </div>

          {sheetPreview && sheetPreview.values.length > 0 && (
            <div className="overflow-x-auto border border-[#dce6f0] rounded-xl">
              <table className="w-full text-sm text-left">
                <tbody>
                  {sheetPreview.values.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-[#e8eff6] last:border-0">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-[#19324d]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. TASKS */}
      {activeTab === 'tasks' && (
        <div className="bg-white border border-[#dce6f0] rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-[#174b78]">Google Tasks – Danh sách công việc</h3>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                runRead(async (token) => {
                  const list = await listGoogleTasks(token);
                  setGoogleTasks(list);
                  setStatus({ kind: 'success', text: `Đã tải ${list.length} công việc từ Google Tasks.` });
                })
              }
              className="px-5 py-2.5 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] whitespace-nowrap"
            >
              {loading ? 'Đang tải...' : 'Tải Google Tasks'}
            </button>
          </div>
          {googleTasks.length > 0 && (
            <ul className="divide-y divide-[#e8eff6] text-sm">
              {googleTasks.map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#123e68]">{t.title}</div>
                    {t.notes && <div className="text-xs text-[#52677e]">{t.notes}</div>}
                  </div>
                  <span className="text-xs font-mono-tabular text-[#13a887]">
                    {t.status === 'completed' ? 'Hoàn thành' : 'Đang thực hiện'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 5. GMAIL & CONTACTS */}
      {activeTab === 'mail_contacts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#dce6f0] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-[#174b78]">Gmail – Hộp thư & gửi báo cáo</h3>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  runRead(async (token) => {
                    const msgs = await listGmailMessages(token);
                    setGmailList(msgs);
                    setStatus({ kind: 'success', text: `Đã tải ${msgs.length} email gần nhất.` });
                  })
                }
                className="px-3.5 py-2 rounded-xl border border-[#cfe2f3] text-xs font-bold text-[#1677d2] hover:bg-[#eaf6ff] whitespace-nowrap"
              >
                Tải hộp thư
              </button>
            </div>

            {gmailList.length > 0 && (
              <ul className="divide-y divide-[#e8eff6] text-xs max-h-56 overflow-y-auto">
                {gmailList.map((m) => (
                  <li key={m.id} className="py-2.5">
                    <div className="font-bold text-[#123e68]">{m.subject}</div>
                    <div className="text-[#52677e]">{m.from}</div>
                    <div className="text-[#64748b] truncate">{m.snippet}</div>
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-3 border-t border-[#e8eff6] space-y-3">
              <h4 className="text-sm font-bold text-[#19324d]">Gửi email qua Gmail</h4>
              <input
                type="email"
                value={mailTo}
                onChange={(e) => setMailTo(e.target.value)}
                placeholder="Email người nhận (ví dụ: giaovien@gmail.com)"
                aria-label="Email người nhận"
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2 text-sm"
              />
              <input
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                placeholder="Tiêu đề email"
                aria-label="Tiêu đề email"
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2 text-sm"
              />
              <textarea
                rows={3}
                value={mailBody}
                onChange={(e) => setMailBody(e.target.value)}
                placeholder="Nội dung email..."
                aria-label="Nội dung email"
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2 text-sm"
              />
              <button
                type="button"
                disabled={!mailTo.trim() || !mailBody.trim()}
                onClick={() =>
                  onRequestConfirm({
                    title: `Gửi email tới ${mailTo}?`,
                    description: `Email với tiêu đề "${mailSubject}" sẽ được gửi thay mặt bạn qua Gmail.`,
                    confirmLabel: 'Gửi Gmail',
                    onConfirm: async () => {
                      await sendGmailMessage(accessToken, mailTo.trim(), mailSubject, mailBody);
                      setMailBody('');
                      setStatus({ kind: 'success', text: `Đã gửi email tới ${mailTo}.` });
                    },
                  })
                }
                className="px-5 py-2.5 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] disabled:opacity-50 whitespace-nowrap"
              >
                Gửi email
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#dce6f0] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-[#174b78]">Google Contacts – Danh bạ</h3>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  runRead(async (token) => {
                    const list = await listContacts(token);
                    setContacts(list);
                    setStatus({ kind: 'success', text: `Đã tải ${list.length} liên hệ từ Google Contacts.` });
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-[#1677d2] text-white text-xs font-bold hover:bg-[#105ca8] whitespace-nowrap"
              >
                Tải danh bạ
              </button>
            </div>
            {contacts.length === 0 ? (
              <p className="text-sm text-[#52677e]">
                Nhấn "Tải danh bạ" để xem danh sách giáo viên hoặc bạn học từ Google Contacts.
              </p>
            ) : (
              <ul className="divide-y divide-[#e8eff6] text-sm">
                {contacts.map((c) => (
                  <li key={c.resourceName} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#123e68]">{c.name}</div>
                      <div className="text-xs text-[#52677e]">
                        {c.email || 'Chưa có email'} {c.phone ? `· ${c.phone}` : ''}
                      </div>
                    </div>
                    {c.email && (
                      <button
                        type="button"
                        onClick={() => setMailTo(c.email)}
                        className="text-xs font-bold text-[#1677d2] underline whitespace-nowrap"
                      >
                        Chọn gửi mail
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 6. FORMS, MEET & CHAT */}
      {activeTab === 'forms_meet_chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-[#dce6f0] rounded-2xl p-6 space-y-3">
            <h3 className="text-base font-bold text-[#174b78]">Google Forms – Khảo sát & Quiz</h3>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Tên biểu mẫu"
              aria-label="Tên biểu mẫu Google Forms"
              className="w-full border border-[#d7e2ed] rounded-xl px-3 py-2 text-sm"
            />
            <input
              value={formQuestion}
              onChange={(e) => setFormQuestion(e.target.value)}
              placeholder="Câu hỏi đầu tiên"
              aria-label="Câu hỏi đầu tiên"
              className="w-full border border-[#d7e2ed] rounded-xl px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() =>
                onRequestConfirm({
                  title: 'Tạo biểu mẫu trên Google Forms?',
                  description: `Ứng dụng sẽ tạo biểu mẫu "${formTitle}" với câu hỏi bạn đã nhập.`,
                  confirmLabel: 'Tạo Google Form',
                  onConfirm: async () => {
                    const form = await createStudyForm(accessToken, formTitle, [formQuestion]);
                    setFormIdInput(form.formId);
                    setStatus({ kind: 'success', text: 'Đã tạo Google Form.', url: form.responderUri });
                  },
                })
              }
              className="w-full px-4 py-2 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8]"
            >
              Tạo Google Form
            </button>

            <div className="pt-3 border-t border-[#e8eff6] space-y-2">
              <input
                value={formIdInput}
                onChange={(e) => setFormIdInput(e.target.value)}
                placeholder="Nhập Form ID để xem phản hồi"
                aria-label="Form ID"
                className="w-full border border-[#d7e2ed] rounded-xl px-3 py-2 text-xs font-mono-tabular"
              />
              <button
                type="button"
                disabled={!formIdInput.trim() || loading}
                onClick={() =>
                  runRead(async (token) => {
                    const res = await getFormResponses(token, formIdInput);
                    setFormSummary(res);
                  })
                }
                className="w-full px-4 py-2 rounded-xl border border-[#cfe2f3] text-[#1677d2] text-xs font-bold hover:bg-[#eaf6ff] disabled:opacity-50"
              >
                Kiểm tra phản hồi Form
              </button>
              {formSummary && (
                <p className="text-xs text-[#19324d]">
                  {formSummary.title} · <strong className="font-mono-tabular">{formSummary.responsesCount}</strong> lượt phản hồi
                </p>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#dce6f0] rounded-2xl p-6 space-y-3">
            <h3 className="text-base font-bold text-[#174b78]">Google Meet – Phòng học nhóm</h3>
            <p className="text-xs text-[#52677e]">
              Tạo phòng họp trực tuyến nhanh để trao đổi bài tập cùng thầy cô hoặc bạn học nội trú.
            </p>
            <button
              type="button"
              onClick={() =>
                onRequestConfirm({
                  title: 'Tạo phòng họp Google Meet mới?',
                  description: 'Ứng dụng sẽ tạo một phòng Google Meet mới trong tài khoản của bạn.',
                  confirmLabel: 'Tạo phòng Meet',
                  onConfirm: async () => {
                    const space = await createMeetSpace(accessToken);
                    setMeetInfo(space);
                    setStatus({ kind: 'success', text: `Đã tạo phòng Meet (${space.meetingCode}).`, url: space.meetingUri });
                  },
                })
              }
              className="w-full px-4 py-2.5 rounded-xl bg-[#13a887] text-white text-sm font-bold hover:bg-[#0f8b6f]"
            >
              Tạo phòng Google Meet
            </button>
            {meetInfo && (
              <div className="p-3 rounded-xl bg-[#e6faf4] text-xs text-[#08775e] space-y-1">
                <div>Mã phòng: <strong className="font-mono-tabular">{meetInfo.meetingCode}</strong></div>
                <a
                  href={meetInfo.meetingUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold block"
                >
                  Tham gia Google Meet
                </a>
              </div>
            )}
          </div>

          <div className="bg-white border border-[#dce6f0] rounded-2xl p-6 space-y-3">
            <h3 className="text-base font-bold text-[#174b78]">Google Chat – Không gian lớp học</h3>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                runRead(async (token) => {
                  const spaces = await listChatSpaces(token);
                  setChatSpaces(spaces);
                  if (spaces[0]) setSelectedSpace(spaces[0].name);
                  setStatus({ kind: 'success', text: `Tìm thấy ${spaces.length} không gian Google Chat.` });
                })
              }
              className="w-full px-4 py-2 rounded-xl border border-[#cfe2f3] text-[#1677d2] text-xs font-bold hover:bg-[#eaf6ff]"
            >
              Tải danh sách Space
            </button>

            {chatSpaces.length > 0 && (
              <>
                <select
                  value={selectedSpace}
                  onChange={(e) => setSelectedSpace(e.target.value)}
                  aria-label="Chọn Google Chat Space"
                  className="w-full border border-[#d7e2ed] rounded-xl px-3 py-2 text-sm bg-white"
                >
                  {chatSpaces.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.displayName || s.name}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={2}
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Nhập tin nhắn trao đổi học tập..."
                  aria-label="Tin nhắn Google Chat"
                  className="w-full border border-[#d7e2ed] rounded-xl px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={!selectedSpace || !chatMessage.trim()}
                  onClick={() =>
                    onRequestConfirm({
                      title: 'Gửi tin nhắn lên Google Chat?',
                      description: `Tin nhắn sẽ được đăng vào không gian "${selectedSpace}".`,
                      confirmLabel: 'Gửi tin nhắn',
                      onConfirm: async () => {
                        await sendChatMessage(accessToken, selectedSpace, chatMessage);
                        setChatMessage('');
                        setStatus({ kind: 'success', text: 'Đã gửi tin nhắn lên Google Chat.' });
                      },
                    })
                  }
                  className="w-full px-4 py-2 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] disabled:opacity-50"
                >
                  Gửi tin nhắn Chat
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
