// frontend/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout';
import SummarizePage from './pages/SummarizePage';
import StudyPage from './pages/StudyPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/summarize" replace />} />
        <Route path="/summarize" element={<SummarizePage />} />
        <Route path="/study" element={<StudyPage />} />
      </Routes>
    </Layout>
  );
}
