import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfileData } from '../utils/edusmart';
import { GoogleSignInButton } from './GoogleSignInButton';

interface TeacherPendingItem {
  uid: string;
  fullName: string;
  email: string;
  homeroom: string;
  subjectTeacher: string;
  teacherApproved: boolean;
}

interface AccountPageProps {
  user: User | null;
  profile: UserProfileData;
  isSigningIn: boolean;
  onGoogleSignIn: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSaveProfile: (next: UserProfileData) => Promise<void>;
  onLoadPendingTeachers?: () => Promise<TeacherPendingItem[]>;
  onApproveTeacher?: (uid: string, approved: boolean) => Promise<void>;
}

const ADMIN_EMAIL = 'hainguyenbtm.070589@gmail.com';

export const AccountPage: React.FC<AccountPageProps> = ({
  user,
  profile,
  isSigningIn,
  onGoogleSignIn,
  onLogout,
  onSaveProfile,
  onLoadPendingTeachers,
  onApproveTeacher,
}) => {
  const [form, setForm] = useState<UserProfileData>(profile);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [teachers, setTeachers] = useState<TeacherPendingItem[]>([]);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const isAdmin = (user?.email || '').toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    if (isAdmin && onLoadPendingTeachers) {
      onLoadPendingTeachers()
        .then(setTeachers)
        .catch(() => setTeachers([]));
    }
  }, [isAdmin, onLoadPendingTeachers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setFeedback({ kind: 'error', text: 'Vui lòng nhập họ và tên.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await onSaveProfile(form);
      setFeedback({
        kind: 'success',
        text: user
          ? 'Đã lưu thông tin hồ sơ tài khoản.'
          : 'Đã lưu tạm thông tin trên phiên hiện tại. Đăng nhập Google để lưu lâu dài.',
      });
    } catch (err: any) {
      setFeedback({ kind: 'error', text: err?.message || 'Không thể lưu hồ sơ.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#174b78]">Tài khoản EDU SMART</h2>

      <div className="bg-white border border-[#dce6f0] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#e8eff6]">
          <div>
            <h3 className="text-lg font-bold text-[#174b78]">
              {user ? 'Tài khoản Google đã kết nối' : 'Đăng nhập bằng Google'}
            </h3>
            <p className="text-sm text-[#52677e] mt-1">
              {user
                ? `${user.displayName || form.fullName} · ${user.email}`
                : 'Đăng nhập Google để đồng bộ dữ liệu học tập và sử dụng Google Workspace.'}
            </p>
          </div>
          {user ? (
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl border border-[#dce6f0] text-sm font-semibold text-[#52677e] hover:bg-[#f5faff] whitespace-nowrap"
            >
              Đăng xuất
            </button>
          ) : (
            <GoogleSignInButton onClick={onGoogleSignIn} disabled={isSigningIn} />
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="role" className="block text-sm font-bold text-[#19324d] mb-1.5">
                Loại tài khoản
              </label>
              <select
                id="role"
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    role: e.target.value === 'teacher' ? 'teacher' : 'student',
                  }))
                }
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#1677d2]"
              >
                <option value="student">Học sinh</option>
                <option value="teacher">Giáo viên</option>
              </select>
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-bold text-[#19324d] mb-1.5">
                Họ và tên
              </label>
              <input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Nhập họ và tên"
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
              />
            </div>

            <div>
              <label htmlFor="birthDate" className="block text-sm font-bold text-[#19324d] mb-1.5">
                Ngày tháng năm sinh
              </label>
              <input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
              />
            </div>

            {form.role === 'student' ? (
              <div>
                <label htmlFor="className" className="block text-sm font-bold text-[#19324d] mb-1.5">
                  Lớp
                </label>
                <input
                  id="className"
                  value={form.className}
                  onChange={(e) => setForm((prev) => ({ ...prev, className: e.target.value }))}
                  placeholder="Ví dụ: 12/3"
                  className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
                />
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="homeroom" className="block text-sm font-bold text-[#19324d] mb-1.5">
                    Lớp chủ nhiệm
                  </label>
                  <input
                    id="homeroom"
                    value={form.homeroom}
                    onChange={(e) => setForm((prev) => ({ ...prev, homeroom: e.target.value }))}
                    placeholder="Lớp chủ nhiệm"
                    className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
                  />
                </div>
                <div>
                  <label htmlFor="subjectTeacher" className="block text-sm font-bold text-[#19324d] mb-1.5">
                    Bộ môn
                  </label>
                  <input
                    id="subjectTeacher"
                    value={form.subjectTeacher}
                    onChange={(e) => setForm((prev) => ({ ...prev, subjectTeacher: e.target.value }))}
                    placeholder="Bộ môn giảng dạy"
                    className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-[#19324d] mb-1.5">
                Số điện thoại
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Nhập số điện thoại"
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#1677d2]"
              />
            </div>

            <div className={form.role === 'teacher' ? 'md:col-span-2' : ''}>
              <label htmlFor="accountEmail" className="block text-sm font-bold text-[#19324d] mb-1.5">
                Gmail
              </label>
              <input
                id="accountEmail"
                type="email"
                value={user?.email || form.email}
                readOnly={Boolean(user?.email)}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="example@gmail.com"
                className="w-full border border-[#d7e2ed] rounded-xl px-3.5 py-2.5 text-sm bg-[#fafcff] focus:outline-none focus:border-[#1677d2]"
              />
            </div>
          </div>

          {form.role === 'teacher' && (
            <p className="text-xs text-[#52677e]">
              Trạng thái tài khoản giáo viên:{' '}
              <strong>
                {form.teacherApproved
                  ? 'Đã được quản trị viên nhà trường phê duyệt'
                  : 'Đang chờ quản trị viên nhà trường phê duyệt'}
              </strong>
            </p>
          )}

          {feedback && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-xl px-4 py-3 text-sm ${
                feedback.kind === 'success'
                  ? 'bg-[#e6faf4] text-[#08775e]'
                  : 'bg-[#fef2f2] text-[#b91c1c]'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#1677d2] text-white text-sm font-bold hover:bg-[#105ca8] disabled:opacity-60 whitespace-nowrap"
          >
            {saving ? 'Đang lưu...' : 'Lưu thông tin tài khoản'}
          </button>

          <p className="text-xs text-[#64748b] pt-2">
            Tài khoản giáo viên cần được quản trị viên nhà trường phê duyệt. Vai trò quản trị viên không được tự đăng ký.
          </p>
        </form>
      </div>

      {isAdmin && (
        <div className="bg-white border border-[#dce6f0] rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-[#174b78]">
            Phê duyệt tài khoản giáo viên (Quản trị viên)
          </h3>
          {teachers.length === 0 ? (
            <p className="text-sm text-[#52677e]">Chưa có tài khoản giáo viên nào chờ phê duyệt.</p>
          ) : (
            <ul className="divide-y divide-[#e8eff6] text-sm">
              {teachers.map((t) => (
                <li key={t.uid} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-[#123e68]">{t.fullName}</div>
                    <div className="text-xs text-[#52677e]">
                      {t.email} · Chủ nhiệm: {t.homeroom || 'Chưa rõ'} · Bộ môn: {t.subjectTeacher || 'Chưa rõ'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!onApproveTeacher) return;
                      await onApproveTeacher(t.uid, !t.teacherApproved);
                      if (onLoadPendingTeachers) {
                        const refreshed = await onLoadPendingTeachers();
                        setTeachers(refreshed);
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                      t.teacherApproved
                        ? 'bg-[#e6faf4] text-[#08775e]'
                        : 'bg-[#1677d2] text-white'
                    }`}
                  >
                    {t.teacherApproved ? 'Đã phê duyệt' : 'Phê duyệt giáo viên'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
