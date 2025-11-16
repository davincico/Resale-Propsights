// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import Premium from './Premium';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/premium" element={<Premium />} />
      </Routes>
    </Router>
  );
}

export default App;