import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-3xl bg-red-50 border border-red-200 text-red-700 shadow-sm">
          <h2 className="text-lg font-bold">Errore interno</h2>
          <p className="mt-2 text-sm">Si è verificato un problema nella finestra di incasso. Chiudi e riapri la cassa o ricarica la pagina.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
