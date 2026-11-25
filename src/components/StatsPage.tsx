import React, { useState } from 'react';
import {
  AiCoachLogItem,
  computeSurveyComparison,
  FactCheckItem,
  SelfTestItem,
  StudyTaskItem,
  SurveyItem,
  ThinkEntryItem,
} from '../utils/edusmart';
import { PendingConfirmation } from './ConfirmActionModal';

interface StatsPageProps {
  surveys: SurveyItem[];
  factChecks: FactCheckItem[];
  aiLogs: AiCoachLogItem[];
  selfTests: SelfTestItem[];
  tasks: StudyTaskItem[];
  thinks: ThinkEntryItem[];
  hasWorkspaceToken: boolean;
  onExportSheets: (rows: (string | number)[][]) => Promise<string>;
  onCreateSlides: (summaryText: string) => Promise<string>;
  onRequestConfirm: (pending: PendingConfirmation) => void;
  onRequireSignIn: () => void;
}

export const StatsPage: React.FC<StatsPageProps> = ({
  surveys,
  factChecks,
  aiLogs,
  selfTests,
  tasks,
  thinks,
  hasWorkspaceToken,
  onExportSheets,
  onCreateSlides,
  onRequestConfirm,
  onRequireSignIn,
}) => {
  const comparison = computeSurveyComparison(surveys);
  const [exportStatus, setExportStatus] = useState<{ text: string; url?: string; isError?: boolean } | null>(null);

  const handleExportSheets = () => {
    if (!hasWorkspaceToken) {
      onRequireSignIn();
      return;
    }
    const rows: (string | number)[][] = [
      ['Hạng mục EDU SMART', 'Số lượng / Giá trị', 'Ghi chú'],
      ['Nhiệm vụ Study Plan', tasks.length, `Đã xong: ${tasks.filter((t) => t.done).length}`],
      ['Lượt Think First', thinks.length, 'Tư duy trước AI'],
      ['Lượt AI Coach', aiLogs.length, 'Gợi mở từng bước'],
      ['Phiếu Fact Check', factChecks.length, 'Kiểm chứng nguồn SGK'],
      ['Bài Self Test', selfTests.length, 'Tự giải thích & vận dụng'],
      ['Khảo sát trước', comparison.beforeCount, comparison.beforeAvg !== null ? `TB: ${comparison.beforeAvg}/5` : 'Chưa có'],
      ['Khảo sát sau', comparison.afterCount, comparison.afterAvg !== null ? `TB: ${comparison.afterAvg}/5` : 'Chưa có'],
    ];

    onRequestConfirm({
      title: 'Xuất thống kê sang Google Sheets?',
      description: 'Ứng dụng sẽ tạo một bảng tính mới trên Google Sheets chứa tổng hợp tiến độ và khảo sát của bạn.',
      confirmLabel: 'Tạo Google Sheet',
      onConfirm: async () => {
        try {
          const url = await onExportSheets(rows);
          setExportStatus({ text: 'Đã tạo bảng thống kê trên Google Sheets.', url });
        } catch (err: any) {
          setExportStatus({ text: err?.message || 'Không thể xuất Google Sheets.', isError: true });
        }
      },
    });
  };

  const handleCreateSlides = () => {
    if (!hasWorkspaceToken) {
      onRequireSignIn();
      return;
    }
    const summaryText = [
      `Tổng nhiệm vụ Study Plan: ${tasks.length} (Hoàn thành: ${tasks.filter((t) => t.done).length})`,
      `Lượt tư duy trước AI (Think First): ${thinks.length}`,
      `Lượt AI Coach gợi mở: ${aiLogs.length}`,
      `Phiếu kiểm chứng Fact Check: ${factChecks.length}`,
      `Bài tự kiểm tra Self Test: ${selfTests.length}`,
      comparison.beforeAvg !== null && comparison.afterAvg !== null
        ? `Khảo sát năng lực tự học: Trước ${comparison.beforeAvg}/5 → Sau ${comparison.afterAvg}/5`
        : 'Chưa đủ dữ liệu khảo sát trước/sau để so sánh.',
    ].join('\n');

    onRequestConfirm({
      title: 'Tạo bài trình bày tổng kết trên Google Slides?',
      description: 'Ứng dụng sẽ tạo một bản trình bày Google Slides tóm tắt quá trình tự học EDU SMART của bạn.',
      confirmLabel: 'Tạo Google Slides',
      onConfirm: async () => {
        try {
          const url = await onCreateSlides(summaryText);
          setExportStatus({ text: 'Đã tạo bài trình bày trên Google Slides.', url });
        } catch (err: any) {
          setExportStatus({ text: err?.message || 'Không thể tạo Google Slides.', isError: true });
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-[#174b78]">Thống kê học tập</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportSheets}
            className="px-4 py-2 rounded-xl border border-[#cfe2f3] bg-white text-sm font-semibold text-[#1677d2] hover:bg-[#eaf6ff] transition-colors whitespace-nowrap"
          >
            Xuất Google Sheets
          </button>
          <button
            type="button"
            onClick={handleCreateSlides}
            className="px-4 py-2 rounded-xl bg-[#1677d2] text-white text-sm font-semibold hover:bg-[#105ca8] transition-colors whitespace-nowrap"
          >
            Tạo báo cáo Google Slides
          </button>
        </div>
      </div>

      {exportStatus && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl px-4 py-3 text-sm ${
            exportStatus.isError
              ? 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]'
              : 'bg-[#e6faf4] text-[#08775e] border border-[#b2ebdc]'
          }`}
        >
          <span>{exportStatus.text}</span>
          {exportStatus.url && (
            <>
              {' '}
              <a
                href={exportStatus.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold"
              >
                Mở tài liệu
              </a>
            </>
          )}
        </div>
      )}

      <div className="bg-white border border-[#dce6f0] rounded-2xl p-6">
        <h3 className="text-lg font-bold text-[#174b78] mb-4">Tổng quan hoạt động</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-[#e2ecf6] rounded-xl p-4 bg-[#fafcff]">
            <strong className="block text-3xl font-extrabold text-[#1677d2] font-mono-tabular">
              {surveys.length}
            </strong>
            <span className="text-xs text-[#52677e] mt-1 block">Lượt khảo sát</span>
          </div>
          <div className="border border-[#e2ecf6] rounded-xl p-4 bg-[#fafcff]">
            <strong className="block text-3xl font-extrabold text-[#1677d2] font-mono-tabular">
              {factChecks.length}
            </strong>
            <span className="text-xs text-[#52677e] mt-1 block">Phiếu Fact Check</span>
          </div>
          <div className="border border-[#e2ecf6] rounded-xl p-4 bg-[#fafcff]">
            <strong className="block text-3xl font-extrabold text-[#1677d2] font-mono-tabular">
              {aiLogs.length}
            </strong>
            <span className="text-xs text-[#52677e] mt-1 block">Lượt yêu cầu AI</span>
          </div>
          <div className="border border-[#e2ecf6] rounded-xl p-4 bg-[#fafcff]">
            <strong className="block text-3xl font-extrabold text-[#1677d2] font-mono-tabular">
              {selfTests.length}
            </strong>
            <span className="text-xs text-[#52677e] mt-1 block">Bài tự kiểm tra</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#dce6f0] rounded-2xl p-6 space-y-3">
        <h3 className="text-lg font-bold text-[#174b78]">Đánh giá trước và sau</h3>
        {comparison.beforeAvg !== null && comparison.afterAvg !== null ? (
          <div className="text-sm text-[#19324d] space-y-1">
            <p>
              Điểm trung bình khảo sát trước:{' '}
              <strong className="font-mono-tabular text-[#1677d2]">
                {comparison.beforeAvg.toFixed(2)}/5
              </strong>{' '}
              ({comparison.beforeCount} lượt)
            </p>
            <p>
              Điểm trung bình khảo sát sau:{' '}
              <strong className="font-mono-tabular text-[#13a887]">
                {comparison.afterAvg.toFixed(2)}/5
              </strong>{' '}
              ({comparison.afterCount} lượt)
            </p>
            {comparison.delta !== null && (
              <p>
                Chênh lệch:{' '}
                <strong className="font-mono-tabular">
                  {comparison.delta >= 0 ? `+${comparison.delta.toFixed(2)}` : comparison.delta.toFixed(2)} điểm
                </strong>
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#52677e]">
            Cần có ít nhất một lượt khảo sát trước và một lượt khảo sát sau của bạn để so sánh.
          </p>
        )}

        <div className="rounded-xl bg-[#fff8e8] border border-[#f4dfae] px-4 py-3 text-xs text-[#795b1d]">
          Chỉ so sánh khi có dữ liệu khảo sát trước và sau của cùng người tham gia. Không sử dụng số liệu minh họa như kết quả nghiên cứu thực tế.
        </div>
      </div>
    </div>
  );
};
