import React from 'react';
import {
  calculateTaskStats,
  SelfTestItem,
  StudyTaskItem,
  ThinkEntryItem,
} from '../utils/edusmart';

interface ProgressPageProps {
  tasks: StudyTaskItem[];
  thinks: ThinkEntryItem[];
  selfTests: SelfTestItem[];
  isSignedIn: boolean;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({
  tasks,
  thinks,
  selfTests,
  isSignedIn,
}) => {
  const { total, done, percent } = calculateTaskStats(tasks);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#174b78]">Tiến độ học tập cá nhân</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#dce6f0] rounded-2xl p-5">
          <strong className="block text-3xl font-extrabold text-[#1677d2] font-mono-tabular">
            {total}
          </strong>
          <span className="text-xs font-medium text-[#52677e] mt-1 block">
            Nhiệm vụ đã tạo
          </span>
        </div>
        <div className="bg-white border border-[#dce6f0] rounded-2xl p-5">
          <strong className="block text-3xl font-extrabold text-[#13a887] font-mono-tabular">
            {done}
          </strong>
          <span className="text-xs font-medium text-[#52677e] mt-1 block">
            Nhiệm vụ hoàn thành
          </span>
        </div>
        <div className="bg-white border border-[#dce6f0] rounded-2xl p-5">
          <strong className="block text-3xl font-extrabold text-[#1677d2] font-mono-tabular">
            {thinks.length}
          </strong>
          <span className="text-xs font-medium text-[#52677e] mt-1 block">
            Lượt Think First
          </span>
        </div>
        <div className="bg-white border border-[#dce6f0] rounded-2xl p-5">
          <strong className="block text-3xl font-extrabold text-[#1677d2] font-mono-tabular">
            {selfTests.length}
          </strong>
          <span className="text-xs font-medium text-[#52677e] mt-1 block">
            Bài Self Test
          </span>
        </div>
      </div>

      <div className="bg-white border border-[#dce6f0] rounded-2xl p-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-lg font-bold text-[#174b78]">Tỷ lệ hoàn thành nhiệm vụ</h3>
          <span className="text-sm font-bold text-[#1677d2] font-mono-tabular">
            {percent}% hoàn thành
          </span>
        </div>
        <div className="h-3 rounded-full bg-[#e9f0f6] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#1683db] to-[#19bd9b] transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {!isSignedIn && (
        <div className="rounded-xl bg-[#fff8e8] border border-[#f4dfae] px-4 py-3 text-sm text-[#795b1d]">
          Bạn đang xem tiến độ trên phiên trình duyệt hiện tại. Đăng nhập bằng tài khoản Google ở mục Tài khoản để đồng bộ dữ liệu học tập lâu dài giữa nhiều thiết bị.
        </div>
      )}
    </div>
  );
};
