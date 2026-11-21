import { Routes, Route, Navigate } from 'react-router-dom';
import { UIKitPage } from './pages/UIKitPage';
import { MortgagePage } from './pages/mortgage/MortgagePage';
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MortgagePage />} />
      <Route path="/mortgage" element={<MortgagePage />} />
      <Route path="/ui-kit" element={<UIKitPage prototype />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
