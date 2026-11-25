import { useCallback, useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { AccountPage } from './components/AccountPage';
import { ConfirmActionModal, PendingConfirmation } from './components/ConfirmActionModal';
import { HomePage } from './components/HomePage';
import { ProgressPage } from './components/ProgressPage';
import { StatsPage } from './components/StatsPage';
import { StudyPage } from './components/StudyPage';
import { SurveyPage } from './components/SurveyPage';
import { WorkspacePage } from './components/WorkspacePage';
import {
  db,
  getAccessToken,
  getFirebaseIdToken,
  googleSignIn,
  handleFirestoreError,
  initAuth,
  logout,
  OperationType,
  testFirestoreConnection,
} from './lib/firebase';
import {
  createGoogleTask,
  createStudyDoc,
  createStudySlides,
  createStudySpreadsheet,
} from './lib/workspaceApi';
import {
  AiCoachLogItem,
  FactCheckItem,
  SelfTestItem,
  StudyTaskItem,
  SurveyItem,
  ThinkEntryItem,
  UserProfileData,
  validateSurveyAnswers,
} from './utils/edusmart';

type PageId = 'home' | 'survey' | 'study' | 'progress' | 'stats' | 'workspace' | 'account';

const NAV_ITEMS: Array<{ id: PageId; label: string }> = [
  { id: 'home', label: 'Trang chủ' },
  { id: 'survey', label: 'Khảo sát' },
  { id: 'study', label: 'Học tập' },
  { id: 'progress', label: 'Tiến độ' },
  { id: 'stats', label: 'Thống kê' },
  { id: 'workspace', label: 'Workspace' },
];

const DEFAULT_PROFILE: UserProfileData = {
  email: '',
  fullName: '',
  role: 'student',
  teacherApproved: false,
  birthDate: '',
  className: '',
  homeroom: '',
  subjectTeacher: '',
  phone: '',
};

export default function App() {
  const [page, setPage] = useState<PageId>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [profile, setProfile] = useState<UserProfileData>(DEFAULT_PROFILE);
  const [tasks, setTasks] = useState<StudyTaskItem[]>([]);
  const [thinks, setThinks] = useState<ThinkEntryItem[]>([]);
  const [aiLogs, setAiLogs] = useState<AiCoachLogItem[]>([]);
  const [factChecks, setFactChecks] = useState<FactCheckItem[]>([]);
  const [selfTests, setSelfTests] = useState<SelfTestItem[]>([]);
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);

  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [authBannerError, setAuthBannerError] = useState<string | null>(null);

  const loadCloudBundle = useCallback(async () => {
    const idToken = await getFirebaseIdToken();
    if (!idToken) return;
    try {
      const res = await fetch('/api/edu/bundle', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.profile) {
        setProfile({
          uid: data.profile.uid,
          email: data.profile.email || '',
          fullName: data.profile.fullName || '',
          role: data.profile.role === 'teacher' ? 'teacher' : 'student',
          teacherApproved: Boolean(data.profile.teacherApproved),
          birthDate: data.profile.birthDate || '',
          className: data.profile.className || '',
          homeroom: data.profile.homeroom || '',
          subjectTeacher: data.profile.subjectTeacher || '',
          phone: data.profile.phone || '',
        });
      }
      if (Array.isArray(data?.tasks)) {
        setTasks(data.tasks.map((t: any) => ({ ...t, id: String(t.id) })));
      }
      if (Array.isArray(data?.thinks)) {
        setThinks(data.thinks.map((t: any) => ({ ...t, id: String(t.id) })));
      }
      if (Array.isArray(data?.aiLogs)) {
        setAiLogs(data.aiLogs.map((t: any) => ({ ...t, id: String(t.id) })));
      }
      if (Array.isArray(data?.facts)) {
        setFactChecks(data.facts.map((t: any) => ({ ...t, id: String(t.id) })));
      }
      if (Array.isArray(data?.tests)) {
        setSelfTests(data.tests.map((t: any) => ({ ...t, id: String(t.id) })));
      }
      if (Array.isArray(data?.surveys)) {
        setSurveys(
          data.surveys.map((s: any) => ({
            id: String(s.id),
            surveyType: s.surveyType === 'after' ? 'after' : 'before',
            answers: Array.isArray(s.answers) ? s.answers : [],
            average: Number(s.averageScore || s.average || 0),
          }))
        );
      }
    } catch {
      // Fall back to current in-session state cleanly
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialPage = params.get('page') as PageId | null;
    if (initialPage && ['home', 'survey', 'study', 'progress', 'stats', 'workspace', 'account'].includes(initialPage)) {
      setPage(initialPage);
    } else if (params.get('autostart') === '1') {
      setPage('study');
    }

    testFirestoreConnection();
    const unsub = initAuth((authUser, token) => {
      setUser(authUser);
      setAccessToken(token);
      if (authUser) {
        setProfile((prev) => ({
          ...prev,
          uid: authUser.uid,
          email: authUser.email || prev.email,
          fullName: prev.fullName || authUser.displayName || '',
        }));
        loadCloudBundle();
      }
    });
    return () => unsub();
  }, [loadCloudBundle]);

  const navigate = (next: PageId) => {
    setPage(next);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthBannerError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setProfile((prev) => ({
          ...prev,
          uid: res.user.uid,
          email: res.user.email || prev.email,
          fullName: prev.fullName || res.user.displayName || '',
        }));
        await loadCloudBundle();
      }
    } catch (err: any) {
      setAuthBannerError(err?.message || 'Đăng nhập Google chưa thành công. Vui lòng thử lại.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setProfile(DEFAULT_PROFILE);
  };

  const mirrorFirestoreSafely = async (fn: () => Promise<void>) => {
    if (!user) return;
    try {
      await fn();
    } catch (err) {
      // Log structured Firestore diagnostic without crashing user session
      console.warn('Firestore sync notice:', err);
    }
  };

  const handleAddTask = async (input: {
    name: string;
    subject: string;
    goal: string;
    dueDate: string;
    studySlot: string;
  }) => {
    let createdId = `local-${Date.now()}`;
    const idToken = await getFirebaseIdToken();
    if (idToken) {
      try {
        const res = await fetch('/api/edu/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.task?.id) createdId = String(data.task.id);
        }
      } catch {
        // Keep responsive local state
      }
    }

    const newTask: StudyTaskItem = { id: createdId, ...input, done: false };
    setTasks((prev) => [newTask, ...prev]);

    await mirrorFirestoreSafely(async () => {
      if (!user) return;
      const path = `users/${user.uid}/studyTasks`;
      try {
        await setDoc(doc(collection(db, path), createdId), {
          userId: user.uid,
          ...input,
          done: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `${path}/${createdId}`);
      }
    });
  };

  const handleToggleTask = async (taskId: string, done: boolean) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done } : t)));
    const idToken = await getFirebaseIdToken();
    if (idToken && /^\d+$/.test(taskId)) {
      fetch(`/api/edu/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ done }),
      }).catch(() => {});
    }

    await mirrorFirestoreSafely(async () => {
      if (!user) return;
      const path = `users/${user.uid}/studyTasks/${taskId}`;
      try {
        await updateDoc(doc(db, path), { done, updatedAt: serverTimestamp() });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    const idToken = await getFirebaseIdToken();
    if (idToken && /^\d+$/.test(taskId)) {
      fetch(`/api/edu/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      }).catch(() => {});
    }

    await mirrorFirestoreSafely(async () => {
      if (!user) return;
      const path = `users/${user.uid}/studyTasks/${taskId}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    });
  };

  const handleAddThink = async (input: {
    subject: string;
    question: string;
    answer: string;
    confidence: string;
  }) => {
    let createdId = `think-${Date.now()}`;
    const idToken = await getFirebaseIdToken();
    if (idToken) {
      try {
        const res = await fetch('/api/edu/think', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.think?.id) createdId = String(data.think.id);
        }
      } catch {
        // Keep local entry
      }
    }
    setThinks((prev) => [{ id: createdId, ...input }, ...prev]);

    await mirrorFirestoreSafely(async () => {
      if (!user) return;
      const path = `users/${user.uid}/thinkEntries`;
      try {
        await setDoc(doc(collection(db, path), createdId), {
          userId: user.uid,
          ...input,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `${path}/${createdId}`);
      }
    });
  };

  const handleAskAiCoach = async (input: {
    subject: string;
    question: string;
    thinkContext: string;
  }) => {
    const idToken = await getFirebaseIdToken();
    const res = await fetch('/api/ai/coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify(input),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'AI Coach đang bận. Vui lòng thử lại.');
    }

    const logItem: AiCoachLogItem = {
      id: `ai-${Date.now()}`,
      subject: input.subject,
      question: input.question,
      thinkContext: input.thinkContext,
      guidance: data.guidance,
      modelUsed: data.modelUsed,
    };
    setAiLogs((prev) => [logItem, ...prev]);

    return { guidance: data.guidance as string, modelUsed: data.modelUsed as string };
  };

  const handleAddFactCheck = async (input: {
    content: string;
    source: string;
    conclusion: string;
  }) => {
    let createdId = `fact-${Date.now()}`;
    const idToken = await getFirebaseIdToken();
    if (idToken) {
      try {
        const res = await fetch('/api/edu/fact-check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.factCheck?.id) createdId = String(data.factCheck.id);
        }
      } catch {
        // Keep local entry
      }
    }
    setFactChecks((prev) => [{ id: createdId, ...input }, ...prev]);

    await mirrorFirestoreSafely(async () => {
      if (!user) return;
      const path = `users/${user.uid}/factChecks`;
      try {
        await setDoc(doc(collection(db, path), createdId), {
          userId: user.uid,
          ...input,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `${path}/${createdId}`);
      }
    });
  };

  const handleAddSelfTest = async (input: {
    subject: string;
    lesson: string;
    explain: string;
    apply: string;
    level: string;
  }) => {
    let createdId = `test-${Date.now()}`;
    const idToken = await getFirebaseIdToken();
    if (idToken) {
      try {
        const res = await fetch('/api/edu/self-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.selfTest?.id) createdId = String(data.selfTest.id);
        }
      } catch {
        // Keep local entry
      }
    }
    setSelfTests((prev) => [{ id: createdId, ...input }, ...prev]);

    await mirrorFirestoreSafely(async () => {
      if (!user) return;
      const path = `users/${user.uid}/selfTests`;
      try {
        await setDoc(doc(collection(db, path), createdId), {
          userId: user.uid,
          ...input,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `${path}/${createdId}`);
      }
    });
  };

  const handleSubmitSurvey = async (surveyType: 'before' | 'after', answers: number[]) => {
    const check = validateSurveyAnswers(answers);
    if (!check.valid) throw new Error(check.error);

    let createdId = `survey-${Date.now()}`;
    const idToken = await getFirebaseIdToken();
    if (idToken) {
      try {
        const res = await fetch('/api/edu/survey', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ surveyType, answers }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.survey?.id) createdId = String(data.survey.id);
        }
      } catch {
        // Keep local entry
      }
    }
    setSurveys((prev) => [
      { id: createdId, surveyType, answers, average: check.average },
      ...prev,
    ]);

    await mirrorFirestoreSafely(async () => {
      if (!user) return;
      const path = `users/${user.uid}/surveys`;
      try {
        await setDoc(doc(collection(db, path), createdId), {
          userId: user.uid,
          surveyType,
          answers,
          average: check.average,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `${path}/${createdId}`);
      }
    });
  };

  const handleSaveProfile = async (next: UserProfileData) => {
    setProfile(next);
    const idToken = await getFirebaseIdToken();
    if (idToken) {
      const res = await fetch('/api/edu/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.profile) {
          setProfile((prev) => ({
            ...prev,
            teacherApproved: Boolean(data.profile.teacherApproved),
          }));
        }
      }
    }

    await mirrorFirestoreSafely(async () => {
      if (!user) return;
      const userPath = `users/${user.uid}`;
      const piiPath = `users/${user.uid}/private/info`;
      try {
        await setDoc(
          doc(db, userPath),
          {
            uid: user.uid,
            fullName: next.fullName.slice(0, 120),
            role: next.role,
            teacherApproved: false,
            className: next.className.slice(0, 40),
            homeroom: next.homeroom.slice(0, 40),
            subjectTeacher: next.subjectTeacher.slice(0, 80),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        await setDoc(
          doc(db, piiPath),
          {
            uid: user.uid,
            email: (user.email || next.email).slice(0, 200),
            phone: next.phone.slice(0, 30),
            birthDate: next.birthDate.slice(0, 20),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      }
    });
  };

  const handleRequestConfirm = (pending: PendingConfirmation) => {
    setPendingConfirm({
      ...pending,
      onConfirm: async () => {
        setConfirmBusy(true);
        try {
          await pending.onConfirm();
          setPendingConfirm(null);
        } finally {
          setConfirmBusy(false);
        }
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5faff] text-[#19324d]">
      <div className="bg-[#e8f5ff] text-[#245b88] text-center text-xs sm:text-sm italic px-4 py-2.5">
        “Trong cách học phải lấy tự học làm cốt. Học ở trường, trong sách vở, học lẫn nhau và học dân” – Chủ tịch Hồ Chí Minh.
      </div>

      <header className="bg-white border-b border-[#dce6f0] text-center py-4 px-4">
        <p className="text-xs sm:text-sm font-bold tracking-wide text-[#155e9b]">
          SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ ĐÀ NẴNG
        </p>
        <h1 className="text-lg sm:text-xl font-extrabold text-[#123e68] mt-1">
          TRƯỜNG PTDTNT THPT QUẢNG NAM
        </h1>
      </header>

      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#dce6f0]" aria-label="Điều hướng chính">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="text-xl font-black tracking-wider text-[#1677d2] whitespace-nowrap shrink-0"
          >
            EDU SMART
          </button>

          <div className="hidden md:flex items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#eaf6ff] text-[#1677d2]'
                      : 'text-[#52677e] hover:text-[#19324d] hover:bg-[#f5faff]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
              className="md:hidden p-2 rounded-xl border border-[#dce6f0] text-[#19324d] hover:bg-[#f5faff] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => navigate('account')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                page === 'account'
                  ? 'bg-[#105ca8] text-white'
                  : 'bg-[#1677d2] text-white hover:bg-[#105ca8]'
              }`}
            >
              {user ? user.displayName?.split(' ').slice(-1)[0] || 'Tài khoản' : 'Tài khoản'}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#e8eff6] bg-white px-4 py-3 grid grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => {
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#eaf6ff] text-[#1677d2]'
                      : 'text-[#52677e] hover:bg-[#f5faff]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {authBannerError && (
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-4">
          <div className="rounded-xl bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-sm text-[#b91c1c] flex items-center justify-between gap-3">
            <span>{authBannerError}</span>
            <button
              type="button"
              onClick={() => setAuthBannerError(null)}
              className="text-xs font-bold underline whitespace-nowrap"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-7 sm:py-9">
        {page === 'home' && <HomePage onNavigate={navigate} />}

        {page === 'survey' && (
          <SurveyPage surveys={surveys} onSubmitSurvey={handleSubmitSurvey} />
        )}

        {page === 'study' && (
          <StudyPage
            tasks={tasks}
            thinks={thinks}
            aiLogs={aiLogs}
            factChecks={factChecks}
            selfTests={selfTests}
            hasWorkspaceToken={Boolean(accessToken)}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onAddThink={handleAddThink}
            onAskAiCoach={handleAskAiCoach}
            onAddFactCheck={handleAddFactCheck}
            onAddSelfTest={handleAddSelfTest}
            onSyncTaskToGoogleTasks={async (task) => {
              const token = await getAccessToken();
              if (!token) throw new Error('Vui lòng đăng nhập Google trước.');
              await createGoogleTask(
                token,
                `[${task.subject}] ${task.name}`,
                `Mục tiêu: ${task.goal} · ${task.studySlot}`,
                task.dueDate
              );
            }}
            onSaveGuidanceToGoogleDocs={async (title, content) => {
              const token = await getAccessToken();
              if (!token) throw new Error('Vui lòng đăng nhập Google trước.');
              const doc = await createStudyDoc(token, title, content);
              return doc.url;
            }}
            onRequestConfirm={handleRequestConfirm}
            onRequireSignIn={() => navigate('account')}
          />
        )}

        {page === 'progress' && (
          <ProgressPage
            tasks={tasks}
            thinks={thinks}
            selfTests={selfTests}
            isSignedIn={Boolean(user)}
          />
        )}

        {page === 'stats' && (
          <StatsPage
            surveys={surveys}
            factChecks={factChecks}
            aiLogs={aiLogs}
            selfTests={selfTests}
            tasks={tasks}
            thinks={thinks}
            hasWorkspaceToken={Boolean(accessToken)}
            onExportSheets={async (rows) => {
              const token = await getAccessToken();
              if (!token) throw new Error('Vui lòng đăng nhập Google trước.');
              const sheet = await createStudySpreadsheet(
                token,
                `EDU SMART · Thống kê học tập`,
                rows
              );
              return sheet.spreadsheetUrl;
            }}
            onCreateSlides={async (summaryText) => {
              const token = await getAccessToken();
              if (!token) throw new Error('Vui lòng đăng nhập Google trước.');
              const pres = await createStudySlides(
                token,
                'EDU SMART · Tổng kết quá trình tự học',
                summaryText
              );
              return pres.url;
            }}
            onRequestConfirm={handleRequestConfirm}
            onRequireSignIn={() => navigate('account')}
          />
        )}

        {page === 'workspace' && (
          <WorkspacePage
            hasWorkspaceToken={Boolean(accessToken)}
            accessToken={accessToken}
            isSigningIn={isSigningIn}
            onGoogleSignIn={handleGoogleSignIn}
            onRequestConfirm={handleRequestConfirm}
          />
        )}

        {page === 'account' && (
          <AccountPage
            user={user}
            profile={profile}
            isSigningIn={isSigningIn}
            onGoogleSignIn={handleGoogleSignIn}
            onLogout={handleLogout}
            onSaveProfile={handleSaveProfile}
            onLoadPendingTeachers={async () => {
              const idToken = await getFirebaseIdToken();
              if (!idToken) return [];
              const res = await fetch('/api/edu/admin/teachers', {
                headers: { Authorization: `Bearer ${idToken}` },
              });
              if (!res.ok) return [];
              const data = await res.json();
              return data.teachers ?? [];
            }}
            onApproveTeacher={async (uid, approved) => {
              const idToken = await getFirebaseIdToken();
              if (!idToken) return;
              await fetch(`/api/edu/admin/teachers/${encodeURIComponent(uid)}/approve`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ approved }),
              });
            }}
          />
        )}
      </main>

      <footer className="bg-white border-t border-[#dce6f0] text-center py-6 px-4 text-xs sm:text-sm text-[#52677e]">
        <strong className="text-[#19324d]">EDU SMART</strong> – Học tập chủ động · Tư duy độc lập · Sử dụng AI có trách nhiệm
        <br />
        Trường PTDTNT THPT Quảng Nam
      </footer>

      <ConfirmActionModal
        pending={pendingConfirm}
        busy={confirmBusy}
        onCancel={() => {
          if (!confirmBusy) setPendingConfirm(null);
        }}
      />
    </div>
  );
}
