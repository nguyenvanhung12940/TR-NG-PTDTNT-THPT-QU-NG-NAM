import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Đã xảy ra lỗi không mong muốn.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f5faff] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#dce6f0] rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-[#123e68] mb-2">
              Hệ thống gặp sự cố tạm thời
            </h2>
            <p className="text-sm text-[#52677e] mb-5 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#1677d2] text-white font-semibold hover:bg-[#105ca8] transition-colors"
            >
              Tải lại ứng dụng
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
